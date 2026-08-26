import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, Mail, ExternalLink, Navigation, Minus, Plus, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import type { Venture, VentureTheme } from '../../types/venture';
import { formatIndianPhone, ventureTel, ventureWa } from '../../lib/venturePhone';

/** Every venture primitive below is driven purely by the venture's own theme tokens — no
 *  Shrinath Solutions dark-gradient styling — so each venture reads as its own microsite. */

export function VentureBreadcrumb({ theme, name }: { theme: VentureTheme; name: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-shell px-[22px] pt-6 flex flex-wrap gap-2 text-[13.5px]">
      <Link to="/our-ventures" style={{ color: theme.muted }}>Our Ventures</Link>
      <span style={{ color: theme.muted }}>/</span>
      <span aria-current="page" style={{ color: theme.text, fontWeight: 600 }}>{name}</span>
    </nav>
  );
}

export function VentureButton({
  href, to, onClick, variant = 'primary', theme, children, external = false,
}: {
  href?: string; to?: string; onClick?: () => void; variant?: 'primary' | 'secondary' | 'outline';
  theme: VentureTheme; children: React.ReactNode; external?: boolean;
}) {
  const style =
    variant === 'primary'
      ? { background: theme.primary, color: theme.onPrimary, border: `1px solid ${theme.primary}` }
      : variant === 'secondary'
      ? { background: theme.accent, color: theme.secondary, border: `1px solid ${theme.accent}` }
      : { background: 'transparent', color: theme.text, border: `1.5px solid ${theme.text}` };

  const className = 'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-heading font-bold text-[14.5px] min-h-[44px] transition-transform hover:-translate-y-0.5';

  if (to) return <Link to={to} className={className} style={style} onClick={onClick}>{children}</Link>;
  return (
    <a href={href} className={className} style={style} onClick={onClick} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  );
}

/** Desktop-friendly row of only the contact actions this venture actually has. */
export function VentureContactRow({ venture, theme }: { venture: Venture; theme: VentureTheme }) {
  return (
    <div className="flex flex-wrap gap-3">
      {venture.phoneNumbers.map((n) => (
        <VentureButton key={n} href={ventureTel(n)} theme={theme} variant="primary">
          <Phone size={16} aria-hidden="true" /> {formatIndianPhone(n)}
        </VentureButton>
      ))}
      {venture.email && (
        <VentureButton href={`mailto:${venture.email}`} theme={theme} variant="outline">
          <Mail size={16} aria-hidden="true" /> Email
        </VentureButton>
      )}
      {venture.website && (
        <VentureButton href={venture.website} theme={theme} variant="outline" external>
          <ExternalLink size={16} aria-hidden="true" /> Visit Website
        </VentureButton>
      )}
      {venture.googleBusinessUrl && (
        <VentureButton href={venture.googleBusinessUrl} theme={theme} variant="outline" external>
          <Navigation size={16} aria-hidden="true" /> Directions
        </VentureButton>
      )}
    </div>
  );
}

/** Fixed mobile bar with only the actions this venture has, sitting above the site-wide
 *  MobileBar (which stays visible for Shrinath Solutions' own contact info) rather than
 *  replacing it — so the two never overlap. */
export function VentureStickyBar({ venture, theme }: { venture: Venture; theme: VentureTheme }) {
  const actions: { key: string; href: string; label: string; icon: React.ReactNode; external?: boolean }[] = [];
  if (venture.phoneNumbers[0]) {
    actions.push({ key: 'call', href: ventureTel(venture.phoneNumbers[0]), label: 'Call', icon: <Phone size={16} aria-hidden="true" /> });
    actions.push({ key: 'wa', href: ventureWa(venture.phoneNumbers[0], `Hi ${venture.name}, I have an enquiry.`), label: 'WhatsApp', icon: <MessageCircle size={16} aria-hidden="true" />, external: true });
  }
  if (venture.website) actions.push({ key: 'web', href: venture.website, label: 'Website', icon: <ExternalLink size={16} aria-hidden="true" />, external: true });
  if (venture.googleBusinessUrl) actions.push({ key: 'dir', href: venture.googleBusinessUrl, label: 'Directions', icon: <Navigation size={16} aria-hidden="true" />, external: true });
  if (actions.length === 0) return null;

  return (
    <div
      className="fixed left-0 right-0 z-30 grid md:hidden"
      style={{ bottom: 58, gridTemplateColumns: `repeat(${actions.length}, minmax(0,1fr))`, borderTop: `1px solid ${theme.muted}`, background: theme.surface }}
    >
      {actions.map((a) => (
        <a
          key={a.key}
          href={a.href}
          {...(a.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="py-2.5 grid place-items-center gap-0.5 text-[11.5px] font-semibold"
          style={{ color: theme.primary }}
        >
          {a.icon}
          {a.label}
        </a>
      ))}
    </div>
  );
}

export function VentureFaqAccordion({ faqs, theme }: { faqs: { question: string; answer: string }[]; theme: VentureTheme }) {
  const [open, setOpen] = useState(-1);
  const uid = useId();
  return (
    <div className="rounded-[20px] overflow-hidden" style={{ border: `1px solid ${theme.muted}`, background: theme.surface }}>
      {faqs.map((f, i) => {
        const isOpen = open === i;
        const panelId = `${uid}-panel-${i}`;
        const buttonId = `${uid}-button-${i}`;
        return (
          <div key={f.question} style={{ borderBottom: i === faqs.length - 1 ? 'none' : `1px solid ${theme.muted}` }}>
            <h3 className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="w-full flex items-center justify-between gap-3.5 px-6 py-5 text-left font-heading font-bold text-[16px]"
                style={{ color: theme.text }}
              >
                {f.question}
                {isOpen ? <Minus size={18} style={{ color: theme.primary }} aria-hidden="true" /> : <Plus size={18} style={{ color: theme.primary }} aria-hidden="true" />}
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <p className="m-0 px-6 pb-5 text-[15px]" style={{ color: theme.muted, lineHeight: 1.65 }}>{f.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function VenturePrevNext({ prev, next, theme }: { prev: Venture | null; next: Venture | null; theme: VentureTheme }) {
  if (!prev && !next) return null;
  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      {prev && (
        <Link to={`/our-ventures/${prev.slug}`} className="flex items-center gap-3 p-4 rounded-[16px]" style={{ border: `1px solid ${theme.muted}`, background: theme.surface }}>
          <ChevronLeft size={18} style={{ color: theme.primary }} aria-hidden="true" />
          <div>
            <div className="text-[12px] uppercase tracking-[.08em]" style={{ color: theme.muted }}>Previous venture</div>
            <div className="font-heading font-bold text-[15px]" style={{ color: theme.text }}>{prev.name}</div>
          </div>
        </Link>
      )}
      {next && (
        <Link to={`/our-ventures/${next.slug}`} className="flex items-center justify-between gap-3 p-4 rounded-[16px] sm:text-right" style={{ border: `1px solid ${theme.muted}`, background: theme.surface }}>
          <div className="sm:order-1">
            <div className="text-[12px] uppercase tracking-[.08em]" style={{ color: theme.muted }}>Next venture</div>
            <div className="font-heading font-bold text-[15px]" style={{ color: theme.text }}>{next.name}</div>
          </div>
          <ChevronRight size={18} style={{ color: theme.primary }} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export function VentureBackLink({ theme }: { theme: VentureTheme }) {
  return (
    <Link to="/our-ventures" className="inline-flex items-center gap-2 text-[14px] font-semibold" style={{ color: theme.primary }}>
      <ChevronLeft size={16} aria-hidden="true" /> Back to All Ventures
    </Link>
  );
}
