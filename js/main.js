/* ========================================
   Canfenci - Fen Bilimleri Döküman Arşivi
   Ana JavaScript Dosyası (DÜZELTİLMİŞ SÜRÜM)
   ======================================== */

document.addEventListener('DOMContentLoaded', function () {
  initMobileMenu();
  initStickyHeader();
  initDocumentFilter();
  initSmoothScroll();
  highlightActivePage();
  initStatsCounter();
  initFormValidation();
  initVisitorCounter();
});

/* ===== Mobil Menü Toggle ===== */
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');

  if (!hamburger || !navMenu) return;

  hamburger.addEventListener('click', function () {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  const navLinks = document.querySelectorAll('.nav-menu a');
  navLinks.forEach(link => {
    link.addEventListener('click', function () {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });

  document.addEventListener('click', function (e) {
    if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
    }
  });
}

/* ===== Sticky Header ===== */
function initStickyHeader() {
  const header = document.querySelector('header');
  if (!header) return;

  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 50);
  });
}

/* ===== Döküman Filtreleme (DÜZELTİLDİ) ===== */
function initDocumentFilter() {
  const filterButtons = document.querySelectorAll('.sidebar-filter-btn, .filter-btn');
  const unitSections = document.querySelectorAll('.unit-section');
  const docCards = document.querySelectorAll('.doc-card');

  // Hiyerarşik Ünite & Bölüm Yapısı varsa:
  if (unitSections.length) {
    function showUnit(unitId) {
      unitSections.forEach(section => {
        if (section.id === unitId || unitId === 'all') {
          section.style.display = 'block';
          section.classList.add('active');
        } else {
          section.style.display = 'none';
          section.classList.remove('active');
        }
      });
    }

    filterButtons.forEach(button => {
      button.addEventListener('click', function () {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');

        const unitId = this.getAttribute('data-filter');
        showUnit(unitId);

        // Mobilde butona kaydır
        if (window.innerWidth <= 768) {
          this.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      });
    });

    // İlk yüklemede aktif olan veya ilk üniteyi göster
    const activeFilter = document.querySelector('.sidebar-filter-btn.active');
    if (activeFilter) {
      showUnit(activeFilter.getAttribute('data-filter'));
    } else if (filterButtons.length) {
      filterButtons[0].classList.add('active');
      showUnit(filterButtons[0].getAttribute('data-filter'));
    }

    // Bölüm İçi Sekme (Tab) Değişimi
    const tabButtons = document.querySelectorAll('.chapter-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const card = this.closest('.chapter-card');
        if (!card) return;

        const tabPaneId = this.getAttribute('data-tab');

        // Sekme butonlarını güncelle
        card.querySelectorAll('.chapter-tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // Sekme içeriklerini güncelle
        card.querySelectorAll('.tab-pane').forEach(pane => {
          if (pane.getAttribute('data-pane') === tabPaneId) {
            pane.style.display = 'block';
            pane.classList.add('active');
          } else {
            pane.style.display = 'none';
            pane.classList.remove('active');
          }
        });
      });
    });

    // Her kartın ilk sekmesini otomatik aktif et
    document.querySelectorAll('.chapter-card').forEach(card => {
      const firstTab = card.querySelector('.chapter-tab-btn');
      if (firstTab) {
        firstTab.click();
      }
    });

  } else if (filterButtons.length && docCards.length) {
    // Eski filtreleme mantığı (Fallback)
    let originalDisplay = 'flex';
    if (docCards.length > 0) {
      const computedStyle = window.getComputedStyle(docCards[0]);
      originalDisplay = computedStyle.display === 'flex' ? 'flex' : 'block';
    }

    function filterCards(filterValue) {
      docCards.forEach(card => {
        const category = card.getAttribute('data-category');
        const shouldShow = filterValue === 'all' || category === filterValue;
        
        if (shouldShow) {
          card.style.display = originalDisplay;
          card.style.opacity = '1';
          card.style.visibility = 'visible';
          card.style.animation = 'none';
          setTimeout(() => {
            card.style.animation = 'fadeInUp 0.3s ease';
          }, 10);
        } else {
          card.style.display = 'none';
          card.style.opacity = '0';
          card.style.visibility = 'hidden';
        }
      });
    }

    filterButtons.forEach(button => {
      button.addEventListener('click', function () {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');

        const filterValue = this.getAttribute('data-filter');
        filterCards(filterValue);

        if (window.innerWidth <= 768) {
          this.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      });
    });

    const activeFilter = document.querySelector('.sidebar-filter-btn.active, .filter-btn.active');
    if (activeFilter) {
      filterCards(activeFilter.getAttribute('data-filter'));
    } else {
      filterCards('all');
    }
  }
}

