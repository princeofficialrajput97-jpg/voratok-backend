// ─────────────────────────────────────────────────────────────────
// src/services/storageService.js  —  Cloudinary CDN Storage Driver
// Uploads videos & photos to Cloudinary CDN with auto-transcoding & thumbnails
// ─────────────────────────────────────────────────────────────────
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'sj4npii7',
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true
});

export class StorageService {

  // ── Test Cloudinary Connection ─────────────────────────────────
  static async testConnection() {
    return new Promise((resolve) => {
      cloudinary.api.ping((err, res) => {
        if (err) {
          console.warn('⚠️  Cloudinary connection failed:', err.message);
          resolve(false);
        } else {
          console.log(`✅ Cloudinary CDN connected → Cloud: "${process.env.CLOUDINARY_CLOUD_NAME || 'sj4npii7'}" | Status: ${res.status}`);
          resolve(true);
        }
      });
    });
  }

  // ── Upload Video (Base64 or URL or Local File Path) ────────────
  static async uploadVideo(videoInput, { folder = 'voratok/videos', public_id = null } = {}) {
    if (!videoInput) throw new Error('No video data provided for upload.');

    try {
      const options = {
        resource_type: 'video',
        folder,
        eager: [
          { format: 'jpg', transformation: [{ width: 600, height: 1066, crop: 'fill', gravity: 'auto' }] }
        ],
        eager_async: false,
      };
      if (public_id) options.public_id = public_id;

      const result = await cloudinary.uploader.upload(videoInput, options);

      // Auto-generate high-quality poster thumbnail URL from video
      const autoThumbnail = result.secure_url.replace(/\.[^/.]+$/, '.jpg');

      return {
        video_url:        result.secure_url,
        thumbnail_url:    result.eager?.[0]?.secure_url || autoThumbnail,
        public_id:        result.public_id,
        duration_seconds: result.duration || 15,
        width:            result.width,
        height:           result.height,
        format:           result.format,
        bytes:            result.bytes,
        provider:         'cloudinary'
      };
    } catch (err) {
      console.error('[Cloudinary Upload Error]:', err.message);
      throw new Error(`Failed to upload video to Cloudinary CDN: ${err.message}`);
    }
  }

  // ── Upload Profile Photo / Cover Image ─────────────────────────
  static async uploadImage(imageInput, { folder = 'voratok/images' } = {}) {
    if (!imageInput) throw new Error('No image data provided for upload.');

    try {
      const result = await cloudinary.uploader.upload(imageInput, {
        resource_type: 'image',
        folder,
        transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
      });

      return {
        url:       result.secure_url,
        public_id: result.public_id,
        provider:  'cloudinary'
      };
    } catch (err) {
      console.error('[Cloudinary Image Upload Error]:', err.message);
      throw new Error(`Failed to upload image to Cloudinary CDN: ${err.message}`);
    }
  }

  // ── Delete Asset ───────────────────────────────────────────────
  static async deleteAsset(publicId, resourceType = 'video') {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      return true;
    } catch (err) {
      console.warn(`[Cloudinary Delete Warning]: ${err.message}`);
      return false;
    }
  }
}
