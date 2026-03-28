import { useLocation, Link } from "react-router-dom";
import { LogOut, LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogoFull } from "@/components/Logo";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
];

export default function TopBar({ user, onLogout }) {
  const location = useLocation();
  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "??";

  return (
    <header className="fixed top-0 w-full z-50 glass-nav shadow-card">
      <nav className="flex items-center justify-between px-6 py-2.5 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center">
            <LogoFull size={30} />
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold font-headline tracking-tight transition-all ${
                    isActive
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-on-surface-variant hidden sm:inline font-medium">
              {user.email}
            </span>
          )}
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary-container text-on-secondary-container text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </nav>
    </header>
  );
}
