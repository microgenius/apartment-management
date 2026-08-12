import { useState, useEffect } from 'react';
import type { Language, ThemeName, Resident } from './types';
import { useAuth } from './contexts/AuthContext';
import { TRANSLATIONS, isLanguage } from './constants/translations';
import { THEMES } from './constants/themes';
import { calculateTotalDebt, getResidentLedgerWithPlanning, getBaseClasses, createTranslator } from './utils/helpers';
import { useResidents } from './hooks/useResidents';
import { useRequests } from './hooks/useRequests';
import { useCommunityPosts } from './hooks/useCommunityPosts';
import { useResidentContacts } from './hooks/useResidentContacts';
import { useSettings } from './hooks/useSettings';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { CookieBanner } from './components/CookieBanner';
import { LogoutModal } from './components/modals/LogoutModal';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';
import { cookies } from './utils/cookies';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/views/DashboardView';
import { FinancialsView } from './components/views/FinancialsView';
import { RequestBoxView } from './components/views/RequestBoxView';
import { CommunityBoardView } from './components/views/CommunityBoardView';
import { SettingsView } from './components/views/SettingsView';
import { InfoView } from './components/views/InfoView';

export default function App() {
  // Auth
  const { userRole, signOut } = useAuth();
  
  // UI State - Initialize from cookies
  const [activeTab, setActiveTab] = useState<string>('financials');
  const [lang, setLang] = useState<Language>(() => {
    const saved = cookies.get('app_language');
    return isLanguage(saved) ? saved : 'tr';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = cookies.get('app_theme');
    return (saved === 'blue' || saved === 'green' || saved === 'purple' || saved === 'orange') ? saved as ThemeName : 'blue';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = cookies.get('app_darkmode');
    return saved === 'true';
  });
  
  // Save preferences to cookies when they change
  useEffect(() => {
    cookies.set('app_language', lang, 365);
  }, [lang]);
  
  useEffect(() => {
    cookies.set('app_theme', theme, 365);
  }, [theme]);
  
  useEffect(() => {
    cookies.set('app_darkmode', darkMode.toString(), 365);
  }, [darkMode]);
  
  // Data States from Supabase
  const { residents, setResidents, refetch: refetchResidents } = useResidents();
  const { meetingDate, setMeetingDate, monthlyDue, setMonthlyDue, debtStartDate, setDebtStartDate } = useSettings();
  const { requests, setRequests } = useRequests();
  const { communityPosts, setCommunityPosts } = useCommunityPosts();
  const { contacts, refetch: refetchContacts } = useResidentContacts();

  const [selectedApartment, setSelectedApartment] = useState<Resident | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // AI States
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');

  // Computed Values
  const currentTheme = THEMES[theme];
  const t = createTranslator(TRANSLATIONS, lang);
  const baseClasses = getBaseClasses(darkMode);

  // Helper Functions with Dependencies
  const getResidentLedgerWithPlanningBound = (resident: Resident) => 
    getResidentLedgerWithPlanning(resident, meetingDate, lang, monthlyDue, debtStartDate);

  return (
    <ProtectedRoute>
      <div className={`flex h-screen font-sans ${baseClasses.bgMain} ${baseClasses.textMain}`}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          userRole={userRole || 'resident'}
          isSidebarOpen={isSidebarOpen} 
          setIsSidebarOpen={setIsSidebarOpen} 
          baseClasses={baseClasses} 
          currentTheme={currentTheme} 
          t={t}
          darkMode={darkMode}
          onLogoutClick={() => setShowLogoutModal(true)}
          onPasswordClick={() => setShowPasswordModal(true)}
        />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header 
          activeTab={activeTab}
          lang={lang}
          setLang={setLang}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          theme={theme}
          setTheme={setTheme}
          setIsSidebarOpen={setIsSidebarOpen}
          baseClasses={baseClasses}
          currentTheme={currentTheme}
          t={t}
        />

        <div className={`flex-1 overflow-auto relative ${baseClasses.bgMain}`}>
          <div className="max-w-6xl mx-auto py-6">
            {activeTab === 'dashboard' && (
              <DashboardView 
                userRole={userRole || 'resident'} 
                residents={residents} 
                setSelectedApartment={setSelectedApartment} 
                selectedApartment={selectedApartment}
                contacts={contacts}
                refetchContacts={refetchContacts}
                calculateTotalDebt={calculateTotalDebt}
                getResidentLedgerWithPlanning={getResidentLedgerWithPlanningBound}
                baseClasses={baseClasses} 
                currentTheme={currentTheme} 
                t={t} 
                darkMode={darkMode}
              />
            )}
            
            {activeTab === 'financials' && (
              <FinancialsView
                userRole={userRole || 'resident'}
                lang={lang}
                residents={residents}
                setResidents={setResidents}
                baseClasses={baseClasses} 
                currentTheme={currentTheme}
                t={t} 
                darkMode={darkMode} 
                meetingDate={meetingDate}
                calculateTotalDebt={calculateTotalDebt}
                getResidentLedgerWithPlanning={getResidentLedgerWithPlanningBound}
              />
            )}
            
            {activeTab === 'requests' && (
              <RequestBoxView 
                requests={requests} 
                setRequests={setRequests} 
                userRole={userRole || 'resident'}
                baseClasses={baseClasses} 
                currentTheme={currentTheme} 
                t={t}
                darkMode={darkMode}
                isGenerating={isGenerating}
                setIsGenerating={setIsGenerating}
                generatedContent={generatedContent}
                setGeneratedContent={setGeneratedContent}
                lang={lang}
              />
            )}
            
            {activeTab === 'community' && (
              <CommunityBoardView 
                communityPosts={communityPosts} 
                setCommunityPosts={setCommunityPosts}
                baseClasses={baseClasses} 
                currentTheme={currentTheme} 
                t={t}
                darkMode={darkMode} 
              />
            )}
            
            {activeTab === 'settings' && userRole === 'admin' && (
              <SettingsView 
                baseClasses={baseClasses} 
                currentTheme={currentTheme} 
                t={t} 
                meetingDate={meetingDate} 
                setMeetingDate={setMeetingDate}
                monthlyDue={monthlyDue}
                setMonthlyDue={setMonthlyDue}
                debtStartDate={debtStartDate}
                setDebtStartDate={setDebtStartDate}
                darkMode={darkMode}
                residents={residents}
                refetchResidents={refetchResidents}
                lang={lang}
              />
            )}

            {activeTab === 'info' && (
              <InfoView 
                baseClasses={baseClasses} 
                currentTheme={currentTheme} 
                t={t} 
                darkMode={darkMode} 
              />
            )}
          </div>
        </div>
      </main>
      </div>
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={async () => {
          await signOut();
          setShowLogoutModal(false);
        }}
        t={t}
        darkMode={darkMode}
      />
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        baseClasses={baseClasses}
        currentTheme={currentTheme}
        t={t}
      />
      <CookieBanner />
    </ProtectedRoute>
  );
}
