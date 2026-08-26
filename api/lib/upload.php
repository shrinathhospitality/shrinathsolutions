<?php
// Upload validation: real (sniffed) MIME type, extension allowlist, random filenames,
// size cap. Never trust the client-supplied filename or Content-Type.

declare(strict_types=1);

const UPLOAD_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const UPLOAD_ALLOWED_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
    'image/gif'  => 'gif',
    'application/pdf' => 'pdf',
];

/** Validates and stores an uploaded file. Returns file metadata, or throws with a safe message. */
function handle_upload(array $file): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Upload failed.');
    }
    if ($file['size'] > UPLOAD_MAX_BYTES) {
        throw new RuntimeException('File is too large. Maximum size is 10 MB.');
    }
    if (!is_uploaded_file($file['tmp_name'])) {
        throw new RuntimeException('Invalid upload.');
    }

    // Reject double extensions in the original name outright (defense in depth; the
    // stored filename below is fully random regardless).
    if (preg_match('/\.(php\d?|phtml|phar|cgi|pl|py|sh|exe)(\.|$)/i', (string) $file['name'])) {
        throw new RuntimeException('That file type is not allowed.');
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!isset(UPLOAD_ALLOWED_TYPES[$mime])) {
        throw new RuntimeException('That file type is not allowed. Allowed: JPEG, PNG, WebP, GIF, PDF.');
    }
    $ext = UPLOAD_ALLOWED_TYPES[$mime];

    $width = null;
    $height = null;
    if ($ext !== 'pdf') {
        $dimensions = @getimagesize($file['tmp_name']);
        if ($dimensions === false) {
            throw new RuntimeException('That file is not a valid image.');
        }
        [$width, $height] = $dimensions;
    }

    $subdir = 'uploads/' . date('Y') . '/' . date('m');
    $absoluteDir = __DIR__ . '/../' . $subdir;
    if (!is_dir($absoluteDir)) {
        mkdir($absoluteDir, 0755, true);
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $ext;
    $relativePath = $subdir . '/' . $filename;
    $destination = $absoluteDir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        throw new RuntimeException('Could not save the uploaded file.');
    }

    return [
        'filename'          => $filename,
        'original_filename' => substr(basename((string) $file['name']), 0, 255),
        'relative_path'     => $relativePath,
        'mime_type'         => $mime,
        'size_bytes'        => (int) $file['size'],
        'width'             => $width,
        'height'            => $height,
    ];
}

function delete_upload_file(string $relativePath): void
{
    $full = __DIR__ . '/../' . $relativePath;
    if (is_file($full)) {
        @unlink($full);
    }
}
