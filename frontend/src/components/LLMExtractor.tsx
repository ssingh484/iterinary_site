"use client";

import { useState } from "react";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { api, type ExtractedActivity, type Day } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface LLMExtractorProps {
  itineraryId: string;
  days: Day[];
  onActivitiesAdded: () => void;
}

export function LLMExtractor({ itineraryId, days, onActivitiesAdded }: LLMExtractorProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedActivity[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [targetDayId, setTargetDayId] = useState(days[0]?.id || "");
  const { toast } = useToast();

  const handleExtract = async () => {
    if (!text.trim() || text.trim().length < 10) return;
    setLoading(true);
    try {
      const result = await api.extractActivities(text);
      setExtracted(result.activities);
      setSelected(new Set(result.activities.map((_, i) => i)));
    } catch (err) {
      toast({
        title: "Extraction failed",
        description: err instanceof Error ? err.message : "Failed to extract activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  };

  const handleApply = async () => {
    if (!targetDayId || selected.size === 0) return;
    const selectedActivities = extracted.filter((_, i) => selected.has(i));
    try {
      await api.applyExtractedActivities(itineraryId, targetDayId, selectedActivities);
      toast({ title: `Added ${selectedActivities.length} activities` });
      onActivitiesAdded();
      setOpen(false);
      setText("");
      setExtracted([]);
      setSelected(new Set());
    } catch (err) {
      toast({
        title: "Failed to add activities",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const timeVariant: Record<string, "morning" | "afternoon" | "evening" | "secondary"> = {
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    any: "secondary",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Extract from Notes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extract Activities from Research Notes</DialogTitle>
          <DialogDescription>
            Paste your research text and let AI extract structured activities.
          </DialogDescription>
        </DialogHeader>

        {extracted.length === 0 ? (
          <div className="space-y-4">
            <Textarea
              placeholder="Paste your research notes about Japan activities here... (e.g., 'Visit Fushimi Inari Shrine in the morning, takes about 2 hours. Then head to Nishiki Market for lunch...')"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
            />
            <Button onClick={handleExtract} disabled={loading || text.trim().length < 10} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract Activities
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Add to:</label>
              <select
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={targetDayId}
                onChange={(e) => setTargetDayId(e.target.value)}
              >
                {days.map((d) => (
                  <option key={d.id} value={d.id}>
                    Day {d.day_number}
                  </option>
                ))}
              </select>
              <span className="text-sm text-muted-foreground ml-auto">
                {selected.size} of {extracted.length} selected
              </span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {extracted.map((act, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    selected.has(i) ? "bg-primary/5 border-primary/30" : "opacity-60"
                  }`}
                  onClick={() => toggleSelect(i)}
                >
                  <div className="mt-0.5">
                    {selected.has(i) ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{act.name}</span>
                      <Badge variant={timeVariant[act.best_time] || "secondary"}>
                        {act.best_time}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{act.location}</p>
                    <p className="text-xs text-muted-foreground">{act.duration_minutes} min — {act.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleApply} disabled={selected.size === 0} className="flex-1">
                Add {selected.size} Activities
              </Button>
              <Button variant="outline" onClick={() => { setExtracted([]); setSelected(new Set()); }}>
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
