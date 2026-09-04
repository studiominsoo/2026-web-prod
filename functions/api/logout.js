// POST /api/logout — 관리자 세션 쿠키를 즉시 만료시켜 제거
export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "admin_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
    }
  });
}
