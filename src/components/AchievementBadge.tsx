import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Zap, Heart, Target, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const achievements: Record<string, Achievement> = {
  ramen_master: {
    id: 'ramen_master',
    title: 'Ramen Master 🍜',
    description: 'Spent under $20 on food this week',
    icon: <Trophy className="h-6 w-6" />,
    color: 'from-orange-500 to-red-500',
  },
  no_cap_saver: {
    id: 'no_cap_saver',
    title: 'No Cap Saver 💰',
    description: 'Saved 50% of your budget',
    icon: <Star className="h-6 w-6" />,
    color: 'from-green-500 to-emerald-500',
  },
  date_night_pro: {
    id: 'date_night_pro',
    title: 'Date Night Pro 💜',
    description: 'Found 5 cheap date spots',
    icon: <Heart className="h-6 w-6" />,
    color: 'from-pink-500 to-rose-500',
  },
  finals_survivor: {
    id: 'finals_survivor',
    title: 'Finals Survivor 📚',
    description: 'Made it through the month!',
    icon: <Zap className="h-6 w-6" />,
    color: 'from-purple-500 to-violet-500',
  },
  budget_king: {
    id: 'budget_king',
    title: 'Budget King 👑',
    description: 'Stayed under budget all month',
    icon: <Target className="h-6 w-6" />,
    color: 'from-yellow-500 to-amber-500',
  },
  trend_setter: {
    id: 'trend_setter',
    title: 'Trend Setter 📈',
    description: 'Spending decreased this month',
    icon: <TrendingUp className="h-6 w-6" />,
    color: 'from-blue-500 to-cyan-500',
  },
};

interface AchievementBadgeProps {
  achievementId: string;
  onClose?: () => void;
}

export function AchievementBadge({ achievementId, onClose }: AchievementBadgeProps) {
  const achievement = achievements[achievementId];
  if (!achievement) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5, y: -50 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
      >
        <Card className={`bg-gradient-to-r ${achievement.color} border-2 border-white/30 shadow-2xl p-4 min-w-[300px]`}>
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: 2 }}
              className="text-white"
            >
              {achievement.icon}
            </motion.div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-lg">{achievement.title}</h3>
              <p className="text-white/90 text-sm">{achievement.description}</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white text-xl"
              >
                ×
              </button>
            )}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}


