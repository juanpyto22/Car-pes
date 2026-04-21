import React, { useEffect, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { COLOR_THEMES, applyColorTheme, getStoredColorTheme, resolveColorTheme } from '@/lib/colorTheme';

const ColorThemePicker = ({ mode = 'dropdown', className = '' }) => {
  const [activeTheme, setActiveTheme] = useState(getStoredColorTheme());

  useEffect(() => {
    const syncTheme = (event) => {
      if (typeof event?.detail === 'string') {
        setActiveTheme(event.detail);
        return;
      }

      setActiveTheme(getStoredColorTheme());
    };

    window.addEventListener('carpes-theme-changed', syncTheme);
    return () => window.removeEventListener('carpes-theme-changed', syncTheme);
  }, []);

  const handleSelect = (themeId) => {
    const theme = applyColorTheme(themeId);
    setActiveTheme(theme.id);
  };

  const activeThemeData = resolveColorTheme(activeTheme);

  if (mode === 'grid') {
    return (
      <div className={className}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLOR_THEMES.map((theme) => {
            const isActive = theme.id === activeTheme;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelect(theme.id)}
                aria-pressed={isActive}
                className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200 ${
                  isActive
                    ? 'border-white/25 bg-white/10 shadow-lg shadow-black/20'
                    : 'border-white/10 bg-slate-800/30 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <div
                  className={`mb-3 h-10 w-10 rounded-xl bg-gradient-to-br ${theme.chipClass} shadow-lg shadow-black/20`}
                  style={{ boxShadow: `0 12px 30px rgb(${theme.rgb} / 0.22)` }}
                />
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{theme.label}</p>
                    <p className="text-[11px] text-slate-300">{theme.description}</p>
                  </div>
                  {isActive && <Check className="h-4 w-4 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Elige un color y se aplicará al tema, botones y detalles de la interfaz.
        </p>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative ml-1 h-10 w-10 rounded-full border border-white/10 bg-white/5 text-sky-100 hover:bg-white/10"
          title={`Tema actual: ${activeThemeData.label}`}
        >
          <Palette className="h-4 w-4" />
          <span
            className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-slate-950 shadow-sm"
            style={{ backgroundColor: `rgb(${activeThemeData.rgb})` }}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl border border-white/10 bg-slate-950/95 p-2 text-white backdrop-blur-2xl shadow-2xl shadow-black/40">
        <div className="px-2 py-1.5">
          <p className="text-sm font-semibold text-white">Paleta de color</p>
          <p className="text-xs text-slate-400">Cambia el color principal de la app</p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-1">
          {COLOR_THEMES.map((theme) => {
            const isActive = theme.id === activeTheme;

            return (
              <DropdownMenuItem
                key={theme.id}
                onSelect={(event) => {
                  event.preventDefault();
                  handleSelect(theme.id);
                }}
                className={`flex h-auto cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus:bg-white/8 ${
                  isActive ? 'bg-white/8' : ''
                }`}
              >
                <span
                  className={`h-9 w-9 rounded-xl bg-gradient-to-br ${theme.chipClass} ring-1 ring-white/10`}
                  style={{ boxShadow: `0 10px 24px rgb(${theme.rgb} / 0.25)` }}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center justify-between gap-2 text-sm font-medium text-white">
                    {theme.label}
                    {isActive && <Check className="h-4 w-4 text-cyan-300" />}
                  </span>
                  <span className="text-[11px] text-slate-400">{theme.description}</span>
                </span>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColorThemePicker;