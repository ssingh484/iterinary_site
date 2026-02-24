"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Activity } from "@/lib/api";

interface EditActivityDialogProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Activity>) => void;
}

export function EditActivityDialog({ activity, open, onOpenChange, onSave }: EditActivityDialogProps) {
  const [formData, setFormData] = useState({
    name: activity?.name || "",
    location: activity?.location || "",
    duration_minutes: activity?.duration_minutes || 60,
    description: activity?.description || "",
    best_time: activity?.best_time || "any",
  });

  // Sync when activity changes
  if (activity && formData.name !== activity.name && formData.location !== activity.location) {
    setFormData({
      name: activity.name,
      location: activity.location || "",
      duration_minutes: activity.duration_minutes,
      description: activity.description || "",
      best_time: activity.best_time,
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Activity</DialogTitle>
          <DialogDescription>Update the activity details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-location">Location</Label>
            <Input
              id="edit-location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-duration">Duration (min)</Label>
              <Input
                id="edit-duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                min={5}
                max={1440}
              />
            </div>
            <div>
              <Label htmlFor="edit-time">Best Time</Label>
              <select
                id="edit-time"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.best_time}
                onChange={(e) => setFormData({ ...formData, best_time: e.target.value })}
              >
                <option value="any">Any time</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="edit-desc">Description</Label>
            <Input
              id="edit-desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
