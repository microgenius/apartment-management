import React, { useState } from 'react';
import { Info, User, MapPin, Phone, Building, Landmark, Copy, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { InfoViewProps, InfoItem } from '../../types';
import { useInfo } from '../../hooks/useInfo';
import { Loading } from '../Loading';

// Role to display config mapping
const roleConfig: Record<InfoItem['role'], {
  titleKey: string;
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  manager: {
    titleKey: 'manager_title',
    icon: User,
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
    borderColor: 'border-green-500'
  },
  assistant: {
    titleKey: 'assistant_title',
    icon: User,
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
    borderColor: 'border-green-500'
  },
  muhtar: {
    titleKey: 'muhtar_title',
    icon: MapPin,
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-600',
    borderColor: 'border-yellow-500'
  },
  municipality: {
    titleKey: 'municipality_title',
    icon: Building,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-500'
  }
};

/** IBAN'ı 4'erli gruplayarak okunur hale getirir; kopyalanırken
 *  boşluksuz hali gidiyor (banka uygulamaları için). */
const groupIban = (iban: string) =>
  (iban.replace(/\s/g, '').match(/.{1,4}/g) || []).join(' ');

export const InfoView: React.FC<InfoViewProps> = ({ 
  baseClasses, 
  currentTheme, 
  t, 
  darkMode,
  bankInfo
}) => {
  const { infoItems, loading } = useInfo();

  if (loading) {
    return (
      <div className="p-4 animate-fade-in">
        <h2 className={`text-2xl font-bold mb-6 flex items-center ${baseClasses.textMain}`}>
          <Info className={`mr-2 ${currentTheme.text}`} /> {t('info')}
        </h2>
        <Loading baseClasses={baseClasses} currentTheme={currentTheme} t={t} />
      </div>
    );
  }

  return (
    <div className="p-4 animate-fade-in">
      <h2 className={`text-2xl font-bold mb-6 flex items-center ${baseClasses.textMain}`}>
        <Info className={`mr-2 ${currentTheme.text}`} /> {t('info')}
      </h2>
      
      {infoItems.length === 0 && !loading ? (
        <div className={`text-center py-8 ${baseClasses.textSub}`}>
          {t('no_info_available') || 'Henüz iletişim bilgisi eklenmemiş'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {infoItems.map((item) => {
            const config = roleConfig[item.role];
            const IconComponent = config.icon;
            
            return (
              <div 
                key={item.id} 
                className={`p-6 rounded-xl shadow-sm border-l-4 ${config.borderColor} hover:shadow-md transition-all ${baseClasses.bgCard}`}
              >
                <div className="flex items-center mb-4">
                  <div className={`${config.bgColor} p-3 rounded-full mr-4`}>
                    <IconComponent className={config.textColor} size={24} />
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg ${baseClasses.textMain}`}>
                      {t(config.titleKey)}
                    </h3>
                    <p className={`font-medium ${baseClasses.textSub}`}>{item.name}</p>
                  </div>
                </div>
                <div className={`flex items-center p-3 rounded-lg border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'} ${baseClasses.textMain}`}>
                  <Phone size={18} className={`mr-3 ${config.textColor}`} />
                  <span className="font-mono text-lg">{item.phone}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(bankInfo.iban || bankInfo.holder) && (
      <div className={`mt-6 p-6 rounded-xl shadow-sm border-l-4 border-indigo-500 ${baseClasses.bgCard}`}>
        <div className="flex items-center mb-4">
          <div className="bg-indigo-100 p-3 rounded-full mr-4">
            <Landmark className="text-indigo-600" size={24} />
          </div>
          <h3 className={`font-bold text-lg ${baseClasses.textMain}`}>{t('bank_info_title')}</h3>
        </div>
        <div className="space-y-3">
          {bankInfo.iban && (
            <CopyRow label={t('iban')} value={groupIban(bankInfo.iban)} copyValue={bankInfo.iban.replace(/\s/g, '')} baseClasses={baseClasses} darkMode={darkMode} t={t} />
          )}
          {bankInfo.holder && (
            <CopyRow label={t('account_holder')} value={bankInfo.holder} baseClasses={baseClasses} darkMode={darkMode} t={t} />
          )}
        </div>
      </div>
      )}
    </div>
  );
};

const CopyRow: React.FC<{
  label: string;
  value: string;
  copyValue?: string;
  baseClasses: InfoViewProps['baseClasses'];
  darkMode: boolean;
  t: InfoViewProps['t'];
}> = ({ label, value, copyValue, baseClasses, darkMode, t }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(copyValue ?? value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={t('copy')}
      className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-colors ${darkMode ? 'bg-slate-900 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
    >
      <div className="min-w-0">
        <p className={`text-xs uppercase tracking-wide ${baseClasses.textSub}`}>{label}</p>
        <p className={`font-mono text-sm sm:text-base break-all ${baseClasses.textMain}`}>{value}</p>
      </div>
      {copied
        ? <span className="flex items-center shrink-0 text-green-600 text-sm"><Check size={18} className="mr-1" />{t('copied')}</span>
        : <Copy size={18} className={`shrink-0 ${baseClasses.textSub}`} />}
    </button>
  );
};
