import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { adminColors, adminCard } from '../../../admin/adminTheme';
import type { SeoFields } from '../../../admin/lib/contentTypes';
import { seoRunAnalysis } from '../engine/scorer';
import { seoExtractBlocks, seoExtractHtml } from '../engine/extract';
import { seoWordCount } from '../engine/keyphrase';
import type { AnalysisInput, AnalysisResult } from '../engine/types';
import { seoStudioApi, type ContentType, type StoredAnalysis } from '../api';
import { ScoreRing } from './ScoreDisplay';
import { ChecklistPanel } from './ChecklistPanel';
import { SerpPreview } from './SerpPreview';
import { SocialPreview } from './SocialPreview';

export type SeoStudioPanelProps = {
  contentType: ContentType;
  contentId: number | null;
  seo: SeoFields;
  slug: string;
  h1: string;
  introText: string;
  bodyHtml?: string;
  blocks?: unknown;
  pageType: string;
  publicUrl: string;
  keyphrase: string;
  onKeyphraseChange: (v: string) => void;
  relatedKeyphrases: string[];
  onRelatedKeyphrasesChange: (v: string[]) => void;
  language: 'en' | 'hi';
  onLanguageChange: (v: 'en' | 'hi') => void;
  isCornerstone: boolean;
  onCornerstoneChange: (v: boolean) => void;
  storedAnalysis: StoredAnalysis;
};

type Tab = 'overview' | 'metadata' | 'social' | 'links';

