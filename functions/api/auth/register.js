export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, password, validationCode } = await request.json();

    if (!username || !password || !validationCode) {
        return new Response(JSON.stringify({ error: "Semua kolom wajib diisi!" }), { status: 400 });
    }

    // PENGECEKAN KODE VALIDASI DARI ENVIRONMENT VARIABLES CLOUDFLARE
    if (validationCode !== env.REGISTRATION_CODE) {
        return new Response(JSON.stringify({ error: "Kode validasi salah. Silakan hubungi admin." }), { status: 403 });
    }

    // Cek apakah username sudah ada
    const existingUser = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(username).first();
    if (existingUser) {
        return new Response(JSON.stringify({ error: "Username sudah terdaftar" }), { status: 400 });
    }

    // Hashing Password menggunakan PBKDF2 (Sama seperti sebelumnya)
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        "raw", 
        encoder.encode(password), 
        { name: "PBKDF2" }, 
        false, 
        ["deriveBits"]
    );
    const hashBuffer = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial, 
        256
    );

    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const storedPassword = `${saltHex}:${hashHex}`;

    // Simpan ke D1
    await env.DB.prepare("INSERT INTO users (username, password) VALUES (?, ?)")
        .bind(username, storedPassword).run();

    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
    });
}