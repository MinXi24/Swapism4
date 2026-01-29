// Configuration file for API keys and settings

export const config = {
  // Pixian.ai API for background removal
  // Get your API key from: https://pixian.ai/api
  // PIXIAN_API_KEY: 'pxhe2l67gjh5aen',
  // PIXIAN_API_URL: 'https://api.pixian.ai/api/v2/remove-background',

  // ClipDrop API for background removal
  // Get your API key from: https://clipdrop-api.co/
  CLIPDROP_API_KEY: '9727984fc5a7adde4e58fb32c9b01ac882b3bc37467d4277adb72c16e026cb5ac9c41dfe273fdf8bc222de0926785899',
  CLIPDROP_API_URL: 'https://clipdrop-api.co/remove-background/v1',

  // Cloudinary API for image uploading
  // Get your cloud name and upload preset from: https://cloudinary.com/
  CLOUDINARY_UPLOAD_URL: 'https://api.cloudinary.com/v1_1/dblq6cttn/image/upload',
  CLOUDINARY_UPLOAD_PRESET: 'YOUR_UPLOAD_PRESET',

  // VModel API for AI clothing description generation
  // Get your API key from: https://vmodel.ai/
  VMODEL_API_TOKEN: 'JbTepa4OljaDnh3IfZ72wpUUZq1kPYOUkLy4YIJDQmAO7oUAvMsHI6W4nliMu4flt8Ez70gYYvK--UT8cKh4Wg==',
  VMODEL_API_URL: 'https://api.vmodel.ai/api/tasks/v1/create',
};

export default config;