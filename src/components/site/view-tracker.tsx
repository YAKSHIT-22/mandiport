"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function CropViewTracker({ crop }: { crop: string }) {
  useEffect(() => {
    track("crop_hub_view", { crop });
  }, [crop]);
  return null;
}

export function BriefViewTracker({ crop, week }: { crop: string; week: string }) {
  useEffect(() => {
    track("brief_view", { crop, week });
  }, [crop, week]);
  return null;
}
