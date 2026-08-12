import React from 'react';
import { Info, User, MapPin, Phone, Building } from 'lucide-react';
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

export const InfoView: React.FC<InfoViewProps> = ({ 
  baseClasses, 
  currentTheme, 
  t, 
  darkMode 
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
    </div>
  );
};
