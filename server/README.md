# The payment service

Takes a card for a boutique piece, and decides — on its own, in its own
database — whether an order has been paid.

The card never comes here. The buyer is sent to the gateway's hosted page,
types the card there, passes 3-D Secure there, and comes back with nothing but
an order reference. What settles the order is the webhook the gateway sends
this service afterwards, verified against the signing secret. The redirect is
treated as what it is: a navigation.

```
browser  ──POST /api/checkout──▶  this service ──▶ gateway (hosted page)
                                        │                    │
                                        │                 the card
                                        ▼                    ▼
                                    orders + payments ◀── webhook (signed)
                                        │
browser  ──GET /api/orders/…/status─────┘
```

## Running it

```sh
npm install
npm test                 # 28 tests, no network, no database
PAYMENT_PROVIDER=mock npm start
```

`mock` is a gateway that behaves like one — it signs its webhooks the same way,
so the verification path under test is the real one — and takes no money.

In production set `PAYMENT_PROVIDER=stripe`, `PAYMENT_SERVER_KEY`,
`PAYMENT_WEBHOOK_SECRET` and `DATABASE_URL`; see `.env.example` at the root.
Without `DATABASE_URL` the service refuses to start in production rather than
hold orders in memory it will lose.

## What it exposes

| | |
|---|---|
| `GET /healthz` | liveness, and which gateway is configured |
| `GET /api/catalogue/:sku` | what a piece costs, for the checkout page |
| `POST /api/checkout` | creates the order and opens the gateway's page |
| `POST /api/webhooks/:provider` | the gateway's callback — the only thing that settles an order |
| `GET /api/orders/:reference/status?t=…` | what the database says, for the success page |
| `GET /api/admin/payments` | the atelier's own list, behind `ADMIN_TOKEN` |

## The rules it keeps

- The amount is read from `catalogue.json`, generated from the repository, and
  never from the request. A buyer cannot choose their own price.
- A webhook is verified, then deduplicated by the gateway's event id, then
  checked against the order — reference, amount, currency — before anything
  moves. A redelivery, or a replayed request, changes nothing and still
  answers 200.
- A payment moves only along the transitions in `domain/state.ts`, inside one
  transaction, with the row locked. Two webhooks arriving together cannot both
  settle the same order, and a late failure cannot unpay a paid one.
- No card data is stored, because none arrives. Logs are written through
  `redact`, which drops keys, signatures and anything shaped like a card number.
- Credentials are read once, from the environment, and never logged or returned.

## Adding an Israeli acquirer

`providers/local-il.ts` is the only file to write: create the payment page,
verify the notification. Everything else — the state machine, the checks, the
idempotency, the tests — already applies to it. It is left unimplemented on
purpose rather than guessed at.
