export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, newPassword, resetCode } = await request.json();

    // 1. Validasi Input Kosong
    if (!username || !newPassword || !resetCode) {
        return new Response(JSON.stringify({ error: "Semua kolom wajib diisi!" }), { status: 400 });
    }

    // 2. Validasi Kode Rahasia dari Environment Variable Cloudflare
    if (resetCode !== env.RESET_CODE) {
        return new Response(JSON.stringify({ error: "Kode reset salah atau tidak valid!" }), { status: 403 });
    }

    // 3. Pastikan Username ada di Database
    const user = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(username).first();
    if (!user) {
        return new Response(JSON.stringify({ error: "Username tidak ditemukan di sistem!" }), { status: 404 });
    }

    // 4. Hash Password Baru (PBKDF2)
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(newPassword), { name: "PBKDF2" }, false, ["deriveBits"]);
    const hashBuffer = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
    
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const newStoredPassword = `${saltHex}:${hashHex}`;

    // 5. Update Database
    await env.DB.prepare("UPDATE users SET password = ? WHERE username = ?").bind(newStoredPassword, username).run();

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
}