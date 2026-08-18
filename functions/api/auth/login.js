export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, password } = await request.json();

    // 1. Cari user di D1 (Kita butuh data password-nya untuk mengambil Salt)
    const user = await env.DB.prepare("SELECT username, password FROM users WHERE username = ?")
        .bind(username).first();

    if (!user) {
        return new Response(JSON.stringify({ error: "Username atau password salah!" }), { status: 401 });
    }

    // 2. Pisahkan Salt dan Hash dari database (format: salt_hex:hash_hex)
    const [saltHex, storedHashHex] = user.password.split(':');
    
    // 3. Ubah teks Salt Hex kembali menjadi Array Byte
    const salt = new Uint8Array(saltHex.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));
    const encoder = new TextEncoder();

    // 4. Siapkan material kunci dari password inputan user
    const keyMaterial = await crypto.subtle.importKey(
        "raw", 
        encoder.encode(password), 
        { name: "PBKDF2" }, 
        false, 
        ["deriveBits"]
    );

    // 5. Hash password input menggunakan Salt milik user di database
    const hashBuffer = await crypto.subtle.deriveBits(
        { 
            name: "PBKDF2", 
            salt: salt, 
            iterations: 100000, 
            hash: "SHA-256" 
        },
        keyMaterial, 
        256
    );

    // 6. Ubah hasil hash input ke Hexadecimal
    const inputHashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // 7. Cocokkan Hash
    if (inputHashHex !== storedHashHex) {
        return new Response(JSON.stringify({ error: "Username atau password salah!" }), { status: 401 });
    }

    // Jika cocok, login berhasil
    return new Response(JSON.stringify({ success: true, username: user.username }), {
        headers: { "Content-Type": "application/json" }
    });
}