import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../i18n/config';

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { i18n, t } = useTranslation();

  const currentLanguage = i18n.language as SupportedLanguage;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLanguageChange = async (lng: SupportedLanguage) => {
    await i18n.changeLanguage(lng);
    setIsOpen(false);
    toast.success(t('settings.languageChanged'));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-surface/50 hover:bg-surface text-gray-300 hover:text-white transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={t('settings.changeLanguage')}
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{SUPPORTED_LANGUAGES[currentLanguage]?.nativeName || 'EN'}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-56 glass border border-white/10 rounded-lg overflow-hidden z-50"
          >
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-white/10">
                {t('settings.selectLanguage')}
              </div>
              <div className="mt-2 space-y-1">
                {(Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[]).map((lng) => {
                  const language = SUPPORTED_LANGUAGES[lng];
                  const isSelected = lng === currentLanguage;
                  
                  return (
                    <motion.button
                      key={lng}
                      onClick={() => handleLanguageChange(lng)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all ${
                        isSelected
                          ? 'bg-primary/20 text-primary font-medium'
                          : 'hover:bg-white/5 text-gray-300 hover:text-white'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-sm">{language.nativeName}</span>
                        <span className="text-xs text-gray-400">{language.name}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
