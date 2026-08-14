/**
 * File: preview.js
 * Mengelola tampilan modal untuk preview gambar, pdf, video, dll.
 */
import { StorageAPI } from './api.js';

const modal = document.getElementById('preview-modal');
const container = document.getElementById('preview-container');
const title = document.getElementById('preview-title');

const closeBtn = document.getElementById('btn-close-preview');
const downloadBtn = document.getElementById('btn-download-preview');
const shareBtn = document.getElementById('btn-share');

let currentFileKey = null;

export const PreviewManager = {
  init() {
    closeBtn.addEventListener('click', this.close);
    downloadBtn.addEventListener('click', () => {
      if(currentFileKey) window.open(StorageAPI.getFileUrl(currentFileKey), '_blank');
    });
    
    // Fitur berbagi link dasar (Shareable link = URL file)
    shareBtn.addEventListener('click', async () => {
      const url = window.location.origin + StorageAPI.getFileUrl(currentFileKey);
      await navigator.clipboard.writeText(url);
      alert('Tautan berbagi telah disalin ke clipboard!');
    });
  },

  open(fileKey, fileName) {
    currentFileKey = fileKey;
    title.textContent = fileName;
    container.innerHTML = '<div class="loader">Memuat...</div>';
    modal.classList.remove('hidden');

    const fileUrl = StorageAPI.getFileUrl(fileKey);
    const ext = fileName.split('.').pop().toLowerCase();

    // Route format render
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      container.innerHTML = `<img src="${fileUrl}" alt="${fileName}">`;
    } 
    else if (['mp4', 'webm'].includes(ext)) {
      container.innerHTML = `<video controls autoplay style="max-width:100%; max-height:100%;"><source src="${fileUrl}" type="video/${ext}"></video>`;
    }
    else if (['mp3', 'wav', 'ogg'].includes(ext)) {
      container.innerHTML = `<audio controls autoplay><source src="${fileUrl}" type="audio/${ext}"></audio>`;
    }
    else if (ext === 'pdf') {
      container.innerHTML = `<iframe src="${fileUrl}#toolbar=0"></iframe>`;
    }
    else {
      // Teks atau File tidak didukung preview visualnya
      container.innerHTML = `
        <div style="text-align:center; color: var(--text-main);">
          <span class="material-icons-outlined" style="font-size: 64px;">insert_drive_file</span>
          <p>Pratinjau tidak tersedia untuk format ini.</p>
          <button onclick="window.open('${fileUrl}')" class="btn-new" style="margin: 20px auto;">Unduh Berkas</button>
        </div>
      `;
    }
  },

  close() {
    modal.classList.add('hidden');
    container.innerHTML = '';
    currentFileKey = null;
  }
};