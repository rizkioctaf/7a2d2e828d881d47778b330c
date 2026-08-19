// ==========================================
// DEKLARASI ELEMEN DOM
// ==========================================
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const settingsContainer = document.getElementById('settings-container');
const userDisplay = document.getElementById('user-display');
const chatBox = document.getElementById('chat-box');
const notification = document.getElementById('notification');
const chatTextarea = document.getElementById('content');
const uploadStatus = document.getElementById('upload-status');

// ==========================================
// STATE APLIKASI
// ==========================================
let mode = 'login'; 
let currentUser = localStorage.getItem('username');
let chatInterval;
let notifTimeout;
let lastMessageId = 0; 
let replyingToId = null; // Menyimpan ID pesan yang sedang dibalas

// Konfigurasi Markdown (agar baris baru otomatis jadi <br>)
if (typeof marked !== 'undefined') marked.setOptions({ breaks: true });

// Tambahkan CSS Dinamis untuk fitur Mention (@User)
const mentionStyle = document.createElement('style');
mentionStyle.innerHTML = `
    .mention { color: #0051c3; font-weight: bold; background: #e8f0fe; padding: 2px 4px; border-radius: 4px; cursor: pointer; transition: background 0.2s;} 
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
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
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
// FUNGSI REPLY (BALAS PESAN)
// ==========================================

function setReply(id, sender, content) {
    replyingToId = id;
    document.getElementById('reply-banner').style.display = 'flex';
    document.getElementById('reply-user').innerText = '@' + sender;
    
    // Hilangkan sintaks markdown untuk preview (tampilan simpel di banner balasan)
    let plainText = decodeURIComponent(content).replace(/[*_~`>#]/g, '').replace(/\n/g, ' ');
    if (plainText.length > 50) plainText = plainText.substring(0, 50) + '...';
    document.getElementById('reply-text').innerText = plainText;
    
    chatTextarea.focus();
}

