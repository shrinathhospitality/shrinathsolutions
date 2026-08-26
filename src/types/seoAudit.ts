// Mirrors api/seo-toolkit's response shape (ported from the standalone
// SEO Toolkit's shared types.ts, trimmed to what the native UI renders).

export interface MetaTags {
  title: string; titleLength: number; description: string; descriptionLength: number;
  canonical: string; robots: string; status: 'pass' | 'warning' | 'fail';
}
export interface HeadingAnalysis { h1Count: number; h2Count: number; h3Count: number; h4Count: number; hasH1: boolean; multipleH1: boolean }
export interface ImageAnalysis { totalImages: number; missingAlt: number; missingTitle: number }
export interface LinkAnalysis { internalLinks: number; externalLinks: number; brokenLinks: number; redirectChains: number }
export interface TechnicalSEO {
  https: boolean; sitemap: boolean; robotsTxt: boolean; canonical: boolean; structuredData: boolean;
  openGraph: boolean; twitterCard: boolean; securityHeaders: boolean; score: number; status: 'pass' | 'warning' | 'fail';
}
export interface SecurityCheck { ssl: boolean; https: boolean; headers: Record<string, boolean>; score: number; status: 'pass' | 'warning' | 'fail' }
export interface MobileOptimization {
  viewport: boolean; responsive: boolean; touchElements: boolean; touchTargets: boolean; fontReadability: boolean;
  layoutOverflow: boolean; performanceScore: number; score: number; status: 'pass' | 'warning' | 'fail';
}
export interface PerformanceMetrics { performance: number; accessibility: number; bestPractices: number; seo: number; status: 'pass' | 'warning' | 'fail' }
export interface ScoreBreakdown { technical: number; onPage: number; performance: number; mobile: number; security: number; accessibility: number; overall: number }
export interface KeywordDensity { keyword: string; density: number; count: number }

export type SEOGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type EffortLevel = 'easy' | 'medium' | 'hard';

export interface Recommendation {
  type: string; category: string; priority: 'critical' | 'high' | 'medium' | 'low';
  issue: string; title: string; description: string; recommendation: string; benefit: string;
  impact: number; effort: EffortLevel; quickWin: boolean; dayPlan: 1 | 7 | 14 | 30;
}
export interface HealthSummary {
  grade: SEOGrade; summary: string; strengths: string[]; criticalIssues: string[];
  totalIssues: number; criticalCount: number; highCount: number; mediumCount: number; lowCount: number;
}
export interface SeoInsights { top5Issues: Recommendation[]; quickWins: Recommendation[]; healthSummary: HealthSummary }

export interface SEOMetrics {
  meta: MetaTags; headings: HeadingAnalysis; images: ImageAnalysis; links: LinkAnalysis;
  technical: TechnicalSEO; security: SecurityCheck; mobile: MobileOptimization; performance: PerformanceMetrics;
}

export interface AnalysisResult {
  id?: string; url: string; domain: string; score: number; scoreBreakdown: ScoreBreakdown;
  metrics: SEOMetrics; keywords: KeywordDensity[]; recommendations: Recommendation[];
  seoInsights: SeoInsights; analyzedAt: string;
}
