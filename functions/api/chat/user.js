export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const currentUser = url.searchParams.get("user") || "";

    const { results } = await env.DB.prepare(
      "SELECT username FROM users WHERE username != ? ORDER BY username ASC"
    ).bind(currentUser).all();
    
    return new Response(JSON.stringify({ success: true, data: results }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}