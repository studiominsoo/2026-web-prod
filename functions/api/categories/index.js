import { verifyAdmin, jsonResponse, unauthorized } from "../../_utils.js";

// GET /api/categories — 모든 분류 기준(연도, 매체, ...)에 속한 항목 목록을 함께 반환.
// 예: { types: [{ key:"year", label:"연도", categories:[{id, label:"2026"}, ...] }, ...] }
export async function onRequestGet({ env }) {
  const { results: types } = await env.DB.prepare(
    "SELECT id, key, label, sort_order AS sortOrder FROM taxonomy_types ORDER BY sort_order"
  ).all();

  const { results: categories } = await env.DB.prepare(
    "SELECT id, type_id AS typeId, label, sort_order AS sortOrder FROM categories ORDER BY sort_order"
  ).all();

  const withCategories = types.map((type) => ({
    ...type,
    categories: categories.filter((category) => category.typeId === type.id)
  }));

  return jsonResponse({ ok: true, types: withCategories });
}

// POST /api/categories — 특정 분류 기준 안에 새 항목 추가 (예: year 타입에 "2027"). 관리자만.
export async function onRequestPost({ request, env }) {
  if (!(await verifyAdmin(request, env))) return unauthorized();

  const { typeId, label, sortOrder } = await request.json();
  if (!typeId || !label) {
    return jsonResponse({ ok: false, error: "typeId, label required" }, 400);
  }

  let order = sortOrder;
  if (order === undefined || order === null) {
    const row = await env.DB.prepare(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories WHERE type_id = ?"
    ).bind(typeId).first();
    order = row.next;
  }

  const result = await env.DB.prepare(
    "INSERT INTO categories (type_id, label, sort_order) VALUES (?, ?, ?)"
  ).bind(typeId, label, order).run();

  return jsonResponse({ ok: true, id: result.meta.last_row_id }, 201);
}
