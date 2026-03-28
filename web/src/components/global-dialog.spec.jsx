import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GlobalDialog } from './global-dialog'
import { useDialogStore } from '@/stores/dialog-store'

jest.mock('@/stores/dialog-store', () => {
  const store = {
    open: false,
    title: '',
    description: '',
    variant: '',
    close: jest.fn(),
  }

  const useDialogStore = selector => selector(store)
  useDialogStore._store = store

  const useDialog = () => ({
    open: store.open,
    title: store.title,
    description: store.description,
    variant: store.variant,
  })

  return { useDialogStore, useDialog }
})

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => {
      const translations = {
        'error.dialogClose': 'Close',
      }
      return translations[key] || key
    },
  }),
}))

const Dialog = ({ open, onOpenChange, children }) => {
  Dialog.onOpenChange = onOpenChange
  return open ? <div data-testid="dialog">{children}</div> : null
}

jest.mock('@/shadcn/ui/dialog', () => ({
  Dialog,
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }) => <p data-testid="dialog-description">{children}</p>,
  DialogFooter: ({ children }) => <div>{children}</div>,
}))

jest.mock('@/shadcn/ui/button', () => ({
  Button: ({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

const store = useDialogStore._store

beforeEach(() => {
  store.open = false
  store.title = ''
  store.description = ''
  store.close.mockClear()
  Dialog.onOpenChange = undefined
})

describe('global-dialog', () => {
  it('should not render dialog when store is closed', () => {
    render(<GlobalDialog />)

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })

  it('should render dialog with title and description when open', () => {
    store.open = true
    store.title = 'Something went wrong'
    store.description = 'An unexpected error occurred.'

    render(<GlobalDialog />)

    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Something went wrong')
    expect(screen.getByTestId('dialog-description')).toHaveTextContent(
      'An unexpected error occurred.',
    )
  })

  it('should call close when onOpenChange is called with false', () => {
    store.open = true
    store.title = 'Error'
    store.description = 'Something failed.'

    render(<GlobalDialog />)

    Dialog.onOpenChange(false)

    expect(store.close).toHaveBeenCalledTimes(1)
  })

  it('should not call close when onOpenChange is called with true', () => {
    store.open = true
    store.title = 'Error'
    store.description = 'Something failed.'

    render(<GlobalDialog />)

    Dialog.onOpenChange(true)

    expect(store.close).not.toHaveBeenCalled()
  })

  it('should call store close action when close button is clicked', async () => {
    store.open = true
    store.title = 'Error'
    store.description = 'Something failed.'

    const user = userEvent.setup()
    render(<GlobalDialog />)

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(store.close).toHaveBeenCalledTimes(1)
  })
})
