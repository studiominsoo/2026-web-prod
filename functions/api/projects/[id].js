import { verifyAdmin, jsonResponse, unauthorized } from "../../_utils.js";

// Pages Functions는 [id].js 동적 라우트 파라미터를 URL 인코딩된 상태 그대로 넘겨준다
// (자동 디코딩 안 됨). 한글 등 non-ASCII id가 그대로 SQL에 바인딩되면 매칭이 안 되므로
// 항상 decodeURIComponent를 거친다.
function getId(params) {
  return decodeURIComponent(params.id);
}

// GET /api/projects/:id — 프로젝트 상세(이미지·메타·분류·팝업 포함). 누구나 가능.
export async function onRequestGet({ env, params }) {
  const id = getId(params);

  const project = await env.DB.prepare(
    `SELECT id, title, description, cover_image_url AS coverImageUrl, background_color AS backgroundColor,
            sort_order AS sortOrder, created_at AS createdAt
     FROM projects WHERE id = ?`
  ).bind(id).first();

  if (!project) {
    return jsonResponse({ ok: false, error: "not found" }, 404);
  }

  const { results: images } = await env.DB.prepare(
    "SELECT url, media_type AS type, layout FROM project_images WHERE project_id = ? ORDER BY sort_order"
  ).bind(id).all();

  const { results: metaItems } = await env.DB.prepare(
    "SELECT value FROM project_meta WHERE project_id = ? ORDER BY sort_order"
  ).bind(id).all();

  const { results: categories } = await env.DB.prepare(
    `SELECT c.id AS categoryId, c.label, t.key AS typeKey
     FROM project_categories pc
     JOIN categories c ON c.id = pc.category_id
     JOIN taxonomy_types t ON t.id = c.type_id
     WHERE pc.project_id = ?`
  ).bind(id).all();

  const { results: popups } = await env.DB.prepare(
    `SELECT id, trigger_after_image AS triggerAfterImage, side, type, image_url AS imageUrl,
            link_project_id AS linkProjectId, caption, sort_order AS sortOrder
     FROM project_popups WHERE project_id = ? ORDER BY sort_order`
  ).bind(id).all();

  return jsonResponse({
    ok: true,
    project: {
      ...project,
      images,
      metaItems: metaItems.map((m) => m.value),
      categories,
      popups
    }
  });
}

// PATCH /api/projects/:id — 프로젝트 수정.
// metaItems/images/categoryIds/popups를 보내면 해당 항목 전체 교체. 관리자만.
export async function onRequestPatch({ request, env, params }) {
  if (!(await verifyAdmin(request, env))) return unauthorized();
  const id = getId(params);

  const { title, description, categoryIds, metaItems, images, coverImageUrl, backgroundColor, popups } =
    await request.json();

  await env.DB.prepare(
    `UPDATE projects SET
       title = COALESCE(?, title),
       description = COALESCE(?, description),
       cover_image_url = COALESCE(?, cover_image_url),
       background_color = COALESCE(?, background_color)
     WHERE id = ?`
  ).bind(title ?? null, description ?? null, coverImageUrl ?? null, backgroundColor ?? null, id).run();

  if (Array.isArray(categoryIds)) {
    await env.DB.prepare("DELETE FROM project_categories WHERE project_id = ?").bind(id).run();
    for (const categoryId of categoryIds) {
      await env.DB.prepare(
        "INSERT INTO project_categories (project_id, category_id) VALUES (?, ?)"
      ).bind(id, categoryId).run();
    }
  }

  if (Array.isArray(metaItems)) {
    await env.DB.prepare("DELETE FROM project_meta WHERE project_id = ?").bind(id).run();
    let order = 0;
    for (const value of metaItems) {
      if (!value) continue;
      await env.DB.prepare(
        "INSERT INTO project_meta (project_id, value, sort_order) VALUES (?, ?, ?)"
      ).bind(id, value, order++).run();
    }
  }

  if (Array.isArray(images)) {
    await env.DB.prepare("DELETE FROM project_images WHERE project_id = ?").bind(id).run();
    let order = 0;
    for (const img of images) {
      await env.DB.prepare(
        "INSERT INTO project_images (project_id, url, media_type, layout, sort_order) VALUES (?, ?, ?, ?, ?)"
      ).bind(id, img.url, img.type || "image", img.layout || "full", order++).run();
    }
  }

  if (Array.isArray(popups)) {
    await env.DB.prepare("DELETE FROM project_popups WHERE project_id = ?").bind(id).run();
    let order = 0;
    for (const p of popups) {
      if (!p.imageUrl) continue;
      await env.DB.prepare(
        `INSERT INTO project_popups
           (project_id, trigger_after_image, side, type, image_url, link_project_id, caption, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        p.triggerAfterImage || 1,
        p.side === "left" ? "left" : "right",
        p.type === "link" ? "link" : "memo",
        p.imageUrl,
        p.type === "link" ? p.linkProjectId || null : null,
        p.caption || null,
        order++
      ).run();
    }
  }

  return jsonResponse({ ok: true });
}

// DELETE /api/projects/:id — 프로젝트 삭제 (연결된 분류·이미지·메타·팝업 레코드도 함께 삭제). 관리자만.
export async function onRequestDelete({ request, env, params }) {
  if (!(await verifyAdmin(request, env))) return unauthorized();
  const id = getId(params);

  await env.DB.prepare("DELETE FROM project_categories WHERE project_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM project_images WHERE project_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM project_meta WHERE project_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM project_popups WHERE project_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();

  return jsonResponse({ ok: true });
}
