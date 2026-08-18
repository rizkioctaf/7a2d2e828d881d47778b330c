// Mengambil pesan dari database D1 (Method GET)
export async function onRequestGet(context) {
    const { env } = context;
    // Mengambil 50 pesan terakhir
    const { results } = await env.DB.prepare(
        "SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50"
    ).all();
    
    return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" }
    });
}

// Menyimpan pesan baru ke database D1 (Method POST)
export async function onRequestPost(context) {
    const { request, env } = context;
    const { sender, content } = await request.json();

    if (!sender || !content) {
        return new Response("Nama dan pesan wajib diisi", { status: 400 });
    }

    await env.DB.prepare(
        "INSERT INTO messages (sender, content) VALUES (?, ?)"
    ).bind(sender, content).run();

    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
    });
}