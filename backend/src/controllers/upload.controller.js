// src/controllers/upload.controller.js
const cloudinary = require('cloudinary').v2;

exports.getSignedUploadUrl = async (req, res) => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const timestamp = Math.round((new Date()).getTime() / 1000);
    const signature = cloudinary.utils.sign_upload_request(
      { timestamp, folder: 'auto_uploader_videos', resource_type: 'video' },
      process.env.CLOUDINARY_API_SECRET
    );

    res.status(200).json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
