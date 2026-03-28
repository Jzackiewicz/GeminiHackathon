import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";
import { api } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ProfileSummary({ profile, onUpdate }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [rescanning, setRescanning] = useState(false);

  async function rescan() {
    setRescanning(true);
    try {
      await api.rescanProfile();
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const updated = await api.getProfile();
        if (updated.primary_role) {
          onUpdate(updated);
          return;
        }
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setRescanning(false);
    }
  }

  async function connectGithub(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await api.connectGithub(username);
      onUpdate(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  const hasProfile = profile?.github_username;

  if (!hasProfile) {
    return (
      <div>
        <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight leading-tight mb-3">
          Your Career<br />Starts Here
        </h1>
        <p className="text-on-surface-variant text-lg max-w-md mb-8 leading-relaxed">
          Connect your GitHub to let AI analyze your skills, match you with jobs, and prepare for interviews.
        </p>
        <form onSubmit={connectGithub} className="flex gap-3 max-w-md">
          <input
            type="text"
            placeholder="GitHub username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex-1 px-5 py-3 rounded-full bg-surface-container-lowest text-sm text-on-surface placeholder:text-outline shadow-card focus:outline-none focus:ring-2 focus:ring-outline/40 transition"
            required
          />
          <Button type="submit" size="lg" disabled={loading} className="cursor-pointer">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <GithubIcon className="w-4 h-4" />
                Connect
              </>
            )}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-primary-container text-on-primary text-lg font-bold font-headline">
            {profile.github_username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">
            {profile.github_username}
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5 text-sm text-on-tertiary-container font-medium">
              <GithubIcon className="w-3.5 h-3.5" />
              <span>Connected</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
              <LinkedinIcon className="w-3.5 h-3.5" />
              <span>Not linked</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={rescan}
              disabled={rescanning}
              className="h-7 px-2 text-xs text-on-surface-variant hover:text-on-surface"
            >
              {rescanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Rescan
            </Button>
          </div>
        </div>
      </div>

      {profile.summary && (
        <p className="text-on-surface-variant text-base leading-relaxed max-w-2xl mb-6">
          {profile.summary}
        </p>
      )}

      {profile.technologies?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profile.technologies.map((t) => {
            const name = typeof t === "string" ? t : t.name;
            return (
              <Badge key={name} variant="secondary" className="text-xs font-medium px-3 py-1">
                {name}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
