// script.js

const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const settingsContainer = document.getElementById('settings-container');
const userDisplay = document.getElementById('user-display');
const chatBox = document.getElementById('chat-box');

// Mode: 'login', 'register', atau 'reset'
let mode = 'login'; 
let currentUser = localStorage.getItem('username');
let chatInterval;

// Cek login saat halaman dimuat
if (currentUser) showChat();

// --- NAVIGATION & UI TOGGLES ---
document.getElementById('toggle-auth').addEventListener('click', () => {
    mode = mode === 'login' ? 'register' : 'login';
    updateAuthUI();
});

document.getElementById('toggle-reset').addEventListener('click', () => {
    mode = 'reset';
    updateAuthUI();
});

function updateAuthUI() {
    const authTitle = document.getElementById('auth-title');
    const authBtn = document.getElementById('auth-btn');
    const valCode = document.getElementById('validation-code');
    const resetCode = document.getElementById('reset-code');
    
    if (mode === 'login') {
        authTitle.innerText = "Login ke Chat";
        authBtn.innerText = "Masuk";
        valCode.style.display = 'none';
        resetCode.style.display = 'none';
        document.getElementById('toggle-auth').innerText = "Belum punya akun? Daftar disini";
        document.getElementById('toggle-auth').style.display = 'inline-block';
        document.getElementById('toggle-reset').style.display = 'inline-block';
    } else if (mode === 'register') {
        authTitle.innerText = "Daftar Akun Baru";
        authBtn.innerText = "Daftar";
        valCode.style.display = 'block';
        resetCode.style.display = 'none';
        document.getElementById('toggle-auth').innerText = "Sudah punya akun? Login disini";
        document.getElementById('toggle-reset').style.display = 'none';
    } else if (mode === 'reset') {
        authTitle.innerText = "Reset Password";
        authBtn.innerText = "Simpan Password Baru";
        valCode.style.display = 'none';
        resetCode.style.display = 'block';
        document.getElementById('toggle-auth').style.display = 'none';
        document.getElementById('toggle-reset').style.display = 'none';
    }
}

// --- AUTH: Login, Register, & Reset ---
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const valCode = document.getElementById('validation-code').value;
    const resCode = document.getElementById('reset-code').value;
    const authBtn = document.getElementById('auth-btn');
    
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
                showChat();
            } else {
                alert(mode === 'reset' ? "Password berhasil direset!" : "Pendaftaran berhasil!");
                location.reload(); // Refresh untuk kembali ke mode login
            }
        } else {
            alert("Error: " + data.error);
        }
    } catch (err) { alert("Kesalahan jaringan."); }

    authBtn.innerText = mode === 'register' ? "Daftar" : "Masuk"; 
    authBtn.disabled = false;
});

// --- NAVIGATION FUNCTIONS ---
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

// --- ACCOUNT SETTINGS ACTIONS ---
document.getElementById('edit-username-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUsername = document.getElementById('new-username').value;
    const res = await fetch('/api/auth/edit-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldUsername: currentUser, newUsername })
    });
    const data = await res.json();
    if (res.ok) {
        alert("Username diubah!");
        currentUser = data.username;
        localStorage.setItem('username', currentUser);
        userDisplay.innerText = currentUser;
        document.getElementById('new-username').value = '';
    } else alert("Gagal: " + data.error);
});

document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
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
        alert("Password berhasil diubah!");
        document.getElementById('old-password').value = '';
        document.getElementById('new-password').value = '';
    } else alert("Gagal.");
});

async function deleteAccount() {
    if (confirm("Yakin hapus akun permanen? Semua data pesan Anda akan tetap ada, tapi akun akan hilang.")) {
        const res = await fetch('/api/auth/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser })
        });
        if (res.ok) { alert("Akun terhapus!"); logout(); } else alert("Gagal.");
    }
}

// --- CHAT LOGIC ---
async function fetchMessages() {
    try {
        const res = await fetch('/api/messages');
        const messages = await res.json();
        chatBox.innerHTML = '';
        messages.reverse().forEach(msg => {
            const div = document.createElement('div');
            div.className = 'message';
            div.innerHTML = `<strong>${msg.sender}</strong><br><span>${msg.content}</span>`;
            chatBox.appendChild(div);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) { console.error("Error loading chat"); }
}

document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('content').value;
    if(!content) return;
    document.getElementById('content').value = '';
    await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser, content })
    });
    fetchMessages();
});