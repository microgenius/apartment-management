import React, { useState } from 'react';
import { Building2, User, Lock, AlertCircle, Loader2, Globe, Palette } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cookies } from '../../utils/cookies';
import { TRANSLATIONS, LANGUAGES, isLanguage } from '../../constants/translations';
import { THEMES } from '../../constants/themes';
import type { Language, ThemeName } from '../../types';
import { createTranslator, DIAL_CODES, isEmail } from '../../utils/helpers';
import { COUNTRIES } from '../../constants/countries';

export const LoginPage: React.FC = () => {
  // Email ya da telefon numarası olabilir - ayrımı AuthContext yapıyor
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  
  // Read preferences from cookies
  const [lang, setLang] = useState<Language>(() => {
    const saved = cookies.get('app_language');
    return isLanguage(saved) ? saved : 'tr';
  });
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = cookies.get('app_theme');
    return (saved === 'blue' || saved === 'green' || saved === 'purple' || saved === 'orange') ? saved as ThemeName : 'blue';
  });
  
  const t = createTranslator(TRANSLATIONS, lang);
  const currentTheme = THEMES[theme];

  // Ülke kodu: dil seçimine göre başlar, kullanıcı değiştirebilir.
  // Numarasını "+" veya "00" ile yazan kullanıcıda bu seçim zaten yok sayılır.
  const [dialCode, setDialCode] = useState<string>(DIAL_CODES[lang]);

  // Girdinin telefon gibi göründüğü durumda ülke seçicisini göster.
  // Email yazanları ya da kodu kendi yazanları gereksiz alanla meşgul etmiyoruz.
  const showCountry =
    identifier.trim() !== '' && !isEmail(identifier) && !identifier.trim().startsWith('+');

  const handleLangChange = (newLang: Language) => {
    setLang(newLang);
    setDialCode(DIAL_CODES[newLang]);
    cookies.set('app_language', newLang, 365);
  };
  
  const handleThemeChange = (newTheme: ThemeName) => {
    setTheme(newTheme);
    cookies.set('app_theme', newTheme, 365);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(identifier, password, dialCode);
      if (error) {
        setError(error.message === 'INVALID_PHONE' ? t('login_error_phone') : t('login_error'));
      }
    } catch {
      setError(t('login_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Language & Theme Switchers */}
        <div className="absolute top-4 right-4 flex gap-2">
          {/* Language Switcher */}
          <div className="relative group">
            <button className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2">
              <Globe size={20} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{lang.toUpperCase()}</span>
            </button>
            <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => handleLangChange(code)}
                  className={`w-full px-4 py-2 text-left whitespace-nowrap hover:bg-gray-50 ${lang === code ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Theme Switcher */}
          <div className="relative group">
            <button className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all">
              <Palette size={20} className={currentTheme.text.replace('text-', 'text-')} />
            </button>
            <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={() => handleThemeChange('blue')} className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">Blue</span>
              </button>
              <button onClick={() => handleThemeChange('green')} className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Green</span>
              </button>
              <button onClick={() => handleThemeChange('purple')} className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                <span className="text-gray-700">Purple</span>
              </button>
              <button onClick={() => handleThemeChange('orange')} className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                <span className="text-gray-700">Orange</span>
              </button>
            </div>
          </div>
        </div>

      {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className={"inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg " + currentTheme.primary}>
            <Building2 className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('apartment_name')}</h1>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
            <h2 className="text-2xl font-bold text-center text-gray-800">{t('login_title')}</h2>
            <p className="text-center text-gray-600 text-sm mt-1">{t('login_subtitle')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} autoComplete="on" className="p-8">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="text-red-500 mt-0.5 mr-2 flex-shrink-0" size={18} />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Email veya Telefon */}
            <div className="mb-5">
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                {t('identifier_label')}
              </label>
              <div className="flex gap-2">
                {showCountry && (
                  <select
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    aria-label={t('country_code')}
                    className="w-28 shrink-0 px-2 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  >
                    {COUNTRIES.map(({ code, name, flag }) => (
                      <option key={code} value={code}>{flag} +{code} {name}</option>
                    ))}
                  </select>
                )}
                <div className="relative flex-1">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    id="identifier"
                    name="identifier"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder={t('identifier_placeholder')}
                    required
                  />
                </div>
              </div>
              {showCountry && (
                <p className="text-xs text-gray-500 mt-1">{t('country_code_hint')}</p>
              )}
            </div>

            {/* Password */}
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('password_label')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder={t('password_placeholder')}
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={"w-full text-white py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center " + currentTheme.primary + " hover:opacity-90"}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  {t('login_loading')}
                </>
              ) : (
                <>{t('login_button')}</>
              )}
            </button>

            {/* Additional Info */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                {t('login_no_account')}
              </p>
            </div>
          </form>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} {t('login_footer')}
          </p>
        </div>
      </div>
    </div>
  );
};
