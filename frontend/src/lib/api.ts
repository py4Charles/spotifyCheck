import { Platform } from 'react-native';

import type {
  BillingCycle,
  CycleInput,
  Due,
  DueWithCycle,
  Group,
  GroupInput,
  GroupMember,
  MemberInput,
  PaymentInput,
  Viewer,
} from '@/types';

import { supabase } from './supabase';

type SupabaseError = { message: string } | null;

function unwrap<T>(data: T | null, error: SupabaseError): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('No data returned.');
  return data;
}

export async function acceptInvites(): Promise<number> {
  const { data, error } = await supabase.rpc('accept_invites');
  if (error) throw new Error(error.message);
  return (data as number | null) ?? 0;
}

export async function fetchBootstrap(userId: string): Promise<Viewer | null> {
  try {
    await acceptInvites();
  } catch {
    void 0;
  }
  return fetchViewer(userId);
}

export async function fetchViewer(userId: string): Promise<Viewer | null> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, group:groups(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Viewer | null) ?? null;
}

export async function fetchMembers(
  groupId: string,
  includeRemoved = false,
): Promise<GroupMember[]> {
  let query = supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .order('role', { ascending: false })
    .order('display_name', { ascending: true });

  if (!includeRemoved) {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data as GroupMember[] | null) ?? [];
}

export async function fetchCycles(groupId: string): Promise<BillingCycle[]> {
  const { data, error } = await supabase
    .from('billing_cycles')
    .select('*')
    .eq('group_id', groupId)
    .order('period_start', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as BillingCycle[] | null) ?? [];
}

export async function fetchCycle(cycleId: string): Promise<BillingCycle> {
  const { data, error } = await supabase
    .from('billing_cycles')
    .select('*')
    .eq('id', cycleId)
    .single();

  return unwrap(data as BillingCycle | null, error);
}

export async function fetchCycleDues(cycleId: string): Promise<Due[]> {
  const { data, error } = await supabase
    .from('dues')
    .select('*')
    .eq('cycle_id', cycleId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Due[] | null) ?? [];
}

export async function fetchDuesForCycles(cycleIds: string[]): Promise<Due[]> {
  if (cycleIds.length === 0) return [];
  const { data, error } = await supabase.from('dues').select('*').in('cycle_id', cycleIds);

  if (error) throw new Error(error.message);
  return (data as Due[] | null) ?? [];
}

export async function fetchMyDues(memberId: string): Promise<DueWithCycle[]> {
  const { data, error } = await supabase
    .from('dues')
    .select('*, cycle:billing_cycles!inner(*, group:groups!inner(*))')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as DueWithCycle[] | null) ?? [];
}

export async function createGroup(input: GroupInput): Promise<Group> {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: input.name,
    p_currency: input.currency,
    p_plan_cost_cents: input.planCostCents,
    p_reminder_days_before: input.reminderDaysBefore,
    p_grace_days: input.graceDays,
    p_timezone: input.timezone,
  });

  return unwrap(data as Group | null, error);
}

export async function addGroupMember(input: MemberInput): Promise<GroupMember> {
  const { data, error } = await supabase.rpc('add_group_member', {
    p_group_id: input.groupId,
    p_email: input.email,
    p_display_name: input.displayName,
  });

  return unwrap(data as GroupMember | null, error);
}

export async function createBillingCycle(input: CycleInput): Promise<BillingCycle> {
  const { data, error } = await supabase.rpc('create_billing_cycle', {
    p_group_id: input.groupId,
    p_label: input.label,
    p_period_start: input.periodStart,
    p_period_end: input.periodEnd,
    p_due_date: input.dueDate,
    p_total_cents: input.totalCents,
  });

  return unwrap(data as BillingCycle | null, error);
}

export async function recordPayment(input: PaymentInput): Promise<Due> {
  const { data, error } = await supabase.rpc('record_payment', {
    p_due_id: input.dueId,
    p_paid: input.paid,
    p_method: input.method ?? null,
    p_reference: input.reference ?? null,
    p_note: input.note ?? null,
  });

  return unwrap(data as Due | null, error);
}

export async function updateGroup(
  groupId: string,
  updates: Partial<
    Pick<
      Group,
      | 'name'
      | 'currency'
      | 'plan_cost_cents'
      | 'reminder_days_before'
      | 'grace_days'
      | 'timezone'
    >
  >,
): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .select('*')
    .single();

  return unwrap(data as Group | null, error);
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .update({ status: 'removed' })
    .eq('id', memberId);
  if (error) throw new Error(error.message);
}

export async function savePushToken(userId: string, expoToken: string): Promise<void> {
  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      expo_token: expoToken,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,expo_token' },
  );
  if (error) throw new Error(error.message);
}

export async function deletePushToken(userId: string, expoToken: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('expo_token', expoToken);
  if (error) throw new Error(error.message);
}
