import { verifyAdmin, jsonResponse, unauthorized } from "../_utils.js";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const EXT_OVERRIDES = { "image/jpeg": "jpg", "video/quicktime": "mov" };

// POST /api/upload — base64 이미지/영상을 R2에 저장하고 URL + 미디어 타입을 반환. 관리자만 호출 가능.
export async function onRequestPost({ request, env }) {
  if (!(await verifyAdmin(request, env))) return unauthorized();

  const { image } = await request.json();
  if (!image || typeof image !== "string") {
    return jsonResponse({ ok: false, error: "no file" }, 400);
  }

  const match = image.match(/^data:([\w.+-]+\/[\w.+-]+);base64,(.+)$/);
  if (!match) {
    return jsonResponse({ ok: false, error: "invalid file format" }, 400);
  }

  const mimeType = match[1];
  const isImage = IMAGE_TYPES.has(mimeType);
  const isVideo = VIDEO_TYPES.has(mimeType);
  if (!isImage && !isVideo) {
    return jsonResponse({ ok: false, error: "unsupported file type" }, 415);
  }
  const mediaType = isImage ? "image" : "video";
  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;

  const base64Data = match[2];
  const ext = EXT_OVERRIDES[mimeType] || mimeType.split("/")[1];

  const estimatedBytes = (base64Data.length * 3) / 4;
  if (estimatedBytes > maxBytes) {
    return jsonResponse({ ok: false, error: "file too large" }, 413);
  }

  const binary = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  if (binary.length > maxBytes) {
    return jsonResponse({ ok: false, error: "file too large" }, 413);
  }

  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await env.IMAGES.put(key, binary, { httpMetadata: { contentType: mimeType } });

  return jsonResponse({ ok: true, url: `/images/${key}`, type: mediaType }, 201);
}
