import { BudgetState, Transaction, CategoryType } from "@/types";
import { logger } from "@/lib/logger";

// Updated storage keys from old "pennypal" to "finora"
const STORAGE_KEY = "finora_budget";
const TRANSACTIONS_KEY = "finora_transactions";

// Legacy keys for migration
const LEGACY_STORAGE_KEY = "pennypal_budget";
const LEGACY_TRANSACTIONS_KEY = "pennypal_transactions";

export function getDefaultBudget(): BudgetState {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  
  return {
    month,
    total: 0, // No default - user must set this
    categoryTargets: {
      food: 0.30,      // 30%
      transport: 0.15, // 15%
      fun: 0.20,       // 20%
      essentials: 0.25,// 25%
      clothes: 0.05,   // 5%
      other: 0.05,     // 5%
    },
    spent: {
      food: 0,
      transport: 0,
      fun: 0,
      essentials: 0,
      clothes: 0,
      other: 0,
    },
  };
}

export function loadBudget(): BudgetState {
  try {
    // Try new key first
    let stored = localStorage.getItem(STORAGE_KEY);

    // Migrate from legacy key if needed
    if (!stored) {
      const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyData) {
        logger.info("Migrating budget data from pennypal to finora");
        localStorage.setItem(STORAGE_KEY, legacyData);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        stored = legacyData;
      }
    }

    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.error("Failed to load budget:", e);
  }
  return getDefaultBudget();
}

export function saveBudget(budget: BudgetState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
  } catch (e) {
    logger.error("Failed to save budget:", e);
  }
}

export function loadTransactions(): Transaction[] {
  try {
    // Try new key first
    let stored = localStorage.getItem(TRANSACTIONS_KEY);

    // Migrate from legacy key if needed
    if (!stored) {
      const legacyData = localStorage.getItem(LEGACY_TRANSACTIONS_KEY);
      if (legacyData) {
        logger.info("Migrating transaction data from pennypal to finora");
        localStorage.setItem(TRANSACTIONS_KEY, legacyData);
        localStorage.removeItem(LEGACY_TRANSACTIONS_KEY);
        stored = legacyData;
      }
    }

    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.error("Failed to load transactions:", e);
  }
  return [];
}

export function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (e) {
    logger.error("Failed to save transactions:", e);
  }
}

export function addTransaction(transaction: Omit<Transaction, "id">): Transaction {
  const transactions = loadTransactions();
  const newTransaction: Transaction = {
    ...transaction,
    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
  
  transactions.unshift(newTransaction);
  saveTransactions(transactions);
  
  // Update budget
  const budget = loadBudget();
  budget.spent[transaction.category] += transaction.amount;
  saveBudget(budget);
  
  return newTransaction;
}

export function calculateRemaining(budget: BudgetState, category: CategoryType): number {
  const target = budget.total * budget.categoryTargets[category];
  return target - budget.spent[category];
}

export function calculateRemainingTotal(budget: BudgetState): number {
  const totalSpent = Object.values(budget.spent).reduce((sum, val) => sum + val, 0);
  return budget.total - totalSpent;
}

export function calculateDaysLeft(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate() + 1;
}

export function calculateForecast(budget: BudgetState): number {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const totalSpent = Object.values(budget.spent).reduce((sum, val) => sum + val, 0);
  const daysLeft = calculateDaysLeft();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  
  if (dayOfMonth === 0) return 0;
  
  const dailyRate = totalSpent / dayOfMonth;
  return dailyRate * daysLeft;
}

export function calculateBuffer(budget: BudgetState): number {
  const remaining = calculateRemainingTotal(budget);
  const forecast = calculateForecast(budget);
  return Math.max(0, remaining - forecast);
}

export function deleteTransaction(id: string): void {
  const transactions = loadTransactions();
  const transaction = transactions.find(tx => tx.id === id);
  
  if (!transaction) {
    logger.error("Transaction not found:", id);
    return;
  }
  
  // Remove transaction
  const updatedTransactions = transactions.filter(tx => tx.id !== id);
  saveTransactions(updatedTransactions);
  
  // Update budget - subtract the amount
  const budget = loadBudget();
  budget.spent[transaction.category] = Math.max(0, budget.spent[transaction.category] - transaction.amount);
  saveBudget(budget);
  
  logger.log("Transaction deleted:", id);
}

export function clearAllData(): void {
  // Clear current keys
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TRANSACTIONS_KEY);

  // Also clear legacy keys if they exist
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem(LEGACY_TRANSACTIONS_KEY);
}
