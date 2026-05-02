import { Logout01Icon, MoreVerticalIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { Role } from '@/lib/auth-client'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { useSession } from '@/features/auth/hooks/useSession'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

interface UserInfoProps {
  initials: string
  email: string
  role: Role | undefined
}

function UserInfo({ initials, email, role }: UserInfoProps) {
  return (
    <>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
        {initials}
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <span className="truncate text-xs font-medium">{email}</span>
        {role && (
          <span className="truncate text-[10px] capitalize text-muted-foreground">{role}</span>
        )}
      </div>
    </>
  )
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const { data } = useSession()
  const logout = useLogout()

  const email = data?.user.email ?? ''
  const role = data?.user.role as Role | undefined
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip={email}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left">
                <UserInfo initials={initials} email={email} role={role} />
              </div>
              <HugeiconsIcon icon={MoreVerticalIcon} size={16} className="ml-auto shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5">
                <UserInfo initials={initials} email={email} role={role} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <HugeiconsIcon icon={Logout01Icon} size={16} />
              {logout.isPending ? 'Signing out...' : 'Log out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
