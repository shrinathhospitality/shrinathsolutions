import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminFetch } from '../lib/api';
import { adminColors } from '../adminTheme';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';

type Row = { id: number; email: string; status: string; source: string | null; created_at: string };

export default function NewsletterSubscribers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return adminFetch<{ subscribers: Row[] }>('/api/admin/newsletter-subscribers?per_page=100')
      .then((d) => { setRows(d.subscribers); setLoadError(null); })
      .catch(() => {
        toast.error('Failed to load subscribers');
        setLoadError("Couldn't load subscribers.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="grid gap-4 w-full">
      <PageHeader title="Newsletter Subscribers" description="Everyone who has opted in to the newsletter." count={rows.length} />
      <DataTable<Row>
        columns={subscriberColumns()}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={loadError}
        onRetry={load}
        emptyTitle="No subscribers yet"
        caption="Newsletter subscribers with source, status and subscription date."
      />
    </div>
  );
}

function subscriberColumns(): Column<Row>[] {
  return [
    { key: 'email', header: 'Email', render: (r) => <span className="font-medium">{r.email}</span> },
    { key: 'source', header: 'Source', wrap: false, render: (r) => <span style={{ color: adminColors.textMuted }}>{r.source ?? '—'}</span> },
    { key: 'status', header: 'Status', wrap: false, render: (r) => <span className="capitalize" style={{ color: adminColors.textMuted }}>{r.status}</span> },
    { key: 'subscribed', header: 'Subscribed', wrap: false, render: (r) => <span style={{ color: adminColors.textMuted }}>{new Date(r.created_at).toLocaleDateString()}</span> },
  ];
}
