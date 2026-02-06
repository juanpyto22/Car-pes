import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fish, Sparkles } from 'lucide-react';

const AchievementUnlockedNotification = ({ achievement, isVisible, onClose }) => {
  if (!achievement) return null;

  const achievementData = {
    first_catch: {
      name: 'Primera Captura',
      description: 'Compartiste tu primera captura',
      color: 'from-green-500 to-emerald-600',
      xp: 100
    },
    social_butterfly: {
      name: 'Mariposa Social',
      description: 'Sigue a 10 pescadores',
      color: 'from-pink-500 to-rose-600',
      xp: 150
    },
    photographer: {
      name: 'Fotógrafo',
      description: 'Sube 25 fotos de capturas',
      color: 'from-purple-500 to-violet-600',
      xp: 200
    },
    big_catch: {
      name: 'Gran Captura',
      description: 'Captura un pez de más de 5kg',
      color: 'from-yellow-500 to-orange-600',
      xp: 300
    },
    explorer: {
      name: 'Explorador',
      description: 'Visita 5 spots diferentes',
      color: 'from-blue-500 to-cyan-600',
      xp: 250
    },
    influencer: {
      name: 'Influencer',
      description: 'Consigue 100 seguidores',
      color: 'from-amber-500 to-yellow-600',
      xp: 500
    },
    streak_master: {
      name: 'Racha Master',
      description: 'Pesca 7 días seguidos',
      color: 'from-red-500 to-pink-600',
      xp: 400
    },
    legend: {
      name: 'Leyenda',
      description: 'Alcanza nivel 50',
      color: 'from-indigo-500 to-purple-600',
      xp: 1000
    }
  };

  const data = achievementData[achievement] || achievementData.first_catch;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed top-20 right-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`bg-gradient-to-br ${data.color} rounded-2xl p-6 shadow-2xl border border-white/20 max-w-xs`}
          >
            {/* Jumping Fish Animation */}
            <div className="flex justify-center mb-4">
              <motion.div
                animate={{
                  y: [0, -20, -40, -20, 0],
                  rotate: [0, -10, -20, -10, 0]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatDelay: 0.5
                }}
              >
                <Fish className="w-12 h-12 text-white drop-shadow-lg" />
              </motion.div>
            </div>

            {/* Sparkles Animation */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  initial={{
                    opacity: 0,
                    x: Math.random() * 100 - 50,
                    y: Math.random() * 100 - 50
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: Math.random() * 200 - 100,
                    y: Math.random() * 200 - 100
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 0.5
                  }}
                >
                  <Sparkles className="w-4 h-4 text-white" fill="white" />
                </motion.div>
              ))}
            </div>

            {/* Content */}
            <div className="text-center relative z-10">
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-white mb-2"
              >
                ¡Logro Desbloqueado!
              </motion.h3>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-4"
              >
                <p className="text-lg font-bold text-white">{data.name}</p>
                <p className="text-white/90 text-sm">{data.description}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-2 bg-white/20 rounded-lg px-4 py-2"
              >
                <span className="text-yellow-300 font-bold">+{data.xp} XP</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Auto-close button indicator */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: 0 }}
            transition={{ duration: 4, ease: 'linear' }}
            className={`h-1 bg-gradient-to-r ${data.color} absolute bottom-0 left-0 rounded-full`}
            onAnimationComplete={onClose}
          />
        </div>
      )}
    </AnimatePresence>
  );
};

export default AchievementUnlockedNotification;
