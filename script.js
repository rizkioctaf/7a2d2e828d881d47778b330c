const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const settingsContainer = document.getElementById('settings-container');
const userDisplay = document.getElementById('user-display');
const chatBox = document.getElementById('chat-box');
const notification = document.getElementById('notification');

let mode = 'login'; 
let currentUser = localStorage.getItem('username');
let chatInterval;
let notifTimeout;

marked.setOptions({ breaks: true });

if (currentUser) showChat();

function showNotification(message, type = 'error') {
    notification.innerText = message;
    notification.className = type === 'success' ? 'notify-success' : 'notify-error';
    notification.style.display = 'block';
    clearTimeout(notifTimeout);
    notifTimeout = setTimeout(() => notification.style.display = 'none', 4000);
}

function isValidUsername(username) {
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    return alphanumericRegex.test(username);
}

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, function(tag) {
        const chars = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return chars[tag] || tag;
    });
}

function generateAvatarSVG(username) {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorBg = `hsl(${Math.abs(hash) % 360}, 60%, 65%)`;
    const colorCircle = `hsl(${Math.abs(hash * 2) % 360}, 70%, 40%)`;
    const initial = username.charAt(0).toUpperCase();

    // Karena CSS menerapkan filter Hijau/Monokrom, warna aslinya akan di-override
    return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="100%" height="100%">
            <rect width="40" height="40" fill="${colorBg}" />
            <text x="50%" y="50%" text-anchor="middle" dy=".35em" font-size="24" font-family="'Courier New', monospace" font-weight="bold" fill="#000">${initial}</text>
        </svg>
    `;
}

function formatWaktuWIB(timestampUTC) {
    const date = new Date(timestampUTC + 'Z'); 
    return date.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }) + ' WIB';
}

document.getElementById('toggle-auth').addEventListener('click', () => {
    if (mode === 'reset') mode = 'login';
    else mode = mode === 'login' ? 'register' : 'login';
    updateAuthUI();
});

document.getElementById('toggle-reset').addEventListener('click', () => {
    mode = 'reset';
    updateAuthUI();
});

function updateAuthUI() {
    notification.style.display = 'none';
    const authTitle = document.getElementById('auth-title');
    const authBtn = document.getElementById('auth-btn');
    const valCode = document.getElementById('validation-code');
    const resetCode = document.getElementById('reset-code');
    const toggleAuth = document.getElementById('toggle-auth');
    const toggleReset = document.getElementById('toggle-reset');
    
    if (mode === 'login') {
        authTitle.innerText = "/*** LOGIN ***/"; authBtn.innerText = "EXECUTE";
        valCode.style.display = 'none'; resetCode.style.display = 'none';
        toggleAuth.innerText = "[Daftar Akun Baru]";
        toggleAuth.style.display = 'inline-block'; toggleReset.style.display = 'inline-block';
    } else if (mode === 'register') {
        authTitle.innerText = "/*** REGISTER ***/"; authBtn.innerText = "CREATE";
        valCode.style.display = 'block'; resetCode.style.display = 'none';
        toggleAuth.innerText = "[Sudah Punya Akun? Login]";
        toggleAuth.style.display = 'inline-block'; toggleReset.style.display = 'none';
    } else if (mode === 'reset') {
        authTitle.innerText = "/*** SYSTEM RESET ***/"; authBtn.innerText = "OVERRIDE PWD";
        valCode.style.display = 'none'; resetCode.style.display = 'block';
        toggleAuth.innerText = "[Abort / Return to Login]";
        toggleAuth.style.display = 'inline-block'; toggleReset.style.display = 'none';
    }
}

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (mode === 'register' && !isValidUsername(username)) {
        return showNotification("SYS_ERR: Username hanya boleh huruf dan angka!", "error");
    }

    document.getElementById('auth-btn').disabled = true;
    let endpoint = mode === 'login' ? '/api/auth/login' : (mode === 'register' ? '/api/auth/register' : '/api/auth/reset-password');
    let payload = { username, password };
    if (mode === 'register') payload.validationCode = document.getElementById('validation-code').value;
    if (mode === 'reset') { payload.newPassword = password; payload.resetCode = document.getElementById('reset-code').value; }

    try {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        
        if (res.ok) {
            if (mode === 'login') {
                localStorage.setItem('username', data.username);
                currentUser = data.username;
                showChat();
            } else {
                showNotification(mode === 'reset' ? "SYS_MSG: Password direset!" : "SYS_MSG: Pendaftaran berhasil!", "success");
                document.getElementById('password').value = ''; mode = 'login'; updateAuthUI();
            }
        } else showNotification("SYS_ERR: " + data.error, "error");
    } catch (err) { showNotification("SYS_ERR: Kesalahan jaringan.", "error"); }
    document.getElementById('auth-btn').disabled = false;
});

function showChat() {
    authContainer.style.display = 'none'; settingsContainer.style.display = 'none';
    chatContainer.style.display = 'block';
    userDisplay.innerText = currentUser;
    fetchMessages();
    chatInterval = setInterval(fetchMessages, 3000);
}

function openSettings() { clearInterval(chatInterval); chatContainer.style.display = 'none'; settingsContainer.style.display = 'block'; }
function closeSettings() { settingsContainer.style.display = 'none'; showChat(); }
function logout() { localStorage.removeItem('username'); location.reload(); }

document.getElementById('edit-username-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUsername = document.getElementById('new-username').value;
    if (!isValidUsername(newUsername)) return showNotification("SYS_ERR: Username hanya boleh huruf dan angka!", "error");

    try {
        const res = await fetch('/api/auth/edit-username', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldUsername: currentUser, newUsername }) });
        const data = await res.json();
        if (res.ok) {
            showNotification("SYS_MSG: Username diubah!", "success");
            currentUser = data.username; localStorage.setItem('username', currentUser); userDisplay.innerText = currentUser;
        } else showNotification("SYS_ERR: " + data.error, "error");
    } catch (err) { showNotification("SYS_ERR: Kesalahan jaringan.", "error"); }
});

document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const res = await fetch('/api/auth/change-password', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, oldPassword: document.getElementById('old-password').value, newPassword: document.getElementById('new-password').value })
        });
        const data = await res.json();
        if (res.ok) showNotification("SYS_MSG: Password diubah!", "success"); else showNotification("SYS_ERR: " + data.error, "error");
    } catch (err) { showNotification("SYS_ERR: Kesalahan jaringan.", "error"); }
});

async function deleteAccount() {
    if (confirm("CRITICAL WARNING: Yakin hapus akun permanen?")) {
        const res = await fetch('/api/auth/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser }) });
        if (res.ok) logout(); else showNotification("SYS_ERR: Gagal hapus akun.", "error");
    }
}

async function fetchMessages() {
    try {
        const res = await fetch('/api/messages');
        const messages = await res.json();
        chatBox.innerHTML = '';
        
        messages.reverse().forEach(msg => {
            const div = document.createElement('div');
            div.className = 'message-wrapper';
            
            const avatarSVG = generateAvatarSVG(msg.sender);
            const formattedTime = formatWaktuWIB(msg.timestamp);
            const safeSender = escapeHTML(msg.sender);
            
            const rawHTML = marked.parse(msg.content);
            const safeMarkdownHTML = DOMPurify.sanitize(rawHTML);

            // Di dalam fetchMessages() -> bagian .forEach
            div.innerHTML = `
                <div class="avatar">${avatarSVG}</div>
                <div class="message-content">
                    <div>
                        <span class="meta">${formattedTime}</span> 
                        <span class="username">&lt;${safeSender}&gt;</span>
                    </div>
                    <div class="markdown-body">${safeMarkdownHTML}</div>
                </div>
            `;
            chatBox.appendChild(div);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) { console.error("Error loading chat"); }
}

const chatTextarea = document.getElementById('content');
chatTextarea.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); 
        document.getElementById('send-btn').click(); 
    }
});

document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = chatTextarea.value.trim();
    if(!content) return;
    
    chatTextarea.value = '';
    
    await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser, content })
    });
    fetchMessages();
});