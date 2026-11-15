/* =============================================
   Lumiapps – Main JavaScript
   ============================================= */

// ---- HERO PARTICLE NETWORK ----
(function () {
  const canvas = document.getElementById('gridCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // ── Config ──────────────────────────────────
  const CFG = {
    count: 90,           // total nodes
    connectDist: 160,    // max px to draw a line between nodes
    mouseRadius: 200,    // repulsion / attraction radius
    mouseForce: 0.012,   // strength of mouse push
    speed: 0.38,         // base drift speed
    nodeRadius: 2.2,     // base dot size
    nodeRadiusLit: 4.5,  // dot size near mouse
    lineWidth: 0.8,
    lineWidthLit: 1.8,
    // colours (indigo + cyan palette)
    hues: [238, 210, 260, 185],
  };

  let W, H;
  const mouse = { x: -9999, y: -9999, active: false };
  let running = false;

  // ── Node factory ─────────────────────────────
  function makeNode() {
    const hue = CFG.hues[Math.floor(Math.random() * CFG.hues.length)];
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * CFG.speed,
      vy: (Math.random() - 0.5) * CFG.speed,
      r: CFG.nodeRadius + Math.random() * 1.2,
      hue,
      sat: 70 + Math.random() * 20,
      lit: 65 + Math.random() * 20,
      alpha: 0.5 + Math.random() * 0.5,
      // subtle pulse
      pulseOffset: Math.random() * Math.PI * 2,
      pulseSpeed: 0.012 + Math.random() * 0.018,
    };
  }

  let nodes = [];
  let time = 0;

  function init() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    nodes = Array.from({ length: CFG.count }, makeNode);
  }

  // ── Draw ─────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);
    time += 0.016;

    // 1. update positions
    nodes.forEach(n => {
      // gentle mouse repulsion
      if (mouse.active) {
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < CFG.mouseRadius * CFG.mouseRadius && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const force = (1 - d / CFG.mouseRadius) * CFG.mouseForce;
          n.vx += (dx / d) * force;
          n.vy += (dy / d) * force;
        }
      }

      // speed cap
      const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (spd > CFG.speed * 2.5) {
        n.vx = (n.vx / spd) * CFG.speed * 2.5;
        n.vy = (n.vy / spd) * CFG.speed * 2.5;
      }

      // gentle return-to-speed drag
      n.vx += (Math.sign(n.vx) * CFG.speed - n.vx) * 0.002;
      n.vy += (Math.sign(n.vy) * CFG.speed - n.vy) * 0.002;

      n.x += n.vx;
      n.y += n.vy;

      // wrap around edges
      if (n.x < -20)  n.x = W + 20;
      if (n.x > W+20) n.x = -20;
      if (n.y < -20)  n.y = H + 20;
      if (n.y > H+20) n.y = -20;
    });

    // 2. draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > CFG.connectDist) continue;

        const t = 1 - dist / CFG.connectDist;         // 0→1 as nodes get closer

        // how close either endpoint is to the mouse
        const mDistA = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        const mDistB = Math.hypot(b.x - mouse.x, b.y - mouse.y);
        const nearMouse = Math.min(mDistA, mDistB) < CFG.mouseRadius && mouse.active;
        const mBoost = nearMouse
          ? (1 - Math.min(mDistA, mDistB) / CFG.mouseRadius) * 0.7
          : 0;

        const alpha = (t * 0.45 + mBoost) * Math.min(a.alpha, b.alpha);
        const hue   = (a.hue + b.hue) / 2;
        const lw    = nearMouse
          ? CFG.lineWidthLit * t + 0.3
          : CFG.lineWidth   * t + 0.2;

        // gradient line from a → b colours
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, `hsla(${a.hue},${a.sat}%,${a.lit}%,${alpha})`);
        grad.addColorStop(1, `hsla(${b.hue},${b.sat}%,${b.lit}%,${alpha})`);

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    }

    // 3. mouse "reach" lines — snap to nearby nodes with a bright thread
    if (mouse.active) {
      nodes.forEach(n => {
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist > CFG.mouseRadius * 0.7) return;
        const t = 1 - dist / (CFG.mouseRadius * 0.7);
        const grad = ctx.createLinearGradient(mouse.x, mouse.y, n.x, n.y);
        grad.addColorStop(0, `hsla(${n.hue},90%,80%,${t * 0.6})`);
        grad.addColorStop(1, `hsla(${n.hue},80%,65%,0)`);
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(n.x, n.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2 * t;
        ctx.stroke();
      });

      // mouse cursor dot
      const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 8);
      mg.addColorStop(0, 'rgba(150,160,255,0.9)');
      mg.addColorStop(1, 'rgba(150,160,255,0)');
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = mg;
      ctx.fill();
    }

    // 4. draw nodes
    nodes.forEach(n => {
      const pulse = 0.6 + 0.4 * Math.sin(time * n.pulseSpeed * 60 + n.pulseOffset);
      const dMouse = Math.hypot(n.x - mouse.x, n.y - mouse.y);
      const lit = mouse.active && dMouse < CFG.mouseRadius
        ? 1 - dMouse / CFG.mouseRadius
        : 0;

      const radius = n.r + lit * (CFG.nodeRadiusLit - n.r);
      const alpha  = n.alpha * pulse;
      const lum    = n.lit + lit * 20;

      // outer glow
      if (lit > 0.1) {
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius * 4);
        glow.addColorStop(0, `hsla(${n.hue},90%,${lum}%,${lit * 0.4})`);
        glow.addColorStop(1, `hsla(${n.hue},90%,${lum}%,0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      // core dot
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${n.hue},${n.sat}%,${lum}%,${Math.min(alpha + lit * 0.5, 1)})`;
      ctx.fill();
    });

    // 5. radial vignette
    const vig = ctx.createRadialGradient(W/2, H/2, H*0.15, W/2, H/2, H*0.9);
    vig.addColorStop(0, 'rgba(10,11,15,0)');
    vig.addColorStop(1, 'rgba(10,11,15,0.82)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    if (running) requestAnimationFrame(draw);
  }

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(draw);
  }
  function stop() { running = false; }

  // ── Events ───────────────────────────────────
  const hero = document.getElementById('home');
  hero.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.active = true;
  });
  hero.addEventListener('mouseleave', () => { mouse.active = false; });

  // touch support
  hero.addEventListener('touchmove', e => {
    const r = canvas.getBoundingClientRect();
    const t = e.touches[0];
    mouse.x = t.clientX - r.left;
    mouse.y = t.clientY - r.top;
    mouse.active = true;
  }, { passive: true });
  hero.addEventListener('touchend', () => { mouse.active = false; });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 150);
  });

  // pause the animation when the hero is off-screen or the tab is hidden
  const heroVisibility = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !document.hidden) start();
    else stop();
  });
  heroVisibility.observe(hero);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (hero.getBoundingClientRect().bottom > 0 && hero.getBoundingClientRect().top < window.innerHeight) start();
  });

  init();
  start();
})();

