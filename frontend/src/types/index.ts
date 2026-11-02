export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Group = {
  id: string;
  owner_id: string;
  name: string;
  currency: string;
  plan_cost_cents: number;
  reminder_days_before: number;
  grace_days: number;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string | null;
  email: string;
  display_name: string;
  role: 'owner' | 'member';
  status: 'active' | 'removed';
  created_at: string;
  joined_at: string | null;
};

export type BillingCycle = {
  id: string;
  group_id: string;
  label: string;
  period_start: string;
  period_end: string;
  due_date: string;
  total_cents: number;
  member_count: number;
  share_cents: number;
  status: 'open' | 'closed';
  created_by: string;
  created_at: string;
};

export type Due = {
  id: string;
  cycle_id: string;
  member_id: string;
  amount_cents: number;
  paid_at: string | null;
  payment_method: string | null;
  reference: string | null;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DueStatus = 'paid' | 'unpaid' | 'overdue';

export type Viewer = GroupMember & {
  group: Group;
};

export type DueWithCycle = Due & {
  cycle: BillingCycle & {
    group: Group;
  };
};

export type CycleSummary = {
  cycle: BillingCycle;
  totalCents: number;
  paidCents: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
};

export type GroupInput = {
  name: string;
  currency: string;
  planCostCents: number;
  reminderDaysBefore: number;
  graceDays: number;
  timezone: string;
};

export type MemberInput = {
  groupId: string;
  email: string;
  displayName: string;
};

export type CycleInput = {
  groupId: string;
  label: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  totalCents: number;
};

export type PaymentInput = {
  dueId: string;
  paid: boolean;
  method?: string | null;
  reference?: string | null;
  note?: string | null;
};
