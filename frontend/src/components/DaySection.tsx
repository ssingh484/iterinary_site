"use client";

import { useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActivityCard } from "@/components/ActivityCard";
import type { Day, Activity } from "@/lib/api";

interface DaySectionProps {
  day: Day;
  itineraryId: string;
  onAddActivity: (dayId: string, data: { name: string; location: string; duration_minutes: number; description: string; best_time: string }) => void;
  onDeleteActivity: (dayId: string, activityId: string) => void;
  onEditActivity: (dayId: string, activity: Activity) => void;
  onDeleteDay: (dayId: string) => void;
}

export function DaySection({
  day,
  itineraryId,
  onAddActivity,
  onDeleteActivity,
  onEditActivity,
  onDeleteDay,
}: DaySectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    duration_minutes: 60,
    description: "",
    best_time: "any",
  });

  const { setNodeRef, isOver } = useDroppable({ id: `day-${day.id}` });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onAddActivity(day.id, formData);
    setFormData({ name: "", location: "", duration_minutes: 60, description: "", best_time: "any" });
    setShowForm(false);
  };

  const dateStr = day.date
    ? new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : null;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border bg-card transition-colors ${
        isOver ? "ring-2 ring-primary bg-primary/5" : ""
      }`}
    >
      {/* Day Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button
          className="flex items-center gap-2 hover:text-primary transition-colors"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <h3 className="font-semibold text-base">Day {day.day_number}</h3>
          {dateStr && <span className="text-sm text-muted-foreground">— {dateStr}</span>}
          <span className="text-xs text-muted-foreground ml-2">
            ({day.activities.length} {day.activities.length === 1 ? "activity" : "activities"})
          </span>
        </button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDeleteDay(day.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Inline Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border-b bg-muted/30 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Activity name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              placeholder="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              placeholder="Duration (min)"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
              min={5}
              max={1440}
            />
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.best_time}
              onChange={(e) => setFormData({ ...formData, best_time: e.target.value })}
            >
              <option value="any">Any time</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
            <Input
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Add Activity</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Activities List */}
      {!collapsed && (
        <div className="p-4 space-y-2 min-h-[60px]">
          {day.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activities yet. Click &quot;Add&quot; or drag activities here.
            </p>
          ) : (
            <SortableContext
              items={day.activities.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              {day.activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  itineraryId={itineraryId}
                  dayId={day.id}
                  onDelete={(activityId) => onDeleteActivity(day.id, activityId)}
                  onEdit={(act) => onEditActivity(day.id, act)}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}
