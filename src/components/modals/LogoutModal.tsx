import React from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  t: (key: string) => string;
  darkMode: boolean;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  t,
  darkMode
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} overflow-hidden animate-scale-in`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gradient-to-r from-red-50 to-orange-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="text-red-500" size={24} />
              </div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {t('logout_confirm_title')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {t('logout_confirm_message')}
          </p>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${darkMode ? 'border-slate-700 bg-slate-900/30' : 'border-gray-100 bg-gray-50'} flex gap-3 justify-end`}>
          <button
            onClick={onClose}
            className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
              darkMode 
                ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
            }`}
          >
            {t('logout_cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <LogOut size={18} />
            {t('logout_confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
