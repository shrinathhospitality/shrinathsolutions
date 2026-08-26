// Editable content for this page. Text only — no layout here.

export const intro = [
        "A property with three OTA listings, a booking engine and a spreadsheet is not running a technology stack; it is running a reconciliation habit. Somebody checks channels each morning, adjusts availability by hand, and hopes nothing sold twice overnight. It works until the property is busy, which is exactly when it fails.",
        "The failure is expensive in two directions. An overbooking costs you a relocation, an apology and often a bad review that outlives the incident. An unsold room caused by defensive under-allocation costs you the whole night's revenue quietly, and nobody notices because there is nothing to notice.",
        "A channel manager removes the manual step. One inventory, read by every connected channel, updated the moment a booking lands anywhere. A cloud PMS then puts the operational side — arrivals, folios, housekeeping status, reports — in the same system rather than a separate ledger nobody reconciles until month end.",
        "None of this is new software, and we are not pretending to have invented it. What varies between providers is setup quality, whether the connections you were promised actually exist for your property, and whether anyone answers the phone in season. That is where a local partner is worth more than a feature list.",
        "We scope, configure, connect, train and support. Where an integration cannot be confirmed for your account, we say so before you sign rather than after. The pages below describe the modules and the onboarding honestly; the pricing page states plainly that figures depend on room count and channels."
      ];

export const modules = [
        { glyph: "⇄", title: "Centralised inventory", body: "One room count that every connected channel reads from. No parallel spreadsheets, no per-channel allocation guesswork, no defensive holdback of rooms you could have sold." },
        { glyph: "◈", title: "Real-time rate updates", body: "Change a rate or restriction once and it propagates to connected channels within minutes, including derived rates and length-of-stay rules." },
        { glyph: "◎", title: "Booking synchronisation", body: "Reservations from any channel flow into the PMS automatically, with availability adjusted the moment they land rather than at the next manual check." },
        { glyph: "◆", title: "Overbooking reduction", body: "The most common cause of double sale — delayed inventory updates — is removed. Remaining risks are process issues, and training covers them." },
        { glyph: "▤", title: "Cloud PMS", body: "Front desk, guest profiles, folios and reporting accessible from any device on the property, with user roles limiting what each staff member can change." },
        { glyph: "◍", title: "Booking engine", body: "Commission-free reservations on your own domain with live availability, instant confirmation and a mobile flow that finishes in under a minute." },
        { glyph: "◉", title: "OTA connections", body: "Channels activated one at a time and monitored, with the list confirmed for your property during scoping rather than promised in advance." },
        { glyph: "▣", title: "Housekeeping", body: "Room status, task assignment and turnaround tracking on the floor, so reception knows what is ready without a phone call up the corridor." },
        { glyph: "◈", title: "Front desk", body: "Check-in, check-out, room moves, extras and guest history on one screen, built for staff who are being interrupted while using it." },
        { glyph: "◆", title: "Reports and analytics", body: "Occupancy, ADR, RevPAR, channel contribution and pace, exportable, so pricing conversations use numbers instead of impressions." },
        { glyph: "◎", title: "Payment integrations", body: "Prepayment, deposits and refunds through a gateway configured for your account, with the transaction visible against the reservation." },
        { glyph: "◉", title: "Google Hotel Ads feed", body: "An accurate rate feed so your own price appears beside the OTAs, sending the click to your booking engine rather than a listing." }
      ];

export const onboarding = [
        { num: "01", title: "Scoping", body: "Room types, rate plans, current channels, existing systems and who does what at the property today." },
        { num: "02", title: "Configuration", body: "Inventory, rates, restrictions, taxes and user roles set up, then checked against your own rate sheet." },
        { num: "03", title: "Connections", body: "Channels activated one at a time and watched for a few days each, so a fault is traceable to a single change." },
        { num: "04", title: "Training", body: "Separate sessions for front desk, housekeeping and management, using your real data rather than a demo property." },
        { num: "05", title: "Go live", body: "Monitored switch-over with support on hand, and a follow-up session once real bookings have raised real questions." }
      ];

export const outcomes = [
        "Morning reconciliation stops being a job somebody has to remember.",
        "Rate changes take one action instead of one per channel.",
        "Reception can see room readiness without calling housekeeping.",
        "Direct bookings are confirmed instantly rather than by return email.",
        "Month-end reporting comes out of the system rather than a spreadsheet.",
        "Owners can see occupancy and channel mix without asking anyone."
      ];

