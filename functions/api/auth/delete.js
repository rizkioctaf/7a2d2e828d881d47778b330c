export async function onRequestPost(context) {
    const { request, env } = context;
    const { username } = await request.json();

    if (!username) {
        return new Response(JSON.stringify({ error: "Username tidak ditemukan" }), { status: 400 });
    }

    // Menghapus data user dari tabel users di D1
    await env.DB.prepare("DELETE FROM users WHERE username = ?").bind(username).run();

    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
    });
}