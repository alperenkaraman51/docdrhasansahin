// IMEP - Robust Navigation & UI Script
const header = document.querySelector('.site-header');
const navigation = document.querySelector('#site-navigation');
const scrollProgressBar = document.querySelector('#scroll-progress');
// Missing navigation bootstrap leaves the visible static fallback intact.
const setMenu = open => window.siteMenu?.setMenu(open);

function updateScrollProgress() {
  if (!scrollProgressBar) return;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
  scrollProgressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
}

const toggleHeaderScrolled = () => {
  if (!header) return;
  if (window.scrollY > 100) {
    header.classList.add('is-scrolled');
  } else {
    header.classList.remove('is-scrolled');
  }
};

// Map navigation links to sections
const sectionLinks = navigation ? [...navigation.querySelectorAll('[data-section-link]')] : [];
const trackedSections = sectionLinks.map(link => ({
  link,
  section: document.getElementById(link.hash.slice(1))
})).filter(item => item.section);

let isProgrammaticScroll = false;
let scrollTimeout = null;
let restoringHistory = false;
let historyRestoration = 0;
const rememberHistoryPosition = () => {
  if (!restoringHistory && window.history.state?.siteScrollY !== window.scrollY) {
    window.history.replaceState({ ...window.history.state, siteScrollY: window.scrollY }, '');
  }
};
window.addEventListener('scrollend', () => {
  if (Number.isFinite(window.history.state?.siteScrollY)) rememberHistoryPosition();
});
window.addEventListener('popstate', event => {
  const sequence = ++historyRestoration;
  restoringHistory = Number.isFinite(event.state?.siteScrollY);
  if (!restoringHistory) return;
  const y = event.state.siteScrollY;
  // Native restoration and the compact header can otherwise shift each other by 20px.
  requestAnimationFrame(() => {
    if (sequence !== historyRestoration) return;
    const inner = header?.querySelector('.header-inner');
    const transition = inner?.style.transition;
    if (inner) inner.style.transition = 'none';
    header?.classList.toggle('is-scrolled', y > 100);
    if (inner) void inner.offsetHeight;
    window.scrollTo({ top: y, behavior: 'instant' });
    if (inner) inner.style.transition = transition;
    requestAnimationFrame(() => {
      if (sequence !== historyRestoration) return;
      restoringHistory = false;
      rememberHistoryPosition();
      updateActiveAndProgress();
    });
  });
});

const updateActiveAndProgress = () => {
  updateScrollProgress();
  toggleHeaderScrolled();
  
  if (isProgrammaticScroll) return; // Wait until programmatic scroll is completely done
  
  if (trackedSections.length > 0) {
    const headerHeight = header ? header.offsetHeight : 88;
    // We add a safety offset (e.g. +140) to guarantee the line is crossed when a section hits its scroll-margin-top
    const scrollReference = window.scrollY + headerHeight + 140; 
    
    let activeId = null;
    const allSections = Array.from(document.querySelectorAll('section[id]'));
    
    // Check if user reached bottom of page
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 10) {
      const lastSection = allSections[allSections.length - 1];
      activeId = lastSection ? lastSection.id : null;
    } else {
      // Find the last section that is ABOVE our reference line
      for (let i = 0; i < allSections.length; i++) {
        const sec = allSections[i];
        if (sec.offsetTop <= scrollReference) {
          activeId = sec.id;
        } else {
          break;
        }
      }
    }
    
    // Apply aria-current ONLY to the active link. If activeId doesn't match any link, all get removed.
    trackedSections.forEach(item => {
      if (activeId && item.section.id === activeId) {
        item.link.setAttribute('aria-current', 'location');
      } else {
        item.link.removeAttribute('aria-current');
      }
    });
  }
};

