import type { Express, Request, Response } from 'express';
import express from 'express';
import { randomUUID } from 'node:crypto';
import type { MockProvider } from '../providers/mock.ts';
import { formatMinor } from '../money.ts';

/**
 * The sandbox gateway's own page.
 *
 * It stands where the real gateway's page stands — the buyer is sent here, and
 * comes back the same way — so the whole journey can be walked before a card is
 * ever involved: checkout, the gateway, the webhook, the settled order, the
 * success page reading it back. Nothing is charged and no card is asked for.
 *
 * Mounted only when the configured provider is the mock one. With a real
 * gateway configured these routes do not exist at all.
 */
export function mountSandbox(app: Express, provider: MockProvider): void {
  app.get('/sandbox/checkout', (req: Request, res: Response) => {
    const session = String(req.query.session ?? '');
    const amount = Number(req.query.amount ?? 0);
    const back = String(req.query.return ?? '');
    const cancel = String(req.query.cancel ?? '');
    if (!session || !amount || !back) { res.status(400).send('missing session'); return; }

    const reference = new URL(back, 'http://x').searchParams.get('ref') ?? '';
    const field = (name: string, value: string) =>
      `<input type="hidden" name="${name}" value="${escape_(value)}">`;

    res.type('html').send(`<!doctype html>
<html lang="ar" dir="rtl">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>بوابة تجريبية — ${escape_(reference)}</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0; min-height: 100dvh; display: grid; place-items: center;
    background: #f1efea; color: #191512; padding: 1.5rem;
    font: 400 16px/1.6 ui-sans-serif, system-ui, "Segoe UI", sans-serif;
  }
  .card { background: #fff; max-width: 27rem; width: 100%; padding: 2rem 1.75rem; box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 12px 40px rgba(0,0,0,.07); }
  .flag { font-size: .75rem; letter-spacing: .14em; text-transform: uppercase; color: #8a6d3b; background: #fdf6e6; border: 1px solid #efe0bf; padding: .5rem .7rem; margin-bottom: 1.5rem; }
  h1 { font-size: 1.15rem; font-weight: 500; margin: 0 0 .25rem; }
  .ref { font-size: .8rem; color: #6b6157; margin: 0 0 1.5rem; }
  .amount { font-size: 2rem; letter-spacing: .01em; margin: 0 0 .25rem; }
  .sub { font-size: .8rem; color: #6b6157; margin: 0 0 1.75rem; }
  form { display: grid; gap: .65rem; }
  button { font: inherit; padding: .85rem 1rem; border: 1px solid #191512; background: #191512; color: #f5f0e7; cursor: pointer; }
  button.ghost { background: transparent; color: #191512; }
  button.quiet { background: transparent; color: #6b6157; border-color: #d8d2c7; }
  button:hover { opacity: .9; }
  .note { font-size: .75rem; color: #6b6157; margin: 1.5rem 0 0; }
</style>
<div class="card">
  <p class="flag">بيئة تجريبية · لا يُخصم أي مبلغ</p>
  <h1>Elite Evening Design</h1>
  <p class="ref">طلب رقم ${escape_(reference)}</p>
  <p class="amount">${formatMinor(amount, 'ILS')}</p>
  <p class="sub">هنا تُدخل الزبونة بطاقتها على صفحة شركة الدفع. اختاري كيف تنتهي العملية:</p>

  <form method="post" action="/sandbox/settle">
    ${field('session', session)}${field('reference', reference)}
    ${field('amount', String(amount))}${field('return', back)}${field('cancel', cancel)}
    <button name="outcome" value="PAID" type="submit">تمّ الدفع بنجاح</button>
    <button name="outcome" value="FAILED" type="submit" class="ghost">فشل الدفع — بطاقة مرفوضة</button>
    <button name="outcome" value="CANCELLED" type="submit" class="quiet">إلغاء والعودة</button>
  </form>

  <p class="note">الزر يرسل إلى الموقع إشعاراً موقّعاً، تماماً كما ترسله البوابة الحقيقية، والموقع هو من يقرّر حالة الطلب.</p>
</div>`);
  });

  app.post('/sandbox/settle', express.urlencoded({ extended: false }), async (req: Request, res: Response) => {
    // only from the sandbox page itself, which lives on this same origin
    const from = req.get('origin');
    if (from && from !== `${req.protocol}://${req.get('host')}`) { res.status(403).end(); return; }
    const { session, reference, amount, outcome } = req.body as Record<string, string>;
    const back = String(req.body.return ?? '');
    const cancel = String(req.body.cancel ?? '');

    const body = JSON.stringify({
      id: `evt_sandbox_${randomUUID()}`,
      status: outcome,
      reference,
      session,
      amount: Number(amount),
      currency: 'ILS',
      transaction: outcome === 'PAID' ? `txn_sandbox_${randomUUID().slice(0, 8)}` : null,
      failureReason: outcome === 'FAILED' ? 'card declined (sandbox)' : null,
    });

    // exactly the path a real gateway takes: a signed request to the webhook
    await fetch(`${req.protocol}://${req.get('host')}/api/webhooks/mock`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-mock-signature': provider.sign(body) },
      body,
    }).catch(() => undefined);

    res.redirect(303, outcome === 'CANCELLED' && cancel ? cancel : back);
  });
}

const escape_ = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
