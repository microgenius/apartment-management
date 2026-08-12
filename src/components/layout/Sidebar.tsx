import React from 'react';
import {
  Home,
  Wallet,
  Info,
  MessageSquare,
  User,
  LogOut,
  KeyRound,
  PiggyBank,
  X,
  Building,
  Settings,
  Users
} from 'lucide-react';
import type { SidebarProps } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { canManageOthers } from '../../utils/permissions';

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen, 
  baseClasses, 
  currentTheme, 
  t,
  onLogoutClick,
  onPasswordClick
}) => {
  const { userProfile, user } = useAuth();

  // Aynı state iki işi görüyor: masaüstünde daralt/genişlet, mobilde çekmece.
  // Bu yüzden "kapat" davranışı yalnızca mobilde uygulanmalı, yoksa
  // masaüstünde her menü tıklamasında menü daralırdı.
  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
  const closeOnMobile = () => { if (isMobile()) setIsSidebarOpen(false); };

  const selectTab = (tab: string) => {
    setActiveTab(tab);
    closeOnMobile();
  };

  return (
    <>
    {/* Menü dışına dokununca kapansın. Yalnızca mobilde ve menü açıkken var;
        masaüstünde menü zaten sayfa akışının parçası. */}
    {isSidebarOpen && (
      <button
        type="button"
        aria-label={t('close')}
        onClick={() => setIsSidebarOpen(false)}
        className="fixed inset-0 z-10 bg-black/50 md:hidden"
      />
    )}
    <aside className={`fixed md:relative z-20 h-full w-64 shadow-xl transition-transform duration-300 ease-in-out ${baseClasses.sidebar} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20 lg:w-64'}`}>
      <div className={`p-6 flex items-center justify-between border-b ${baseClasses.border}`}>
        <div className={`flex items-center ${currentTheme.text} font-bold text-xl overflow-hidden whitespace-nowrap`}>
          <Building className="mr-2 flex-shrink-0" />
          <span className={`${!isSidebarOpen && 'md:hidden lg:inline'}`}>{t('apartment_name')}</span>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400">
          <X size={24} />
        </button>
      </div>
      
      <nav className="p-4 mt-4">
        {['dashboard', 'financials', 'finance', 'community', 'requests', 'info', ...(canManageOthers(userProfile) ? ['settings'] : [])].map(tab => (
          <button 
            key={tab} 
            onClick={() => selectTab(tab)}
            className={`flex items-center w-full p-3 mb-2 rounded-lg transition-colors ${activeTab === tab ? `${currentTheme.primary} text-white` : baseClasses.textSub + ' hover:' + baseClasses.hover}`}
          >
            {tab === 'dashboard' && <Home size={20} className="mr-3" />}
            {tab === 'financials' && <Wallet size={20} className="mr-3" />}
            {tab === 'community' && <Users size={20} className="mr-3" />}
            {tab === 'requests' && <MessageSquare size={20} className="mr-3" />}
            {tab === 'info' && <Info size={20} className="mr-3" />}
            {tab === 'finance' && <PiggyBank size={20} className="mr-3" />}
            {tab === 'settings' && <Settings size={20} className="mr-3" />}
            <span className="font-medium">{t(tab)}</span>
          </button>
        ))}
      </nav>
      
      <div className={`absolute bottom-0 w-full p-4 border-t ${baseClasses.border}`}>
        <div className={`flex items-center p-2 ${baseClasses.textSub}`}>
          <User size={20} className="mr-3" />
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate">{userProfile?.full_name || user?.email || 'Kullanıcı'}</p>
            {userProfile?.apartment_info && (
              <p className="text-xs opacity-70">{userProfile.apartment_info}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => { onPasswordClick(); closeOnMobile(); }}
          className={`flex items-center w-full p-2 mt-2 rounded text-sm font-medium transition-colors ${baseClasses.textSub} ${baseClasses.hover}`}
        >
          <KeyRound size={18} className="mr-3" /> {t('change_password')}
        </button>
        <button
          onClick={() => { onLogoutClick(); closeOnMobile(); }}
          className="flex items-center w-full p-2 mt-2 text-red-500 hover:bg-red-500/10 rounded text-sm font-medium transition-colors"
        >
          <LogOut size={18} className="mr-3" /> {t('logout')}
        </button>
      </div>
    </aside>
    </>
  );
};