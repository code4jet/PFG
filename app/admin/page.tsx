"use client";

import React, { useState } from "react";
import useSWR from "swr";
import {
  Lock,
  LayoutDashboard,
  Settings,
  LogOut,
  Users,
  BarChart3,
  Check,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/* ---------------- SUPABASE HELPERS ---------------- */
type AnnouncementAdmin = {
  id: string;
  title: string;
  file_url?: string;
  description: string;
  created_at: string;
};

const fetchPending = async () => {
  const res = await fetch("/api/admin/pdfs");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Failed to load pending PDFs");
  return body.data || [];
};

async function approvePdf(id: string) {
  const res = await fetch("/api/admin/pdf/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("Approve failed:", res.status, body);
    throw new Error(body.error || "Failed to approve PDF");
  }
}

async function rejectPdf(id: string, filePath: string) {
  const res = await fetch("/api/admin/pdf/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, filePath }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("Reject failed:", res.status, body);
    throw new Error(body.error || "Failed to reject PDF");
  }
}

async function fetchAnnouncementsAdmin(): Promise<AnnouncementAdmin[]> {
  const res = await fetch("/api/admin/announcements?approved=true");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Failed to load announcements");
  return body.data || [];
}

async function deleteAnnouncement(id: string) {
  const res = await fetch("/api/admin/announcements", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to delete announcement");
  }
}

async function clearAllAnnouncements() {
  const res = await fetch("/api/admin/announcements/clear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to clear announcements");
  }
}

async function approveAnnouncement(id: string) {
  const res = await fetch("/api/admin/announcements", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, is_active: true }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("Approve failed:", res.status, body);
    throw new Error(body.error || "Failed to approve announcement");
  }
}

async function rejectAnnouncement(id: string) {
  const res = await fetch("/api/admin/announcements", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("Reject failed:", res.status, body);
    throw new Error(body.error || "Failed to reject announcement");
  }
}

async function fetchPendingAnnouncements(): Promise<AnnouncementAdmin[]> {
  const res = await fetch("/api/admin/announcements?pending=true");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Failed to load pending announcements");
  return body.data || [];
}

