(function () {
  const nav = document.getElementById('primary-navigation');
  const toggle = document.querySelector('.nav-toggle');
  const cartCount = document.getElementById('nav-cart-count');

  function getProductsCount() {
    try {
      const raw = localStorage.getItem('tg_products_v1');
      const products = raw ? JSON.parse(raw) : [];
      return Array.isArray(products) ? products.length : 0;
    } catch (error) {
      return 0;
    }
  }

  function updateCartBadge() {
    if (!cartCount) return;
    const count = getProductsCount();
    cartCount.textContent = count;
    cartCount.setAttribute('aria-label', `${count} products in cart`);
  }

  function setMenuState(isOpen) {
    if (!nav || !toggle) return;
    nav.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  }

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.contains('open');
      setMenuState(!isOpen);
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) setMenuState(false);
      });
    });
  }

  if (window.matchMedia('(min-width: 769px)').matches) {
    setMenuState(true);
  }

  updateCartBadge();

  window.addEventListener('storage', updateCartBadge);
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && nav) {
      nav.classList.remove('open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();
