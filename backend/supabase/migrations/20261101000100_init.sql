create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'Spotify Family',
  currency text not null default 'GHS',
  plan_cost_cents integer not null check (plan_cost_cents > 0),
  reminder_days_before integer not null default 3 check (reminder_days_before >= 0),
  grace_days integer not null default 5 check (grace_days >= 0),
  timezone text not null default 'Africa/Accra',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index groups_owner_id_idx on public.groups (owner_id);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  email text not null,
  display_name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  joined_at timestamptz
);

create unique index group_members_group_email_key
  on public.group_members (group_id, lower(email));

create unique index group_members_group_user_key
  on public.group_members (group_id, user_id)
  where user_id is not null;

create index group_members_user_id_idx
  on public.group_members (user_id)
  where user_id is not null;

create unique index group_members_one_owner_idx
  on public.group_members (group_id)
  where role = 'owner';

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  email text not null,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index invites_email_idx on public.invites (lower(email));
create index invites_group_id_idx on public.invites (group_id);

create table public.billing_cycles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  label text not null,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  total_cents integer not null check (total_cents > 0),
  member_count integer not null check (member_count > 0),
  share_cents integer not null check (share_cents > 0),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (due_date >= period_start),
  unique (group_id, period_start)
);

create table public.dues (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.billing_cycles (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  paid_at timestamptz,
  payment_method text,
  reference text,
  note text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, member_id)
);

create index dues_member_id_idx on public.dues (member_id);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_token text not null,
  platform text not null default 'android',
  updated_at timestamptz not null default now(),
  unique (user_id, expo_token)
);

create table public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  due_id uuid not null references public.dues (id) on delete cascade,
  kind text not null check (kind in ('before', 'due', 'overdue')),
  sent_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (due_id, kind, sent_on)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger groups_set_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

create trigger dues_set_updated_at
before update on public.dues
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.groups
    where id = p_group_id and owner_id = auth.uid()
  );
$$;

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_cycle_owner(p_cycle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.billing_cycles c
    join public.groups g on g.id = c.group_id
    where c.id = p_cycle_id and g.owner_id = auth.uid()
  );
$$;

create or replace function public.is_due_owner(p_due_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dues d
    join public.billing_cycles c on c.id = d.cycle_id
    join public.groups g on g.id = c.group_id
    where d.id = p_due_id and g.owner_id = auth.uid()
  );
$$;

create or replace function public.is_due_member(p_due_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dues d
    join public.group_members gm on gm.id = d.member_id
    where d.id = p_due_id
      and gm.user_id = auth.uid()
      and gm.status = 'active'
  );
$$;

create or replace function public.accept_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_member record;
  v_count integer := 0;
begin
  select email into v_email from public.profiles where id = auth.uid();

  if v_email is null then
    return 0;
  end if;

  for v_member in
    select id, group_id
    from public.group_members
    where lower(email) = lower(v_email)
      and user_id is null
      and status = 'active'
  loop
    update public.group_members
    set user_id = auth.uid(), joined_at = now()
    where id = v_member.id;

    update public.invites
    set accepted_at = now()
    where group_id = v_member.group_id
      and lower(email) = lower(v_email)
      and accepted_at is null;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.create_group(
  p_name text,
  p_currency text,
  p_plan_cost_cents integer,
  p_reminder_days_before integer default 3,
  p_grace_days integer default 5,
  p_timezone text default 'Africa/Accra'
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_group public.groups;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, email, display_name)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1)
  )
  on conflict (id) do nothing;

  select * into v_profile from public.profiles where id = auth.uid();

  insert into public.groups (
    owner_id,
    name,
    currency,
    plan_cost_cents,
    reminder_days_before,
    grace_days,
    timezone
  )
  values (
    auth.uid(),
    trim(p_name),
    upper(trim(p_currency)),
    p_plan_cost_cents,
    greatest(p_reminder_days_before, 0),
    greatest(p_grace_days, 0),
    trim(p_timezone)
  )
  returning * into v_group;

  v_email := coalesce(v_profile.email, auth.jwt() ->> 'email', '');

  insert into public.group_members (
    group_id,
    user_id,
    email,
    display_name,
    role,
    status,
    joined_at
  )
  values (
    v_group.id,
    auth.uid(),
    lower(v_email),
    coalesce(nullif(v_profile.display_name, ''), split_part(v_email, '@', 1)),
    'owner',
    'active',
    now()
  );

  return v_group;