// Setup smooth scroll click handler for ALL anchors that point to internal IDs
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    const targetId = link.getAttribute('href');
    if (targetId === '#') return;
    const targetEl = document.querySelector(targetId);
    if (!targetEl) return;
    
    event.preventDefault();
    setMenu(false);
    
    // Find if this target belongs to our tracked sections to immediately set active state
    const matchedTrack = trackedSections.find(t => t.section.id === targetId.slice(1));
    if (matchedTrack) {
      trackedSections.forEach(t => t.link.removeAttribute('aria-current'));
      matchedTrack.link.setAttribute('aria-current', 'location');
    }
    
    isProgrammaticScroll = true;
    
    
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // CUSTOM COORDINATE SCROLLING:
    // Instead of forcing the section's DOM boundary exactly to the viewport edge,
    // we calculate a natural visual coordinate that leaves ~100px of breathing room
    // below the sticky header. This shows the natural flow from the previous section.
    const headerHeight = header ? header.offsetHeight : 88;
    
    // TARGET PRECISE DOM ELEMENT: find the first eyebrow/kicker or section title
    const eyebrow = targetEl.querySelector('.eyebrow') || targetEl.querySelector('.section-title');
    const scrollTargetEl = eyebrow ? eyebrow : targetEl;
    
    // We scroll so the eyebrow text is exactly below the header, plus a standard 32px breathing room.
    const targetY = scrollTargetEl.getBoundingClientRect().top + window.scrollY - headerHeight - 32;

    if (window.history && window.history.pushState) {
      historyRestoration++;
      restoringHistory = false;
      rememberHistoryPosition();
      window.history.pushState({ siteScrollY: Math.max(0, targetY) }, '', targetId);
    }

    
    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: prefersReduced ? 'instant' : 'smooth'
    });

    
    if (!targetEl.hasAttribute('tabindex')) {
      targetEl.setAttribute('tabindex', '-1');
    }
    targetEl.focus({ preventScroll: true });
    
    // Reset programmatic flag when scrolling finishes
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isProgrammaticScroll = false;
      updateActiveAndProgress();
    }, prefersReduced ? 100 : 800);
  });
});

let scrollQueued = false;
window.addEventListener('scroll', () => {
  if (!scrollQueued) { 
    scrollQueued = true; 
    requestAnimationFrame(() => {
      updateActiveAndProgress();
      scrollQueued = false;
    });
  }
}, { passive: true });
updateActiveAndProgress();


// --- 2. GLOBAL REVEAL ---
const revealSelectors = [
  '.institution',
  '.intent-row',
  '.about-visual',
  '.biography',
  '.research-area-block',
  '.video-heading',
  '.video-stage',
  '.video-caption',
  '.feature-copy',
  '.skytr-visual-wrap',
  '.contact-information'
];
// Gallery cards stay visible even when only a sliver intersects the scroll area.
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
document.querySelectorAll(revealSelectors.join(', ')).forEach((el, index) => {
  el.setAttribute('data-reveal', 'up');
  revealObserver.observe(el);
});
// Observe the unclipped photo; animation starts only after intersection.
// The default remains visible even if the observer never calls back.
document.querySelectorAll('.feature-photo').forEach(el => revealObserver.observe(el));
const lineSelectors = ['.caption-rule', '.hero-baseline'];
document.querySelectorAll(lineSelectors.join(', ')).forEach(el => {
  el.setAttribute('data-reveal', 'line-x');
  revealObserver.observe(el);
});


// --- 4. HERO PARALLAX ---
const heroSection = document.querySelector('.hero');
const portraitFrame = document.querySelector('.portrait-frame');
if (heroSection && portraitFrame && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  heroSection.addEventListener('mousemove', (e) => {
    const rect = heroSection.getBoundingClientRect();
    const xPos = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const yPos = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    requestAnimationFrame(() => {
      portraitFrame.style.transform = `translate(${xPos * -6}px, ${yPos * -6}px)`;
    });
  });
  heroSection.addEventListener('mouseleave', () => {
    requestAnimationFrame(() => {
      portraitFrame.style.transform = `translate(0, 0)`;
      portraitFrame.style.transition = 'transform 0.5s ease-out';
    });
  });
  heroSection.addEventListener('mouseenter', () => {
    portraitFrame.style.transition = 'transform 0.1s linear';
  });
}

