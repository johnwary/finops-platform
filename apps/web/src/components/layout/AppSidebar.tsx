import { navMain, navProjects } from '@/components/layout/nav-config'
import { NavMain } from '@/components/layout/NavMain'
import { NavProjects } from '@/components/layout/NavProjects'
import { NavUser } from '@/components/layout/NavUser'
import { TeamSwitcher } from '@/components/layout/TeamSwitcher'
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
        <NavProjects projects={navProjects} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
