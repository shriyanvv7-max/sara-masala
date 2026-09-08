import "server-only";

export const MAX_PRODUCT_IMAGE_BYTES = 5_000_000;
const allowedTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export function detectProductImageType(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg" as const;
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png" as const;
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp" as const;
  return null;
}

export function safeProductImageExtension(type: keyof typeof allowedTypes) {
  return allowedTypes[type];
}

export function productImageStoragePath(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const storageHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname;
    const marker = "/storage/v1/object/public/product-images/";
    if (url.protocol !== "https:" || url.hostname !== storageHost || !url.pathname.startsWith(marker)) return null;
    const path = decodeURIComponent(url.pathname.slice(marker.length));
    if (!path || path.includes("..") || path.includes("\\") || path.startsWith("/")) return null;
    return path;
  } catch { return null; }
}
