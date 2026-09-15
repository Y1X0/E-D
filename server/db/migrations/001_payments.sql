-- Orders and their payments.
--
-- No card data is stored here, and none ever reaches this service: the buyer
-- types the card on the gateway's own page. What is kept is what is needed to
-- reconcile a payment against an order — the amount, the currency, the state,
-- and the gateway's own reference.

create extension if not exists "pgcrypto";

create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  reference       text        not null unique,
  status          text        not null,
  sku             text        not null,
  title           text        not null,
  quantity        integer     not null check (quantity > 0),
  unit_amount     bigint      not null check (unit_amount > 0),
  amount          bigint      not null check (amount > 0),
  currency        char(3)     not null,
  locale          text        not null default 'en',
  customer_name   text,
  customer_email  text,
  customer_phone  text,
  status_token    text        not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  paid_at         timestamptz
);

create table if not exists payments (
  id                      uuid primary key default gen_random_uuid(),
  order_id                uuid        not null references orders(id) on delete cascade,
  provider                text        not null,
  provider_session_id     text,
  provider_transaction_id text,
  amount                  bigint      not null check (amount > 0),
  currency                char(3)     not null,
  status                  text        not null,
  failure_reason          text,
  refunded_amount         bigint      not null default 0 check (refunded_amount >= 0),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  paid_at                 timestamptz
);

create index if not exists payments_order_idx on payments (order_id);
create unique index if not exists payments_session_idx
  on payments (provider, provider_session_id) where provider_session_id is not null;
-- the same gateway transaction can never be recorded against two payments
create unique index if not exists payments_transaction_idx
  on payments (provider, provider_transaction_id) where provider_transaction_id is not null;

-- Every webhook the gateway sends is written here first. The unique constraint
-- is what makes redelivery — and a replayed request — a no-op rather than a
-- second settlement.
create table if not exists webhook_events (
  id          bigserial primary key,
  provider    text        not null,
  event_id    text        not null,
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);
