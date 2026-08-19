const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const settingsContainer = document.getElementById('settings-container');
const userDisplay = document.getElementById('user-display');
const chatBox = document.getElementById('chat-box');
const notification = document.getElementById('notification');
const chatTextarea = document.getElementById('content');
const uploadStatus = document.getElementById('upload-status');
const mentionSuggestions = document.getElementById('mention-suggestions');

let mode = 'login'; 
let currentUser = localStorage.getItem('username');
let chatInterval;
let notifTimeout;
let lastMessageId = 0; 
let replyingToId = null; 

// Menyimpan daftar username untuk Auto-suggest Mention
let knownUsers = new Set();
let currentMentionMatch = null;

if (typeof marked !== 'undefined') marked.setOptions({ breaks: true });

const mentionStyle = document.createElement('style');
mentionStyle.innerHTML = `.mention { color: #0051c3; font-weight: bold; background: #e8f0fe; padding: 2px 4px; border-radius: 4px; cursor: pointer;} .mention:hover { background: #d2e3fc; }`;
document.head.appendChild(mentionStyle);

if (currentUser) showChat();

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}
function isValidUsername(user) { return /^[a-zA-Z0-9]+$/.test(user); }
function showNotification(msg, type = 'error') {
    notification.innerText = msg; notification.className = type === 'success' ? 'notify-success' : 'notify-error';
    notification.style.display = 'block'; clearTimeout(notifTimeout);
    notifTimeout = setTimeout(() => notification.style.display = 'none', 4000);
}

// --- LOGIKA MENTION AUTO-SUGGEST ---
chatTextarea.addEventListener('input', function(e) {
    this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; // Auto resize

    // Ambil posisi kursor dan cari teks sebelumnya
    const cursorPosition = this.selectionStart;
    const textBeforeCursor = this.value.substring(0, cursorPosition);
    
    // Deteksi jika mengetik @ (minimal 1 karakter setelah @)
    const match = textBeforeCursor.match(/@([a-zA-Z0-9]*)$/);

    if (match) {
        currentMentionMatch = match;
        const searchStr = match[1].toLowerCase();
        
        // Filter daftar user yang ada di chat
        const suggestions = Array.from(knownUsers).filter(u => u.toLowerCase().startsWith(searchStr));
        
        if (suggestions.length > 0) {
            mentionSuggestions.innerHTML = '';
            suggestions.forEach(user => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.innerText = '@' + user;
                div.onclick = function() {
                    // Jika user diklik, replace teks yang diketik dengan username penuh
                    const textAfterCursor = chatTextarea.value.substring(cursorPosition);
                    const newTextBefore = textBeforeCursor.substring(0, match.index) + '@' + user + ' ';
                    
                    chatTextarea.value = newTextBefore + textAfterCursor;
                    mentionSuggestions.style.display = 'none';
                    chatTextarea.focus();
                };
                mentionSuggestions.appendChild(div);
            });
            mentionSuggestions.style.display = 'block';
        } else {
            mentionSuggestions.style.display = 'none';
        }
    } else {
        mentionSuggestions.style.display = 'none';
        currentMentionMatch = null;
    }
});

// Hilangkan saran mention jika klik di luar
document.addEventListener('click', (e) => {
    if (!chatTextarea.contains(e.target) && !mentionSuggestions.contains(e.target)) {
        mentionSuggestions.style.display = 'none';
    }
});

// --- FUNGSI KLIK REPLY UNTUK SCROLL ---
window.scrollToMessage = function(msgId) {
    const targetElement = document.getElementById('msg-' + msgId);
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Tambahkan class animasi CSS
        targetElement.classList.add('highlight-msg');
        // Hapus class setelah animasi selesai agar bisa diklik lagi nanti
        setTimeout(() => targetElement.classList.remove('highlight-msg'), 2500);
    } else {
        alert("Pesan sudah terlalu lama atau mungkin telah dihapus.");
    }
}

