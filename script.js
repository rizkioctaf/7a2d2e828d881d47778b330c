// --- DEKLARASI ELEMEN DOM ---
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const settingsContainer = document.getElementById('settings-container');
const userDisplay = document.getElementById('user-display');
const chatBox = document.getElementById('chat-box');
const notification = document.getElementById('notification');
const chatTextarea = document.getElementById('content');
const uploadStatus = document.getElementById('upload-status');

// --- STATE APLIKASI ---
let mode = 'login'; // Pilihan: 'login', 'register', 'reset'
let currentUser = localStorage.getItem('username');
let chatInterval;
let notifTimeout;
let lastMessageId = 0;

// Konfigurasi Markdown (agar baris baru otomatis jadi <br>)
marked.setOptions({ breaks: true });

// --- CSS DINAMIS UNTUK FITUR MENTION (@User) ---
// Kita tambahkan CSS langsung dari script agar kamu tidak perlu edit index.html
const mentionStyle = document.createElement('style');
mentionStyle.innerHTML = `
    .mention { 
        color: #0051c3; 
        font-weight: bold; 
        background: #e8f0fe; 
        padding: 2px 4px; 
        border-radius: 4px; 
        cursor: pointer;
    }
    .mention:hover { background: #d2e3fc; }
`;
document.head.appendChild(mentionStyle);

// Jika sudah login, langsung masuk ke chat
if (currentUser) showChat();


// ==========================================
// FUNGSI KEAMANAN & UTILITAS
// ==========================================

// Mencegah XSS pada teks murni (seperti nama username)
function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

// Validasi username hanya boleh huruf dan angka
function isValidUsername(user) { 
    return /^[a-zA-Z0-9]+$/.test(user); 
}

// Menampilkan notifikasi pop-up di dalam halaman
function showNotification(msg, type = 'error') {
    notification.innerText = msg;
    notification.className = type === 'success' ? 'notify-success' : 'notify-error';
    notification.style.display = 'block';
    
    clearTimeout(notifTimeout);
    notifTimeout = setTimeout(() => notification.style.display = 'none', 4000);
}


// ==========================================
// LOGIKA AUTENTIKASI (LOGIN/REGISTER/RESET)
// ==========================================

// Toggle Form
document.getElementById('toggle-auth').addEventListener('click', () => { 
    mode = mode === 'reset' ? 'login' : (mode === 'login' ? 'register' : 'login'); 
    updateAuthUI(); 
});
document.getElementById('toggle-reset').addEventListener('click', () => { 
    mode = 'reset'; 
    updateAuthUI(); 
});

// Update Tampilan Form Auth
function updateAuthUI() {
    notification.style.display = 'none'; 
    const authTitle = document.getElementById('auth-title');
    const authBtn = document.getElementById('auth-btn');
    const valCode = document.getElementById('validation-code');
    const resetCode = document.getElementById('reset-code');
    const toggleAuth = document.getElementById('toggle-auth');
    const toggleReset = document.getElementById('toggle-reset');
    const pwdInput = document.getElementById('password');
    const usrInput = document.getElementById('username');
    
    if (mode === 'login') {
        authTitle.innerText = "Login ke Chat"; 
        authBtn.innerText = "Masuk"; 
        pwdInput.placeholder = "Password"; 
        usrInput.placeholder = "Username";
        valCode.style.display = 'none'; 
        resetCode.style.display = 'none';
        toggleAuth.innerText = "Belum punya akun? Daftar disini"; 
        toggleAuth.style.display = 'inline-block'; 
        toggleReset.style.display = 'inline-block';
    } else if (mode === 'register') {
        authTitle.innerText = "Daftar Akun Baru"; 
        authBtn.innerText = "Daftar"; 
        pwdInput.placeholder = "Buat Password Baru"; 
        usrInput.placeholder = "Username (Hanya Huruf & Angka)";
        valCode.style.display = 'block'; 
        resetCode.style.display = 'none';
        toggleAuth.innerText = "Sudah punya akun? Login disini"; 
        toggleAuth.style.display = 'inline-block'; 
        toggleReset.style.display = 'none';
    } else if (mode === 'reset') {
        authTitle.innerText = "Reset Password"; 
        authBtn.innerText = "Simpan Password Baru"; 
        pwdInput.placeholder = "Masukkan Password Baru"; 
        usrInput.placeholder = "Username Akun Anda";
        valCode.style.display = 'none'; 
        resetCode.style.display = 'block';
        toggleAuth.innerText = "Batal / Kembali ke Login"; 
        toggleAuth.style.display = 'inline-block'; 
        toggleReset.style.display = 'none';
    }
}

