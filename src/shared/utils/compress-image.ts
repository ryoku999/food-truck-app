import imageCompressionWorkerUrl from "browser-image-compression/dist/browser-image-compression.js?url";

const MIB = 1024 * 1024;
const MAX_SOURCE_SIZE = 30 * MIB;
const COMPRESSION_THRESHOLD = 500 * 1024;
const TARGET_SIZE_MB = 1;
const MAX_WIDTH_OR_HEIGHT = 1920;
const INITIAL_QUALITY = 0.8;
// Keep in sync with the API's RUSTFS_MAX_IMAGE_SIZE.
const MAX_UPLOAD_SIZE = 5 * MIB;

const extensions: Readonly<Partial<Record<string, RegExp>>> = {
  "image/jpeg": /\.jpe?g$/i,
  "image/png": /\.png$/i,
  "image/webp": /\.webp$/i,
};

export class ImageCompressionError extends Error {}

export interface CompressedImageResult {
  file: File;
  originalSizeBytes: number;
  finalSizeBytes: number;
  wasCompressed: boolean;
  compressionRatio: number;
}

export async function compressImage(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<CompressedImageResult> {
  const extension = extensions[file.type];
  if (!extension)
    throw new ImageCompressionError(
      "Solo se permiten imágenes JPEG, PNG o WebP.",
    );
  if (!file.size) throw new ImageCompressionError("La imagen está vacía.");
  if (file.size > MAX_SOURCE_SIZE) {
    throw new ImageCompressionError(
      "La imagen original supera el límite de 30 MB.",
    );
  }

  let optimized = file;
  if (file.size > COMPRESSION_THRESHOLD) {
    try {
      const { default: imageCompression } =
        await import("browser-image-compression");
      const candidate = await imageCompression(file, {
        maxSizeMB: TARGET_SIZE_MB,
        maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
        initialQuality: INITIAL_QUALITY,
        fileType: file.type,
        useWebWorker: true,
        libURL: new URL(imageCompressionWorkerUrl, window.location.href).href,
        onProgress,
      });
      if (
        candidate.type === file.type &&
        candidate.size > 0 &&
        candidate.size < file.size
      ) {
        optimized = candidate;
      }
    } catch {
      if (file.size > MAX_UPLOAD_SIZE) {
        throw new ImageCompressionError(
          "No se pudo comprimir la imagen. Elige una imagen de hasta 5 MB.",
        );
      }
    }
  }

  if (optimized.size > MAX_UPLOAD_SIZE) {
    throw new ImageCompressionError(
      "La imagen supera el límite de subida de 5 MB después de optimizarla.",
    );
  }

  const name = extension.test(file.name)
    ? file.name
    : `${file.name.replace(/\.[^.]+$/, "")}.${file.type.split("/")[1]}`;
  return {
    file:
      optimized === file && name === file.name
        ? file
        : new File([optimized], name, {
            type: file.type,
            lastModified: file.lastModified,
          }),
    originalSizeBytes: file.size,
    finalSizeBytes: optimized.size,
    wasCompressed: optimized !== file,
    compressionRatio: optimized.size / file.size,
  };
}
