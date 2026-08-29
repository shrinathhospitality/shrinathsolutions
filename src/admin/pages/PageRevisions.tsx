import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminFetch } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';
import { useConfirmDialog } from '../components/ConfirmDialog';

type Revision = { id: number; created_at: string; created_by_name: string | null };

export default function PageRevisions() {
  const { id } = useParams();
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, dialog } = useConfirmDialog();

  const load = useCallback(() => {
    setLoading(true);
    return adminFetch<{ revisions: Revision[] }>(`/api/admin/pages/${id}/revisions`)
      .then((d) => setRevisions(d.revisions))
      .catch(() => toast.error('Failed to load revisions'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function restore(revisionId: number) {
    confirm({
      title: 'Restore this revision?',
      description: 'The current version will itself be saved as a new revision first.',
      variant: 'restore',
      confirmLabel: 'Restore',
      onConfirm: async () => {
        await adminFetch(`/api/admin/pages/${id}/revisions/${revisionId}/restore`, { method: 'POST' });
        toast.success('Revision restored');
        await load();
      },
    });
  }

  if (loading) return <div style={{ color: adminColors.textMuted }}>Loading…</div>;

  return (
    <div className="w-full grid gap-3">
      {dialog}
      {revisions.length === 0 ? (
        <div style={{ ...adminCard, color: adminColors.textMuted }} className="p-6 text-center">
          No revisions yet — they're created automatically each time this page is updated.
        </div>
      ) : (
        revisions.map((r) => (
          <div key={r.id} style={adminCard} className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[14px] font-semibold">{new Date(r.created_at).toLocaleString()}</div>
              <div className="text-[12.5px]" style={{ color: adminColors.textMuted }}>{r.created_by_name ?? 'Unknown'}</div>
            </div>
            <button type="button" onClick={() => restore(r.id)} className="px-3.5 py-2 rounded-full text-[13px]" style={adminPrimaryBtn}>
              Restore
            </button>
          </div>
        ))
      )}
    </div>
  );
}
