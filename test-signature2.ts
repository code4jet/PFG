import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function run() {
  const publicId = 'pfg/pdfs/jv09fpfwrvo1xlcnurss';
  
  const signedUrl = cloudinary.url(publicId, {
    resource_type: 'image',
    format: 'pdf',
    sign_url: true, // This adds s--signature-- to the URL!
  });
  console.log("Signed delivery URL:");
  console.log(signedUrl);
  
  const res = await fetch(signedUrl);
  console.log("Status:", res.status);
}

run().catch(console.error);
