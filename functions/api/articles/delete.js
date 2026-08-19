async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ... (masukkan fungsi hashPassword di sini)

export async function onRequestPost(context) {
  const { request, env } = context;
  const { id, username, password } = await request.json();

  const hashedPassword = await hashPassword(password);

  // Verifikasi kepemilikan dan user (digabung dalam 1 query untuk efisiensi)
  const result = await env.DB.prepare(
    "DELETE FROM articles WHERE id = ? AND username = ? AND (SELECT password_hash FROM users WHERE username = ?) = ?"
  ).bind(id, username, username, hashedPassword).run();

  if (result.meta.changes > 0) {
    return new Response(JSON.stringify({ success: true, message: "Artikel berhasil dihapus." }));
  } else {
    return new Response(JSON.stringify({ error: "Gagal menghapus. Pastikan ini artikel Anda dan password benar." }), { status: 403 });
  }
}