import Seo, { breadcrumbSchema, faqSchema } from '../components/Seo';
import Breadcrumbs from '../components/Breadcrumbs';
import Faq from '../components/Faq';
import EnquiryForm from '../components/EnquiryForm';
import { Section, StepsGrid } from '../components/Sections';
import { site, wa } from '../data/site';
import * as d from '../data/contact';

const trail = [{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }];

const localBusiness = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': site.url + '/#org',
  name: site.name,
  url: site.url,
  telephone: '+91-94615-31536',
  email: site.email,
  address: { '@type': 'PostalAddress', addressLocality: 'Jaisalmer', addressRegion: 'Rajasthan', addressCountry: 'IN' },
  areaServed: 'Rajasthan, India',
  priceRange: 'On enquiry',
};

export default function Contact() {
  return (
    <>
      <Seo
        path="/contact"
        title="Contact Shrinath Solutions | Website & Digital Marketing Company in Jaisalmer"
        description="Contact Shrinath Solutions in Jaisalmer, Rajasthan for website designing, digital marketing, SEO and hotel technology. Call +91 94615 31536, WhatsApp or email."
        jsonLd={[localBusiness, breadcrumbSchema(trail), faqSchema(d.faqs)]}
      />
      <Breadcrumbs trail={trail} />

      <section className="mx-auto max-w-shell px-[22px] pt-10">
        <div className="max-w-[840px]">
          <div className="text-[13px] uppercase tracking-[.18em]" style={{ color: '#7dd3fc' }}>Contact us</div>
          <h1 className="font-heading font-extrabold text-[clamp(33px,4.6vw,56px)] leading-[1.06] mt-4" style={{ letterSpacing: '-0.03em' }}>
            Tell us what you need. We reply the same working day.
          </h1>
          <p className="text-[18.5px] mt-5 max-w-[700px]" style={{ color: 'rgba(226,234,255,.74)' }}>
            Shrinath Solutions works from Jaisalmer with clients across Rajasthan and elsewhere in India. Call, message on WhatsApp, or send the form below — it opens WhatsApp with your details already filled in.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-shell px-[22px] pt-8">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
          {d.quickCards.map((c) => (
            <a
              key={c.label}
              href={c.href === 'whatsapp' ? wa() : c.href}
              target={c.target}
              rel="noopener noreferrer"
              className="block p-5 rounded-[20px] !text-paper"
              style={{ border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', backdropFilter: 'blur(16px)' }}
            >
              <span className="grid place-items-center text-[17px]" style={{ width: 40, height: 40, borderRadius: 13, background: c.tint, border: '1px solid rgba(255,255,255,.16)' }}>{c.glyph}</span>
              <div className="text-[13px] uppercase tracking-[.1em] mt-3.5 mb-1" style={{ color: 'rgba(226,234,255,.5)' }}>{c.label}</div>
              <div className="font-heading font-bold text-[17px]">{c.value}</div>
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-shell px-[22px] pt-11">
        <div className="grid gap-5.5 items-start" style={{ gap: 22, gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))' }}>
          <div className="p-8 rounded-[26px]" style={{ border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)', backdropFilter: 'blur(20px)', boxShadow: '0 24px 60px rgba(2,6,23,.4)' }}>
            <h2 className="font-heading font-bold text-[27px] mt-0 mb-2">Send an enquiry</h2>
            <p className="mb-5 text-[16px]" style={{ color: 'rgba(226,234,255,.68)' }}>Required fields are marked with an asterisk.</p>
            <EnquiryForm fields={d.fields} services={d.serviceOptions} source="Contact page" />
          </div>

          <div className="grid gap-4">
            <div className="p-7 rounded-[24px]" style={{ border: '1px solid rgba(255,255,255,.11)', background: 'rgba(255,255,255,.05)' }}>
              <h2 className="font-heading font-bold text-[22px] mt-0 mb-3.5">Reach us directly</h2>
              <div className="grid gap-2.5 text-[16.5px]">
                <a href={site.phoneHref}>Phone — {site.phone}</a>
                <a href={wa()} target="_blank" rel="noopener noreferrer" style={{ color: '#6ee7b7' }}>WhatsApp — {site.phone}</a>
                <a href={`mailto:${site.email}`}>Email — {site.email}</a>
                <span style={{ color: 'rgba(226,234,255,.65)' }}>{site.location}</span>
              </div>
              <div className="mt-4 pt-4 grid gap-2 text-[15.5px]" style={{ borderTop: '1px solid rgba(255,255,255,.09)', color: 'rgba(226,234,255,.7)' }}>
                {d.hours.map((h) => (
                  <div key={h.day} className="flex justify-between gap-3.5">
                    <span>{h.day}</span>
                    <span style={{ color: 'rgba(226,234,255,.55)' }}>{h.time}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3.5 mb-0 text-[13.5px]" style={{ color: 'rgba(226,234,255,.45)' }}>Confirm these hours before publishing.</p>
            </div>
            <div className="overflow-hidden rounded-[24px]" style={{ border: '1px solid rgba(255,255,255,.11)', aspectRatio: '4/3' }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3557.543713981919!2d70.91172379999999!3d26.917972499999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3947bc2be865abf3%3A0x9a8282fa99bda0b9!2sShrinath%20Solutions!5e0!3m2!1sen!2sin!4v1787680001286!5m2!1sen!2sin"
                title="Shrinath Solutions on Google Maps"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </div>
      </section>

      <Section heading="What happens after you message us" body="No call centre, no sequence of follow-up emails. Four steps, and you can stop at any of them.">
        <StepsGrid items={d.steps} />
      </Section>

      <Faq faqs={d.faqs} heading="Contact FAQs" />
    </>
  );
}
