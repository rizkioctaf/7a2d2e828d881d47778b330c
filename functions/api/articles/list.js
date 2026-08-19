export async function onRequestGet(context) {
  const { env } = context;
  
  // 1. LAZY CLEANUP: Hapus otomatis semua postingan yang lebih lama dari 30 hari
  await env.DB.prepare(
    "DELETE FROM articles WHERE created_at <= datetime('now', '-30 days')"
  ).run();

  // 2. Ambil postingan yang tersisa (yang umurnya di bawah 30 hari)
  const { results } = await env.DB.prepare(
    "SELECT id, username, content, created_at FROM articles ORDER BY created_at DESC"
  ).all();
  
  return new Response(JSON.stringify({ success: true, data: results }));
}