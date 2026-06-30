/* ============================================
   SULTANA — Fine Home-Made Food
   Main Application Script
   ============================================ */

/* --------------------------------------------
   1. Language System
   Supports Arabic (RTL) and English (LTR)
   -------------------------------------------- */
let currentLang = 'ar';

function toggleLang() {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

  // Update lang switch button text
  const langBtn = document.querySelector('.lang-switch');
  if (langBtn) langBtn.textContent = currentLang === 'ar' ? 'English' : 'عربي';

  // Update all elements with data-ar/data-en attributes
  document.querySelectorAll('[data-ar]').forEach(el => {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = el.getAttribute(`data-${currentLang}`) || '';
    } else {
      el.textContent = el.getAttribute(`data-${currentLang}`);
    }
  });

  // Update page title
  const titleEl = document.querySelector('title');
  if (titleEl && titleEl.dataset.ar) {
    document.title = titleEl.getAttribute(`data-${currentLang}`);
  }

  // Re-render order page items if on order page
  if (document.getElementById('orderForm')) {
    renderOrderItems();
    updateOrderSummary();
  }
}


/* --------------------------------------------
   2. Navbar Scroll Effect
   Adds 'scrolled' class when user scrolls down
   -------------------------------------------- */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
  });
}


/* --------------------------------------------
   3. Mobile Menu
   Toggle hamburger menu on small screens
   -------------------------------------------- */
function toggleMobileMenu() {
  const navLinks = document.getElementById('navLinks');
  const menuBtn = document.querySelector('.mobile-menu-btn');
  if (!navLinks) return;

  navLinks.classList.toggle('active');
  const icon = menuBtn.querySelector('i');
  if (icon) {
    icon.className = navLinks.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
  }

  // Prevent body scroll when menu is open
  document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
}

// Close mobile menu when clicking a nav link
function initMobileMenuLinks() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const navLinks = document.getElementById('navLinks');
      if (navLinks && navLinks.classList.contains('active')) {
        toggleMobileMenu();
      }
    });
  });
}


/* --------------------------------------------
   4. Egg Quantity Control (Menu Page)
   Dynamic pricing for Turkish eggs item
   -------------------------------------------- */
let eggCount = 5;
const EGG_BASE_PRICE = 100;
const EGG_PRICE_PER_EXTRA = 10;
const EGG_MIN_COUNT = 1;

function changeEggs(delta) {
  eggCount = Math.max(EGG_MIN_COUNT, eggCount + delta);

  const countEl = document.getElementById('eggCount');
  if (countEl) countEl.textContent = eggCount;

  const newPrice = Math.max(EGG_BASE_PRICE, EGG_BASE_PRICE + ((eggCount - 5) * EGG_PRICE_PER_EXTRA));

  const priceSpan = document.querySelector('#eggPrice .egp');
  if (priceSpan) {
    priceSpan.textContent = currentLang === 'ar' ? `${newPrice} جنيه` : `${newPrice} EGP`;
    priceSpan.setAttribute('data-ar', `${newPrice} جنيه`);
    priceSpan.setAttribute('data-en', `${newPrice} EGP`);
  }
}


/* --------------------------------------------
   5. Order Now Button (Menu Page)
   Stores selected item and redirects to order
   -------------------------------------------- */
function orderNow(btn) {
  const card = btn.closest('.card');
  if (!card) return;

  const nameAr = card.getAttribute('data-name-ar');
  const nameEn = card.getAttribute('data-name-en');
  const priceEl = card.querySelector('.price .egp');
  const price = priceEl ? priceEl.textContent : '';

  // Build the selected item object
  const item = {
    nameAr: nameAr,
    nameEn: nameEn,
    price: price,
    quantity: 1
  };

  // Check if it's the egg item (has qty control)
  const qtyControl = card.querySelector('.qty-control');
  if (qtyControl) {
    item.quantity = eggCount;
  }

  // Store in sessionStorage and redirect
  sessionStorage.setItem('sultana_selected_item', JSON.stringify(item));
  window.location.href = 'order.html';
}


/* --------------------------------------------
   6. Order Page Logic
   Full order management with WhatsApp checkout
   -------------------------------------------- */

// Menu items data for the order page
const MENU_ITEMS = [
  {
    id: 'tajine',
    nameAr: 'طاجن فراخ بالكريمه',
    nameEn: 'Creamy Chicken Tajine',
    price: 380,
    image: 'assets/images/tajine.png'
  },
  {
    id: 'bechamel',
    nameAr: 'مكرونه بشاميل',
    nameEn: 'Beef Bechamel Pasta',
    price: 320,
    image: 'assets/images/bechamel.png'
  },
  {
    id: 'eggs',
    nameAr: 'بيض تركى خضار وجبن',
    nameEn: 'Turkish Egg with Veggies & Cheese',
    price: 100,
    image: 'assets/images/turkish-eggs.png',
    hasQty: true,
    minQty: 5
  }
];

// Order state — tracks selected items and their quantities
let orderItems = {};