// --- FUNGSI REPLY ---
function setReply(id, sender, content) {
    replyingToId = id;
    document.getElementById('reply-banner').style.display = 'flex';
    document.getElementById('reply-user').innerText = '@' + sender;
    let plainText = decodeURIComponent(content).replace(/[*_~`>#]/g, '').replace(/\n/g, ' ');
    if (plainText.length > 50) plainText = plainText.substring(0, 50) + '...';
    document.getElementById('reply-text').innerText = plainText;
    chatTextarea.focus();
}
window.cancelReply = function() {
    replyingToId = null; document.getElementById('reply-banner').style.display = 'none';
}

// --- AUTHENTICATION ---
document.getElementById('toggle-auth').addEventListener('click', () => { mode = mode === 'reset' ? 'login' : (mode === 'login' ? 'register' : 'login'); updateAuthUI(); });
document.getElementById('toggle-reset').addEventListener('click', () => { mode = 'reset'; updateAuthUI(); });
function updateAuthUI() {
    notification.style.display = 'none'; 
    const authTitle = document.getElementById('auth-title'), authBtn = document.getElementById('auth-btn'), valCode = document.getElementById('validation-code'), resetCode = document.getElementById('reset-code'), toggleAuth = document.getElementById('toggle-auth'), toggleReset = document.getElementById('toggle-reset'), pwdInput = document.getElementById('password'), usrInput = document.getElementById('username');
    if (mode === 'login') { authTitle.innerText = "Login ke Chat"; authBtn.innerText = "Masuk"; pwdInput.placeholder = "Password"; usrInput.placeholder = "Username"; valCode.style.display = 'none'; resetCode.style.display = 'none'; toggleAuth.innerText = "Belum punya akun? Daftar disini"; toggleAuth.style.display = 'inline-block'; toggleReset.style.display = 'inline-block'; } 
    else if (mode === 'register') { authTitle.innerText = "Daftar Akun Baru"; authBtn.innerText = "Daftar"; pwdInput.placeholder = "Buat Password Baru"; usrInput.placeholder = "Username (Hanya Huruf & Angka)"; valCode.style.display = 'block'; resetCode.style.display = 'none'; toggleAuth.innerText = "Sudah punya akun? Login disini"; toggleAuth.style.display = 'inline-block'; toggleReset.style.display = 'none'; } 
    else if (mode === 'reset') { authTitle.innerText = "Reset Password"; authBtn.innerText = "Simpan Password Baru"; pwdInput.placeholder = "Masukkan Password Baru"; usrInput.placeholder = "Username Akun Anda"; valCode.style.display = 'none'; resetCode.style.display = 'block'; toggleAuth.innerText = "Batal / Kembali ke Login"; toggleAuth.style.display = 'inline-block'; toggleReset.style.display = 'none'; }
}

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value, password = document.getElementById('password').value, authBtn = document.getElementById('auth-btn');
    if (mode === 'register' && !isValidUsername(username)) return showNotification("Gagal: Username hanya huruf dan angka!", "error");
    
    authBtn.innerText = "Tunggu..."; authBtn.disabled = true;
    let endpoint = '/api/auth/login', payload = { username, password };
    if (mode === 'register') { endpoint = '/api/auth/register'; payload.validationCode = document.getElementById('validation-code').value; } 
    else if (mode === 'reset') { endpoint = '/api/auth/reset-password'; payload.newPassword = password; payload.resetCode = document.getElementById('reset-code').value; }

    try {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (res.ok) {
            if (mode === 'login') { localStorage.setItem('username', data.username); currentUser = data.username; showChat(); } 
            else { showNotification(mode === 'reset' ? "Password direset!" : "Pendaftaran berhasil!", "success"); document.getElementById('password').value = ''; document.getElementById('validation-code').value = ''; document.getElementById('reset-code').value = ''; mode = 'login'; updateAuthUI(); }
        } else showNotification(data.error, "error");
    } catch (err) { showNotification("Kesalahan jaringan.", "error"); }
    authBtn.innerText = mode === 'login' ? "Masuk" : (mode === 'register' ? "Daftar" : "Simpan Password Baru"); authBtn.disabled = false;
});

function showChat() { 
    authContainer.style.display = 'none'; settingsContainer.style.display = 'none'; chatContainer.style.display = 'flex'; 
    userDisplay.innerText = currentUser; 
    
    // Minta izin Notifikasi Browser saat masuk chat
    if (Notification.permission === 'default') Notification.requestPermission();
    
    fetchMessages(true); 
    chatInterval = setInterval(() => fetchMessages(false), 3000); 
}
function openSettings() { clearInterval(chatInterval); chatContainer.style.display = 'none'; settingsContainer.style.display = 'block'; }
function closeSettings() { settingsContainer.style.display = 'none'; showChat(); }
function logout() { localStorage.removeItem('username'); location.reload(); }

document.getElementById('edit-username-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUsername = document.getElementById('new-username').value;
    if (!isValidUsername(newUsername)) return showNotification("Username baru hanya boleh huruf & angka!", "error");
    try {
        const res = await fetch('/api/auth/edit-username', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldUsername: currentUser, newUsername }) });
        if (res.ok) { showNotification("Username diubah!", "success"); currentUser = (await res.json()).username; localStorage.setItem('username', currentUser); userDisplay.innerText = currentUser; document.getElementById('new-username').value = ''; } 
        else showNotification((await res.json()).error, "error");
    } catch (err) { showNotification("Kesalahan jaringan.", "error"); }
});

document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser, oldPassword: document.getElementById('old-password').value, newPassword: document.getElementById('new-password').value }) });
        if (res.ok) { showNotification("Password diubah!", "success"); document.getElementById('old-password').value = ''; document.getElementById('new-password').value = ''; } 
        else showNotification((await res.json()).error, "error");
    } catch (err) { showNotification("Kesalahan jaringan.", "error"); }
});

async function deleteAccount() {
    if (confirm("Yakin hapus akun secara permanen?")) {
        try { const res = await fetch('/api/auth/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser }) }); if (res.ok) { alert("Akun terhapus."); logout(); } else showNotification("Gagal hapus akun.", "error"); } 
        catch (err) { showNotification("Kesalahan jaringan.", "error"); }
    }
}

document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { e.target.value = ''; return alert("Ukuran file maksimal 50MB!"); }
    
    uploadStatus.style.display = 'block';
    const formData = new FormData(); formData.append('file', file);
    
    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
            const mediaUrl = `/api/media/${data.filename}`;
            let mediaMarkup = '';
            if (file.type.startsWith('image/')) mediaMarkup = `\n![image](${mediaUrl})\n`;
            else if (file.type.startsWith('video/')) mediaMarkup = `\n<video controls preload="metadata"><source src="${mediaUrl}" type="${file.type}"></video>\n`;
            else if (file.type.startsWith('audio/')) mediaMarkup = `\n<audio controls><source src="${mediaUrl}" type="${file.type}"></audio>\n`;
            else mediaMarkup = `\n[Unduh / Tautan File: ${file.name}](${mediaUrl})\n`;
            
            chatTextarea.value += mediaMarkup; chatTextarea.dispatchEvent(new Event('input')); chatTextarea.focus();
        } else alert("Gagal upload: " + data.error);
    } catch (err) { alert("Terjadi kesalahan jaringan saat mengunggah."); }
    uploadStatus.style.display = 'none'; e.target.value = ''; 
});

chatTextarea.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('send-btn').click(); } });

// --- LOGIKA FETCH MESSAGE DENGAN NOTIFIKASI ---
async function fetchMessages(isInitialLoad = false) {
    try {
        const endpoint = isInitialLoad ? '/api/messages' : `/api/messages?lastId=${lastMessageId}`;
        const res = await fetch(endpoint);
        const messages = await res.json();
        
        if (messages.length === 0) return; 
        if (isInitialLoad) { chatBox.innerHTML = ''; messages.reverse(); }
        
        messages.forEach(msg => {
            // Tambahkan user ke daftar knownUsers untuk keperluan Auto-Suggest
            knownUsers.add(msg.sender);
            
            const time = new Date(msg.timestamp + 'Z').toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
            
            let rawHTML = marked.parse(msg.content);
            let safeMarkdownHTML = DOMPurify.sanitize(rawHTML, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'img', 'video', 'audio', 'source', 'span'], ALLOWED_ATTR: ['href', 'src', 'controls', 'type', 'preload', 'alt', 'class'] });
            safeMarkdownHTML = safeMarkdownHTML.replace(/@([a-zA-Z0-9]+)/g, '<span class="mention">@$1</span>');

            const div = document.createElement('div');
            div.className = 'message';
            div.id = 'msg-' + msg.id; // Berikan ID unik pada div pesan
            
            let replyHTML = '';
            if (msg.reply_to && msg.reply_sender) {
                let safeReplyContent = escapeHTML(msg.reply_content).replace(/<[^>]*>?/gm, ''); 
                if (safeReplyContent.length > 70) safeReplyContent = safeReplyContent.substring(0, 70) + '...';
                
                // Tambahkan event onclick memanggil fungsi scrollToMessage()
                replyHTML = `
                    <div class="reply-block" onclick="scrollToMessage(${msg.reply_to})" title="Klik untuk melihat pesan">
                        <strong>@${escapeHTML(msg.reply_sender)}</strong>: ${safeReplyContent}
                    </div>
                `;
            }
            
            const encodedContent = encodeURIComponent(msg.content);

            div.innerHTML = `
                <div style="margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
                    <div><strong>${escapeHTML(msg.sender)}</strong> <span class="meta">${time}</span></div>
                    <button class="btn-reply" data-id="${msg.id}" data-sender="${escapeHTML(msg.sender)}" data-content="${encodedContent}">Balas</button>
                </div>
                ${replyHTML}
                <div class="markdown-body">${safeMarkdownHTML}</div>
            `;
            chatBox.appendChild(div);
            
            // FITUR NOTIFIKASI
            // Jika bukan memuat awal, dan pesan ini bukan dari kita sendiri
            if (!isInitialLoad && msg.sender !== currentUser && msg.id > lastMessageId) {
                if (Notification.permission === 'granted') {
                    // Mencegah HTML tampil di notifikasi HP
                    let plainNotifMsg = msg.content.replace(/<[^>]*>?/gm, '');
                    new Notification("💬 Pesan baru dari " + msg.sender, { 
                        body: plainNotifMsg 
                    });
                }
            }

            if (msg.id > lastMessageId) lastMessageId = msg.id;
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) { console.error("Error loading chat"); }
}

chatBox.addEventListener('click', (e) => {
    if (e.target.classList.contains('mention')) {
        chatTextarea.value += e.target.innerText + ' '; 
        chatTextarea.dispatchEvent(new Event('input')); 
        chatTextarea.focus();
    }
    if (e.target.classList.contains('btn-reply')) {
        const id = e.target.getAttribute('data-id');
        const sender = e.target.getAttribute('data-sender');
        const content = e.target.getAttribute('data-content');
        setReply(id, sender, content);
    }
});

document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = chatTextarea.value.trim();
    if(!content) return;
    
    const sendReplyId = replyingToId;
    chatTextarea.value = '';
    chatTextarea.style.height = 'auto';
    window.cancelReply(); 
    
    await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser, content: content, reply_to: sendReplyId })
    });
    fetchMessages(false);
});