end;
$$;

create or replace function public.add_group_member(
  p_group_id uuid,
  p_email text,
  p_display_name text
)
returns public.group_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.group_members;
  v_email text := lower(trim(p_email));
begin
  if not public.is_group_owner(p_group_id) then
    raise exception 'Only the plan owner can add members';
  end if;

  select * into v_member
  from public.group_members
  where group_id = p_group_id and lower(email) = v_email;

  if found then
    update public.group_members
    set display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
        status = 'active'
    where id = v_member.id
    returning * into v_member;
  else
    insert into public.group_members (
      group_id,
      email,
      display_name,
      role,
      status
    )
    values (
      p_group_id,
      v_email,
      coalesce(nullif(trim(p_display_name), ''), split_part(v_email, '@', 1)),
      'member',
      'active'
    )
    returning * into v_member;
  end if;

  insert into public.invites (group_id, email, invited_by)
  values (p_group_id, v_email, auth.uid());

  return v_member;
end;
$$;

create or replace function public.create_billing_cycle(
  p_group_id uuid,
  p_label text,
  p_period_start date,
  p_period_end date,
  p_due_date date,
  p_total_cents integer
)
returns public.billing_cycles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle public.billing_cycles;
  v_member_count integer;
  v_share integer;
  v_remainder integer;
begin
  if not public.is_group_owner(p_group_id) then
    raise exception 'Only the plan owner can create cycles';
  end if;

  if p_period_end < p_period_start then
    raise exception 'Period end must be on or after period start';
  end if;

  if p_due_date < p_period_start then
    raise exception 'Due date must be on or after period start';
  end if;

  if p_total_cents <= 0 then
    raise exception 'Cycle total must be greater than zero';
  end if;

  select count(*) into v_member_count
  from public.group_members
  where group_id = p_group_id and status = 'active';

  if v_member_count = 0 then
    raise exception 'Add at least one member before creating a cycle';
  end if;

  v_share := p_total_cents / v_member_count;
  v_remainder := p_total_cents % v_member_count;

  if v_share <= 0 then
    raise exception 'Cycle total is too small to split between members';
  end if;

  insert into public.billing_cycles (
    group_id,
    label,
    period_start,
    period_end,
    due_date,
    total_cents,
    member_count,
    share_cents,
    created_by
  )
  values (
    p_group_id,
    trim(p_label),
    p_period_start,
    p_period_end,
    p_due_date,
    p_total_cents,
    v_member_count,
    v_share,
    auth.uid()
  )
  returning * into v_cycle;

  insert into public.dues (
    cycle_id,
    member_id,
    amount_cents,
    paid_at,
    recorded_by
  )
  select
    v_cycle.id,
    gm.id,
    v_share + case
      when row_number() over (order by gm.created_at, gm.id) <= v_remainder then 1
      else 0
    end,
    case when gm.role = 'owner' then now() else null end,
    case when gm.role = 'owner' then auth.uid() else null end
  from public.group_members gm
  where gm.group_id = p_group_id and gm.status = 'active';

  return v_cycle;
end;
$$;

create or replace function public.record_payment(
  p_due_id uuid,
  p_paid boolean,
  p_method text default null,
  p_reference text default null,
  p_note text default null
)
returns public.dues
language plpgsql
security definer
set search_path = public
as $$
declare
  v_due public.dues;
begin
  if not public.is_due_owner(p_due_id) then
    raise exception 'Only the plan owner can record payments';
  end if;

  update public.dues
  set paid_at = case when p_paid then now() else null end,
      payment_method = case when p_paid then nullif(trim(p_method), '') else null end,
      reference = case when p_paid then nullif(trim(p_reference), '') else null end,
      note = nullif(trim(p_note), ''),
      recorded_by = auth.uid(),
      updated_at = now()
  where id = p_due_id
  returning * into v_due;

  return v_due;
