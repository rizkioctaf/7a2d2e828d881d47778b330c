export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method === "GET") {
    // Ambil daftar artikel dengan preview singkat (100 karakter pertama)
    const { results } = await env.DB.prepare(
      "SELECT id, title, category, author, substr(content, 1, 100) || '...' as preview FROM articles ORDER BY id DESC"
    ).all();
    return Response.json(results);
  }

  if (request.method === "POST") {
    const body = await request.json();
    await env.DB.prepare(
      "INSERT INTO articles (title, category, content, author) VALUES (?, ?, ?, ?)"
    ).bind(body.title, body.category, body.content, body.author).run();
    return Response.json({ success: true });
  }
}