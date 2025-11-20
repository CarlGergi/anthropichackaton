import { motion } from "framer-motion";
import { BudgetState, CategoryType } from "@/types";
import { calculateRemaining } from "@/state/budget";
import { Card } from "@/components/ui/card";
import { 
  UtensilsCrossed, 
  Car, 
  Gamepad2, 
  Package, 
  Shirt, 
  ShoppingBag,
  AlertCircle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BudgetProgressIndicatorsProps {
  budget: BudgetState;
  onCategoryClick?: (category: CategoryType) => void;
}

const categoryConfig: Record<CategoryType, { icon: React.ReactNode; label: string; color: string }> = {
  food: {
    icon: <UtensilsCrossed className="h-5 w-5" />,
    label: "Food",
    color: "text-orange-500"
  },
  transport: {
    icon: <Car className="h-5 w-5" />,
    label: "Transport",
    color: "text-blue-500"
  },
  fun: {
    icon: <Gamepad2 className="h-5 w-5" />,
    label: "Fun",
    color: "text-purple-500"
  },
  essentials: {
    icon: <Package className="h-5 w-5" />,
    label: "Essentials",
    color: "text-green-500"
  },
  clothes: {
    icon: <Shirt className="h-5 w-5" />,
    label: "Clothes",
    color: "text-pink-500"
  },
  other: {
    icon: <ShoppingBag className="h-5 w-5" />,
    label: "Other",
    color: "text-gray-500"
  },
};

export function BudgetProgressIndicators({ budget, onCategoryClick }: BudgetProgressIndicatorsProps) {
  if (budget.total === 0) {
    return null;
  }

  const categories: CategoryType[] = ["food", "transport", "fun", "essentials", "clothes", "other"];

  const getCategoryProgress = (category: CategoryType) => {
    const target = budget.total * budget.categoryTargets[category];
    const spent = budget.spent[category];
    const remaining = calculateRemaining(budget, category);
    const percentage = target > 0 ? Math.min(100, (spent / target) * 100) : 0;
    
    return {
      target,
      spent,
      remaining,
      percentage,
      isOver: remaining < 0
    };
  };

  const getProgressColor = (percentage: number, isOver: boolean) => {
    if (isOver) return "text-red-500";
    if (percentage >= 90) return "text-orange-500";
    if (percentage >= 70) return "text-yellow-500";
    return "text-green-500";
  };

  const getProgressBgColor = (percentage: number, isOver: boolean) => {
    if (isOver) return "stroke-red-500";
    if (percentage >= 90) return "stroke-orange-500";
    if (percentage >= 70) return "stroke-yellow-500";
    return "stroke-green-500";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-6xl px-4 mb-6"
    >
      <h3 className="text-lg font-semibold text-white/90 mb-4 text-center">
        Budget Progress by Category
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category, index) => {
          const progress = getCategoryProgress(category);
          const config = categoryConfig[category];
          const circumference = 2 * Math.PI * 40; // radius = 40
          const offset = circumference - (progress.percentage / 100) * circumference;

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card
                      className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer p-4"
                      onClick={() => onCategoryClick?.(category)}
                    >
                      <div className="flex flex-col items-center">
                        {/* Category Icon */}
                        <div className={`mb-3 ${config.color}`}>
                          {config.icon}
                        </div>

                        {/* Circular Progress */}
                        <div className="relative w-24 h-24 mb-2">
                          <svg className="transform -rotate-90 w-24 h-24">
                            {/* Background circle */}
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              className="text-white/10"
                            />
                            {/* Progress circle */}
                            <motion.circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              strokeLinecap="round"
                              className={getProgressBgColor(progress.percentage, progress.isOver)}
                              initial={{ strokeDashoffset: circumference }}
                              animate={{ strokeDashoffset: offset }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                              strokeDasharray={circumference}
                            />
                          </svg>
                          
                          {/* Percentage text */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-sm font-bold ${getProgressColor(progress.percentage, progress.isOver)}`}>
                              {Math.round(progress.percentage)}%
                            </span>
                          </div>
                        </div>

                        {/* Category Label */}
                        <p className="text-xs font-medium text-white/70 mb-1">
                          {config.label}
                        </p>

                        {/* Amount */}
                        <div className="text-center">
                          <p className="text-xs text-white/50">
                            ${progress.spent.toFixed(0)} / ${progress.target.toFixed(0)}
                          </p>
                          {progress.isOver && (
                            <div className="flex items-center gap-1 mt-1 text-red-400">
                              <AlertCircle className="h-3 w-3" />
                              <span className="text-xs">Over</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 border-gray-700 text-white">
                    <div className="space-y-1">
                      <p className="font-semibold">{config.label}</p>
                      <p className="text-xs">Spent: ${progress.spent.toFixed(2)}</p>
                      <p className="text-xs">Target: ${progress.target.toFixed(2)}</p>
                      <p className="text-xs">
                        {progress.isOver 
                          ? `Over by $${Math.abs(progress.remaining).toFixed(2)}`
                          : `Remaining: $${progress.remaining.toFixed(2)}`
                        }
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}


