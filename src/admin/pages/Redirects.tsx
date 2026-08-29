import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Download, Upload, Loader2 } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';
import { CapabilityButton } from '../../features/seo-studio/components/CapabilityButton';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState, TableSkeleton } from '../components/ListStates';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';

type RedirectType = '301' | '302' | '307' | '308';
type Redirect = {
  id: number; source_url: string; destination_url: string; redirect_type: RedirectType; status: 'active' | 'inactive';
  notes: string | null; hit_count: number; last_hit_at: string | null; last_referrer: string | null;
};
type ListResponse = { redirects: Redirect[]; meta: { total: number; page: number; total_pages: number } };
type ImportPreviewRow = { line: number; row: Record<string, string>; valid: boolean; error: string | null };

const inputStyle: React.CSSProperties = { padding: '9px 13px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14 };
const REDIRECT_TYPES: { value: RedirectType; label: string }[] = [
  { value: '301', label: '301 (permanent)' },
  { value: '302', label: '302 (temporary)' },
  { value: '307', label: '307 (temporary, method preserved)' },
  { value: '308', label: '308 (permanent, method preserved)' },
];

export default function Redirects() {
  const [rows, setRows] = useState<Redirect[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [type, setType] = useState<RedirectType>('301');
  const [preview, setPreview] = useState<ImportPreviewRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback((page = 1) => {
    setLoading(true);
    return adminFetch<ListResponse>(`/api/admin/redirects?page=${page}&per_page=50`)
      .then((d) => { setRows(d.redirects); setMeta(d.meta); })
      .catch(() => toast.error('Failed to load redirects'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(1); }, [load]);

  async function add() {
    if (!source.trim() || !destination.trim()) return;
    try {
      await adminFetch('/api/admin/redirects', {
        method: 'POST',
        body: JSON.stringify({ source_url: source, destination_url: destination, redirect_type: type }),
      });
      setSource('');
      setDestination('');
      toast.success('Redirect added');
      load(1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add redirect');
    }
  }

  async function toggleStatus(r: Redirect) {
    try {
      await adminFetch(`/api/admin/redirects/${r.id}`, {
        method: 'PUT',
        body: JSON.stringify({ source_url: r.source_url, destination_url: r.destination_url, redirect_type: r.redirect_type, status: r.status === 'active' ? 'inactive' : 'active' }),
      });
      load(meta.page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update');
    }
  }

  function remove(id: number) {
    confirm({
      title: 'Delete this redirect?',
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await adminFetch(`/api/admin/redirects/${id}`, { method: 'DELETE' });
        toast.success('Deleted');
        await load(meta.page);
      },
    });
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await adminFetch<{ preview: ImportPreviewRow[]; validCount: number; invalidCount: number }>('/api/admin/redirects/import-preview', { method: 'POST', body: form });
      setPreview(res.preview);
      toast.success(`${res.validCount} valid, ${res.invalidCount} invalid row(s) — review before importing`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to parse CSV');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function applyImport() {
    if (!preview) return;
    const validRows = preview.filter((p) => p.valid).map((p) => p.row);
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const res = await adminFetch<{ created: number; failed: { row: unknown; error: string }[] }>('/api/admin/redirects/import-apply', { method: 'POST', body: JSON.stringify({ rows: validRows }) });
      toast.success(`Imported ${res.created} redirect(s)${res.failed.length ? `, ${res.failed.length} failed` : ''}`);
      setPreview(null);
      load(1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="grid gap-4 w-full">
      {dialog}
      <PageHeader title="Redirects" description="301/302 redirects from old URLs to new destinations." count={meta.total} />
      <div style={adminCard} className="p-4 flex flex-wrap items-center gap-2.5">
        <input style={{ ...inputStyle, width: 200 }} placeholder="/old-path" value={source} onChange={(e) => setSource(e.target.value)} />
        <span style={{ color: adminColors.textMuted }}>→</span>
        <input style={{ ...inputStyle, width: 220 }} placeholder="/new-path or https://…" value={destination} onChange={(e) => setDestination(e.target.value)} />
        <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value as RedirectType)}>
          {REDIRECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <CapabilityButton capability="seo.manage_redirects" onClick={add} className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px]" style={adminPrimaryBtn}>
          <Plus size={15} /> Add
        </CapabilityButton>
      </div>

      <div style={adminCard} className="p-4 flex flex-wrap items-center gap-3">
        <a href="/api/admin/redirects/export" className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
          <Download size={14} /> Export CSV
        </a>
        <CapabilityButton capability="seo.manage_redirects" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold" style={{ border: `1px solid ${adminColors.cardBorder}` }}>
          <Upload size={14} /> Import CSV (preview first)
        </CapabilityButton>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChosen} />
        <span className="text-[12px]" style={{ color: adminColors.textMuted }}>Columns: source_url, destination_url, redirect_type, status, notes</span>
      </div>

      {preview && (
        <div style={adminCard} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-heading font-bold text-[14px]">Import preview — {preview.filter((p) => p.valid).length} of {preview.length} valid</div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPreview(null)} className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold" style={{ border: `1px solid ${adminColors.cardBorder}` }}>Cancel</button>
              <CapabilityButton capability="seo.manage_redirects" onClick={applyImport} disabled={importing || preview.every((p) => !p.valid)} className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold disabled:opacity-50 flex items-center gap-1.5" style={adminPrimaryBtn}>
                {importing && <Loader2 size={12} className="animate-spin" />} Import valid rows
              </CapabilityButton>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-[12.5px]" style={{ borderCollapse: 'collapse' }}>
              <tbody>
                {preview.map((p) => (
                  <tr key={p.line} style={{ borderTop: `1px solid ${adminColors.cardBorder}` }}>
                    <td className="py-1.5 pr-2">{p.line}</td>
                    <td className="py-1.5 pr-2 font-mono">{p.row.source_url}</td>
                    <td className="py-1.5 pr-2 font-mono" style={{ color: adminColors.textMuted }}>{p.row.destination_url}</td>
                    <td className="py-1.5" style={{ color: p.valid ? adminColors.success : adminColors.danger }}>{p.valid ? 'OK' : p.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={adminCard} className="overflow-x-auto">
        {loading ? (
          <TableSkeleton cols={7} />
        ) : rows.length === 0 ? (
          <EmptyState title="No redirects yet" description="Add one above, or import a CSV of old-to-new URL mappings." />
        ) : (
          <table className="w-full text-[14px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Source</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Destination</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Type</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Status</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Hits</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Last hit</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                  <td className="px-4 py-3 font-mono text-[13px]">{r.source_url}</td>
                  <td className="px-4 py-3 font-mono text-[13px]" style={{ color: adminColors.textMuted }}>{r.destination_url}</td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{r.redirect_type}</td>
                  <td className="px-4 py-3">
                    <CapabilityButton capability="seo.manage_redirects" onClick={() => toggleStatus(r)} className="px-2.5 py-1 rounded-full text-[12px] font-semibold capitalize" style={r.status === 'active' ? { background: '#e6f7ef', color: '#1fa971' } : { background: '#f1f3f9', color: adminColors.textMuted }}>
                      {r.status}
                    </CapabilityButton>
                  </td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{r.hit_count}</td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: adminColors.textMuted }}>{r.last_hit_at ? new Date(r.last_hit_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <CapabilityButton capability="seo.manage_redirects" onClick={() => remove(r.id)} style={{ color: adminColors.danger }}><Trash2 size={15} /></CapabilityButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={meta.page} totalPages={meta.total_pages} onChange={load} />
    </div>
  );
}
