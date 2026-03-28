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
          size="lg"
          className="border-dashed border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest transition-all cursor-pointer shadow-none"
        >
          <Plus className="w-4 h-4" />
          Add source
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
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all group ${
                source.connected
                  ? "opacity-60 cursor-default bg-surface-container-low"
                  : "hover:bg-surface-container-low cursor-pointer"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                source.connected ? "bg-tertiary-fixed-dim/20" : "bg-surface-container-high group-hover:bg-secondary-container"
              }`}>
                {source.connected ? (
                  <Check className="w-5 h-5 text-on-tertiary-container" />
                ) : (
                  <source.icon className="w-5 h-5 text-on-surface-variant group-hover:text-on-surface transition-colors" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">{source.name}</p>
                <p className="text-xs text-on-surface-variant">{source.description}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
