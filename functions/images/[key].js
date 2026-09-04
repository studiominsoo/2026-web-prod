// GET /images/:key — R2에 저장된 이미지를 그대로 서빙
export async function onRequestGet({ env, params }) {
  const object = await env.IMAGES.get(decodeURIComponent(params.key));
  if (!object) {
    return new Response("Not found", { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Content-Security-Policy", "default-src 'none'; img-src 'self' data:; script-src 'none'; style-src 'none'; sandbox");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}
