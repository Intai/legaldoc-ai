import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, matchPath, useLocation } from 'react-router-dom'
import { FileText, Plus, Search } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/shadcn/ui/avatar'
import { Input } from '@/shadcn/ui/input'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/shadcn/ui/sidebar'

const NAV_ITEMS = [
  { to: '/', icon: FileText, labelKey: 'nav.documents', matchPaths: ['/', '/documents/:id'] },
  { to: '/documents/new', icon: Plus, labelKey: 'nav.newDocument' },
]

function SidebarNavLink({ to, matchPaths, children }) {
  const { setOpenMobile } = useSidebar()
  const { pathname } = useLocation()
  const isActive = matchPaths
    ? matchPaths.some(pattern => matchPath(pattern, pathname))
    : matchPath(to, pathname)

  return (
    <Link
      to={to}
      className={[
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors',
        isActive
          ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
      ].join(' ')}
      onClick={() => setOpenMobile(false)}
    >
      {children}
    </Link>
  )
}

function AppShell({ children }) {
  const { t } = useTranslation()

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <Sidebar data-testid="sidebar">
        <SidebarHeader>
          <div className="px-3 py-3 -mt-1 mb-2 text-lg font-bold text-sidebar-primary">
            {t('app.logo')}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu data-testid="sidebar-nav">
                {NAV_ITEMS.map(({ to, icon: Icon, labelKey, matchPaths }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild>
                      <SidebarNavLink to={to} matchPaths={matchPaths}>
                        <Icon className="size-[18px] shrink-0" />
                        {t(labelKey)}
                      </SidebarNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="min-h-0">
        <header
          className="flex h-14 shrink-0 items-center gap-3 border-b border-border-default bg-bg-card px-5"
          data-testid="topbar"
        >
          <SidebarTrigger className="lg:hidden [&_svg]:size-5!" data-testid="sidebar-trigger" />

          <div className="flex-1">
            <div className="relative max-w-[280px] max-md:max-w-none max-md:w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
              <Input
                type="text"
                placeholder={t('search.placeholder')}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
          </div>

          <Avatar data-testid="user-avatar">
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default AppShell
