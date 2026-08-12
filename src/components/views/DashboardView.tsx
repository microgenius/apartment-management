import React from 'react';
import { MapPin, Eye, EyeOff, X, User } from 'lucide-react';
import type { DashboardViewProps } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { canEditResident } from '../../utils/permissions';
import { ResidentContacts } from '../ResidentContacts';

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  userRole, 
  residents, 
  setSelectedApartment, 
  selectedApartment, 
  calculateTotalDebt,
  getResidentLedgerWithPlanning, 
  baseClasses, 
  currentTheme, 
  t,
  darkMode,
  contacts,
  refetchContacts
}) => {
  const { userProfile } = useAuth();

  return (
  <div className="p-4 animate-fade-in">
    <div className="flex justify-between items-center mb-6">
      <h2 className={`text-2xl font-bold ${baseClasses.textMain} flex items-center`}>
        <MapPin className={`mr-2 ${currentTheme.text}`} /> {t('map_title')}
      </h2>
      <div className={`flex items-center text-xs px-3 py-1 rounded-full border ${baseClasses.border} ${baseClasses.textSub}`}>
        {userRole === 'admin' ? <Eye size={14} className="mr-2 text-green-500"/> : <EyeOff size={14} className="mr-2 text-slate-400"/>}
        {userRole === 'admin' ? t('manager_view_desc') : t('resident_view_desc')}
      </div>
    </div>

    <div className={`p-4 sm:p-6 rounded-xl shadow-sm border ${baseClasses.bgCard}`}>
      <div className="grid gap-3 sm:gap-4 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
        {residents.map((apt) => {
          const aptLedger = getResidentLedgerWithPlanning(apt);
          const totalDebt = calculateTotalDebt(aptLedger);
          const isAdmin = userRole === 'admin';
          
          let borderColorClass = baseClasses.border;
          let bgClass = '';
          
          if (isAdmin) {
            borderColorClass = totalDebt > 0 ? 'border-red-500/30' : 'border-green-500/30';
            bgClass = totalDebt > 0 ? (darkMode?'bg-red-900/10':'bg-red-50') : (darkMode?'bg-green-900/10':'bg-green-50');
          } else {
            borderColorClass = baseClasses.border;
            bgClass = darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50';
          }

          return (
            <button 
              key={apt.id} 
              onClick={() => setSelectedApartment(apt)}
              className={`p-3 rounded-xl border-2 transition-all hover:scale-105 flex flex-col items-center justify-center min-h-[118px] relative overflow-hidden group ${borderColorClass} ${bgClass}`}
            >
              {apt.status === 'Boş' && (
                <div className="absolute top-0 right-0 bg-slate-500 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold">
                  {t('empty_flat')}
                </div>
              )}
              
              <span className={`font-bold text-xl ${isAdmin ? (totalDebt > 0 ? 'text-red-500' : 'text-green-600') : baseClasses.textMain}`}>
                No: {apt.door}
              </span>

              {/* Eski numara: sakinlerin çoğu ve eski defterler hâlâ bunu kullanıyor */}
              <span className={`text-[11px] mb-1 h-4 ${baseClasses.textSub}`}>
                {apt.old_door ? `${t('old_door_short')}: ${apt.old_door}` : ''}
              </span>

              <div className="flex flex-col items-center text-center w-full">
                <span className={`text-sm font-medium leading-tight px-1 ${baseClasses.textMain}`}>
                  {apt.name}
                </span>
                
                {isAdmin && (
                  <span className={`text-xs font-bold mt-2 ${totalDebt > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {totalDebt > 0 ? `${totalDebt} TL ${t('debt')}` : t('no_debt')}
                  </span>
                )}
                
                {!isAdmin && (
                  <span className={`text-xs mt-2 ${baseClasses.textSub}`}>
                    {t('contact_info')}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
    
    {/* Apartment Details Modal */}
    {selectedApartment && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className={`${baseClasses.bgCard} rounded-2xl p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto`}>
          <button 
            onClick={() => setSelectedApartment(null)} 
            className={`absolute top-4 right-4 ${baseClasses.textSub} hover:text-red-500`}
          >
            <X size={24} />
          </button>
          <div className="text-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-slate-700' : currentTheme.light}`}>
              <User size={32} className={currentTheme.text} />
            </div>
            <h3 className={`text-xl font-bold ${baseClasses.textMain}`}>
              {t('flat')} {selectedApartment.door}
            </h3>
            {selectedApartment.old_door && (
              <p className={`text-xs ${baseClasses.textSub}`}>
                {t('old_door')}: {selectedApartment.old_door}
              </p>
            )}
            <p className={baseClasses.textSub}>
              {selectedApartment.status === 'Boş' ? `${t('owner')}` : t('resident')}
            </p>
          </div>
          
          <div className="space-y-4">
            <div className={`flex justify-between border-b pb-2 ${baseClasses.border}`}>
              <span className={baseClasses.textSub}>{t('name')}:</span>
              <span className={`font-medium ${baseClasses.textMain}`}>{selectedApartment.name}</span>
            </div>
            <div className={`flex justify-between border-b pb-2 ${baseClasses.border}`}>
              <span className={baseClasses.textSub}>{t('contact')}:</span>
              <span className={`font-medium ${baseClasses.textMain}`}>{selectedApartment.phone}</span>
            </div>
            
            {userRole === 'admin' && (() => {
              const selectedLedger = getResidentLedgerWithPlanning(selectedApartment);
              const selectedDebt = calculateTotalDebt(selectedLedger);
              return (
                <div className={`flex justify-between border-b pb-2 ${baseClasses.border}`}>
                  <span className={baseClasses.textSub}>{t('debt_status')}:</span>
                  <span className={`font-bold ${selectedDebt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {selectedDebt > 0 ? `${selectedDebt} TL` : t('no_debt')}
                  </span>
                </div>
              );
            })()}
          </div>

          <ResidentContacts
            residentId={selectedApartment.id}
            contacts={contacts.filter((c) => c.resident_id === selectedApartment.id)}
            canEdit={canEditResident(userProfile, selectedApartment.id)}
            onChanged={refetchContacts}
            baseClasses={baseClasses}
            currentTheme={currentTheme}
            t={t}
            darkMode={darkMode}
          />

          <button
            onClick={() => setSelectedApartment(null)} 
            className={`w-full mt-6 text-white py-3 rounded-lg font-medium hover:opacity-90 ${darkMode ? 'bg-slate-700' : 'bg-slate-800'}`}
          >
            {t('close')}
          </button>
        </div>
      </div>
    )}
  </div>
);
};
