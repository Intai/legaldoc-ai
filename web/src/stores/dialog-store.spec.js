import { renderHook } from '@testing-library/react'
import { useDialog, useDialogStore } from './dialog-store'

beforeEach(() => {
  useDialogStore.setState({ stack: [] })
})

describe('dialog-store', () => {
  it('should have initial state with empty stack', () => {
    const state = useDialogStore.getState()

    expect(state.stack).toEqual([])
  })

  it('should push error dialog onto stack', () => {
    const apiError = { message: 'Document not found', code: 'NOT_FOUND' }

    useDialogStore.getState().error(apiError)
    const state = useDialogStore.getState()

    expect(state.stack).toHaveLength(1)
    expect(state.stack[0]).toEqual({
      variant: 'error',
      title: 'Something went wrong',
      description: 'Document not found',
    })
  })

  it('should use fallback description when API error has no message', () => {
    useDialogStore.getState().error({})
    const state = useDialogStore.getState()

    expect(state.stack).toHaveLength(1)
    expect(state.stack[0].description).toBe(
      'An unexpected error occurred. Please try again later.',
    )
  })

  it('should stack multiple dialogs', () => {
    useDialogStore.getState().error({ message: 'First error', code: 'ERR1' })
    useDialogStore.getState().error({ message: 'Second error', code: 'ERR2' })
    const state = useDialogStore.getState()

    expect(state.stack).toHaveLength(2)
    expect(state.stack[0].description).toBe('First error')
    expect(state.stack[1].description).toBe('Second error')
  })

  it('should pop the top dialog when close is called', () => {
    useDialogStore.getState().error({ message: 'First error', code: 'ERR1' })
    useDialogStore.getState().error({ message: 'Second error', code: 'ERR2' })
    useDialogStore.getState().close()
    const state = useDialogStore.getState()

    expect(state.stack).toHaveLength(1)
    expect(state.stack[0].description).toBe('First error')
  })

  it('should have empty stack after closing all dialogs', () => {
    useDialogStore
      .getState()
      .error({ message: 'Some error', code: 'ERR' })
    useDialogStore.getState().close()
    const state = useDialogStore.getState()

    expect(state.stack).toEqual([])
  })
})

describe('useDialog', () => {
  it('should return closed state when stack is empty', () => {
    const { result } = renderHook(() => useDialog())

    expect(result.current.open).toBe(false)
    expect(result.current.title).toBe('')
    expect(result.current.description).toBe('')
    expect(result.current.variant).toBe('')
  })

  it('should return the latest dialog from the stack', () => {
    useDialogStore.getState().error({ message: 'First error', code: 'ERR1' })
    useDialogStore.getState().error({ message: 'Second error', code: 'ERR2' })

    const { result } = renderHook(() => useDialog())

    expect(result.current.open).toBe(true)
    expect(result.current.description).toBe('Second error')
  })

  it('should reveal previous dialog after closing the top one', () => {
    useDialogStore.getState().error({ message: 'First error', code: 'ERR1' })
    useDialogStore.getState().error({ message: 'Second error', code: 'ERR2' })
    useDialogStore.getState().close()

    const { result } = renderHook(() => useDialog())

    expect(result.current.open).toBe(true)
    expect(result.current.description).toBe('First error')
  })
})
