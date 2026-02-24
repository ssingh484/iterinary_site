"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { ArrowLeft, Plus, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DaySection } from "@/components/DaySection";
import { LLMExtractor } from "@/components/LLMExtractor";
import { EditActivityDialog } from "@/components/EditActivityDialog";
import { api, type Itinerary, type Activity } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

export default function ItineraryPage() {
  const params = useParams();
  const itineraryId = params.id as string;
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editActivity, setEditActivity] = useState<{ dayId: string; activity: Activity } | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItinerary = useCallback(async () => {
    try {
      const data = await api.getItinerary(itineraryId);
      setItinerary(data);
    } catch (err) {
      toast({
        title: "Failed to load itinerary",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [itineraryId, toast]);

  useEffect(() => {
    fetchItinerary();
  }, [fetchItinerary]);

  const handleAddDay = async () => {
    if (!itinerary) return;
    const nextDayNum = itinerary.days.length > 0
      ? Math.max(...itinerary.days.map((d) => d.day_number)) + 1
      : 1;
    try {
      await api.addDay(itineraryId, { day_number: nextDayNum });
      fetchItinerary();
    } catch (err) {
      toast({
        title: "Failed to add day",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    try {
      await api.deleteDay(itineraryId, dayId);
      fetchItinerary();
    } catch (err) {
      toast({
        title: "Failed to delete day",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleAddActivity = async (
    dayId: string,
    data: { name: string; location: string; duration_minutes: number; description: string; best_time: string }
  ) => {
    try {
      await api.addActivity(itineraryId, dayId, data);
      fetchItinerary();
    } catch (err) {
      toast({
        title: "Failed to add activity",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteActivity = async (dayId: string, activityId: string) => {
    try {
      await api.deleteActivity(itineraryId, dayId, activityId);
      fetchItinerary();
    } catch (err) {
      toast({
        title: "Failed to delete activity",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleEditActivity = (dayId: string, activity: Activity) => {
    setEditActivity({ dayId, activity });
  };

  const handleSaveEdit = async (data: Partial<Activity>) => {
    if (!editActivity) return;
    try {
      await api.updateActivity(itineraryId, editActivity.dayId, editActivity.activity.id, data);
      setEditActivity(null);
      fetchItinerary();
    } catch (err) {
      toast({
        title: "Failed to update activity",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Find which day an activity belongs to
  const findDayForActivity = (activityId: string) => {
    if (!itinerary) return null;
    for (const day of itinerary.days) {
      if (day.activities.some((a) => a.id === activityId)) {
        return day;
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !itinerary) return;

    const activeActivityId = active.id as string;
    const overIdStr = over.id as string;

    const sourceDay = findDayForActivity(activeActivityId);
    if (!sourceDay) return;

    // Determine target day
    let targetDay = findDayForActivity(overIdStr);
    if (!targetDay && overIdStr.startsWith("day-")) {
      // Dropped on a day container
      const dayId = overIdStr.replace("day-", "");
      targetDay = itinerary.days.find((d) => d.id === dayId) || null;
    }
    if (!targetDay) return;

    if (sourceDay.id === targetDay.id) {
      // Same day reorder
      const activities = [...sourceDay.activities];
      const oldIndex = activities.findIndex((a) => a.id === activeActivityId);
      const newIndex = activities.findIndex((a) => a.id === overIdStr);

      if (oldIndex === -1 || (newIndex === -1 && !overIdStr.startsWith("day-"))) return;

      const effectiveNewIndex = newIndex === -1 ? activities.length - 1 : newIndex;
      const [moved] = activities.splice(oldIndex, 1);
      activities.splice(effectiveNewIndex, 0, moved);

      const activityIds = activities.map((a) => a.id);

      // Optimistic update
      const updatedDays = itinerary.days.map((d) =>
        d.id === sourceDay.id
          ? { ...d, activities: activities.map((a, i) => ({ ...a, activity_order: i })) }
          : d
      );
      setItinerary({ ...itinerary, days: updatedDays });

      try {
        await api.reorderActivities(itineraryId, sourceDay.id, activityIds);
      } catch {
        fetchItinerary();
      }
    } else {
      // Cross-day move
      const overIndex = targetDay.activities.findIndex((a) => a.id === overIdStr);
      const newOrder = overIndex === -1 ? targetDay.activities.length : overIndex;

      try {
        await api.moveActivity(itineraryId, {
          activity_id: activeActivityId,
          source_day_id: sourceDay.id,
          target_day_id: targetDay.id,
          new_order: newOrder,
        });
        fetchItinerary();
      } catch (err) {
        toast({
          title: "Failed to move activity",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
        fetchItinerary();
      }
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback handled by useDroppable in DaySection
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Itinerary not found</p>
        <Button variant="outline" className="mt-4" asChild>
          <a href="/">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <a
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to itineraries
          </a>
          <h2 className="text-3xl font-bold tracking-tight">{itinerary.title}</h2>
          <p className="text-muted-foreground mt-1">{itinerary.destination}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <LLMExtractor
            itineraryId={itineraryId}
            days={itinerary.days}
            onActivitiesAdded={fetchItinerary}
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              const url = api.exportItinerary(itineraryId, "json");
              window.open(url, "_blank");
            }}
          >
            <Download className="h-4 w-4" /> JSON
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              const url = api.exportItinerary(itineraryId, "markdown");
              window.open(url, "_blank");
            }}
          >
            <Download className="h-4 w-4" /> Markdown
          </Button>
          <Button onClick={handleAddDay} className="gap-2">
            <Plus className="h-4 w-4" /> Add Day
          </Button>
        </div>
      </div>

      {/* Days */}
      {itinerary.days.length === 0 ? (
        <div className="text-center py-12 rounded-xl border bg-card">
          <div className="text-4xl mb-4">📅</div>
          <h3 className="text-lg font-semibold mb-2">No days added yet</h3>
          <p className="text-muted-foreground mb-4">Start by adding a day to your itinerary.</p>
          <Button onClick={handleAddDay} className="gap-2">
            <Plus className="h-4 w-4" /> Add Day
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="space-y-4">
            {itinerary.days.map((day) => (
              <DaySection
                key={day.id}
                day={day}
                itineraryId={itineraryId}
                onAddActivity={handleAddActivity}
                onDeleteActivity={handleDeleteActivity}
                onEditActivity={handleEditActivity}
                onDeleteDay={handleDeleteDay}
              />
            ))}
          </div>
          <DragOverlay>
            {activeId ? (
              <div className="rounded-lg border bg-white p-3 shadow-xl opacity-80">
                <span className="text-sm font-medium">Moving activity...</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Edit Dialog */}
      <EditActivityDialog
        activity={editActivity?.activity || null}
        open={!!editActivity}
        onOpenChange={(open) => { if (!open) setEditActivity(null); }}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
