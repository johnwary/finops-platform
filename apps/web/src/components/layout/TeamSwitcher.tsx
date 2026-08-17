import { useState } from 'react'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { useCompanyProfile } from '@/features/company/hooks/useCompanyProfile'

export function TeamSwitcher() {
  const { data: profile } = useCompanyProfile()
  const [hasLogoError, setHasLogoError] = useState(false)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
          {profile?.logoUrl && !hasLogoError && (
            <img
              src={profile.logoUrl}
              alt=""
              className="size-8 shrink-0 rounded-md object-cover"
              onError={() => setHasLogoError(true)}
            />
          )}
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">{profile?.name || 'Lending'}</span>
            <span className="truncate text-xs text-sidebar-foreground/60">Platform</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