// ---- NAVBAR SCROLL ----
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// ---- HAMBURGER MENU ----
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  const spans = hamburger.querySelectorAll('span');
  const isOpen = navLinks.classList.contains('open');
  hamburger.setAttribute('aria-expanded', String(isOpen));
  spans[0].style.transform = isOpen ? 'rotate(45deg) translate(5px, 5px)' : '';
  spans[1].style.opacity = isOpen ? '0' : '1';
  spans[2].style.transform = isOpen ? 'rotate(-45deg) translate(5px, -5px)' : '';
});

navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.querySelectorAll('span').forEach(s => {
      s.style.transform = '';
      s.style.opacity = '';
    });
  });
});

// ---- SCROLL REVEAL ----
const revealEls = document.querySelectorAll(
  '.feature-card, .step-card, .testi-card, .pricing-card, .faq-item, .stat-item'
);
revealEls.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 60);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

revealEls.forEach(el => observer.observe(el));

// ---- COUNTER ANIMATION ----
function animateCounter(el, target, duration = 1800) {
  const isDecimal = String(target).includes('.');
  const start = performance.now();
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = eased * target;
    el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = isDecimal ? target.toFixed(1) : target.toLocaleString();
  };
  requestAnimationFrame(update);
}

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const nums = entry.target.querySelectorAll('.stat-number');
      nums.forEach(num => {
        const target = parseFloat(num.dataset.target);
        animateCounter(num, target);
      });
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

