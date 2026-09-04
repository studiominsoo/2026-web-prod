// 여러 API 파일이 같이 쓰는 인증 관련 헬퍼. 파일명이 _로 시작해서
// Cloudflare가 API 라우트로 취급하지 않고, 다른 함수들이 불러다 쓰는 부품 취급합니다.

export async function sign(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function verifyAdmin(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/admin_token=([^;]+)/);
  if (!match) return false;

  const parts = decodeURIComponent(match[1]).split(".");
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;
  const expected = await sign(payload, env.ADMIN_SECRET);
  if (signature !== expected) return false;
  if (Date.now() > Number(payload)) return false;

  return true;
}

export function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  });
}

export function unauthorized() {
  return jsonResponse({ ok: false, error: "unauthorized" }, 401);
}
