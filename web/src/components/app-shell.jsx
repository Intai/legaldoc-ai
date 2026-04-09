import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, matchPath, useLocation } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/shadcn/ui/avatar'
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
import { AssistantInput } from './assistant-input'

const NAV_ITEMS = [
  { to: '/', icon: FileText, labelKey: 'nav.documents', matchPaths: ['/', '/documents/:id'], excludePaths: ['/documents/new'] },
  { to: '/documents/new', icon: Plus, labelKey: 'nav.newDocument' },
]

function SidebarNavLink({ to, matchPaths, excludePaths, children }) {
  const { setOpenMobile } = useSidebar()
  const { pathname } = useLocation()
  const isExcluded = excludePaths?.some(pattern => matchPath(pattern, pathname))
  const isActive = !isExcluded && (matchPaths
    ? matchPaths.some(pattern => matchPath(pattern, pathname))
    : matchPath(to, pathname))

  return (
    <Link
      to={to}
      className={[
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors',
        isActive
          ? 'bg-primary-100 font-semibold text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-primary-100/50 hover:text-sidebar-accent-foreground',
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
                {NAV_ITEMS.map(({ to, icon: Icon, labelKey, matchPaths, excludePaths }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild>
                      <SidebarNavLink to={to} matchPaths={matchPaths} excludePaths={excludePaths}>
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
          <SidebarTrigger className="lg:hidden -mx-1 [&_svg]:size-5!" data-testid="sidebar-trigger" />

          <div className="flex-1">
            <AssistantInput />
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
