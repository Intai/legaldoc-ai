import defaultConfig from './default.js'
import productionConfig from './production.js'
import testConfig from './test.js'

const configs = {
  production: productionConfig,
  test: testConfig,
}

const mode = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.MODE
  : 'test'

const config = { ...defaultConfig, ...(configs[mode] || {}) }

export default config
