/**
 * Cloudflare Pages Function - Storage API
 * Menangani rute API untuk manajemen R2 Bucket
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Helper untuk response JSON
 */
const jsonResponse = (data, status = 200) => 
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });

/**
 * Helper untuk error
 */
const errorResponse = (msg, status = 400) => jsonResponse({ error: msg }, status);

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');

  // Handle CORS Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Binding ke bucket (Pastikan variabel env diconfig di CF dashboard sebagai MY_R2_BUCKET)
  const bucket = env.MY_R2_BUCKET;
  if (!bucket) return errorResponse("R2 Bucket tidak dikonfigurasi", 500);

  try {
    // 1. LIST FILES & FOLDERS
    if (request.method === "GET" && path === "list") {
      const prefix = url.searchParams.get("prefix") || "";
      const listOptions = {
        prefix: prefix,
        delimiter: "/", // Delimiter untuk mensimulasikan struktur direktori
        limit: 1000
      };
      
      const listed = await bucket.list(listOptions);
      
      // Hitung total size simulasi (Storage Meter) - Idealnya dicache di KV
      let totalUsage = 0;
      if (prefix === "") {
         const allFiles = await bucket.list();
         totalUsage = allFiles.objects.reduce((acc, obj) => acc + obj.size, 0);
      }

      return jsonResponse({
        files: listed.objects,
        folders: listed.delimitedPrefixes,
        usage: totalUsage
      });
    }

    // 2. GET / DOWNLOAD / PREVIEW FILE
    if (request.method === "GET" && path === "file") {
      const key = url.searchParams.get("key");
      if (!key) return errorResponse("Key diperlukan", 400);

      const object = await bucket.get(key);
      if (!object) return errorResponse("File tidak ditemukan", 404);

      const headers = new Headers({ ...CORS_HEADERS });
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      
      return new Response(object.body, { headers });
    }

    // 3. UPLOAD FILE (Direct Stream via Worker)
    if (request.method === "PUT" && path === "upload") {
      const key = url.searchParams.get("key");
      if (!key) return errorResponse("Key diperlukan", 400);
      
      // Streaming langsung ke R2
      await bucket.put(key, request.body, {
        httpMetadata: request.headers.get("Content-Type") 
          ? { contentType: request.headers.get("Content-Type") } 
          : {},
      });
      return jsonResponse({ success: true, key });
    }

    // 4. CREATE FOLDER (Simulasi menggunakan dummy .keep file)
    if (request.method === "POST" && path === "folder") {
      const key = url.searchParams.get("key"); // ex: 'myfolder/'
      if (!key) return errorResponse("Key folder diperlukan", 400);
      
      const folderKey = key.endsWith('/') ? `${key}.keep` : `${key}/.keep`;
      await bucket.put(folderKey, "folder_marker");
      return jsonResponse({ success: true, key: folderKey });
    }

    // 5. DELETE FILE OR FOLDER
    if (request.method === "DELETE" && path === "delete") {
      const key = url.searchParams.get("key");
      if (!key) return errorResponse("Key diperlukan", 400);

      // Jika menghapus folder, hapus semua yang ber-prefix folder tersebut
      if (key.endsWith('/')) {
        const listed = await bucket.list({ prefix: key });
        const keysToDelete = listed.objects.map(o => o.key);
        if(keysToDelete.length > 0) await bucket.delete(keysToDelete);
      } else {
        await bucket.delete(key);
      }
      return jsonResponse({ success: true });
    }

    return errorResponse("Endpoint tidak valid", 404);

  } catch (err) {
    return errorResponse(err.message, 500);
  }
}