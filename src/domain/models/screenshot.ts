export type Screenshot = {
  id: string;
  freshman_id: string;
  uploader_id: string;
  image_url: string;
  created_at: string;
};

export type ScreenshotWithUploader = Omit<Screenshot, 'uploader_id'> & {
  uploader: { id: string; name: string };
};
