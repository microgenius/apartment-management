// ==========================================
// TİP TANIMLAMALARI (TYPES & INTERFACES)
// ==========================================

// Temel Tipler
export type Language = 'tr' | 'en';
export type UserRole = 'resident' | 'admin';
export type ThemeName = 'blue' | 'purple' | 'green' | 'orange';
export type LedgerStatus = 'paid' | 'unpaid' | 'planned' | 'partial_paid';
export type RequestStatus = 'status_new' | 'status_review' | 'status_completed';
export type PostType = 'general' | 'event' | 'alert' | 'agenda';

// Veri Yapıları
export interface LedgerItem {
  id: string;
  date: string;
  desc: string;
  amount: number;
  status: LedgerStatus;
  paid_amount?: number; // For partial payments - tracks how much has been paid
}

export interface Resident {
  id: number;
  door: string;
  name: string;
  type: 'Kiracı' | 'Ev Sahibi';
  phone: string;
  status: 'Dolu' | 'Boş';
  user_id: string | null; // Bağlı auth kullanıcısı (login hesabı olmayabilir)
  ledger: LedgerItem[];
}

export interface RequestItem {
  id: number;
  user: string;
  date: string;
  content: string;
  status: RequestStatus;
  inAgenda: boolean;
}

export interface CommunityPost {
  id: number;
  user: string;
  date: string;
  content: string;
  type: PostType;
}

export interface CurrentUser {
  name: string;
  flatInfo: string;
}

// Tema ve Stil Tipleri
export interface Theme {
  name: string;
  primary: string;
  hover: string;
  text: string;
  border: string;
  gradient: string;
  ring: string;
  light: string;
}

export interface BaseClasses {
  bgMain: string;
  bgCard: string;
  textMain: string;
  textSub: string;
  border: string;
  input: string;
  sidebar: string;
  header: string;
  hover: string;
}

// Info Data Types
export interface InfoItem {
  id: number;
  role: 'manager' | 'assistant' | 'muhtar' | 'municipality';
  name: string;
  phone: string;
  updated_at: string;
}

// Component Props Tipleri
export interface CommonProps {
  baseClasses: BaseClasses;
  currentTheme: Theme;
  t: (key: string) => string;
  darkMode: boolean;
}

export interface SidebarProps extends Omit<CommonProps, 'darkMode'> {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  darkMode: boolean;
  onLogoutClick: () => void;
}

export interface HeaderProps {
  activeTab: string;
  lang: Language;
  setLang: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  baseClasses: BaseClasses;
  currentTheme: Theme;
  t: (key: string) => string;
}

export interface FinancialsViewProps extends CommonProps {
  userRole: string;
  residents: Resident[];
  setResidents: React.Dispatch<React.SetStateAction<Resident[]>>;
  meetingDate: string;
  calculateTotalDebt: (ledgerItems: LedgerItem[]) => number;
  getResidentLedgerWithPlanning: (resident: Resident) => LedgerItem[];
}

export interface DashboardViewProps extends CommonProps {
  userRole: string;
  residents: Resident[];
  setSelectedApartment: (resident: Resident | null) => void;
  selectedApartment: Resident | null;
  calculateTotalDebt: (ledgerItems: LedgerItem[]) => number;
  getResidentLedgerWithPlanning: (resident: Resident) => LedgerItem[];
}

export interface RequestBoxViewProps extends CommonProps {
  userRole: string;
  requests: RequestItem[];
  setRequests: React.Dispatch<React.SetStateAction<RequestItem[]>>;
  isGenerating: boolean;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  generatedContent: string;
  setGeneratedContent: React.Dispatch<React.SetStateAction<string>>;
  lang: string;
}

export interface CommunityBoardViewProps extends CommonProps {
  communityPosts: CommunityPost[];
  setCommunityPosts: React.Dispatch<React.SetStateAction<CommunityPost[]>>;
}

export interface SettingsViewProps extends CommonProps {
  meetingDate: string;
  setMeetingDate: (date: string) => void;
  monthlyDue: number;
  setMonthlyDue: (amount: number) => void;
  debtStartDate: string;
  setDebtStartDate: (date: string) => void;
  residents: Resident[];
  refetchResidents: () => void;
}

export interface InfoViewProps extends CommonProps {}
