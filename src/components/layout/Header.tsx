import React from 'react';
import { Menu, Globe, Sun, Moon } from 'lucide-react';
import type { HeaderProps, ThemeName, Language } from '../../types';
import { THEMES } from '../../constants/themes';
import { LANGUAGES } from '../../constants/translations';
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
    <header className={`h-16 flex items-center justify-between px-3 sm:px-6 z-10 shrink-0 ${baseClasses.header}`}>
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
      
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language Selector - 3 dil olduğu için aç/kapa yerine liste */}
        <div className={`flex items-center rounded-md ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <Globe size={16} className={`ml-2 ${baseClasses.textSub}`} />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Language)}
            aria-label={t('language')}
            className={`bg-transparent px-1.5 py-1.5 text-sm font-bold outline-none cursor-pointer ${baseClasses.textMain}`}
          >
            {LANGUAGES.map(({ code, label }) => (
              <option key={code} value={code} className={darkMode ? 'bg-slate-800' : 'bg-white'}>
                {label}
              </option>
            ))}
          </select>
        </div>
        
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
