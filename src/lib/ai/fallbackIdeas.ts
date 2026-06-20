/**
 * Static, per-industry copy suggestions. Used by the /api/ideas endpoint when
 * the NVIDIA key/model is unavailable, and imported client-side so the Ideas
 * helper still works fully offline. No network, no dependencies.
 */
export interface Idea {
  headline: string;
  subhead: string;
  sections: { title: string; body: string }[];
  cta: string;
}

const BANK: Record<string, Idea> = {
  restaurant: {
    headline: 'Made fresh, served warm',
    subhead: 'Honest food, a welcoming room, and a team that treats every guest like family.',
    sections: [
      { title: 'Seasonal menu', body: "Dishes that change with what's good right now." },
      { title: 'Book a table', body: 'Reserve online in under a minute, any day of the week.' },
      { title: 'Private events', body: "From birthdays to business dinners, we'll host it." },
    ],
    cta: 'Reserve a table',
  },
  agency: {
    headline: 'Build it right, ship it fast',
    subhead: 'A small senior team that designs and builds web products people actually enjoy using.',
    sections: [
      { title: 'Strategy', body: 'We turn a rough idea into a clear, buildable plan.' },
      { title: 'Design & build', body: 'One team from first sketch to production.' },
      { title: 'Ongoing support', body: 'We stay on after launch — updates, fixes, growth.' },
    ],
    cta: 'Start a project',
  },
  portfolio: {
    headline: 'Selected work, carefully made',
    subhead: 'A designer focused on clear, considered work across brand and digital.',
    sections: [
      { title: 'Recent projects', body: "A look at what I've shipped lately." },
      { title: 'How I work', body: 'Close collaboration, few surprises, on time.' },
      { title: "Let's talk", body: 'Open to freelance and collaborations.' },
    ],
    cta: 'Get in touch',
  },
  shop: {
    headline: 'Things worth keeping',
    subhead: 'A small shop with a tight, well-chosen range and fast, friendly delivery.',
    sections: [
      { title: 'Shop the range', body: 'A curated selection, restocked often.' },
      { title: 'Fast delivery', body: 'Dispatched within a day, tracked to your door.' },
      { title: 'Easy returns', body: 'Changed your mind? No fuss, 30 days.' },
    ],
    cta: 'Shop now',
  },
  default: {
    headline: "Welcome — let's get started",
    subhead: 'Tell visitors who you are, what you offer, and why it matters, in one clear line.',
    sections: [
      { title: 'What we offer', body: 'A short, honest summary of your core service.' },
      { title: 'Why choose us', body: 'The one or two things that set you apart.' },
      { title: 'Get in touch', body: 'Make it easy for people to take the next step.' },
    ],
    cta: 'Get in touch',
  },
};

function pickKey(industry: string): keyof typeof BANK {
  const s = industry.toLowerCase();
  if (/food|restaurant|cafe|café|bar|bakery|pizz|bistro|kitchen|coffee/.test(s)) return 'restaurant';
  if (/agency|software|saas|studio|tech|startup|develop|consult|digital/.test(s)) return 'agency';
  if (/portfolio|design|photo|artist|freelanc|creative|illustrat/.test(s)) return 'portfolio';
  if (/shop|store|ecommerce|e-commerce|retail|boutique|brand|product/.test(s)) return 'shop';
  return 'default';
}

export function fallbackIdeas(industry = '', _company = ''): Idea {
  const base = BANK[pickKey(industry)] || BANK.default;
  // Return a copy so callers can't mutate the bank.
  return { ...base, sections: base.sections.map((s) => ({ ...s })) };
}
