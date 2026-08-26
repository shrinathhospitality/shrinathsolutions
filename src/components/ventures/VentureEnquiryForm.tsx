import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import type { VentureTheme } from '../../types/venture';

type Field = { name: string; label: string; type?: 'text' | 'email' | 'tel' | 'date' | 'number' | 'textarea'; required?: boolean };

/** No backend exists for this project's venture pages, so the enquiry form composes a mailto:
 *  draft from the entered fields and hands off to the visitor's own mail client — no data is
 *  stored or transmitted by this site. */
export default function VentureEnquiryForm({
  fields, email, subject, theme,
}: {
  fields: Field[]; email: string; subject: string; theme: VentureTheme;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = fields.map((f) => `${f.label}: ${values[f.name] ?? ''}`).join('\n');
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.name} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
          <label htmlFor={f.name} className="block text-[13px] font-semibold mb-1.5" style={{ color: theme.text }}>
            {f.label}{f.required && ' *'}
          </label>
          {f.type === 'textarea' ? (
            <textarea
              id={f.name}
              required={f.required}
              rows={3}
              value={values[f.name] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              className="w-full rounded-[12px] px-3.5 py-2.5 text-[14.5px] outline-none"
              style={{ border: `1px solid ${theme.muted}`, background: theme.surface, color: theme.text }}
            />
          ) : (
            <input
              id={f.name}
              type={f.type ?? 'text'}
              required={f.required}
              value={values[f.name] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              className="w-full rounded-[12px] px-3.5 py-2.5 text-[14.5px] outline-none"
              style={{ border: `1px solid ${theme.muted}`, background: theme.surface, color: theme.text }}
            />
          )}
        </div>
      ))}
      <div className="sm:col-span-2 flex items-center gap-4">
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-heading font-bold text-[14.5px]"
          style={{ background: theme.primary, color: theme.surface }}
        >
          <Send size={15} aria-hidden="true" /> Send Enquiry
        </button>
        {sent && <span className="text-[13.5px]" style={{ color: theme.muted }}>Opening your mail app with this enquiry…</span>}
      </div>
    </form>
  );
}
