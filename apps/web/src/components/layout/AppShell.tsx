import { Fragment, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { navMain, navProjects } from '@/components/layout/nav-config';

export interface AppShellProps {
  children: ReactNode;
}

const allNavItems = [...navMain, ...navProjects];

interface BreadcrumbTrailItem {
  title: string;
  url?: string;
}

function getBreadcrumbTrail(pathname: string): BreadcrumbTrailItem[] {
  if (
    pathname.startsWith('/dashboard/loans/') &&
    pathname !== '/dashboard/loans'
  ) {
    return [
      { title: 'Loans', url: '/dashboard/loans' },
      { title: 'Loan Details' },
    ];
  }

  const activeItem = allNavItems.find((item) =>
    'end' in item && item.end
      ? item.url === pathname
      : pathname === item.url || pathname.startsWith(item.url + '/'),
  );

  return [{ title: activeItem?.title ?? 'Dashboard' }];
}

export function AppShell({ children }: AppShellProps) {
  const { pathname } = useLocation();
  const breadcrumbTrail = getBreadcrumbTrail(pathname);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="h-svh min-h-0 overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex w-full items-center gap-2 px-4 md:px-6">
              <SidebarTrigger className="-ml-1 self-center" />
              <Separator
                orientation="vertical"
                className="mr-2 h-4 data-vertical:self-auto"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink asChild>
                      <Link to="/dashboard">Lending Management System</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {breadcrumbTrail.map((item, index) => {
                    const isCurrentPage = index === breadcrumbTrail.length - 1;

                    return (
                      <Fragment key={`${item.title}-${item.url ?? index}`}>
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem>
                          {item.url && !isCurrentPage ? (
                            <BreadcrumbLink asChild>
                              <Link to={item.url}>{item.title}</Link>
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage>{item.title}</BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                      </Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <main className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pb-4 pt-0 scrollbar-gutter-stable md:px-6 md:pb-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
