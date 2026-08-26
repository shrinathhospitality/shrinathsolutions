import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { adminFetch } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';

type LogRow = { id: number; action: string; entity_type: string | null; entity_id: string | null; description: string | null; ip_address: string | null; created_at: string; admin_name: string | null };
type ListResponse = { logs: LogRow[]; meta: { total: number; page: number; total_pages: number } };

export default function AuditLogs() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '30' });
    if (search) params.set('search', search);
    return adminFetch<ListResponse>(`/api/admin/audit-logs?${params}`)
      .then((d) => { setRows(d.logs); setMeta(d.meta); })
      .catch(() => toast.error('Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(1); }, [load]);

  const inputStyle: React.CSSProperties = { padding: '9px 13px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14 };

  return (
    <div className="grid gap-4">
      <div className="relative max-w-[320px]">
        <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: adminColors.textMuted }} />
        <input style={{ ...inputStyle, paddingLeft: 34, width: '100%' }} placeholder="Search logs…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={adminCard} className="overflow-x-auto">
        {loading ? (
          <div className="p-6" style={{ color: adminColors.textMuted }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center" style={{ color: adminColors.textMuted }}>No activity recorded yet.</div>
        ) : (
          <table className="w-full text-[13.5px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Action</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Entity</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Admin</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Details</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                  <td className="px-4 py-3 font-medium">{row.action.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{row.entity_type ? `${row.entity_type} #${row.entity_id}` : '—'}</td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{row.admin_name ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{row.description ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meta.total_pages > 1 && (
        <div className="flex items-center gap-2">
          {Array.from({ length: meta.total_pages }, (_, i) => i + 1).map((p) => (
            <button key={p} type="button" onClick={() => load(p)} className="w-8 h-8 rounded-full text-[13px] font-semibold" style={p === meta.page ? adminPrimaryBtn : { border: `1px solid ${adminColors.cardBorder}`, color: adminColors.textMuted }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
