import { sign, jsonResponse } from "../_utils.js";

// POST /api/login — { password: "..." } 를 받아서 맞으면 관리자 세션 쿠키 발급
export async function onRequestPost({ request, env }) {
  const { password } = await request.json();

  if (password !== env.ADMIN_PASSWORD) {
    return jsonResponse({ ok: false }, 401);
  }

  const expires = Date.now() + 1000 * 60 * 60 * 24; // 24시간 유효
  const signature = await sign(String(expires), env.ADMIN_SECRET);
  const token = `${expires}.${signature}`;

  // 로컬(wrangler pages dev)은 http://localhost라 Secure 쿠키가 브라우저에 저장되지
  // 않으므로, https일 때만 Secure 속성을 붙인다.
  const isHttps = new URL(request.url).protocol === "https:";
  const cookieParts = [
    `admin_token=${token}`,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/",
    "Max-Age=86400"
  ];
  if (isHttps) cookieParts.splice(2, 0, "Secure");

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieParts.join("; ")
    }
  });
}
