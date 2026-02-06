import React from 'react';
import { useDemo } from '@/contexts/DemoContext';
import { TestTube2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const DemoBanner = () => {
  const { isDemoMode, disableDemoMode } = useDemo();

  if (!isDemoMode) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white py-2 px-4 shadow-lg z-50 relative"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TestTube2 className="w-5 h-5" />
          <div>
            <span className="font-semibold">🎭 Modo Demo Activo</span>
            <span className="ml-2 text-sm opacity-90">
              Estás viendo datos simulados - Los cambios no se guardan
            </span>
          </div>
        </div>
        
        <Button
          onClick={disableDemoMode}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default DemoBanner;