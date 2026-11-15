export type ImageType = "image/png" | "image/jpeg" | "image/webp";

/**
 * Detect the image type from magic bytes. Never trust the browser-reported
 * MIME type on its own — anyone can send any content type they like.
 */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (bytes.length >= 12) {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    if (riff === "RIFF" && webp === "WEBP") {
      return "image/webp";
    }
  }

  return null;
}

export const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;

export function receiptSizeError(bytes: number): string | null {
  if (bytes > MAX_RECEIPT_BYTES) {
    return "Receipts must be 2 MB or smaller";
  }
  return null;
}