// Submit Form Auth
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const authBtn = document.getElementById('auth-btn');
    
    if (mode === 'register' && !isValidUsername(username)) {
        return showNotification("Gagal: Username hanya huruf dan angka!", "error");
    }
    
    authBtn.innerText = "Tunggu..."; 
    authBtn.disabled = true;

    let endpoint = '/api/auth/login'; 
    let payload = { username, password };
    
    if (mode === 'register') { 
        endpoint = '/api/auth/register'; 
        payload.validationCode = document.getElementById('validation-code').value; 
    } else if (mode === 'reset') { 
        endpoint = '/api/auth/reset-password'; 
        payload.newPassword = password; 
        payload.resetCode = document.getElementById('reset-code').value; 
    }

    try {
        const res = await fetch(endpoint, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        const data = await res.json();
        
        if (res.ok) {
            if (mode === 'login') { 
                localStorage.setItem('username', data.username); 
                currentUser = data.username; 
                showChat(); 
            } else { 
                showNotification(mode === 'reset' ? "Password direset!" : "Pendaftaran berhasil!", "success"); 
                document.getElementById('password').value = ''; 
                mode = 'login'; 
                updateAuthUI(); 
            }
        } else {
            showNotification(data.error, "error");
        }
    } catch (err) { 
        showNotification("Kesalahan jaringan.", "error"); 
    }
    
    authBtn.innerText = mode === 'login' ? "Masuk" : (mode === 'register' ? "Daftar" : "Simpan Password Baru"); 
    authBtn.disabled = false;
});


// ==========================================
// NAVIGASI HALAMAN (TABS)
// ==========================================

function showChat() { 
    authContainer.style.display = 'none'; 
    settingsContainer.style.display = 'none'; 
    chatContainer.style.display = 'flex'; 
    userDisplay.innerText = currentUser; 
    fetchMessages(); 
    chatInterval = setInterval(fetchMessages, 3000); 
}
function openSettings() { 
    clearInterval(chatInterval); 
    chatContainer.style.display = 'none'; 
    settingsContainer.style.display = 'block'; 
}
function closeSettings() { 
    settingsContainer.style.display = 'none'; 
    showChat(); 
}
function logout() { 
    localStorage.removeItem('username'); 
    location.reload(); 
}


// ==========================================
// PENGATURAN AKUN (EDIT/HAPUS)
// ==========================================

document.getElementById('edit-username-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUsername = document.getElementById('new-username').value;
    if (!isValidUsername(newUsername)) return showNotification("Username baru hanya boleh huruf & angka!", "error");
    
    try {
        const res = await fetch('/api/auth/edit-username', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ oldUsername: currentUser, newUsername }) 
        });
        if (res.ok) { 
            showNotification("Username diubah!", "success"); 
            currentUser = (await res.json()).username; 
            localStorage.setItem('username', currentUser); 
            userDisplay.innerText = currentUser; 
            document.getElementById('new-username').value = ''; 
        } else {
            showNotification((await res.json()).error, "error");
        }
    } catch (err) { showNotification("Kesalahan jaringan.", "error"); }
});

document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const res = await fetch('/api/auth/change-password', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                username: currentUser, 
                oldPassword: document.getElementById('old-password').value, 
                newPassword: document.getElementById('new-password').value 
            }) 
        });
        if (res.ok) { 
            showNotification("Password diubah!", "success"); 
            document.getElementById('old-password').value = ''; 
            document.getElementById('new-password').value = ''; 
        } else {
            showNotification((await res.json()).error, "error");
        }
    } catch (err) { showNotification("Kesalahan jaringan.", "error"); }
});

