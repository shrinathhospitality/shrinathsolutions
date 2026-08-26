import {
  Globe2, Smartphone, Search, MapPin, Megaphone, ShoppingCart, Wallet, Wrench,
  Star, MessageSquare, Share2, TrendingUp, Building2, Wifi, CalendarCheck, type LucideIcon,
} from 'lucide-react';
import { glassStrong } from '../../styles/theme';

/** Coarse visual family per service category — CSS/icons only, no fake analytics. */
type VisualKind = 'website' | 'seo' | 'marketing' | 'ads' | 'social' | 'hotel-tech' | 'ecommerce' | 'generic';

function visualKindFor(category?: string | null): VisualKind {
  const c = (category ?? '').toLowerCase();
  if (/hotel tech|channel manager|pms|booking engine|ota/.test(c)) return 'hotel-tech';
  if (/e-?commerce/.test(c)) return 'ecommerce';
  if (/social/.test(c)) return 'social';
  if (/ads|google ads|meta ads|ppc/.test(c)) return 'ads';
  if (/seo|search/.test(c)) return 'seo';
  if (/marketing/.test(c)) return 'marketing';
  if (/website|design|development/.test(c)) return 'website';
  return 'generic';
}

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] overflow-hidden" style={{ ...glassStrong, animation: 'floatY 10s ease-in-out infinite' }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)' }}>
        {['#ff6a1f', '#fbbf24', '#34d399'].map((c) => (
          <span key={c} className="rounded-full" aria-hidden="true" style={{ width: 10, height: 10, background: c }} />
        ))}
        <span className="ml-2 text-[12.5px] px-3 py-1 rounded-full truncate" style={{ color: 'rgba(226,234,255,.6)', background: 'rgba(0,0,0,.25)' }}>{label}</span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active?: boolean }) {
  return (
    <div
      className="flex items-center gap-3 p-3.5 rounded-2xl"
      style={{ border: '1px solid rgba(255,255,255,.1)', background: active ? 'rgba(59,107,255,.16)' : 'rgba(255,255,255,.04)' }}
    >
      <span className="grid place-items-center shrink-0" style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,.08)' }}>
        <Icon size={16} color={active ? '#7dd3fc' : '#aab6ce'} aria-hidden="true" />
      </span>
      <span className="text-[14.5px] font-medium" style={{ color: active ? '#e9efff' : 'rgba(226,234,255,.7)' }}>{label}</span>
    </div>
  );
}

function WebsiteVisual() {
  return (
    <Frame label="yoursite.com">
      <div className="grid gap-2.5">
        <div className="h-8 rounded-lg" style={{ background: 'linear-gradient(90deg, rgba(59,107,255,.3), rgba(123,92,255,.18))' }} />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-lg" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }} />)}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Smartphone size={16} color="#6ee7b7" aria-hidden="true" />
          <span className="text-[13px]" style={{ color: 'rgba(226,234,255,.6)' }}>Responsive on every device</span>
        </div>
      </div>
    </Frame>
  );
}

function SeoVisual() {
  return (
    <Frame label="Search visibility">
      <div className="grid gap-2.5">
        <div className="flex items-center gap-2 px-3.5 py-3 rounded-full" style={{ border: '1px solid rgba(255,255,255,.14)', background: 'rgba(0,0,0,.25)' }}>
          <Search size={15} color="#7dd3fc" aria-hidden="true" />
          <span className="text-[13.5px]" style={{ color: 'rgba(226,234,255,.55)' }}>hotels near Jaisalmer…</span>
        </div>
        <Row icon={MapPin} label="Google Business Profile" active />
        <Row icon={Star} label="Reviews &amp; local ranking factors" />
        <Row icon={Globe2} label="Technical &amp; on-page SEO" />
      </div>
    </Frame>
  );
}

function AdsVisual() {
  return (
    <Frame label="Campaign manager">
      <div className="grid gap-2.5">
        <Row icon={Search} label="Search campaigns" active />
        <Row icon={Megaphone} label="Performance Max" />
        <Row icon={TrendingUp} label="Cost-per-enquiry target" />
        <div className="text-[12.5px] mt-1" style={{ color: 'rgba(226,234,255,.45)' }}>Structured around a target you set, not impressions.</div>
      </div>
    </Frame>
  );
}

function MarketingVisual() {
  return (
    <Frame label="Channel workflow">
      <div className="grid gap-2.5">
        <Row icon={Share2} label="Content &amp; social" active />
        <Row icon={Megaphone} label="Paid campaigns" />
        <Row icon={MessageSquare} label="Enquiry follow-up" />
        <Row icon={TrendingUp} label="Monthly reporting" />
      </div>
    </Frame>
  );
}

function SocialVisual() {
  return (
    <Frame label="Content calendar">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="aspect-square rounded-lg grid place-items-center" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
            <Share2 size={15} color="rgba(226,234,255,.4)" aria-hidden="true" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

function HotelTechVisual() {
  return (
    <Frame label="Property systems">
      <div className="grid gap-2.5">
        <Row icon={Building2} label="Hotel website" active />
        <Row icon={CalendarCheck} label="Booking engine" />
        <Row icon={Wifi} label="Channel manager ↔ OTAs" />
        <Row icon={Wallet} label="Payment gateway" />
      </div>
    </Frame>
  );
}

function EcommerceVisual() {
  return (
    <Frame label="Storefront">
      <div className="grid gap-2.5">
        <Row icon={ShoppingCart} label="Product catalogue" active />
        <Row icon={Wallet} label="Checkout &amp; payments" />
        <Row icon={TrendingUp} label="Conversion optimisation" />
      </div>
    </Frame>
  );
}

function GenericVisual() {
  return (
    <Frame label="Shrinath Solutions">
      <div className="grid gap-2.5">
        <Row icon={Wrench} label="Scoped to your goal" active />
        <Row icon={Globe2} label="Built for search &amp; speed" />
        <Row icon={MessageSquare} label="Clear, plain-language reporting" />
      </div>
    </Frame>
  );
}

/** Category-keyed hero/outcome illustration. CSS + icons only — never fake numbers or charts. */
export default function ServiceVisual({ category }: { category?: string | null }) {
  switch (visualKindFor(category)) {
    case 'website': return <WebsiteVisual />;
    case 'seo': return <SeoVisual />;
    case 'ads': return <AdsVisual />;
    case 'marketing': return <MarketingVisual />;
    case 'social': return <SocialVisual />;
    case 'hotel-tech': return <HotelTechVisual />;
    case 'ecommerce': return <EcommerceVisual />;
    default: return <GenericVisual />;
  }
}