export default function SeoStudioPanel(props: SeoStudioPanelProps) {
  const { contentType, contentId, seo, slug, h1, introText, bodyHtml, blocks, pageType, publicUrl,
    keyphrase, onKeyphraseChange, relatedKeyphrases, onRelatedKeyphrasesChange,
    language, onLanguageChange, isCornerstone, onCornerstoneChange, storedAnalysis } = props;

  const [tab, setTab] = useState<Tab>('overview');
  const [liveResult, setLiveResult] = useState<AnalysisResult | null>(null);
  const [serverBusy, setServerBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<Awaited<ReturnType<typeof seoStudioApi.linkSuggestions>>['suggestions']>([]);

  const extracted = useMemo(() => {
    if (bodyHtml !== undefined) return seoExtractHtml(bodyHtml);
    if (blocks !== undefined) return seoExtractBlocks(blocks);
    return { plainText: '', headings: [], images: [], links: [], paragraphs: [], wordCount: 0 };
  }, [bodyHtml, blocks]);

  // Debounced live client-side analysis — no network request, no "on every keystroke" API call.
  useEffect(() => {
    const timer = setTimeout(() => {
      const bodyText = [introText, extracted.plainText].filter(Boolean).join(' ');
      const input: AnalysisInput = {
        contentType, contentId: contentId ?? 0, slug, status: 'draft',
        title: seo.meta_title ?? '', description: seo.meta_description ?? '', canonical: seo.canonical_url ?? '',
        robotsIndex: seo.robots_index ?? true, robotsFollow: seo.robots_follow ?? true,
        ogTitle: seo.og_title ?? '', ogDescription: seo.og_description ?? '', ogImage: seo.og_image ?? '',
        h1, introText, bodyText, paragraphs: extracted.paragraphs, headings: extracted.headings,
        images: extracted.images, links: extracted.links, wordCount: seoWordCount(bodyText),
        schemaTypes: [], publicUrl, pageType, language, primaryKeyphrase: keyphrase, relatedKeyphrases,
        isCornerstone,
      };
      setLiveResult(seoRunAnalysis(input, storedAnalysis?.content_type === contentType ? 0 : 0, false));
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, contentId, slug, h1, introText, extracted, seo.meta_title, seo.meta_description, seo.canonical_url, seo.robots_index, seo.robots_follow, seo.og_title, seo.og_description, seo.og_image, pageType, language, keyphrase, relatedKeyphrases, isCornerstone]);

  const result = liveResult;
  const isStale = !!(storedAnalysis && result && storedAnalysis.content_hash !== result.contentHash);

  async function handleServerAnalyze() {
    if (!contentId) return;
    setServerBusy(true);
    try {
      await seoStudioApi.analyze(contentType, contentId);
    } finally {
      setServerBusy(false);
    }
  }

  useEffect(() => {
    if (!contentId || tab !== 'links') return;
    seoStudioApi.linkSuggestions(contentType, contentId).then((r) => setSuggestions(r.suggestions)).catch(() => {});
  }, [contentId, contentType, tab]);

  return (
    <div style={adminCard} className="p-5">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles size={18} style={{ color: adminColors.accentPurple }} aria-hidden="true" />
          <h3 className="font-heading font-bold text-[16px]">Shrinath SEO Studio</h3>
        </div>
        {contentId ? (
          <button type="button" onClick={handleServerAnalyze} disabled={serverBusy}
            className="text-[12.5px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
            style={{ border: `1px solid ${adminColors.cardBorder}` }}>
            {serverBusy ? <Loader2 size={13} className="animate-spin" /> : null} Re-analyze on server
          </button>
        ) : (
          <span className="text-[12px]" style={{ color: adminColors.textMuted }}>Save once to enable server analysis and link tracking.</span>
        )}
      </div>

      {isStale && (
        <div className="mb-4 px-3 py-2 rounded-[10px] text-[12.5px]" style={{ background: '#fff2e0', color: '#8a5100' }}>
          Content has changed since the last saved analysis — save to update the authoritative score.
        </div>
      )}

      <div className="flex gap-6 mb-5 flex-wrap">
        <ScoreRing score={result?.seoScore ?? null} label="SEO Score" />
        <ScoreRing score={result?.readabilityScore ?? null} label="Readability" />
        <ScoreRing score={result?.overallScore ?? null} label="Overall" />
      </div>

      <div className="mb-4">
        <label className="grid gap-1.5 text-[13px] font-semibold mb-2" style={{ color: adminColors.textPrimary }}>
          Focus keyphrase
          <input
            value={keyphrase} onChange={(e) => onKeyphraseChange(e.target.value)}
            placeholder="e.g. hotel website design"
            className="px-3 py-2 rounded-[10px] text-[14px]" style={{ border: `1px solid ${adminColors.cardBorder}` }}
          />
        </label>
        <label className="grid gap-1.5 text-[13px] font-semibold mb-2" style={{ color: adminColors.textPrimary }}>
          Related keyphrases (up to 5, comma-separated)
          <input
            value={relatedKeyphrases.join(', ')}
            onChange={(e) => onRelatedKeyphrasesChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5))}
            className="px-3 py-2 rounded-[10px] text-[14px]" style={{ border: `1px solid ${adminColors.cardBorder}` }}
          />
        </label>
        <div className="flex flex-wrap items-center gap-4 text-[13px]">
          <label className="flex items-center gap-2">
            Language
            <select value={language} onChange={(e) => onLanguageChange(e.target.value as 'en' | 'hi')} className="px-2 py-1.5 rounded-[8px]" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isCornerstone} onChange={(e) => onCornerstoneChange(e.target.checked)} /> Cornerstone content
          </label>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: adminColors.cardBorder }}>
        {(['overview', 'metadata', 'social', 'links'] as Tab[]).map((t) => (
          <button
            key={t} type="button" onClick={() => setTab(t)}
            className="px-3.5 py-2 text-[13px] font-semibold capitalize -mb-px"
            style={{ borderBottom: tab === t ? `2px solid ${adminColors.accentBlue}` : '2px solid transparent', color: tab === t ? adminColors.accentBlue : adminColors.textMuted }}
          >
            {t === 'metadata' ? 'Metadata & Preview' : t === 'links' ? 'Links & Suggestions' : t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (result ? <ChecklistPanel checks={result.checks} /> : <p className="text-[13px]" style={{ color: adminColors.textMuted }}>Analyzing…</p>)}

      {tab === 'metadata' && (
        <SerpPreview title={seo.meta_title ?? ''} description={seo.meta_description ?? ''} path={publicUrl} />
      )}

      {tab === 'social' && (
        <SocialPreview
          ogTitle={seo.og_title ?? ''} ogDescription={seo.og_description ?? ''} ogImage={seo.og_image ?? ''}
          fallbackTitle={seo.meta_title ?? h1} fallbackDescription={seo.meta_description ?? ''}
        />
      )}

      {tab === 'links' && (
        <div className="grid gap-3">
          <div className="text-[13px]" style={{ color: adminColors.textMuted }}>
            {contentId ? `${storedAnalysis ? '' : 'Save and analyze once to see '}Incoming/outgoing link counts are shown in the content checklist above (Links category).` : 'Save this page once to enable link suggestions.'}
          </div>
          {suggestions.length > 0 && (
            <ul className="grid gap-2">
              {suggestions.map((s) => (
                <li key={`${s.contentType}:${s.contentId}`} className="p-3 rounded-[10px] text-[13px]" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
                  <div className="font-semibold">{s.contentType} #{s.contentId}{s.isCornerstone ? ' — cornerstone' : ''}</div>
                  <div style={{ color: adminColors.textMuted }}>{s.reason}</div>
                  {s.suggestedAnchor && <div className="mt-1 text-[12.5px]">Suggested anchor: <em>{s.suggestedAnchor}</em></div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
