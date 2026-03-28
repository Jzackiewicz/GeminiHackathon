import { useLocation, Link } from "react-router-dom";
import { LogOut, Sparkles, LayoutDashboard, History } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Interviews", href: "/interview", icon: History },
];

export default function TopBar({ user, onLogout }) {
  const location = useLocation();
  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "??";

  return (
    <header className="flex items-center justify-between px-6 h-14 border-b border-panel-border bg-surface/80 backdrop-blur-sm">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-bold tracking-tight">
            Interview<span className="text-accent">AI</span>
          </h1>
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#1A1A1A] text-white"
                    : "text-muted hover:bg-[#EAEAE5] hover:text-[#1A1A1A]"
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <span className="text-sm text-muted hidden sm:inline">
            {user.email}
          </span>
        )}
        <Avatar className="h-8 w-8 border border-panel-border">
          <AvatarFallback className="bg-accent-light text-accent text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="text-muted hover:text-[#1A1A1A] cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
