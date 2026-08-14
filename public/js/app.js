/**
 * File: app.js
 * Main Controller untuk UI Cloud Storage
 */
import { StorageAPI } from './api.js';
import { PreviewManager } from './preview.js';

// Application State
const State = {
  currentPath: '',
  files: [],
  folders: [],
  selectedKeys: new Set(),
  viewMode: 'grid' // 'grid' atau 'list'
};

// DOM Elements
const gridContainer = document.getElementById('file-list-container');
const breadcrumbsDiv = document.getElementById('breadcrumbs');
const searchInput = document.getElementById('search-input');
const contextActions = document.getElementById('context-actions');
const uploadManager = document.getElementById('upload-manager');
const uploadList = document.getElementById('upload-list');
const dropOverlay = document.getElementById('drop-overlay');

/**
 * Inisialisasi Aplikasi
 */
async function initApp() {
  PreviewManager.init();
  setupEventListeners();
  setupDragAndDrop();
  
  // Deteksi tema sistem
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  await loadCurrentDirectory();
}

/**
 * Event Listeners Konfigurasi Utama
 */
function setupEventListeners() {
  document.getElementById('btn-theme').addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.getAttribute('data-theme') === 'dark';
    root.setAttribute('data-theme', isDark ? 'light' : 'dark');
  });

  document.getElementById('btn-toggle-view').addEventListener('click', () => {
    State.viewMode = State.viewMode === 'grid' ? 'list' : 'grid';
    gridContainer.className = State.viewMode === 'grid' ? 'file-grid' : 'file-list';
    document.getElementById('btn-toggle-view').innerHTML = 
      `<span class="material-icons-outlined">${State.viewMode === 'grid' ? 'grid_view' : 'view_list'}</span>`;
    renderFiles();
  });

  document.getElementById('btn-new').addEventListener('click', async () => {
    const folderName = prompt('Nama Folder Baru:');
    if (folderName) {
      const fullPath = `${State.currentPath}${folderName}/`;
      await StorageAPI.createFolder(fullPath);
      loadCurrentDirectory();
    }
  });

  document.getElementById('btn-bulk-delete').addEventListener('click', async () => {
    if (confirm(`Hapus ${State.selectedKeys.size} item?`)) {
      for (const key of State.selectedKeys) {
        await StorageAPI.delete(key);
      }
      State.selectedKeys.clear();
      updateContextToolbar();
      loadCurrentDirectory();
    }
  });

  // Debounce search input
  let timeout = null;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      renderFiles(e.target.value.toLowerCase());
    }, 300);
  });

  document.getElementById('btn-close-uploads').addEventListener('click', () => {
    uploadManager.classList.add('hidden');
    uploadList.innerHTML = '';
  });
}

/**
 * Konfigurasi Drag and Drop untuk Upload (Mendukung Folder & File)
 */
function setupDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  dropZone.addEventListener('dragenter', () => dropOverlay.classList.remove('hidden'));
  dropZone.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null || e.relatedTarget.nodeName === "HTML") {
      dropOverlay.classList.add('hidden');
    }
  });

  dropZone.addEventListener('drop', async (e) => {
    dropOverlay.classList.add('hidden');
    const items = e.dataTransfer.items;
    if (!items) return;

    uploadManager.classList.remove('hidden');
    
    // WebkitGetAsEntry support for folder recursion
    const uploadTasks = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) traverseFileTree(item, State.currentPath, uploadTasks);
    }
  });
}

/**
 * Rekursi untuk membaca file dalam folder yang di-drop
 */
function traverseFileTree(item, path, uploadTasks) {
  if (item.isFile) {
    item.file((file) => {
      handleFileUpload(file, path);
    });
  } else if (item.isDirectory) {
    const dirReader = item.createReader();
    // Simulate folder creation internally if needed, then traverse content
    dirReader.readEntries((entries) => {
      entries.forEach((entry) => traverseFileTree(entry, path + item.name + "/", uploadTasks));
    });
  }
}

/**
 * Proses unggah satu file
 */
function handleFileUpload(file, uploadPath) {
  const fileId = 'up-' + Math.random().toString(36).substr(2, 9);
  
  // Buat UI Progress
  const div = document.createElement('div');
  div.className = 'upload-item';
  div.innerHTML = `
    <div class="up-info">
      <span>${file.name}</span>
      <span id="${fileId}-speed">0%</span>
    </div>
    <div class="up-progress"><div class="up-fill" id="${fileId}-fill"></div></div>
  `;
  uploadList.appendChild(div);

  const fill = document.getElementById(`${fileId}-fill`);
  const speed = document.getElementById(`${fileId}-speed`);

  StorageAPI.uploadFile(file, uploadPath, (percent, speedStr) => {
    fill.style.width = percent + '%';
    speed.textContent = `${percent}% - ${speedStr}`;
  }).then(() => {
    speed.textContent = 'Selesai';
    fill.style.background = '#0f9d58'; // Sukses (Hijau)
    loadCurrentDirectory(); // Refresh background silently
  }).catch(err => {
    speed.textContent = 'Gagal';
    fill.style.background = 'var(--danger)';
  });
}