// --- 5. INTENT ROUTING LOGIC (Restored for Contact Form mapping) ---
const intentLinks = document.querySelectorAll('a[data-route]');
const routeMap = {
  student: { defaultSubject: 'Kariyer ve Mentörlük Talebi' },
  academic: { defaultSubject: 'Akademik İş Birliği' },
  industry: { defaultSubject: 'Üniversite–Sanayi İş Birliği' },
  speaker: { defaultSubject: 'Konuşmacı Daveti' }
};

function applyRouteTailoring(routeKey) {
  const config = routeMap[routeKey];
  if (!config) return;
  const subjEl = document.querySelector('#inquiry-form [name="subject"]');
  if (subjEl && subjEl.dataset.userEdited !== 'true' && !subjEl.value.trim()) {
    subjEl.value = config.defaultSubject;
  }
}

intentLinks.forEach(link => {
  link.addEventListener('click', event => {
    const routeKey = link.dataset.route;
    if (routeKey) {
      applyRouteTailoring(routeKey);
      try { sessionStorage.setItem('hasan_sahin_route', routeKey); } catch {}
    }
  });
});

try {
  const saved = sessionStorage.getItem('hasan_sahin_route');
  if (saved && routeMap[saved]) {
    applyRouteTailoring(saved);
  }
} catch {}

// --- 6. VIDEO MODAL LOGIC ---
const videoModal = document.getElementById('youtube-video-modal');
const openVideoBtn = document.getElementById('open-video-modal');
const closeVideoBtn = document.getElementById('video-modal-close-btn');
const closeVideoBackdrop = document.getElementById('video-modal-close-backdrop');
const videoIframe = document.getElementById('youtube-video-iframe');
const youtubeEmbedUrl = "https://www.youtube.com/embed/nki_0vIPG0E?autoplay=1";

let videoOpener = null;
const modalBackground = new Map();
let videoFocusFrame = 0;
let videoFocusTransfer = false;
let videoFrameLoaded = false;

function cancelVideoFocusCheck() {
  if (videoFocusFrame) cancelAnimationFrame(videoFocusFrame);
  videoFocusFrame = 0;
  videoFocusTransfer = false;
}

function openVideoModal(e) {
  e.preventDefault(); // Prevent opening in new tab
  cancelVideoFocusCheck();
  videoFrameLoaded = false;
  videoOpener = e.currentTarget || document.activeElement;
  if (videoIframe) {
    videoIframe.src = youtubeEmbedUrl;
  }
  if (videoModal) {
    videoModal.inert = false;
    videoModal.setAttribute('aria-hidden', 'false');
    if (!videoModal.open) videoModal.showModal();
    videoModal.classList.add('is-open');
    [...document.body.children].filter(el => el !== videoModal && !['SCRIPT', 'STYLE'].includes(el.tagName)).forEach(el => {
      if (!modalBackground.has(el)) modalBackground.set(el, el.inert);
      el.inert = true;
    });
    closeVideoBtn?.focus({ preventScroll: true });
  }
}

function closeVideoModal() {
  cancelVideoFocusCheck();
  if (videoModal) {
    videoModal.classList.remove('is-open');
    videoModal.close();
    modalBackground.forEach((wasInert, el) => { el.inert = wasInert; });
    modalBackground.clear();
    if (videoOpener?.isConnected) videoOpener.focus({ preventScroll: true });
    videoModal.inert = true;
    videoModal.setAttribute('aria-hidden', 'true');
  }
  if (videoIframe) {
    videoIframe.src = ""; // Stop video playback
  }
}

