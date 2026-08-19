// ... (fungsi hashPassword)
async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const { id, username, password, content } = await request.json();

  if (content.length > 2000) {
    return new Response(JSON.stringify({ error: "Postingan maksimal 2000 karakter!" }), { status: 400 });
  }

  const hashedPassword = await hashPassword(password);

  const article = await env.DB.prepare("SELECT username FROM articles WHERE id = ?").bind(id).first();
  if (!article) return new Response(JSON.stringify({ error: "Postingan tidak ditemukan." }), { status: 404 });
  if (article.username !== username) return new Response(JSON.stringify({ error: "Akses ditolak." }), { status: 403 });

  const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password_hash = ?").bind(username, hashedPassword).first();
  if (!user) return new Response(JSON.stringify({ error: "Otorisasi gagal." }), { status: 401 });

  await env.DB.prepare(
    "UPDATE articles SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(content, id).run();

  return new Response(JSON.stringify({ success: true, message: "Postingan berhasil diperbarui!" }));
}