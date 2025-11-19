import { motion } from "framer-motion";
import { Sparkles, DollarSign, Tag, X, MapPin, Plus, ExternalLink } from "lucide-react";
import { ClaudeResponse } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import venuesData from "@/data/venues.json";
import { Venue } from "@/types";

interface RecommendationsPanelProps {
  recommendations: ClaudeResponse["recs"];
  onClose?: () => void;
  onAddExpense?: (name: string, amount: number, category: string) => void;
}

const categoryColors: Record<string, string> = {
  food: "bg-orange-500/10 text-orange-600 border-orange-200",
  transport: "bg-blue-500/10 text-blue-600 border-blue-200",
  fun: "bg-purple-500/10 text-purple-600 border-purple-200",
  essentials: "bg-green-500/10 text-green-600 border-green-200",
  clothes: "bg-pink-500/10 text-pink-600 border-pink-200",
  other: "bg-gray-500/10 text-gray-600 border-gray-200",
};

export function RecommendationsPanel({ recommendations, onClose, onAddExpense }: RecommendationsPanelProps) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -30, scale: 0.95 }}
      transition={{ duration: 0.5, type: "spring", bounce: 0.25 }}
      className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 w-72 md:w-80"
    >
      {/* Speech bubble pointer */}
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[15px] border-l-white drop-shadow-lg"></div>

      <Card className="relative overflow-hidden border-2 border-purple-300 bg-white shadow-2xl">
        {/* Header */}
        <div className="relative border-b-2 border-purple-200 bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 15, -15, 15, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="h-5 w-5 text-yellow-300" />
              </motion.div>
              <h3 className="font-bold text-base text-white">My Picks for You!</h3>
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

        {/* Recommendations as Bullet Points */}
        <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
          {recommendations.map((rec, index) => {
            const venueDetails = (venuesData as Venue[]).find(v => v.name === rec.name);
            
            return (
              <motion.div
                key={`${rec.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 }}
                className="group"
              >
                <Card className="p-3 hover:bg-purple-50 transition-colors border-purple-200/50">
                  <div className="flex items-start gap-3">
                    {/* Bullet point */}
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-purple-700 transition-colors">
                            {rec.name}
                          </h4>
                          {venueDetails?.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {venueDetails.description}
                            </p>
                          )}
                          {venueDetails?.location && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <MapPin className="h-3 w-3" />
                              <span>{venueDetails.location}</span>
                            </div>
                          )}
                        </div>

                        {/* Price badge */}
                        <div className="flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-green-700 flex-shrink-0">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-bold text-xs">
                            {rec.est_cost.toFixed(0)}
                          </span>
                        </div>
                      </div>

                      {/* Category badge and actions */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${categoryColors[rec.category] || categoryColors.other}`}
                        >
                          <Tag className="mr-1 h-2.5 w-2.5" />
                          {rec.category}
                        </Badge>

                        <div className="flex items-center gap-1">
                          {onAddExpense && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                onAddExpense(rec.name, rec.est_cost, rec.category);
                                toast.success(`Added ${rec.name} as expense!`);
                              }}
                              className="h-7 px-2 text-xs hover:bg-purple-100"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          )}
                          {venueDetails?.location && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const query = encodeURIComponent(`${rec.name} ${venueDetails.location}`);
                                window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                              }}
                              className="h-7 px-2 text-xs hover:bg-purple-100"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-2">
          <p className="text-center text-xs text-gray-600">
            💡 Just ask me about any of these!
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
