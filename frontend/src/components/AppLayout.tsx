import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Building2,
  ContactRound,
  LayoutDashboard,
  Mail,
  Menu,
  Settings,
  UsersRound,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Contacts", href: "/contacts", icon: ContactRound },
  { label: "Pipeline", href: "/pipeline", icon: BarChart3 },
  { label: "Listings", href: "/listings", icon: Building2 },
  { label: "Bulk Email", href: "/email", icon: Mail },
  { label: "Activity", href: "/activity", icon: Activity },
  { label: "Reports", href: "/reports", icon: UsersRound },
  { label: "Settings", href: "/settings", icon: Settings },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-sm font-bold text-white">L</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">Lifely</p>
        <p className="truncate text-xs text-muted-foreground">Real estate CRM</p>
      </div>
    </div>
  );
}

function NavigationLinks({ onSelect }: { onSelect?: () => void }) {
  return (
    <nav className="grid gap-1">
      {navigation.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          onClick={onSelect}
          className={({ isActive }) =>
            cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-sky-50 hover:text-slate-950",
              isActive && "bg-sky-100 text-sky-800",
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  const { tenant, user } = auth;
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-white lg:block">
        <div className="flex h-full flex-col gap-6 p-5">
          <Brand />
          <NavigationLinks />
          <div className="mt-auto rounded-lg border bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Tenant</p>
            <p className="mt-1 truncate text-sm font-semibold">{tenant?.name ?? "Loading office"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{tenant?.plan ?? "Growth"} plan</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
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
          <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {user?.avatarInitials ?? "MH"}
          </div>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <main className="mx-auto w-full max-w-7xl p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
