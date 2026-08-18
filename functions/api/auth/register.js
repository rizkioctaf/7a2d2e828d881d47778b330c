export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, password, validationCode } = await request.json();

    if (!username || !password || !validationCode) {
        return new Response(JSON.stringify({ error: "Semua kolom wajib diisi!" }), { status: 400 });
    }

    // VALIDASI ALFANUMERIK (Hanya Huruf dan Angka)
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(username)) {
        return new Response(JSON.stringify({ error: "Username hanya boleh berisi huruf dan angka tanpa spasi!" }), { status: 400 });
    }

    if (validationCode !== env.REGISTRATION_CODE) {
        return new Response(JSON.stringify({ error: "Kode validasi salah atau tidak valid!" }), { status: 403 });
    }

    // CEK USERNAME UNIK
    const existingUser = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(username).first();
    if (existingUser) {
        return new Response(JSON.stringify({ error: "Username sudah terdaftar, silakan gunakan yang lain." }), { status: 400 });
    }

    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
    const hashBuffer = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
    
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const storedPassword = `${saltHex}:${hashHex}`;

    await env.DB.prepare("INSERT INTO users (username, password) VALUES (?, ?)").bind(username, storedPassword).run();
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
}