"use client";

import { useEffect, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import * as pdfjsLib from "pdfjs-dist";
import { getAnnouncementsSupabaseClient } from "@/lib/supabaseAnnouncements";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type Announcement = {
  id: string;
  title: string;
  description: string;
  created_at: string;
  pdf_url?: string;
  file_url?: string;
};

const fetcher = async (): Promise<Announcement[]> => {
  const supabase = getAnnouncementsSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  return (data || []) as Announcement[];
};

function PdfPreviewCanvas({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function renderFirstPage() {
      setLoading(true);
      setError("");

      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        if (cancelled || !canvasRef.current) return;

        const viewport = page.getViewport({ scale: 1 });
        const desiredWidth = 520;
        const scale = desiredWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas context unavailable");

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;

        if (!cancelled) setLoading(false);
      } catch (err) {
        console.error("PDF preview error:", err);
        if (!cancelled) {
          setError("Could not load PDF preview.");
          setLoading(false);
        }
      }
    }

    renderFirstPage();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-white/10 bg-zinc-900/80 overflow-hidden">
        {loading && <div className="h-56 animate-pulse bg-zinc-800/80" />}
        {!loading && !error && (
          <canvas
            ref={canvasRef}
            className="w-full h-auto block"
            aria-label="PDF preview page 1"
          />
        )}
        {!loading && error && (
          <div className="h-56 flex items-center justify-center text-sm text-red-300 px-4 text-center">
            {error}
          </div>
        )}
      </div>
      <p className="text-xs text-zinc-400">Page 1</p>
    </div>
  );
}

export default function AnnouncementsPage() {
  const { data: announcements } = useSWR("supabase-announcements", fetcher);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  const [file, setFile] = useState<File | null>(null);

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
        pdf_url: file_url,
      },
    ]);

    if (!error) {
      setFormData({ title: "", description: "" });
      setFile(null);
      setIsModalOpen(false);
      mutate("supabase-announcements");
    } else {
      console.error("Database Error:", error);
      alert(`Error posting announcement: ${error.message}`);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen p-6 space-y-6 bg-zinc-950 text-zinc-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
          + Upload Announcement
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {announcements?.map((item) => {
          const pdfUrl = item.pdf_url || item.file_url || "";
          const isPdf = pdfUrl.toLowerCase().includes(".pdf");

          return (
            <Card
              key={item.id}
              className="rounded-2xl border border-indigo-500/30 bg-zinc-900/80 shadow-[0_0_24px_rgba(99,102,241,0.12)]"
            >
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                  <p className="text-xs text-zinc-400">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed">
                  {item.description}
                </p>

                {isPdf ? (
                  <div className="space-y-3">
                    <PdfPreviewCanvas url={pdfUrl} />
                    <Button
                      variant="outline"
                      className="w-full border-indigo-400/40 bg-zinc-900 hover:bg-zinc-800"
                      onClick={() => {
                        setSelectedPdfUrl(pdfUrl);
                        setIsPdfModalOpen(true);
                      }}
                    >
                      View Full PDF
                    </Button>
                  </div>
                ) : (
                  item.file_url && (
                    <img
                      src={item.file_url}
                      alt={item.title}
                      className="mt-2 w-full rounded-xl object-cover max-h-60 border border-white/10"
                    />
                  )
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

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
                <span className="text-sm text-gray-600 truncate max-w-[120px] sm:max-w-[200px]">
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

      <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
        <DialogContent className="max-w-5xl h-[85vh] p-2">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Announcement PDF</DialogTitle>
          </DialogHeader>
          <div className="h-full px-2 pb-2">
            {selectedPdfUrl ? (
              <iframe
                src={selectedPdfUrl}
                title="Full PDF preview"
                className="w-full h-full rounded-lg border border-white/10"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
