/**
 * ImgBB Direct Image Upload Service
 * API key is read from VITE_IMGBB_API_KEY.
 */

const IMGBB_API_KEY = import.meta?.env?.VITE_IMGBB_API_KEY || '';

export async function uploadImageToImgBB(imageFile) {
  try {
    if (!imageFile) {
      throw new Error('No image file selected.');
    }

    if (!IMGBB_API_KEY) {
      throw new Error('ImgBB upload is not configured (VITE_IMGBB_API_KEY missing).');
    }

    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to upload image to ImgBB');
    }

    return {
      url: data.data.url,
      displayUrl: data.data.display_url,
      thumbUrl: data.data.thumb?.url || data.data.url,
      deleteUrl: data.data.delete_url,
      width: data.data.width,
      height: data.data.height,
    };
  } catch (error) {
    console.error('ImgBB Upload Error:', error);
    throw error;
  }
}
