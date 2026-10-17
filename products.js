// products.js — stores products in localStorage under key 'tg_products_v1'
(() => {
  const STORAGE_KEY = 'tg_products_v1';
  let products = [];

  // Elements
  const form = document.getElementById('add-product-form');
  const grid = document.getElementById('product-grid');
  const countEl = document.getElementById('products-count');
  const msgEl = document.getElementById('form-msg');
  const clearBtn = document.getElementById('clear-products');

  function loadProducts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      products = raw ? JSON.parse(raw) : [];
      // Ensure older entries get a createdAt
      products = products.map(p => ({ ...p, createdAt: p.createdAt || new Date().toISOString() }));
    } catch {
      products = [];
    }
  }

  function saveProducts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }

  function formatPrice(n) {
    if (n == null || isNaN(n)) return '—';
    return '₹' + Number(n).toLocaleString();
  }

  function formatDate(iso) {
    try {
      if (!iso) return '';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString();
    } catch {
      return iso;
    }
  }

  function renderProducts() {
    grid.innerHTML = '';
    if (!products.length) {
      countEl.textContent = 'No products yet.';
      return;
    }
    countEl.textContent = `${products.length} product${products.length > 1 ? 's' : ''}`;
    products.slice().reverse().forEach(p => {
      const card = document.createElement('article');
      card.className = 'product-card';
      const imgHtml = p.image
        ? `<img loading="lazy" class="product-thumb" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : '';
      const fallback = `<div class="no-image" style="${p.image ? 'display:none' : 'display:flex'}">${p.title ? p.title.charAt(0).toUpperCase() : '—'}</div>`;
      card.innerHTML = `
        ${imgHtml}
        ${fallback}
        <div class="product-title">${escapeHtml(p.title)}</div>
        <div class="product-price">${formatPrice(p.price)}</div>
        <div class="product-specs">${escapeHtml(p.description || '')}</div>
        <div class="small-muted">${(p.tags && p.tags.length) ? escapeHtml(p.tags.join(', ')) : ''}</div>
        <div class="small-muted">Added: ${formatDate(p.createdAt)}</div>
        <div class="product-actions">
          <a class="btn btn-outline" href="#" data-id="${p.id}">View</a>
          <button class="btn remove-btn" data-id="${p.id}" style="background:transparent;border:0;color:#ff6b81;" title="Remove">✕</button>
        </div>
      `;
      // remove handler
      const removeBtn = card.querySelector('button.remove-btn');
      removeBtn.addEventListener('click', () => {
        if (!confirm('Remove this product?')) return;
        products = products.filter(x => x.id !== p.id);
        saveProducts();
        renderProducts();
      });
      // view handler
      const viewLink = card.querySelector('a[data-id]');
      viewLink.addEventListener('click', (ev) => {
        ev.preventDefault();
        alert(`${p.title}\n\n${p.description || ''}\n\nPrice: ${formatPrice(p.price)}\nAdded: ${formatDate(p.createdAt)}`);
      });
      grid.appendChild(card);
    });
  }

  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function showMsg(text, timeout = 2400) {
    if (!msgEl) return;
    msgEl.textContent = text;
    setTimeout(() => { if (msgEl.textContent === text) msgEl.textContent = ''; }, timeout);
  }

  function handleAdd(e) {
    e.preventDefault();
    const title = document.getElementById('prod-title').value.trim();
    const priceRaw = document.getElementById('prod-price').value;
    const image = document.getElementById('prod-image').value.trim();
    const tagsRaw = document.getElementById('prod-tags').value.trim();
    const desc = document.getElementById('prod-desc').value.trim();

    if (!title) { showMsg('Please provide a product title.'); return; }
    const price = priceRaw ? Number(priceRaw) : 0;
    if (priceRaw && isNaN(price)) { showMsg('Invalid price'); return; }

    const product = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      title,
      price,
      image: image || '',
      tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
      description: desc,
      createdAt: new Date().toISOString()
    };
    products.push(product);
    saveProducts();
    renderProducts();
    form.reset();
    showMsg('Product added');
  }

  function handleClear() {
    if (!confirm('Clear all products from local storage? This cannot be undone.')) return;
    products = [];
    saveProducts();
    renderProducts();
    showMsg('All products cleared');
  }

  function delegatedClicks(e) {
    const t = e.target;
    // delegated handler already implemented in render via viewLink and removeBtn; keep for safety
    if (t.matches('a[data-id]')) {
      e.preventDefault();
      const id = t.getAttribute('data-id');
      const prod = products.find(p => p.id === id);
      if (prod) {
        alert(`${prod.title}\n\n${prod.description || ''}\n\nPrice: ${formatPrice(prod.price)}\nAdded: ${formatDate(prod.createdAt)}`);
      }
    }
    if (t.matches('button.remove-btn')) {
      const id = t.getAttribute('data-id');
      if (!confirm('Remove this product?')) return;
      products = products.filter(x => x.id !== id);
      saveProducts();
      renderProducts();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    renderProducts();
    form && form.addEventListener('submit', handleAdd);
    clearBtn && clearBtn.addEventListener('click', handleClear);
    document.addEventListener('click', delegatedClicks);
  });
})();
