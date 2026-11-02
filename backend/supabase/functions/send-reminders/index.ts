import { createClient } from 'npm:@supabase/supabase-js@2';

type ReminderKind = 'before' | 'due' | 'overdue';

type PushToken = {
  user_id: string;
  expo_token: string;
};

type Group = {
  id: string;
  name: string;
  owner_id: string;
  currency: string;
  timezone: string;
  reminder_days_before: number;
  grace_days: number;
};

type Cycle = {
  id: string;
  label: string;
  due_date: string;
  status: 'open' | 'closed';
  group: Group;
};

type Member = {
  id: string;
  display_name: string;
  email: string;
  user_id: string | null;
  status: 'active' | 'removed';
};

type DueRow = {
  id: string;
  amount_cents: number;
  paid_at: string | null;
  member: Member;
  cycle: Cycle;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const expectedSecret = Deno.env.get('REMINDER_CRON_SECRET');

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Missing Supabase environment variables.' }, 500);
  }

  if (expectedSecret && request.headers.get('x-reminder-secret') !== expectedSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from('dues')
    .select(
      `
        id,
        amount_cents,
        paid_at,
        member:group_members!inner(id, display_name, email, user_id, status),
        cycle:billing_cycles!inner(
          id,
          label,
          due_date,
          status,
          group:groups!inner(
            id,
            name,
            owner_id,
            currency,
            timezone,
            reminder_days_before,
            grace_days
          )
        )
      `,
    )
    .is('paid_at', null);

  if (error) {
    return json({ error: error.message }, 500);
  }

  const dues = ((data ?? []) as unknown as DueRow[]).filter(
    (due) => due.cycle.status === 'open' && due.member.status === 'active',
  );

  const userIds = new Set<string>();
  for (const due of dues) {
    userIds.add(due.cycle.group.owner_id);
    if (due.member.user_id) userIds.add(due.member.user_id);
  }

  let tokenData: PushToken[] = [];

  if (userIds.size > 0) {
    const { data, error: tokenError } = await supabase
      .from('push_tokens')
      .select('user_id, expo_token')
      .in('user_id', [...userIds]);

    if (tokenError) {
      return json({ error: tokenError.message }, 500);
    }

    tokenData = (data ?? []) as PushToken[];
  }

  const tokensByUser = new Map<string, string[]>();
  for (const token of tokenData) {
    const list = tokensByUser.get(token.user_id) ?? [];
    list.push(token.expo_token);
    tokensByUser.set(token.user_id, list);
  }

  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const due of dues) {
    const group = due.cycle.group;
    const today = localDate(group.timezone);
    const daysUntil = daysBetween(today, due.cycle.due_date);
    const kind = reminderKind(daysUntil, group.reminder_days_before);

    if (!kind) {
      skipped += 1;
      continue;
    }

    const amount = formatMoney(due.amount_cents, group.currency);
    const dueDate = formatDate(due.cycle.due_date);
    const memberTitle = reminderTitle(kind, daysUntil, group.grace_days);
    const memberBody = `Your ${amount} share for ${due.cycle.label} is due ${dueDate}.`;
    const ownerTitle = reminderTitle(kind, daysUntil, group.grace_days);
    const ownerBody = `${due.member.display_name} still owes ${amount} for ${due.cycle.label} (due ${dueDate}).`;

    const messages: ReturnType<typeof pushMessage>[] = [];

    if (due.member.user_id) {
      for (const token of tokensByUser.get(due.member.user_id) ?? []) {
        messages.push(pushMessage(token, memberTitle, memberBody, due.cycle.id));
      }
    }

    for (const token of tokensByUser.get(group.owner_id) ?? []) {
      messages.push(pushMessage(token, ownerTitle, ownerBody, due.cycle.id));
    }

    if (messages.length === 0) {
      skipped += 1;
      continue;
    }

    const { error: logError } = await supabase.from('reminder_log').insert({
      due_id: due.id,
      kind,
      sent_on: today,
    });

    if (logError) {
      if (logError.code === '23505') {
        skipped += 1;
        continue;
      }
      failures.push(`${due.id}: ${logError.message}`);
      continue;
    }

    try {
      await sendPush(messages);
      sent += messages.length;
    } catch (caught) {
      failures.push(`${due.id}: ${errorMessage(caught)}`);
    }
  }

  return json({ sent, skipped, failures });
});

function reminderKind(daysUntil: number, reminderDaysBefore: number): ReminderKind | null {
  if (daysUntil === 0) return 'due';
  if (daysUntil === reminderDaysBefore) return 'before';
  if (daysUntil < 0) return 'overdue';
  return null;
}

function reminderTitle(kind: ReminderKind, daysUntil: number, graceDays: number): string {
  if (kind === 'due') return 'Spotify payment due today';
  if (kind === 'before') return `Spotify payment due in ${daysUntil} days`;
  if (daysUntil < -graceDays) return 'Spotify payment overdue';
  return 'Spotify payment past due';
}

function pushMessage(to: string, title: string, body: string, cycleId: string) {
  return {
    to,
    sound: 'default',
    title,
    body,
    channelId: 'payments',
    data: { url: `/cycle/${cycleId}` },
  };
}

async function sendPush(messages: unknown[]): Promise<void> {
  for (let index = 0; index < messages.length; index += 100) {
    const chunk = messages.slice(index, index + 100);
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    });

    if (!response.ok) {
      throw new Error(`Expo push request failed with ${response.status}.`);
    }
  }
}

function localDate(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function daysBetween(from: string, to: string): number {
  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toTime - fromTime) / 86_400_000);
}

function formatMoney(cents: number, currency: string): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
