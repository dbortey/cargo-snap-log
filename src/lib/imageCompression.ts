/**
 * Compress an image to reduce file size while maintaining reasonable quality
 * @param dataUrl - Base64 data URL of the image
 * @param maxWidth - Maximum width (default: 1200px)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Compressed image as base64 data URL
 */
export const compressImage = async (
  dataUrl: string,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG for better compression
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = dataUrl;
  });
};
