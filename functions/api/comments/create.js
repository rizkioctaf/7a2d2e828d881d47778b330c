async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const { article_id, parent_id, username, password, content } = await request.json();

  if (!content || content.length > 500) {
    return new Response(JSON.stringify({ error: "Komentar maksimal 500 karakter!" }), { status: 400 });
  }

  const hashedPassword = await hashPassword(password);
  const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password_hash = ?").bind(username, hashedPassword).first();
  if (!user) return new Response(JSON.stringify({ error: "Otorisasi gagal." }), { status: 401 });

  await env.DB.prepare(
    "INSERT INTO comments (article_id, parent_id, username, content) VALUES (?, ?, ?, ?)"
  ).bind(article_id, parent_id || null, username, content).run();

  return new Response(JSON.stringify({ success: true, message: "Komentar terkirim!" }));
}