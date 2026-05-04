// ========================
// IT Documents App
// ========================

// Google Drive API URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyRip7u4NQx0iRUf1wRsIzFPhBVqEiFtDjiev9PMxlCYCLf6VW0DbHfzPHyH19dkuyQvA/exec';

// ========================
// AUTHENTICATION CHECK
// ========================

(function checkAuthentication() {
  const user = localStorage.getItem('itdocs_user');
  const sessionExpiry = localStorage.getItem('itdocs_session_expiry');
  
  if (!user || !sessionExpiry) {
    window.location.href = 'login.html';
    return;
  }
  
  const now = new Date().getTime();
  if (now >= parseInt(sessionExpiry)) {
    localStorage.removeItem('itdocs_user');
    localStorage.removeItem('itdocs_session_expiry');
    window.location.href = 'login.html';
    return;
  }
  
  console.log('✅ Authenticated');
})();

// Display user info in header
function displayUserInfo() {
  const userData = JSON.parse(localStorage.getItem('itdocs_user') || '{}');
  if (userData.name) {
    const headerActions = document.querySelector('.header-actions');
    if (headerActions) {
      const userBadge = document.createElement('div');
      userBadge.className = 'user-badge';
      userBadge.innerHTML = `
        <span class="user-avatar">${userData.avatar || '👤'}</span>
        <span class="user-name">${userData.name}</span>
        <button class="logout-btn" onclick="window.logout()" title="Sign out">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      `;
      headerActions.insertBefore(userBadge, headerActions.firstChild);
    }
  }
}

// ========================
// CATEGORIES & DOCUMENTS
// ========================

const CATEGORIES = [
  { id: 'all', name: 'All Documents', icon: 'fa-folder' },
  { id: 'network', name: 'Network', icon: 'fa-network-wired' },
  { id: 'security', name: 'Security', icon: 'fa-shield-alt' },
  { id: 'server', name: 'Servers', icon: 'fa-server' },
  { id: 'development', name: 'Development', icon: 'fa-code' },
  { id: 'database', name: 'Database', icon: 'fa-database' },
  { id: 'cloud', name: 'Cloud', icon: 'fa-cloud' }
];

function getDefaultDocuments() {
  return [
    {
      id: '1',
      title: 'Network Architecture Overview',
      category: 'network',
      content: 'Detailed network topology and VLAN configuration guidelines.',
      tags: ['topology', 'vlan', 'architecture'],
      createdAt: new Date('2025-03-10')
    },
    {
      id: '2',
      title: 'Firewall Rules Baseline',
      category: 'security',
      content: 'Standard firewall rules for internal and DMZ zones.',
      tags: ['firewall', 'security', 'dmz'],
      createdAt: new Date('2025-04-01')
    },
    {
      id: '3',
      title: 'PostgreSQL Backup Strategy',
      category: 'database',
      content: 'Incremental and full backup schedules.',
      tags: ['postgresql', 'backup', 'recovery'],
      createdAt: new Date('2025-04-12')
    }
  ];
}

let documents = [];
let currentCategory = 'all';
let searchTerm = '';
let editingDocId = null;

// ========================
// DOM ELEMENTS
// ========================

