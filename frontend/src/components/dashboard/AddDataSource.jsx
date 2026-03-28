import { Plus, FileText } from "lucide-react";
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

const sources = [
  {
    name: "GitHub",
    description: "Import repos, languages, and activity",
    icon: GithubIcon,
    connected: false,
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

export default function AddDataSource() {
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
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-panel-border hover:border-accent hover:bg-accent-light/30 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center group-hover:bg-accent-light transition-colors">
                <source.icon className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
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
