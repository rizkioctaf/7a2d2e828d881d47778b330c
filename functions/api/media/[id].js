export async function onRequestGet(context) {
    const { env, params } = context;
    const fileName = params.id;
    
    const object = await env.BUCKET.get(fileName);
    if (!object) return new Response('File tidak ditemukan', { status: 404 });
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    
    return new Response(object.body, { headers });
}