const categoryListEl = document.getElementById('categoryList');
const documentsGridEl = document.getElementById('documentsGrid');
const emptyStateEl = document.getElementById('emptyState');
const docCountSpan = document.getElementById('docCount');
const searchInput = document.getElementById('searchInput');
const newDocBtn = document.getElementById('newDocBtn');
const docModal = document.getElementById('docModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelDocBtn = document.getElementById('cancelDocBtn');
const saveDocBtn = document.getElementById('saveDocBtn');
const modalTitle = document.getElementById('modalTitle');
const docTitleInput = document.getElementById('docTitle');
const docCategorySelect = document.getElementById('docCategory');
const docContentInput = document.getElementById('docContent');
const docTagsInput = document.getElementById('docTags');
const viewDocModal = document.getElementById('viewDocModal');
const closeViewModalBtn = document.getElementById('closeViewModalBtn');
const closeViewBtn = document.getElementById('closeViewBtn');
const editFromViewBtn = document.getElementById('editFromViewBtn');
const viewDocTitle = document.getElementById('viewDocTitle');
const viewDocCategory = document.getElementById('viewDocCategory');
const viewDocDate = document.getElementById('viewDocDate');
const viewDocTags = document.getElementById('viewDocTags');
const viewDocContent = document.getElementById('viewDocContent');

// ========================
// GOOGLE DRIVE FUNCTIONS
// ========================

async function loadDocumentsFromDrive() {
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAll`);
    const result = await response.json();
    
    if (result.success && result.data && result.data.length > 0) {
      documents = result.data.map(doc => ({
        ...doc,
        createdAt: new Date(doc.createdAt)
      }));
      console.log('✅ Loaded', documents.length, 'documents from Drive');
      return true;
    } else {
      documents = getDefaultDocuments();
      return true;
    }
  } catch (error) {
    console.error('Error loading:', error);
    documents = getDefaultDocuments();
    return false;
  }
}

async function saveDocumentToDrive(doc) {
  try {
    const docJson = JSON.stringify(doc);
    const encodedData = encodeURIComponent(docJson);
    const url = `${GOOGLE_SCRIPT_URL}?action=save&data=${encodedData}`;
    const response = await fetch(url);
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error saving:', error);
    return false;
  }
}

async function deleteDocumentFromDrive(id) {
  try {
    const url = `${GOOGLE_SCRIPT_URL}?action=delete&id=${id}`;
    const response = await fetch(url);
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error deleting:', error);
    return false;
  }
}

// ========================
// UTILS
// ========================

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getCategoryName(catId) {
  return CATEGORIES.find(c => c.id === catId)?.name || catId;
}

function populateCategorySelect() {
  docCategorySelect.innerHTML = CATEGORIES.filter(c => c.id !== 'all')
    .map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
}

function getFilteredDocuments() {
  return documents.filter(doc => {
    const matchesCategory = currentCategory === 'all' || doc.category === currentCategory;
    const lowerSearch = searchTerm.toLowerCase();
    return (doc.title.toLowerCase().includes(lowerSearch) ||
      doc.tags.some(tag => tag.toLowerCase().includes(lowerSearch)) ||
      doc.content.toLowerCase().includes(lowerSearch)) && matchesCategory;
  });
}

// ========================
// RENDER
// ========================

function renderCategories() {
  categoryListEl.innerHTML = CATEGORIES.map(cat => `
    <button class="category-item ${currentCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
      <i class="fas ${cat.icon}"></i> ${cat.name}
    </button>
  `).join('');

  document.querySelectorAll('.category-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentCategory = e.currentTarget.dataset.category;
      renderCategories();
      renderDocuments();
    });
  });
}

function renderDocuments() {
  const filtered = getFilteredDocuments();
  
  if (filtered.length === 0) {
    documentsGridEl.style.display = 'none';
    emptyStateEl.style.display = 'flex';
  } else {
    documentsGridEl.style.display = 'flex';
    emptyStateEl.style.display = 'none';
    
    documentsGridEl.innerHTML = filtered.map(doc => `
      <div class="doc-card" data-id="${doc.id}">
        <div class="doc-info">
          <div class="doc-title">${escapeHtml(doc.title)}</div>
          <div class="doc-meta">
            <span><i class="far fa-calendar-alt"></i> ${formatDate(doc.createdAt)}</span>
            <span class="doc-category-badge">${getCategoryName(doc.category)}</span>
          </div>
          <div style="font-size:0.8rem; color:#5c6f87;">${doc.tags.map(t => '#' + escapeHtml(t)).join(' ')}</div>
        </div>
        <div class="doc-actions">
          <button class="icon-btn edit-doc-btn" data-id="${doc.id}"><i class="fas fa-pen"></i></button>
          <button class="icon-btn delete-btn delete-doc-btn" data-id="${doc.id}"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.doc-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.doc-actions')) openViewModal(card.dataset.id);
      });
    });
    document.querySelectorAll('.edit-doc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); openEditModal(btn.dataset.id); });
    });
    document.querySelectorAll('.delete-doc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteDocument(btn.dataset.id); });
    });
  }
  
  docCountSpan.textContent = `${documents.length} document${documents.length !== 1 ? 's' : ''}`;
}

// ========================
// ACTIONS
// ========================

