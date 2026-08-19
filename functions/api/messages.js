// functions/api/messages.js

export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const lastId = url.searchParams.get('lastId');

    // Menggunakan LEFT JOIN agar kita bisa mendapatkan nama dan isi pesan yang dibalas
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

    // Menyimpan pesan beserta ID pesan yang dibalas (jika ada)
    await env.DB.prepare("INSERT INTO messages (sender, content, reply_to) VALUES (?, ?, ?)")
        .bind(sender, content, reply_to || null).run();

    // BACKGROUND TASK: BACKUP & HAPUS PESAN > 30 HARI
    waitUntil(async function() {
        try {
            const oldMessages = await env.DB.prepare("SELECT * FROM messages WHERE timestamp <= datetime('now', '-30 day')").all();
            if (oldMessages.results && oldMessages.results.length > 0) {
                const backupData = JSON.stringify(oldMessages.results, null, 2);
                const backupFilename = `backups/chat-backup-${Date.now()}.json`;
                
                await env.MEDIA_BUCKET.put(backupFilename, backupData, { httpMetadata: { contentType: "application/json" } });
                await env.DB.prepare("DELETE FROM messages WHERE timestamp <= datetime('now', '-30 day')").run();
            }
        } catch (e) { console.error("Backup error", e); }
    }());

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
}