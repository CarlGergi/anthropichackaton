import { BudgetState, CategoryType } from "@/types";
import { calculateRemaining, calculateRemainingTotal, calculateDaysLeft } from "@/state/budget";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Calendar, TrendingUp } from "lucide-react";

interface BudgetPanelProps {
  budget: BudgetState;
}

const categoryIcons: Record<CategoryType, string> = {
  food: "🍔",
  transport: "🚌",
  fun: "🎉",
  essentials: "🛒",
  clothes: "👕",
  other: "📦",
};

const categoryColors: Record<CategoryType, string> = {
  food: "hsl(var(--success))",
  transport: "hsl(var(--primary))",
  fun: "hsl(var(--accent))",
  essentials: "hsl(var(--warning))",
  clothes: "hsl(var(--destructive))",
  other: "hsl(var(--muted))",
};

export default function BudgetPanel({ budget }: BudgetPanelProps) {
  const remaining = calculateRemainingTotal(budget);
  const daysLeft = calculateDaysLeft();
  const totalSpent = Object.values(budget.spent).reduce((sum, val) => sum + val, 0);
  const spentPercent = (totalSpent / budget.total) * 100;

  const categories: CategoryType[] = ["food", "transport", "fun", "essentials", "clothes", "other"];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-lg font-bold text-foreground">${remaining.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground">Days Left</p>
                <p className="text-lg font-bold text-foreground">{daysLeft}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-lg font-bold text-foreground">${budget.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Overall Spending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress 
            value={spentPercent} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>${totalSpent.toFixed(2)} spent</span>
            <span>{spentPercent.toFixed(0)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.map((category) => {
            const target = budget.total * budget.categoryTargets[category];
            const spent = budget.spent[category];
            const remaining = calculateRemaining(budget, category);
            const percent = (spent / target) * 100;
            
            return (
              <div key={category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{categoryIcons[category]}</span>
                    <span className="font-medium capitalize">{category}</span>
                  </div>
                  <span className="text-muted-foreground">
                    ${remaining.toFixed(0)} left
                  </span>
                </div>
                <Progress 
                  value={Math.min(percent, 100)} 
                  className="h-1.5"
                  style={{
                    // @ts-ignore
                    "--progress-background": categoryColors[category],
                  }}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>${spent.toFixed(2)}</span>
                  <span>${target.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
