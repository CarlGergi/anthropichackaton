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

// Generate realistic demo data for Toronto student - Perfect for judges!
export function initializeDemoData(): void {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentDay = now.getDate();

  // Create budget with $1200 total (realistic for student)
  const demoBudget: BudgetState = {
    month,
    total: 1200,
    categoryTargets: {
      food: 0.30,      // 30% = $360
      transport: 0.15, // 15% = $180
      fun: 0.20,       // 20% = $240
      essentials: 0.25,// 25% = $300
      clothes: 0.05,   // 5% = $60
      other: 0.05,     // 5% = $60
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

  // Create realistic Toronto student transactions spread across the month
  const demoTransactions: Transaction[] = [
    // Day 1 - Rent payment (essentials)
    {
      id: `tx_${Date.now()}_demo1`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
      amount: 600,
      merchant: "Landlord - Monthly Rent",
      category: "essentials",
      source: "manual"
    },

    // Day 1 - Groceries
    {
      id: `tx_${Date.now()}_demo2`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
      amount: 85,
      merchant: "No Frills - Weekly Groceries",
      category: "food",
      source: "vision",
      rawText: "Photo of receipt"
    },

    // Day 2 - Coffee run
    {
      id: `tx_${Date.now()}_demo3`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-02`,
      amount: 6.50,
      merchant: "Starbucks - Coffee",
      category: "food",
      source: "voice",
      rawText: "I spent $6.50 on coffee at Starbucks"
    },

    // Day 2 - TTC Pass
    {
      id: `tx_${Date.now()}_demo4`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-02`,
      amount: 156,
      merchant: "TTC - Monthly Metropass",
      category: "transport",
      source: "manual"
    },

    // Day 3 - Phone bill
    {
      id: `tx_${Date.now()}_demo5`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-03`,
      amount: 55,
      merchant: "Fido - Phone Bill",
      category: "essentials",
      source: "manual"
    },

    // Day 3 - Late night food
    {
      id: `tx_${Date.now()}_demo6`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-03`,
      amount: 18,
      merchant: "Uber Eats - Pizza",
      category: "food",
      source: "voice",
      rawText: "Spent $18 on Uber Eats"
    },

    // Day 4 - Coffee again
    {
      id: `tx_${Date.now()}_demo7`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-04`,
      amount: 6.50,
      merchant: "Starbucks - Coffee",
      category: "food",
      source: "voice",
      rawText: "Got coffee again, $6.50"
    },

    // Day 5 - Movies with friends
    {
      id: `tx_${Date.now()}_demo8`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`,
      amount: 45,
      merchant: "Cineplex - Movie Tickets & Snacks",
      category: "fun",
      source: "manual"
    },

    // Day 5 - Late Uber home
    {
      id: `tx_${Date.now()}_demo9`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`,
      amount: 22,
      merchant: "Uber - Ride Home",
      category: "transport",
      source: "voice",
      rawText: "Uber ride cost me $22"
    },

    // Day 6 - Pharmacy
    {
      id: `tx_${Date.now()}_demo10`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-06`,
      amount: 25,
      merchant: "Shoppers Drug Mart",
      category: "essentials",
      source: "manual"
    },

    // Day 7 - Weekend groceries
    {
      id: `tx_${Date.now()}_demo11`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-07`,
      amount: 42,
      merchant: "Loblaws - Groceries",
      category: "food",
      source: "vision",
      rawText: "Photo of receipt"
    },

    // Day 8 - Coffee
    {
      id: `tx_${Date.now()}_demo12`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-08`,
      amount: 6.50,
      merchant: "Starbucks - Coffee",
      category: "food",
      source: "voice",
      rawText: "Coffee $6.50"
    },

    // Day 8 - Friday night out
    {
      id: `tx_${Date.now()}_demo13`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-08`,
      amount: 65,
      merchant: "The Drake Hotel - Drinks",
      category: "fun",
      source: "manual"
    },

    // Day 9 - Brunch
    {
      id: `tx_${Date.now()}_demo14`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-09`,
      amount: 28,
      merchant: "Sunset Grill - Brunch",
      category: "food",
      source: "voice",
      rawText: "Brunch was $28"
    },

    // Day 10 - Amazon order
    {
      id: `tx_${Date.now()}_demo15`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`,
      amount: 35,
      merchant: "Amazon - School Supplies",
      category: "other",
      source: "manual"
    },

    // Day 11 - Coffee
    {
      id: `tx_${Date.now()}_demo16`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-11`,
      amount: 6.50,
      merchant: "Starbucks - Coffee",
      category: "food",
      source: "voice",
      rawText: "Coffee $6.50"
    },

    // Day 12 - Spotify
    {
      id: `tx_${Date.now()}_demo17`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-12`,
      amount: 11.99,
      merchant: "Spotify Premium",
      category: "fun",
      source: "manual"
    },

    // Day 13 - Fast food
    {
      id: `tx_${Date.now()}_demo18`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-13`,
      amount: 14,
      merchant: "McDonald's",
      category: "food",
      source: "voice",
      rawText: "Spent $14 at McDonald's"
    },

    // Day 14 - Groceries
    {
      id: `tx_${Date.now()}_demo19`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-14`,
      amount: 55,
      merchant: "No Frills - Groceries",
      category: "food",
      source: "vision",
      rawText: "Photo of receipt"
    },

    // Day 15 - Coffee
    {
      id: `tx_${Date.now()}_demo20`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`,
      amount: 6.50,
      merchant: "Starbucks - Coffee",
      category: "food",
      source: "voice",
      rawText: "Coffee run $6.50"
    },

    // Day 15 - Date night
    {
      id: `tx_${Date.now()}_demo21`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`,
      amount: 85,
      merchant: "Keg Steakhouse - Date",
      category: "fun",
      source: "manual"
    },

    // Day 16 - H&M shopping
    {
      id: `tx_${Date.now()}_demo22`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-16`,
      amount: 75,
      merchant: "H&M - New Jeans",
      category: "clothes",
      source: "manual"
    },

    // Day 17 - Tim Hortons
    {
      id: `tx_${Date.now()}_demo23`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-17`,
      amount: 4.50,
      merchant: "Tim Hortons - Coffee & Donut",
      category: "food",
      source: "voice",
      rawText: "Tim's run $4.50"
    },

    // Day 18 - Laundry
    {
      id: `tx_${Date.now()}_demo24`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-18`,
      amount: 12,
      merchant: "Laundromat",
      category: "essentials",
      source: "manual"
    },

    // Day 18 - Pizza
    {
      id: `tx_${Date.now()}_demo25`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-18`,
      amount: 16,
      merchant: "Pizza Pizza",
      category: "food",
      source: "voice",
      rawText: "Pizza for $16"
    },

    // Day 19 - Uber
    {
      id: `tx_${Date.now()}_demo26`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-19`,
      amount: 18,
      merchant: "Uber - Ride to Campus",
      category: "transport",
      source: "voice",
      rawText: "Uber $18"
    },

    // Day 20 - Groceries
    {
      id: `tx_${Date.now()}_demo27`,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-20`,
      amount: 48,
      merchant: "FreshCo - Groceries",
      category: "food",
      source: "vision",
      rawText: "Photo of receipt"
    },
  ];

  // Only include transactions up to current day to make it realistic
  const filteredTransactions = demoTransactions.filter(tx => {
    const txDay = parseInt(tx.date.split('-')[2]);
    return txDay <= currentDay;
  });

  // Calculate spent amounts
  filteredTransactions.forEach(tx => {
    demoBudget.spent[tx.category] += tx.amount;
  });

  // Save demo data
  saveBudget(demoBudget);
  saveTransactions(filteredTransactions);

  logger.log('[Demo] Demo data initialized:', {
    budget: demoBudget.total,
    transactions: filteredTransactions.length,
    totalSpent: Object.values(demoBudget.spent).reduce((sum, val) => sum + val, 0),
    remaining: demoBudget.total - Object.values(demoBudget.spent).reduce((sum, val) => sum + val, 0)
  });
}
