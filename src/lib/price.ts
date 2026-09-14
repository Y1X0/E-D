/**
 * Prices are written once, in whole shekels, and read the same way in all three
 * languages: Western digits and the ₪ sign, which is how prices are quoted in
 * Lod whichever language the conversation is in.
 */
export const formatPrice = (amount: number): string =>
  `${Math.round(amount).toLocaleString('en-US')} ₪`;
