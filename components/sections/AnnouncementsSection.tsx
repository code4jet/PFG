"use client";

import { useEffect, useState } from "react";
import AnnouncementsClient from "@/components/AnnouncementsClient";
import { getAnnouncementsSupabaseClient } from "@/lib/supabaseAnnouncements";

interface Announcement {
  id: string;
  title: string;
  description: string;
  image_url: string;
  file_url?: string;
  link?: string;
  created_at: string;
  is_active: boolean;
}

export function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const supabase = getAnnouncementsSupabaseClient();
        if (!supabase) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(13);

        if (error) {
          const errorMsg = error?.message || "";
          if (!errorMsg.includes("AbortError")) {
            console.error("Failed to load announcements:", error);
          }
          setLoading(false);
          return;
        }

        // Map file_url to image_url for consistency, keep file_url too
        const mapped = (data || []).map((a: any) => ({
          ...a,
          image_url: a.file_url || a.image_url || a.image_path || "",
        }));

        setAnnouncements(mapped);
      } catch (err) {
        console.error("Error fetching announcements:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();
  }, []);

  if (loading || announcements.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <AnnouncementsClient announcements={announcements} />
    </div>
  );
}
