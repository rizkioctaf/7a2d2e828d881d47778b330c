export async function onRequestPost(context) {
  const request = context.request;
  const formData = await request.formData();
  const file = formData.get('file'); 
  
  if (!file) return new Response('Tidak ada file', { status: 400 });
  
  // Menyimpan file beserta informasi tipe file-nya (agar bisa di-view di browser)
  await context.env.MY_BUCKET.put(file.name, file.stream(), {
      httpMetadata: { contentType: file.type }
  });
  
  return new Response('Berhasil upload', { status: 200 });
}