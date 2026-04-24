import cloudinary from "@/lib/cloudinary";
import { NextResponse } from "next/server";

/**
 * POST /api/upload
 *
 * Universal upload route for Cloudinary (Handles both Images and PDFs).
 * - Expects FormData with 'file' (the actual file)
 * - Optional 'folder' (e.g., 'pfg/announcements' or 'pfg/pdfs')
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folderName = (formData.get("folder") as string) || "pfg/general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type (images + PDFs only)
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and image files are allowed" },
        { status: 400 }
      );
    }

    // Max file size: 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be under 10 MB" },
        { status: 400 }
      );
    }

    // Convert File to Buffer for stream upload (Avoids base64 memory overhead/corruption)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const isPdf = file.type === "application/pdf";

    // Upload to Cloudinary using upload_stream
    const result: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folderName,
          resource_type: isPdf ? "image" : "auto", // PDFs must be 'image' for Cloudinary to generate previews, but 'image' is standard for PDFs in Cloudinary
          format: isPdf ? "pdf" : undefined, // Force .pdf extension for proper browser rendering
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    // Ensure URL has .pdf extension if it's a PDF
    let finalUrl = result.secure_url;
    if (isPdf && !finalUrl.endsWith(".pdf")) {
      finalUrl += ".pdf";
    }

    // Return the CDN URL + public_id (needed for deleting later)
    return NextResponse.json({
      url: finalUrl,
      public_id: result.public_id,
    });
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
