'use client'

import { useCallback, useMemo } from 'react'

export type Locale = 'en' | 'bn'

export type TranslationDictionary = {
  common: Record<string, string>
  nav: Record<string, string>
  auth: Record<string, string>
}

export const en: TranslationDictionary = {
  common: {
    loading: 'Loading...',
    error: 'Something went wrong',
    save: 'Save',
    cancel: 'Cancel',
    retry: 'Retry',
    download: 'Download',
    submit: 'Submit',
    search: 'Search',
    noResults: 'No results found',
  },
  nav: {
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    offerings: 'Offerings',
    members: 'Members',
    funds: 'Funds',
    reports: 'Reports',
    preferences: 'Preferences',
    settings: 'Settings',
    billing: 'Billing',
    memberPortal: 'Member Portal',
    giveOnline: 'Give Online',
  },
  auth: {
    signIn: 'Sign In',
    signOut: 'Sign Out',
    email: 'Email Address',
    password: 'Password',
  },
}

export const bn: TranslationDictionary = {
  common: {
    loading: 'লোড হচ্ছে...',
    error: 'কিছু একটা ভুল হয়েছে',
    save: 'সংরক্ষণ',
    cancel: 'বাতিল',
    retry: 'আবার চেষ্টা করুন',
    download: 'ডাউনলোড',
    submit: 'জমা দিন',
    search: 'খুঁজুন',
    noResults: 'কোনো ফলাফল পাওয়া যায়নি',
  },
  nav: {
    dashboard: 'ড্যাশবোর্ড',
    transactions: 'লেনদেন',
    offerings: 'দান',
    members: 'সদস্য',
    funds: 'তহবিল',
    reports: 'রিপোর্ট',
    preferences: 'পছন্দসমূহ',
    settings: 'সেটিংস',
    billing: 'বিলিং',
    memberPortal: 'সদস্য পোর্টাল',
    giveOnline: 'অনলাইনে দান',
  },
  auth: {
    signIn: 'সাইন ইন',
    signOut: 'সাইন আউট',
    email: 'ইমেইল ঠিকানা',
    password: 'পাসওয়ার্ড',
  },
}

export type TranslationNamespace = keyof TranslationDictionary

const translations: Record<Locale, TranslationDictionary> = {
  en,
  bn,
}

function resolveKey(
  dict: TranslationDictionary,
  namespace: TranslationNamespace | undefined,
  key: string
): string {
  if (namespace) {
    const section = dict[namespace]
    return section[key] ?? key
  }

  for (const section of Object.values(dict)) {
    if (key in section) {
      return section[key] ?? key
    }
  }

  return key
}

function resolveLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem('church-finance-locale')
  if (stored === 'bn' || stored === 'en') return stored
  const browser = navigator.language?.toLowerCase() ?? ''
  if (browser.startsWith('bn')) return 'bn'
  return 'en'
}

export function useTranslations(namespace?: TranslationNamespace) {
  const locale = useMemo(() => resolveLocale(), [])
  const dict = translations[locale]

  const t = useCallback(
    (key: string) => resolveKey(dict, namespace, key),
    [dict, namespace]
  )

  return useMemo(() => ({ t, locale }), [t, locale])
}

export function setLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('church-finance-locale', locale)
  }
}

export function getDictionary(locale: Locale = 'en'): TranslationDictionary {
  return translations[locale]
}
