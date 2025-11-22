import { motion } from "framer-motion";
import { BudgetState, Transaction, CategoryType } from "@/types";
import { calculateRemainingTotal, calculateDaysLeft } from "@/state/budget";
import { Card } from "@/components/ui/card";
import { X, Download, Share2 } from "lucide-react";
import { toast } from "sonner";

interface SpendingReportPanelProps {
  budget: BudgetState;
  transactions: Transaction[];
  onClose: () => void;
}

export function SpendingReportPanel({ budget, transactions, onClose }: SpendingReportPanelProps) {
  const totalSpent = Object.values(budget.spent).reduce((sum, val) => sum + val, 0);
  const remaining = calculateRemainingTotal(budget);
  const daysLeft = calculateDaysLeft();

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate spending by category
  const categorySpending = Object.entries(budget.spent).map(([category, amount]) => ({
    category: category as CategoryType,
    amount,
    percentage: budget.total > 0 ? (amount / budget.total) * 100 : 0,
    target: budget.total * budget.categoryTargets[category as CategoryType]
  })).filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount);

  // Get recent transactions
  const recentTransactions = transactions.slice(0, 10);

  // Generate insights
  const generateInsights = () => {
    const insights = [];
    const percentageSpent = budget.total > 0 ? (totalSpent / budget.total) * 100 : 0;

    if (percentageSpent < 50) {
      insights.push("You're doing GREAT! Less than half your budget spent - that's some elite self-control bestie! 🎉");
    } else if (percentageSpent < 75) {
      insights.push("Looking good! You're on track with your spending. Keep it up! 💪");
    } else if (percentageSpent < 90) {
      insights.push("Getting close to your limit! Time to be extra careful with spending. You got this! ⚠️");
    } else {
      insights.push("Okay bestie, we're in the danger zone! Let's lock in and make it to the end of the month! 🚨");
    }

    const topCategory = categorySpending[0];
    if (topCategory) {
      insights.push(`Most of your money went to ${topCategory.category} ($${topCategory.amount.toFixed(0)}) - that's ${topCategory.percentage.toFixed(0)}% of your budget!`);
    }

    if (daysLeft > 0 && remaining > 0) {
      const dailyBudget = remaining / daysLeft;
      insights.push(`You've got $${remaining.toFixed(0)} left for ${daysLeft} days - that's about $${dailyBudget.toFixed(0)}/day to make it work!`);
    }

    return insights;
  };

  const insights = generateInsights();

  const handleDownload = () => {
    const reportContent = generateTextReport();
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finora-spending-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded! Share it with your parents 📊');
  };

  const handleShare = async () => {
    const reportContent = generateTextReport();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Spending Report from Finora',
          text: reportContent,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        // User cancelled or error occurred
        handleDownload(); // Fallback to download
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(reportContent);
      toast.success('Report copied to clipboard! Paste it anywhere to share 📋');
    }
  };

  const generateTextReport = () => {
    let report = '';
    report += '═══════════════════════════════════════════\n';
    report += '         FINORA SPENDING REPORT 💜\n';
    report += '    Your AI Budget Bestie\'s Analysis\n';
    report += '═══════════════════════════════════════════\n\n';

    report += `📅 Report Period: ${currentMonth}\n`;
    report += `📆 Generated: ${today}\n\n`;

    report += '───────────────────────────────────────────\n';
    report += '              BUDGET OVERVIEW\n';
    report += '───────────────────────────────────────────\n\n';

    report += `💰 Total Budget:        $${budget.total.toFixed(2)}\n`;
    report += `💸 Total Spent:         $${totalSpent.toFixed(2)}\n`;
    report += `💵 Remaining:           $${remaining.toFixed(2)}\n`;
    report += `📊 Spent:               ${budget.total > 0 ? ((totalSpent / budget.total) * 100).toFixed(1) : 0}%\n`;
    report += `📅 Days Left:           ${daysLeft} days\n\n`;

    if (categorySpending.length > 0) {
      report += '───────────────────────────────────────────\n';
      report += '          SPENDING BY CATEGORY\n';
      report += '───────────────────────────────────────────\n\n';

      categorySpending.forEach(({ category, amount, percentage, target }) => {
        const emoji = getCategoryEmoji(category);
        const status = amount > target ? '⚠️ OVER' : '✅ OK';
        report += `${emoji} ${category.toUpperCase()}\n`;
        report += `   Spent: $${amount.toFixed(2)} / $${target.toFixed(2)}\n`;
        report += `   ${percentage.toFixed(1)}% of budget | ${status}\n\n`;
      });
    }

    report += '───────────────────────────────────────────\n';
    report += '            FINORA\'S INSIGHTS\n';
    report += '───────────────────────────────────────────\n\n';

    insights.forEach((insight, index) => {
      report += `${index + 1}. ${insight}\n\n`;
    });

    if (recentTransactions.length > 0) {
      report += '───────────────────────────────────────────\n';
      report += '         RECENT TRANSACTIONS\n';
      report += '───────────────────────────────────────────\n\n';

      recentTransactions.forEach(tx => {
        const emoji = getCategoryEmoji(tx.category);
        report += `${emoji} $${tx.amount.toFixed(2)} - ${tx.merchant}\n`;
        report += `   ${tx.date} | ${tx.category}\n\n`;
      });
    }

    report += '───────────────────────────────────────────\n';
    report += '   Generated by Finora - Your AI Budget Bestie\n';
    report += '   Making adulting kinda fun, one dollar at a time 💜\n';
    report += '═══════════════════════════════════════════\n';

    return report;
  };

  const getCategoryEmoji = (category: CategoryType): string => {
    const emojis: Record<CategoryType, string> = {
      food: '🍔',
      transport: '🚗',
      fun: '🎮',
      essentials: '📦',
      clothes: '👕',
      other: '🛍️'
    };
    return emojis[category] || '💰';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 border-2 border-purple-400/50 backdrop-blur-xl shadow-2xl">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  📊 Your Spending Report
                </h2>
                <p className="text-purple-200 text-sm">
                  {currentMonth} • Generated {today}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Budget Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-white/10 border-white/20 p-4">
                <p className="text-purple-200 text-sm mb-1">Total Budget</p>
                <p className="text-3xl font-bold text-white">${budget.total.toFixed(0)}</p>
              </Card>
              <Card className="bg-white/10 border-white/20 p-4">
                <p className="text-purple-200 text-sm mb-1">Total Spent</p>
                <p className="text-3xl font-bold text-orange-300">${totalSpent.toFixed(0)}</p>
              </Card>
              <Card className="bg-white/10 border-white/20 p-4">
                <p className="text-purple-200 text-sm mb-1">Remaining</p>
                <p className={`text-3xl font-bold ${remaining < 0 ? 'text-red-300' : 'text-green-300'}`}>
                  ${remaining.toFixed(0)}
                </p>
              </Card>
            </div>

            {/* Finora's Insights */}
            <Card className="bg-white/10 border-white/20 p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                💜 Finora's Insights
              </h3>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <p key={index} className="text-purple-100 leading-relaxed">
                    {index + 1}. {insight}
                  </p>
                ))}
              </div>
            </Card>

            {/* Spending by Category */}
            {categorySpending.length > 0 && (
              <Card className="bg-white/10 border-white/20 p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  📊 Spending by Category
                </h3>
                <div className="space-y-4">
                  {categorySpending.map(({ category, amount, percentage, target }) => (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium capitalize flex items-center gap-2">
                          {getCategoryEmoji(category)} {category}
                        </span>
                        <span className="text-purple-200">
                          ${amount.toFixed(0)} / ${target.toFixed(0)}
                        </span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            amount > target ? 'bg-red-400' : 'bg-green-400'
                          }`}
                          style={{ width: `${Math.min(100, (amount / target) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-purple-200 mt-1">
                        {percentage.toFixed(1)}% of total budget
                        {amount > target && ' • ⚠️ Over budget!'}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recent Transactions */}
            {recentTransactions.length > 0 && (
              <Card className="bg-white/10 border-white/20 p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  📝 Recent Transactions
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCategoryEmoji(tx.category)}</span>
                        <div>
                          <p className="text-white font-medium">{tx.merchant}</p>
                          <p className="text-xs text-purple-200">{tx.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">${tx.amount.toFixed(2)}</p>
                        <p className="text-xs text-purple-200 capitalize">{tx.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <motion.button
                onClick={handleShare}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600
                  text-white font-bold text-lg
                  hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]
                  transition-all duration-300
                  border border-white/20 flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                Share Report
              </motion.button>
              <motion.button
                onClick={handleDownload}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600
                  text-white font-bold text-lg
                  hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]
                  transition-all duration-300
                  border border-white/20 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Report
              </motion.button>
            </div>

            <p className="text-center text-purple-200 text-sm mt-4">
              Share this report with your parents, roommates, or anyone who needs to see the receipts! 💜
            </p>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
