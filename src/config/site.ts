/**
 * Elite Evening Design — brand configuration.
 *
 * Everything here comes from the atelier: its logo, its Instagram profile, and
 * the telephone number and address it supplied directly. Nothing is invented.
 * Fields left empty are channels the atelier has not published; the interface
 * hides them rather than showing something that does not work.
 */

/** Contact details the atelier has published. Empty string = not published. */
export interface Contact {
  email: string;
  phone: string;
  whatsapp: string;
  formEndpoint: string;
}

export interface ContactChannel {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly href: string;
  readonly note: string;
}

/**
 *   email        — the profile shows an email icon but no published address
 *   phone        — supplied by the atelier
 *   whatsapp     — the same line, digits only for the wa.me link
 *   formEndpoint — optional POST target for the enquiry form (Formspree,
 *                  Basin, a serverless function…). While empty, the form
 *                  hands the enquiry to Instagram, the atelier's live channel.
 */
const contact: Contact = {
  email: '',
  phone: '+972 53-468-0084',
  whatsapp: '972534680084',
  formEndpoint: '',
};

/**
 * The atelier. Shown in English with the local Hebrew beneath, because both
 * are useful in Lod — and both resolve in a map app.
 */
export const location = {
  street: 'Herzl 40',
  city: 'Lod',
  streetLocal: 'הרצל 40',
  cityLocal: 'לוד',
  localLang: 'he',
  countryCode: 'IL',
  countryName: 'Israel',
  /** Visits are arranged rather than walk-in — stated, never invented. */
  note: 'Consultations and fittings by appointment',
} as const;

/** A map link that resolves precisely, built from the local spelling. */
export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${
  encodeURIComponent(`${location.streetLocal}, ${location.cityLocal}`)
}`;

/** One line, for footers and meta descriptions. */
export const addressLine = `${location.street}, ${location.city}`;
export const addressLineLocal = `${location.streetLocal}, ${location.cityLocal}`;

export const site = {
  /** Exactly as written on the profile. */
  name: 'Elite Evening Design',
  shortName: 'Elite Evening',
  /** The atelier's own words, from the profile bio. */
  tagline: 'Where elegance meets luxury',
  /** The three lines named in the bio. */
  lines: ['Bridal', 'Evening', 'Couture'] as const,
  /** The atelier's own call to action. */
  bookingPhrase: 'Book your dream dress',

  /**
   * Production origin, used for canonical URLs, Open Graph and the sitemap.
   * ► Replace with the real domain, or build with SITE_URL=https://…
   */
  /* `import.meta.env` only exists under Vite; this file is also read by the
     seeding script, which runs in plain Node. */
  url: import.meta.env?.SITE ?? process.env.SITE_URL ?? 'https://eliteeveningdesign.com',

  locale: 'en',
  ogImage: '/og.jpg',

  /**
   * Origin of the payment service (server/). Empty until it is deployed, and
   * while it is empty the site sells nothing online: a priced piece falls back
   * to the hosted payment link or to WhatsApp, exactly as before.
   */
  paymentApi: (process.env.PAYMENT_API_URL ?? '').replace(/\/$/, ''),

  instagram: {
    handle: 'eliteevening.design',
    url: 'https://www.instagram.com/eliteevening.design/',
  },

  contact,
} as const;

/** Only the channels that actually exist, in the order they should be offered. */
export function contactChannels(): ContactChannel[] {
  const c = site.contact;
  const out: ContactChannel[] = [
    {
      id: 'instagram',
      label: 'Instagram',
      value: `@${site.instagram.handle}`,
      href: site.instagram.url,
      note: 'Direct message the atelier',
    },
  ];
  if (c.whatsapp) {
    out.unshift({
      id: 'whatsapp',
      label: 'WhatsApp',
      // Show the readable form of the same line, not the raw wa.me digits.
      value: c.phone || `+${c.whatsapp}`,
      href: `https://wa.me/${c.whatsapp}`,
      note: 'Message the atelier — usually the quickest reply',
    });
  }
  if (c.email) {
    out.push({ id: 'email', label: 'Email', value: c.email, href: `mailto:${c.email}`, note: 'For enquiries and appointments' });
  }
  if (c.phone) {
    out.push({
      id: 'phone',
      label: 'Telephone',
      value: c.phone,
      href: `tel:${c.phone.replace(/[^\d+]/g, '')}`,
      note: 'Call during atelier hours',
    });
  }
  return out;
}

export const nav = [
  { label: 'Collections', href: '/collections' },
  { label: 'Bespoke', href: '/bespoke' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const;
