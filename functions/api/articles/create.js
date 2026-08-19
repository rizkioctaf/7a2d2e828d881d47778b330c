// ... (ingat untuk menaruh fungsi hashPassword di sini jika Anda tidak menggunakan satu file utils)
async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const { username, password, content } = await request.json();

  if (content.length > 2000) {
    return new Response(JSON.stringify({ error: "Postingan maksimal 2000 karakter!" }), { status: 400 });
  }

  const hashedPassword = await hashPassword(password);
  const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password_hash = ?").bind(username, hashedPassword).first();
  
  if (!user) return new Response(JSON.stringify({ error: "Otorisasi gagal." }), { status: 401 });

  await env.DB.prepare(
    "INSERT INTO articles (username, content) VALUES (?, ?)"
  ).bind(username, content).run();

  return new Response(JSON.stringify({ success: true, message: "Postingan berhasil diterbitkan!" }));
}