<?php

declare(strict_types=1);

namespace App;

use App\Security\RateLimiter;
use App\Services\CompetitorAnalyzer;
use App\Services\HttpFetcher;
use App\Services\PdfReportGenerator;
use App\Services\SeoAnalyzer;
use App\Storage\AuditRepository;

/**
 * Tiny service locator — avoids a full DI container for four controllers.
 * Router instantiates controllers with no constructor args, so controllers
 * pull shared services from here instead.
 */
final class Bootstrap
{
    /** @var array<string, mixed> */
    private static array $config = [];

    private static ?HttpFetcher $fetcher = null;
    private static ?SeoAnalyzer $analyzer = null;
    private static ?CompetitorAnalyzer $competitorAnalyzer = null;
    private static ?PdfReportGenerator $pdfGenerator = null;
    private static ?AuditRepository $auditRepository = null;
    private static ?RateLimiter $rateLimiter = null;

    /** @param array<string, mixed> $config */
    public static function init(array $config): void
    {
        self::$config = $config;
    }

    /** @return array<string, mixed> */
    public static function config(): array
    {
        return self::$config;
    }

    public static function fetcher(): HttpFetcher
    {
        return self::$fetcher ??= new HttpFetcher(self::$config['fetcher']);
    }

    public static function analyzer(): SeoAnalyzer
    {
        return self::$analyzer ??= new SeoAnalyzer(self::fetcher(), (string) self::$config['pageSpeedApiKey']);
    }

    public static function competitorAnalyzer(): CompetitorAnalyzer
    {
        return self::$competitorAnalyzer ??= new CompetitorAnalyzer(self::analyzer());
    }

    public static function pdfGenerator(): PdfReportGenerator
    {
        return self::$pdfGenerator ??= new PdfReportGenerator();
    }

    public static function auditRepository(): AuditRepository
    {
        return self::$auditRepository ??= new AuditRepository(
            self::$config['storage']['root'],
            (int) self::$config['storage']['auditRetentionHours'],
        );
    }

    public static function rateLimiter(): RateLimiter
    {
        return self::$rateLimiter ??= new RateLimiter(
            self::$config['storage']['root'] . '/rate-limits',
            self::$config['trustedProxies'],
        );
    }
}
