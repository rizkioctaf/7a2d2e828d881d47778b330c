export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();
  const action = new URL(request.url).searchParams.get("action");

  if (action === "register") {
    try {
      await env.DB.prepare("INSERT INTO users (username, password) VALUES (?, ?)").bind(body.username, body.password).run();
      return Response.json({ success: true });
    } catch (e) {
      return new Response("Username sudah ada", { status: 400 });
    }
  } else if (action === "login") {
    const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password = ?").bind(body.username, body.password).first();
    if (user) return Response.json({ success: true, username: user.username });
    return new Response("Username atau password salah", { status: 401 });
  }
}