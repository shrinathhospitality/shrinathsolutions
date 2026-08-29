import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { adminFetch, ApiError } from '../lib/api';
import { adminCard, adminColors, adminPrimaryBtn } from '../adminTheme';

const LABELS: Record<string, string> = {
  logo_url: 'Site logo image (used in header & footer)',
  site_name: 'Website name',
  site_url: 'Site URL',
  phone: 'Phone',
  whatsapp_number: 'WhatsApp number (digits only, with country code)',
  email: 'Email',
  location: 'Location',
  copyright_text: 'Copyright text',
  header_topbar_message: 'Top bar message',
  header_cta_text: 'Header CTA button text',
  header_cta_url: 'Header CTA button URL',
  header_topbar_cta_text: 'Top bar CTA text',
  header_topbar_cta_url: 'Top bar CTA URL',
  footer_about_text: 'Footer about text',
  footer_newsletter_heading: 'Newsletter heading',
  footer_newsletter_description: 'Newsletter description',
  footer_statement: 'Footer main statement (two lines — second line is gradient-highlighted)',
  footer_cta_heading: 'Footer project-enquiry heading',
  footer_cta_description: 'Footer project-enquiry description (two lines)',
  footer_cta_proposal_label: 'Footer proposal button text',
  footer_cta_whatsapp_label: 'Footer WhatsApp button text',
  footer_trust_points: 'Footer trust points (separate with |)',
};

const LONG_KEYS = new Set(['footer_about_text', 'header_topbar_message', 'footer_statement', 'footer_cta_description']);

export default function SiteSettings() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    adminFetch<{ settings: Record<string, string> }>('/api/admin/site-settings')
      .then((d) => setSettings({ logo_url: '', ...d.settings }))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSubmitting(true);
    try {
      const data = await adminFetch<{ settings: Record<string, string> }>('/api/admin/site-settings', {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      });
      setSettings(data.settings);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save settings');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={{ color: adminColors.textMuted }}>Loading…</div>;
  }
  if (!settings) {
    return <div style={{ color: adminColors.danger }}>Could not load settings.</div>;
  }

  const input: React.CSSProperties = {
    padding: '11px 14px',
    borderRadius: 10,
    border: `1px solid ${adminColors.cardBorder}`,
    fontSize: 14.5,
    width: '100%',
  };

  return (
    <form onSubmit={onSubmit} className="w-full grid gap-5">
      <div style={adminCard} className="p-6 grid gap-4">
        {Object.keys(settings).map((key) => (
          <label key={key} className="grid gap-1.5 text-[13.5px] font-semibold" style={{ color: adminColors.textMuted }}>
            {LABELS[key] ?? key}
            {LONG_KEYS.has(key) ? (
              <textarea
                style={{ ...input, resize: 'vertical' }}
                rows={3}
                value={settings[key] ?? ''}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
              />
            ) : (
              <input
                style={input}
                placeholder={key === 'logo_url' ? 'uploads/2026/.../logo.png or https://…' : undefined}
                value={settings[key] ?? ''}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
              />
            )}
            {key === 'logo_url' && (
              <>
                <span className="font-normal text-[12.5px]" style={{ color: adminColors.textMuted }}>
                  Copy an image path from the{' '}
                  <a href="/admin/media" target="_blank" rel="noreferrer" style={{ color: adminColors.accentBlue }}>
                    Media Library
                  </a>
                  . Shown in place of the "S" badge in both the header and footer when set.
                </span>
                {settings[key] && (
                  <span className="grid place-items-center w-fit p-2 rounded-lg" style={{ background: '#0b1933', border: `1px solid ${adminColors.cardBorder}` }}>
                    <img src={settings[key]} alt="Logo preview" className="h-10 w-auto object-contain" />
                  </span>
                )}
              </>
            )}
          </label>
        ))}
      </div>
      <button type="submit" disabled={submitting} className="justify-self-start px-6 py-3 rounded-full text-[15px] disabled:opacity-60" style={adminPrimaryBtn}>
        {submitting ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
