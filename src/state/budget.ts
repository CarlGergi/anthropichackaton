import { BudgetState, Transaction, CategoryType } from "@/types";
import { logger } from "@/lib/logger";

// Updated storage keys from old "pennypal" to "finora"
// Normal mode uses standard keys, demo mode uses _demo suffix
const STORAGE_KEY = "finora_budget";
const TRANSACTIONS_KEY = "finora_transactions";
const DEMO_STORAGE_KEY = "finora_budget_demo";
const DEMO_TRANSACTIONS_KEY = "finora_transactions_demo";

// Legacy keys for migration
const LEGACY_STORAGE_KEY = "pennypal_budget";
const LEGACY_TRANSACTIONS_KEY = "pennypal_transactions";

// Track current mode
let currentMode: "normal" | "demo" = "normal";

export function setStorageMode(mode: "normal" | "demo"): void {
  currentMode = mode;
  logger.log(`[Storage] Switched to ${mode.toUpperCase()} mode`);
}

export function getStorageMode(): "normal" | "demo" {
  return currentMode;
}

function getBudgetKey(): string {
  return currentMode === "demo" ? DEMO_STORAGE_KEY : STORAGE_KEY;
}

function getTransactionsKey(): string {
  return currentMode === "demo" ? DEMO_TRANSACTIONS_KEY : TRANSACTIONS_KEY;
}

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
    const key = getBudgetKey();
    let stored = localStorage.getItem(key);

    // Migrate from legacy key if needed (only for normal mode)
    if (!stored && currentMode === "normal") {
      const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyData) {
        logger.log("Migrating budget data from pennypal to finora");
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
    const key = getBudgetKey();
    localStorage.setItem(key, JSON.stringify(budget));
  } catch (e) {
    logger.error("Failed to save budget:", e);
  }
}