/* ---------------- ADMIN DASHBOARD ---------------- */

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const { data, mutate, error: pendingPdfsError } = useSWR("pending-pdfs", fetchPending);
  const {
    data: pendingAnnouncements,
    mutate: mutatePendingAnnouncements,
    error: pendingAnnouncementsError,
  } = useSWR("pending-announcements", fetchPendingAnnouncements);
  const {
    data: announcements,
    mutate: mutateAnnouncements,
    error: announcementsError,
  } = useSWR("admin-announcements", fetchAnnouncementsAdmin);

  // Auto-logout if any of the data fetches return 401
  React.useEffect(() => {
    if (
      pendingPdfsError?.message?.includes("Unauthorized") ||
      pendingAnnouncementsError?.message?.includes("Unauthorized") ||
      announcementsError?.message?.includes("Unauthorized")
    ) {
      onLogout();
    }
  }, [pendingPdfsError, pendingAnnouncementsError, announcementsError, onLogout]);

  return (
    <div className="flex h-screen bg-gray-50 text-black">
      <aside className="w-64 bg-white border-r hidden md:flex flex-col shadow-sm">
        <div className="p-6 font-bold text-xl border-b">AdminPanel</div>

        <nav className="p-4 space-y-2 flex-1">
          <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-medium transition-colors">
            <LayoutDashboard size={18} /> Dashboard
          </div>
          <div className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-black rounded-xl transition-colors cursor-pointer">
            <Users size={18} /> Users
          </div>
          <div className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-black rounded-xl transition-colors cursor-pointer">
            <BarChart3 size={18} /> Analytics
          </div>
          <div className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-black rounded-xl transition-colors cursor-pointer">
            <Settings size={18} /> Settings
          </div>
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-3 text-red-600 w-full px-4 py-3 rounded-xl hover:bg-red-50 font-medium transition-all active:scale-95"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl md:text-2xl font-bold">Admin Dashboard</h2>
          <button
            onClick={onLogout}
            className="md:hidden flex items-center gap-2 text-red-600 text-sm font-medium px-3 py-2 rounded-lg bg-red-50 active:scale-95 transition-all"
          >
            <LogOut size={16} /> Logout
          </button>
        </header>

        <div className="p-4 md:p-8 space-y-4 max-w-5xl mx-auto">
          <h3 className="text-lg font-semibold">Pending PDF Submissions</h3>
          {data?.length === 0 && (
            <div className="text-gray-500 text-center py-20 bg-white border border-dashed rounded-xl">
              No pending PDFs 🎉
            </div>
          )}

          {data?.map((d: any) => (
            <div
              key={d.id}
              className="bg-white border rounded-xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:shadow-md"
            >
              <div className="space-y-1">
                <p className="font-semibold text-lg text-black">{d.title}</p>
                <p className="text-sm text-gray-600">
                  {d.subject} • {d.semester} • {d.doc_type}
                </p>

                <a
                  href={d.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 text-sm text-indigo-600 hover:text-indigo-800 underline font-medium transition-colors"
                >
                  View PDF
                </a>
              </div>

              <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <button
                  onClick={async () => {
                    try {
                      await approvePdf(d.id);
                      await mutate();
                    } catch (err: any) {
                      alert(err?.message || "Failed to approve PDF");
                    }
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 font-medium transition-all active:scale-95"
                >
                  <Check size={16} /> Approve
                </button>

                <button
                  onClick={async () => {
                    try {
                      await rejectPdf(d.id, d.file_path);
                      await mutate();
                    } catch (err: any) {
                      alert(err?.message || "Failed to reject PDF");
                    }
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 font-medium transition-all active:scale-95"
                >
                  <X size={16} /> Reject
                </button>
              </div>
            </div>
          ))}

          <div className="pt-6 border-t mt-6" />
          <h3 className="text-lg font-semibold">Pending Announcements</h3>
          {pendingAnnouncementsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
              Could not load pending announcements
            </div>
          )}
          {!pendingAnnouncementsError && pendingAnnouncements?.length === 0 && (
            <div className="text-gray-500 text-center py-20 bg-white border border-dashed rounded-xl">
              No pending announcements 🎉
            </div>
          )}
          {pendingAnnouncements?.map((a) => (
            <div
              key={a.id}
              className="bg-white border rounded-xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:shadow-md"
            >
              <div className="space-y-1">
                <p className="font-semibold text-lg text-black">{a.title}</p>
                <p className="text-sm text-gray-600">{a.description}</p>
                <p className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</p>
                {a.file_url && (
                  <a
                    href={a.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 text-sm text-indigo-600 hover:text-indigo-800 underline font-medium transition-colors"
                  >
                    View Attachment
                  </a>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <button
                  onClick={async () => {
                    try {
                      await approveAnnouncement(a.id);
                      await mutatePendingAnnouncements();
                    } catch (err: any) {
                      alert(err?.message || "Failed to approve announcement");
                    }
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 font-medium transition-all active:scale-95"
                >
                  <Check size={16} /> Approve
                </button>

                <button
                  onClick={async () => {
                    try {
                      await rejectAnnouncement(a.id);
                      await mutatePendingAnnouncements();
                    } catch (err: any) {
                      alert(err?.message || "Failed to reject announcement");
                    }
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 font-medium transition-all active:scale-95"
                >
                  <X size={16} /> Reject
                </button>
              </div>
            </div>
          ))}

          <div className="pt-6 border-t mt-6" />
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">Approved Announcements</h3>
            <button
              onClick={async () => {
                if (!confirm("Delete all announcements?")) return;
                try {
                  await clearAllAnnouncements();
                  await mutateAnnouncements();
                } catch (err: any) {
                  alert(err?.message || "Failed to clear announcements");
                }
              }}
              className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 font-medium transition-all active:scale-95 text-sm whitespace-nowrap"
            >
              Clear All
            </button>
          </div>
          {announcementsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
              Could not load announcements
            </div>
          )}
          {!announcementsError && announcements?.length === 0 && (
            <div className="text-gray-500 text-center py-10 bg-white border border-dashed rounded-xl">
              No announcements found.
            </div>
          )}
          {announcements?.map((a) => (
            <div
              key={a.id}
              className="bg-white border rounded-xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:shadow-md"
            >
              <div className="space-y-1">
                <p className="font-semibold text-lg text-black">{a.title}</p>
                <p className="text-sm text-gray-600">{a.description}</p>
                <p className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <button
                  onClick={async () => {
                    try {
                      await deleteAnnouncement(a.id);
                      await mutateAnnouncements();
                    } catch (err: any) {
                      alert(err?.message || "Failed to delete announcement");
                    }
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 font-medium transition-all active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  return <AdminPanel onLogout={handleLogout} />;
}
