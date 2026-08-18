// script.js

const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const settingsContainer = document.getElementById('settings-container');
const userDisplay = document.getElementById('user-display');
const chatBox = document.getElementById('chat-box');

let isLoginMode = true;
let currentUser = localStorage.getItem('username');
let chatInterval;

// Cek login saat pertama kali load
if (currentUser) showChat();

// --- AUTH: Toggle Mode ---
document.getElementById('toggle-auth').addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "Login ke Chat" : "Daftar Akun Baru";
    document.getElementById('auth-btn').innerText = isLoginMode ? "Masuk" : "Daftar";
    document.getElementById('toggle-auth').innerText = isLoginMode ? "Belum punya akun? Daftar disini" : "Sudah punya akun? Login disini";
    
    document.getElementById('validation-code').style.display = isLoginMode ? 'none' : 'block';
    document.getElementById('validation-code').required = !isLoginMode;
});

// --- AUTH: Login & Register ---
document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const validationCode = document.getElementById('validation-code').value;
    const authBtn = document.getElementById('auth-btn');
    
    authBtn.innerText = "Tunggu..."; authBtn.disabled = true;

    const payload = { username, password };
    if (!isLoginMode) payload.validationCode = validationCode;

    try {
        const res = await fetch(isLoginMode ? '/api/auth/login' : '/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
            if (isLoginMode) {
                localStorage.setItem('username', data.username);
                currentUser = data.username;
                showChat();
            } else {
                alert("Pendaftaran berhasil! Silakan login.");
                document.getElementById('toggle-auth').click();
                document.getElementById('password').value = '';
            }
        } else alert("Error: " + data.error);
    } catch (err) { alert("Kesalahan jaringan."); }

    authBtn.innerText = isLoginMode ? "Masuk" : "Daftar"; authBtn.disabled = false;
});

// --- NAVIGATION & SETTINGS ---
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
    currentUser = null;
    clearInterval(chatInterval);
    chatContainer.style.display = 'none';
    settingsContainer.style.display = 'none';
    authContainer.style.display = 'block';
}

// --- API ACTIONS ---
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
    const data = await res.json();
    if (res.ok) alert("Password berhasil diubah!"); else alert("Gagal: " + data.error);
});

async function deleteAccount() {
    if (confirm("Yakin hapus akun permanen?")) {
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
}

document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: currentUser, content: document.getElementById('content').value })
    });
    document.getElementById('content').value = '';
    fetchMessages();
});