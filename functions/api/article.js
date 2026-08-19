export async function onRequest(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");
  
  const result = await context.env.DB.prepare(
    "SELECT * FROM articles WHERE id = ?"
  ).bind(id).first();
  
  return Response.json(result);
}