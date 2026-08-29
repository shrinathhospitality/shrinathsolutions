import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminFetch } from '../lib/api';
import { adminColors } from '../adminTheme';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';

type Row = { id: number; name: string; phone: string | null; email: string | null; service: string | null; status: string; created_at: string };

export default function ProposalRequests() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return adminFetch<{ proposals: Row[] }>('/api/admin/proposal-requests?per_page=100')
      .then((d) => { setRows(d.proposals); setLoadError(null); })
      .catch(() => {
        toast.error('Failed to load proposal requests');
        setLoadError("Couldn't load proposal requests.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="grid gap-4 w-full">
      <PageHeader title="Proposal Requests" description="Requests submitted via a dedicated proposal form." count={rows.length} />
      <DataTable<Row>
        columns={proposalColumns()}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={loadError}
        onRetry={load}
        emptyTitle="No proposal requests yet"
        emptyDescription={'The site doesn\'t currently have a distinct "request a proposal" form separate from the main contact form; those submissions land in Contact Enquiries instead. This table is ready for when a dedicated proposal form is added.'}
        caption="Proposal requests with contact, service and received date."
      />
    </div>
  );
}

function proposalColumns(): Column<Row>[] {
  return [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'contact', header: 'Contact', wrap: false, render: (r) => <span style={{ color: adminColors.textMuted }}>{r.phone ?? r.email ?? '—'}</span> },
    { key: 'service', header: 'Service', wrap: false, render: (r) => <span style={{ color: adminColors.textMuted }}>{r.service ?? '—'}</span> },
    { key: 'received', header: 'Received', wrap: false, render: (r) => <span style={{ color: adminColors.textMuted }}>{new Date(r.created_at).toLocaleDateString()}</span> },
  ];
}
