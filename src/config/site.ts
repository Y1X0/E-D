/**
 * Elite Evening Design — brand configuration.
 *
 * Everything here is drawn from the atelier's own logo and Instagram profile.
 * Nothing is invented. Fields left empty are contact channels the atelier has
 * not published; the interface hides them until a real value is filled in, so
 * the site never shows an address or number that does not exist.
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
 * ► Fill any of these in to switch the matching contact method on.
 *   email        — the profile shows an email icon but no published address
 *   phone        — not published
 *   whatsapp     — international format, digits only, e.g. '972500000000'
 *   formEndpoint — optional POST target for the enquiry form (Formspree,
 *                  Basin, a serverless function…). While empty, the form
 *                  hands the enquiry to Instagram, the atelier's live channel.
 */
const contact: Contact = {
  email: '',
  phone: '',
  whatsapp: '',
  formEndpoint: '',
};

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
  url: import.meta.env.SITE ?? 'https://eliteeveningdesign.com',

  locale: 'en',
  ogImage: '/og.jpg',

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
      value: `+${c.whatsapp}`,
      href: `https://wa.me/${c.whatsapp}`,
      note: 'The quickest reply',
    });
  }
  if (c.email) {
    out.push({ id: 'email', label: 'Email', value: c.email, href: `mailto:${c.email}`, note: 'For enquiries and appointments' });
  }
  if (c.phone) {
    out.push({ id: 'phone', label: 'Telephone', value: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, '')}`, note: 'By appointment' });
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
