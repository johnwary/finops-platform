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

export interface NavMainItem {
  title: string
  url: string
  icon: IconSvgElement
  end?: boolean
}

export function NavMain({ items }: { items: NavMainItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
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
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
