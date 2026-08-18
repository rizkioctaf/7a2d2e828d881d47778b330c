export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, password } = await request.json();

    if (!username || !password) {
        return new Response(JSON.stringify({ error: "Username dan password wajib diisi" }), { status: 400 });
    }

    // Cek apakah username sudah ada
    const existingUser = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(username).first();
    if (existingUser) {
        return new Response(JSON.stringify({ error: "Username sudah terdaftar" }), { status: 400 });
    }

    // Hash Password menggunakan Web Crypto API (SHA-256)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Simpan ke D1
    await env.DB.prepare("INSERT INTO users (username, password) VALUES (?, ?)")
        .bind(username, hashedPassword).run();

    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
    });
}