import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';

type Revision = { id: number; created_at: string; created_by_name: string | null };

export default function PageRevisions() {
  const { id } = useParams();
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return adminFetch<{ revisions: Revision[] }>(`/api/admin/pages/${id}/revisions`)
      .then((d) => setRevisions(d.revisions))
      .catch(() => toast.error('Failed to load revisions'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function restore(revisionId: number) {
    if (!confirm('Restore this revision? The current version will itself be saved as a new revision first.')) return;
    try {
      await adminFetch(`/api/admin/pages/${id}/revisions/${revisionId}/restore`, { method: 'POST' });
      toast.success('Revision restored');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to restore');
    }
  }

  if (loading) return <div style={{ color: adminColors.textMuted }}>Loading…</div>;

  return (
    <div className="max-w-[520px] grid gap-3">
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
