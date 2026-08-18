export async function onRequestPost(context) {
    const { request, env } = context;
    const { oldUsername, newUsername } = await request.json();

    if (!oldUsername || !newUsername) {
        return new Response(JSON.stringify({ error: "Username lama dan baru wajib diisi" }), { status: 400 });
    }

    // 1. Cek apakah username baru sudah dipakai orang lain
    const existing = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(newUsername).first();
    if (existing) {
        return new Response(JSON.stringify({ error: "Username baru sudah terdaftar, gunakan yang lain!" }), { status: 400 });
    }

    // 2. Update di tabel users
    await env.DB.prepare("UPDATE users SET username = ? WHERE username = ?").bind(newUsername, oldUsername).run();
    
    // 3. Update juga nama sender di tabel messages agar pesan lama namanya ikut berubah
    await env.DB.prepare("UPDATE messages SET sender = ? WHERE sender = ?").bind(newUsername, oldUsername).run();

    return new Response(JSON.stringify({ success: true, username: newUsername }), {
        headers: { "Content-Type": "application/json" }
    });
}