const statsSection = document.querySelector('.stats-section');
if (statsSection) statsObserver.observe(statsSection);

// ---- LANGUAGE SWITCHER ----
const langSwitcher = document.getElementById('langSwitcher');
const langBtn = document.getElementById('langBtn');
const langDropdown = document.getElementById('langDropdown');

if (langSwitcher && langBtn && langDropdown) {
  const langCode = langBtn.querySelector('.lang-code');
  const langFlag = langBtn.querySelector('.lang-flag');
  const langOptions = langDropdown.querySelectorAll('li');

  const closeLangDropdown = () => {
    langSwitcher.classList.remove('open');
    langBtn.setAttribute('aria-expanded', 'false');
  };

  const selectLanguage = (opt, { skipApply } = {}) => {
    langOptions.forEach(o => o.setAttribute('aria-selected', 'false'));
    opt.setAttribute('aria-selected', 'true');
    langCode.textContent = opt.dataset.code;
    langFlag.textContent = opt.dataset.flag;
    if (!skipApply) {
      applyLanguage(opt.dataset.code.toLowerCase());
      refreshOpenFaq(); // translated answer may wrap onto more/fewer lines
    }
  };

  langBtn.addEventListener('click', () => {
    const isOpen = langSwitcher.classList.toggle('open');
    langBtn.setAttribute('aria-expanded', String(isOpen));
  });

  langOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      selectLanguage(opt);
      closeLangDropdown();
    });
  });

  document.addEventListener('click', e => {
    if (!langSwitcher.contains(e.target)) closeLangDropdown();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLangDropdown();
  });

  // restore the previously chosen language (defaults to Vietnamese)
  const savedLang = (getSavedLanguage() || 'vi').toLowerCase();
  const savedOption = langDropdown.querySelector(`li[data-code="${savedLang.toUpperCase()}"]`) || langDropdown.querySelector('li[data-code="VI"]');
  if (savedOption) selectLanguage(savedOption, { skipApply: true });
  applyLanguage(savedLang);
}

// ---- FAQ ACCORDION ----
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
  const btn = item.querySelector('.faq-q');
  const answer = item.querySelector('.faq-a');
  answer.style.maxHeight = '0px';
  btn.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    faqItems.forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      i.querySelector('.faq-a').style.maxHeight = '0px';
    });
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});

// An open answer is held open by a fixed px max-height, so anything that changes its
// content height afterwards (language switch, resize/rotate, web font arriving) would
// clip the text. Re-measure the open ones. (Function declaration => hoisted, so the
// language switcher above can call it.)
function refreshOpenFaq() {
  document.querySelectorAll('.faq-item.open .faq-a').forEach(a => {
    a.style.maxHeight = a.scrollHeight + 'px';
  });
}
let faqResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(faqResizeTimer);
  faqResizeTimer = setTimeout(refreshOpenFaq, 150);
});
if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshOpenFaq);

// ---- SMOOTH ANCHOR SCROLLING ----
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href.length <= 1) return; // skip placeholder "#" links
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    }
  });
});

// ---- ACTIVE NAV HIGHLIGHT ----
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');
const navHighlight = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navAnchors.forEach(a => {
        a.style.color = a.getAttribute('href') === '#' + entry.target.id ? 'var(--white)' : '';
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });
sections.forEach(s => navHighlight.observe(s));

