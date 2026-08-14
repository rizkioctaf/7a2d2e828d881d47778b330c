/**
 * File: api.js
 * API Wrapper untuk berinteraksi dengan Cloudflare Pages Functions
 */

const API_BASE = '/api';

export const StorageAPI = {
  /**
   * Mengambil list file dan folder berdasarkan prefix
   * @param {string} prefix - Direktori aktif (contoh: 'documents/')
   */
  async list(prefix = '') {
    const res = await fetch(`${API_BASE}/list?prefix=${encodeURIComponent(prefix)}`);
    if (!res.ok) throw new Error('Gagal mengambil daftar file');
    return res.json();
  },

  /**
   * Menghapus file atau folder
   * @param {string} key - R2 Object key
   */
  async delete(key) {
    const res = await fetch(`${API_BASE}/delete?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal menghapus item');
    return res.json();
  },

  /**
   * Membuat folder baru (virtual dummy)
   * @param {string} prefix - Path folder baru
   */
  async createFolder(prefix) {
    const res = await fetch(`${API_BASE}/folder?key=${encodeURIComponent(prefix)}`, { method: 'POST' });
    if (!res.ok) throw new Error('Gagal membuat folder');
    return res.json();
  },

  /**
   * Mendapatkan URL unduhan/preview
   */
  getFileUrl(key) {
    return `${API_BASE}/file?key=${encodeURIComponent(key)}`;
  },

  /**
   * Mengunggah file menggunakan XHR untuk melacak Progress (Chunked/Stream simulasi)
   * @param {File} file - Objek file native
   * @param {string} prefix - Path direktori tempat upload
   * @param {Function} onProgress - Callback(percentage, speedStr)
   * @returns {Promise} Resolves when done, rejects on fail. Returns XHR to allow abort.
   */
  uploadFile(file, prefix, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const key = `${prefix}${file.name}`;
      xhr.open('PUT', `${API_BASE}/upload?key=${encodeURIComponent(key)}`);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      
      let startTime = Date.now();
      let lastLoaded = 0;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          
          // Kalkulasi kecepatan
          const timeElapsed = (Date.now() - startTime) / 1000; // detik
          const bytesSinceLast = e.loaded - lastLoaded;
          const speedBps = bytesSinceLast / timeElapsed;
          
          let speedStr = speedBps > 1048576 
            ? `${(speedBps / 1048576).toFixed(1)} MB/s` 
            : `${(speedBps / 1024).toFixed(1)} KB/s`;
            
          startTime = Date.now();
          lastLoaded = e.loaded;
          
          onProgress(percent, speedStr);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.response));
        else reject(new Error('Upload gagal'));
      };
      
      xhr.onerror = () => reject(new Error('Kesalahan jaringan'));
      xhr.send(file);
    });
  }
};