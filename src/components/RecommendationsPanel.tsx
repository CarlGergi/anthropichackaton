import { motion } from "framer-motion";
import { Sparkles, DollarSign, Tag, X } from "lucide-react";
import { ClaudeResponse } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface RecommendationsPanelProps {
  recommendations: ClaudeResponse["recs"];
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

export function RecommendationsPanel({ recommendations, onClose }: RecommendationsPanelProps) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
      className="fixed bottom-24 right-6 z-40 max-w-md"
    >
        <Card className="relative overflow-hidden border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-blue-50 shadow-2xl backdrop-blur-sm">
          {/* Header */}
          <div className="relative border-b border-purple-200 bg-gradient-to-r from-purple-500 to-blue-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 10, 0] }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                >
                  <Sparkles className="h-5 w-5" />
                </motion.div>
                <h3 className="font-bold text-lg">Finora's Picks</h3>
              </div>
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-1 text-sm text-purple-100">
              Here are some budget-friendly options for you
            </p>
          </div>

          {/* Recommendations List */}
          <div className="max-h-96 space-y-3 overflow-y-auto p-4">
            {recommendations.map((rec, index) => (
              <motion.div
                key={`${rec.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="group relative overflow-hidden border border-purple-100 bg-white p-3 transition-all hover:border-purple-300 hover:shadow-lg">
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 transition-opacity group-hover:opacity-100" />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold text-gray-900 leading-tight">
                          {rec.name}
                        </h4>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${categoryColors[rec.category] || categoryColors.other}`}
                          >
                            <Tag className="mr-1 h-3 w-3" />
                            {rec.category}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-green-700">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-bold text-sm">
                            {rec.est_cost.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="border-t border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-3">
            <p className="text-center text-xs text-gray-600">
              💡 Ask Finora about any of these options!
            </p>
          </div>
        </Card>
      </motion.div>
  );
}
