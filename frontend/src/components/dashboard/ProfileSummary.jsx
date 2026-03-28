import { useState } from "react";
import { User, Loader2, Briefcase, MapPin } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";
import { api } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ProfileSummary({ profile, onUpdate }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <Card className="border-panel-border shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <User className="w-4 h-4 text-muted" />
          Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasProfile ? (
          <>
            {/* Profile header */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-panel-border">
                <AvatarFallback className="bg-[#1A1A1A] text-white text-sm font-semibold">
                  {profile.github_username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{profile.github_username}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <div className="flex items-center gap-1 text-xs text-success">
                    <GithubIcon className="w-3 h-3" />
                    <span>Connected</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <LinkedinIcon className="w-3 h-3" />
                    <span>Not linked</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI-generated summary */}
            {profile.summary ? (
              <div className="bg-background rounded-lg p-3 border border-panel-border">
                <p className="text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                  AI Summary
                </p>
                <p className="text-sm text-[#1A1A1A] leading-relaxed">
                  {profile.summary}
                </p>
              </div>
            ) : (
              <div className="bg-background rounded-lg p-3 border border-panel-border border-dashed">
                <p className="text-xs text-muted text-center">
                  Connect more sources to generate an AI summary of your profile
                </p>
              </div>
            )}

            {/* Technologies */}
            {profile.technologies?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wider">
                  Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.technologies.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="text-xs font-normal"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={connectGithub} className="space-y-3">
            <p className="text-sm text-muted">
              Connect your GitHub to build your profile. We'll analyze your repos, languages, and activity to create a personalized summary.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="GitHub username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-panel-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                required
              />
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="bg-accent hover:bg-accent-dark text-white cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <GithubIcon className="w-4 h-4" />
                    Connect
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