/**
 * Initialize the order page.
 * Checks for pre-selected items from the menu page
 * and renders the order form.
 */
function initOrderPage() {
  const orderForm = document.getElementById('orderForm');
  if (!orderForm) return; // Not on order page

  // Check if there's a pre-selected item from the menu page
  const selectedItem = sessionStorage.getItem('sultana_selected_item');
  if (selectedItem) {
    try {
      const item = JSON.parse(selectedItem);
      // Find matching menu item and pre-select it
      MENU_ITEMS.forEach(menuItem => {
        if (menuItem.nameAr === item.nameAr) {
          orderItems[menuItem.id] = item.quantity || 1;
        }
      });
      sessionStorage.removeItem('sultana_selected_item');
    } catch (e) {
      console.error('Error parsing selected item:', e);
    }
  }

  renderOrderItems();
  updateOrderSummary();
}

/**
 * Render the selectable order items grid.
 * Each item can be toggled on/off, with quantity controls when selected.
 */
function renderOrderItems() {
  const container = document.getElementById('orderItemsGrid');
  if (!container) return;

  container.innerHTML = MENU_ITEMS.map(item => {
    const isSelected = orderItems[item.id] && orderItems[item.id] > 0;
    const qty = orderItems[item.id] || (item.hasQty ? item.minQty : 1);
    const name = currentLang === 'ar' ? item.nameAr : item.nameEn;
    const priceText = currentLang === 'ar' ? `${item.price} جنيه` : `${item.price} EGP`;

    return `
      <div class="order-item ${isSelected ? 'selected' : ''}" data-id="${item.id}" onclick="toggleOrderItem('${item.id}')">
        <img src="${item.image}" alt="${name}" loading="lazy">
        <h4>${name}</h4>
        <p class="item-price">${priceText}</p>
        ${isSelected ? `
          <div class="qty-control" onclick="event.stopPropagation()">
            <button type="button" onclick="changeOrderQty('${item.id}', -1)">−</button>
            <span>${qty}</span>
            <button type="button" onclick="changeOrderQty('${item.id}', 1)">+</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

/**
 * Toggle an item's selection state in the order.
 * @param {string} itemId - The menu item ID to toggle
 */
function toggleOrderItem(itemId) {
  const item = MENU_ITEMS.find(i => i.id === itemId);
  if (!item) return;

  if (orderItems[itemId]) {
    delete orderItems[itemId];
  } else {
    orderItems[itemId] = item.hasQty ? item.minQty : 1;
  }

  renderOrderItems();
  updateOrderSummary();
}

/**
 * Change the quantity of a selected order item.
 * @param {string} itemId - The menu item ID
 * @param {number} delta  - Amount to change (+1 or -1)
 */
function changeOrderQty(itemId, delta) {
  const item = MENU_ITEMS.find(i => i.id === itemId);
  if (!item || !orderItems[itemId]) return;

  const minQty = item.hasQty ? item.minQty : 1;
  orderItems[itemId] = Math.max(minQty > 1 ? 1 : 1, orderItems[itemId] + delta);

  if (orderItems[itemId] < 1) {
    delete orderItems[itemId];
  }

  renderOrderItems();
  updateOrderSummary();
}

/**
 * Calculate the total price for an item considering special pricing rules.
 * Eggs have a base price for 5, with per-extra pricing.
 * @param {Object} item - Menu item object
 * @param {number} qty  - Quantity ordered
 * @returns {number} Total price for this item
 */
function calculateItemTotal(item, qty) {
  if (item.hasQty) {
    // Egg pricing: base 100 for 5, +10 per extra egg
    return Math.max(item.price, item.price + ((qty - 5) * 10));
  }
  return item.price * qty;
}

/**
 * Update the order summary section with current selections and totals.
 */
function updateOrderSummary() {
  const summaryContainer = document.getElementById('orderSummary');
  const totalEl = document.getElementById('orderTotal');
  if (!summaryContainer) return;

  let total = 0;
  let summaryHTML = '';

  Object.entries(orderItems).forEach(([itemId, qty]) => {
    const item = MENU_ITEMS.find(i => i.id === itemId);
    if (!item) return;

    const itemTotal = calculateItemTotal(item, qty);
    total += itemTotal;
    const name = currentLang === 'ar' ? item.nameAr : item.nameEn;
    const priceText = currentLang === 'ar' ? `${itemTotal} جنيه` : `${itemTotal} EGP`;
    const qtyText = qty > 1 ? ` × ${qty}` : '';

    summaryHTML += `
      <div class="summary-row">
        <span>${name}${qtyText}</span>
        <span>${priceText}</span>
      </div>
    `;
  });

  if (summaryHTML === '') {
    summaryHTML = `<div class="summary-row summary-empty"><span>${currentLang === 'ar' ? 'لم يتم اختيار أصناف بعد' : 'No items selected yet'}</span></div>`;
  }

  summaryContainer.innerHTML = summaryHTML;

  if (totalEl) {
    totalEl.textContent = currentLang === 'ar' ? `${total} جنيه` : `${total} EGP`;
  }
}

/**
 * Validate the order form, build a formatted WhatsApp message,
 * and open WhatsApp with the pre-filled message.
 */
function sendWhatsApp() {
  // Gather form values
  const name = document.getElementById('customerName')?.value?.trim();
  const phone = document.getElementById('customerPhone')?.value?.trim();
  const address = document.getElementById('customerAddress')?.value?.trim();
  const area = document.getElementById('customerArea')?.value?.trim();
  const notes = document.getElementById('orderNotes')?.value?.trim();

  // Validation checks
  if (!name) {
    showFormError(currentLang === 'ar' ? 'من فضلك اكتب اسمك' : 'Please enter your name');
    document.getElementById('customerName')?.focus();
    return;
  }
  if (!phone) {
    showFormError(currentLang === 'ar' ? 'من فضلك اكتب رقم موبايلك' : 'Please enter your phone number');
    document.getElementById('customerPhone')?.focus();
    return;
  }
  if (!address) {
    showFormError(currentLang === 'ar' ? 'من فضلك اكتب عنوانك' : 'Please enter your address');
    document.getElementById('customerAddress')?.focus();
    return;
  }

  // Check if any items are selected
  if (Object.keys(orderItems).length === 0) {
    showFormError(currentLang === 'ar' ? 'من فضلك اختار صنف واحد على الأقل' : 'Please select at least one item');
    return;
  }

  // Build the formatted WhatsApp message
  let message = '*طلب جديد من موقع سلطانة*\n';
  message += '━━━━━━━━━━━━━━━\n';
  message += `*الاسم:* ${name}\n`;
  message += `*الموبايل:* ${phone}\n`;
  message += `*العنوان:* ${address}\n`;
  if (area) message += `*المنطقة:* ${area}\n`;
  message += '━━━━━━━━━━━━━━━\n';
  message += '*الأصناف المطلوبة:*\n';

  let total = 0;
  Object.entries(orderItems).forEach(([itemId, qty]) => {
    const item = MENU_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    const itemTotal = calculateItemTotal(item, qty);
    total += itemTotal;
    const qtyText = qty > 1 ? ` (${qty})` : '';
    message += `  • ${item.nameAr}${qtyText} — ${itemTotal} جنيه\n`;
  });

  message += '━━━━━━━━━━━━━━━\n';
  message += `*الإجمالي:* ${total} جنيه\n`;

  if (notes) {
    message += `*ملاحظات:* ${notes}\n`;
  }

  message += '\n_تم الطلب من موقع سلطانة_';

  // Open WhatsApp with the pre-filled message
  const whatsappURL = `https://wa.me/201040241510?text=${encodeURIComponent(message)}`;
  window.open(whatsappURL, '_blank');
}

/**
 * Display a temporary error message at the top of the order card.
 * Auto-removes after 4 seconds.
 * @param {string} message - The error message to display
 */
function showFormError(message) {
  // Remove any existing error
  const existing = document.querySelector('.form-error');
  if (existing) existing.remove();

  const errorDiv = document.createElement('div');
  errorDiv.className = 'form-error';
  errorDiv.innerHTML = `<span><i class="fas fa-exclamation-circle"></i> ${message}</span>`;
  errorDiv.style.cssText = 'background:#FFF0F3;color:#FF5D8F;padding:14px 20px;border-radius:12px;margin-bottom:20px;font-weight:700;text-align:center;animation:fadeDown 0.3s ease;border:1px solid #FFD6E0';

  const orderCard = document.querySelector('.order-card');
  if (orderCard) orderCard.insertBefore(errorDiv, orderCard.firstChild);

  // Auto-remove after 4 seconds
  setTimeout(() => errorDiv.remove(), 4000);
}


/* --------------------------------------------
   7. Smooth Scroll
   Smooth scrolling for anchor links
   -------------------------------------------- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const navHeight = document.getElementById('navbar')?.offsetHeight || 0;
        const targetPosition = target.offsetTop - navHeight;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });
}


/* --------------------------------------------
   8. Scroll Animations (Intersection Observer)
   Fade-in elements as they enter the viewport
   -------------------------------------------- */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.card, .feature-item, .delivery-badge, .about-content').forEach(el => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
  });
}


/* --------------------------------------------
   9. Dynamic Animation Styles
   Inject CSS for scroll animations at runtime
   -------------------------------------------- */
function injectAnimationStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .animate-on-scroll {
      opacity: 0;
      transform: translateY(30px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .animate-on-scroll.animate-in {
      opacity: 1;
      transform: translateY(0);
    }
    .form-error {
      animation: fadeDown 0.3s ease;
    }
    @keyframes fadeDown {
      from { opacity: 0; transform: translateY(-10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}


/* --------------------------------------------
   10. Initialization
   Boot everything when the DOM is ready
   -------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenuLinks();
  initSmoothScroll();
  initScrollAnimations();
  injectAnimationStyles();
  initOrderPage();
});
