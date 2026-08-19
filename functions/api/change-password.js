async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ... (masukkan fungsi hashPassword di sini)

export async function onRequestPost(context) {
  const { request, env } = context;
  const { username, oldPassword, newPassword } = await request.json();

  const hashedOldPassword = await hashPassword(oldPassword);
  const hashedNewPassword = await hashPassword(newPassword);

  const result = await env.DB.prepare(
    "UPDATE users SET password_hash = ? WHERE username = ? AND password_hash = ?"
  ).bind(hashedNewPassword, username, hashedOldPassword).run();

  if (result.meta.changes > 0) {
    return new Response(JSON.stringify({ success: true, message: "Password berhasil diubah!" }));
  } else {
    return new Response(JSON.stringify({ error: "Password lama salah atau user tidak ditemukan." }), { status: 401 });
  }
}