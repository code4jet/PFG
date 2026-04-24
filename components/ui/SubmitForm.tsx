"use client";
import React, {
  useState,
  FormEvent,
  useEffect,
  useRef,
} from "react";

/* Icons (black) */
const UploadIcon = () => (
  <svg className="w-8 h-8 text-black mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-5 h-5 text-black mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export default function SubmitForm() {
  /* ✅ ALL HOOKS FIRST (NO RETURNS ABOVE THIS) */
  const [mounted, setMounted] = useState(false);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const [type, setType] = useState("PYQ");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ✅ Client-only init */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* ✅ SAFE CONDITIONAL RENDER (AFTER HOOKS) */
  if (!mounted) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!file) return alert("Please select a file to upload.");

    try {
      setIsSubmitting(true);

      // 1. Upload to Cloudinary via our API route
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "pfg/pdfs");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || "File upload failed");
      }

      const uploadData = await uploadRes.json();
      const cloudinaryUrl = uploadData.url;

      // 2. Save metadata to Supabase via our admin API route (bypasses RLS)
      const submitRes = await fetch("/api/public/pdf/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          subject,
          semester: year,
          doc_type: type,
          file_path: cloudinaryUrl,
        }),
      });

      if (!submitRes.ok) {
        const errorData = await submitRes.json();
        throw new Error(errorData.error || "Database saving failed");
      }

      alert("✅ Submitted! Awaiting admin approval.");

      setTitle("");
      setSubject("");
      setYear("");
      setType("PYQ");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      console.error("SUBMISSION ERROR:", err);
      alert(err?.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-black">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border">
        <div className="p-6 text-center border-b">
          <h2 className="text-2xl font-bold text-black">Contribute Material</h2>
          <p className="text-sm text-black mt-1">
            Help your juniors by uploading PYQs or Assignments
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <input
            className="w-full px-4 py-2 border rounded-lg text-black"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <input
              className="w-full px-4 py-2 border rounded-lg text-black"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />

            <select
              className="w-full px-4 py-2 border rounded-lg text-black"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
            >
              <option value="" disabled>Select Year</option>
              <option>1st Year</option>
              <option>2nd Year</option>
              <option>3rd Year</option>
              <option>4th Year</option>
            </select>
          </div>

          <div className="flex gap-4">
            {["PYQ", "Assignment"].map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={type === opt}
                  onChange={() => setType(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-black px-1">Upload PDF / Image</label>
            <input
              type="file"
              accept=".pdf,image/*"
              className="w-full px-4 py-2 border rounded-lg text-black focus:ring-2 focus:ring-black/5"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                }
              }}
              required
              ref={fileInputRef}
            />
            <p className="text-[11px] text-gray-500 px-1">
              Max file size: 10MB
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-black text-white rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? "Uploading..." : "Submit Material"}
          </button>
        </form>
      </div>
    </div>
  );
}
