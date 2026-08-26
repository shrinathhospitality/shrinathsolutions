// Editable content for this page. Text only — no layout here.

export const quickCards = [
        { label: "Call", value: "+91 94615 31536", href: "tel:+919461531536", target: "_self", glyph: "◉", tint: "rgba(59,107,255,.2)" },
        { label: "WhatsApp", value: "Message us now", href: 'whatsapp', target: "_blank", glyph: "◎", tint: "rgba(37,211,102,.22)" },
        { label: "Email", value: "shrinathsolutions@gmail.com", href: "mailto:shrinathsolutions@gmail.com", target: "_self", glyph: "▣", tint: "rgba(123,92,255,.22)" },
        { label: "Location", value: "Jaisalmer, Rajasthan", href: "#", target: "_self", glyph: "◆", tint: "rgba(255,122,47,.22)" }
      ];

export const fields = [
        { label: "Name *", name: "name", type: "text", placeholder: "Your name", required: true },
        { label: "Phone *", name: "phone", type: "tel", placeholder: "+91", required: true },
        { label: "Email", name: "email", type: "email", placeholder: "you@example.com", required: false },
        { label: "Website URL", name: "website", type: "url", placeholder: "https://", required: false }
      ];

export const serviceOptions = ["Website Design", "Digital Marketing", "SEO", "Hotel Digital Marketing", "Channel Manager / Cloud PMS", "Google Ads", "Not sure yet"];

export const hours = [
        { day: "Monday to Saturday", time: "10:00 — 19:00" },
        { day: "Sunday", time: "On call" },
        { day: "WhatsApp", time: "Answered daily" }
      ];

export const steps = [
        { num: "01", title: "We read it properly", body: "A person reads your message, not an autoresponder. If something is unclear we ask one question rather than sending a form." },
        { num: "02", title: "A short call", body: "Fifteen to twenty minutes on what you sell, who buys it and where enquiries are being lost today." },
        { num: "03", title: "Audit or scope", body: "A free website or SEO audit, or a scoping call for hotel software. Findings are yours either way." },
        { num: "04", title: "Written proposal", body: "Scope, cost, timeline and what is not included, in writing. No pressure to decide on the call." }
      ];

export const faqs: [string, string][] = [
      ["What should I include in the first message?", "Your business type, what you want to improve, and a link to your current website if you have one. That is enough for a useful first reply. If you are enquiring about hotel software, add your room count and the channels you sell on, because those two details determine almost everything about the answer."],
      ["Do you charge for the first consultation?", "No. The first call is free, and so is the website or SEO audit that usually follows it. You receive the audit findings whether or not you decide to work with us — there is no version of it that is held back until you sign something."],
      ["How quickly will you reply?", "Same working day for messages received during business hours, and the next morning for anything sent late at night. WhatsApp is the fastest route. If a project is time-sensitive, say so in the message and we will tell you honestly whether we can meet the date."],
      ["Do you work with clients outside Jaisalmer?", "Yes. We are based in Jaisalmer and work across Rajasthan, with clients elsewhere in India handled remotely. Hotel software setup and staff training can be done on site where the property is within reach, and remotely with scheduled sessions where it is not."],
      ["Can we meet in person?", "Yes, for local clients and for hotel software onboarding in particular, where it helps to see the front desk and talk to the staff who will use the system. Arrange it by phone or WhatsApp first so we are not both in the wrong place."]
    ];