// ---- HERO MOCKUP SHIMMER ----
const chartPath = document.querySelector('.mock-chart path[fill="url(#chartGrad)"]');
if (chartPath) {
  let t = 0;
  const animate = () => {
    t += 0.008;
    const o = Math.sin(t) * 4;
    chartPath.setAttribute('d',
      `M0,${80+o} C30,${60-o} 60,${70+o} 90,${45-o} C120,${20+o} 150,${50-o} 180,${30+o} C210,${10-o} 240,${40+o} 270,${20-o} L300,${15+o} L300,100 L0,100 Z`
    );
    requestAnimationFrame(animate);
  };
  animate();
}

// ---- FEATURE CARD TILT ----
document.querySelectorAll('.feature-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    card.style.transform = `translateY(-4px) rotateX(${-y*4}deg) rotateY(${x*4}deg)`;
    card.style.transition = 'transform 0.1s ease';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.3s ease';
  });
});

// ---- LEARN MORE MODAL ----
const MODAL_IMAGES = {
  genius: 'assets/modals/genius.svg',
  artimind: 'assets/modals/artimind.svg',
  reelme: 'assets/modals/reelme.svg',
  personalize: 'assets/modals/personalize.svg',
  security: 'assets/modals/security.svg',
  apps: 'assets/modals/apps.svg'
};
const MODAL_SOURCE_ID = {
  genius: 'prod-genius',
  artimind: 'prod-artimind',
  reelme: 'prod-reelme',
  personalize: 'feat-personalize',
  security: 'feat-security',
  apps: 'feat-apps'
};

const learnModal = document.getElementById('learnModal');
const modalImage = document.getElementById('modalImage');
const modalTagline = document.getElementById('modalTagline');
const modalTitle = document.getElementById('modalTitle');
const modalLead = document.getElementById('modalLead');
const modalExtra = document.getElementById('modalExtra');
const modalFeatures = document.getElementById('modalFeatures');
const modalTexts = document.getElementById('modalTexts');
const modalClose = document.getElementById('modalClose');

function getModalContent(id) {
  const source = document.getElementById(MODAL_SOURCE_ID[id]);
  if (!source) return null;
  const planName = source.querySelector('.plan-name');
  if (planName) {
    return {
      title: planName.textContent,
      tagline: source.querySelector('.app-tagline')?.textContent || '',
      lead: source.querySelector('.plan-desc')?.textContent || '',
      // each <li> is "<span class=check>✓</span> <span data-i18n>text</span>": take only the text,
      // the modal draws its own ✓
      features: [...source.querySelectorAll('.plan-features li')].map(li => (li.querySelector('[data-i18n]') || li).textContent.trim())
    };
  }
  return {
    title: source.querySelector('h3')?.textContent || '',
    tagline: '',
    lead: source.querySelector('p')?.textContent || '',
    features: []
  };
}

function openLearnModal(id) {
  if (!learnModal || !MODAL_IMAGES[id]) return;
  const content = getModalContent(id);
  if (!content) return;

  modalImage.src = MODAL_IMAGES[id];
  modalImage.alt = content.title;
  modalTagline.textContent = content.tagline;
  modalTagline.style.display = content.tagline ? '' : 'none';
  modalTitle.textContent = content.title;
  modalLead.textContent = content.lead;

  const extraEl = modalTexts.querySelector(`[data-modal-text="${id}"]`);
  modalExtra.textContent = extraEl ? extraEl.textContent : '';

  modalFeatures.innerHTML = '';
  content.features.forEach(text => {
    const li = document.createElement('li');
    const check = document.createElement('span');
    check.className = 'check';
    check.textContent = '✓';
    const label = document.createElement('span');
    label.textContent = text;
    li.append(check, ' ', label);
    modalFeatures.appendChild(li);
  });

  learnModal.classList.add('open');
  learnModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLearnModal() {
  if (!learnModal) return;
  learnModal.classList.remove('open');
  learnModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-modal]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    openLearnModal(link.dataset.modal);
  });
});

modalClose?.addEventListener('click', closeLearnModal);
learnModal?.addEventListener('click', e => {
  if (e.target === learnModal) closeLearnModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && learnModal?.classList.contains('open')) closeLearnModal();
});
