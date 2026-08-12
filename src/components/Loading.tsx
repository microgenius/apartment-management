import React from 'react';
import { Loader2 } from 'lucide-react';
import type { BaseClasses, Theme } from '../types';

interface Props {
  baseClasses: BaseClasses;
  currentTheme: Theme;
  t: (key: string) => string;
}

/**
 * Veri beklenirken gösterilen ortak yükleniyor göstergesi.
 *
 * Bunun olmadığı yerlerde ekran boş listeyle render ediliyordu ve kullanıcı
 * "kayıt yok" ile "henüz gelmedi" arasındaki farkı göremiyordu.
 */
export const Loading: React.FC<Props> = ({ baseClasses, currentTheme, t }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-3" role="status" aria-live="polite">
    <Loader2 className={`animate-spin ${currentTheme.text}`} size={32} />
    <p className={`text-sm ${baseClasses.textSub}`}>{t('loading')}</p>
  </div>
);
