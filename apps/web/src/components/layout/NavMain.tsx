import type { IconSvgElement } from '@hugeicons/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { NavLink } from 'react-router-dom'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { RequireRole } from '@/features/auth/components/RequireRole'
import type { Role } from '@/lib/auth-client'

export interface NavMainItem {
  title: string
  url: string
  icon: IconSvgElement
  end?: boolean
  roles?: Role[]
}

function MainMenuItem({ item }: { item: NavMainItem }) {
  return (
    <SidebarMenuItem>
      <NavLink to={item.url} end={item.end} className="block">
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

export function NavMain({ items }: { items: NavMainItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) =>
            item.roles ? (
              <RequireRole key={item.url} role={item.roles} fallback="hide">
                <MainMenuItem item={item} />
              </RequireRole>
            ) : (
              <MainMenuItem key={item.url} item={item} />
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
