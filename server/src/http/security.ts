import type { NextFunction, Request, Response } from 'express';

/**
 * A fixed-window limiter, per IP and per route.
 *
 * Small on purpose: the only endpoints worth protecting here are the two that
 * create work — checkout, which talks to the gateway, and the status endpoint,
 * which a success page polls. A dependency for that would be a dependency to
 * keep up to date for no gain.
 */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${req.path}|${req.ip ?? 'unknown'}`;
    const seen = hits.get(key);

    if (!seen || seen.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
    } else if (seen.count >= max) {
      res.setHeader('Retry-After', Math.ceil((seen.resetAt - now) / 1000));
      res.status(429).json({ error: 'too_many_requests' });
      return;
    } else {
      seen.count += 1;
    }

    // keep the map from growing without bound on a long-lived process
    if (hits.size > 5_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    next();
  };
}

/**
 * Only the website may ask this service to start a payment.
 *
 * The browser sends JSON with a content type that is not form-encoded, so it is
 * already outside what a cross-site form can forge; this closes the rest by
 * requiring the request to come from the site's own origin. The webhook route
 * is exempt — it is called by the gateway, and its signature is what proves it.
 */
export function sameOrigin(allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('origin');
    if (!origin || allowed.includes(origin)) return next();
    res.status(403).json({ error: 'origin_not_allowed' });
  };
}

export function cors(allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('origin');
    if (origin && allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'content-type');
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  };
}

/** Sent on every response: this service serves JSON to one origin, nothing else. */
export function hardenedHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Cache-Control', 'no-store');
  next();
}
