export async function onRequestPost(context) {
  const request = context.request;
  const formData = await request.formData();
  const file = formData.get('file'); // Mengambil file dari form HTML
  
  if (!file) return new Response('Tidak ada file', { status: 400 });
  
  // Menyimpan file ke R2 dengan nama aslinya
  await context.env.MY_BUCKET.put(file.name, file.stream());
  return new Response('Berhasil upload', { status: 200 });
}