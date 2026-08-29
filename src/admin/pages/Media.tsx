import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, Trash2, Copy, X } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';
import { useConfirmDialog } from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import { SearchInput } from '../components/TableToolbar';
import PaginationBar from '../components/Pagination';
import { EmptyState } from '../components/ListStates';

type MediaItem = {
  id: number; filename: string; original_filename: string; relative_path: string; mime_type: string;
  size_bytes: number; width: number | null; height: number | null; alt_text: string | null; title: string | null; caption: string | null;
};
type ListResponse = { media: MediaItem[]; meta: { total: number; page: number; total_pages: number } };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Media() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirmDialog();
  const { confirm: confirmForce, dialog: forceDialog } = useConfirmDialog();

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '24' });
    if (search) params.set('search', search);
    return adminFetch<ListResponse>(`/api/admin/media?${params}`)
      .then((d) => { setItems(d.media); setMeta(d.meta); })
      .catch(() => toast.error('Failed to load media'))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(1); }, [load]);

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('file', file);
      try {
        await adminFetch('/api/admin/media', { method: 'POST', body: form });
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof ApiError ? err.message : 'upload failed'}`);
      }
    }
    setUploading(false);
    toast.success('Upload complete');
    load(1);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function saveMeta(item: MediaItem) {
    try {
      await adminFetch(`/api/admin/media/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ alt_text: item.alt_text, title: item.title, caption: item.caption }),
      });
      toast.success('Saved');
      setSelected(null);
      load(meta.page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save');
    }
  }

  function remove(item: MediaItem) {
    confirm({
      title: `Delete "${item.original_filename}"?`,
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await adminFetch(`/api/admin/media/${item.id}`, { method: 'DELETE' });
          toast.success('Deleted');
          setSelected(null);
          await load(meta.page);
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            setTimeout(() => confirmForce({
              title: 'This file is used by published content.',
              description: 'Delete it anyway? Content referencing this file may show a broken image.',
              variant: 'destructive',
              confirmLabel: 'Delete anyway',
              onConfirm: async () => {
                await adminFetch(`/api/admin/media/${item.id}?force=1`, { method: 'DELETE' });
                toast.success('Deleted');
                setSelected(null);
                await load(meta.page);
              },
            }), 0);
            return;
          }
          throw err;
        }
      },
    });
  }

  function copyUrl(item: MediaItem) {
    navigator.clipboard.writeText(`${window.location.origin}/api/${item.relative_path}`).then(() => toast.success('URL copied'));
  }

  const inputStyle: React.CSSProperties = { padding: '9px 13px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14 };

  return (
    <div className="grid gap-4">
      {dialog}
      {forceDialog}
      <PageHeader title="Media Library" description="Images and files used across the site." count={meta.total} />
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search media…" />
        <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" className="hidden" onChange={(e) => onFilesSelected(e.target.files)} />
        <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()} className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px] disabled:opacity-60" style={adminPrimaryBtn}>
          <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload files'}
        </button>
      </div>

      {loading ? (
        <div style={{ color: adminColors.textMuted }}>Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState title="No files yet" description="Upload JPEG, PNG, WebP, GIF or PDF — up to 10 MB each." />
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => setSelected(item)} style={adminCard} className="p-2 text-left overflow-hidden">
              <div className="rounded-[8px] overflow-hidden mb-2" style={{ aspectRatio: '1', background: '#f1f3f9' }}>
                {item.mime_type.startsWith('image/') ? (
                  <img src={`/api/${item.relative_path}`} alt={item.alt_text ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-[12px]" style={{ color: adminColors.textMuted }}>PDF</div>
                )}
              </div>
              <div className="text-[12px] font-medium truncate">{item.original_filename}</div>
              <div className="text-[11px]" style={{ color: adminColors.textMuted }}>{formatBytes(item.size_bytes)}</div>
            </button>
          ))}
        </div>
      )}

      <PaginationBar page={meta.page} totalPages={meta.total_pages} onChange={load} />

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(10,14,28,.5)' }} onClick={() => setSelected(null)}>
          <div style={{ ...adminCard, maxWidth: 480, width: '100%' }} className="p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-heading font-bold text-[16px]">{selected.original_filename}</div>
              <button type="button" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            {selected.mime_type.startsWith('image/') && (
              <img src={`/api/${selected.relative_path}`} alt="" className="w-full rounded-[10px] mb-4" style={{ maxHeight: 220, objectFit: 'contain', background: '#f1f3f9' }} />
            )}
            <div className="grid gap-3">
              <label className="grid gap-1 text-[13px] font-semibold" style={{ color: adminColors.textMuted }}>
                Alt text
                <input style={inputStyle} value={selected.alt_text ?? ''} onChange={(e) => setSelected({ ...selected, alt_text: e.target.value })} />
              </label>
              <label className="grid gap-1 text-[13px] font-semibold" style={{ color: adminColors.textMuted }}>
                Title
                <input style={inputStyle} value={selected.title ?? ''} onChange={(e) => setSelected({ ...selected, title: e.target.value })} />
              </label>
              <label className="grid gap-1 text-[13px] font-semibold" style={{ color: adminColors.textMuted }}>
                Caption
                <input style={inputStyle} value={selected.caption ?? ''} onChange={(e) => setSelected({ ...selected, caption: e.target.value })} />
              </label>
            </div>
            <div className="flex items-center gap-2.5 mt-5">
              <button type="button" onClick={() => saveMeta(selected)} className="px-4 py-2.5 rounded-full text-[13.5px]" style={adminPrimaryBtn}>Save</button>
              <button type="button" onClick={() => copyUrl(selected)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13.5px]" style={{ border: `1px solid ${adminColors.cardBorder}`, color: adminColors.textMuted }}>
                <Copy size={14} /> Copy URL
              </button>
              <button type="button" onClick={() => remove(selected)} className="ml-auto" style={{ color: adminColors.danger }}><Trash2 size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