end;
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.invites enable row level security;
alter table public.billing_cycles enable row level security;
alter table public.dues enable row level security;
alter table public.push_tokens enable row level security;
alter table public.reminder_log enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "groups_select_owner_or_member"
on public.groups for select
to authenticated
using (owner_id = auth.uid() or public.is_group_member(id));

create policy "groups_insert_owner"
on public.groups for insert
to authenticated
with check (owner_id = auth.uid());

create policy "groups_update_owner"
on public.groups for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "groups_delete_owner"
on public.groups for delete
to authenticated
using (owner_id = auth.uid());

create policy "group_members_select_own_or_owner"
on public.group_members for select
to authenticated
using (user_id = auth.uid() or public.is_group_owner(group_id));

create policy "group_members_insert_owner"
on public.group_members for insert
to authenticated
with check (public.is_group_owner(group_id));

create policy "group_members_update_owner"
on public.group_members for update
to authenticated
using (public.is_group_owner(group_id))
with check (public.is_group_owner(group_id));

create policy "group_members_delete_owner"
on public.group_members for delete
to authenticated
using (public.is_group_owner(group_id));

create policy "invites_select_owner"
on public.invites for select
to authenticated
using (public.is_group_owner(group_id));

create policy "invites_insert_owner"
on public.invites for insert
to authenticated
with check (public.is_group_owner(group_id));

create policy "invites_update_owner"
on public.invites for update
to authenticated
using (public.is_group_owner(group_id))
with check (public.is_group_owner(group_id));

create policy "invites_delete_owner"
on public.invites for delete
to authenticated
using (public.is_group_owner(group_id));

create policy "billing_cycles_select_owner_or_member"
on public.billing_cycles for select
to authenticated
using (public.is_group_owner(group_id) or public.is_group_member(group_id));

create policy "billing_cycles_insert_owner"
on public.billing_cycles for insert
to authenticated
with check (public.is_group_owner(group_id));

create policy "billing_cycles_update_owner"
on public.billing_cycles for update
to authenticated
using (public.is_group_owner(group_id))
with check (public.is_group_owner(group_id));

create policy "billing_cycles_delete_owner"
on public.billing_cycles for delete
to authenticated
using (public.is_group_owner(group_id));

create policy "dues_select_owner_or_member"
on public.dues for select
to authenticated
using (public.is_due_owner(id) or public.is_due_member(id));

create policy "dues_insert_owner"
on public.dues for insert
to authenticated
with check (public.is_cycle_owner(cycle_id));

create policy "dues_update_owner"
on public.dues for update
to authenticated
using (public.is_due_owner(id))
with check (public.is_due_owner(id));

create policy "dues_delete_owner"
on public.dues for delete
to authenticated
using (public.is_due_owner(id));

create policy "push_tokens_select_own"
on public.push_tokens for select
to authenticated
using (user_id = auth.uid());

create policy "push_tokens_insert_own"
on public.push_tokens for insert
to authenticated
with check (user_id = auth.uid());

create policy "push_tokens_update_own"
on public.push_tokens for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "push_tokens_delete_own"
on public.push_tokens for delete
to authenticated
using (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.invites to authenticated;
grant select, insert, update, delete on public.billing_cycles to authenticated;
grant select, insert, update, delete on public.dues to authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;

revoke execute on function public.accept_invites() from public;
revoke execute on function public.create_group(text, text, integer, integer, integer, text) from public;
revoke execute on function public.add_group_member(uuid, text, text) from public;
revoke execute on function public.create_billing_cycle(uuid, text, date, date, date, integer) from public;
revoke execute on function public.record_payment(uuid, boolean, text, text, text) from public;

grant execute on function public.accept_invites() to authenticated;
grant execute on function public.create_group(text, text, integer, integer, integer, text) to authenticated;
grant execute on function public.add_group_member(uuid, text, text) to authenticated;
grant execute on function public.create_billing_cycle(uuid, text, date, date, date, integer) to authenticated;
grant execute on function public.record_payment(uuid, boolean, text, text, text) to authenticated;
