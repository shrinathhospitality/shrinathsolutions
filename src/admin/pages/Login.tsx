import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { emberBtn } from '../../styles/theme';

export default function AdminLogin() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) {
    const dest = user.must_change_password ? '/admin/change-password' : ((location.state as { from?: string })?.from ?? '/admin');
    return <Navigate to={dest} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedIn = await login(username, password);
      toast.success('Signed in');
      navigate(loggedIn.must_change_password ? '/admin/change-password' : '/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  const input: React.CSSProperties = {
    padding: '13px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,.16)',
    background: 'rgba(4,8,20,.5)',
    color: '#fff',
    fontFamily: 'Manrope, sans-serif',
    fontSize: 15.5,
    width: '100%',
  };

  return (
    <div className="min-h-screen grid place-items-center px-5" style={{ background: '#070a17' }}>
      <div className="w-full max-w-[400px] p-8 rounded-[22px]" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)' }}>
        <div className="flex items-center gap-3 mb-6">
          <span
            className="grid place-items-center font-heading font-extrabold text-[19px]"
            style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(140deg,#3b6bff,#7b5cff 60%,#22d3ee)' }}
          >
            S
          </span>
          <div>
            <div className="font-heading font-bold text-[16px] text-white">Shrinath Solutions</div>
            <div className="text-[12.5px]" style={{ color: 'rgba(226,234,255,.5)' }}>Admin sign in</div>
          </div>
        </div>

        <form className="grid gap-3.5" onSubmit={onSubmit}>
          <label className="grid gap-1.5 text-[14px] font-semibold" style={{ color: 'rgba(226,234,255,.82)' }}>
            Username or email
            <input style={input} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </label>
          <label className="grid gap-1.5 text-[14px] font-semibold" style={{ color: 'rgba(226,234,255,.82)' }}>
            Password
            <input style={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>

          {error && (
            <div className="px-3.5 py-2.5 rounded-[10px] text-[13.5px]" style={{ background: 'rgba(224,71,62,.15)', color: '#ff9d97', border: '1px solid rgba(224,71,62,.3)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="mt-1 py-3.5 rounded-full font-heading font-bold text-[15.5px] disabled:opacity-60" style={emberBtn}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
