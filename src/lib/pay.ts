/**
 * Taking a card on a site that has no server of its own.
 *
 * The dress is paid for on the provider's own checkout page — which is where
 * the card details belong: they never touch this site, and nothing here has to
 * be trusted with them. All this file does is build the link to that page with
 * the piece and its price already filled in.
 *
 * Three ways in, in the order they cost the atelier effort to set up:
 *
 *   paypal   — a PayPal business address is enough. PayPal's own page takes
 *              Visa and Mastercard from buyers who have no PayPal account.
 *   paypalme — a personal PayPal account, through its PayPal.Me link, with the
 *              amount already in it. Whether a buyer without a PayPal account
 *              may pay by card here is PayPal's decision, not this site's.
 *   template — any provider whose payment page accepts the amount in the URL
 *              (Grow, Meshulam, PayPlus, Tranzila…): paste the link with
 *              {amount} and {item} where they belong.
 *   link     — one fixed page for everything (a Stripe payment link, a Bit
 *              link, the provider's own page). The amount is not passed.
 *
 * With none of them set the order goes to WhatsApp instead, which is where it
 * would have been placed anyway — so the button always does something real.
 */
export interface PaySettings {
  payProvider?: 'paypal' | 'paypalme' | 'template' | 'link' | '';
  paypalEmail?: string;
  /** A PayPal.Me handle, or the whole link — either is accepted. */
  paypalMe?: string;
  payUrl?: string;
  payTemplate?: string;
}

export interface Order {
  /** What is being bought, as the buyer should read it on the checkout page. */
  item: string;
  /** Whole shekels. */
  amount: number;
  /** Where the buyer is returned after paying. */
  returnTo?: string;
  /** Hebrew or Arabic checkout, when the provider offers it. */
  locale?: 'en' | 'he' | 'ar';
}

const PAYPAL_LOCALE = { en: 'en_US', he: 'he_IL', ar: 'ar_EG' } as const;

/**
 * The checkout page for one piece, or null when the atelier has not set one up.
 * A piece can override the atelier's provider with a page of its own.
 */
export function checkoutUrl(settings: PaySettings | null | undefined, order: Order, own?: string): string | null {
  if (own) return own;
  if (!settings) return null;

  const provider = settings.payProvider
    || (settings.paypalEmail ? 'paypal'
      : settings.paypalMe ? 'paypalme'
      : settings.payTemplate ? 'template'
      : settings.payUrl ? 'link' : '');

  if (provider === 'paypalme' && settings.paypalMe) {
    // written as a handle or pasted as a link; both end at the handle
    const handle = settings.paypalMe.trim().replace(/^.*paypal(?:\.me|\.com\/paypalme)\//i, '').replace(/^@/, '').split(/[/?#]/)[0];
    if (handle) return `https://www.paypal.com/paypalme/${handle}/${Math.round(order.amount)}ILS`;
  }

  if (provider === 'paypal' && settings.paypalEmail) {
    const q = new URLSearchParams({
      cmd: '_xclick',
      business: settings.paypalEmail,
      item_name: order.item,
      amount: String(Math.round(order.amount)),
      currency_code: 'ILS',
      // a dress is shipped or collected, so the address is worth having
      no_shipping: '2',
      'locale.x': PAYPAL_LOCALE[order.locale ?? 'en'],
    });
    if (order.returnTo) q.set('return', order.returnTo);
    return `https://www.paypal.com/cgi-bin/webscr?${q}`;
  }

  if (provider === 'template' && settings.payTemplate) {
    return settings.payTemplate
      .replaceAll('{amount}', String(Math.round(order.amount)))
      .replaceAll('{item}', encodeURIComponent(order.item));
  }

  if (provider === 'link' && settings.payUrl) return settings.payUrl;

  return null;
}
