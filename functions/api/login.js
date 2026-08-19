async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ... (masukkan fungsi hashPassword di sini)

export async function onRequestPost(context) {
  const { request, env } = context;
  const { username, password } = await request.json();

  const hashedPassword = await hashPassword(password);

  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE username = ? AND password_hash = ?"
  ).bind(username, hashedPassword).first();

  if (user) {
    return new Response(JSON.stringify({ success: true, message: "Login berhasil!" }));
  } else {
    return new Response(JSON.stringify({ error: "Username atau password salah!" }), { status: 401 });
  }
}