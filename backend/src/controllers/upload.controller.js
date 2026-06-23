// src/controllers/upload.controller.js
const cloudinary = require('cloudinary').v2;

// Configure once at module load
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.getSignedUploadUrl = async (req, res) => {
  try {
    const timestamp = Math.round(Date.now() / 1000);

    // IMPORTANT: Only sign the params that the frontend sends as form fields.
    // 'resource_type' is part of the URL path (/video/upload), NOT a form field,
    // so it must NOT be included in the signature hash.
    const paramsToSign = {
      timestamp,
      folder: 'auto_uploader_videos',
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    res.status(200).json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error) {
    console.error('Signature generation error:', error);
    res.status(500).json({ error: error.message });
  }
};