if (openVideoBtn && videoModal) {
  openVideoBtn.addEventListener('click', openVideoModal);
  if (closeVideoBtn) closeVideoBtn.addEventListener('click', closeVideoModal);
  if (closeVideoBackdrop) closeVideoBackdrop.addEventListener('click', closeVideoModal);
  
  // Handle the browser dialog cancellation as well as host-document Escape.
  videoModal.addEventListener('cancel', event => { event.preventDefault(); closeVideoModal(); });
  // Guards also catch Tab leaving the cross-origin iframe's document.
  videoModal.querySelector('[data-modal-guard="start"]').addEventListener('focus', () => videoIframe.focus());
  videoModal.querySelector('[data-modal-guard="end"]').addEventListener('focus', () => closeVideoBtn.focus());
  // A failed frame navigation can leave body focused without firing focusin.
  // Check after native Tab completes and after a frame commits; never take focus
  // from a child-frame control, a closed dialog, or an inactive browser tab.
  const restoreVideoFocus = (event, completingTransfer = false) => {
    // A failed child can own focus even while trusted Tab reaches the host.
    const hostTab = event?.type === 'keyup' && event.key === 'Tab' && event.isTrusted && document.visibilityState === 'visible';
    const ownTransfer = completingTransfer && document.visibilityState === 'visible';
    if (videoModal.open && (document.hasFocus() || hostTab || ownTransfer) && !videoModal.contains(document.activeElement)) {
      closeVideoBtn.focus({ preventScroll: true });
    }
  };
  const checkVideoFocusAfterTransfer = () => {
    if (!videoFocusTransfer || videoFocusFrame) return;
    // Native focus cleanup may follow focusout/keyUp, and keyUp may stay in
    // the child. Inspect the completed transaction, never interrupt its entry.
    videoFocusFrame = requestAnimationFrame(() => {
      videoFocusFrame = 0;
      restoreVideoFocus(undefined, videoFocusTransfer);
      if (videoFrameLoaded || !videoModal.open) videoFocusTransfer = false;
    });
  };
  videoModal.addEventListener('focusout', event => {
    if (videoModal.open && event.isTrusted && document.hasFocus() && document.activeElement === document.body) {
      videoFocusTransfer = true;
      checkVideoFocusAfterTransfer();
    }
  });
  videoIframe.addEventListener('load', event => {
    // Ignore an old empty-child load during a new opening navigation.
    if (videoModal.open && videoIframe.getAttribute('src') && videoIframe.contentDocument?.URL !== 'about:blank') videoFrameLoaded = true;
    restoreVideoFocus(event);
    checkVideoFocusAfterTransfer();
  });
  window.addEventListener('focus', restoreVideoFocus);
  window.addEventListener('blur', () => { if (!document.hasFocus()) cancelVideoFocusCheck(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') cancelVideoFocusCheck(); });
  document.addEventListener('keyup', event => {
    if (event.key === 'Tab') restoreVideoFocus(event);
  });
  document.addEventListener('focusin', event => {
    if (videoModal.classList.contains('is-open') && !videoModal.contains(event.target)) closeVideoBtn.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (!videoModal.classList.contains('is-open')) return;
    if (e.key === 'Tab' && e.shiftKey && document.activeElement === closeVideoBtn) {
      e.preventDefault();
      videoIframe.focus();
    } else if (e.key === 'Tab' && !e.shiftKey && document.activeElement === videoIframe) {
      e.preventDefault();
      closeVideoBtn.focus();
    }
    if (e.key === 'Escape' && videoModal.classList.contains('is-open')) {
      closeVideoModal();
    }
  });
}

// --- 7. CAROUSEL HORIZONTAL DRAG ---
const sliders = document.querySelectorAll('.featured-pubs-gallery');
sliders.forEach(slider => {
  let isDown = false;
  let startX;
  let scrollLeft;
  let isDragging = false;

  slider.addEventListener('dragstart', e => e.preventDefault());
  slider.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDown = true;
    slider.style.cursor = 'grabbing';
    slider.style.scrollSnapType = 'none'; // Disable snap while dragging
    slider.style.scrollBehavior = 'auto';
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
    isDragging = false;
  });

  slider.addEventListener('mouseleave', () => {
    isDown = false;
    slider.style.cursor = '';
    slider.style.scrollSnapType = '';
    slider.style.scrollBehavior = '';
  });

  slider.addEventListener('mouseup', () => {
    isDown = false;
    slider.style.cursor = '';
    slider.style.scrollSnapType = '';
    slider.style.scrollBehavior = '';
  });

  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 2; // scroll speed multiplier
    if (Math.abs(walk) > 5) isDragging = true;
    slider.scrollLeft = scrollLeft - walk;
  });

  // Prevent link click if it was a drag
  // Capture also covers archive cards added later, before their button handlers run.
  slider.addEventListener('click', (e) => {
    if (!e.target.closest('.featured-pub-card, .publication-archive-toggle')) return;
    if (isDragging && e.detail !== 0) e.preventDefault();
    isDragging = false;
  }, true);
});

