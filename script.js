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

if (currentUser) showChat();

// --- FUNGSI KEAMANAN & UTILITAS ---
// Mencegah Serangan XSS pada Pesan
function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, function(tag) {
        const charsToReplace = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return charsToReplace[tag] || tag;
    });
}

// Memastikan Username hanya Huruf dan Angka (Alfanumerik)
function isValidUsername(username) {
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    return alphanumericRegex.test(username);
}

// --- FUNGSI NOTIFIKASI IN-PAGE ---
function showNotification(message, type = 'error') {
    notification.innerText = message;
    notification.className = type === 'success' ? 'notify-success' : 'notify-error';
    notification.style.display = 'block';
    clearTimeout(notifTimeout);
    notifTimeout = setTimeout(() => notification.style.display = 'none', 4000);
}

// --- NAVIGATION & UI TOGGLES (AUTH) ---
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
    const passwordInput = document.getElementById('password');
    const usernameInput = document.getElementById('username');
    
    if (mode === 'login') {
        authTitle.innerText = "Login ke Chat";
        authBtn.innerText = "Masuk";
        passwordInput.placeholder = "Password";
        usernameInput.placeholder = "Username";
        
        valCode.style.display = 'none';
        resetCode.style.display = 'none';
        toggleAuth.innerText = "Belum punya akun? Daftar disini";
        toggleAuth.style.display = 'inline-block';
        toggleReset.style.display = 'inline-block';
    } else if (mode === 'register') {
        authTitle.innerText = "Daftar Akun Baru";
        authBtn.innerText = "Daftar";
        passwordInput.placeholder = "Buat Password Baru";
        usernameInput.placeholder = "Username (Hanya Huruf & Angka)";
        
        valCode.style.display = 'block';
        resetCode.style.display = 'none';
        toggleAuth.innerText = "Sudah punya akun? Login disini";
        toggleAuth.style.display = 'inline-block';
        toggleReset.style.display = 'none';
    } else if (mode === 'reset') {
        authTitle.innerText = "Reset Password";
        authBtn.innerText = "Simpan Password Baru";
        passwordInput.placeholder = "Masukkan Password Baru";
        usernameInput.placeholder = "Username Akun Anda";
        
        valCode.style.display = 'none';
        resetCode.style.display = 'block';
        toggleAuth.innerText = "Batal / Kembali ke Login";
        toggleAuth.style.display = 'inline-block';
        toggleReset.style.display = 'none';
    }
}

// --- PROSES SUBMIT AUTH (Login, Register, & Reset) ---
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const valCode = document.getElementById('validation-code').value;
    const resCode = document.getElementById('reset-code').value;
    const authBtn = document.getElementById('auth-btn');
    
    if (mode === 'register' && !isValidUsername(username)) {
        showNotification("Gagal: Username hanya boleh berisi huruf dan angka (tanpa spasi/simbol)!", "error");
        return;
    }

    authBtn.innerText = "Tunggu..."; 
    authBtn.disabled = true;

    let endpoint = '/api/auth/login';
    let payload = { username, password };

    if (mode === 'register') {
        endpoint = '/api/auth/register';
        payload.validationCode = valCode;
    } else if (mode === 'reset') {
        endpoint = '/api/auth/reset-password';
        payload.newPassword = password;
        payload.resetCode = resCode;
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
                notification.style.display = 'none';
                showChat();
            } else {
                showNotification(mode === 'reset' ? "Password berhasil direset! Silakan Login." : "Pendaftaran berhasil! Silakan Login.", "success");
                document.getElementById('password').value = '';
                document.getElementById('reset-code').value = '';
                document.getElementById('validation-code').value = '';
                mode = 'login';
                updateAuthUI();
            }
        } else {
            showNotification("Error: " + data.error, "error");
        }
    } catch (err) { showNotification("Terjadi kesalahan jaringan.", "error"); }

    if(mode === 'login') authBtn.innerText = "Masuk";
    else if(mode === 'register') authBtn.innerText = "Daftar";
    else authBtn.innerText = "Simpan Password Baru";
    
    authBtn.disabled = false;
});

// --- NAVIGASI HALAMAN (Chat & Pengaturan) ---
function showChat() {
    authContainer.style.display = 'none';
    settingsContainer.style.display = 'none';
    chatContainer.style.display = 'block';
    userDisplay.innerText = currentUser;
    fetchMessages();
    chatInterval = setInterval(fetchMessages, 3000);
}

function openSettings() {
    clearInterval(chatInterval);
    notification.style.display = 'none';
    chatContainer.style.display = 'none';
    settingsContainer.style.display = 'block';
}

function closeSettings() {
    notification.style.display = 'none';
    settingsContainer.style.display = 'none';
    showChat();
}

function logout() {
    localStorage.removeItem('username');
    location.reload();
}

// --- AKSI PENGATURAN AKUN ---
document.getElementById('edit-username-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUsername = document.getElementById('new-username').value;
    
    if (!isValidUsername(newUsername)) {
        showNotification("Gagal: Username baru hanya boleh berisi huruf dan angka (tanpa spasi)!", "error");
        return;
    }

    try {
        const res = await fetch('/api/auth/edit-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldUsername: currentUser, newUsername })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification("Username berhasil diubah!", "success");
            currentUser = data.username;
            localStorage.setItem('username', currentUser);
            userDisplay.innerText = currentUser;
            document.getElementById('new-username').value = '';
        } else showNotification("Gagal: " + data.error, "error");
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
        const data = await res.json();
        if (res.ok) {
            showNotification("Password berhasil diubah!", "success");
            document.getElementById('old-password').value = '';
            document.getElementById('new-password').value = '';
        } else showNotification("Gagal: " + data.error, "error");
    } catch (err) { showNotification("Kesalahan jaringan.", "error"); }
});

// TETAP MENGGUNAKAN POP-UP BAWAAN UNTUK TINDAKAN DESTRUKTIF (Hapus Akun)
async function deleteAccount() {
    if (confirm("PERINGATAN: Yakin hapus akun secara permanen? Semua data pesan Anda akan tetap ada, tapi akun akan hilang selamanya.")) {
        try {
            const res = await fetch('/api/auth/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser })
            });
            if (res.ok) { 
                alert("Akun terhapus secara permanen."); 
                logout(); 
            } else showNotification("Gagal menghapus akun.", "error");
        } catch (err) { showNotification("Kesalahan jaringan.", "error"); }
    }
}

// --- LOGIKA UTAMA CHAT ---
async function fetchMessages() {
    try {
        const res = await fetch('/api/messages');
        const messages = await res.json();
        chatBox.innerHTML = '';
        
        messages.reverse().forEach(msg => {
            // Waktu lengkap menggunakan Zona Waktu WIB
            const time = new Date(msg.timestamp + 'Z').toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }) + ' WIB';
            
            const div = document.createElement('div');
            div.className = 'message';
            
            // Format render aman dari XSS, dan tanpa ikon avatar
            div.innerHTML = `
                <strong>${escapeHTML(msg.sender)}</strong>
                <span class="meta">${time}</span><br>
                <span style="display: inline-block; margin-top: 4px;">${escapeHTML(msg.content)}</span>
            `;
            chatBox.appendChild(div);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) { console.error("Error loading chat"); }
}

// Event saat kirim pesan
document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const contentInput = document.getElementById('content');
    const content = contentInput.value.trim();
    if(!content) return;
    
    // Langsung kosongkan kolom input agar user merasa responsif
    contentInput.value = '';
    
    await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser, content })
    });
    fetchMessages();
});