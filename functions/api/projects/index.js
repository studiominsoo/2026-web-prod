import { verifyAdmin, jsonResponse, unauthorized } from "../../_utils.js";

// GET /api/projects
//   - 파라미터 없음: 전체 목록 (관리자 대시보드용)
//   - ?typeKey=year&value=2026 : 해당 분류에 속한 프로젝트만 (category.html용)
// 정렬은 등록 순서 기준 최신순(created_at DESC).
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const typeKey = url.searchParams.get("typeKey");
  const value = url.searchParams.get("value");

  let projects;
  if (typeKey && value) {
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT p.id, p.title, p.description, p.cover_image_url AS coverImageUrl,
              p.sort_order AS sortOrder, p.created_at AS createdAt
       FROM projects p
       JOIN project_categories pc ON pc.project_id = p.id
       JOIN categories c ON c.id = pc.category_id
       JOIN taxonomy_types t ON t.id = c.type_id
       WHERE t.key = ? AND c.label = ?
       ORDER BY p.created_at DESC`
    ).bind(typeKey, value).all();
    projects = results;
  } else {
    const { results } = await env.DB.prepare(
      `SELECT id, title, description, cover_image_url AS coverImageUrl,
              sort_order AS sortOrder, created_at AS createdAt
       FROM projects ORDER BY created_at DESC`
    ).all();
    projects = results;
  }

  if (projects.length === 0) {
    return jsonResponse({ ok: true, projects: [] });
  }

  const ids = projects.map((p) => p.id);
  const placeholders = ids.map(() => "?").join(",");

  const { results: images } = await env.DB.prepare(
    `SELECT project_id AS projectId, url, media_type AS type, sort_order AS sortOrder
     FROM project_images WHERE project_id IN (${placeholders}) ORDER BY sort_order`
  ).bind(...ids).all();

  const { results: categoryLinks } = await env.DB.prepare(
    `SELECT pc.project_id AS projectId, c.id AS categoryId, c.label, t.key AS typeKey
     FROM project_categories pc
     JOIN categories c ON c.id = pc.category_id
     JOIN taxonomy_types t ON t.id = c.type_id
     WHERE pc.project_id IN (${placeholders})`
  ).bind(...ids).all();

  const withDetails = projects.map((project) => {
    const projectImages = images.filter((img) => img.projectId === project.id);
    const cover = project.coverImageUrl || (projectImages[0] && projectImages[0].url) || null;
    const coverType = (projectImages.find((i) => i.url === cover) || {}).type || "image";
    return {
      ...project,
      images: projectImages.map((img) => ({ url: img.url, type: img.type })),
      coverImage: cover,
      coverType,
      categories: categoryLinks
        .filter((c) => c.projectId === project.id)
        .map((c) => ({ categoryId: c.categoryId, label: c.label, typeKey: c.typeKey }))
    };
  });

  return jsonResponse({ ok: true, projects: withDetails });
}

// POST /api/projects — 새 프로젝트 추가. 관리자만.
// body: { id, title, description, categoryIds:[1,2], metaItems:["A","B"],
//         images:[{url,type}], coverImageUrl }
export async function onRequestPost({ request, env }) {
  if (!(await verifyAdmin(request, env))) return unauthorized();

  const { id, title, description, categoryIds, metaItems, images, coverImageUrl, backgroundColor, popups } =
    await request.json();
  if (!id || !title) {
    return jsonResponse({ ok: false, error: "id, title required" }, 400);
  }

  await env.DB.prepare(
    "INSERT INTO projects (id, title, meta, description, cover_image_url, background_color, sort_order, created_at) VALUES (?, ?, '', ?, ?, ?, 0, ?)"
  ).bind(id, title, description || "", coverImageUrl || null, backgroundColor || null, Date.now()).run();

  for (const categoryId of categoryIds || []) {
    await env.DB.prepare(
      "INSERT INTO project_categories (project_id, category_id) VALUES (?, ?)"
    ).bind(id, categoryId).run();
  }

  let metaOrder = 0;
  for (const value of metaItems || []) {
    if (!value) continue;
    await env.DB.prepare(
      "INSERT INTO project_meta (project_id, value, sort_order) VALUES (?, ?, ?)"
    ).bind(id, value, metaOrder++).run();
  }

  let imgOrder = 0;
  for (const img of images || []) {
    await env.DB.prepare(
      "INSERT INTO project_images (project_id, url, media_type, layout, sort_order) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, img.url, img.type || "image", img.layout || "full", imgOrder++).run();
  }

  let popupOrder = 0;
  for (const p of popups || []) {
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
      popupOrder++
    ).run();
  }

  return jsonResponse({ ok: true, id }, 201);
}
