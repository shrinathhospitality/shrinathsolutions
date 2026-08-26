import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminCard, adminColors } from '../adminTheme';

type HealthState = 'checking' | 'connected' | 'unavailable';

const upcomingCards = [
  'Total pages', 'Published pages', 'Draft pages', 'Total blogs',
  'Total service pages', 'Total SEO pages', 'Total portfolio projects',
  'New enquiries', 'Total media files',
];

export default function Dashboard() {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthState>('checking');

  useEffect(() => {
    fetch('/api/health.php')
      .then((r) => r.json())
      .then((d) => setHealth(d.success ? 'connected' : 'unavailable'))
      .catch(() => setHealth('unavailable'));
  }, []);

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="font-heading font-bold text-[20px]">Welcome back, {user?.name}.</h2>
        <p className="text-[14.5px] mt-1" style={{ color: adminColors.textMuted }}>
          Content modules are being rolled out stage by stage — this dashboard will fill in as they land.
        </p>
      </div>

      <div style={adminCard} className="p-5 flex items-center gap-3.5 max-w-[420px]">
        {health === 'checking' && <Loader2 size={20} className="animate-spin" style={{ color: adminColors.textMuted }} />}
        {health === 'connected' && <CheckCircle2 size={20} style={{ color: adminColors.success }} />}
        {health === 'unavailable' && <XCircle size={20} style={{ color: adminColors.danger }} />}
        <div>
          <div className="text-[14.5px] font-semibold">Database connection</div>
          <div className="text-[13px]" style={{ color: adminColors.textMuted }}>
            {health === 'checking' ? 'Checking…' : health === 'connected' ? 'Connected' : 'Unavailable'}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[13px] font-bold uppercase tracking-[.08em] mb-3" style={{ color: adminColors.textMuted }}>
          Quick actions
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/profile" style={adminCard} className="px-4 py-3 text-[14px] font-semibold">
            Edit profile
          </Link>
          <Link to="/admin/change-password" style={adminCard} className="px-4 py-3 text-[14px] font-semibold">
            Change password
          </Link>
        </div>
      </div>

      <div>
        <div className="text-[13px] font-bold uppercase tracking-[.08em] mb-3" style={{ color: adminColors.textMuted }}>
          Coming in later stages
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {upcomingCards.map((label) => (
            <div key={label} style={adminCard} className="p-4">
              <div className="text-[24px] font-heading font-bold" style={{ color: adminColors.textMuted, opacity: 0.35 }}>
                —
              </div>
              <div className="text-[13px] mt-1" style={{ color: adminColors.textMuted }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
