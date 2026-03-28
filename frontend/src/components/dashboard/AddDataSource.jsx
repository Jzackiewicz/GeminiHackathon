import { Plus, FileText, Check } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AddDataSource({ profile }) {
  const githubConnected = !!profile?.github_username;

  const sources = [
    {
      name: "GitHub",
      description: githubConnected ? `Connected as ${profile.github_username}` : "Import repos, languages, and activity",
      icon: GithubIcon,
      connected: githubConnected,
    },
    {
      name: "LinkedIn",
      description: "Import work experience and skills",
      icon: LinkedinIcon,
      connected: false,
    },
    {
      name: "Resume",
      description: "Upload a PDF or DOCX file",
      icon: FileText,
      connected: false,
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full border-dashed border-panel-border hover:border-accent hover:bg-accent-light/50 text-muted hover:text-accent transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add data source
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect a data source</DialogTitle>
          <DialogDescription>
            Import your data to build a stronger profile.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {sources.map((source) => (
            <button
              key={source.name}
              disabled={source.connected}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border border-panel-border text-left transition-all group ${
                source.connected
                  ? "opacity-60 cursor-default"
                  : "hover:bg-accent-light/30 hover:shadow-sm cursor-pointer"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                source.connected ? "bg-emerald-50" : "bg-background group-hover:bg-accent-light"
              }`}>
                {source.connected ? (
                  <Check className="w-5 h-5 text-emerald-600" />
                ) : (
                  <source.icon className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{source.name}</p>
                <p className="text-xs text-muted">{source.description}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
