export async function onRequestDelete(context) {
  const url = new URL(context.request.url);
  const key = url.searchParams.get('key'); // Mengambil nama file dari URL
  
  if (!key) return new Response('Tidak ada nama file', { status: 400 });
  
  // Menghapus file dari R2
  await context.env.MY_BUCKET.delete(key);
  return new Response('Berhasil dihapus', { status: 200 });
}