create or replace function public.enforce_owner_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*)
    from public.groups
    where owner_id = new.owner_id
  ) >= 6 then
    raise exception 'You can manage up to 6 plans.' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists groups_owner_plan_limit on public.groups;

create trigger groups_owner_plan_limit
before insert on public.groups
for each row execute function public.enforce_owner_plan_limit();