// Copy the public contact address, with an honest manual fallback.
const addressCopyButton = document.querySelector('[data-copy]');
if (addressCopyButton) {
  const status = document.getElementById('address-copy-status');
  const fallback = document.getElementById('address-copy-fallback');
  const text = document.getElementById('address-copy-text');
  addressCopyButton.addEventListener('click', async () => {
    addressCopyButton.disabled = true;
    status.hidden = false;
    status.textContent = '';
    try {
      await navigator.clipboard.writeText(addressCopyButton.dataset.copy);
      fallback.hidden = true;
      status.textContent = 'E-posta adresi kopyalandı.';
    } catch {
      fallback.hidden = false;
      text.value = addressCopyButton.dataset.copy;
      text.focus();
      text.select();
      status.textContent = 'Otomatik kopyalama kullanılamıyor. Aşağıdaki e-posta adresini seçip elle kopyalayabilirsiniz.';
    } finally {
      addressCopyButton.disabled = false;
    }
  });
}

// --- 8. CONTACT FORM HANDLER (local email draft) ---
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  const firstNameInput = document.getElementById('contact-first-name');
  const lastNameInput = document.getElementById('contact-last-name');
  const emailInput = document.getElementById('contact-email');
  const messageInput = document.getElementById('contact-message');
  const submitBtn = document.getElementById('contact-submit-btn');
  const feedbackEl = document.getElementById('form-feedback');
  // Without JavaScript the static mailto alternative remains available.
  const controls = [...contactForm.querySelectorAll('input, textarea, button')];
  controls.forEach(control => { control.disabled = false; });
  const copyButton = document.getElementById('copy-message');
  const copyFallback = document.getElementById('copy-fallback');
  const copyText = document.getElementById('copy-text');
  const recipient = 'h.sahin@btu.edu.tr';
  // Conservative compatibility limit, measured after percent encoding.
  const maxMailtoLength = 1800;
  const makeDraft = () => {
    const name = `${firstNameInput.value.trim()} ${lastNameInput.value.trim()}`;
    const subject = `Web Sitesi İletişim — ${name}`;
    const body = `Ad Soyad: ${name}\r\nGönderen e-posta: ${emailInput.value.trim()}\r\n\r\n${messageInput.value.replace(/\r?\n/g, '\r\n')}`;
    return { subject, body, url: `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
  };
  copyButton.addEventListener('click', async () => {
    const draft = makeDraft();
    const text = `Alıcı: ${recipient}\nKonu: ${draft.subject}\n\n${draft.body}`;
    copyText.value = text;
    copyFallback.hidden = false;
    try {
      await navigator.clipboard.writeText(text);
      feedbackEl.className = 'form-feedback';
      feedbackEl.textContent = 'Taslak kopyalandı. E-posta uygulamanıza yapıştırıp gönderimi kendiniz onaylayın.';
      feedbackEl.hidden = false;
    } catch {
      copyText.focus();
      copyText.select();
      showFailure('Otomatik kopyalama kullanılamıyor. Aşağıdaki taslağı seçip kopyalayabilirsiniz.');
    }
  });

  function showFailure(message) {
    if (!feedbackEl) return;
    feedbackEl.className = 'form-feedback is-error';
    feedbackEl.textContent = message;
    feedbackEl.hidden = false;
  }

  function clearErrors() {
    [firstNameInput, lastNameInput, emailInput, messageInput].forEach(input => {
      if (input) {
        input.classList.remove('has-error');
        input.removeAttribute('aria-invalid');
      }
    });
    ['error-first-name', 'error-last-name', 'error-email', 'error-message'].forEach(id => {
      const errEl = document.getElementById(id);
      if (errEl) errEl.textContent = '';
    });
    if (feedbackEl) {
      feedbackEl.hidden = true;
      feedbackEl.textContent = '';
      feedbackEl.className = 'form-feedback';
    }
  }

  function setError(input, errorId, message) {
    if (input) {
      input.classList.add('has-error');
      input.setAttribute('aria-invalid', 'true');
    }
    const errEl = document.getElementById(errorId);
    if (errEl) errEl.textContent = message;
  }

  [firstNameInput, lastNameInput, emailInput, messageInput].forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        copyFallback.hidden = true;
        input.classList.remove('has-error');
        input.removeAttribute('aria-invalid');
        const errorId = `error-${input.name === 'firstName' ? 'first-name' : input.name === 'lastName' ? 'last-name' : input.name}`;
        const errEl = document.getElementById(errorId);
        if (errEl) errEl.textContent = '';
      });
    }
  });

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const firstName = firstNameInput ? firstNameInput.value.trim() : '';
    const lastName = lastNameInput ? lastNameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const message = messageInput ? messageInput.value.trim() : '';
    let isValid = true;
    if (!firstName) {
      setError(firstNameInput, 'error-first-name', 'Lütfen adınızı giriniz.');
      isValid = false;
    }
    if (!lastName) {
      setError(lastNameInput, 'error-last-name', 'Lütfen soyadınızı giriniz.');
      isValid = false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setError(emailInput, 'error-email', 'Lütfen e-posta adresinizi giriniz.');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setError(emailInput, 'error-email', 'Lütfen geçerli bir e-posta adresi giriniz.');
      isValid = false;
    }
    if (!message) {
      setError(messageInput, 'error-message', 'Lütfen mesajınızı yazınız.');
      isValid = false;
    } else if (message.length < 5) {
      setError(messageInput, 'error-message', 'Lütfen mesajınızı biraz daha detaylandırınız.');
      isValid = false;
    }

    [firstNameInput, lastNameInput, emailInput, messageInput].forEach(input => {
      if (input && input.maxLength > 0 && input.value.length > input.maxLength) {
        const errorId = `error-${input.name === 'firstName' ? 'first-name' : input.name === 'lastName' ? 'last-name' : input.name}`;
        setError(input, errorId, `Lütfen en fazla ${input.maxLength} karakter giriniz.`);
        isValid = false;
      }
    });
    if (!isValid) {
      const firstInvalid = [firstNameInput, lastNameInput, emailInput, messageInput]
        .find(input => input && input.getAttribute('aria-invalid') === 'true');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const draft = makeDraft();
    feedbackEl.className = 'form-feedback';
    feedbackEl.hidden = false;
    if (draft.url.length > maxMailtoLength) {
      copyText.value = `Alıcı: ${recipient}\nKonu: ${draft.subject}\n\n${draft.body}`;
      copyFallback.hidden = false;
      feedbackEl.textContent = 'Mesajınız otomatik aktarım için uzun. Veri kaybını önlemek için taslağı kopyalayıp e-posta uygulamanıza yapıştırın. Hiçbir e-posta gönderilmedi.';
      copyButton.focus();
      return;
    }
    feedbackEl.textContent = 'E-posta uygulamanızın açılması istendi. Gönderimi uygulamada siz onaylayın. Açılmadıysa mesajı kopyalayın veya e-posta bağlantısını kullanın.';
    const link = document.createElement('a');
    link.href = draft.url;
    link.hidden = true;
    contactForm.append(link);
    link.click();
    link.remove();
  });
}
