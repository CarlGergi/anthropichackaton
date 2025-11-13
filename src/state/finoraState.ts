import { logger } from "@/lib/logger";

export interface FinoraState {
  introShown: boolean;
  monthly_budget: number | null;
  categories: {
    rent: number | null;
    food: number | null;
    fun: number | null;
    other: number | null;
  };
  transactions: Array<{
    date: string;
    amount: number;
    category: string;
    note: string;
  }>;
  lastUpdated: string;
}

const FINORA_STATE_KEY = "finora_state";

export function getDefaultFinoraState(): FinoraState {
  return {
    introShown: false,
    monthly_budget: null,
    categories: {
      rent: null,
      food: null,
      fun: null,
      other: null,
    },
    transactions: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function loadFinoraState(): FinoraState {
  try {
    const stored = localStorage.getItem(FINORA_STATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.error("Failed to load finora_state:", e);
  }
  return getDefaultFinoraState();
}

export function saveFinoraState(state: FinoraState): void {
  try {
    state.lastUpdated = new Date().toISOString();
    localStorage.setItem(FINORA_STATE_KEY, JSON.stringify(state));
    logger.log("Saved finora_state:", state);
  } catch (e) {
    logger.error("Failed to save finora_state:", e);
  }
}

export function mergeStatePatch(
  current: FinoraState,
  patch: any
): FinoraState {
  return {
    ...current,
    ...patch,
    categories: {
      ...current.categories,
      ...(patch.categories || {}),
    },
    transactions: patch.transactions || current.transactions,
    lastUpdated: new Date().toISOString(),
  };
}
