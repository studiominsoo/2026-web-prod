import { verifyAdmin, jsonResponse } from "../_utils.js";

// GET /api/session — 현재 관리자로 로그인되어 있는지 확인
export async function onRequestGet({ request, env }) {
  const isAdmin = await verifyAdmin(request, env);
  return jsonResponse({ ok: true, isAdmin });
}
