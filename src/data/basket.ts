/**
 * How many of one piece a basket may hold.
 *
 * A boutique piece is the dress hanging in the shop, so one. The atelier can
 * of course sew another — but that is a commission, not a second click.
 *
 * This is the only place the figure lives. The quantity control on the basket
 * page, the generated catalogue and the payment service's own check all read
 * it, so they cannot drift apart and offer a customer something the till then
 * refuses. It sits in a module of its own, with no imports, so the browser
 * bundle can have it without dragging the whole catalogue along.
 */
export const MAX_PER_PIECE = 1;
