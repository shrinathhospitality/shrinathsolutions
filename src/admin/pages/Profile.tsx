import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { adminFetch, ApiError } from '../lib/api';
import { useAuth, type AdminUser } from '../context/AuthContext';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';

export default function Profile() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input: React.CSSProperties = {
    padding: '12px 15px',
    borderRadius: 10,
    border: `1px solid ${adminColors.cardBorder}`,
    fontSize: 15,
    width: '100%',
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminFetch<{ user: AdminUser }>('/api/admin/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, email }),
      });
      toast.success('Profile updated');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update profile.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[480px]">
      <div style={adminCard} className="p-6">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-1.5 text-[13.5px] font-semibold" style={{ color: adminColors.textMuted }}>
            Full name
            <input style={input} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="grid gap-1.5 text-[13.5px] font-semibold" style={{ color: adminColors.textMuted }}>
            Email
            <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="grid gap-1.5 text-[13.5px] font-semibold" style={{ color: adminColors.textMuted }}>
            Username
            <input style={{ ...input, background: '#f4f6fb', color: adminColors.textMuted }} value={user?.username ?? ''} disabled />
          </label>
          <label className="grid gap-1.5 text-[13.5px] font-semibold" style={{ color: adminColors.textMuted }}>
            Role
            <input style={{ ...input, background: '#f4f6fb', color: adminColors.textMuted }} value={user?.role ?? ''} disabled />
          </label>

          {error && (
            <div className="px-3.5 py-2.5 rounded-[10px] text-[13.5px]" style={{ background: 'rgba(224,71,62,.08)', color: adminColors.danger, border: '1px solid rgba(224,71,62,.25)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="py-3 rounded-full text-[15px] disabled:opacity-60" style={adminPrimaryBtn}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
