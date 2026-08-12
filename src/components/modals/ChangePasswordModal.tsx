import React, { useState } from 'react';
import { KeyRound, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { BaseClasses, Theme } from '../../types';
import { PasswordInput } from '../PasswordInput';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  baseClasses: BaseClasses;
  currentTheme: Theme;
  t: (key: string) => string;
}

/**
 * Kullanıcının KENDİ şifresini değiştirmesi. Kendini ilgilendiren bir
 * aksiyon olduğu için yetki kontrolü gerekmiyor - Supabase zaten oturumdaki
 * kullanıcının şifresini değiştiriyor, başkasınınkine dokunamaz.
 * Başkasının şifresini sıfırlamak service_role gerektirir; o yönetici
 * ekranından Edge Function üzerinden yapılıyor.
 */
export const ChangePasswordModal: React.FC<Props> = ({ isOpen, onClose, baseClasses, currentTheme, t }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!isOpen) return null;

  const close = () => {
    setPassword(''); setConfirm(''); setError(''); setDone(false);
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError(t('password_too_short')); return; }
    if (password !== confirm) { setError(t('password_mismatch')); return; }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      setDone(true);
    } catch (err) {
      console.error('Error changing password:', err);
      setError(t('error_occurred'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={`${baseClasses.bgCard} rounded-2xl p-6 w-full max-w-sm relative`}>
        <button onClick={close} className={`absolute top-4 right-4 ${baseClasses.textSub} hover:text-red-500`}>
          <X size={22} />
        </button>

        <h3 className={`text-lg font-bold mb-4 flex items-center ${baseClasses.textMain}`}>
          <KeyRound size={20} className={`mr-2 ${currentTheme.text}`} /> {t('change_password')}
        </h3>

        {done ? (
          <>
            <p className={`text-sm mb-4 ${baseClasses.textMain}`}>{t('password_changed')}</p>
            <button
              onClick={close}
              className={`w-full text-white py-3 rounded-lg font-medium ${currentTheme.primary}`}
            >
              {t('close')}
            </button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <PasswordInput
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              placeholder={t('new_password')}
              minLength={6}
              required
              t={t}
              className={`w-full p-3 rounded-lg border outline-none ${baseClasses.input}`}
              toggleClassName={baseClasses.textSub}
            />
            <PasswordInput
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
              placeholder={t('new_password_again')}
              minLength={6}
              required
              t={t}
              className={`w-full p-3 rounded-lg border outline-none ${baseClasses.input}`}
              toggleClassName={baseClasses.textSub}
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className={`w-full text-white py-3 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center ${currentTheme.primary}`}
            >
              {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              {t('save')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
