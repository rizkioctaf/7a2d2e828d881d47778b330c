async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  
  // Menggunakan FormData untuk menerima teks dan file sekaligus
  const formData = await request.formData();
  const username = formData.get('username');
  const password = formData.get('password');
  const content = formData.get('content');
  const mediaFile = formData.get('media'); // Objek File

  if (!content || content.length > 2000) {
    return new Response(JSON.stringify({ error: "Postingan maksimal 2000 karakter!" }), { status: 400 });
  }

  const hashedPassword = await hashPassword(password);
  const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password_hash = ?").bind(username, hashedPassword).first();
  if (!user) return new Response(JSON.stringify({ error: "Otorisasi gagal." }), { status: 401 });

  let mediaUrl = null;
  let mediaType = null;

  // Jika ada file yang diupload
  if (mediaFile && mediaFile.size > 0) {
      if (mediaFile.size > 50 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: "Ukuran file maksimal 50MB!" }), { status: 400 });
      }

      // Pastikan format aman
      if (mediaFile.type.startsWith('image/') || mediaFile.type.startsWith('video/') || mediaFile.type.startsWith('audio/')) {
          mediaType = mediaFile.type.split('/')[0]; // Mendapatkan kata 'image', 'video', atau 'audio'
          const uniqueName = crypto.randomUUID() + "-" + mediaFile.name.replace(/[^a-zA-Z0-9.]/g, ""); // Nama unik
          
          // Simpan ke R2 Cloudflare
          await env.BUCKET.put(uniqueName, mediaFile.stream(), {
              httpMetadata: { contentType: mediaFile.type }
          });
          
          mediaUrl = uniqueName;
      } else {
          return new Response(JSON.stringify({ error: "Format file tidak didukung!" }), { status: 400 });
      }
  }

  await env.DB.prepare(
    "INSERT INTO articles (username, content, media_url, media_type) VALUES (?, ?, ?, ?)"
  ).bind(username, content, mediaUrl, mediaType).run();

  return new Response(JSON.stringify({ success: true, message: "Postingan terbit!" }));
}