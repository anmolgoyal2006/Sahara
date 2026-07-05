const cloudinary = require('cloudinary').v2;

// 1. Configure Cloudinary inline
cloudinary.config({
  cloud_name: 'nmtfgafy',
  api_key: '858162849226732',
  api_secret: 'ov_fO2lGkS7Od4wDHNPuwFAdtf8'
});

async function run() {
  try {
    console.log("Starting Cloudinary onboarding...");

    // 2. Upload a sample image
    const sampleImageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    console.log(`Uploading sample image: ${sampleImageUrl}`);
    
    const uploadResult = await cloudinary.uploader.upload(sampleImageUrl, {
      folder: 'onboarding'
    });

    console.log("Upload Success!");
    console.log(`Secure URL: ${uploadResult.secure_url}`);
    console.log(`Public ID: ${uploadResult.public_id}`);

    // 3. Get image details
    console.log("\nImage Details:");
    console.log(`Width: ${uploadResult.width}px`);
    console.log(`Height: ${uploadResult.height}px`);
    console.log(`Format: ${uploadResult.format}`);
    console.log(`File Size: ${uploadResult.bytes} bytes`);

    // 4. Transform the image
    // fetch_format: 'auto' (f_auto): Automatically selects the most optimized image format (e.g. WebP) supported by the requesting browser.
    // quality: 'auto' (q_auto): Automatically selects the optimal balance between visual quality and file size reduction.
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      secure: true,
      fetch_format: 'auto',
      quality: 'auto'
    });

    console.log("\nDone! Click link below to see optimized version of the image. Check the size and the format.");
    console.log(`Transformed URL: ${transformedUrl}`);

  } catch (error) {
    console.error("Error during execution:", error);
  }
}

run();
