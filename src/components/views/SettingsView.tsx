import React, { useState, useEffect } from 'react';
import { Settings, Calendar, Info, UserPlus, UserCog, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import type { SettingsViewProps } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { userProfilesService } from '../../services/userProfilesService';
import { residentsService } from '../../services/residentsService';
import { DIAL_CODES } from '../../utils/helpers';
import { COUNTRIES } from '../../constants/countries';
import { SuccessModal } from '../modals/SuccessModal';
import { ErrorModal } from '../modals/ErrorModal';

export const SettingsView: React.FC<SettingsViewProps> = ({
  baseClasses,
  currentTheme,
  t,
  meetingDate,
  setMeetingDate,
  monthlyDue,
  setMonthlyDue,
  debtStartDate,
  setDebtStartDate,
  darkMode,
  residents,
  refetchResidents,
  lang
}) => {
  const { user, createUser, refreshProfile } = useAuth();
  const [tempDate, setTempDate] = useState(meetingDate);
  const [isSaving, setIsSaving] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(debtStartDate);
  const [isSavingStartDate, setIsSavingStartDate] = useState(false);

  // New User Form
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  // Sakinler Türkiye dışında da yaşayabiliyor; ülke kodu dilden bağımsız seçilebilmeli
  const [newUserDialCode, setNewUserDialCode] = useState<string>(DIAL_CODES[lang]);
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'resident' | 'admin'>('resident');
  const [newUserApartment, setNewUserApartment] = useState('');
  const [newUserResidentId, setNewUserResidentId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Henüz bir kullanıcı hesabına bağlanmamış sakinler (link zorunlu değil, opsiyonel)
  const unlinkedResidents = residents.filter((r) => !r.user_id);

  // Transfer Admin
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);

  // Modals
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });

  // Monthly Dues
  const [tempDues, setTempDues] = useState<number>(monthlyDue);
  const [isSavingDues, setIsSavingDues] = useState(false);

  useEffect(() => {
    setTempDate(meetingDate);
  }, [meetingDate]);

  useEffect(() => {
    setTempDues(monthlyDue);
  }, [monthlyDue]);

  useEffect(() => {
    setTempStartDate(debtStartDate);
  }, [debtStartDate]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const users = await userProfilesService.getAllProfiles();
    setAllUsers(users.filter(u => u.role === 'resident'));
  };

  const handleSaveDate = async () => {
    setIsSaving(true);
    try {
      await setMeetingDate(tempDate);
      setSuccessModal({ isOpen: true, title: 'Başarılı', message: 'Genel kurul tarihi başarıyla güncellendi.' });
    } catch (error) {
      console.error('Error updating meeting date:', error);
      setErrorModal({ isOpen: true, title: 'Hata', message: 'Tarih güncellenirken bir hata oluştu.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { error, userId } = await createUser(
        newUserEmail,
        newUserPassword,
        newUserName,
        newUserRole,
        newUserApartment || undefined,
        newUserPhone || undefined,
        newUserDialCode
      );

      if (error) {
        const message =
          error.message === 'NO_IDENTIFIER' ? t('create_user_no_identifier')
          : error.message === 'INVALID_PHONE' ? t('login_error_phone')
          : 'Kullanıcı oluşturulurken hata: ' + error.message;
        setErrorModal({ isOpen: true, title: 'Hata', message });
      } else {
        if (userId && newUserResidentId) {
          // Eşleştirme opsiyoneldi; seçilmişse sakin kaydını yeni hesaba bağla
          await residentsService.linkUser(Number(newUserResidentId), userId);
          refetchResidents();
        }
        setSuccessModal({ isOpen: true, title: 'Başarılı', message: `${newUserName} başarıyla oluşturuldu! Kullanıcı artık giriş yapabilir.` });
        setNewUserEmail('');
        setNewUserPhone('');
        setNewUserPassword('');
        setNewUserName('');
        setNewUserRole('resident');
        setNewUserApartment('');
        setNewUserResidentId('');
        await loadUsers();
      }
    } catch (error) {
      setErrorModal({ isOpen: true, title: 'Hata', message: 'Beklenmeyen bir hata oluştu.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleTransferAdmin = async () => {
    if (!selectedNewAdmin || !user) return;
    
    setIsTransferring(true);
    try {
      const success = await userProfilesService.transferAdmin(user.id, selectedNewAdmin);
      
      if (success) {
        setSuccessModal({ isOpen: true, title: 'Başarılı', message: 'Yönetici yetkisi başarıyla devredildi! Profiliniz güncelleniyor...' });
        // Force refresh profile from server (clears cache and state first)
        await refreshProfile();
        // Reset form
        setSelectedNewAdmin('');
        setShowTransferConfirm(false);
      } else {
        setErrorModal({ isOpen: true, title: 'Hata', message: 'Yetki devri sırasında bir hata oluştu.' });
      }
    } catch (error) {
      setErrorModal({ isOpen: true, title: 'Hata', message: 'Beklenmeyen bir hata oluştu.' });
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="p-4 animate-fade-in space-y-6">
      <h2 className={`text-2xl font-bold ${baseClasses.textMain} mb-6 flex items-center`}>
        <Settings className={`mr-2 ${currentTheme.text}`} /> {t('settings')} (Admin)
      </h2>

      {/* Meeting Date & Monthly Dues Settings - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meeting Date Settings */}
        <div className={`p-6 rounded-xl border ${baseClasses.bgCard}`}>
          <h3 className={`font-bold text-lg mb-4 ${baseClasses.textMain} flex items-center`}>
            <Calendar className="mr-2" size={20} />
            {t('meeting_settings')}
          </h3>
          
          {/* Debt Start Date */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${baseClasses.textMain}`}>
              {t('debt_start_date')}
            </label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input 
                  type="date" 
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className={`p-3 pl-10 rounded-lg border outline-none font-bold ${baseClasses.input}`}
                />
                <Calendar className="absolute left-3 top-3.5 text-slate-400" size={18} />
              </div>
              <button 
                onClick={async () => {
                  setIsSavingStartDate(true);
                  try {
                    await setDebtStartDate(tempStartDate);
                    setSuccessModal({ isOpen: true, title: t('success'), message: t('debt_start_date_updated') });
                  } catch (error) {
                    setErrorModal({ isOpen: true, title: t('error_occurred'), message: t('error_occurred') });
                  } finally {
                    setIsSavingStartDate(false);
                  }
                }}
                disabled={isSavingStartDate || tempStartDate === debtStartDate}
                className={`${currentTheme.primary} text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSavingStartDate ? t('saving') : t('update')}
              </button>
            </div>
            <p className={`text-sm mt-3 flex items-start ${baseClasses.textSub}`}>
              <Info size={16} className="mr-2 mt-0.5 flex-shrink-0" />
              {t('debt_start_date_desc')}
            </p>
          </div>

          {/* Meeting Date */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${baseClasses.textMain}`}>
              {t('meeting_date')}
            </label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input 
                  type="date" 
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  className={`p-3 pl-10 rounded-lg border outline-none font-bold ${baseClasses.input}`}
                />
                <Calendar className="absolute left-3 top-3.5 text-slate-400" size={18} />
              </div>
              <button 
                onClick={handleSaveDate}
                disabled={isSaving || tempDate === meetingDate}
                className={`${currentTheme.primary} text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaving ? t('saving') : t('update_date')}
              </button>
            </div>
            <p className={`text-sm mt-3 flex items-start ${baseClasses.textSub}`}>
              <Info size={16} className="mr-2 mt-0.5 flex-shrink-0" />
              {t('meeting_desc')}
            </p>
          </div>
        </div>

        {/* Monthly Dues Settings */}
        <div className={`p-6 rounded-xl border ${baseClasses.bgCard}`}>
          <h3 className={`font-bold text-lg mb-4 ${baseClasses.textMain} flex items-center`}>
            <DollarSign className="mr-2" size={20} />
            {t('monthly_dues_settings')}
          </h3>
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${baseClasses.textMain}`}>
              {t('monthly_dues_amount')}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={tempDues}
                onChange={(e) => setTempDues(parseFloat(e.target.value) || 0)}
                className={`p-3 rounded-lg border outline-none font-bold w-48 ${baseClasses.input}`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <button
                onClick={async () => {
                  setIsSavingDues(true);
                  try {
                    await setMonthlyDue(tempDues);
                    setSuccessModal({ isOpen: true, title: t('success'), message: t('monthly_dues_settings') + ' ' + t('success').toLowerCase() });
                  } catch (error) {
                    setErrorModal({ isOpen: true, title: t('error_occurred'), message: t('error_occurred') });
                  } finally {
                    setIsSavingDues(false);
                  }
                }}
                disabled={isSavingDues || tempDues === monthlyDue}
                className={`${currentTheme.primary} text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSavingDues ? t('saving') : t('update')}
              </button>
            </div>
            <p className={`text-sm mt-3 flex items-start ${baseClasses.textSub}`}>
              <Info size={16} className="mr-2 mt-0.5 flex-shrink-0" />
              {t('monthly_dues_desc')}
            </p>
          </div>
        </div>
      </div>

      {/* Create New User */}
      <div className={`p-6 rounded-xl border ${baseClasses.bgCard}`}>
        <h3 className={`font-bold text-lg mb-4 ${baseClasses.textMain} flex items-center`}>
          <UserPlus className="mr-2" size={20} />
          {t('create_user')}
        </h3>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${baseClasses.textMain}`}>
                {t('full_name')} {t('required_field')}
              </label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className={`w-full p-3 rounded-lg border outline-none ${baseClasses.input}`}
                placeholder={t('placeholder_name')}
                required
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${baseClasses.textMain}`}>
                {t('email')}
              </label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className={`w-full p-3 rounded-lg border outline-none ${baseClasses.input}`}
                placeholder={t('placeholder_email')}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${baseClasses.textMain}`}>
              {t('phone')}
            </label>
            <div className="flex gap-2">
              <select
                value={newUserDialCode}
                onChange={(e) => setNewUserDialCode(e.target.value)}
                aria-label={t('country_code')}
                className={`w-32 shrink-0 p-3 rounded-lg border outline-none ${baseClasses.input}`}
              >
                {COUNTRIES.map(({ code, name, flag }) => (
                  <option key={code} value={code}>{flag} +{code} {name}</option>
                ))}
              </select>
              <input
                type="tel"
                value={newUserPhone}
                onChange={(e) => setNewUserPhone(e.target.value)}
                className={`flex-1 p-3 rounded-lg border outline-none ${baseClasses.input}`}
                placeholder={t('placeholder_phone')}
              />
            </div>
            <p className={`text-xs mt-1 ${baseClasses.textSub}`}>{t('identifier_hint')}</p>
            <p className={`text-xs mt-1 ${baseClasses.textSub}`}>{t('country_code_hint')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${baseClasses.textMain}`}>
                {t('password')} {t('required_field')}
              </label>
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className={`w-full p-3 rounded-lg border outline-none ${baseClasses.input}`}
                placeholder={t('min_password')}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${baseClasses.textMain}`}>
                {t('apartment_info')}
              </label>
              <input
                type="text"
                value={newUserApartment}
                onChange={(e) => setNewUserApartment(e.target.value)}
                className={`w-full p-3 rounded-lg border outline-none ${baseClasses.input}`}
                placeholder={t('placeholder_apartment')}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${baseClasses.textMain}`}>
              {t('link_resident')}
            </label>
            <select
              value={newUserResidentId}
              onChange={(e) => setNewUserResidentId(e.target.value)}
              className={`w-full p-3 rounded-lg border outline-none ${baseClasses.input}`}
            >
              <option value="">{t('link_resident_none')}</option>
              {unlinkedResidents.map((r) => (
                <option key={r.id} value={r.id}>{r.door} - {r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${baseClasses.textMain}`}>
              {t('role')} {t('required_field')}
            </label>
            <div className="flex gap-4">
              <label className={`flex items-center cursor-pointer px-4 py-3 rounded-lg border ${newUserRole === 'resident' ? currentTheme.primary + ' text-white border-transparent' : baseClasses.border + ' ' + baseClasses.textMain}`}>
                <input
                  type="radio"
                  name="role"
                  value="resident"
                  checked={newUserRole === 'resident'}
                  onChange={(e) => setNewUserRole(e.target.value as 'resident')}
                  className="mr-2"
                />
                {t('site_resident')}
              </label>
              <label className={`flex items-center cursor-pointer px-4 py-3 rounded-lg border ${newUserRole === 'admin' ? currentTheme.primary + ' text-white border-transparent' : baseClasses.border + ' ' + baseClasses.textMain}`}>
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={newUserRole === 'admin'}
                  onChange={(e) => setNewUserRole(e.target.value as 'admin')}
                  className="mr-2"
                />
                {t('admin')}
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className={`w-full ${currentTheme.primary} text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
          >
            {isCreating ? t('creating') : t('create_user_btn')}
          </button>
        </form>
      </div>

      {/* Transfer Admin Rights */}
      <div className={`p-6 rounded-xl border ${darkMode ? 'border-orange-900/30 bg-orange-900/10' : 'border-orange-200 bg-orange-50'}`}>
        <h3 className={`font-bold text-lg mb-4 flex items-center ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>
          <UserCog className="mr-2" size={20} />
          {t('transfer_admin')}
        </h3>
        <div className={`mb-4 p-4 rounded-lg flex items-start ${darkMode ? 'bg-orange-900/20' : 'bg-orange-100'}`}>
          <AlertCircle className={`mr-2 mt-0.5 flex-shrink-0 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} size={18} />
          <p className={`text-sm ${darkMode ? 'text-orange-300' : 'text-orange-800'}`}>
            <strong>{t('warning')}:</strong> {t('transfer_warning')}
          </p>
        </div>

        {!showTransferConfirm ? (
          <div>
            <label className={`block text-sm font-medium mb-2 ${baseClasses.textMain}`}>
              {t('select_new_admin')}
            </label>
            <div className="flex gap-4">
              <select
                value={selectedNewAdmin}
                onChange={(e) => setSelectedNewAdmin(e.target.value)}
                className={`flex-1 p-3 rounded-lg border outline-none ${baseClasses.input}`}
              >
                <option value="">{t('select_user')}</option>
                {allUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} {user.apartment_info ? `(${user.apartment_info})` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowTransferConfirm(true)}
                disabled={!selectedNewAdmin}
                className={`px-6 py-3 rounded-lg font-medium ${darkMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-500 hover:bg-orange-600'} text-white disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {t('transfer_btn')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-red-900/20 border border-red-900/30' : 'bg-red-50 border border-red-200'}`}>
              <p className={`font-bold mb-2 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                {t('confirm_transfer')}
              </p>
              <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                {allUsers.find(u => u.id === selectedNewAdmin)?.full_name} {t('transfer_confirm_msg')}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleTransferAdmin}
                disabled={isTransferring}
                className={`flex-1 px-6 py-3 rounded-lg font-medium ${darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
              >
                {isTransferring ? t('transferring') : <><CheckCircle className="mr-2" size={18} /> {t('confirm')}</>}
              </button>
              <button
                onClick={() => setShowTransferConfirm(false)}
                disabled={isTransferring}
                className={`flex-1 px-6 py-3 rounded-lg font-medium border ${baseClasses.border} ${baseClasses.textMain} hover:${baseClasses.hover}`}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, title: '', message: '' })}
        title={successModal.title}
        message={successModal.message}
        darkMode={darkMode}
      />
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
        darkMode={darkMode}
      />
    </div>
  );
};
