import { LogOut, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function TopBar({ user, onLogout }) {
  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "??";

  return (
    <header className="flex items-center justify-between px-6 h-16 border-b border-panel-border bg-surface/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-bold tracking-tight">
            Interview<span className="text-accent">AI</span>
          </h1>
        </div>
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
