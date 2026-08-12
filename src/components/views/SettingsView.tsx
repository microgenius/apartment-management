import React, { useState, useEffect } from 'react';
import { Settings, Calendar, Info, UserPlus, UserCog, AlertCircle, CheckCircle, DollarSign, ShieldCheck, KeyRound } from 'lucide-react';
import type { SettingsViewProps, ResidentDuty } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { userProfilesService, type UserProfile } from '../../services/userProfilesService';
import { residentContactsService } from '../../services/residentContactsService';
import { DIAL_CODES, LOCALES } from '../../utils/helpers';
import { COUNTRIES } from '../../constants/countries';
import { isAdmin } from '../../utils/permissions';
import { SuccessModal } from '../modals/SuccessModal';
import { ErrorModal } from '../modals/ErrorModal';
import { PasswordInput } from '../PasswordInput';

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
  refetchContacts,
  lang
}) => {
  const { user, userProfile, createUser, refreshProfile } = useAuth();
  // Görev atama ve yöneticilik devri yalnızca admin'de: aksi halde yardımcı
  // kendini yönetici yapıp yetki yükseltebilirdi.
  const adminOnly = isAdmin(userProfile);
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
  const [newUserResidentId, setNewUserResidentId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Transfer Admin
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
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

  // Tüm profiller tutuluyor: daire başına hesap sayısını göstermek için
  // admin'ler de gerekli. Yöneticilik devri listesi kullanıldığı yerde filtreleniyor.
  const loadUsers = async () => {
    setAllUsers(await userProfilesService.getAllProfiles());
  };

  const transferCandidates = allUsers.filter(u => u.role === 'resident');

  // Daire bilgisi artık elle yazılmıyor; bağlı daire kaydından türetiliyor
  const flatLabel = (residentId: number | null) => {
    const flat = residents.find((r) => r.id === residentId);
    return flat ? `(${flat.door})` : '';
  };

  // Görev atama (yönetici / yardımcısı). Görevi olan daireden aidat alınmaz.
  const [savingDuty, setSavingDuty] = useState<ResidentDuty | null>(null);

  // Görev KİŞİYE atanıyor: yetki kişiye ait olmalı, daireye değil - bir daireye
  // birden fazla hesap bağlanabildiği için görevlinin eşi de yetki kazanırdı.
  // Aidat muafiyeti ise görevlinin bağlı olduğu daireye uygulanıyor.
  const handleDutyChange = async (duty: ResidentDuty, userId: string) => {
    setSavingDuty(duty);
    try {
      const current = allUsers.find(u => u.duty === duty);
      if (current && current.id !== userId) {
        await userProfilesService.clearDuty(current.id);
      }
      if (userId) {
        await userProfilesService.setDuty(userId, duty);
      }
      await loadUsers();
      refetchResidents();
      setSuccessModal({ isOpen: true, title: t('success'), message: t('duty_updated') });
    } catch (error) {
      console.error('Error updating duty:', error);
      setErrorModal({ isOpen: true, title: t('error_occurred'), message: t('duty_update_failed') });
    } finally {
      setSavingDuty(null);
    }
  };

  // Şifre sıfırlama (başkasının şifresi -> Edge Function)
  const [resetUserId, setResetUserId] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || resetPassword.length < 6) {
      setErrorModal({ isOpen: true, title: t('error_occurred'), message: t('password_too_short') });
      return;
    }
    setIsResetting(true);
    try {
      const { error } = await userProfilesService.resetPassword(resetUserId, resetPassword);
      if (error) {
        // Sunucudan gelen sebebi olduğu gibi gösteriyoruz; hepsini "kurulu
        // değil" diye göstermek yanlış yere baktırıyordu.
        const messages: Record<string, string> = {
          not_deployed: t('password_reset_not_deployed'),
          network_or_cors: t('password_reset_network'),
          service_role_not_configured: t('password_reset_no_secret'),
          forbidden: t('password_reset_forbidden'),
          unauthorized: t('password_reset_unauthorized'),
          password_too_short: t('password_too_short')
        };
        setErrorModal({
          isOpen: true,
          title: t('error_occurred'),
          message: messages[error] ?? `${t('password_reset_failed')} (${error})`
        });
      } else {
        const who = allUsers.find(u => u.id === resetUserId)?.full_name ?? '';
        setSuccessModal({ isOpen: true, title: t('success'), message: `${who} ${t('password_reset_done')}` });
        setResetUserId('');
        setResetPassword('');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setErrorModal({ isOpen: true, title: t('error_occurred'), message: t('password_reset_failed') });
    } finally {
      setIsResetting(false);
    }
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
    if (!newUserResidentId) {
      setErrorModal({ isOpen: true, title: t('error_occurred'), message: t('resident_required') });
      return;
    }
    if (!newUserPhone.trim()) {
      setErrorModal({ isOpen: true, title: t('error_occurred'), message: t('phone_required') });
      return;
    }

    setIsCreating(true);
    try {
      const residentId = Number(newUserResidentId);
      const flat = residents.find((r) => r.id === residentId);
      const existingContacts = await residentContactsService.getByResident(residentId);

      const { error } = await createUser(
        newUserEmail,
        newUserPassword,
        newUserName,
        newUserRole,
        newUserPhone || undefined,
        newUserDialCode,
        {
          residentId,
          // Tür daire kaydından çıkarılıyor; yanlışsa daire penceresinden düzeltilebilir
          contactType: flat?.type === 'Kiracı' ? 'tenant' : 'owner',
          contactPhone: newUserPhone.trim(),
          // Dairenin ilk kişisiyse birincil olsun
          isPrimary: existingContacts.length === 0
        }
      );

      if (error) {
        const messages: Record<string, string> = {
          NO_IDENTIFIER: t('create_user_no_identifier'),
          INVALID_PHONE: t('login_error_phone'),
          NOT_DEPLOYED: t('create_user_not_deployed'),
          forbidden: t('password_reset_forbidden'),
          unauthorized: t('password_reset_unauthorized'),
          service_role_not_configured: t('password_reset_no_secret')
        };
        setErrorModal({
          isOpen: true,
          title: t('error_occurred'),
          message: messages[error.message] ?? `${t('create_user_failed')} (${error.message})`
        });
      } else {
        refetchResidents();
        refetchContacts();
        setSuccessModal({ isOpen: true, title: 'Başarılı', message: `${newUserName} başarıyla oluşturuldu! Kullanıcı artık giriş yapabilir.` });
        setNewUserEmail('');
        setNewUserPhone('');
        setNewUserPassword('');
        setNewUserName('');
        setNewUserRole('resident');
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
              {t('phone')} {t('required_field')}
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
                required
              />
            </div>
            <p className={`text-xs mt-1 ${baseClasses.textSub}`}>{t('phone_login_hint')}</p>
            <p className={`text-xs mt-1 ${baseClasses.textSub}`}>{t('country_code_hint')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${baseClasses.textMain}`}>
                {t('password')} {t('required_field')}
              </label>
              <PasswordInput
                value={newUserPassword}
                onChange={setNewUserPassword}
                className={`w-full p-3 rounded-lg border outline-none ${baseClasses.input}`}
                placeholder={t('min_password')}
                minLength={6}
                required
                autoComplete="new-password"
                t={t}
                toggleClassName={baseClasses.textSub}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${baseClasses.textMain}`}>
              {t('link_resident')} {t('required_field')}
            </label>
            <select
              value={newUserResidentId}
              onChange={(e) => setNewUserResidentId(e.target.value)}
              className={`w-full p-3 rounded-lg border outline-none ${baseClasses.input}`}
              required
            >
              <option value="">{t('select_resident')}</option>
              {/* Bağlı olanlar da listede: bir daireye birden fazla hesap bağlanabilir
                  (ev sahibi + eş + kiracı). Kaç hesabı olduğu parantezde gösteriliyor. */}
              {residents.map((r) => {
                const count = allUsers.filter((u) => u.resident_id === r.id).length;
                return (
                  <option key={r.id} value={r.id}>
                    {r.door} - {r.name}{count > 0 ? ` (${count} ${t('linked_accounts')})` : ''}
                  </option>
                );
              })}
            </select>
            <p className={`text-xs mt-1 ${baseClasses.textSub}`}>{t('link_resident_required_hint')}</p>
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

      {/* Site Görevleri - görevi olan daireden aidat alınmaz.
          Yalnızca admin: yetki yükseltmeyi engellemek için. */}
      {adminOnly && (
      <div className={`p-6 rounded-xl border ${baseClasses.bgCard}`}>
        <h3 className={`font-bold text-lg mb-2 flex items-center ${baseClasses.textMain}`}>
          <ShieldCheck className="mr-2" size={20} />
          {t('duties_title')}
        </h3>
        <p className={`text-sm mb-4 ${baseClasses.textSub}`}>{t('duties_desc')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['manager', 'assistant'] as ResidentDuty[]).map((duty) => {
            const holder = allUsers.find((u) => u.duty === duty);
            const holderFlat = residents.find((r) => r.id === holder?.resident_id);
            return (
              <div key={duty}>
                <label className={`block text-sm font-medium mb-2 ${baseClasses.textMain}`}>
                  {t(duty === 'manager' ? 'manager_title' : 'assistant_title')}
                </label>
                <select
                  value={holder?.id ?? ''}
                  disabled={savingDuty !== null}
                  onChange={(e) => handleDutyChange(duty, e.target.value)}
                  className={`w-full p-3 rounded-lg border outline-none disabled:opacity-50 ${baseClasses.input}`}
                >
                  <option value="">{t('duty_none')}</option>
                  {allUsers.map((u) => {
                    const flat = residents.find((r) => r.id === u.resident_id);
                    return (
                      <option key={u.id} value={u.id}>
                        {u.full_name}{flat ? ` (${flat.door})` : ''}
                      </option>
                    );
                  })}
                </select>
                {holder && (
                  <p className={`text-xs mt-1 ${baseClasses.textSub}`}>
                    {holderFlat
                      ? `${t('duty_exempt_since')}: ${holder.duty_since ? new Date(holder.duty_since).toLocaleDateString(LOCALES[lang]) : '-'} (${holderFlat.door})`
                      : t('duty_no_flat_warning')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      )}

      {/* Şifre Sıfırlama - kullanıcı kendi şifresini kenar çubuğundan değiştirir,
          burası yalnızca BAŞKASININ şifresi için (unutulduğunda).
          Yönetici ve yardımcısı yapabilir. */}
      <div className={`p-6 rounded-xl border ${baseClasses.bgCard}`}>
        <h3 className={`font-bold text-lg mb-2 flex items-center ${baseClasses.textMain}`}>
          <KeyRound className="mr-2" size={20} />
          {t('reset_user_password')}
        </h3>
        <p className={`text-sm mb-4 ${baseClasses.textSub}`}>{t('reset_user_password_desc')}</p>

        <form onSubmit={handleResetPassword} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={resetUserId}
            onChange={(e) => setResetUserId(e.target.value)}
            className={`w-full p-3 rounded-lg border outline-none ${baseClasses.input}`}
            required
          >
            <option value="">{t('select_user')}</option>
            {allUsers.map((u) => {
              const flat = residents.find((r) => r.id === u.resident_id);
              return (
                <option key={u.id} value={u.id}>
                  {u.full_name}{flat ? ` (${flat.door})` : ''}
                </option>
              );
            })}
          </select>
          <PasswordInput
            value={resetPassword}
            onChange={setResetPassword}
            placeholder={t('new_password')}
            minLength={6}
            required
            autoComplete="new-password"
            t={t}
            className={`w-full p-3 rounded-lg border outline-none ${baseClasses.input}`}
            toggleClassName={baseClasses.textSub}
          />
          <button
            type="submit"
            disabled={isResetting}
            className={`w-full ${currentTheme.primary} text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50`}
          >
            {isResetting ? t('saving') : t('reset_password_btn')}
          </button>
        </form>
        <p className={`text-xs mt-2 ${baseClasses.textSub}`}>{t('reset_password_note')}</p>
      </div>

      {/* Transfer Admin Rights - yalnızca admin */}
      {adminOnly && (
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
                {transferCandidates.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} {flatLabel(user.resident_id)}
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
                {transferCandidates.find(u => u.id === selectedNewAdmin)?.full_name} {t('transfer_confirm_msg')}
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
      )}

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
