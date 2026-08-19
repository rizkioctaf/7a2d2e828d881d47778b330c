async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const { username, password, targetUser } = await request.json();

  // Validasi Kepemilikan Akun (Privasi Chat)
  const hashedPassword = await hashPassword(password);
  const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password_hash = ?").bind(username, hashedPassword).first();
  if (!user) return new Response(JSON.stringify({ error: "Otorisasi gagal." }), { status: 401 });

  // Lazy Cleanup: Hapus pesan lebih dari 30 hari
  await env.DB.prepare("DELETE FROM messages WHERE created_at <= datetime('now', '-30 days')").run();

  // Ambil chat dua arah
  const { results } = await env.DB.prepare(`
    SELECT sender, receiver, content, created_at 
    FROM messages 
    WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
    ORDER BY created_at ASC
  `).bind(username, targetUser, targetUser, username).all();

  return new Response(JSON.stringify({ success: true, data: results }));
}