export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare(
    "SELECT id, username, content, created_at FROM articles ORDER BY created_at DESC"
  ).all();
  return new Response(JSON.stringify({ success: true, data: results }));
}