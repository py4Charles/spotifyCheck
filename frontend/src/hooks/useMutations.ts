import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import {
  addGroupMember,
  createBillingCycle,
  createGroup,
  recordPayment,
  removeMember,
  savePushToken,
  updateGroup,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { registerForPushNotificationsAsync } from '@/lib/push';

import type { CycleInput, Group, GroupInput, MemberInput, PaymentInput } from '@/types';

import { queryKeys } from './useAppData';

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GroupInput) => createGroup(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viewer'] });
    },
  });
}

export function useAddMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<MemberInput, 'groupId'>) =>
      addGroupMember({ ...input, groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', groupId] });
    },
  });
}

export function useCreateCycle(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CycleInput, 'groupId'>) =>
      createBillingCycle({ ...input, groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cycles(groupId) });
      queryClient.invalidateQueries({ queryKey: ['group-dues', groupId] });
    },
  });
}

export function useRecordPayment(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentInput) => recordPayment(input),
    onSuccess: (due) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cycleDues(due.cycle_id) });
      queryClient.invalidateQueries({ queryKey: ['group-dues', groupId] });
      queryClient.invalidateQueries({ queryKey: ['my-dues'] });
    },
  });
}

export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
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
    ) => updateGroup(groupId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viewer'] });
    },
  });
}

export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', groupId] });
    },
  });
}

export function useEnablePushNotifications() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('You need to be signed in.');
      const token = await registerForPushNotificationsAsync();
      await savePushToken(user.id, token);
      return token;
    },
  });
}

export function usePushTokenSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function sync() {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;
        const token = await registerForPushNotificationsAsync();
        if (!cancelled) await savePushToken(user!.id, token);
      } catch {
        void 0;
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [user]);
}
