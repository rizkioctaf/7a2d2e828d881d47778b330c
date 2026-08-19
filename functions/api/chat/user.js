export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const currentUser = url.searchParams.get("user");

  // Ambil semua username kecuali dirinya sendiri
  const { results } = await env.DB.prepare(
    "SELECT username FROM users WHERE username != ? ORDER BY username ASC"
  ).bind(currentUser).all();
  
  return new Response(JSON.stringify({ success: true, data: results }));
}