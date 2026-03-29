import { render, screen } from '@testing-library/react'

let mockPathname = '/'

jest.mock('react-router-dom', () => ({
  Link: jest.fn(({ children, to, className, onClick }) => (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  )),
  useLocation: () => ({ pathname: mockPathname }),
  matchPath: (pattern, pathname) => {
    const regex = new RegExp('^' + pattern.replace(/:[\w]+/g, '[^/]+') + '$')
    return regex.test(pathname) ? {} : null
  },
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => {
      const translations = {
        'app.logo': 'LegalDoc AI',
        'app.toggleMenu': 'Toggle menu',
        'nav.documents': 'Documents',
        'nav.newDocument': 'New Document',
        'search.placeholder': 'Search...',
      }
      return translations[key] || key
    },
  }),
}))

jest.mock('lucide-react', () => ({
  FileText: props => <svg data-testid="icon-file-text" {...props} />,
  Plus: props => <svg data-testid="icon-plus" {...props} />,
  Search: props => <svg data-testid="icon-search" {...props} />,
}))

jest.mock('@/shadcn/ui/input', () => ({
  Input: props => <input {...props} />,
}))

jest.mock('@/shadcn/ui/avatar', () => ({
  Avatar: ({ children, ...props }) => <div {...props}>{children}</div>,
  AvatarFallback: ({ children }) => <span>{children}</span>,
}))

const mockSetOpenMobile = jest.fn()

jest.mock('@/shadcn/ui/sidebar', () => ({
  SidebarProvider: ({ children }) => <div data-testid="sidebar-provider">{children}</div>,
  Sidebar: ({ children, ...props }) => <aside {...props}>{children}</aside>,
  SidebarContent: ({ children }) => <div>{children}</div>,
  SidebarGroup: ({ children }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }) => <div>{children}</div>,
  SidebarHeader: ({ children }) => <div>{children}</div>,
  SidebarInset: ({ children }) => <div>{children}</div>,
  SidebarMenu: ({ children, ...props }) => <nav {...props}>{children}</nav>,
  SidebarMenuButton: ({ children, asChild }) => asChild ? children : <button>{children}</button>,
  SidebarMenuItem: ({ children }) => <div>{children}</div>,
  SidebarTrigger: props => <button aria-label="Toggle menu" {...props} />,
  useSidebar: () => ({ setOpenMobile: mockSetOpenMobile }),
}))

import AppShell from './app-shell'

beforeEach(() => {
  mockPathname = '/'
  mockSetOpenMobile.mockClear()
})

describe('AppShell', () => {
  it('renders the sidebar with logo and nav items', () => {
    render(<AppShell><div>content</div></AppShell>)
    expect(screen.getByText('LegalDoc AI')).toBeInTheDocument()
    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(screen.getByText('New Document')).toBeInTheDocument()
  })

  it('renders nav items with correct icons', () => {
    render(<AppShell><div>content</div></AppShell>)
    expect(screen.getByTestId('icon-file-text')).toBeInTheDocument()
    expect(screen.getByTestId('icon-plus')).toBeInTheDocument()
  })

  it('renders the topbar with search input and avatar', () => {
    render(<AppShell><div>content</div></AppShell>)
    expect(screen.getByTestId('topbar')).toBeInTheDocument()
    expect(screen.getByTestId('search-input')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
    expect(screen.getByTestId('user-avatar')).toBeInTheDocument()
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('renders children in the main content area', () => {
    render(<AppShell><div data-testid="child">Page Content</div></AppShell>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Page Content')).toBeInTheDocument()
  })

  it('renders sidebar trigger in the topbar', () => {
    render(<AppShell><div>content</div></AppShell>)
    expect(screen.getByTestId('sidebar-provider')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-trigger')).toBeInTheDocument()
  })

  it('uses NavLink with correct paths', () => {
    render(<AppShell><div>content</div></AppShell>)
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', '/')
    expect(links[1]).toHaveAttribute('href', '/documents/new')
  })

  it('marks Documents nav as active on document detail pages', () => {
    mockPathname = '/documents/abc123'
    render(<AppShell><div>content</div></AppShell>)
    const documentsLink = screen.getByText('Documents').closest('a')
    expect(documentsLink.className).toContain('bg-primary-100')
  })

  it('does not mark Documents nav as active on new document page', () => {
    mockPathname = '/documents/new'
    render(<AppShell><div>content</div></AppShell>)
    const documentsLink = screen.getByText('Documents').closest('a')
    expect(documentsLink.className).not.toContain('font-semibold')
    const newDocLink = screen.getByText('New Document').closest('a')
    expect(newDocLink.className).toContain('font-semibold')
  })

  it('applies active class to the active nav item', () => {
    render(<AppShell><div>content</div></AppShell>)
    const documentsLink = screen.getByText('Documents').closest('a')
    expect(documentsLink.className).toContain('bg-primary-100')
    expect(documentsLink.className).toContain('text-sidebar-accent-foreground')
  })

  it('applies inactive class to non-active nav items', () => {
    render(<AppShell><div>content</div></AppShell>)
    const newDocLink = screen.getByText('New Document').closest('a')
    expect(newDocLink.className).not.toContain('bg-sidebar-accent font-semibold')
  })

  it('calls setOpenMobile(false) when a nav item is clicked', () => {
    render(<AppShell><div>content</div></AppShell>)
    screen.getByText('Documents').click()
    expect(mockSetOpenMobile).toHaveBeenCalledWith(false)
  })

  it('renders search icon in the search input wrapper', () => {
    render(<AppShell><div>content</div></AppShell>)
    expect(screen.getByTestId('icon-search')).toBeInTheDocument()
  })
})
