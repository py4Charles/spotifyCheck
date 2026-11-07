import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import type { Viewer } from '@/types';

const ACTIVE_PLAN_KEY = 'spoticheck.activePlanId';

type PlansContextValue = {
  plans: Viewer[];
  activePlanId: string | null;
  activeViewer: Viewer | null;
  setActivePlanId: (id: string) => void;
};

const PlansContext = createContext<PlansContextValue | null>(null);

export function PlansProvider({ plans, children }: PropsWithChildren<{ plans: Viewer[] }>) {
  const [storedPlanId, setStoredPlanId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(ACTIVE_PLAN_KEY).then((stored) => {
      if (mounted && stored) setStoredPlanId(stored);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const activeViewer = useMemo(() => {
    if (storedPlanId) {
      const stored = plans.find((plan) => plan.group.id === storedPlanId);
      if (stored) return stored;
    }
    return plans[0] ?? null;
  }, [plans, storedPlanId]);

  const activePlanId = activeViewer?.group.id ?? null;

  const setActivePlanId = useCallback((id: string) => {
    setStoredPlanId(id);
    void AsyncStorage.setItem(ACTIVE_PLAN_KEY, id);
  }, []);

  const value = useMemo<PlansContextValue>(
    () => ({ plans, activePlanId, activeViewer, setActivePlanId }),
    [plans, activePlanId, activeViewer, setActivePlanId],
  );

  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>;
}

export function usePlansContext(): PlansContextValue {
  const value = useContext(PlansContext);
  if (!value) throw new Error('usePlansContext must be used inside PlansProvider.');
  return value;
}
