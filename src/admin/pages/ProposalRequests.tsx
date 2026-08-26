import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminFetch } from '../lib/api';
import { adminCard, adminColors } from '../adminTheme';

type Row = { id: number; name: string; phone: string | null; email: string | null; service: string | null; status: string; created_at: string };

export default function ProposalRequests() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<{ proposals: Row[] }>('/api/admin/proposal-requests?per_page=100')
      .then((d) => setRows(d.proposals))
      .catch(() => toast.error('Failed to load proposal requests'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: adminColors.textMuted }}>Loading…</div>;

  return (
    <div className="grid gap-4 max-w-[600px]">
      {rows.length === 0 && (
        <div style={adminCard} className="p-6 text-[14px]" >
          <p style={{ color: adminColors.textMuted, margin: 0 }}>
            No proposal requests yet — the site doesn't currently have a distinct "request a proposal" form separate
            from the main contact form; those submissions land in Contact Enquiries instead. This table is ready for
            when a dedicated proposal form is added.
          </p>
        </div>
      )}
      {rows.length > 0 && (
        <div style={adminCard} className="overflow-x-auto">
          <table className="w-full text-[14px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Name</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Contact</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Service</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Received</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{r.phone ?? r.email ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{r.service ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
