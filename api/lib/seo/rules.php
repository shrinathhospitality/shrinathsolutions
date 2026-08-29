<?php
// Loads config/seo-scoring-rules.json — the single numeric-constants source shared with the
// TypeScript engine (src/features/seo-studio/engine/rules.ts imports the same file). Never
// hardcode a threshold/weight anywhere else in this folder; read it from here.

declare(strict_types=1);

function seo_rules(): array
{
    static $rules = null;
    if ($rules === null) {
        $path = __DIR__ . '/../../../config/seo-scoring-rules.json';
        $rules = json_decode((string) file_get_contents($path), true);
        if (!is_array($rules)) {
            throw new RuntimeException('config/seo-scoring-rules.json is missing or invalid.');
        }
    }
    return $rules;
}

function seo_engine_version(): string
{
    return seo_rules()['engine_version'];
}

// Content types this module supports — the exact strings already used as seo_meta.entity_type.
// Defined here (loaded by nearly every file in this folder) rather than in input.php, so any
// file that needs it can require just rules.php.
const SEO_CONTENT_TYPES = ['page', 'service', 'seo_page', 'blog_post', 'portfolio_project'];