export const integrations = [
        "OTA channels (Booking.com, Agoda, MakeMyTrip and others)",
        "Metasearch (Google Hotel Ads)",
        "Payment gateways",
        "PMS / property management systems"
      ];

export const orbit = [
      { name: "Cloud PMS", top: "6%", left: "50%" },
      { name: "Booking Engine", top: "22%", left: "88%" },
      { name: "OTA Platforms", top: "50%", left: "96%" },
      { name: "Payment Gateway", top: "78%", left: "86%" },
      { name: "Google Hotel Ads", top: "94%", left: "50%" },
      { name: "Website", top: "78%", left: "13%" },
      { name: "Channel Manager", top: "50%", left: "4%" },
      { name: "Housekeeping", top: "22%", left: "12%" }
    ];

export const NODES = [
  { name: "Hotel Website", glyph: "◍", body: "The only channel you fully control. Fast room pages with visible rates, feeding your own booking engine rather than a listing site.", feeds: ["Booking Engine", "Google Hotel Ads", "Digital Marketing"] },
  { name: "Booking Engine", glyph: "◈", body: "Commission-free reservations on your own domain, with live availability drawn from the same inventory the OTAs read.", feeds: ["Channel Manager", "Payment Gateway", "Cloud PMS"] },
  { name: "Channel Manager", glyph: "⇄", body: "One inventory pushed to every connected channel. Rates and availability move together, so the overnight reconciliation habit disappears.", feeds: ["OTA Platforms", "Cloud PMS", "Booking Engine"] },
  { name: "Cloud PMS", glyph: "▤", body: "Front desk, folios, housekeeping and reporting in one place, reachable from any device on the property rather than one machine at reception.", feeds: ["Channel Manager", "Payment Gateway", "Reports"] },
  { name: "OTA Platforms", glyph: "◎", body: "Listings kept accurate and priced deliberately. OTAs stay valuable for discovery when they are not your only route to a booking.", feeds: ["Channel Manager", "Revenue Management"] },
  { name: "Google Hotel Ads", glyph: "◉", body: "Your rate shown beside the OTA rates at the comparison moment, with the click landing on your own booking engine.", feeds: ["Booking Engine", "Hotel Website"] },
  { name: "Payment Gateway", glyph: "▣", body: "Prepayment, deposits and refunds handled securely, with the transaction visible against the reservation in the PMS.", feeds: ["Booking Engine", "Cloud PMS"] },
  { name: "Reports & Analytics", glyph: "◆", body: "Occupancy, ADR, RevPAR and channel contribution in one view, so pricing decisions rest on data rather than memory.", feeds: ["Cloud PMS", "Revenue Management"] }
];

export const faqs: [string, string][] = [
      ["Which OTAs and channels can you connect?", "Connections are confirmed property by property during scoping, and we do not describe an integration as available until it is verified for your account. That is a deliberate policy: the fastest way to lose a hotel's trust is to promise a channel connection in a sales conversation and then discover during setup that the property's contract type or region does not support it."],
      ["Can we keep our existing PMS and only use the channel manager?", "Often yes, through an API connection, and for properties with staff already trained on a PMS that is usually the sensible route. We check feasibility with your current provider before quoting. Where no reliable connection exists we will tell you plainly rather than selling a partial integration that leaves you reconciling by hand anyway."],
      ["How long does setup take?", "Typically one to two weeks. Room types, rate plans and derived rates take the most time, particularly where a property has accumulated years of ad-hoc pricing that nobody has rationalised. Channel connections are then activated one at a time and watched for a few days each, rather than all at once."],
      ["Will this stop overbooking completely?", "It removes the most common cause, which is delayed inventory updates between channels. It cannot prevent a booking taken verbally at reception and entered an hour later, or a rate plan configured incorrectly. Those are process problems, and we cover them in training because the software alone does not solve them."],
      ["Is training included, and who needs it?", "Yes. Front desk and housekeeping staff get a working session each, and the owner or manager gets a separate session on rates, reports and channel decisions. We follow up a week or two after go-live, once real bookings have surfaced the questions that never come up during training."],
      ["What happens when something breaks during peak season?", "You reach a person locally rather than a ticket queue in another time zone. Support terms are stated in writing before setup, including what counts as urgent and the response window. During peak season we agree in advance who to call and when."],
      ["Do we need the booking engine as well as the channel manager?", "You need it if you want direct bookings, which is the entire point of reducing OTA dependence. The channel manager protects you from overbooking; the booking engine is what actually earns the commission back. Properties that install one without the other usually end up disappointed for predictable reasons."]
    ];
