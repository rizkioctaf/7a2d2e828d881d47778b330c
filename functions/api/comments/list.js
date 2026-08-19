export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const articleId = url.searchParams.get("article_id");

  if (!articleId) return new Response(JSON.stringify({ error: "Missing article_id" }), { status: 400 });

  const { results } = await env.DB.prepare(
    "SELECT id, article_id, parent_id, username, content, created_at FROM comments WHERE article_id = ? ORDER BY created_at ASC"
  ).bind(articleId).all();
  
  return new Response(JSON.stringify({ success: true, data: results }));
}