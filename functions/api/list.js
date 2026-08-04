export async function onRequestGet(context) {
  // context.env.MY_BUCKET adalah cara kita memanggil R2
  const listed = await context.env.MY_BUCKET.list();
  return new Response(JSON.stringify(listed.objects), {
    headers: { 'Content-Type': 'application/json' }
  });
}