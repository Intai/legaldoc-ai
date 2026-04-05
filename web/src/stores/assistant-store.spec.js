import { Subject } from 'rxjs'
import { useDialogStore } from './dialog-store'
import { useAssistantStore } from './assistant-store'
import { fetchSSE } from '../utils/api.js'

jest.mock('../utils/api.js', () => ({
  fetchSSE: jest.fn(),
}))

const initialState = {
  query: '',
  answer: '',
  sources: [],
  loading: false,
  error: null,
  editing: false,
  open: false,
}

beforeEach(() => {
  fetchSSE.mockReset()
  useAssistantStore.setState(initialState)
})

describe('assistant-store', () => {
  it('should have correct initial state values', () => {
    const state = useAssistantStore.getState()

    expect(state.query).toBe('')
    expect(state.answer).toBe('')
    expect(state.sources).toEqual([])
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.editing).toBe(false)
    expect(state.open).toBe(false)
  })

  it('should set query and mark editing as true', () => {
    useAssistantStore.setState({ open: true })

    useAssistantStore.getState().setQuery('What is a contract?')

    expect(useAssistantStore.getState().query).toBe('What is a contract?')
    expect(useAssistantStore.getState().editing).toBe(true)
    expect(useAssistantStore.getState().open).toBe(false)
  })

  it('should not submit when query is empty or whitespace', () => {
    useAssistantStore.setState({ query: '   ' })

    useAssistantStore.getState().submitQuery()

    expect(fetchSSE).not.toHaveBeenCalled()
    expect(useAssistantStore.getState().loading).toBe(false)
  })

  it('should set loading and open when submitting a query', () => {
    const subject = new Subject()
    fetchSSE.mockReturnValue(subject)
    useAssistantStore.setState({ query: 'test query' })

    useAssistantStore.getState().submitQuery()

    expect(fetchSSE).toHaveBeenCalledWith('/v1/assistant/query', {
      query: 'test query',
    })
    expect(useAssistantStore.getState().loading).toBe(true)
    expect(useAssistantStore.getState().editing).toBe(false)
    expect(useAssistantStore.getState().open).toBe(true)
    expect(useAssistantStore.getState().answer).toBe('')
    expect(useAssistantStore.getState().sources).toEqual([])
    expect(useAssistantStore.getState().error).toBeNull()

    subject.complete()
  })

  it('should append tokens to answer from SSE token events', () => {
    const subject = new Subject()
    fetchSSE.mockReturnValue(subject)
    useAssistantStore.setState({ query: 'test query' })

    useAssistantStore.getState().submitQuery()

    subject.next({ event: 'token', data: { text: 'Hello' } })
    expect(useAssistantStore.getState().answer).toBe('Hello')

    subject.next({ event: 'token', data: { text: ' world' } })
    expect(useAssistantStore.getState().answer).toBe('Hello world')

    subject.complete()
  })

  it('should set sources and stop loading on SSE complete event', () => {
    const subject = new Subject()
    fetchSSE.mockReturnValue(subject)
    useAssistantStore.setState({ query: 'test query' })

    useAssistantStore.getState().submitQuery()
    expect(useAssistantStore.getState().loading).toBe(true)

    const sources = [{ id: 'src-1', title: 'Source 1' }]
    subject.next({ event: 'complete', data: { sources } })

    expect(useAssistantStore.getState().sources).toEqual(sources)
    expect(useAssistantStore.getState().loading).toBe(false)

    subject.complete()
  })

  it('should show error dialog and set error on SSE error event', () => {
    const subject = new Subject()
    fetchSSE.mockReturnValue(subject)
    const errorSpy = jest.spyOn(useDialogStore.getState(), 'error')
    useAssistantStore.setState({ query: 'test query' })

    useAssistantStore.getState().submitQuery()

    const errorData = { message: 'Query failed.', code: 'QUERY_ERROR' }
    subject.next({ event: 'error', data: errorData })

    expect(errorSpy).toHaveBeenCalledWith(errorData)
    expect(useAssistantStore.getState().loading).toBe(false)
    expect(useAssistantStore.getState().error).toEqual(errorData)

    errorSpy.mockRestore()
    subject.complete()
  })

  it('should stop loading on SSE stream error', () => {
    const subject = new Subject()
    fetchSSE.mockReturnValue(subject)
    useAssistantStore.setState({ query: 'test query' })

    useAssistantStore.getState().submitQuery()
    expect(useAssistantStore.getState().loading).toBe(true)

    subject.error({ message: 'Network error', code: 'NETWORK_ERROR' })

    expect(useAssistantStore.getState().loading).toBe(false)
  })

  it('should ignore unrecognized SSE events without changing state', () => {
    const subject = new Subject()
    fetchSSE.mockReturnValue(subject)
    useAssistantStore.setState({ query: 'test query' })

    useAssistantStore.getState().submitQuery()

    subject.next({ event: 'unknown', data: { foo: 'bar' } })

    expect(useAssistantStore.getState().answer).toBe('')
    expect(useAssistantStore.getState().sources).toEqual([])
    expect(useAssistantStore.getState().loading).toBe(true)

    subject.complete()
  })

  it('should reset previous answer and sources when re-submitting a query', () => {
    const subject = new Subject()
    fetchSSE.mockReturnValue(subject)
    useAssistantStore.setState({
      query: 'new query',
      answer: 'old answer',
      sources: [{ id: 'src-1' }],
      error: { message: 'old error', code: 'ERR' },
    })

    useAssistantStore.getState().submitQuery()

    expect(useAssistantStore.getState().answer).toBe('')
    expect(useAssistantStore.getState().sources).toEqual([])
    expect(useAssistantStore.getState().error).toBeNull()

    subject.complete()
  })

  it('should close the assistant panel without resetting editing', () => {
    useAssistantStore.setState({ open: true, editing: true })

    useAssistantStore.getState().close()

    expect(useAssistantStore.getState().open).toBe(false)
    expect(useAssistantStore.getState().editing).toBe(true)
  })

  it('should clear all state to initial values', () => {
    useAssistantStore.setState({
      query: 'some query',
      answer: 'some answer',
      sources: [{ id: 'src-1' }],
      loading: true,
      error: { message: 'err', code: 'ERR' },
      open: true,
    })

    useAssistantStore.getState().clear()

    const state = useAssistantStore.getState()
    expect(state.query).toBe('')
    expect(state.answer).toBe('')
    expect(state.sources).toEqual([])
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.editing).toBe(false)
    expect(state.open).toBe(false)
  })

  it('should open panel on focusQuery when not editing and answer exists', () => {
    useAssistantStore.setState({ editing: false, answer: 'Some answer', open: false })

    useAssistantStore.getState().focusQuery()

    expect(useAssistantStore.getState().open).toBe(true)
  })

  it('should not open panel on focusQuery when editing', () => {
    useAssistantStore.setState({ editing: true, answer: 'Some answer', open: false })

    useAssistantStore.getState().focusQuery()

    expect(useAssistantStore.getState().open).toBe(false)
  })

  it('should open panel on focusQuery when not editing and loading', () => {
    useAssistantStore.setState({ editing: false, loading: true, answer: '', open: false })

    useAssistantStore.getState().focusQuery()

    expect(useAssistantStore.getState().open).toBe(true)
  })

  it('should not open panel on focusQuery when not loading and no answer', () => {
    useAssistantStore.setState({ editing: false, loading: false, answer: '', open: false })

    useAssistantStore.getState().focusQuery()

    expect(useAssistantStore.getState().open).toBe(false)
  })
})