function openNewDocModal() {
  editingDocId = null;
  modalTitle.textContent = 'New Document';
  docTitleInput.value = '';
  docCategorySelect.value = 'network';
  docContentInput.value = '';
  docTagsInput.value = '';
  docModal.classList.add('active');
}

function openEditModal(docId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;
  editingDocId = docId;
  modalTitle.textContent = 'Edit Document';
  docTitleInput.value = doc.title;
  docCategorySelect.value = doc.category;
  docContentInput.value = doc.content;
  docTagsInput.value = doc.tags.join(', ');
  docModal.classList.add('active');
}

async function saveDocumentFromModal() {
  const title = docTitleInput.value.trim();
  const category = docCategorySelect.value;
  const content = docContentInput.value.trim();
  const tagsRaw = docTagsInput.value.trim();
  
  if (!title || !category) return alert('Title and category are required.');
  
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t) : [];
  
  if (editingDocId) {
    const idx = documents.findIndex(d => d.id === editingDocId);
    if (idx !== -1) documents[idx] = { ...documents[idx], title, category, content, tags };
  } else {
    documents.push({ id: generateId(), title, category, content, tags, createdAt: new Date() });
  }
  
  const savedDoc = editingDocId ? documents.find(d => d.id === editingDocId) : documents[documents.length - 1];
  await saveDocumentToDrive(savedDoc);
  
  docModal.classList.remove('active');
  editingDocId = null;
  renderDocuments();
  renderCategories();
}

async function deleteDocument(id) {
  if (!confirm('Delete this document?')) return;
  documents = documents.filter(doc => doc.id !== id);
  await deleteDocumentFromDrive(id);
  renderDocuments();
}

function openViewModal(docId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;
  
  viewDocTitle.textContent = doc.title;
  viewDocCategory.textContent = getCategoryName(doc.category);
  viewDocDate.innerHTML = `<i class="far fa-calendar-alt"></i> ${formatDate(doc.createdAt)}`;
  viewDocTags.innerHTML = doc.tags.map(tag => `<span class="doc-tag">#${escapeHtml(tag)}</span>`).join('');
  viewDocContent.innerHTML = `
    <div>${escapeHtml(doc.content) || 'No content.'}</div>
    <div class="content-toolbar">
      <button class="copy-btn" onclick="copyContent('${doc.id}')"><i class="fas fa-copy"></i> Copy</button>
    </div>
  `;
  
  viewDocModal.dataset.docId = docId;
  viewDocModal.classList.add('active');
}

function closeViewModal() { viewDocModal.classList.remove('active'); }

function copyContent(docId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;
  navigator.clipboard.writeText(doc.content).then(() => {
    const btn = document.querySelector('.copy-btn');
    if (btn) {
      btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i> Copy'; btn.classList.remove('copied'); }, 2000);
    }
  });
}

function editFromView() {
  const docId = viewDocModal.dataset.docId;
  if (docId) { closeViewModal(); openEditModal(docId); }
}

// ========================
// EVENT LISTENERS
// ========================

newDocBtn.addEventListener('click', openNewDocModal);
closeModalBtn.addEventListener('click', () => docModal.classList.remove('active'));
cancelDocBtn.addEventListener('click', () => docModal.classList.remove('active'));
saveDocBtn.addEventListener('click', saveDocumentFromModal);
closeViewModalBtn.addEventListener('click', closeViewModal);
closeViewBtn.addEventListener('click', closeViewModal);
editFromViewBtn.addEventListener('click', editFromView);

docModal.addEventListener('click', (e) => { if (e.target === docModal) docModal.classList.remove('active'); });
viewDocModal.addEventListener('click', (e) => { if (e.target === viewDocModal) closeViewModal(); });

searchInput.addEventListener('input', (e) => { searchTerm = e.target.value; renderDocuments(); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (viewDocModal.classList.contains('active')) closeViewModal();
    else if (docModal.classList.contains('active')) docModal.classList.remove('active');
  }
});

// ========================
// INITIALIZATION
// ========================

async function initApp() {
  populateCategorySelect();
  await loadDocumentsFromDrive();
  renderCategories();
  renderDocuments();
  displayUserInfo();
  console.log('✅ App initialized with', documents.length, 'documents');
}

initApp();