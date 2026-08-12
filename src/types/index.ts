// ==========================================
// TİP TANIMLAMALARI (TYPES & INTERFACES)
// ==========================================

// Temel Tipler
export type Language = 'tr' | 'en' | 'de';
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

/** Site görevi. Görevi olan daireden aidat alınmaz. */
export type ResidentDuty = 'manager' | 'assistant';

export interface Resident {
  id: number;
  door: string;
  /** Numaralandırma değişmeden önceki daire no. Eski listelerle/defterlerle
   *  eşleştirmek için tutuluyor; boş olabilir. */
  old_door: string | null;
  name: string;
  type: 'Kiracı' | 'Ev Sahibi';
  phone: string;
  status: 'Dolu' | 'Boş';
  duty: ResidentDuty | null;
  /** Göreve başlama tarihi. Muafiyet bu aydan itibaren işler; öncesindeki
   *  borçlar olduğu gibi kalır. */
  duty_since: string | null;
  ledger: LedgerItem[];
}

export interface RequestItem {
  id: number;
  user: string;
  /** Yazarın hesabı. Silme yetkisi buradan belirlenir; isim gösterim için.
   *  null: migration öncesi kayıt, yazarı bilinmiyor. */
  user_id: string | null;
  date: string;
  content: string;
  status: RequestStatus;
  inAgenda: boolean;
}

export interface CommunityPost {
  id: number;
  user: string;
  /** Yazarın hesabı. Silme yetkisi buradan belirlenir; isim gösterim için. */
  user_id: string | null;
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

import type { ResidentContact } from '../services/residentContactsService';
import type { Transaction } from '../services/transactionsService';

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
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  darkMode: boolean;
  onLogoutClick: () => void;
  onPasswordClick: () => void;
  /** Bağlı dairenin kapı numarası. Daire bilgisi elle yazılmıyor,
   *  user_profiles.resident_id üzerinden türetiliyor. */
  flatLabel?: string;
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
  lang: Language;
  residents: Resident[];
  setResidents: React.Dispatch<React.SetStateAction<Resident[]>>;
  meetingDate: string;
  calculateTotalDebt: (ledgerItems: LedgerItem[]) => number;
  getResidentLedgerWithPlanning: (resident: Resident) => LedgerItem[];
}

export interface DashboardViewProps extends CommonProps {
  residents: Resident[];
  contacts: ResidentContact[];
  refetchContacts: () => void;
  setSelectedApartment: (resident: Resident | null) => void;
  selectedApartment: Resident | null;
  calculateTotalDebt: (ledgerItems: LedgerItem[]) => number;
  getResidentLedgerWithPlanning: (resident: Resident) => LedgerItem[];
}

export interface RequestBoxViewProps extends CommonProps {
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
  refetchContacts: () => void;
  lang: Language; // telefon numarasını doğru ülke koduyla normalize etmek için
}

export interface FinanceViewProps extends CommonProps {
  transactions: Transaction[];
  /** Aidat gelirlerinin toplamı. Sakinler satırları göremediği için
   *  toplam ayrı geliyor (bkz. dues_income_total()). */
  duesTotal: number;
  refetchTransactions: () => void;
  lang: Language;
}

export interface InfoViewProps extends CommonProps {}
