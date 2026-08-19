export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const lastId = url.searchParams.get('lastId');

    const query = `
        SELECT m.*, r.sender as reply_sender, r.content as reply_content 
        FROM messages m 
        LEFT JOIN messages r ON m.reply_to = r.id 
        ${lastId ? 'WHERE m.id > ?' : ''} 
        ORDER BY m.id ${lastId ? 'ASC' : 'DESC LIMIT 50'}
    `;

    const stmt = lastId ? env.DB.prepare(query).bind(lastId) : env.DB.prepare(query);
    const { results } = await stmt.all();

    return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
}

export async function onRequestPost(context) {
    const { request, env, waitUntil } = context;
    const { sender, content, reply_to } = await request.json();

    if (!sender || !content) return new Response("Error", { status: 400 });

    await env.DB.prepare("INSERT INTO messages (sender, content, reply_to) VALUES (?, ?, ?)")
        .bind(sender, content, reply_to || null).run();

    // BACKGROUND TASK: Hapus pesan > 30 hari (TANPA BACKUP)
    waitUntil(
        env.DB.prepare("DELETE FROM messages WHERE timestamp <= datetime('now', '-30 day')").run()
    );

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
}