export function loadTransactions(): Transaction[] {
  try {
    const key = getTransactionsKey();
    let stored = localStorage.getItem(key);

    // Migrate from legacy key if needed (only for normal mode)
    if (!stored && currentMode === "normal") {
      const legacyData = localStorage.getItem(LEGACY_TRANSACTIONS_KEY);
      if (legacyData) {
        logger.log("Migrating transaction data from pennypal to finora");
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
    const key = getTransactionsKey();
    localStorage.setItem(key, JSON.stringify(transactions));
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
  // Clear current mode's data only
  const budgetKey = getBudgetKey();
  const transactionsKey = getTransactionsKey();
  localStorage.removeItem(budgetKey);
  localStorage.removeItem(transactionsKey);

  // Also clear legacy keys if they exist (only for normal mode)
  if (currentMode === "normal") {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TRANSACTIONS_KEY);
  }

  logger.log(`[Storage] Cleared ${currentMode} mode data`);
}

export function clearNormalModeData(): void {
  // Clear only normal mode data
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TRANSACTIONS_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem(LEGACY_TRANSACTIONS_KEY);
  logger.log("[Storage] Cleared normal mode data");
}

/**
 * Generate realistic student expense demo data
 * Creates transactions spread across the month
 * @param fullMonth - If true, shows all transactions regardless of current day (for demo purposes)
 */
export function generateDemoTransactions(fullMonth: boolean = false): Transaction[] {
  const now = new Date();
  const currentDay = now.getDate();

  // Demo Profile: "Alex Chen" - University of Toronto student
  // Budget: $1000/month
  // Living in shared apartment near campus
  const demoExpenses = [
    // Week 1 (Days 1-7)
    { day: 1, amount: 250, merchant: "Rent Payment", category: "essentials" as CategoryType, description: "Monthly rent split with roommate" },
    { day: 2, amount: 45, merchant: "No Frills", category: "food" as CategoryType, description: "Weekly groceries" },
    { day: 3, amount: 7.50, merchant: "Starbucks", category: "food" as CategoryType, description: "Coffee and breakfast" },
    { day: 4, amount: 13.50, merchant: "TTC Day Pass", category: "transport" as CategoryType, description: "Transit pass" },
    { day: 5, amount: 12, merchant: "Pizza Pizza", category: "food" as CategoryType, description: "Lunch between classes" },
    { day: 6, amount: 35, merchant: "Sneaky Dee's", category: "fun" as CategoryType, description: "Night out with friends" },
    { day: 7, amount: 18, merchant: "Pai Thai", category: "food" as CategoryType, description: "Dinner" },

    // Week 2 (Days 8-14)
    { day: 8, amount: 6.50, merchant: "Tim Hortons", category: "food" as CategoryType, description: "Morning coffee" },
    { day: 9, amount: 42, merchant: "No Frills", category: "food" as CategoryType, description: "Groceries" },
    { day: 10, amount: 15, merchant: "Comedy Bar", category: "fun" as CategoryType, description: "Comedy show with classmates" },
    { day: 11, amount: 8.75, merchant: "Uber Eats", category: "food" as CategoryType, description: "Late night study snack" },
    { day: 12, amount: 27, merchant: "TTC Weekly Pass", category: "transport" as CategoryType, description: "Weekly transit pass" },
    { day: 13, amount: 55, merchant: "Textbook Store", category: "essentials" as CategoryType, description: "Course materials" },
    { day: 14, amount: 14, merchant: "Freshii", category: "food" as CategoryType, description: "Healthy lunch" },

    // Week 3 (Days 15-21)
    { day: 15, amount: 9, merchant: "Dollarama", category: "essentials" as CategoryType, description: "Household supplies" },
    { day: 16, amount: 38, merchant: "No Frills", category: "food" as CategoryType, description: "Weekly groceries" },
    { day: 17, amount: 22, merchant: "Scotiabank Theatre", category: "fun" as CategoryType, description: "Movie night" },
    { day: 18, amount: 11.50, merchant: "Banh Mi Boys", category: "food" as CategoryType, description: "Quick lunch" },
    { day: 19, amount: 45, merchant: "Uniqlo", category: "clothes" as CategoryType, description: "New winter shirt" },
    { day: 20, amount: 16, merchant: "Hot Docs Cinema", category: "fun" as CategoryType, description: "Documentary for class" },
    { day: 21, amount: 7.25, merchant: "Starbucks", category: "food" as CategoryType, description: "Study session coffee" },

    // Week 4 (Days 22-28)
    { day: 22, amount: 35, merchant: "No Frills", category: "food" as CategoryType, description: "Weekly groceries" },
    { day: 23, amount: 13.50, merchant: "TTC Day Pass", category: "transport" as CategoryType, description: "Transit for weekend" },
    { day: 24, amount: 8, merchant: "Pizza Pizza", category: "food" as CategoryType, description: "Quick dinner" },
    { day: 25, amount: 25, merchant: "Value Village", category: "clothes" as CategoryType, description: "Thrift shopping" },
    { day: 26, amount: 30, merchant: "Kinka Izakaya", category: "fun" as CategoryType, description: "Date night dinner" },
    { day: 27, amount: 12, merchant: "Kupfert & Kim", category: "food" as CategoryType, description: "Healthy meal prep" },
    { day: 28, amount: 15, merchant: "Bulk Barn", category: "essentials" as CategoryType, description: "Snacks and trail mix" },
  ];

  // Filter to only include expenses up to current day (unless fullMonth is true for demo)
  const relevantExpenses = fullMonth
    ? demoExpenses
    : demoExpenses.filter(exp => exp.day <= currentDay);

  // Convert to Transaction format
  const transactions: Transaction[] = relevantExpenses.map((exp, index) => {
    const expenseDate = new Date(now.getFullYear(), now.getMonth(), exp.day);

    return {
      id: `demo_tx_${Date.now()}_${index}`,
      date: expenseDate.toISOString().split("T")[0],
      amount: exp.amount,
      merchant: exp.merchant,
      category: exp.category,
      source: "manual" as const,
      rawText: exp.description,
    };
  });

  return transactions.reverse(); // Most recent first
}

/**
 * Initialize budget with demo data for demonstration purposes
 * Always loads demo data to ensure the app boots with realistic examples
 */
export function initializeDemoData(): void {
  logger.log("Initializing demo data for $1000 budget - Alex Chen profile");

  // Generate demo transactions (full month for complete demo experience)
  const demoTransactions = generateDemoTransactions(true);
  saveTransactions(demoTransactions);

  // Create fresh budget with demo spending AND set budget total to $1000
  const budget = getDefaultBudget();
  budget.total = 1000; // Set the budget total

  // Calculate total spent per category from demo transactions
  budget.spent = {
    food: 0,
    transport: 0,
    fun: 0,
    essentials: 0,
    clothes: 0,
    other: 0,
  };

  demoTransactions.forEach(tx => {
    budget.spent[tx.category] = (budget.spent[tx.category] || 0) + tx.amount;
  });

  saveBudget(budget);

  logger.log(`Successfully loaded ${demoTransactions.length} demo transactions with $1000 budget`);
  logger.log(`Total spent: $${Object.values(budget.spent).reduce((a, b) => a + b, 0).toFixed(2)}`);
}

/**
 * Force load demo data even if data already exists
 * Useful for testing and showcasing features
 */
export function forceLoadDemoData(): void {
  logger.log("Force loading demo data - Alex Chen profile");

  // Clear existing data first
  clearAllData();

  // Generate demo transactions (full month)
  const demoTransactions = generateDemoTransactions(true);
  saveTransactions(demoTransactions);

  // Create budget with demo spending
  const budget = getDefaultBudget();
  budget.total = 1000;

  // Calculate total spent per category
  demoTransactions.forEach(tx => {
    budget.spent[tx.category] += tx.amount;
  });

  saveBudget(budget);

  logger.log(`Force loaded ${demoTransactions.length} demo transactions with $1000 budget`);
}
