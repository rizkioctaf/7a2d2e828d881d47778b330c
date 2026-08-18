export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, newPassword, resetCode } = await request.json();

    // 1. Validasi Kode
    if (resetCode !== env.RESET_CODE) {
        return new Response(JSON.stringify({ error: "Kode reset salah!" }), { status: 403 });
    }

    // 2. Hash Password Baru (PBKDF2)
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(newPassword), { name: "PBKDF2" }, false, ["deriveBits"]);
    const hashBuffer = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
    
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const newStoredPassword = `${saltHex}:${hashHex}`;

    // 3. Update DB
    await env.DB.prepare("UPDATE users SET password = ? WHERE username = ?").bind(newStoredPassword, username).run();

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
}