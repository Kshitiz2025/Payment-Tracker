begin;

alter table public.transactions
  add column if not exists request_id uuid,
  add column if not exists deleted_at timestamptz,
  add column if not exists revision bigint not null default 0;
create unique index if not exists transactions_user_request_key
  on public.transactions(user_id, request_id);

create or replace function public.trackit_transaction_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.revision := old.revision + 1;
  new.request_id := old.request_id;
  return new;
end;
$$;
create or replace trigger trackit_transaction_revision
  before update on public.transactions for each row
  execute function public.trackit_transaction_revision();

create table if not exists public.monthly_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  budget numeric(14,2) check (budget >= 0),
  category_limits jsonb not null default '{}' check (jsonb_typeof(category_limits) = 'object'),
  primary key(user_id, month)
);
alter table public.monthly_plans enable row level security;
revoke all on public.monthly_plans from public, anon, authenticated;
grant select, insert, update on public.monthly_plans to authenticated;
create policy "Owner manages monthly plans" on public.monthly_plans
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
