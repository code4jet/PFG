"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useScroll, useTransform } from "framer-motion";

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

interface AnnouncementsClientProps {
  announcements: Announcement[];
}

/* ─── PDF.js First-Page Preview (Canvas only, NO iframe) ─── */
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
    <div className="relative w-full bg-zinc-900/60 rounded-xl overflow-hidden" style={{ minHeight: "200px" }}>
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

/* ─── Full PDF Viewer Modal (renders ALL pages with PDF.js canvas, NO iframe) ─── */
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
      const container = containerRef.current;
      if (container) {
        addedNodes.forEach((node) => {
          try { container.removeChild(node); } catch (_) {}
        });
      }
    };
  }, [url]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
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

/* ─── Main Announcements Client (Instagram-style cards for home section) ─── */
export default function AnnouncementsClient({
  announcements,
}: AnnouncementsClientProps) {
  const [pdfModalUrl, setPdfModalUrl] = useState<string | null>(null);

  if (!announcements || announcements.length === 0) {
    return (
      <div className="w-full py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-zinc-400">No announcements at the moment.</p>
        </div>
      </div>
    );
  }

  const isPdf = (url: string) =>
    url?.toLowerCase().endsWith(".pdf") || url?.toLowerCase().includes(".pdf");

  const getFileUrl = (a: Announcement) => a.file_url || a.image_url || "";

  return (
    <>
      <div className="relative w-full py-20 px-4 min-h-screen overflow-hidden">
        {/* Simple Ladder Parallax Background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
          <div className="w-full h-full" style={{
            backgroundImage: "repeating-linear-gradient(transparent, transparent 40px, #ffffff 40px, #ffffff 42px), repeating-linear-gradient(90deg, transparent, transparent 100px, #ffffff 100px, #ffffff 102px)",
            backgroundSize: "100px 42px",
            maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)"
          }} />
        </div>

        <div className="w-full max-w-5xl mx-auto relative z-10">
          {/* Section Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              📢 Announcements
            </h2>
            <p className="text-zinc-400 mt-2 text-sm md:text-base max-w-xl mx-auto">
              Stay updated with the latest news and updates from our community.
            </p>
          </div>

          {/* Ladder Layout Feed */}
          <div className="relative mt-16">
            {/* The Main Vertical Rail (Ladder Pole) */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500/50 via-purple-500/50 to-transparent -translate-x-1/2 rounded-full hidden sm:block" />

            <div className="flex flex-col gap-16 md:gap-24 relative">
              {announcements.map((announcement, index) => {
                const fileUrl = getFileUrl(announcement);
                const hasPdf = isPdf(fileUrl);
                const hasImage = fileUrl && !hasPdf;
                const isEven = index % 2 === 0;

                return (
                  <motion.div
                    key={announcement.id}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`relative flex flex-col md:flex-row items-center gap-8 ${
                      isEven ? "md:flex-row" : "md:flex-row-reverse"
                    }`}
                  >
                    {/* The Rung (Horizontal connector) */}
                    <div 
                      className={`absolute top-1/2 -translate-y-1/2 h-1 bg-indigo-500/30 hidden md:block w-24
                        ${isEven ? "left-1/2" : "right-1/2"}
                      `}
                    />

                    {/* Glowing Node on the Rail */}
                    <div className="absolute left-8 md:left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.8)] hidden sm:block z-10 border-2 border-zinc-950" />

                    {/* Content Box */}
                    <div className="w-full sm:pl-20 md:pl-0 md:w-1/2 relative group">
                      <div className={`p-1 ${isEven ? "md:pr-12" : "md:pl-12"}`}>
                        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 backdrop-blur-md overflow-hidden shadow-2xl hover:shadow-indigo-500/20 hover:border-indigo-500/30 transition-all duration-300 flex flex-col transform hover:-translate-y-1">
                          
                          {/* Card Header */}
                          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-zinc-950/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-white text-sm font-bold shadow-inner">
                                📢
                              </div>
                              <div>
                                <p className="text-base font-bold text-white tracking-wide">{announcement.title}</p>
                                <p className="text-xs text-indigo-300/70 mt-0.5 font-medium">
                                  {new Date(announcement.created_at).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Preview Area */}
                          <div className="relative w-full overflow-hidden bg-zinc-950 min-h-[300px]">
                            {hasPdf ? (
                              <div className="w-full h-full scale-[1.02] origin-top">
                                <PdfFirstPagePreview url={fileUrl} />
                              </div>
                            ) : hasImage ? (
                              <img
                                src={fileUrl}
                                alt={announcement.title}
                                className="w-full h-[300px] object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-[200px] flex items-center justify-center bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
                                <span className="text-5xl opacity-40 filter drop-shadow-lg">📋</span>
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-5 space-y-4 bg-gradient-to-b from-transparent to-zinc-950/50">
                            <p className="text-sm text-zinc-300 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar pr-2">
                              {announcement.description}
                            </p>

                            {hasPdf && (
                              <button
                                onClick={() => setPdfModalUrl(fileUrl)}
                                className="w-full py-3 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 flex items-center justify-center gap-2 transition-all duration-200 text-white shadow-lg shadow-indigo-500/20 active:scale-95 text-sm font-semibold tracking-wide"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View PDF Document
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Full PDF Modal — rendered via portal to avoid React DOM conflicts */}
      {pdfModalUrl &&
        createPortal(
          <FullPdfModal url={pdfModalUrl} onClose={() => setPdfModalUrl(null)} />,
          document.body
        )}
    </>
  );
}
