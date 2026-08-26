import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Facebook, Instagram, Linkedin, Youtube, type LucideIcon,
  Monitor, Megaphone, Search, Building2, Mail, Phone, Lock, Loader2, CheckCircle2, AlertCircle,
  ShieldCheck, MapPin, Headset, ArrowRight, Heart, MessageCircle,
} from 'lucide-react';
import { footerColumns as staticFooterColumns, site, wa } from '../data/site';
import { seoLinkDirectory } from '../data/seoLinkDirectory';
import { emberBtn } from '../styles/theme';
import { useSiteData } from '../context/SiteDataContext';

const SOCIAL_ICONS: Record<string, LucideIcon> = { facebook: Facebook, instagram: Instagram, linkedin: Linkedin, youtube: Youtube };
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'website services': Monitor,
  marketing: Megaphone,
  seo: Search,
  'hotel technology': Building2,
};

const legalLinks = [
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms & Conditions', to: '/terms-conditions' },
  { label: 'Sitemap', to: '/sitemap' },
];

/** Left brand column: logo, statement, description, contact, socials. */
function BrandProfile({
  siteName,
  logoUrl,
  statement,
  aboutText,
  phone,
  email,
  location,
  socials,
}: {
  siteName: string;
  logoUrl?: string;
  statement: string;
  aboutText: string;
  phone: string;
  email: string;
  location: string;
  socials: { Icon: LucideIcon; label: string; href: string }[];
}) {
  const [statementLine1, statementLine2] = statement.split('\n');

  return (
    <div>
      <Link to="/" className="flex items-center gap-3 !text-white w-fit">
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} className="shrink-0 object-contain" style={{ height: 46, maxWidth: 180 }} />
        ) : (
          <span
            className="grid place-items-center font-heading font-extrabold text-[19px]"
            style={{ width: 46, height: 46, borderRadius: 15, background: 'linear-gradient(140deg,#3b6bff,#7b5cff 60%,#22d3ee)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5)' }}
          >
            S
          </span>
        )}
        <span className="flex flex-col leading-tight">
          <span className="font-heading font-bold text-[19px]">{siteName}</span>
          <span className="text-[11px] uppercase tracking-[.16em]" style={{ color: 'rgba(233,239,255,.5)' }}>
            Jaisalmer &bull; Rajasthan &bull; India
          </span>
        </span>
      </Link>

      <h2 className="font-heading font-extrabold leading-[1.1] mt-6 mb-0" style={{ fontSize: 'clamp(30px,3.4vw,42px)', letterSpacing: '-0.02em', color: '#f8fafc' }}>
        {statementLine1}
        {statementLine2 && (
          <>
            <br />
            <span style={{ background: 'linear-gradient(100deg,#27a7ff,#9a55ff)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {statementLine2}
            </span>
          </>
        )}
      </h2>

      <p className="text-[16px] mt-4 max-w-[420px]" style={{ color: 'rgba(226,234,255,.62)', lineHeight: 1.68 }}>{aboutText}</p>

      <div className="grid gap-2.5 mt-5 text-[15.5px]">
        <a href={`tel:${phone.replace(/\s+/g, '')}`} className="flex items-center gap-2.5 w-fit" style={{ color: 'rgba(233,239,255,.85)' }}>
          <Phone size={15} color="#27a7ff" aria-hidden="true" />
          {phone}
        </a>
        <a href={`mailto:${email}`} className="flex items-center gap-2.5 w-fit" style={{ color: 'rgba(233,239,255,.85)' }}>
          <Mail size={15} color="#27a7ff" aria-hidden="true" />
          {email}
        </a>
        <span className="flex items-center gap-2.5" style={{ color: 'rgba(226,234,255,.5)' }}>
          <MapPin size={15} aria-hidden="true" />
          {location}
        </span>
      </div>

      {socials.length > 0 && (
        <div className="flex gap-2.5 mt-5">
          {socials.map(({ Icon, label, href }) => (
            <a
              key={label}
              href={href}
              aria-label={label}
              className="grid place-items-center transition-all hover:-translate-y-0.5"
              style={{ width: 48, height: 48, borderRadius: 13, border: '1px solid rgba(125,158,211,.22)', background: 'rgba(255,255,255,.03)' }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(39,167,255,.5), 0 0 18px rgba(39,167,255,.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              <Icon size={18} strokeWidth={2.25} aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/** Decorative Website → Search → Enquiry workflow. No fake data, purely illustrative. */
function WorkflowNodes() {
  const nodes = [
    { Icon: Monitor, label: 'Website' },
    { Icon: Search, label: 'Search' },
    { Icon: Mail, label: 'Enquiry' },
  ];
  return (
    <div className="hidden md:flex items-center gap-4 shrink-0" aria-hidden="true">
      {nodes.map((n, i) => (
        <div key={n.label} className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <span
              className="grid place-items-center rounded-full"
              style={{ width: 46, height: 46, border: '1px solid rgba(125,158,211,.3)', background: 'rgba(11,25,51,.6)' }}
            >
              <n.Icon size={19} color="#27a7ff" />
            </span>
            <span className="text-[12px] font-medium" style={{ color: 'rgba(226,234,255,.55)' }}>{n.label}</span>
          </div>
          {i < nodes.length - 1 && (
            <svg width="32" height="18" viewBox="0 0 32 18" fill="none" style={{ marginBottom: 16 }}>
              <path d="M0 9 Q 16 -4 32 9" stroke="url(#footerWorkflowLine)" strokeWidth="1.5" strokeDasharray="3 3" />
              <defs>
                <linearGradient id="footerWorkflowLine" x1="0" y1="0" x2="32" y2="0">
                  <stop stopColor="#27a7ff" />
                  <stop offset="1" stopColor="#9a55ff" />
                </linearGradient>
              </defs>
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

/** Upper half of the project panel: heading, copy, CTAs, decorative workflow. */
function ProjectCTA({ heading, description, proposalLabel, whatsappLabel }: { heading: string; description: string; proposalLabel: string; whatsappLabel: string }) {
  const [line1, line2] = description.split('\n');
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-7 py-6 md:px-8 md:py-7">
      <div className="min-w-0">
        <h3 className="font-heading font-bold text-[clamp(21px,2.1vw,26px)] leading-[1.2] m-0" style={{ color: '#f8fafc' }}>{heading}</h3>
        <p className="mt-2 mb-0 text-[14.5px] max-w-[360px]" style={{ color: 'rgba(226,234,255,.65)', lineHeight: 1.5 }}>
          {line1}{line2 && <><br />{line2}</>}
        </p>
        <div className="flex flex-nowrap gap-2.5 mt-4">
          <Link to="/contact" className="group inline-flex items-center gap-1.5 px-5 py-3 rounded-full font-heading font-bold text-[14px] whitespace-nowrap" style={emberBtn}>
            {proposalLabel} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <a
            href={wa()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full font-bold text-[14px] whitespace-nowrap"
            style={{ color: '#eaf1ff', border: '1px solid rgba(125,158,211,.3)', background: 'rgba(11,25,51,.5)' }}
          >
            <MessageCircle size={15} aria-hidden="true" /> {whatsappLabel}
          </a>
        </div>
      </div>
      <WorkflowNodes />
    </div>
  );
}

/** Lower half of the project panel: newsletter signup, wired to the real subscribe endpoint. */
function NewsletterForm({ heading, description }: { heading: string; description: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get('email') ?? '').trim();
    if (!email) return;

    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/public/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'footer' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message ?? 'Something went wrong. Please try again.');
      setStatus('success');
      form.reset();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 px-7 py-5 md:px-8 md:py-6" style={{ borderTop: '1px solid rgba(125,158,211,.16)' }}>
      <div className="flex items-start gap-3.5 max-w-[340px]">
        <span
          className="grid place-items-center shrink-0"
          style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid rgba(125,158,211,.3)', background: 'linear-gradient(140deg, rgba(39,167,255,.18), rgba(154,85,255,.14))' }}
        >
          <Mail size={17} color="#27a7ff" aria-hidden="true" />
        </span>
        <div>
          <div className="font-heading font-bold text-[16.5px]">{heading}</div>
          <p className="m-0 mt-1 text-[14.5px]" style={{ color: 'rgba(226,234,255,.6)' }}>{description}</p>
        </div>
      </div>

      <div className="w-full md:w-auto md:min-w-[360px]">
        {status === 'success' ? (
          <div className="flex items-center gap-2 text-[14.5px] font-semibold" style={{ color: '#6ee7b7' }}>
            <CheckCircle2 size={18} aria-hidden="true" /> Subscribed. Thanks for joining!
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <label htmlFor="footer-newsletter-email" className="sr-only">Your email address</label>
            <div className="flex flex-wrap gap-2">
              <input
                id="footer-newsletter-email"
                type="email"
                name="email"
                required
                placeholder="Enter your email"
                disabled={status === 'loading'}
                className="flex-1 min-w-[180px] px-4 py-3.5 rounded-full text-[15px] text-white"
                style={{ border: `1px solid ${status === 'error' ? 'rgba(255,100,30,.6)' : 'rgba(125,158,211,.25)'}`, background: 'rgba(2,8,23,.5)' }}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="flex items-center justify-center gap-1.5 px-6 py-3.5 rounded-full font-bold text-[15px] disabled:opacity-70"
                style={emberBtn}
              >
                {status === 'loading' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <>Subscribe <ArrowRight size={15} aria-hidden="true" /></>}
              </button>
            </div>
            {status === 'error' ? (
              <span className="flex items-center gap-1.5 mt-2 text-[13px]" style={{ color: '#fca5a5' }}>
                <AlertCircle size={13} aria-hidden="true" /> {errorMsg}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 mt-2 text-[13px]" style={{ color: 'rgba(226,234,255,.42)' }}>
                <Lock size={12} aria-hidden="true" /> We respect your privacy. Unsubscribe anytime.
              </span>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

/** Right panel: the CTA + newsletter combined inside one bordered card. */
function ProjectEnquiryPanel({
  ctaHeading, ctaDescription, proposalLabel, whatsappLabel, newsletterHeading, newsletterDescription,
}: {
  ctaHeading: string; ctaDescription: string; proposalLabel: string; whatsappLabel: string;
  newsletterHeading: string; newsletterDescription: string;
}) {
  return (
    <div
      className="rounded-[26px] p-[1.5px]"
      style={{ background: 'linear-gradient(135deg, rgba(33,212,253,.55), rgba(154,85,255,.45) 60%, rgba(39,167,255,.35))', animation: 'footerPanelGlow 8s ease-in-out infinite' }}
    >
      <div
        className="rounded-[24.5px] overflow-hidden relative"
        style={{ background: 'radial-gradient(circle at 15% 15%, rgba(39,167,255,.1), transparent 55%), radial-gradient(circle at 90% 90%, rgba(154,85,255,.1), transparent 55%), #0B1C3B' }}
      >
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ opacity: 0.4, backgroundImage: 'radial-gradient(rgba(139,166,215,.14) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
        <div className="relative">
          <ProjectCTA heading={ctaHeading} description={ctaDescription} proposalLabel={proposalLabel} whatsappLabel={whatsappLabel} />
          <NewsletterForm heading={newsletterHeading} description={newsletterDescription} />
        </div>
      </div>
    </div>
  );
}

/** Four-category service navigation band, driven entirely by the CMS footer sections. */
function FooterServiceNavigation({ columns }: { columns: { title: string; links: { label: string; to: string }[] }[] }) {
  if (columns.length === 0) return null;

  return (
    <nav aria-label="Services" className="mx-auto max-w-shell px-[22px] py-11" style={{ borderTop: '1px solid rgba(125,158,211,.14)' }}>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((col, i) => {
          const Icon = CATEGORY_ICONS[col.title.toLowerCase()] ?? Monitor;
          return (
            <div key={col.title} className={i > 0 ? 'lg:pl-8' : ''} style={i > 0 ? { borderLeft: '1px solid rgba(125,158,211,.12)' } : undefined}>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="grid place-items-center shrink-0" style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(125,158,211,.25)', background: 'rgba(39,167,255,.1)' }}>
                  <Icon size={16} color="#27a7ff" aria-hidden="true" />
                </span>
                <span className="font-heading font-bold text-[14px] uppercase tracking-[.1em]">{col.title}</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {col.links.map((l) => (
                  <Link key={l.label} to={l.to} className="group flex items-center gap-1.5 text-[14.5px]" style={{ color: 'rgba(226,234,255,.62)' }}>
                    <span className="truncate">{l.label}</span>
                    <ArrowRight size={12} className="shrink-0 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" style={{ color: '#27a7ff' }} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/** Dense internal-link directory for the 74 city/service SEO landing pages — grouped, wrapped
 *  plain-text rows rather than another card grid, since the point here is crawlable link volume
 *  and quick scanning, not visual weight. */
function SeoLinkDirectory() {
  return (
    <div className="mx-auto max-w-shell px-[22px] py-10" style={{ borderTop: '1px solid rgba(125,158,211,.14)' }}>
      <div className="grid gap-7">
        {seoLinkDirectory.map((group) => (
          <div key={group.title}>
            <h5 className="mb-3 text-[12px] font-bold uppercase tracking-[.1em]" style={{ color: 'rgba(226,234,255,.42)' }}>
              {group.title}
            </h5>
            <div className="flex flex-wrap gap-x-1 gap-y-1.5 text-[13.5px]" style={{ color: 'rgba(226,234,255,.4)' }}>
              {group.links.map((l, i) => (
                <span key={l.to} className="flex items-center">
                  <Link to={l.to} style={{ color: 'rgba(226,234,255,.58)' }} className="hover:!text-white whitespace-nowrap">
                    {l.label}
                  </Link>
                  {i < group.links.length - 1 && <span className="mx-2" aria-hidden="true">&middot;</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FooterTrustAndLegal({ trustPoints }: { trustPoints: string[] }) {
  const icons = [ShieldCheck, MapPin, Headset];
  return (
    <div className="mx-auto max-w-shell px-[22px] py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(125,158,211,.14)' }}>
      {trustPoints.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] font-medium" style={{ color: 'rgba(226,234,255,.6)' }}>
          {trustPoints.map((t, i) => {
            const Icon = icons[i % icons.length];
            return (
              <span key={t} className="flex items-center gap-1.5">
                <Icon size={15} color="#27a7ff" aria-hidden="true" /> {t}
              </span>
            );
          })}
        </div>
      )}
      <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px]">
        {legalLinks.map((l, i) => (
          <span key={l.to} className="flex items-center gap-5">
            {i > 0 && <span aria-hidden="true" style={{ color: 'rgba(125,158,211,.3)' }}>|</span>}
            <Link to={l.to} style={{ color: 'rgba(226,234,255,.62)' }}>{l.label}</Link>
          </span>
        ))}
      </nav>
    </div>
  );
}

function FooterCopyright({ copyright }: { copyright: string }) {
  return (
    <div className="mx-auto max-w-shell px-[22px] py-6 grid gap-4 md:grid-cols-3 items-center" style={{ borderTop: '1px solid rgba(125,158,211,.14)' }}>
      <span className="text-[14px] order-1" style={{ color: 'rgba(226,234,255,.5)' }}>
        {copyright.replace(/^©\s*\d{4}/, `© ${new Date().getFullYear()}`)}
      </span>
      <div className="hidden md:flex items-center justify-center gap-3 order-2" aria-hidden="true">
        <span className="flex-1" style={{ height: 1, background: 'linear-gradient(90deg, transparent, #27a7ff, #9a55ff, transparent)' }} />
        <span className="grid place-items-center rounded-full font-heading font-bold text-[13px] shrink-0" style={{ width: 30, height: 30, border: '1px solid rgba(125,158,211,.3)', background: '#0b1933' }}>S</span>
        <span className="flex-1" style={{ height: 1, background: 'linear-gradient(90deg, transparent, #9a55ff, #27a7ff, transparent)' }} />
      </div>
      <span className="text-[14px] flex items-center gap-1.5 md:justify-end order-3" style={{ color: 'rgba(226,234,255,.5)' }}>
        Created with purpose in Jaisalmer <Heart size={14} color="#ff641e" fill="none" aria-hidden="true" />
      </span>
    </div>
  );
}

export default function Footer() {
  const { footer } = useSiteData();

  const siteName = footer?.settings.site_name ?? site.name;
  const logoUrl = footer?.settings.logo_url;
  const statement = footer?.settings.footer_statement ?? 'Digital Growth,\nBuilt for Hospitality.';
  const aboutText = footer?.settings.footer_about_text ?? "We build high-performance websites, drive targeted marketing, and power hotels with smart technology — so you can focus on guests, we'll handle the growth.";
  const phone = footer?.settings.phone ?? site.phone;
  const email = footer?.settings.email ?? site.email;
  const location = footer?.settings.location ?? site.location;
  const copyright = footer?.settings.copyright_text ?? site.copyright;
  const ctaHeading = footer?.settings.footer_cta_heading ?? 'Have a Project in Mind?';
  const ctaDescription = footer?.settings.footer_cta_description ?? "Tell us what you want to improve.\nWe'll help you find the clearest next step.";
  const proposalLabel = footer?.settings.footer_cta_proposal_label ?? 'Get a Free Proposal';
  const whatsappLabel = footer?.settings.footer_cta_whatsapp_label ?? 'Chat on WhatsApp';
  const newsletterHeading = footer?.settings.footer_newsletter_heading ?? 'Hotel Growth Notes';
  const newsletterDescription = footer?.settings.footer_newsletter_description ?? 'One email a month. Practical ideas to grow your hotel business.';
  const trustPoints = (footer?.settings.footer_trust_points ?? 'Hospitality-focused|Based in Jaisalmer|Transparent support').split('|').map((t) => t.trim()).filter(Boolean);

  const socials = footer
    ? footer.social_links.map((s) => ({ Icon: (s.icon && SOCIAL_ICONS[s.icon]) || Facebook, label: s.platform, href: s.url }))
    : [
        { Icon: Facebook, label: 'Facebook', href: '#' },
        { Icon: Instagram, label: 'Instagram', href: '#' },
        { Icon: Linkedin, label: 'LinkedIn', href: '#' },
        { Icon: Youtube, label: 'YouTube', href: '#' },
      ];

  const columns = footer
    ? footer.sections.map((s) => ({ title: s.title, links: s.links.map((l) => ({ label: l.label, to: l.url })) }))
    : staticFooterColumns;

  return (
    <footer
      className="relative overflow-hidden mt-16 md:mt-24"
      style={{ borderTop: '1px solid rgba(255,255,255,.12)', background: '#07142E' }}
    >
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 8% 0%, rgba(39,167,255,.12), transparent 45%), radial-gradient(circle at 95% 30%, rgba(154,85,255,.1), transparent 45%)' }} />

      <div className="relative mx-auto max-w-shell px-[22px] pt-16 pb-2">
        <div className="grid gap-12 lg:grid-cols-[0.62fr_1fr] items-start">
          <BrandProfile siteName={siteName} logoUrl={logoUrl} statement={statement} aboutText={aboutText} phone={phone} email={email} location={location} socials={socials} />
          <ProjectEnquiryPanel
            ctaHeading={ctaHeading}
            ctaDescription={ctaDescription}
            proposalLabel={proposalLabel}
            whatsappLabel={whatsappLabel}
            newsletterHeading={newsletterHeading}
            newsletterDescription={newsletterDescription}
          />
        </div>
      </div>

      <div className="relative">
        <FooterServiceNavigation columns={columns} />
        <SeoLinkDirectory />
        <FooterTrustAndLegal trustPoints={trustPoints} />
        <FooterCopyright copyright={copyright} />
      </div>
    </footer>
  );
}
