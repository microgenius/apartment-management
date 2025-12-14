import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  darkMode?: boolean;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  darkMode = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-xl shadow-2xl max-w-md w-full border overflow-hidden animate-scale-in`}>
        {/* Header */}
        <div className="p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 rounded-full p-2">
              <AlertCircle className="text-red-600" size={24} />
            </div>
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} rounded-lg p-1 transition-colors`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className={`${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'} px-6 py-4 flex justify-end`}>
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
