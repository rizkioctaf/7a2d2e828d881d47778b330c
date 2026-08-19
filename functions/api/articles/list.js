export async function onRequestGet(context) {
  const { env } = context;
  
  await env.DB.prepare("DELETE FROM articles WHERE created_at <= datetime('now', '-30 days')").run();
  await env.DB.prepare("DELETE FROM comments WHERE created_at <= datetime('now', '-30 days')").run();
  await env.DB.prepare("DELETE FROM comments WHERE article_id NOT IN (SELECT id FROM articles)").run();

  // Update query: Menghitung jumlah komentar & memanggil kolom media
  const { results } = await env.DB.prepare(`
    SELECT a.id, a.username, a.content, a.media_url, a.media_type, a.created_at,
           (SELECT COUNT(*) FROM comments c WHERE c.article_id = a.id) as comment_count
    FROM articles a 
    ORDER BY a.created_at DESC
  `).all();
  
  return new Response(JSON.stringify({ success: true, data: results }));
}