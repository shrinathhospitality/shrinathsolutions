import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminCard, adminColors, adminPrimaryBtn } from '../../adminTheme';
import { seoStudioApi } from '../../../features/seo-studio/api';
import { CapabilityButton } from '../../../features/seo-studio/components/CapabilityButton';

const input: React.CSSProperties = { padding: '11px 14px', borderRadius: 10, border: `1px solid ${adminColors.cardBorder}`, fontSize: 14.5, width: '100%', maxWidth: 260 };
const label: React.CSSProperties = { color: adminColors.textMuted, fontSize: 13.5, fontWeight: 600 };

type SettingsForm = { bulk_batch_size: number; stale_cornerstone_days: number };

const defaults: SettingsForm = { bulk_batch_size: 15, stale_cornerstone_days: 90 };

export default function SeoStudioSettings() {
  const [form, setForm] = useState<SettingsForm>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    seoStudioApi.settings().then((d) => {
      setForm({
        bulk_batch_size: (d.settings.bulk_batch_size as number) ?? defaults.bulk_batch_size,
        stale_cornerstone_days: (d.settings.stale_cornerstone_days as number) ?? defaults.stale_cornerstone_days,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await seoStudioApi.saveSettings(form);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ color: adminColors.textMuted }}>Loading…</div>;

  return (
    <div className="grid gap-5 w-full">
      <h2 className="font-heading font-bold text-[19px] m-0">SEO Studio settings</h2>

      <div style={adminCard} className="p-6 grid gap-4">
        <div className="font-heading font-bold text-[15px]">Bulk analysis</div>
        <label className="grid gap-1.5" style={label}>
          Items per batch (client-driven — a page is processed synchronously, one batch per request)
          <input type="number" min={1} max={30} style={input} value={form.bulk_batch_size} onChange={(e) => setForm({ ...form, bulk_batch_size: Number(e.target.value) })} />
        </label>
      </div>

      <div style={adminCard} className="p-6 grid gap-4">
        <div className="font-heading font-bold text-[15px]">Cornerstone content</div>
        <label className="grid gap-1.5" style={label}>
          Days before cornerstone content is flagged as stale on the dashboard
          <input type="number" min={7} style={input} value={form.stale_cornerstone_days} onChange={(e) => setForm({ ...form, stale_cornerstone_days: Number(e.target.value) })} />
        </label>
      </div>

      <div style={adminCard} className="p-6">
        <div className="font-heading font-bold text-[15px] mb-2">About this scoring engine</div>
        <p className="text-[13px] m-0" style={{ color: adminColors.textMuted }}>
          Shrinath SEO Studio uses an original, documented scoring specification — see{' '}
          <code>docs/SEO_SCORING_SPECIFICATION.md</code> in the project repository for the full formula, every check,
          and every threshold. Scores are never fabricated or hardcoded — they come directly from analyzing this
          page's own saved content each time it's analyzed.
        </p>
      </div>

      <CapabilityButton capability="seo.manage_settings" onClick={handleSave} disabled={saving} className="justify-self-start px-6 py-3 rounded-full text-[15px] disabled:opacity-60" style={adminPrimaryBtn}>
        {saving ? 'Saving…' : 'Save settings'}
      </CapabilityButton>
    </div>
  );
}
