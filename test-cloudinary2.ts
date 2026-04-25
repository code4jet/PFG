import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function run() {
  const buffer = Buffer.from('%PDF-1.4\\n%EOF\\n');
  
  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "pfg/pdfs",
        resource_type: "image", // or auto
        format: "pdf",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
  
  console.log("Upload result:", uploadResult);
  
  const fileUrl = (uploadResult as any).secure_url;
  console.log("Fetching:", fileUrl);
  
  const res = await fetch(fileUrl);
  console.log("Fetch status:", res.status);
}

run().catch(console.error);
