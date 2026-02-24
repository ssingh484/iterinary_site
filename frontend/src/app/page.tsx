"use client";

import { useEffect, useState } from "react";
import { Plus, MapPin, Calendar, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api, type ItinerarySummary } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

export default function HomePage() {
  const [itineraries, setItineraries] = useState<ItinerarySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("Japan");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();

  const fetchItineraries = async () => {
    try {
      const data = await api.listItineraries();
      setItineraries(data);
    } catch (err) {
      toast({
        title: "Failed to load itineraries",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItineraries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.createItinerary({
        title,
        destination,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setTitle("");
      setDestination("Japan");
      setStartDate("");
      setEndDate("");
      setCreateOpen(false);
      fetchItineraries();
      toast({ title: "Itinerary created!" });
    } catch (err) {
      toast({
        title: "Failed to create",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteItinerary(id);
      fetchItineraries();
      toast({ title: "Itinerary deleted" });
    } catch (err) {
      toast({
        title: "Failed to delete",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await api.importItinerary(file);
      fetchItineraries();
      toast({ title: `Imported "${imported.title}"` });
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
    // Reset the input so the same file can be re-imported
    e.target.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Itineraries</h2>
          <p className="text-muted-foreground mt-1">Plan your perfect Japan adventure</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 relative" asChild>
            <label>
              <Upload className="h-4 w-4" /> Import
              <input
                type="file"
                accept=".json,.md,.markdown"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleImport}
              />
            </label>
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New Itinerary
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Itinerary</DialogTitle>
              <DialogDescription>Fill in the details for your new trip.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Tokyo Spring 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start">Start Date</Label>
                  <Input
                    id="start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end">End Date</Label>
                  <Input
                    id="end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">Create Itinerary</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : itineraries.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-4xl mb-4">🗾</div>
            <h3 className="text-lg font-semibold mb-2">No itineraries yet</h3>
            <p className="text-muted-foreground mb-4">Create your first Japan itinerary to get started.</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Itinerary
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {itineraries.map((itin) => (
            <Card
              key={itin.id}
              className="group hover:shadow-md transition-shadow cursor-pointer relative"
            >
              <a href={`/itinerary/${itin.id}`} className="block">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{itin.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {itin.destination}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {itin.day_count} {itin.day_count === 1 ? "day" : "days"}
                    </div>
                  </div>
                  {itin.start_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(itin.start_date).toLocaleDateString()}
                      {itin.end_date && ` — ${new Date(itin.end_date).toLocaleDateString()}`}
                    </p>
                  )}
                </CardContent>
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(itin.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
