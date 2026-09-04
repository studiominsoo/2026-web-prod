import { verifyAdmin, jsonResponse, unauthorized } from "../../_utils.js";

// PATCH /api/categories/:id — 분류 항목 이름/순서 수정. 관리자만.
export async function onRequestPatch({ request, env, params }) {
  if (!(await verifyAdmin(request, env))) return unauthorized();

  const { label, sortOrder } = await request.json();
  await env.DB.prepare(
    "UPDATE categories SET label = COALESCE(?, label), sort_order = COALESCE(?, sort_order) WHERE id = ?"
  ).bind(label ?? null, sortOrder ?? null, decodeURIComponent(params.id)).run();

  return jsonResponse({ ok: true });
}

// DELETE /api/categories/:id — 분류 항목 삭제 (연결된 project_categories도 함께 삭제됨). 관리자만.
export async function onRequestDelete({ request, env, params }) {
  if (!(await verifyAdmin(request, env))) return unauthorized();

  await env.DB.prepare("DELETE FROM project_categories WHERE category_id = ?").bind(decodeURIComponent(params.id)).run();
  await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(decodeURIComponent(params.id)).run();

  return jsonResponse({ ok: true });
}
