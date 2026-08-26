// Editable content for this page. Text only — no layout here.

export const intro = [
        "Hotel software pricing pages usually show three numbers and a footnote that quietly undoes them. The figure applies to a property of a particular size, with a particular number of channels, before setup, before the modules most hotels actually need. By the time the real quote arrives it bears little resemblance to the number that brought you to the page.",
        "We would rather skip that. What drives cost here is straightforward: how many rooms you have, how many rate plans you run, how many channels you want connected, and which operational modules you switch on. Two properties on the same street can differ by a factor of three on all four counts.",
        "So the plans below describe scope rather than price, and the figure comes by WhatsApp or email once we know your room count. It usually takes one message. Nothing about that process is designed to trap you in a sales call — you are welcome to take the number and compare it.",
        "One thing we will not do is quote low and add later. The proposal states the monthly fee, the one-off setup cost, what is included in support, and any third-party charges such as payment gateway rates that are set by someone else. If a figure changes after scoping we explain why before you commit."
      ];

export const setup = [
        "Scoping call covering room types, rate plans and current channels",
        "Inventory, rates, taxes and restrictions configured and checked",
        "Channel connections activated one at a time and monitored",
        "User roles set so staff can only change what they should",
        "Training for front desk, housekeeping and management",
        "Monitored go-live plus a follow-up session two weeks later"
      ];

export const fit = [
        { name: "Starter", body: "You sell mainly through OTAs and want to stop reconciling inventory by hand. No PMS change, no new booking engine yet." },
        { name: "Growth", body: "You want direct bookings as well as channel control, and you are ready to run front desk and reporting in the same system." },
        { name: "Hotel Pro", body: "You have departments — housekeeping, restaurant, multiple outlets — and need operations and reporting joined up across all of them." }
      ];

export const PLANS = [
  { name: "Starter Plan", for: "Small properties starting with channel management only.", features: ["Channel Manager", "Centralised inventory", "Basic OTA connections", "Booking synchronisation", "Email support", "Staff training session"] },
  { name: "Growth Plan", for: "Properties running operations and direct bookings together.", popular: true, features: ["Channel Manager", "Cloud PMS", "Booking Engine", "Standard reports", "More OTA connections", "Priority support", "Staff training sessions"] },
  { name: "Hotel Pro Plan", for: "Full operations across departments and multiple outlets.", features: ["Channel Manager", "Cloud PMS", "Booking Engine", "POS", "Housekeeping module", "Advanced reports", "Premium support"] }
];

export const COMPARISON = [
  ["Channel Manager", "✓", "✓", "✓"],
  ["Centralised inventory", "✓", "✓", "✓"],
  ["Booking synchronisation", "✓", "✓", "✓"],
  ["OTA connections", "Basic", "Extended", "Extended"],
  ["Cloud PMS", "—", "✓", "✓"],
  ["Front desk", "—", "✓", "✓"],
  ["Booking Engine", "—", "✓", "✓"],
  ["Payment gateway integration", "—", "✓", "✓"],
  ["Housekeeping", "—", "—", "✓"],
  ["POS", "—", "—", "✓"],
  ["Reports", "Basic", "Standard", "Advanced"],
  ["User roles", "Limited", "✓", "✓"],
  ["Google Hotel Ads feed", "—", "Optional", "✓"],
  ["Support", "Email", "Priority", "Premium"]
];

export const faqs: [string, string][] = [
      ["Why are prices not published on the page?", "Because the honest number depends on your property. Room count, number of rate plans, how many channels you connect and which modules you enable all change the cost materially. Publishing a single figure would either overstate the price for a small camp or understate it for a forty-room hotel, and both outcomes waste your time and ours. Send your room count and you will have a real figure the same working day."],
      ["Is there a setup fee?", "Yes, quoted once. It covers scoping, configuration of room types and rate plans, channel connections activated and monitored one at a time, staff training and a follow-up session after go-live. Providers who waive setup usually recover it in the monthly fee or skip the configuration work, which is where problems begin."],
      ["Can we change plan later?", "Yes. Most properties begin on Starter or Growth and move up when they add operations modules such as housekeeping or POS. Moving up is straightforward; the configuration you already have is retained. We will tell you when a plan change is worth it and when it is not."],
      ["Is there a contract lock-in?", "Terms are agreed in writing before setup, including notice period and what happens to your data if you leave. Ask us for the current terms and read them before signing anything — that applies to us as much as to any other provider."],
      ["Do you charge commission on bookings?", "No commission on bookings taken through your own booking engine. That is the point of the system: the direct booking is yours. Any payment gateway charges are set by the gateway provider, not by us, and we will show you those rates during scoping."],
      ["What is included in support?", "Support level differs by plan — email, priority or premium — and the response windows are stated in writing. In practice you are reaching a team in Jaisalmer rather than a ticket queue elsewhere, and during peak season we agree in advance who to call and when."],
      ["Can we see it before committing?", "Yes. The demo runs on your own room types and rate plans rather than a generic sample property, so you can judge whether the workflow suits your staff. That takes a little setup on our side, which is why we ask for your room and rate details before booking the session."]
    ];
