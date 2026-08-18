export async function onRequestPost(context) {
    const { request, env } = context;
    const { oldUsername, newUsername } = await request.json();

    if (!oldUsername || !newUsername) {
        return new Response(JSON.stringify({ error: "Username lama dan baru wajib diisi" }), { status: 400 });
    }

    // VALIDASI ALFANUMERIK
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(newUsername)) {
        return new Response(JSON.stringify({ error: "Username hanya boleh berisi huruf dan angka tanpa spasi!" }), { status: 400 });
    }

    // CEK USERNAME UNIK
    const existing = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(newUsername).first();
    if (existing) {
        return new Response(JSON.stringify({ error: "Username baru sudah terdaftar, gunakan yang lain!" }), { status: 400 });
    }

    await env.DB.prepare("UPDATE users SET username = ? WHERE username = ?").bind(newUsername, oldUsername).run();
    await env.DB.prepare("UPDATE messages SET sender = ? WHERE sender = ?").bind(newUsername, oldUsername).run();

    return new Response(JSON.stringify({ success: true, username: newUsername }), { headers: { "Content-Type": "application/json" } });
}