async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ... (masukkan fungsi hashPassword di sini)

export async function onRequestPost(context) {
  const { request, env } = context;
  const { username, password, createCode } = await request.json();

  // 1. Cek kode validasi dari Environment Variable
  if (createCode !== env.CREATE_CODE) {
    return new Response(JSON.stringify({ error: "Kode registrasi salah!" }), { status: 403 });
  }

  // 2. Validasi Username (Hanya huruf dan angka)
  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return new Response(JSON.stringify({ error: "Username hanya boleh huruf dan angka!" }), { status: 400 });
  }

  const hashedPassword = await hashPassword(password);

  try {
    // 3. Simpan ke Database D1
    await env.DB.prepare(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)"
    ).bind(username, hashedPassword).run();
    
    return new Response(JSON.stringify({ success: true, message: "Akun berhasil dibuat!" }));
  } catch (e) {
    return new Response(JSON.stringify({ error: "Username sudah terdaftar atau terjadi kesalahan." }), { status: 500 });
  }
}