async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ... (masukkan fungsi hashPassword di sini)

export async function onRequestPost(context) {
  const { request, env } = context;
  const { id, username, password, title, content } = await request.json();

  const hashedPassword = await hashPassword(password);

  // Verifikasi kepemilikan artikel
  const article = await env.DB.prepare("SELECT username FROM articles WHERE id = ?").bind(id).first();
  if (!article) return new Response(JSON.stringify({ error: "Artikel tidak ditemukan." }), { status: 404 });
  if (article.username !== username) return new Response(JSON.stringify({ error: "Anda tidak berhak mengubah artikel ini." }), { status: 403 });

  // Verifikasi password
  const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password_hash = ?").bind(username, hashedPassword).first();
  if (!user) return new Response(JSON.stringify({ error: "Otorisasi gagal." }), { status: 401 });

  // Update artikel
  await env.DB.prepare(
    "UPDATE articles SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(title, content, id).run();

  return new Response(JSON.stringify({ success: true, message: "Artikel berhasil diperbarui!" }));
}