async function deleteAccount() {
    if (confirm("Yakin hapus akun secara permanen?")) {
        const res = await fetch('/api/auth/delete', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ username: currentUser }) 
        });
        if (res.ok) { 
            alert("Akun terhapus."); 
            logout(); 
        } else {
            showNotification("Gagal hapus akun.", "error");
        }
    }
}


// ==========================================
// UPLOAD MEDIA (CLOUDFLARE R2)
// ==========================================

document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validasi ukuran max 50MB
    if (file.size > 50 * 1024 * 1024) {
        e.target.value = '';
        return alert("Ukuran file maksimal 50MB!");
    }
    
    uploadStatus.style.display = 'block';
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        
        if (res.ok) {
            const mediaUrl = `/api/media/${data.filename}`;
            let mediaMarkup = '';
            
            // Format sintaks menjadi bentuk Markdown / HTML yang diizinkan DOMPurify
            if (file.type.startsWith('image/')) {
                mediaMarkup = `\n![image](${mediaUrl})\n`;
            } else if (file.type.startsWith('video/')) {
                mediaMarkup = `\n<video controls preload="metadata"><source src="${mediaUrl}" type="${file.type}"></video>\n`;
            } else if (file.type.startsWith('audio/')) {
                mediaMarkup = `\n<audio controls><source src="${mediaUrl}" type="${file.type}"></audio>\n`;
            } else {
                mediaMarkup = `\n[Unduh / Tautan File: ${file.name}](${mediaUrl})\n`;
            }
            
            // Masukkan kode ke dalam textarea & focus
            chatTextarea.value += mediaMarkup;
            chatTextarea.dispatchEvent(new Event('input')); 
            chatTextarea.focus();
        } else {
            alert("Gagal upload: " + data.error);
        }
    } catch (err) {
        alert("Terjadi kesalahan jaringan saat mengunggah.");
    }
    
    uploadStatus.style.display = 'none';
    e.target.value = ''; // Reset input
});


// ==========================================
// LOGIKA CHAT, TEXTAREA MULTILINE & MARKDOWN
// ==========================================

// Fitur auto-resize tinggi Textarea saat mengetik
chatTextarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Shortcut Keyboard Textarea (Enter: Kirim, Shift+Enter: Baris Baru)
chatTextarea.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); 
        document.getElementById('send-btn').click();
    }
});

// Menarik dan me-render Pesan
async function fetchMessages() {
    try {
        const res = await fetch('/api/messages');
        const messages = await res.json();
        chatBox.innerHTML = '';
        
        messages.reverse().forEach(msg => {
            // Waktu dalam WIB
            const time = new Date(msg.timestamp + 'Z').toLocaleString('id-ID', { 
                timeZone: 'Asia/Jakarta', 
                year: 'numeric', month: '2-digit', day: '2-digit', 
                hour: '2-digit', minute: '2-digit', second: '2-digit' 
            });
            
            // 1. Markdown Parsing
            const rawHTML = marked.parse(msg.content);
            
            // 2. DOMPurify (Melindungi XSS tapi mengizinkan tag Media)
            const safeMarkdownHTML = DOMPurify.sanitize(rawHTML, {
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'img', 'video', 'audio', 'source'],
                ALLOWED_ATTR: ['href', 'src', 'controls', 'type', 'preload', 'alt']
            });

            // 3. Merender Div Pesan (Desain bersih tanpa avatar)
            const div = document.createElement('div');
            div.className = 'message';
            
            div.innerHTML = `
                <div style="margin-bottom: 2px;">
                    <strong>${escapeHTML(msg.sender)}</strong> <span class="meta">${time}</span>
                </div>
                <div class="markdown-body">${safeMarkdownHTML}</div>
            `;
            chatBox.appendChild(div);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) { console.error("Error loading chat"); }
}

// Mengirim Pesan
document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = chatTextarea.value.trim();
    if(!content) return;
    
    // Reset Form Input
    chatTextarea.value = '';
    chatTextarea.style.height = 'auto';
    
    // Post Pesan ke Database
    await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser, content })
    });
    
    // Tarik pesan terbaru segera
    fetchMessages();
});