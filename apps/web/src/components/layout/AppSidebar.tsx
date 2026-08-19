import { NavMain } from '@/components/layout/NavMain'
import { NavProjects } from '@/components/layout/NavProjects'
import { NavUser } from '@/components/layout/NavUser'
import { TeamSwitcher } from '@/components/layout/TeamSwitcher'
import { RequireRole } from '@/features/auth/components/RequireRole'
import { appRoutes, navMain, navProjects } from '@/lib/app-routes'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <TeamSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
        <RequireRole role={appRoutes.settings.roles!} fallback="hide">
          <NavProjects projects={navProjects} />
        </RequireRole>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
