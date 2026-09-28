-- How the dress reaches her.
--
-- A gown is either collected from the atelier or delivered, and the atelier
-- cannot act on a paid order without knowing which. The choice is part of the
-- order rather than a message that arrives beside it, so it is written in the
-- same transaction as the order and cannot go missing.
--
-- No charge is attached to either: what delivery costs is the atelier's to
-- decide, and nothing here invents a figure. The address is kept only when it
-- is needed — a collected order carries none.

alter table orders add column if not exists fulfilment text not null default 'PICKUP';
alter table orders add column if not exists delivery_address text;

-- Only the two the site offers, and an address exactly when one is meant to
-- exist: a delivery without one could not be delivered, and a collection with
-- one is an address nobody asked for.
alter table orders drop constraint if exists orders_fulfilment_check;
alter table orders add constraint orders_fulfilment_check check (
  (fulfilment = 'PICKUP'   and delivery_address is null) or
  (fulfilment = 'DELIVERY' and delivery_address is not null)
);
