import { verifyAdmin, jsonResponse, unauthorized } from "../../_utils.js";

// PATCH /api/taxonomy-types/:id — 분류 기준 이름/순서 수정. 관리자만.
export async function onRequestPatch({ request, env, params }) {
  if (!(await verifyAdmin(request, env))) return unauthorized();

  const { label, sortOrder } = await request.json();
  await env.DB.prepare(
    "UPDATE taxonomy_types SET label = COALESCE(?, label), sort_order = COALESCE(?, sort_order) WHERE id = ?"
  ).bind(label ?? null, sortOrder ?? null, decodeURIComponent(params.id)).run();

  return jsonResponse({ ok: true });
}

// DELETE /api/taxonomy-types/:id — 분류 기준 삭제 (하위 categories도 함께 삭제됨). 관리자만.
export async function onRequestDelete({ request, env, params }) {
  if (!(await verifyAdmin(request, env))) return unauthorized();

  await env.DB.prepare("DELETE FROM categories WHERE type_id = ?").bind(decodeURIComponent(params.id)).run();
  await env.DB.prepare("DELETE FROM taxonomy_types WHERE id = ?").bind(decodeURIComponent(params.id)).run();

  return jsonResponse({ ok: true });
}
