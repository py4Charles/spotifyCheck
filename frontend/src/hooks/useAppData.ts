import { useQuery } from '@tanstack/react-query';

import {
  fetchBootstrap,
  fetchCycle,
  fetchCycleDues,
  fetchCycles,
  fetchDuesForCycles,
  fetchMembers,
  fetchMyDues,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';

import type { BillingCycle, Due, DueWithCycle, GroupMember, Viewer } from '@/types';

export const queryKeys = {
  viewer: (userId: string) => ['viewer', userId] as const,
  members: (groupId: string, includeRemoved = false) =>
    ['members', groupId, includeRemoved ? 'all' : 'active'] as const,
  cycles: (groupId: string) => ['cycles', groupId] as const,
  cycle: (cycleId: string) => ['cycle', cycleId] as const,
  cycleDues: (cycleId: string) => ['cycle-dues', cycleId] as const,
  groupDues: (groupId: string, cycleIds: string[]) => ['group-dues', groupId, cycleIds] as const,
  myDues: (memberId: string) => ['my-dues', memberId] as const,
};

export function useViewer() {
  const { user } = useAuth();
  return useQuery<Viewer | null>({
    queryKey: queryKeys.viewer(user?.id ?? 'anonymous'),
    queryFn: () => fetchBootstrap(user!.id),
    enabled: Boolean(user),
  });
}

export function useMembers(groupId?: string | null, includeRemoved = false) {
  return useQuery<GroupMember[]>({
    queryKey: queryKeys.members(groupId ?? 'none', includeRemoved),
    queryFn: () => fetchMembers(groupId!, includeRemoved),
    enabled: Boolean(groupId),
  });
}

export function useCycles(groupId?: string | null) {
  return useQuery<BillingCycle[]>({
    queryKey: queryKeys.cycles(groupId ?? 'none'),
    queryFn: () => fetchCycles(groupId!),
    enabled: Boolean(groupId),
  });
}

export function useCycle(cycleId?: string | null) {
  return useQuery<BillingCycle>({
    queryKey: queryKeys.cycle(cycleId ?? 'none'),
    queryFn: () => fetchCycle(cycleId!),
    enabled: Boolean(cycleId),
  });
}

export function useCycleDues(cycleId?: string | null) {
  return useQuery<Due[]>({
    queryKey: queryKeys.cycleDues(cycleId ?? 'none'),
    queryFn: () => fetchCycleDues(cycleId!),
    enabled: Boolean(cycleId),
  });
}

export function useMyDues(memberId?: string | null) {
  return useQuery<DueWithCycle[]>({
    queryKey: queryKeys.myDues(memberId ?? 'none'),
    queryFn: () => fetchMyDues(memberId!),
    enabled: Boolean(memberId),
  });
}

export function useOwnerCycleSummaries(groupId?: string | null) {
  const cyclesQuery = useCycles(groupId);
  const cycleIds = cyclesQuery.data?.map((cycle) => cycle.id) ?? [];

  const duesQuery = useQuery<Due[]>({
    queryKey: queryKeys.groupDues(groupId ?? 'none', cycleIds),
    queryFn: () => fetchDuesForCycles(cycleIds),
    enabled: Boolean(groupId) && cycleIds.length > 0,
  });

  return { cyclesQuery, duesQuery, cycleIds };
}
