export async function onRequestGet(context) {
    const { env, params } = context;
    const filename = params.filename;
    
    const obj = await env.MEDIA_BUCKET.get(filename);
    if (!obj) return new Response('File tidak ditemukan', { status: 404 });
    
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    
    return new Response(obj.body, { headers });
}