/**
 * Load List Data dari API
 */
async function loadCurrentDirectory() {
  try {
    const data = await StorageAPI.list(State.currentPath);
    State.folders = data.folders || [];
    
    // Filter dummy file '.keep' dan render metadata valid
    State.files = (data.files || []).filter(f => !f.key.endsWith('.keep'));
    
    // Update Quota Visual
    const maxQuota = 10 * 1024 * 1024 * 1024; // 10 GB dalam bytes
    const pct = (data.usage / maxQuota) * 100;
    document.getElementById('storage-used').textContent = formatBytes(data.usage);
    document.getElementById('storage-fill').style.width = Math.min(pct, 100) + '%';

    renderBreadcrumbs();
    renderFiles();
    State.selectedKeys.clear();
    updateContextToolbar();
  } catch (error) {
    console.error(error);
    alert('Gagal memuat direktori');
  }
}

/**
 * Merender daftar File dan Folder ke layar
 */
function renderFiles(searchQuery = '') {
  gridContainer.innerHTML = '';
  
  // Merge, render folder dulu
  let displayFolders = State.folders.filter(f => f.toLowerCase().includes(searchQuery));
  let displayFiles = State.files.filter(f => {
    const fileName = f.key.replace(State.currentPath, '');
    return fileName.toLowerCase().includes(searchQuery);
  });

  // Render Folders
  displayFolders.forEach(folderPath => {
    // Extract folder name based on prefix
    const folderName = folderPath.slice(State.currentPath.length, -1);
    const div = createItemCard(folderName, 'folder', folderPath, true);
    gridContainer.appendChild(div);
  });

  // Render Files
  displayFiles.forEach(f => {
    const fileName = f.key.replace(State.currentPath, '');
    const isImage = /\.(jpe?g|png|gif|svg|webp)$/i.test(fileName);
    const isVid = /\.(mp4|webm)$/i.test(fileName);
    const iconType = isImage ? 'image' : (isVid ? 'movie' : 'insert_drive_file');
    
    const div = createItemCard(fileName, iconType, f.key, false, f.size);
    gridContainer.appendChild(div);
  });
}

/**
 * Factory Card Element & Multi-select Logic
 */
function createItemCard(name, icon, key, isFolder, size = 0) {
  const el = document.createElement('div');
  el.className = 'item-card';
  el.dataset.key = key;
  
  el.innerHTML = `
    <span class="material-icons-outlined item-icon ${icon === 'folder' ? 'folder' : (icon === 'image' ? 'image' : '')}">${icon}</span>
    <span class="item-name" title="${name}">${name}</span>
  `;

  // Click handler (Multi-select via Ctrl/Cmd)
  el.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (State.selectedKeys.has(key)) {
        State.selectedKeys.delete(key);
        el.classList.remove('selected');
      } else {
        State.selectedKeys.add(key);
        el.classList.add('selected');
      }
    } else {
      // Clear seleksi sebelumnya
      document.querySelectorAll('.item-card').forEach(n => n.classList.remove('selected'));
      State.selectedKeys.clear();
      State.selectedKeys.add(key);
      el.classList.add('selected');
    }
    updateContextToolbar();
  });

  // Double click (Open Folder / Preview File)
  el.addEventListener('dblclick', () => {
    if (isFolder) {
      State.currentPath = key;
      loadCurrentDirectory();
    } else {
      PreviewManager.open(key, name);
    }
  });

  return el;
}

/**
 * Mengelola Toolbar Aksi Batch
 */
function updateContextToolbar() {
  if (State.selectedKeys.size > 0) {
    contextActions.classList.remove('hidden');
  } else {
    contextActions.classList.add('hidden');
  }
}

/**
 * Navigasi Breadcrumbs
 */
function renderBreadcrumbs() {
  breadcrumbsDiv.innerHTML = '<span data-path="" class="crumb">File Saya</span>';
  
  if (State.currentPath) {
    const parts = State.currentPath.split('/').filter(p => p);
    let accumPath = '';
    parts.forEach(part => {
      accumPath += part + '/';
      const crumb = document.createElement('span');
      crumb.className = 'crumb';
      crumb.dataset.path = accumPath;
      crumb.textContent = part;
      breadcrumbsDiv.appendChild(crumb);
    });
  }

  // Bind click untuk navigasi
  breadcrumbsDiv.querySelectorAll('.crumb').forEach(el => {
    el.addEventListener('click', () => {
      State.currentPath = el.dataset.path;
      loadCurrentDirectory();
    });
  });
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024, dm = 2, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Start
document.addEventListener('DOMContentLoaded', initApp);