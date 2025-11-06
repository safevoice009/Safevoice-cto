import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../i18n/config';

export default function LanguageSettings() {
  const { i18n, t } = useTranslation();
  const [loading, setLoading] = useState<SupportedLanguage | null>(null);

  const currentLanguage = i18n.language as SupportedLanguage;

  const handleLanguageChange = async (lng: SupportedLanguage) => {
    if (lng === currentLanguage) return;

    setLoading(lng);
    try {
      await i18n.changeLanguage(lng);
      toast.success(t('settings.languageChanged'));
    } catch (error) {
      console.error('Failed to change language:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 space-y-4"
    >
      <div className="flex items-center space-x-2 mb-2">
        <Globe className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-white">{t('settings.language')}</h2>
      </div>
      <p className="text-gray-400 text-sm">
        {t('settings.selectLanguage')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
        {(Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[]).map((lng) => {
          const language = SUPPORTED_LANGUAGES[lng];
          const isSelected = lng === currentLanguage;
          const isLoading = loading === lng;

          return (
            <motion.button
              key={lng}
              onClick={() => handleLanguageChange(lng)}
              disabled={isSelected || isLoading}
              className={`p-4 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/50 cursor-default'
                  : 'bg-surface/50 border-white/10 hover:border-primary/50 hover:bg-surface'
              }`}
              whileHover={!isSelected && !isLoading ? { scale: 1.02 } : {}}
              whileTap={!isSelected && !isLoading ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-start">
                  <span className="text-lg font-semibold text-white">{language.nativeName}</span>
                  <span className="text-sm text-gray-400">{language.name}</span>
                </div>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                ) : isSelected ? (
                  <Check className="w-5 h-5 text-primary" />
                ) : null}
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start space-x-3">
          <Globe className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-300 mb-1">
              {t('settings.languageSupport.title', 'Language Support')}
            </h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• {t('settings.languageSupport.instant', 'Changes apply immediately across the app')}</li>
              <li>• {t('settings.languageSupport.saved', 'Your preference is saved automatically')}</li>
              <li>• {t('settings.languageSupport.rtl', 'Future RTL language support coming soon')}</li>
              <li>• {t('settings.languageSupport.fallback', 'Missing translations fall back to English')}</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
