import { verifyAdmin, jsonResponse, unauthorized } from "../../_utils.js";

// GET /api/taxonomy-types — 분류 기준 목록(연도, 매체, ...) 조회. 누구나 가능.
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, key, label, sort_order AS sortOrder FROM taxonomy_types ORDER BY sort_order"
  ).all();
  return jsonResponse({ ok: true, types: results });
}

// POST /api/taxonomy-types — 새 분류 기준 추가 (예: "client"). 관리자만.
export async function onRequestPost({ request, env }) {
  if (!(await verifyAdmin(request, env))) return unauthorized();

  const { key, label, sortOrder } = await request.json();
  if (!key || !label) {
    return jsonResponse({ ok: false, error: "key, label required" }, 400);
  }

  let order = sortOrder;
  if (order === undefined || order === null) {
    const row = await env.DB.prepare(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM taxonomy_types"
    ).first();
    order = row.next;
  }

  const result = await env.DB.prepare(
    "INSERT INTO taxonomy_types (key, label, sort_order) VALUES (?, ?, ?)"
  ).bind(key, label, order).run();

  return jsonResponse({ ok: true, id: result.meta.last_row_id }, 201);
}
