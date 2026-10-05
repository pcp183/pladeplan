/** Gør fotoet mindre i browseren, før det sendes. Intet gemmes. */

const MAX_EDGE = 1600;
const MAX_BYTES = 3 * 1024 * 1024;

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode'))),
      'image/jpeg',
      quality,
    );
  });
}

export async function prepareCabinetPhoto(file: File): Promise<{ base64: string; mediaType: 'image/jpeg' }> {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new Error('unread');
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('unread');
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('unread');
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.82;
  let blob = await canvasBlob(canvas, quality);
  while (blob.size > MAX_BYTES && quality > 0.46) {
    quality = Math.round((quality - 0.08) * 100) / 100;
    blob = await canvasBlob(canvas, quality);
  }
  if (blob.size > 4 * 1024 * 1024) throw new Error('too_big');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return { base64: btoa(binary), mediaType: 'image/jpeg' };
}
