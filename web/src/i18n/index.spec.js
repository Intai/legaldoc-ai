import i18n from './index'

describe('i18n', () => {
  it('should initialize with English as the default language', () => {
    expect(i18n.language).toBe('en')
  })

  it('should set English as the fallback language', () => {
    expect(i18n.options.fallbackLng).toEqual(['en'])
  })

  it('should disable interpolation escaping', () => {
    expect(i18n.options.interpolation.escapeValue).toBe(false)
  })

  it('should load English translations under the translation namespace', () => {
    const bundle = i18n.getResourceBundle('en', 'translation')
    expect(bundle).toBeDefined()
    expect(bundle.documents.title).toBe('Documents')
  })

  it('should resolve a translation key to the expected value', () => {
    expect(i18n.t('documents.title')).toBe('Documents')
  })

  it('should resolve interpolated translation keys', () => {
    expect(i18n.t('documents.pages', { count: 5 })).toBe('5 pages')
  })
})
