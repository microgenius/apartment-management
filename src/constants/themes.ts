// ==========================================
// TEMA TANIMLARI (THEMES)
// ==========================================

import type { Theme } from '../types';

export const THEMES: Record<string, Theme> = {
  blue: { 
    name: 'Okyanus', 
    primary: 'bg-blue-600', 
    hover: 'hover:bg-blue-700', 
    text: 'text-blue-600', 
    border: 'border-blue-200', 
    gradient: 'from-blue-500 to-blue-600',
    ring: 'focus:ring-blue-500',
    light: 'bg-blue-50'
  },
  purple: { 
    name: 'Lavanta', 
    primary: 'bg-purple-600', 
    hover: 'hover:bg-purple-700', 
    text: 'text-purple-600', 
    border: 'border-purple-200', 
    gradient: 'from-purple-500 to-purple-600',
    ring: 'focus:ring-purple-500',
    light: 'bg-purple-50'
  },
  green: { 
    name: 'Doğa', 
    primary: 'bg-emerald-600', 
    hover: 'hover:bg-emerald-700', 
    text: 'text-emerald-600', 
    border: 'border-emerald-200', 
    gradient: 'from-emerald-500 to-emerald-600',
    ring: 'focus:ring-emerald-500',
    light: 'bg-emerald-50'
  },
  orange: { 
    name: 'Gün Batımı', 
    primary: 'bg-orange-600', 
    hover: 'hover:bg-orange-700', 
    text: 'text-orange-600', 
    border: 'border-orange-200', 
    gradient: 'from-orange-500 to-orange-600',
    ring: 'focus:ring-orange-500',
    light: 'bg-orange-50'
  },
};
