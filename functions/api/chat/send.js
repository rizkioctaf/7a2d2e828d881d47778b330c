async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { username, password, targetUser, content } = await request.json();

    if (!content || content.length > 1000) {
      return new Response(JSON.stringify({ success: false, error: "Pesan maksimal 1000 karakter." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const hashedPassword = await hashPassword(password);
    const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password_hash = ?").bind(username, hashedPassword).first();
    
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: "Otorisasi gagal." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    await env.DB.prepare(
      "INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)"
    ).bind(username, targetUser, content).run();

    return new Response(JSON.stringify({ success: true, message: "Pesan terkirim!" }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}