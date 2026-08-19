export async function onRequestGet(context) {
  const { env } = context;
  
  // LAZY CLEANUP: Hapus artikel & komentar usang
  await env.DB.prepare("DELETE FROM articles WHERE created_at <= datetime('now', '-30 days')").run();
  await env.DB.prepare("DELETE FROM comments WHERE created_at <= datetime('now', '-30 days')").run();
  await env.DB.prepare("DELETE FROM comments WHERE article_id NOT IN (SELECT id FROM articles)").run(); // Hapus komentar yatim

  const { results } = await env.DB.prepare(
    "SELECT id, username, content, created_at FROM articles ORDER BY created_at DESC"
  ).all();
  
  return new Response(JSON.stringify({ success: true, data: results }));
}