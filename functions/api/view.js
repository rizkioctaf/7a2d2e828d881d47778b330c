export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const key = url.searchParams.get('key'); 
  
  if (!key) return new Response('Tidak ada nama file', { status: 400 });
  
  // Mengambil file dari R2
  const object = await context.env.MY_BUCKET.get(key);
  
  if (object === null) {
      return new Response('File tidak ditemukan', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers); // Menyertakan tipe file (misal: image/png)
  headers.set('etag', object.httpEtag);
  
  // Mengizinkan website lain untuk menampilkan file ini (CORS)
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(object.body, { headers });
}