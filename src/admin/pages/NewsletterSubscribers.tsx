import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminFetch } from '../lib/api';
import { adminCard, adminColors } from '../adminTheme';

type Row = { id: number; email: string; status: string; source: string | null; created_at: string };

export default function NewsletterSubscribers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<{ subscribers: Row[] }>('/api/admin/newsletter-subscribers?per_page=100')
      .then((d) => setRows(d.subscribers))
      .catch(() => toast.error('Failed to load subscribers'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: adminColors.textMuted }}>Loading…</div>;

  return (
    <div style={adminCard} className="overflow-x-auto max-w-[600px]">
      {rows.length === 0 ? (
        <div className="p-8 text-center" style={{ color: adminColors.textMuted }}>No subscribers yet.</div>
      ) : (
        <table className="w-full text-[14px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Email</th>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Source</th>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Status</th>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: adminColors.textMuted }}>Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${adminColors.cardBorder}` }}>
                <td className="px-4 py-3 font-medium">{r.email}</td>
                <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{r.source ?? '—'}</td>
                <td className="px-4 py-3 capitalize" style={{ color: adminColors.textMuted }}>{r.status}</td>
                <td className="px-4 py-3" style={{ color: adminColors.textMuted }}>{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
