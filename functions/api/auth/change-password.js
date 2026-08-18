export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, oldPassword, newPassword } = await request.json();

    if (!username || !oldPassword || !newPassword) {
        return new Response(JSON.stringify({ error: "Semua kolom wajib diisi" }), { status: 400 });
    }

    // 1. Ambil data user dari DB
    const user = await env.DB.prepare("SELECT password FROM users WHERE username = ?").bind(username).first();
    if (!user) {
        return new Response(JSON.stringify({ error: "User tidak ditemukan" }), { status: 404 });
    }

    const encoder = new TextEncoder();

    // ==============================================================
    // 2. VERIFIKASI PASSWORD LAMA (Sama dengan logika login)
    // ==============================================================
    const [oldSaltHex, storedOldHashHex] = user.password.split(':');
    const oldSalt = new Uint8Array(oldSaltHex.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));

    const oldKeyMaterial = await crypto.subtle.importKey("raw", encoder.encode(oldPassword), { name: "PBKDF2" }, false, ["deriveBits"]);
    const oldHashBuffer = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: oldSalt, iterations: 100000, hash: "SHA-256" }, oldKeyMaterial, 256
    );
    const inputOldHashHex = Array.from(new Uint8Array(oldHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (inputOldHashHex !== storedOldHashHex) {
        return new Response(JSON.stringify({ error: "Password lama salah!" }), { status: 401 });
    }

    // ==============================================================
    // 3. BUAT HASH BARU UNTUK PASSWORD BARU
    // ==============================================================
    const newSalt = crypto.getRandomValues(new Uint8Array(16));
    const newKeyMaterial = await crypto.subtle.importKey("raw", encoder.encode(newPassword), { name: "PBKDF2" }, false, ["deriveBits"]);
    const newHashBuffer = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: newSalt, iterations: 100000, hash: "SHA-256" }, newKeyMaterial, 256
    );

    const newSaltHex = Array.from(newSalt).map(b => b.toString(16).padStart(2, '0')).join('');
    const newHashHex = Array.from(new Uint8Array(newHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const newStoredPassword = `${newSaltHex}:${newHashHex}`;

    // 4. Update Password di Database D1
    await env.DB.prepare("UPDATE users SET password = ? WHERE username = ?").bind(newStoredPassword, username).run();

    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
    });
}