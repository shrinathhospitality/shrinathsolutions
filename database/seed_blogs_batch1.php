<?php
// CLI-only. Idempotent: parses the 11 client-supplied blog articles in
// database/data/blogs_batch1.md and imports them into blog_posts. The source is Markdown with
// a per-article "## SEO Setup" metadata block, prose sections, a "## Frequently Asked
// Questions" block (### question / answer pairs) and a trailing "**Article word count:**"
// line — this script parses all of that structure and converts prose to sanitized HTML.
// Safe to re-run — skips any slug that already exists.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require __DIR__ . '/../api/config/db.php';
require __DIR__ . '/../api/lib/sanitize.php';
require __DIR__ . '/../api/models/Blog.php';
require __DIR__ . '/../api/models/SeoMeta.php';
require __DIR__ . '/../api/models/Faq.php';

$pdo = get_db_connection();
$adminId = (int) $pdo->query("SELECT id FROM admin_users WHERE username = 'admin' LIMIT 1")->fetchColumn();

$CATEGORY_BY_NUM = [
    1 => 'Websites', 2 => 'Local SEO', 3 => 'Local SEO', 4 => 'Hotel marketing',
    5 => 'Hotel marketing', 6 => 'Google Ads', 7 => 'Meta Ads', 8 => 'Hotel marketing',
    9 => 'Social Media', 10 => 'Channel manager', 11 => 'Digital Marketing',
];

function inline_md(string $s): string
{
    $s = htmlspecialchars(trim($s), ENT_QUOTES, 'UTF-8');
    $s = preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', $s);
    $s = preg_replace_callback('/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/', function ($m) {
        return '<a href="' . $m[2] . '" target="_blank" rel="noopener noreferrer">' . $m[1] . '</a>';
    }, $s);
    return $s;
}

function paragraphs_html(string $block): string
{
    $paras = preg_split('/\n\s*\n/', trim($block));
    $html = '';
    foreach ($paras as $p) {
        $p = trim($p);
        if ($p === '') continue;
        $html .= '<p>' . inline_md($p) . "</p>\n";
    }
    return $html;
}

function parse_seo_setup(string $block): array
{
    preg_match_all('/^-\s+\*\*(.+?):\*\*\s*(.*)$/m', $block, $m, PREG_SET_ORDER);
    $out = [];
    foreach ($m as $row) {
        $out[trim($row[1])] = trim($row[2]);
    }
    return $out;
}

function parse_faqs(string $block): array
{
    $parts = preg_split('/^### (.+)$/m', $block, -1, PREG_SPLIT_DELIM_CAPTURE);
    $faqs = [];
    for ($i = 1; $i < count($parts); $i += 2) {
        $question = trim($parts[$i]);
        $answer = trim(preg_replace('/\*\*(.+?)\*\*/', '$1', $parts[$i + 1] ?? ''));
        if ($question !== '' && $answer !== '') {
            $faqs[] = ['question' => $question, 'answer' => $answer];
        }
    }
    return $faqs;
}

$md = file_get_contents(__DIR__ . '/data/blogs_batch1.md');

preg_match_all('/^# (\d+)\. (.+)$/m', $md, $titleMatches, PREG_OFFSET_CAPTURE);
$count = count($titleMatches[0]);

for ($i = 0; $i < $count; $i++) {
    $num = (int) $titleMatches[1][$i][0];
    $title = trim($titleMatches[2][$i][0]);
    $start = $titleMatches[0][$i][1] + strlen($titleMatches[0][$i][0]);
    $end = $i + 1 < $count ? $titleMatches[0][$i + 1][1] : strlen($md);
    $body = substr($md, $start, $end - $start);

    // Pull the word-count line out before section-splitting (it has no ## heading of its own).
    $wordCount = null;
    $body = preg_replace_callback('/\*\*Article word count:\*\*\s*(\d+)\s*words/', function ($m) use (&$wordCount) {
        $wordCount = (int) $m[1];
        return '';
    }, $body);
    $body = preg_replace('/^\s*---\s*$/m', '', $body);

    $sections = preg_split('/^## (.+)$/m', $body, -1, PREG_SPLIT_DELIM_CAPTURE);
    // $sections[0] is empty preamble; then alternating heading/content pairs.

    $seoSetup = [];
    $faqs = [];
    $bodyHtml = '';

    for ($s = 1; $s < count($sections); $s += 2) {
        $heading = trim($sections[$s]);
        $content = $sections[$s + 1] ?? '';

        if ($heading === 'SEO Setup') {
            $seoSetup = parse_seo_setup($content);
        } elseif ($heading === 'Frequently Asked Questions') {
            $faqs = parse_faqs($content);
        } else {
            $bodyHtml .= '<h2>' . htmlspecialchars($heading, ENT_QUOTES, 'UTF-8') . "</h2>\n" . paragraphs_html($content);
        }
    }

    $slug = trim($seoSetup['Suggested URL Slug'] ?? '', "` \t");
    if ($slug === '') {
        fwrite(STDERR, "No slug parsed for article $num ($title) — skipping.\n");
        continue;
    }

    if (blog_slug_taken($pdo, $slug, null)) {
        echo "Skipping $slug — already exists.\n";
        continue;
    }

    $metaDescription = $seoSetup['Meta Description'] ?? null;
    $readingMinutes = $wordCount ? (int) max(1, round($wordCount / 200)) : null;
    $primaryKeyword = $seoSetup['Primary Keyword'] ?? null;
    $secondaryKeywords = isset($seoSetup['Secondary / LSI Keywords'])
        ? array_map('trim', explode(',', $seoSetup['Secondary / LSI Keywords']))
        : [];
    $tags = array_filter(array_merge($primaryKeyword ? [$primaryKeyword] : [], array_slice($secondaryKeywords, 0, 2)));

    $pdo->beginTransaction();
    try {
        $id = create_blog_post($pdo, [
            'title' => $title,
            'slug' => $slug,
            'excerpt' => $metaDescription,
            'content' => trim($bodyHtml),
            'author_name' => 'Shrinath Solutions',
            'category' => $CATEGORY_BY_NUM[$num] ?? 'Digital Marketing',
            'reading_time_minutes' => $readingMinutes,
            'status' => 'draft',
            'tags' => array_values($tags),
        ], $adminId);

        $seoError = save_seo_meta($pdo, 'blog_post', $id, [
            'meta_title' => $seoSetup['SEO Title'] ?? $title,
            'meta_description' => $metaDescription,
            'canonical_url' => 'https://shrinathsolutions.com/blog/' . $slug,
            'robots_index' => true,
            'robots_follow' => true,
        ]);
        if ($seoError) {
            throw new RuntimeException($seoError);
        }

        if ($faqs) {
            save_faqs($pdo, 'blog_post', $id, $faqs);
        }

        $pdo->commit();
        echo "Created blog_posts id=$id at slug=$slug (faqs: " . count($faqs) . ", words: $wordCount)\n";
    } catch (Throwable $e) {
        $pdo->rollBack();
        fwrite(STDERR, "Failed on $slug: " . $e->getMessage() . "\n");
    }
}
