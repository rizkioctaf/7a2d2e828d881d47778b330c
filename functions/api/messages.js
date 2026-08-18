// functions/api/messages.js

export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const lastId = url.searchParams.get('lastId');

    if (lastId) {
        const { results } = await env.DB.prepare("SELECT * FROM messages WHERE id > ? ORDER BY id ASC").bind(lastId).all();
        return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
    } else {
        const { results } = await env.DB.prepare("SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50").all();
        return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
    }
}

export async function onRequestPost(context) {
    const { request, env, waitUntil } = context;
    const { sender, content } = await request.json();

    if (!sender || !content) {
        return new Response("Nama dan pesan wajib diisi", { status: 400 });
    }

    // 1. Simpan pesan baru ke D1
    await env.DB.prepare("INSERT INTO messages (sender, content) VALUES (?, ?)").bind(sender, content).run();

    // 2. BACKGROUND TASK: BACKUP & HAPUS PESAN > 30 HARI
    // waitUntil() membuat proses ini berjalan di latar belakang tanpa membuat pengguna menunggu (Loading).
    waitUntil(async function() {
        try {
            // Cari pesan yang umurnya lebih dari 30 hari
            const oldMessages = await env.DB.prepare(
                "SELECT * FROM messages WHERE timestamp <= datetime('now', '-30 day')"
            ).all();
            
            if (oldMessages.results && oldMessages.results.length > 0) {
                // Ubah data menjadi file JSON
                const backupData = JSON.stringify(oldMessages.results, null, 2);
                const backupFilename = `backups/chat-backup-${Date.now()}.json`;
                
                // Simpan File JSON tersebut ke R2 (Bucket MEDIA_BUCKET)
                await env.MEDIA_BUCKET.put(backupFilename, backupData, {
                    httpMetadata: { contentType: "application/json" }
                });
                
                // Hapus pesan-pesan tersebut dari Database D1
                await env.DB.prepare(
                    "DELETE FROM messages WHERE timestamp <= datetime('now', '-30 day')"
                ).run();
                
                console.log(`Backup berhasil: ${oldMessages.results.length} pesan dipindahkan ke R2.`);
            }
        } catch (e) {
            console.error("Gagal melakukan backup latar belakang", e);
        }
    }());

    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
    });
}