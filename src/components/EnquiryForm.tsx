import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { wa } from '../data/site';
import { emberBtn } from '../styles/theme';

export type Field = { label: string; name: string; type: string; placeholder: string; required: boolean };

const input: React.CSSProperties = {
  padding: '14px 17px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,.16)',
  background: 'rgba(4,8,20,.5)',
  color: '#fff',
  fontFamily: 'Manrope, sans-serif',
  fontSize: 16,
};

function utmParams(): Record<string, string> {
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const v = p.get(k);
    if (v) out[k] = v;
  }
  return out;
}

/**
 * Saves the enquiry to the database. By default (unchanged UX on other pages) it also opens
 * WhatsApp with the filled details. Pass autoOpenWhatsApp={false} for a form that should only
 * submit and show a success state, per the homepage audit-form spec.
 */
export default function EnquiryForm({
  fields,
  services,
  source,
  autoOpenWhatsApp = true,
}: {
  fields: Field[];
  services: string[];
  source: string;
  autoOpenWhatsApp?: boolean;
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  if (status === 'success') {
    return (
      <div className="grid gap-3 p-2 text-center">
        <span className="mx-auto grid place-items-center rounded-full" style={{ width: 52, height: 52, background: 'rgba(52,211,153,.16)', border: '1px solid rgba(52,211,153,.4)' }}>
          <CheckCircle2 size={26} color="#6ee7b7" aria-hidden="true" />
        </span>
        <div className="font-heading font-bold text-[18px]">Thank you. Our team will review your details and contact you shortly.</div>
        <button type="button" onClick={() => setStatus('idle')} className="text-[14px] font-semibold underline mx-auto" style={{ color: 'rgba(226,234,255,.6)' }}>
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form
      className="grid gap-3.5"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);

        if (String(data.get('website') ?? '').trim()) return; // honeypot: bots fill every field

        setStatus('loading');

        const websiteUrl = String(data.get('website_url') ?? '').trim();
        const message = [websiteUrl && `Website: ${websiteUrl}`, String(data.get('message') ?? '').trim()].filter(Boolean).join('\n');

        const payload = {
          name: data.get('name'),
          phone: data.get('phone'),
          email: data.get('email'),
          message,
          service: data.get('service'),
          page_url: window.location.pathname,
          source,
          website: data.get('website'),
          ...utmParams(),
        };

        try {
          const res = await fetch('/api/public/enquiries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('Request failed');

          if (autoOpenWhatsApp) {
            const lines = [`New enquiry from shrinathsolutions.com (${source})`];
            data.forEach((v, k) => {
              if (k !== 'website' && String(v).trim()) lines.push(k.charAt(0).toUpperCase() + k.slice(1) + ': ' + v);
            });
            window.open(wa(lines.join('\n')), '_blank', 'noopener');
          }

          setStatus('success');
          form.reset();
        } catch {
          setStatus('error');
        }
      }}
    >
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="sr-only" />
      {fields.map((f) => (
        <label key={f.name} className="grid gap-1.5 text-[14.5px] font-semibold" style={{ color: 'rgba(226,234,255,.82)' }}>
          {f.label}
          <input type={f.type} name={f.name} placeholder={f.placeholder} required={f.required} style={input} />
        </label>
      ))}
      <label className="grid gap-1.5 text-[14.5px] font-semibold" style={{ color: 'rgba(226,234,255,.82)' }}>
        Service Required
        <select name="service" style={input}>
          {services.map((s) => (
            <option key={s} value={s} style={{ color: '#0b1020' }}>{s}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-[14.5px] font-semibold" style={{ color: 'rgba(226,234,255,.82)' }}>
        Short Message
        <textarea name="message" rows={3} placeholder="Tell us about your property or business" style={{ ...input, borderRadius: 20, resize: 'vertical' }} />
      </label>

      <button type="submit" disabled={status === 'loading'} className="py-4 rounded-full font-heading font-bold text-[16.5px] flex items-center justify-center gap-2" style={{ ...emberBtn, opacity: status === 'loading' ? 0.75 : 1 }}>
        {status === 'loading' && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
        {status === 'loading' ? 'Sending…' : autoOpenWhatsApp ? 'Send on WhatsApp' : 'Send enquiry'}
      </button>

      {status === 'error' && (
        <span className="flex items-center gap-2 text-[13.5px]" style={{ color: '#fca5a5' }}>
          <AlertCircle size={15} aria-hidden="true" /> Something went wrong. Please try again or message us on WhatsApp.
        </span>
      )}
      {autoOpenWhatsApp && status !== 'error' && (
        <span className="text-[13.5px]" style={{ color: 'rgba(226,234,255,.45)' }}>
          Opens WhatsApp with your details so nothing gets lost.
        </span>
      )}
    </form>
  );
}
