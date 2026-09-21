/** The three languages the atelier speaks. English is the default route. */
export const LOCALES = ['en', 'he', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const DIR: Record<Locale, 'ltr' | 'rtl'> = { en: 'ltr', he: 'rtl', ar: 'rtl' };

/** Shown in the language switcher, each in its own language. */
export const LOCALE_LABEL: Record<Locale, string> = { en: 'English', he: 'עברית', ar: 'العربية' };
export const LOCALE_SHORT: Record<Locale, string> = { en: 'EN', he: 'עב', ar: 'ع' };

/** BCP-47 tags for hreflang and og:locale. */
export const HREFLANG: Record<Locale, string> = { en: 'en', he: 'he-IL', ar: 'ar' };
export const OG_LOCALE: Record<Locale, string> = { en: 'en_US', he: 'he_IL', ar: 'ar_AR' };

export interface CollectionCopy {
  name: string;
  kicker: string;
  summary: string;
  intro: [string, string];
}

export interface StepCopy { title: string; body: string }
export interface TermsSection { title: string; body: string[] }
export interface PairCopy { title: string; body: string }

/**
 * Every word on the site. Structure (slugs, image ratios, layout) stays in
 * `src/data`; language lives here, so a new locale is one new file.
 */
export interface Dict {
  tagline: string;
  booking: string;
  lines: [string, string, string, string];

  nav: { collections: string; bespoke: string; gallery: string; about: string; contact: string };

  ui: {
    skip: string;
    menu: string;
    language: string;
    scroll: string;
    view: string;
    viewAll: string;
    discover: string;
    enterCollection: string;
    allCollections: string;
    openGallery: string;
    fullProcess: string;
    aboutAtelier: string;
    howCommission: string;
    continue: string;
    backTo: (name: string) => string;
    looksCount: (n: number) => string;
    imagesCount: (n: number) => string;
    lookTitle: (n: number) => string;
    openInMaps: string;
    openImage: (alt: string) => string;
    prevImage: string;
    nextImage: string;
    closeViewer: string;
    breadcrumb: string;
  };

  home: {
    heroLine1: string;
    heroLine2Lead: string;
    heroLine2Accent: string;
    heroCta2: string;
    openingEyebrow: string;
    openingTitle: string;
    openingAccent: string;
    openingBody: [string, string];
    linesEyebrow: string;
    linesTitle: string;
    linesAccent: string;
    linesLead: string;
    selectedEyebrow: string;
    selectedTitle: string;
    selectedAccent: string;
    selectedLead: string;
    bespokeEyebrow: string;
    bespokeTitle: string;
    bespokeAccent: string;
    bespokeLead: string;
    closingEyebrow: string;
    closingTitle: string;
    closingAccent: string;
    closingLead: string;
  };

  instagram: { eyebrow: string; title: string; accent: string; lead: string };

  collectionsPage: { eyebrow: string; title: string; accent: string; lead: string; theLooks: string };
  collections: Record<'bridal' | 'evening' | 'couture' | 'boutique', CollectionCopy>;
  lookNotes: Record<'bridal' | 'evening' | 'couture' | 'boutique', [string, string, string, string]>;
  lookPage: {
    line: string; made: string; madeValue: string; fabrics: string; fabricsValue: string;
    enquire: string; related: string;
    price: string; madeToMeasure: string; buy: string; orderOnWhatsapp: string;
    payNote: string; orderMessage: (look: string, line: string, price: string) => string;
  };

  gallery: { eyebrow: string; title: string; accent: string; lead: string; all: string; empty: string };

  checkout: {
    eyebrow: string; title: string; accent: string;
    summary: string; piece: string; quantity: string; unitPrice: string; subtotal: string; total: string;
    details: string; name: string; phone: string; email: string; optional: string;
    pay: string; paying: string;
    secure: string; cards: string; noStore: string;
    errorTitle: string; errorGeneric: string; errorGateway: string; errorFields: string;
    backToLook: string;
  };

  payment: {
    checking: string; checkingBody: string;
    paidTitle: string; paidBody: string;
    reference: string; amountPaid: string;
    pendingTitle: string; pendingBody: string;
    failedTitle: string; failedBody: string;
    cancelledTitle: string; cancelledBody: string;
    unknownTitle: string; unknownBody: string;
    tryAgain: string; talkToAtelier: string; backHome: string;
  };

  bespoke: {
    eyebrow: string; title: string; accent: string; lead: string;
    steps: [StepCopy, StepCopy, StepCopy, StepCopy, StepCopy];
    bringEyebrow: string; bringTitle: string; bringAccent: string;
    bring: [PairCopy, PairCopy, PairCopy, PairCopy];
    ctaTitle: string; ctaAccent: string; ctaLead: string;
  };

  about: {
    eyebrow: string; title: string; accent: string; lead: string;
    storyTitle: string; story: [string, string, string];
    principlesEyebrow: string; principlesTitle: string; principlesAccent: string;
    principles: [PairCopy, PairCopy, PairCopy, PairCopy];
    makesTitle: string; ctaTitle: string; ctaAccent: string;
  };

  contact: {
    eyebrow: string; title: string; accent: string; lead: string;
    speakTo: string; theAtelier: string; appointments: string;
    formTitle: string; formSub: string;
    name: string; contactField: string; contactPlaceholder: string;
    enquiry: string; somethingElse: string; date: string; optional: string;
    message: string; messagePlaceholder: string;
    send: string; privacy: string;
    sent: string; sentBody: string;
    failed: string; failedBody: string;
    mailOpening: string; mailOpeningBody: string;
    waOpening: string; waOpeningBody: string;
    igTitle: string; igBody: (handle: string) => string;
    noteWhatsapp: string; noteInstagram: string; notePhone: string; noteEmail: string;
  };

  /** Everything a buyer is owed before she pays — the atelier's own terms. */
  terms: {
    eyebrow: string; title: string; accent: string; lead: string;
    sections: [TermsSection, TermsSection, TermsSection, TermsSection, TermsSection];
    statutory: string;
    updated: (date: string) => string;
  };

  notFound: { eyebrow: string; title: string; accent: string; lead: string; home: string; collections: string };

  footer: { collections: string; atelier: string; enquiries: string };

  seo: Record<'home' | 'collections' | 'gallery' | 'bespoke' | 'about' | 'contact' | 'notFound',
    { title: string; description: string }>;
  seoCollection: (summary: string) => string;
  seoLook: (title: string, collection: string, note: string) => string;
}
