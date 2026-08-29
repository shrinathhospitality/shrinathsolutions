import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminCard, adminColors } from '../../adminTheme';
import { seoStudioApi, type DashboardSummary, type RegistryDiagnostics } from '../../../features/seo-studio/api';
import { CapabilityButton } from '../../../features/seo-studio/components/CapabilityButton';

const CARDS: { key: keyof DashboardSummary; label: string; tone: 'good' | 'warn' | 'bad' | 'neutral' }[] = [
  { key: 'totalIndexable', label: 'Total indexable content', tone: 'neutral' },
  { key: 'good', label: 'Good scores', tone: 'good' },
  { key: 'needsImprovement', label: 'Needs improvement', tone: 'warn' },
  { key: 'poor', label: 'Poor scores', tone: 'bad' },
  { key: 'notAnalyzed', label: 'Not analyzed', tone: 'neutral' },
  { key: 'orphanPages', label: 'Orphan pages', tone: 'warn' },
  { key: 'duplicateTitles', label: 'Duplicate titles', tone: 'warn' },
  { key: 'missingDescriptions', label: 'Missing descriptions', tone: 'bad' },
  { key: 'brokenLinks', label: 'Broken links', tone: 'bad' },
  { key: 'staleCornerstone', label: 'Stale cornerstone content', tone: 'warn' },
];

const TONE_COLOR: Record<string, string> = { good: adminColors.success, warn: '#c9720b', bad: adminColors.danger, neutral: adminColors.textPrimary };