// Fungsi Batal Reply (dibuat global agar bisa diakses onClick dari HTML)
window.cancelReply = function() {
    replyingToId = null;
    document.getElementById('reply-banner').style.display = 'none';
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
        authTitle.innerText = "Login ke Chat"; authBtn.innerText = "Masuk"; pwdInput.placeholder = "Password"; usrInput.placeholder = "Username";
        valCode.style.display = 'none'; resetCode.style.display = 'none';
        toggleAuth.innerText = "Belum punya akun? Daftar disini"; toggleAuth.style.display = 'inline-block'; toggleReset.style.display = 'inline-block';
    } else if (mode === 'register') {
        authTitle.innerText = "Daftar Akun Baru"; authBtn.innerText = "Daftar"; pwdInput.placeholder = "Buat Password Baru"; usrInput.placeholder = "Username (Hanya Huruf & Angka)";
        valCode.style.display = 'block'; resetCode.style.display = 'none';
        toggleAuth.innerText = "Sudah punya akun? Login disini"; toggleAuth.style.display = 'inline-block'; toggleReset.style.display = 'none';
    } else if (mode === 'reset') {
        authTitle.innerText = "Reset Password"; authBtn.innerText = "Simpan Password Baru"; pwdInput.placeholder = "Masukkan Password Baru"; usrInput.placeholder = "Username Akun Anda";
        valCode.style.display = 'none'; resetCode.style.display = 'block';
        toggleAuth.innerText = "Batal / Kembali ke Login"; toggleAuth.style.display = 'inline-block'; toggleReset.style.display = 'none';
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
    
    authBtn.innerText = "Tunggu..."; authBtn.disabled = true;

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
                document.getElementById('validation-code').value = '';
                document.getElementById('reset-code').value = '';
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
    
    fetchMessages(true); // Initial load
    chatInterval = setInterval(() => fetchMessages(false), 3000); // Polling (Delta fetch)
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
        try {
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
        } catch (err) { showNotification("Kesalahan jaringan.", "error"); }
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
// LOGIKA CHAT (RENDER, MENTION, & REPLY)
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

// Menarik dan me-render Pesan (Delta Fetch / Hemat Database)
async function fetchMessages(isInitialLoad = false) {
    try {
        const endpoint = isInitialLoad ? '/api/messages' : `/api/messages?lastId=${lastMessageId}`;
        const res = await fetch(endpoint);
        const messages = await res.json();
        
        if (messages.length === 0) return; // Abaikan jika tidak ada pesan baru

        if (isInitialLoad) {
            chatBox.innerHTML = ''; 
            messages.reverse(); // Dibalik karena initial load me-return DESC
        }
        
        messages.forEach(msg => {
            // Waktu dalam WIB
            const time = new Date(msg.timestamp + 'Z').toLocaleString('id-ID', { 
                timeZone: 'Asia/Jakarta', 
                year: 'numeric', month: '2-digit', day: '2-digit', 
                hour: '2-digit', minute: '2-digit', second: '2-digit' 
            }) + ' WIB';
            
            // 1. Markdown Parsing
            let rawHTML = marked.parse(msg.content);
            
            // 2. DOMPurify perlindungan XSS (Mengizinkan class untuk Mention dan tag Media)
            let safeMarkdownHTML = DOMPurify.sanitize(rawHTML, {
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'img', 'video', 'audio', 'source', 'span'],
                ALLOWED_ATTR: ['href', 'src', 'controls', 'type', 'preload', 'alt', 'class']
            });

            // 3. Regex Mention: Ubah @username menjadi tag span yang memiliki style highlight
            safeMarkdownHTML = safeMarkdownHTML.replace(/@([a-zA-Z0-9]+)/g, '<span class="mention">@$1</span>');

            const div = document.createElement('div');
            div.className = 'message';
            
            // 4. Merender Blok Balasan (Jika pesan ini adalah reply)
            let replyHTML = '';
            if (msg.reply_to && msg.reply_sender) {
                // Bersihkan Markdown dari pesan asli untuk dipreview
                let safeReplyContent = escapeHTML(msg.reply_content).replace(/<[^>]*>?/gm, ''); 
                if (safeReplyContent.length > 70) safeReplyContent = safeReplyContent.substring(0, 70) + '...';
                
                replyHTML = `
                    <div class="reply-block">
                        <strong>@${escapeHTML(msg.reply_sender)}</strong>: ${safeReplyContent}
                    </div>
                `;
            }
            
            // Encode content untuk disimpan di atribut tombol tanpa merusak HTML
            const encodedContent = encodeURIComponent(msg.content);

            // 5. Tampilkan Pesan ke DOM
            div.innerHTML = `
                <div style="margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
                    <div><strong>${escapeHTML(msg.sender)}</strong> <span class="meta">${time}</span></div>
                    <button class="btn-reply" data-id="${msg.id}" data-sender="${escapeHTML(msg.sender)}" data-content="${encodedContent}">Balas</button>
                </div>
                ${replyHTML}
                <div class="markdown-body">${safeMarkdownHTML}</div>
            `;
            chatBox.appendChild(div);
            
            if (msg.id > lastMessageId) {
                lastMessageId = msg.id;
            }
        });
        
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) { 
        console.error("Error loading chat"); 
    }
}

// EVENT DELEGATION: Jika pengguna mengklik tag @Mention atau tombol Balas di chatbox
chatBox.addEventListener('click', (e) => {
    // Aksi Klik Tag @Mention
    if (e.target.classList.contains('mention')) {
        const usernameTag = e.target.innerText;
        chatTextarea.value += usernameTag + ' '; // Masukkan tag ke area input
        chatTextarea.dispatchEvent(new Event('input')); // Auto-resize
        chatTextarea.focus();
    }
    
    // Aksi Klik Tombol Balas (Reply)
    if (e.target.classList.contains('btn-reply')) {
        const id = e.target.getAttribute('data-id');
        const sender = e.target.getAttribute('data-sender');
        const content = e.target.getAttribute('data-content');
        setReply(id, sender, content);
    }
});

// Mengirim Pesan (Hanya ketika tombol Submit ditekan)
document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = chatTextarea.value.trim();
    if(!content) return;
    
    // Simpan status reply sebelum mereset form
    const sendReplyId = replyingToId;
    
    // Reset Form Input
    chatTextarea.value = '';
    chatTextarea.style.height = 'auto';
    window.cancelReply(); // Sembunyikan banner reply
    
    // Post Pesan ke Database
    await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            sender: currentUser, 
            content: content,
            reply_to: sendReplyId 
        })
    });
    
    // Tarik pesan terbaru segera secara manual
    fetchMessages(false);
});