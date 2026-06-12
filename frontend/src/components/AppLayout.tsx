import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import lifelyIconUrl from "@/assets/lifely-icon.png";
import lifelyLogoUrl from "@/assets/lifely-logo.png";
import { CircleAvatar } from "@/components/CircleAvatar";
import { LoadingInline } from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { NAVIGATION_ITEMS } from "@/rbac/accessMatrix";
import { useAuthorization } from "@/rbac/useAuthorization";

export type AppLayoutContext = {
  isSidebarMinimized: boolean;
};

function Brand({ isMinimized = false }: { isMinimized?: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-center", isMinimized && "justify-center")}>
      {isMinimized ? (
        <img src={lifelyIconUrl} alt="Lifely" className="h-10 w-10 rounded-lg object-contain" />
      ) : (
        <img src={lifelyLogoUrl} alt="Lifely" className="h-12 w-auto max-w-[150px] object-contain" />
      )}
    </div>
  );
}

function NavigationLinks({ isMinimized = false, onSelect }: { isMinimized?: boolean; onSelect?: () => void }) {
  const { canAny } = useAuthorization();
  const visibleNavigation = NAVIGATION_ITEMS.filter((item) => !item.anyOf || canAny(item.anyOf));

  return (
    <nav className="grid gap-1">
      {visibleNavigation.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          onClick={onSelect}
          title={isMinimized ? item.label : undefined}
          aria-label={isMinimized ? item.label : undefined}
          className={({ isActive }) =>
            cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-sky-50 hover:text-slate-950",
              isMinimized && "justify-center px-0",
              isActive && "bg-sky-100 text-sky-800",
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className={cn("truncate", isMinimized && "sr-only")}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const auth = useAuth();
  const { tenant, user } = auth;
  const navigate = useNavigate();
  const sidebarToggleLabel = isSidebarMinimized ? "Expand sidebar" : "Minimize sidebar";

  const handleLogout = async () => {
    await auth.logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden border-r bg-white transition-[width] duration-200 lg:block",
          isSidebarMinimized ? "w-20" : "w-64",
        )}
      >
        <div className={cn("flex h-full flex-col gap-6 p-5", isSidebarMinimized && "items-stretch gap-5 p-3")}>
          <div className={cn("flex items-center gap-2", isSidebarMinimized ? "flex-col" : "justify-between")}>
            <Brand isMinimized={isSidebarMinimized} />
            <Button
              variant="ghost"
              size="icon"
              aria-label={sidebarToggleLabel}
              title={sidebarToggleLabel}
              onClick={() => setIsSidebarMinimized((current) => !current)}
            >
              {isSidebarMinimized ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
          <NavigationLinks isMinimized={isSidebarMinimized} />
          <div
            className={cn(
              "mt-auto rounded-lg border bg-slate-50 p-4",
              isSidebarMinimized && "grid min-h-12 place-items-center p-2 text-center",
            )}
            title={tenant?.name}
          >
            {isSidebarMinimized ? (
              <p className="text-xs font-semibold text-slate-700">{tenant?.name?.slice(0, 2).toUpperCase() ?? "..."}</p>
            ) : (
              <>
                <p className="text-xs font-medium uppercase text-muted-foreground">Tenant</p>
                <p className="mt-1 truncate text-sm font-semibold">{tenant?.name ?? <LoadingInline label="Loading office" />}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tenant?.plan ?? "Growth"} plan</p>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className={cn("transition-[padding] duration-200", isSidebarMinimized ? "lg:pl-20" : "lg:pl-64")}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white/95 px-4 backdrop-blur md:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="mb-6">
                <Brand />
              </div>
              <NavigationLinks onSelect={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{tenant?.name ?? "Skyline Realty Office"}</p>
            <p className="truncate text-xs text-muted-foreground">Tenant isolated workspace</p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">{user?.name ?? "Maya Hart"}</p>
            <p className="text-xs text-muted-foreground">{user?.role ?? "Office Admin"}</p>
          </div>
          <CircleAvatar name={user?.name ?? "Maya Hart"} initials={user?.avatarInitials ?? "MH"} size={36} />
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <main className={cn("w-full p-4 md:p-6", isSidebarMinimized ? "max-w-none" : "mx-auto max-w-7xl")}>
          <Outlet context={{ isSidebarMinimized } satisfies AppLayoutContext} />
        </main>
      </div>
    </div>
  );
}
