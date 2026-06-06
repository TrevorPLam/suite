import React, { useEffect, useState } from 'react';
import { I18nextProvider, useTranslation as useTranslationBase } from 'react-i18next';
import i18n, { resources, defaultNS } from './config';

export interface I18nProviderProps {
  children: React.ReactNode;
  locale?: string;
}

/**
 * I18nProvider - Wraps the application with i18next internationalization support
 *
 * Features:
 * - Automatic locale detection from browser/localStorage
 * - RTL (right-to-left) language support
 * - Locale switching capability
 * - Translation key namespace organization
 *
 * @example
 * ```tsx
 * <I18nProvider locale="en">
 *   <App />
 * </I18nProvider>
 * ```
 */
export function I18nProvider({ children, locale }: I18nProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
    setIsReady(true);
  }, [locale]);

  useEffect(() => {
    // Apply RTL class to HTML element based on language direction
    const dir = i18n.dir(i18n.language);
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  if (!isReady) {
    return null;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

/**
 * useTranslation - Hook for accessing translations
 *
 * @example
 * ```tsx
 * const { t } = useTranslation();
 * const message = t('common.save');
 * ```
 */
export function useTranslation(namespace?: string) {
  return useTranslationBase(namespace || defaultNS);
}

export { i18n, resources, defaultNS };
