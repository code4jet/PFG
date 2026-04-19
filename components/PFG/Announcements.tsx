"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import useSWRInfinite from "swr/infinite";
import { mutate } from "swr";
import { getAnnouncementsSupabaseClient } from "@/lib/supabaseAnnouncements";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Announcement = {
  id: string;
  title: string;
  description: string;
  created_at: string;
  file_url?: string;
};

const PAGE_SIZE = 6;

const fetchAnnouncementsPage = async (
  key: readonly [string, number]
): Promise<Announcement[]> => {
  const [, pageIndex] = key;

  const supabase = getAnnouncementsSupabaseClient();
  if (!supabase) return [];

  const from = pageIndex * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    if (error.message && error.message.includes("AbortError")) return [];
    console.error("Failed to load announcements page:", error);
    return [];
  }

  return (data || []) as Announcement[];
};

const getAnnouncementsKey = (
  pageIndex: number,
  previousPageData: Announcement[] | null
): readonly [string, number] | null => {
  if (previousPageData && previousPageData.length === 0) return null;
  return ["supabase-announcements", pageIndex] as const;
};

/* ─── PDF.js First Page Preview (Canvas ONLY — NO iframe) ─── */
function PdfFirstPagePreview({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      setLoading(true);
      setError("");

      try {
        if (typeof window === "undefined") return;

        const pdfjsLib: any = await import("pdfjs-dist");

        if (pdfjsLib?.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url
          ).toString();
        }

        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        if (cancelled || !canvasRef.current) return;

        const viewport = page.getViewport({ scale: 1 });
        const desiredWidth = canvasRef.current.parentElement?.clientWidth || 400;
        const scale = desiredWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

        if (!cancelled) setLoading(false);
      } catch (err) {
        console.error("PDF preview error:", err);
        if (!cancelled) {
          setError("Could not load PDF preview.");
          setLoading(false);
        }
      }
    }

    renderPage();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="relative w-full bg-zinc-800/40 rounded-xl overflow-hidden" style={{ minHeight: "180px" }}>
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-red-400 px-4 text-center">
          {error}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-auto block"
        style={{ display: loading || error ? "none" : "block" }}
        aria-label="PDF preview page 1"
      />
    </div>
  );
}

