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

// Performance pass: cap absurdly large camera-resolution originals (spec §8/§12 — "prevent
// oversized originals in cards"). Only applied to formats GD can safely re-encode; GIF is left
// untouched to never risk breaking an animated GIF (GD has no multi-frame support), and WebP/PDF
// need no dimension change here.
const UPLOAD_MAX_IMAGE_DIMENSION = 2400;
const UPLOAD_WEBP_QUALITY = 82;
const UPLOAD_CONVERTIBLE_TO_WEBP = ['jpg', 'png'];

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

    $sizeBytes = (int) $file['size'];

    // Best-effort only: a failure here must never fail the upload — the already-moved original
    // stays exactly as uploaded. Never runs on GIF (animation-safety) or when GD is unavailable.
    if (in_array($ext, UPLOAD_CONVERTIBLE_TO_WEBP, true) && $width !== null && $height !== null) {
        try {
            $optimized = optimize_uploaded_image($destination, $ext, $width, $height);
            if ($optimized !== null) {
                unlink($destination);
                $filename = $optimized['filename'];
                $relativePath = $subdir . '/' . $filename;
                $destination = $optimized['path'];
                $mime = 'image/webp';
                $width = $optimized['width'];
                $height = $optimized['height'];
                $sizeBytes = (int) filesize($destination);
            }
        } catch (Throwable $e) {
            error_log('[upload] image optimization skipped: ' . $e->getMessage());
        }
    }

    return [
        'filename'          => $filename,
        'original_filename' => substr(basename((string) $file['name']), 0, 255),
        'relative_path'     => $relativePath,
        'mime_type'         => $mime,
        'size_bytes'        => $sizeBytes,
        'width'             => $width,
        'height'            => $height,
    ];
}

/** Re-encodes a just-uploaded JPEG/PNG as WebP, downscaling first if either dimension exceeds
 *  UPLOAD_MAX_IMAGE_DIMENSION. Returns null (leaving the original untouched) whenever GD or
 *  WebP output support isn't available, rather than ever failing the upload over it. */
function optimize_uploaded_image(string $sourcePath, string $ext, int $width, int $height): ?array
{
    if (!extension_loaded('gd') || !function_exists('imagewebp')) {
        return null;
    }

    $image = $ext === 'png' ? @imagecreatefrompng($sourcePath) : @imagecreatefromjpeg($sourcePath);
    if ($image === false || $image === null) {
        return null;
    }

    $scale = min(1.0, UPLOAD_MAX_IMAGE_DIMENSION / max($width, $height));
    $targetWidth = max(1, (int) round($width * $scale));
    $targetHeight = max(1, (int) round($height * $scale));

    if ($scale < 1.0) {
        $resized = imagecreatetruecolor($targetWidth, $targetHeight);
        if ($ext === 'png') {
            // Preserve transparency instead of compositing onto black.
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
        }
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);
        imagedestroy($image);
        $image = $resized;
    }

    $dir = dirname($sourcePath);
    $filename = bin2hex(random_bytes(16)) . '.webp';
    $path = $dir . '/' . $filename;

    $ok = imagewebp($image, $path, UPLOAD_WEBP_QUALITY);
    imagedestroy($image);

    if (!$ok || !is_file($path)) {
        return null;
    }

    return ['filename' => $filename, 'path' => $path, 'width' => $targetWidth, 'height' => $targetHeight];
}

function delete_upload_file(string $relativePath): void
{
    $full = __DIR__ . '/../' . $relativePath;
    if (is_file($full)) {
        @unlink($full);
    }
}
