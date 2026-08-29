import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { adminCard, adminColors } from '../../adminTheme';
import { seoStudioApi, CONTENT_TYPE_LABELS, type ContentType, type InventoryItem } from '../../../features/seo-studio/api';
import { StatusPill, statusForScore } from '../../../features/seo-studio/components/ScoreDisplay';
import PageHeader from '../../components/PageHeader';

const input: React.CSSProperties = { padding: '9px 12px', borderRadius: 9, border: `1px solid ${adminColors.cardBorder}`, fontSize: 13.5 };

export default function ContentInventory() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const search = params.get('search') ?? '';
  const contentType = params.get('content_type') ?? '';
  const scoreStatus = params.get('score_status') ?? '';
  const orphan = params.get('orphan') === '1';
  const status = params.get('status') ?? '';
  const indexable = params.get('indexable') ?? '';
  const missingMetadata = params.get('missing_metadata') === '1';
  const missingKeyphrase = params.get('missing_keyphrase') === '1';
  const page = Number(params.get('page') ?? '1');

  function load() {
    setLoading(true);
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (contentType) q.set('content_type', contentType);
    if (scoreStatus) q.set('score_status', scoreStatus);
    if (orphan) q.set('orphan', '1');
    if (status) q.set('status', status);
    if (indexable) q.set('indexable', indexable);
    if (missingMetadata) q.set('missing_metadata', '1');
    if (missingKeyphrase) q.set('missing_keyphrase', '1');
    q.set('page', String(page));
    seoStudioApi.content(q.toString()).then((d) => { setItems(d.items); setTotal(d.meta.total); }).catch(() => toast.error('Failed to load content')).finally(() => setLoading(false));
  }

  useEffect(load, [search, contentType, scoreStatus, orphan, status, indexable, missingMetadata, missingKeyphrase, page]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next);
  }

  function toggle(item: InventoryItem) {
    const key = `${item.content_type}:${item.content_id}`;
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelected(next);
  }

  async function handleBulkAnalyzeSelected() {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      for (const key of selected) {
        const [type, id] = key.split(':');
        await seoStudioApi.analyze(type as ContentType, Number(id));
      }
      toast.success(`Analyzed ${selected.size} item(s)`);
      setSelected(new Set());
      load();
    } catch {
      toast.error('Bulk analysis failed partway through');
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleAnalyzeAllStale() {
    setBulkBusy(true);
    try {
      let offset = 0;
      let status = 'processing';
      let totalProcessed = 0;
      while (status === 'processing') {
        const r = await seoStudioApi.analyzeBulk({ only_stale: true, offset, batch_size: 15 });
        offset = r.progress.nextOffset;
        status = r.progress.status;
        totalProcessed = r.progress.processed;
      }
      toast.success(`Analyzed ${totalProcessed} stale item(s)`);
      load();
    } catch {
      toast.error('Bulk analysis failed');
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="All Content"
        description="Every page, post and product tracked by SEO Studio, in one inventory."
        actions={(
          <>
            <button type="button" onClick={handleBulkAnalyzeSelected} disabled={bulkBusy || selected.size === 0} className="px-3.5 py-2 rounded-full text-[13px] font-semibold disabled:opacity-50 flex items-center gap-1.5" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
              {bulkBusy && <Loader2 size={13} className="animate-spin" />} Analyze selected ({selected.size})
            </button>
            <button type="button" onClick={handleAnalyzeAllStale} disabled={bulkBusy} className="px-3.5 py-2 rounded-full text-[13px] font-semibold disabled:opacity-50" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
              Analyze all stale
            </button>
          </>
        )}
      />

      <div className="flex flex-wrap gap-2">
        <input style={input} placeholder="Search title or slug…" defaultValue={search} onKeyDown={(e) => { if (e.key === 'Enter') setParam('search', (e.target as HTMLInputElement).value); }} />
        <select style={input} value={contentType} onChange={(e) => setParam('content_type', e.target.value)}>
          <option value="">All content types</option>
          {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select style={input} value={scoreStatus} onChange={(e) => setParam('score_status', e.target.value)}>
          <option value="">All SEO statuses</option>
          <option value="good">Good</option>
          <option value="needs_improvement">Needs improvement</option>
          <option value="poor">Poor</option>
          <option value="not_analyzed">Not analyzed</option>
        </select>
        <select style={input} value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">Published & draft</option>
          <option value="published">Published only</option>
          <option value="draft">Draft only</option>
        </select>
        <select style={input} value={indexable} onChange={(e) => setParam('indexable', e.target.value)}>
          <option value="">Indexable & noindex</option>
          <option value="1">Indexable only</option>
          <option value="0">Noindex only</option>
        </select>
        <label className="flex items-center gap-1.5 text-[13.5px]">
          <input type="checkbox" checked={orphan} onChange={(e) => setParam('orphan', e.target.checked ? '1' : '')} /> Orphan only
        </label>
        <label className="flex items-center gap-1.5 text-[13.5px]">
          <input type="checkbox" checked={missingMetadata} onChange={(e) => setParam('missing_metadata', e.target.checked ? '1' : '')} /> Missing metadata
        </label>
        <label className="flex items-center gap-1.5 text-[13.5px]">
          <input type="checkbox" checked={missingKeyphrase} onChange={(e) => setParam('missing_keyphrase', e.target.checked ? '1' : '')} /> Missing keyphrase
        </label>
      </div>

      <div style={adminCard} className="overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center" style={{ color: adminColors.textMuted }}>Loading…</div>
        ) : (
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ color: adminColors.textMuted, textAlign: 'left', borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                <th className="p-3 w-8"></th>
                <th className="p-3">Content</th>
                <th className="p-3">Type</th>
                <th className="p-3">Keyphrase</th>
                <th className="p-3">SEO</th>
                <th className="p-3">Readability</th>
                <th className="p-3">Overall</th>
                <th className="p-3">Indexable</th>
                <th className="p-3">Links (in/out)</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const key = `${item.content_type}:${item.content_id}`;
                return (
                  <tr key={key} style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                    <td className="p-3"><input type="checkbox" checked={selected.has(key)} onChange={() => toggle(item)} /></td>
                    <td className="p-3 max-w-[240px]">
                      <div className="font-semibold truncate">{item.title}{item.is_cornerstone && ' ⭐'}</div>
                      <div className="text-[11.5px] truncate" style={{ color: adminColors.textMuted }}>/{item.slug}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">{CONTENT_TYPE_LABELS[item.content_type]}</td>
                    <td className="p-3 max-w-[160px] truncate">{item.primary_keyphrase || <span style={{ color: adminColors.textMuted }}>—</span>}</td>
                    <td className="p-3">{item.seo_score ?? '—'}</td>
                    <td className="p-3">{item.readability_score ?? '—'}</td>
                    <td className="p-3"><StatusPill status={statusForScore(item.overall_score)} /></td>
                    <td className="p-3">{item.robots_index ? 'Yes' : 'No'}</td>
                    <td className="p-3">{item.incoming_links} / {item.outgoing_links}</td>
                    <td className="p-3 whitespace-nowrap">
                      <Link to={`/admin/seo-studio/content/${item.content_type}/${item.content_id}`} className="text-[12.5px] font-semibold" style={{ color: adminColors.accentBlue }}>Open →</Link>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={10} className="p-6 text-center" style={{ color: adminColors.textMuted }}>No content matches these filters.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between text-[13px]" style={{ color: adminColors.textMuted }}>
        <span>{total} item(s)</span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))} className="px-3 py-1.5 rounded-full disabled:opacity-40" style={{ border: `1px solid ${adminColors.cardBorder}` }}>Previous</button>
          <button type="button" disabled={items.length < 25} onClick={() => setParam('page', String(page + 1))} className="px-3 py-1.5 rounded-full disabled:opacity-40" style={{ border: `1px solid ${adminColors.cardBorder}` }}>Next</button>
        </div>
      </div>
    </div>
  );
}
