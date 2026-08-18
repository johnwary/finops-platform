import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { CompanyLogo } from '@/features/company/components/CompanyLogo'
import { useCompanyProfile } from '@/features/company/hooks/useCompanyProfile'

export function TeamSwitcher() {
  const { data: profile, isPending } = useCompanyProfile()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
          {isPending ? (
            <Skeleton className="size-8 shrink-0" />
          ) : (
            <CompanyLogo name={profile?.name} logoUrl={profile?.logoUrl} />
          )}
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">
              {isPending ? <SkeletonText width="7rem" /> : profile?.name || 'Lending'}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/60">Platform</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
