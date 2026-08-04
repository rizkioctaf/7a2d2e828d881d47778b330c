export async function onRequestPost(context) {
  const request = context.request;
  const formData = await request.formData();
  const file = formData.get('file');
  const isTemp = formData.get('isTemp'); // Mengambil status centang dari frontend
  
  if (!file) return new Response('Tidak ada file', { status: 400 });
  
  // Jika file sementara, tambahkan teks "temp/" di depan nama filenya
  const fileName = isTemp === 'true' ? `temp/${file.name}` : file.name;
  
  await context.env.MY_BUCKET.put(fileName, file.stream(), {
      httpMetadata: { contentType: file.type }
  });
  
  return new Response('Berhasil upload', { status: 200 });
}