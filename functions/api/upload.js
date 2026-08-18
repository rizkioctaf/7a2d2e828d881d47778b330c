export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        
        if (!file) return new Response(JSON.stringify({ error: "Tidak ada file" }), { status: 400 });
        if (file.size > 50 * 1024 * 1024) return new Response(JSON.stringify({ error: "Maksimal 50MB" }), { status: 400 });

        // Buat nama unik agar tidak bentrok
        const filename = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        // Simpan ke R2
        await env.MEDIA_BUCKET.put(filename, file.stream(), {
            httpMetadata: { contentType: file.type }
        });
        
        return new Response(JSON.stringify({ success: true, filename }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}