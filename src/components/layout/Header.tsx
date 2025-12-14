import React from 'react';
import { Menu, Globe, Sun, Moon } from 'lucide-react';
import type { HeaderProps, ThemeName } from '../../types';
import { THEMES } from '../../constants/themes';
import { useAuth } from '../../contexts/AuthContext';

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  lang,
  setLang,
  darkMode,
  setDarkMode,
  theme,
  setTheme,
  setIsSidebarOpen,
  baseClasses,
  currentTheme,
  t
}) => {
  const { userProfile } = useAuth();
  return (
    <header className={`h-16 flex items-center justify-between px-6 z-10 ${baseClasses.header}`}>
      <div className="flex items-center">
        <button 
          onClick={() => setIsSidebarOpen(true)} 
          className={`md:hidden mr-4 ${baseClasses.textSub}`}
        >
          <Menu size={24} />
        </button>
        <h1 className={`text-xl font-bold hidden md:block ${baseClasses.textMain}`}>
          {t(activeTab)}
        </h1>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Language Toggle */}
        <button 
          onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')} 
          className={`flex items-center px-2 py-1.5 rounded-md text-sm font-bold ${baseClasses.textMain} ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}
        >
          <Globe size={16} className="mr-1"/> {lang === 'tr' ? 'EN' : 'TR'}
        </button>
        
        {/* Dark Mode & Theme Selector */}
        <div className={`flex items-center rounded-lg p-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className={`p-1.5 rounded-md transition-all mr-2 ${darkMode ? 'bg-slate-600 text-yellow-400' : 'bg-white text-slate-600 shadow-sm'}`}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <div className="flex gap-1 p-1">
            {(Object.keys(THEMES) as ThemeName[]).map(themeKey => (
              <button 
                key={themeKey} 
                onClick={() => setTheme(themeKey)} 
                className={`w-4 h-4 rounded-full ${THEMES[themeKey].primary} ${theme === themeKey ? 'scale-125 ring-2 ring-slate-400' : 'opacity-50'}`} 
              />
            ))}
          </div>
        </div>
        
        {/* User Role Badge */}
        <div 
          className={`flex items-center px-4 py-2 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'}`}
        >
          <div className="flex items-center">
            <span className={`text-xs font-semibold ${baseClasses.textMain}`}>
              {userProfile?.role === 'admin' ? t('manager') : t('resident')}
            </span>
            {userProfile?.role === 'admin' && (
              <span className={`ml-2 px-2 py-0.5 text-xs rounded ${currentTheme.primary} text-white`}>
                Admin
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