/* ===== Smooth Scroll ===== */
function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      const header = document.querySelector('header');
      const headerHeight = header ? header.offsetHeight : 0;
      const targetPosition = target.offsetTop - headerHeight - 20;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    });
  });
}

/* ===== Aktif Sayfa Vurgulama ===== */
function highlightActivePage() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-menu a');

  navLinks.forEach(link => {
    const linkPage = link.getAttribute('href');
    if (!linkPage) return;

    const normalizedLink = linkPage.split('/').pop();
    if ((currentPage === '' || currentPage === 'index.html') && normalizedLink === 'index.html') {
      link.classList.add('active');
    } else if (normalizedLink === currentPage) {
      link.classList.add('active');
    }
  });
}

/* ===== İstatistik Sayaçları ===== */
function initStatsCounter() {
  const statNumbers = document.querySelectorAll('.stat-number');
  if (!statNumbers.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const target = entry.target;
      const finalValue = parseInt(target.getAttribute('data-count'), 10) || 0;
      animateCounter(target, finalValue);
      observer.unobserve(target);
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(stat => observer.observe(stat));
}

function animateCounter(element, target) {
  let current = 0;
  const steps = 50;
  const increment = target / steps;
  const duration = 2000;
  const stepTime = duration / steps;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = formatNumber(target);
      clearInterval(timer);
    } else {
      element.textContent = formatNumber(Math.floor(current));
    }
  }, stepTime);
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* ===== Form Validasyonu ===== */
function initFormValidation() {
  const contactForm = document.querySelector('.contact-form form');
  if (!contactForm) return;

  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const nameInput = this.querySelector('input[name="name"]');
    const emailInput = this.querySelector('input[name="email"]');
    const messageInput = this.querySelector('textarea[name="message"]');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const message = messageInput ? messageInput.value.trim() : '';

    if (!name || !email || !message) {
      alert('Lütfen tüm alanları doldurunuz.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }

    alert('Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.');
    this.reset();
  });
}

/* ===== Scroll to Top Butonu (Opsiyonel) ===== */
function initScrollToTop() {
  const scrollBtn = document.createElement('button');
  scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
  scrollBtn.className = 'scroll-to-top';
  scrollBtn.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 50px;
    height: 50px;
    background-color: var(--secondary-color, #ff8c42);
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: none;
    z-index: 999;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  `;

  document.body.appendChild(scrollBtn);

  window.addEventListener('scroll', function () {
    scrollBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
  });

  scrollBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ===== Ziyaretçi Sayacı (CounterAPI) ===== */
function initVisitorCounter() {
  const counterElement = document.getElementById('visitor-count');
  if (!counterElement) return;

  fetch('https://api.counterapi.dev/v1/canfenci/index/up')
    .then(response => response.json())
    .then(data => {
      if (data && typeof data.value !== 'undefined') {
        counterElement.innerText = Number(data.value).toLocaleString('tr-TR');
      } else {
        counterElement.innerText = '—';
      }
    })
    .catch(error => {
      console.error('Sayaç yüklenemedi:', error);
      counterElement.innerText = '—';
    });
}