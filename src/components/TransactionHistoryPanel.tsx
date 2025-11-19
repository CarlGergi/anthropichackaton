import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Transaction, CategoryType } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Trash2, 
  Filter, 
  Search,
  Calendar,
  DollarSign,
  ShoppingBag,
  UtensilsCrossed,
  Car,
  Gamepad2,
  Shirt,
  Package
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TransactionHistoryPanelProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  onClose?: () => void;
}

const categoryIcons: Record<CategoryType, React.ReactNode> = {
  food: <UtensilsCrossed className="h-4 w-4" />,
  transport: <Car className="h-4 w-4" />,
  fun: <Gamepad2 className="h-4 w-4" />,
  essentials: <Package className="h-4 w-4" />,
  clothes: <Shirt className="h-4 w-4" />,
  other: <ShoppingBag className="h-4 w-4" />,
};

const categoryColors: Record<CategoryType, string> = {
  food: "bg-orange-500/10 text-orange-600 border-orange-200",
  transport: "bg-blue-500/10 text-blue-600 border-blue-200",
  fun: "bg-purple-500/10 text-purple-600 border-purple-200",
  essentials: "bg-green-500/10 text-green-600 border-green-200",
  clothes: "bg-pink-500/10 text-pink-600 border-pink-200",
  other: "bg-gray-500/10 text-gray-600 border-gray-200",
};

export function TransactionHistoryPanel({ 
  transactions, 
  onDeleteTransaction,
  onClose 
}: TransactionHistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryType | "all">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch = 
        searchQuery === "" ||
        tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.rawText?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        categoryFilter === "all" || tx.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchQuery, categoryFilter]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    filteredTransactions.forEach((tx) => {
      const date = new Date(tx.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else {
        groupKey = date.toLocaleDateString("en-US", { 
          month: "short", 
          day: "numeric",
          year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined
        });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(tx);
    });
    
    return groups;
  }, [filteredTransactions]);

  const handleDelete = (id: string) => {
    onDeleteTransaction(id);
    setDeleteId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 400 }}
        transition={{ duration: 0.3, type: "spring" }}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border-l-2 border-purple-500/30 shadow-2xl z-50 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 border-b-2 border-purple-400/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-white" />
              <h2 className="text-xl font-bold text-white">Transaction History</h2>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-white/10 bg-white/5">
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryType | "all")}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="fun">Fun</SelectItem>
                <SelectItem value="essentials">Essentials</SelectItem>
                <SelectItem value="clothes">Clothes</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.keys(groupedTransactions).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Calendar className="h-12 w-12 text-white/30 mb-4" />
              <p className="text-white/60 text-sm">
                {transactions.length === 0 
                  ? "No transactions yet. Start tracking your spending!"
                  : "No transactions match your filters."}
              </p>
            </div>
          ) : (
            Object.entries(groupedTransactions).map(([dateGroup, txs]) => (
              <div key={dateGroup} className="space-y-2">
                <h3 className="text-sm font-semibold text-white/70 px-2">
                  {dateGroup}
                </h3>
                {txs.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Category Icon */}
                            <div className={`p-2 rounded-lg ${categoryColors[tx.category]}`}>
                              {categoryIcons[tx.category]}
                            </div>

                            {/* Transaction Details */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white text-sm truncate">
                                {tx.merchant}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${categoryColors[tx.category]}`}
                                >
                                  {tx.category}
                                </Badge>
                                <span className="text-xs text-white/50">
                                  {formatDate(tx.date)}
                                </span>
                              </div>
                              {tx.rawText && (
                                <p className="text-xs text-white/60 mt-1 italic truncate">
                                  "{tx.rawText}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Amount and Delete */}
                          <div className="flex flex-col items-end gap-2">
                            <p className="text-lg font-bold text-white">
                              ${tx.amount.toFixed(2)}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(tx.id)}
                              className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer Stats */}
        <div className="border-t border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">Total Transactions:</span>
            <span className="font-bold text-white">{filteredTransactions.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-white/70">Total Amount:</span>
            <span className="font-bold text-green-400">
              ${filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This will remove this transaction from your history and update your budget. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-gradient-to-r from-red-600 to-orange-600 text-white hover:opacity-90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

