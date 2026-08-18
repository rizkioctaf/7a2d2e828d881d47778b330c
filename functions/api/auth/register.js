export async function onRequestPost(context) {
    const { request, env } = context;
    const { username, password } = await request.json();

    if (!username || !password) {
        return new Response(JSON.stringify({ error: "Username dan password wajib diisi" }), { status: 400 });
    }

    // Cek apakah username sudah ada
    const existingUser = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(username).first();
    if (existingUser) {
        return new Response(JSON.stringify({ error: "Username sudah terdaftar" }), { status: 400 });
    }

    const encoder = new TextEncoder();
    
    // 1. Buat Salt acak (16 bytes)
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // 2. Siapkan material kunci dari password
    const keyMaterial = await crypto.subtle.importKey(
        "raw", 
        encoder.encode(password), 
        { name: "PBKDF2" }, 
        false, 
        ["deriveBits"]
    );

    // 3. Proses Hashing dengan PBKDF2 (SHA-256, 100.000 iterasi)
    const hashBuffer = await crypto.subtle.deriveBits(
        { 
            name: "PBKDF2", 
            salt: salt, 
            iterations: 100000, 
            hash: "SHA-256" 
        },
        keyMaterial, 
        256 // Panjang hash yang dihasilkan (dalam bit)
    );

    // 4. Ubah Salt dan Hash ke format Hexadecimal (Teks biasa)
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // 5. Gabungkan menjadi satu string dengan pemisah titik dua (:)
    const storedPassword = `${saltHex}:${hashHex}`;

    // 6. Simpan ke D1
    await env.DB.prepare("INSERT INTO users (username, password) VALUES (?, ?)")
        .bind(username, storedPassword).run();

    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
    });
}