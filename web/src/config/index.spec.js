import config from './index'

describe('config', () => {
  it('should export apiBaseUrl', () => {
    expect(config).toHaveProperty('apiBaseUrl')
  })

  it('should default apiBaseUrl to localhost', () => {
    expect(config.apiBaseUrl).toBe('http://localhost:8000')
  })
})
