import { StoredImageDocument } from '../types';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const TARGET_BYTES = 700 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected file could not be opened as an image.'));
    image.src = dataUrl;
  });
}

function dataUrlByteSize(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.ceil((base64.length * 3) / 4);
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'document.jpg';
}

export async function prepareImageForRealtimeDatabase(file: File): Promise<StoredImageDocument> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error('Please upload a JPG, PNG, or WEBP image.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('The original image must be 8 MB or smaller.');
  }

  const originalDataUrl = await readAsDataUrl(file);
  const source = await loadImage(originalDataUrl);

  const initialScale = Math.min(1, MAX_DIMENSION / Math.max(source.naturalWidth, source.naturalHeight));
  let width = Math.max(1, Math.round(source.naturalWidth * initialScale));
  let height = Math.max(1, Math.round(source.naturalHeight * initialScale));
  let quality = 0.82;
  let dataUrl = '';
  let sizeBytes = Number.POSITIVE_INFINITY;

  for (let pass = 0; pass < 8; pass += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser cannot process this image.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, 0, 0, width, height);

    dataUrl = canvas.toDataURL('image/jpeg', quality);
    sizeBytes = dataUrlByteSize(dataUrl);
    if (sizeBytes <= TARGET_BYTES) break;

    if (quality > 0.5) {
      quality -= 0.12;
    } else {
      width = Math.max(720, Math.round(width * 0.82));
      height = Math.max(1, Math.round((source.naturalHeight / source.naturalWidth) * width));
      quality = 0.62;
    }
  }

  if (sizeBytes > 1024 * 1024) {
    throw new Error('This image is still too large after compression. Please choose a clearer but smaller photo.');
  }

  return {
    fileName: safeFileName(file.name.replace(/\.[^.]+$/, '') + '.jpg'),
    mimeType: 'image/jpeg',
    sizeBytes,
    originalSizeBytes: file.size,
    width,
    height,
    dataUrl,
    uploadedAt: Date.now(),
  };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
