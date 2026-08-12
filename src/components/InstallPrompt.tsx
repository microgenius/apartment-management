import React, { useState, useEffect } from 'react';
import { Share, X, Smartphone } from 'lucide-react';
import { cookies } from '../utils/cookies';

const DISMISS_KEY = 'install_prompt_dismissed';

/** Chrome'un kurulum önerisi olayı - tip tanımı standartta yok */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Props {
  t: (key: string) => string;
}

/** İpucunun gösterilebileceği bir ortam mı? (mobil, kurulmamış, kapatılmamış) */
const canShowHint = (): boolean => {
  if (cookies.exists(DISMISS_KEY)) return false;

  // Ana ekrandan açıldıysa anlamsız. iOS ayrı bir bayrak kullanıyor.
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return false;

  return window.matchMedia('(max-width: 767px)').matches;
};

const isIOSDevice = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * "Ana ekrana ekle" ipucu - yalnızca mobilde.
 *
 * İki ayrı dünya var:
 *  - Android/Chrome: beforeinstallprompt olayını yakalayıp kendi düğmemizle
 *    tarayıcının kurulum penceresini açabiliyoruz.
 *  - iOS/Safari: böyle bir API yok, kullanıcı Paylaş menüsünden elle
 *    eklemek zorunda. Bu yüzden orada düğme değil yönerge gösteriyoruz -
 *    aksi halde çalışmayan bir düğme koymuş oluruz.
 *
 * Uygulama zaten ana ekrandan açılmışsa hiç gösterilmiyor.
 */
export const InstallPrompt: React.FC<Props> = ({ t }) => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS] = useState(isIOSDevice);
  // iOS'ta kurulum olayı hiç gelmediği için ipucu baştan görünür olmalı;
  // diğer tarayıcılarda olay gelene kadar bekliyoruz.
  const [visible, setVisible] = useState(() => canShowHint() && isIOSDevice());

  useEffect(() => {
    if (isIOS || !canShowHint()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // tarayıcının kendi çubuğu yerine kendi ipucumuz
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [isIOS]);

  const dismiss = () => {
    cookies.set(DISMISS_KEY, 'true', 60); // 60 gün sonra tekrar sorabilir
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-3">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Smartphone className="text-blue-600 shrink-0 mt-0.5" size={22} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm">{t('install_title')}</p>

            {isIOS ? (
              <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-1">
                {t('install_ios_step1')}
                <Share size={13} className="inline text-blue-600" />
                {t('install_ios_step2')}
              </p>
            ) : (
              <p className="text-xs text-slate-600 mt-1">{t('install_desc')}</p>
            )}

            {!isIOS && (
              <button
                onClick={install}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg"
              >
                {t('install_button')}
              </button>
            )}
          </div>

          <button
            onClick={dismiss}
            aria-label={t('close')}
            className="text-slate-400 hover:text-slate-600 shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