/* ─── Full PDF Viewer Modal (all pages rendered via PDF.js canvas, NO iframe) ─── */
function FullPdfModal({ url, onClose }: { url: string; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const addedNodes: Node[] = [];

    async function renderAllPages() {
      setLoading(true);
      try {
        if (typeof window === "undefined") return;

        const pdfjsLib: any = await import("pdfjs-dist");
        if (pdfjsLib?.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url
          ).toString();
        }

        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        if (cancelled) return;
        setPageCount(pdf.numPages);

        const container = containerRef.current;
        if (!container) return;

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          const desiredWidth = Math.min(container.clientWidth - 32, 900);
          const scale = desiredWidth / viewport.width;
          const scaledViewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.style.borderRadius = "8px";
          canvas.style.marginBottom = "16px";
          canvas.style.boxShadow = "0 2px 12px rgba(0,0,0,0.25)";

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          // Page number label
          const label = document.createElement("p");
          label.textContent = `Page ${i} of ${pdf.numPages}`;
          label.style.textAlign = "center";
          label.style.fontSize = "12px";
          label.style.color = "#94a3b8";
          label.style.marginBottom = "8px";
          label.style.marginTop = i > 1 ? "12px" : "0";

          container.appendChild(label);
          container.appendChild(canvas);
          addedNodes.push(label, canvas);

          await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        }

        if (!cancelled) setLoading(false);
      } catch (err) {
        console.error("Full PDF render error:", err);
        if (!cancelled) setLoading(false);
      }
    }

    renderAllPages();
    return () => {
      cancelled = true;
      // Safely remove only the nodes we added
      const container = containerRef.current;
      if (container) {
        addedNodes.forEach((node) => {
          try { container.removeChild(node); } catch (_) {}
        });
      }
    };
  }, [url]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-4xl mx-4 max-h-[92vh] bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-white">Full PDF Preview</h3>
            {pageCount > 0 && (
              <p className="text-xs text-zinc-400 mt-0.5">{pageCount} page{pageCount > 1 ? "s" : ""}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors text-lg font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4" style={{ WebkitOverflowScrolling: "touch" }}>
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-zinc-400">Loading PDF...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN ANNOUNCEMENTS PAGE ─── */
export default function AnnouncementsPage() {
  const {
    data: pages,
    size,
    setSize,
    isLoading,
  } = useSWRInfinite(getAnnouncementsKey, fetchAnnouncementsPage, {
    revalidateFirstPage: true,
  });

  const announcements = pages ? pages.flat() : null;
  const hasMore =
    pages &&
    pages.length > 0 &&
    (pages[pages.length - 1]?.length ?? 0) === PAGE_SIZE;

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (isLoading) return;
        if (!hasMore) return;
        setSize(size + 1);
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoading, setSize, size]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pdfModalUrl, setPdfModalUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({ title: "", description: "" });
  const [file, setFile] = useState<File | null>(null);

  const isPdf = (url: string) =>
    url?.toLowerCase().endsWith(".pdf") || url?.toLowerCase().includes(".pdf");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const supabase = getAnnouncementsSupabaseClient();
    if (!supabase) {
      alert("Supabase client not initialized. Please check your environment variables.");
      setIsSubmitting(false);
      return;
    }

    let file_url: string | null = null;

    if (file) {
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
      ];

      if (!allowedTypes.includes(file.type)) {
        alert("Only PDF and image files are allowed");
        setIsSubmitting(false);
        return;
      }

      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("announcements-images")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload Error:", uploadError);
        alert(`File upload failed: ${uploadError.message}`);
        setIsSubmitting(false);
        return;
      }

      const { data } = supabase.storage
        .from("announcements-images")
        .getPublicUrl(fileName);

      file_url = data.publicUrl;
    }

    const { error } = await supabase.from("announcements").insert([
      {
        title: formData.title,
        description: formData.description,
        file_url,
        is_active: false,
      },
    ]);

    if (!error) {
      setFormData({ title: "", description: "" });
      setFile(null);
      setIsModalOpen(false);
      setSize(1);
      mutate(["supabase-announcements", 0]);
      alert(
        "✅ Your announcement submitted successfully!\n\n⏳ Please wait for admin approval. It will appear on the home page once approved."
      );
    } else {
      console.error("Database Error:", error);
      alert(`❌ Error posting announcement: ${error.message}`);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-4xl xl:max-w-5xl mx-auto mb-8">
        <div className="space-y-1">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Announcements
          </h1>
          <p className="text-zinc-400 text-base md:text-lg">Don't miss the latest updates</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg sticky top-4 z-10 px-6 py-6 text-md font-semibold rounded-xl"
        >
          + Upload Announcement
        </Button>
      </div>

      {/* Content */}
      {!announcements ? (
        <div className="w-full max-w-4xl xl:max-w-5xl mx-auto space-y-12">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl h-[600px] flex flex-col">
              <div className="h-20 border-b border-white/5 flex items-center px-6 gap-4">
                 <div className="w-12 h-12 rounded-full bg-white/10" />
                 <div className="space-y-3">
                   <div className="w-48 h-5 bg-white/10 rounded" />
                   <div className="w-32 h-3 bg-white/10 rounded" />
                 </div>
              </div>
              <div className="flex-1 bg-white/[0.02]" />
              <div className="p-8 space-y-4 border-t border-white/5 bg-zinc-900/20">
                 <div className="w-3/4 h-6 bg-white/10 rounded" />
                 <div className="w-1/2 h-4 bg-white/10 rounded" />
                 <div className="w-full mt-4 h-12 bg-white/10 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="w-full max-w-4xl xl:max-w-5xl mx-auto text-center bg-zinc-900/30 border border-white/5 rounded-3xl py-24 px-6 shadow-2xl flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20">
            <span className="text-5xl">📢</span>
          </div>
          <p className="text-zinc-200 text-3xl font-bold tracking-tight">No announcements yet</p>
          <p className="text-zinc-400 text-lg mt-4 max-w-md mx-auto">
            There are currently no active announcements. Check back later or upload a new one if you're an admin.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-4xl xl:max-w-5xl mx-auto">
          {/* Main Feed */}
          <div className="flex flex-col gap-10 md:gap-16">
            {announcements.map((item) => {
              const fileUrl = item.file_url || "";
              const hasPdf = isPdf(fileUrl);
              const hasImage = fileUrl && !hasPdf;

              return (
                <div
                  key={item.id}
                  className="group rounded-3xl border border-white/[0.08] bg-zinc-900/70 backdrop-blur-xl overflow-hidden shadow-2xl hover:shadow-indigo-500/15 hover:border-indigo-500/30 transition-all duration-300 flex flex-col min-h-[70vh]"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08] bg-zinc-900/90">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                        📢
                      </div>
                      <div>
                        <p className="text-lg md:text-xl font-bold text-white tracking-tight">{item.title}</p>
                        <p className="text-sm text-zinc-400 font-medium tracking-wide mt-1">
                          {new Date(item.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preview Area — fills available height */}
                  <div className="relative w-full flex-grow overflow-hidden bg-zinc-950/80 min-h-[50vh] flex items-center justify-center border-b border-white/5">
                    {hasPdf ? (
                      <div className="w-full h-full min-h-[50vh] p-4 md:p-8 flex items-center justify-center bg-zinc-800/20">
                        <PdfFirstPagePreview url={fileUrl} />
                      </div>
                    ) : hasImage ? (
                      <img
                        src={fileUrl}
                        alt={item.title}
                        className="w-full h-full object-contain max-h-[70vh]"
                      />
                    ) : (
                      <div className="w-full h-full min-h-[50vh] flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
                        <span className="text-8xl opacity-10 mb-6 drop-shadow-xl saturate-0">📋</span>
                        <p className="text-zinc-600 font-medium tracking-widest uppercase text-sm">Text Announcement</p>
                      </div>
                    )}
                  </div>

                  {/* Content — below preview */}
                  <div className="px-6 md:px-10 py-8 space-y-6 bg-zinc-900/80">
                    <div className="space-y-3">
                       <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight">{item.title}</h3>
                       <p className="text-base md:text-xl text-zinc-300 leading-relaxed font-normal opacity-90">
                         {item.description}
                       </p>
                    </div>

                    {/* View Full PDF button */}
                    {hasPdf && (
                      <button
                        onClick={() => setPdfModalUrl(fileUrl)}
                        className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-base md:text-lg font-bold transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg hover:shadow-indigo-500/25"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Full PDF Document
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load more sentinel */}
          <div ref={loadMoreRef} className="py-6 text-center text-zinc-400" aria-hidden>
            {announcements.length > 0 && hasMore ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading more...</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Upload Announcement Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Announcement</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3 sm:space-y-4">
            <Input
              placeholder="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <Textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />

            <div className="space-y-2">
              <label
                htmlFor="fileUpload"
                className="cursor-pointer inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 w-full sm:w-auto justify-center sm:justify-start"
              >
                + Choose File
              </label>

              <input
                id="fileUpload"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
              />

              {file && (
                <span className="text-sm text-gray-600 truncate max-w-[120px] sm:max-w-[200px] block">
                  {file.name}
                </span>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Uploading..." : "Submit"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full PDF Modal — rendered via portal to avoid React DOM conflicts */}
      {pdfModalUrl &&
        createPortal(
          <FullPdfModal url={pdfModalUrl} onClose={() => setPdfModalUrl(null)} />,
          document.body
        )}
    </div>
  );
}
