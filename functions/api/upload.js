export async function onRequestPut(context) {
    // context.env.MY_BUCKET adalah penghubung ke R2 Anda
    const request = context.request;
    const url = new URL(request.url);
    const filename = url.searchParams.get('filename');

    if (!filename) {
        return new Response('Nama file tidak ditemukan', { status: 400 });
    }

    try {
        // Menyimpan data (body) langsung ke R2 Bucket
        await context.env.MY_BUCKET.put(filename, request.body);
        
        return new Response('File berhasil disimpan di R2!', { status: 200 });
    } catch (error) {
        return new Response('Gagal menyimpan file', { status: 500 });
    }
}