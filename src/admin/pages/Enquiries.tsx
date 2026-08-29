import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Search, Download, X } from 'lucide-react';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';
import { useConfirmDialog } from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import DataTable, { type Column } from '../components/DataTable';

type Enquiry = {
  id: number; name: string; phone: string | null; email: string | null; message: string | null;
  service: string | null; page_url: string | null; source: string | null; status: string;
  internal_notes: string | null; created_at: string;
};
type ListResponse = { enquiries: Enquiry[]; meta: { total: number; page: number; total_pages: number } };

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: adminColors.primarySoft, text: adminColors.primary },
  contacted: { bg: '#FDF3D8', text: '#9A6700' },
  converted: { bg: adminColors.limeSoft, text: '#37A866' },
  spam: { bg: '#FBEAEA', text: adminColors.danger },
};

export default function Enquiries() {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '20' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return adminFetch<ListResponse>(`/api/admin/enquiries?${params}`)
      .then((d) => { setRows(d.enquiries); setMeta(d.meta); setLoadError(null); })
      .catch((err) => {
        toast.error('Failed to load enquiries');
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load enquiries.");
      })
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => { load(1); }, [load]);

  async function save(enquiry: Enquiry) {
    try {
      await adminFetch(`/api/admin/enquiries/${enquiry.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: enquiry.status, internal_notes: enquiry.internal_notes }),
      });
      toast.success('Saved');
      setSelected(null);
      load(meta.page);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save');
    }
  }

  function remove(id: number) {
    confirm({
      title: 'Delete this enquiry?',
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await adminFetch(`/api/admin/enquiries/${id}`, { method: 'DELETE' });
        toast.success('Deleted');
        setSelected(null);
        await load(meta.page);
      },
    });
  }

  const inputStyle: React.CSSProperties = { padding: '9px 13px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14 };

  return (
    <div className="grid gap-4">
      {dialog}
      <PageHeader title="Contact Enquiries" description="Messages submitted through the site's contact form." count={meta.total} />
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: adminColors.textMuted }} />
          <input style={{ ...inputStyle, paddingLeft: 34, width: '100%' }} placeholder="Search enquiries…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="converted">Converted</option>
          <option value="spam">Spam</option>
        </select>
        <a href="/api/admin/enquiries/export" className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px]" style={{ border: `1px solid ${adminColors.cardBorder}`, color: adminColors.textMuted }}>
          <Download size={15} /> Export CSV
        </a>
      </div>

      <DataTable<Enquiry>
        columns={enquiriesColumns()}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={loadError}
        onRetry={() => load(meta.page)}
        emptyTitle="No enquiries yet"
        emptyDescription="Submissions from the site's contact form will appear here."
        caption="Enquiries with contact, service, status and received date — click a row to view details."
        onRowClick={(row) => setSelected(row)}
      />

      <Pagination page={meta.page} totalPages={meta.total_pages} onChange={load} />

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(10,14,28,.5)' }} onClick={() => setSelected(null)}>
          <div style={{ ...adminCard, maxWidth: 520, width: '100%' }} className="p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-heading font-bold text-[17px]">{selected.name}</div>
              <button type="button" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="grid gap-2 text-[14px] mb-4">
              {selected.phone && <div><strong>Phone:</strong> {selected.phone}</div>}
              {selected.email && <div><strong>Email:</strong> {selected.email}</div>}
              {selected.service && <div><strong>Service:</strong> {selected.service}</div>}
              {selected.page_url && <div><strong>Page:</strong> {selected.page_url}</div>}
              {selected.message && <div className="mt-1"><strong>Message:</strong> {selected.message}</div>}
            </div>
            <label className="grid gap-1.5 text-[13px] font-semibold mb-3" style={{ color: adminColors.textMuted }}>
              Status
              <select style={inputStyle} value={selected.status} onChange={(e) => setSelected({ ...selected, status: e.target.value })}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="converted">Converted</option>
                <option value="spam">Spam</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-[13px] font-semibold" style={{ color: adminColors.textMuted }}>
              Internal notes
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={selected.internal_notes ?? ''} onChange={(e) => setSelected({ ...selected, internal_notes: e.target.value })} />
            </label>
            <div className="flex items-center gap-2.5 mt-5">
              <button type="button" onClick={() => save(selected)} className="px-4 py-2.5 rounded-full text-[13.5px]" style={adminPrimaryBtn}>Save</button>
              <button type="button" onClick={() => remove(selected.id)} className="ml-auto" style={{ color: adminColors.danger }}><Trash2 size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function enquiriesColumns(): Column<Enquiry>[] {
  return [
    { key: 'name', header: 'Name', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'contact', header: 'Contact', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{row.phone ?? row.email ?? '—'}</span> },
    { key: 'service', header: 'Service', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{row.service ?? '—'}</span> },
    {
      key: 'status',
      header: 'Status',
      wrap: false,
      render: (row) => (
        <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold capitalize" style={{ background: (STATUS_COLORS[row.status] ?? STATUS_COLORS.new).bg, color: (STATUS_COLORS[row.status] ?? STATUS_COLORS.new).text }}>
          {row.status}
        </span>
      ),
    },
    { key: 'received', header: 'Received', wrap: false, render: (row) => <span style={{ color: adminColors.textMuted }}>{new Date(row.created_at).toLocaleString()}</span> },
  ];
}
