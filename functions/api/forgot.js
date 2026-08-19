async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ... (masukkan fungsi hashPassword di sini)

export async function onRequestPost(context) {
  const { request, env } = context;
  const { username, newPassword, forgotCode } = await request.json();

  if (forgotCode !== env.FORGOT_CODE) {
    return new Response(JSON.stringify({ error: "Kode lupa password salah!" }), { status: 403 });
  }

  const hashedPassword = await hashPassword(newPassword);

  const result = await env.DB.prepare(
    "UPDATE users SET password_hash = ? WHERE username = ?"
  ).bind(hashedPassword, username).run();

  if (result.meta.changes > 0) {
    return new Response(JSON.stringify({ success: true, message: "Password berhasil diubah!" }));
  } else {
    return new Response(JSON.stringify({ error: "Username tidak ditemukan." }), { status: 404 });
  }
}