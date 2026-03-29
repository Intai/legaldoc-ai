import { downloadFile } from './browser.js'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('downloadFile', () => {
  it('creates a temporary anchor element, triggers a click, and removes it', () => {
    const mockClick = jest.fn()
    const mockAnchor = {
      href: '',
      download: undefined,
      click: mockClick,
    }
    const createElementSpy = jest.spyOn(window.document, 'createElement').mockReturnValue(mockAnchor)
    const appendChildSpy = jest.spyOn(window.document.body, 'appendChild').mockImplementation(() => {})
    const removeChildSpy = jest.spyOn(window.document.body, 'removeChild').mockImplementation(() => {})

    downloadFile('http://localhost:8000/api/v1/documents/doc-1/pdf')

    expect(createElementSpy).toHaveBeenCalledWith('a')
    expect(mockAnchor.href).toBe('http://localhost:8000/api/v1/documents/doc-1/pdf')
    expect(mockAnchor.download).toBe('')
    expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor)
    expect(mockClick).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor)

    createElementSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })
})
