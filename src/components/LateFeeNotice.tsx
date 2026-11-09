import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { BaseClasses } from '../types';
import type { LateFeeConfig } from '../utils/helpers';

interface Props {
  baseClasses: BaseClasses;
  t: (key: string) => string;
  darkMode: boolean;
  /** Kişinin kendi borcuna işleyecek faiz. Verilirse uyarı kişiselleşiyor. */
  myLateFee?: number;
  /** Oran ve süreler ayarlardan geliyor; metin de ona göre yazılıyor. */
  config: LateFeeConfig;
}

const money = (n: number) =>
  `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

/**
 * Gecikme faizi bildirimi.
 *
 * Genel kurul faizi zorunlu olmaktan çıkardı: borca eklenmiyor, yalnızca
 * alacak icra/mahkeme yoluna giderse talep edilecek. Bildirimin amacı da bu
 * koşulu anlatmak - bu yüzden metin kuralı, altındaki tutar da o durumda
 * ne kadar olacağını söylüyor.
 *
 * Renk bilinçli olarak her zaman amber: tutar tahsil edilen bir borç değil,
 * kırmızı uyarı olarak göstermek yanlış izlenim verirdi.
 */
export const LateFeeNotice: React.FC<Props> = ({ baseClasses, t, darkMode, myLateFee, config }) => {
  const hasFee = (myLateFee ?? 0) > 0.005;

  return (
    <div
      className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
        darkMode ? 'border-amber-900/40 bg-amber-900/15' : 'border-amber-300 bg-amber-50'
      }`}
      role="note"
    >
      <AlertTriangle size={20} className="shrink-0 mt-0.5 text-amber-500" />
      <div className="min-w-0">
        <p className={`font-bold text-sm ${baseClasses.textMain}`}>{t('late_fee_title')}</p>
        <p className={`text-sm mt-1 ${baseClasses.textSub}`}>
          {t('late_fee_rule')
            .replace('{months}', String(config.graceMonths))
            .replace('{rate}', String(+(config.rate * 100).toFixed(2)))
            .replace('{days}', String(config.graceDays))}
        </p>
        {hasFee && (
          <p className="text-sm mt-2 font-bold text-amber-600">
            {t('late_fee_yours')}: {money(myLateFee!)}
          </p>
        )}
      </div>
    </div>
  );
};
