import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, BarChart3, Lightbulb, X } from "lucide-react";
import { ClaudeResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SpendingAnalysisPanelProps {
  analysis: ClaudeResponse["analysis"];
  onClose?: () => void;
}

const categoryColors: Record<string, string> = {
  food: "bg-orange-500/10 text-orange-600 border-orange-200",
  transport: "bg-blue-500/10 text-blue-600 border-blue-200",
  fun: "bg-purple-500/10 text-purple-600 border-purple-200",
  essentials: "bg-green-500/10 text-green-600 border-green-200",
  clothes: "bg-pink-500/10 text-pink-600 border-pink-200",
  other: "bg-gray-500/10 text-gray-600 border-gray-200",
};

const trendIcons = {
  increasing: <TrendingUp className="h-4 w-4 text-red-500" />,
  decreasing: <TrendingDown className="h-4 w-4 text-green-500" />,
  stable: <Minus className="h-4 w-4 text-blue-500" />,
};

const trendColors = {
  increasing: "text-red-600 bg-red-50 border-red-200",
  decreasing: "text-green-600 bg-green-50 border-green-200",
  stable: "text-blue-600 bg-blue-50 border-blue-200",
};

export function SpendingAnalysisPanel({ analysis, onClose }: SpendingAnalysisPanelProps) {
  if (!analysis) {
    return null;
  }

  // Safety checks to prevent crashes
  if (!analysis.top_category || !analysis.insights || analysis.insights.length === 0) {
    console.warn('[SpendingAnalysisPanel] Invalid analysis data:', analysis);
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 30, scale: 0.95 }}
      transition={{ duration: 0.5, type: "spring", bounce: 0.25 }}
      className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 w-80 md:w-96"
    >
      {/* Speech bubble pointer pointing left */}
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-r-[15px] border-r-white drop-shadow-lg"></div>

      <Card className="relative overflow-hidden border-2 border-blue-300 bg-white shadow-2xl">
        {/* Header */}
        <div className="relative border-b-2 border-blue-200 bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
              >
                <BarChart3 className="h-5 w-5 text-white" />
              </motion.div>
              <h3 className="font-bold text-base text-white">Your Spending Snapshot</h3>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Analysis Content */}
        <div className="p-4 space-y-4">
          {/* Top Category */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Top Category</p>
                <Badge
                  variant="outline"
                  className={`mt-1 ${categoryColors[analysis.top_category] || categoryColors.other}`}
                >
                  {analysis.top_category}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600 font-medium">Spent</p>
                <p className="text-2xl font-bold text-blue-700">
                  ${analysis.top_amount.toFixed(0)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Daily Average & Trend */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200"
            >
              <p className="text-xs text-gray-600 font-medium mb-1">Daily Avg</p>
              <p className="text-xl font-bold text-purple-700">
                ${analysis.daily_avg.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">per day</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={`rounded-lg p-3 border ${trendColors[analysis.trend]}`}
            >
              <p className="text-xs font-medium mb-1">Trend</p>
              <div className="flex items-center gap-1">
                {trendIcons[analysis.trend]}
                <p className="text-sm font-bold capitalize">
                  {analysis.trend}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Insights */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <p className="text-xs font-bold text-gray-700">Insights</p>
            </div>
            {analysis.insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                </div>
                <p className="text-sm text-gray-700 leading-snug">{insight}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-2">
          <p className="text-center text-xs text-gray-600">
            Keep it up! I'm here to help you stay on track
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
