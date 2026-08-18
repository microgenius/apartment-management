import { useState, useEffect } from 'react';
import type { Language, ThemeName, Resident, LedgerItem } from './types';
import { useAuth } from './contexts/AuthContext';
import { canManageOthers } from './utils/permissions';
import { TRANSLATIONS, isLanguage } from './constants/translations';
import { THEMES } from './constants/themes';
import { calculateTotalDebt, getResidentLedgerWithPlanning, getBaseClasses, createTranslator } from './utils/helpers';
import { useResidents } from './hooks/useResidents';
import { useRequests } from './hooks/useRequests';
import { useCommunityPosts } from './hooks/useCommunityPosts';
import { useResidentContacts } from './hooks/useResidentContacts';
import { useTransactions } from './hooks/useTransactions';
import { useSettings } from './hooks/useSettings';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { CookieBanner } from './components/CookieBanner';
import { InstallPrompt } from './components/InstallPrompt';
import { Loading } from './components/Loading';
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
import { FinanceView } from './components/views/FinanceView';

export default function App() {
  // Auth
  const { userProfile, signOut } = useAuth();
  
  // UI State - Initialize from cookies
  const [activeTab, setActiveTab] = useState<string>('financials');
  const [lang, setLang] = useState<Language>(() => {
    const saved = cookies.get('app_language');
    return isLanguage(saved) ? saved : 'tr';
  });
  // Mobilde kapalı başlar: açık başlarsa çekmece uygulamanın üstünü kaplıyor.
  // Masaüstünde açık, çünkü orada aynı state genişlet/daralt anlamına geliyor.
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(
    () => typeof window === 'undefined' || window.matchMedia('(min-width: 768px)').matches
  );
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
  const { residents, setResidents, refetch: refetchResidents, loading: residentsLoading } = useResidents();
  const { meetingDate, setMeetingDate, monthlyDue, setMonthlyDue, debtStartDate, setDebtStartDate, lateFee, setLateFee, bankInfo, setBankInfo, loading: settingsLoading } = useSettings();
  const { requests, setRequests, loading: requestsLoading } = useRequests();
  const { communityPosts, setCommunityPosts, loading: postsLoading } = useCommunityPosts();
  const { contacts, refetch: refetchContacts, loading: contactsLoading } = useResidentContacts();
  const { transactions, duesTotal, refetch: refetchTransactions, loading: transactionsLoading } = useTransactions();

  // Aidat tutarı ve borç başlangıcı ayarlardan geliyor; ayarlar gelmeden
  // borç hesabı yanlış çıkar (aylık aidat 0 varsayılır). Bu yüzden borç
  // gösteren ekranlar ayarları da bekliyor.
  const loadingByTab: Record<string, boolean> = {
    dashboard: residentsLoading || settingsLoading || contactsLoading,
    financials: residentsLoading || settingsLoading,
    finance: transactionsLoading,
    community: postsLoading,
    requests: requestsLoading,
    settings: residentsLoading,
    info: settingsLoading
  };
  const isLoading = loadingByTab[activeTab] ?? false;

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

  // Kenar çubuğunda gösterilen daire: elle yazılan alan yerine bağlı
  // daire kaydından türetiliyor
  const myFlat = residents.find((r) => r.id === userProfile?.resident_id);
  const myFlatLabel = myFlat ? `${t('flat')} ${myFlat.door}` : undefined;

  // Helper Functions with Dependencies
  const getResidentLedgerWithPlanningBound = (resident: Resident) =>
    getResidentLedgerWithPlanning(resident, meetingDate, lang, monthlyDue, debtStartDate);

  // Borç toplamı faizi de kapsıyor; oran ayarlardan geldiği için bağlanıyor
  const calculateTotalDebtBound = (items: LedgerItem[]) =>
    calculateTotalDebt(items, new Date(), lateFee);

  return (
    <ProtectedRoute>
      <div className={`flex h-screen font-sans ${baseClasses.bgMain} ${baseClasses.textMain}`}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          isSidebarOpen={isSidebarOpen} 
          setIsSidebarOpen={setIsSidebarOpen} 
          baseClasses={baseClasses} 
          currentTheme={currentTheme} 
          t={t}
          darkMode={darkMode}
          onLogoutClick={() => setShowLogoutModal(true)}
          onPasswordClick={() => setShowPasswordModal(true)}
          flatLabel={myFlatLabel}
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
          <div className="max-w-6xl mx-auto py-4 sm:py-6 px-1 sm:px-0">
            {isLoading && (
              <Loading baseClasses={baseClasses} currentTheme={currentTheme} t={t} />
            )}

            {!isLoading && activeTab === 'dashboard' && (
              <DashboardView
                lateFee={lateFee}
                residents={residents} 
                setSelectedApartment={setSelectedApartment} 
                selectedApartment={selectedApartment}
                contacts={contacts}
                refetchContacts={refetchContacts}
                calculateTotalDebt={calculateTotalDebtBound}
                getResidentLedgerWithPlanning={getResidentLedgerWithPlanningBound}
                baseClasses={baseClasses} 
                currentTheme={currentTheme} 
                t={t} 
                darkMode={darkMode}
              />
            )}
            
            {!isLoading && activeTab === 'financials' && (
              <FinancialsView
                lang={lang}
                lateFee={lateFee}
                residents={residents}
                setResidents={setResidents}
                baseClasses={baseClasses} 
                currentTheme={currentTheme}
                t={t} 
                darkMode={darkMode} 
                meetingDate={meetingDate}
                calculateTotalDebt={calculateTotalDebtBound}
                getResidentLedgerWithPlanning={getResidentLedgerWithPlanningBound}
              />
            )}
            
            {!isLoading && activeTab === 'requests' && (
              <RequestBoxView 
                requests={requests} 
                setRequests={setRequests}
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
            
            {!isLoading && activeTab === 'community' && (
              <CommunityBoardView 
                communityPosts={communityPosts} 
                setCommunityPosts={setCommunityPosts}
                baseClasses={baseClasses} 
                currentTheme={currentTheme} 
                t={t}
                darkMode={darkMode} 
              />
            )}
            
            {!isLoading && activeTab === 'finance' && (
              <FinanceView
                transactions={transactions}
                duesTotal={duesTotal}
                refetchTransactions={refetchTransactions}
                baseClasses={baseClasses}
                currentTheme={currentTheme}
                t={t}
                darkMode={darkMode}
                lang={lang}
              />
            )}

            {!isLoading && activeTab === 'settings' && canManageOthers(userProfile) && (
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
                lateFee={lateFee}
                setLateFee={setLateFee}
                bankInfo={bankInfo}
                setBankInfo={setBankInfo}
                darkMode={darkMode}
                residents={residents}
                refetchResidents={refetchResidents}
                refetchContacts={refetchContacts}
                lang={lang}
              />
            )}

            {!isLoading && activeTab === 'info' && (
              <InfoView 
                baseClasses={baseClasses} 
                currentTheme={currentTheme} 
                t={t} 
                darkMode={darkMode} 
                bankInfo={bankInfo}
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
      <InstallPrompt t={t} />
      <CookieBanner />
    </ProtectedRoute>
  );
}
