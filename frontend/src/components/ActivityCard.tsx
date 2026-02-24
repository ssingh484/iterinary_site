"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Clock, MapPin, Trash2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/lib/api";

interface ActivityCardProps {
  activity: Activity;
  itineraryId: string;
  dayId: string;
  onDelete: (activityId: string) => void;
  onEdit: (activity: Activity) => void;
}

const timeVariant: Record<string, "morning" | "afternoon" | "evening" | "secondary"> = {
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
  any: "secondary",
};

export function ActivityCard({ activity, onDelete, onEdit }: ActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? "opacity-50 shadow-lg ring-2 ring-primary" : ""
      }`}
    >
      <button
        className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-medium text-sm truncate">{activity.name}</h4>
          <Badge variant={timeVariant[activity.best_time] || "secondary"}>
            {activity.best_time}
          </Badge>
        </div>

        {activity.location && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{activity.location}</span>
          </div>
        )}

        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{activity.duration_minutes} min</span>
          </div>
        </div>

        {activity.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {activity.description}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(activity)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(activity.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
