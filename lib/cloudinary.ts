import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary server-side client.
 *
 * WHY: Cloudinary API_SECRET must NEVER be exposed to the browser.
 * This file is only imported in API routes (server-side), never in components.
 *
 * Think of this like supabaseAdmin.ts — server only.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // always use https URLs
});

export default cloudinary;
