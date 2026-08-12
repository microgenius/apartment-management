import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  t: (key: string) => string;
  placeholder?: string;
  /** Girdinin kendi sınıfları - açık/koyu tema farkı çağıran tarafta */
  className?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  id?: string;
  name?: string;
  /** Solda gösterilecek ikon (varsa girdi soldan boşluklu render edilir) */
  leftIcon?: React.ReactNode;
  /** Göster/gizle düğmesinin rengi - koyu temada okunabilir olsun diye */
  toggleClassName?: string;
}

/**
 * Göster/gizle düğmeli şifre alanı.
 *
 * Tek bileşen: giriş, şifre değiştirme ve yönetici şifre atama ekranlarının
 * hepsinde aynı davranış olsun ve göz ikonu beş yerde ayrı ayrı yazılmasın.
 * Varsayılan gizli - omuz üstünden okunmasın; kullanıcı isterse açar.
 */
export const PasswordInput: React.FC<Props> = ({
  value, onChange, t, placeholder, className = '', autoComplete, required,
  minLength, id, name, leftIcon, toggleClassName = 'text-gray-400 hover:text-gray-600'
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {leftIcon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {leftIcon}
        </span>
      )}
      <input
        type={visible ? 'text' : 'password'}
        id={id}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className={`${leftIcon ? 'pl-11' : ''} pr-11 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={t(visible ? 'hide_password' : 'show_password')}
        title={t(visible ? 'hide_password' : 'show_password')}
        className={`absolute right-3 top-1/2 -translate-y-1/2 ${toggleClassName}`}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};
