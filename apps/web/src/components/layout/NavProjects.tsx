import type { IconSvgElement } from '@hugeicons/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { NavLink } from 'react-router-dom'

import { RequireRole } from '@/features/auth/components/RequireRole'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export interface NavProjectItem {
  title: string
  url: string
  icon: IconSvgElement
}

function ProjectMenuItem({ item }: { item: NavProjectItem }) {
  return (
    <SidebarMenuItem>
      <NavLink to={item.url} className="block">
        {({ isActive }) => (
          <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
            <span>
              <HugeiconsIcon icon={item.icon} size={18} />
              <span>{item.title}</span>
            </span>
          </SidebarMenuButton>
        )}
      </NavLink>
    </SidebarMenuItem>
  )
}

export function NavProjects({ projects }: { projects: NavProjectItem[] }) {
  return (
    <RequireRole role="admin" fallback="hide">
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {projects.map((item) => (
              <ProjectMenuItem key={item.url} item={item} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </RequireRole>
  )
}
