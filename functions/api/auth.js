export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();
  const action = new URL(request.url).searchParams.get("action");

  // REGISTER
  if (action === "register") {
    try {
      await env.DB.prepare("INSERT INTO users (username, password) VALUES (?, ?)").bind(body.username, body.password).run();
      return Response.json({ success: true });
    } catch (e) {
      return new Response("Username sudah ada", { status: 400 });
    }
  } 
  // LOGIN
  else if (action === "login") {
    const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password = ?").bind(body.username, body.password).first();
    if (user) return Response.json({ success: true, username: user.username });
    return new Response("Username atau password salah", { status: 401 });
  } 
  // GANTI PASSWORD
  else if (action === "change_password") {
    const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password = ?").bind(body.username, body.old_password).first();
    if (user) {
      await env.DB.prepare("UPDATE users SET password = ? WHERE username = ?").bind(body.new_password, body.username).run();
      return Response.json({ success: true });
    }
    return new Response("Password lama salah", { status: 401 });
  } 
  // HAPUS AKUN
  else if (action === "delete_account") {
    const user = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password = ?").bind(body.username, body.password).first();
    if (user) {
      await env.DB.prepare("DELETE FROM users WHERE username = ?").bind(body.username).run();
      // Opsi: Hapus juga semua artikel milik user ini
      await env.DB.prepare("DELETE FROM articles WHERE author = ?").bind(body.username).run();
      return Response.json({ success: true });
    }
    return new Response("Password salah", { status: 401 });
  }
  // LUPA PASSWORD (Versi Sederhana Tanpa Email)
  else if (action === "forgot_password") {
    const user = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(body.username).first();
    if (user) {
      await env.DB.prepare("UPDATE users SET password = ? WHERE username = ?").bind(body.new_password, body.username).run();
      return Response.json({ success: true });
    }
    return new Response("Username tidak ditemukan", { status: 404 });
  }
}