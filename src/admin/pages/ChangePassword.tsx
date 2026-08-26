import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminFetch, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';

export default function ChangePassword() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (newPassword.length < 10) {
      setError('New password must be at least 10 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await adminFetch('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      toast.success('Password changed');
      await refresh();
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to change password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[480px]">
      {user?.must_change_password && (
        <div
          className="mb-5 px-4 py-3 rounded-[12px] text-[14px]"
          style={{ background: 'rgba(255,122,47,.1)', border: '1px solid rgba(255,122,47,.35)', color: '#a1490c' }}
        >
          You're signing in with a temporary password. Set a new one to continue.
        </div>
      )}

      <div style={adminCard} className="p-6">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-1.5 text-[13.5px] font-semibold" style={{ color: adminColors.textMuted }}>
            Current password
            <input style={input} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          <label className="grid gap-1.5 text-[13.5px] font-semibold" style={{ color: adminColors.textMuted }}>
            New password
            <input style={input} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required minLength={10} />
          </label>
          <label className="grid gap-1.5 text-[13.5px] font-semibold" style={{ color: adminColors.textMuted }}>
            Confirm new password
            <input style={input} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required minLength={10} />
          </label>

          {error && (
            <div className="px-3.5 py-2.5 rounded-[10px] text-[13.5px]" style={{ background: 'rgba(224,71,62,.08)', color: adminColors.danger, border: '1px solid rgba(224,71,62,.25)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="py-3 rounded-full text-[15px] disabled:opacity-60" style={adminPrimaryBtn}>
            {submitting ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  );
}
