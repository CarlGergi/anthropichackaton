import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ConfettiCelebrationProps {
  trigger: boolean;
  type?: 'success' | 'celebration' | 'achievement';
}

const colors = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb7185'];

export function ConfettiCelebration({ trigger, type = 'celebration' }: ConfettiCelebrationProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; color: string; rotation: number }>>([]);

  useEffect(() => {
    if (trigger) {
      // Create 50 confetti particles
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
      }));
      setParticles(newParticles);

      // Clear after animation
      setTimeout(() => setParticles([]), 3000);
    }
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            backgroundColor: particle.color,
            left: `${particle.x}%`,
            top: '-10px',
          }}
          initial={{
            y: 0,
            rotate: particle.rotation,
            opacity: 1,
          }}
          animate={{
            y: window.innerHeight + 100,
            rotate: particle.rotation + 360 * (Math.random() > 0.5 ? 1 : -1),
            opacity: [1, 1, 0],
            x: (Math.random() - 0.5) * 200,
          }}
          transition={{
            duration: 2 + Math.random(),
            ease: 'easeOut',
            delay: Math.random() * 0.5,
          }}
        />
      ))}
    </div>
  );
}


