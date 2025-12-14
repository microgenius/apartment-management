import React, { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';
import { cookies } from '../utils/cookies';

const COOKIE_CONSENT_KEY = 'cookie_consent_accepted';

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAccepted = cookies.exists(COOKIE_CONSENT_KEY);
    if (!hasAccepted) {
      // Show banner after a short delay for better UX
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const handleAccept = () => {
    cookies.set(COOKIE_CONSENT_KEY, 'true', 365); // Store for 1 year
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="bg-white dark:bg-slate-800 border-t-2 border-blue-500 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-shrink-0 mt-1">
                <Cookie className="text-blue-500" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                  Çerez Kullanımı
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Bu site, kullanıcı deneyimini iyileştirmek için tema, dil ve görüntüleme tercihlerinizi 
                  saklamak amacıyla çerezler kullanmaktadır. Bu çerezler yalnızca yerel cihazınızda saklanır 
                  ve kişisel verileriniz üçüncü taraflarla paylaşılmaz.
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleAccept}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
