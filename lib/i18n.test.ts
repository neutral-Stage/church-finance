import { describe, expect, it } from 'vitest'
import { en, bn, useTranslations, getDictionary } from './i18n'
import { renderHook } from '@testing-library/react'

describe('i18n', () => {
  it('exposes English strings', () => {
    expect(en.common.loading).toBe('Loading...')
    expect(en.nav.dashboard).toBe('Dashboard')
  })

  it('exposes Bengali strings', () => {
    expect(bn.common.loading).toBe('লোড হচ্ছে...')
    expect(bn.nav.dashboard).toBe('ড্যাশবোর্ড')
    expect(bn.nav.offerings).toBe('দান')
  })

  it('getDictionary returns locale dictionaries', () => {
    expect(getDictionary('bn').nav.members).toBe('সদস্য')
  })

  it('useTranslations returns keys from a namespace', () => {
    const { result } = renderHook(() => useTranslations('auth'))
    expect(result.current.t('signIn')).toBe('Sign In')
    expect(result.current.locale).toBe('en')
  })
})