export default function SeoStudioDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [diagnostics, setDiagnostics] = useState<RegistryDiagnostics | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [recovering, setRecovering] = useState(false);

  function refresh() {
    seoStudioApi.dashboard().then((d) => setSummary(d.summary)).catch(() => toast.error('Failed to load SEO Studio dashboard'));
    seoStudioApi.registryDiagnostics().then((d) => setDiagnostics(d.diagnostics)).catch(() => {});
  }

  useEffect(refresh, []);

  async function handleRebuild() {
    setRebuilding(true);
    try {
      const r = await seoStudioApi.rebuildLinkIndex();
      toast.success(`Link index rebuilt for ${r.rebuilt} item(s)`);
      refresh();
    } catch {
      toast.error('Rebuild failed');
    } finally {
      setRebuilding(false);
    }
  }

  async function handleRecoverAbandoned() {
    setRecovering(true);
    try {
      const r = await seoStudioApi.recoverAbandonedBuilds(60);
      toast.success(r.count > 0 ? `Recovered ${r.count} abandoned build(s) — marked failed` : 'No abandoned builds found');
      refresh();
    } catch {
      toast.error('Recovery failed');
    } finally {
      setRecovering(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const r = await seoStudioApi.registrySync(false);
      toast.success(`Registry synced: ${r.report.created} created, ${r.report.updated} updated${r.report.orphans.length ? `, ${r.report.orphans.length} orphan(s) flagged` : ''}`);
      refresh();
    } catch {
      toast.error('Registry sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading font-bold text-[19px]">Shrinath SEO Studio</h2>
          <p className="text-[13.5px] m-0" style={{ color: adminColors.textMuted }}>
            In-CMS SEO analysis and optimization — an original scoring engine, not a copy of any third-party tool.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/seo-studio/content" className="px-3.5 py-2 rounded-full text-[13px] font-semibold" style={{ border: `1px solid ${adminColors.cardBorder}` }}>All content</Link>
          <Link to="/admin/seo-studio/settings" className="px-3.5 py-2 rounded-full text-[13px] font-semibold" style={{ border: `1px solid ${adminColors.cardBorder}` }}>Settings</Link>
          <a href={seoStudioApi.exportReportUrl()} className="px-3.5 py-2 rounded-full text-[13px] font-semibold" style={{ border: `1px solid ${adminColors.cardBorder}` }}>Export CSV</a>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
        {CARDS.map((c) => (
          <div key={c.key} style={adminCard} className="p-4">
            <div className="text-[26px] font-heading font-bold" style={{ color: TONE_COLOR[c.tone] }}>
              {summary ? summary[c.key] : '—'}
            </div>
            <div className="text-[12.5px] mt-1" style={{ color: adminColors.textMuted }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={adminCard} className="p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[14px] font-semibold">SEO Document Registry</div>
          <div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>
            Discovers every static, database and Venture route and keeps one registry entry per route in sync — safe to run repeatedly, never deletes.
          </div>
        </div>
        <CapabilityButton capability="seo.run_bulk" onClick={handleSync} disabled={syncing} className="px-4 py-2 rounded-full text-[13px] font-semibold disabled:opacity-60" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
          {syncing ? 'Synchronizing…' : 'Synchronize registry'}
        </CapabilityButton>
      </div>

      <div style={adminCard} className="p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[14px] font-semibold">Abandoned prerender builds</div>
          <div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>
            If a build process is killed mid-run, its documents can be left showing "Building" indefinitely. This checks for any older than 60 minutes and moves them to "Failed" — it never marks anything current.
          </div>
        </div>
        <CapabilityButton capability="seo.run_bulk" onClick={handleRecoverAbandoned} disabled={recovering} className="px-4 py-2 rounded-full text-[13px] font-semibold disabled:opacity-60" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
          {recovering ? 'Checking…' : 'Recover abandoned builds'}
        </CapabilityButton>
      </div>

      {diagnostics && (
        <div style={adminCard} className="p-5 grid gap-1.5 text-[13px]">
          <div className="font-heading font-bold text-[14px] mb-1">Route/registry diagnostic</div>
          <div>Static routes in manifest: <strong>{diagnostics.manifestStaticRouteCount}</strong></div>
          <div>Documents in registry: <strong>{diagnostics.registryDocumentCount}</strong> ({diagnostics.registryDynamicDocumentCount} dynamic)</div>
          <div>Unpublished/orphaned in registry: <strong>{diagnostics.unpublishedInRegistry}</strong></div>
          {diagnostics.manifestRoutesMissingFromRegistry.length > 0 && (
            <div style={{ color: '#c9720b' }}>
              {diagnostics.manifestRoutesMissingFromRegistry.length} manifest route(s) missing from the registry — run Synchronize registry: {diagnostics.manifestRoutesMissingFromRegistry.slice(0, 5).join(', ')}
              {diagnostics.manifestRoutesMissingFromRegistry.length > 5 ? '…' : ''}
            </div>
          )}
          {diagnostics.duplicateNormalizedRoutes.length > 0 && (
            <div style={{ color: '#c0392b' }}>
              {diagnostics.duplicateNormalizedRoutes.length} route(s) registered more than once: {diagnostics.duplicateNormalizedRoutes.slice(0, 5).join(', ')}
              {diagnostics.duplicateNormalizedRoutes.length > 5 ? '…' : ''}
            </div>
          )}
          {diagnostics.redirectSourceOverlap.length > 0 && (
            <div style={{ color: '#c0392b' }}>
              {diagnostics.redirectSourceOverlap.length} published route(s) also have an active redirect from the same path (the redirect fires first): {diagnostics.redirectSourceOverlap.slice(0, 5).join(', ')}
              {diagnostics.redirectSourceOverlap.length > 5 ? '…' : ''}
            </div>
          )}
          <div>Noindex routes registered: <strong>{diagnostics.noindexRegisteredCount}</strong></div>
          <div>Published documents with no explicit canonical set: <strong>{diagnostics.publishedMissingCanonical}</strong></div>
        </div>
      )}

      <div style={adminCard} className="p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[14px] font-semibold">Internal-link index</div>
          <div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>
            Rebuild extracts links from every published item again — link counts and orphan detection update immediately after.
          </div>
        </div>
        <CapabilityButton capability="seo.run_bulk" onClick={handleRebuild} disabled={rebuilding} className="px-4 py-2 rounded-full text-[13px] font-semibold disabled:opacity-60" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
          {rebuilding ? 'Rebuilding…' : 'Rebuild link index'}
        </CapabilityButton>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Link to="/admin/seo-studio/content?orphan=1" style={adminCard} className="p-4 !text-inherit">
          <div className="text-[14px] font-semibold">Review orphan pages →</div>
          <div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>Published content with no incoming internal links.</div>
        </Link>
        <Link to="/admin/seo-studio/content?score_status=poor" style={adminCard} className="p-4 !text-inherit">
          <div className="text-[14px] font-semibold">Review poor-scoring content →</div>
          <div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>Content most in need of attention right now.</div>
        </Link>
      </div>
    </div>
  );
}
