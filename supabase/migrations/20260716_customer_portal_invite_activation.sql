-- Highway 38 Customer Portal invitation activation
-- Only pre-invited customer emails are linked to customer data.
-- Auth identities without a matching invited customer account receive no portal access.

create unique index if not exists customer_accounts_open_email_unique
on public.customer_accounts (lower(email))
where status in ('invited','active','suspended');

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create or replace function private.link_invited_customer_account()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_customer_id uuid;
begin
  if new.email is null then
    return new;
  end if;

  select ca.id
  into v_customer_id
  from public.customer_accounts ca
  where ca.auth_user_id is null
    and ca.status = 'invited'
    and lower(ca.email) = lower(new.email)
  order by ca.created_at
  limit 1
  for update;

  if v_customer_id is null then
    return new;
  end if;

  update public.customer_accounts
  set auth_user_id = new.id,
      status = 'active',
      updated_at = now()
  where id = v_customer_id;

  insert into public.customer_portal_events (
    customer_id,
    auth_user_id,
    event_type,
    record_type,
    record_id,
    result,
    external_action_occurred
  ) values (
    v_customer_id,
    new.id,
    'CUSTOMER_AUTH_LINKED',
    'customer_account',
    v_customer_id,
    'PASS',
    false
  );

  return new;
end;
$$;

revoke all on function private.link_invited_customer_account() from public;
revoke all on function private.link_invited_customer_account() from anon;
revoke all on function private.link_invited_customer_account() from authenticated;

drop trigger if exists customer_portal_link_invited_account on auth.users;
create trigger customer_portal_link_invited_account
after insert or update of email on auth.users
for each row
execute function private.link_invited_customer_account();

with matched as (
  select ca.id as customer_id, u.id as auth_user_id
  from public.customer_accounts ca
  join auth.users u on lower(u.email) = lower(ca.email)
  where ca.auth_user_id is null
    and ca.status = 'invited'
), updated as (
  update public.customer_accounts ca
  set auth_user_id = matched.auth_user_id,
      status = 'active',
      updated_at = now()
  from matched
  where ca.id = matched.customer_id
  returning ca.id, ca.auth_user_id
)
insert into public.customer_portal_events (
  customer_id, auth_user_id, event_type, record_type, record_id, result, external_action_occurred
)
select id, auth_user_id, 'CUSTOMER_AUTH_LINKED_RECONCILED', 'customer_account', id, 'PASS', false
from updated;
