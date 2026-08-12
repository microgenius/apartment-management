import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { BaseClasses } from '../../types';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  baseClasses: BaseClasses;
}

/** Geri alınamayan işlemler için onay penceresi (silme vb.). */
export const ConfirmModal: React.FC<Props> = ({
  isOpen, title, message, confirmLabel, cancelLabel, onConfirm, onClose, baseClasses
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={`${baseClasses.bgCard} rounded-2xl p-6 w-full max-w-sm`}>
        <h3 className={`text-lg font-bold mb-2 flex items-center ${baseClasses.textMain}`}>
          <AlertTriangle size={20} className="mr-2 text-red-500" /> {title}
        </h3>
        <p className={`text-sm mb-6 ${baseClasses.textSub}`}>{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium"
          >
            {confirmLabel}
          </button>
          <button
            onClick={onClose}
            className={`flex-1 py-3 rounded-lg font-medium border ${baseClasses.border} ${baseClasses.textMain}`}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
