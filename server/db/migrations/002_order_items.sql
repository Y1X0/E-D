-- An order may hold more than one piece.
--
-- The first version of this service sold a single piece at a time, so the item
-- lived on the order itself. A basket needs a line per piece, priced at the
-- moment the order was made, so the lines move into their own table and the
-- columns on `orders` become the summary they always were.

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid        not null references orders(id) on delete cascade,
  position    integer     not null,
  sku         text        not null,
  title       text        not null,
  quantity    integer     not null check (quantity > 0),
  unit_amount bigint      not null check (unit_amount > 0),
  amount      bigint      not null check (amount > 0),
  created_at  timestamptz not null default now(),
  unique (order_id, position)
);

create index if not exists order_items_order_idx on order_items (order_id);

-- Orders written before this migration carry their single piece in these
-- columns; new orders carry a summary in `title` and nothing in the rest.
alter table orders alter column sku drop not null;
alter table orders alter column quantity drop not null;
alter table orders alter column unit_amount drop not null;

-- Every order that existed keeps its piece, now as a line of its own.
insert into order_items (order_id, position, sku, title, quantity, unit_amount, amount)
select id, 1, sku, title, quantity, unit_amount, amount
  from orders o
 where o.sku is not null
   and not exists (select 1 from order_items i where i.order_id = o.id);
