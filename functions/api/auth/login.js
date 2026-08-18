export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, password } = await request.json();

    // Hash password input untuk dicocokkan dengan database
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Cari user di D1
    const user = await env.DB.prepare("SELECT username FROM users WHERE username = ? AND password = ?")
        .bind(username, hashedPassword).first();

    if (!user) {
        return new Response(JSON.stringify({ error: "Username atau password salah!" }), { status: 401 });
    }

    return new Response(JSON.stringify({ success: true, username: user.username }), {
        headers: { "Content-Type": "application/json" }
    });
}