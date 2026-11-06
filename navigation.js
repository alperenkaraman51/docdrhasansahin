// Parser-blocking head entry: enhance only after the menu's own handlers are ready.
// If this file fails, the static no-js navigation remains visible and usable.
(() => {
  if (window.siteMenu) return;
  const enhance = () => {
    const header = document.querySelector('.site-header');
    const navigation = document.querySelector('#site-navigation');
    const menuButton = document.querySelector('.menu-toggle');
    if (!header || !navigation || !menuButton) return false;
    const compactHeader = window.matchMedia('(max-width: 1100px)');
    const updateHeaderHeightVar = () => {
      const focused = document.activeElement;
      const wasHidden = navigation.hidden;
      const wasScrolled = header.classList.contains('is-scrolled');
      const inner = header.querySelector('.header-inner');
      if (!inner) return;
      const transition = inner.style.transition;
      inner.style.transition = 'none';
      document.documentElement.style.removeProperty('--header-height');
      header.classList.remove('is-scrolled');
      if (compactHeader.matches) navigation.hidden = true;
      document.documentElement.style.setProperty('--header-height', `${inner.offsetHeight}px`);
      navigation.hidden = wasHidden;
      header.classList.toggle('is-scrolled', wasScrolled);
      void inner.offsetHeight;
      inner.style.transition = transition;
      if (!wasHidden && navigation.contains(focused)) focused.focus({ preventScroll: true });
    };
    const setMenu = open => {
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
      navigation.hidden = compactHeader.matches && !open;
    };
    const syncMenu = () => {
      const focused = document.activeElement;
      menuButton.hidden = !compactHeader.matches;
      setMenu(false);
      if (compactHeader.matches && navigation.contains(focused)) menuButton.focus();
      if (!compactHeader.matches && focused === menuButton) navigation.querySelector('a')?.focus();
      updateHeaderHeightVar();
    };
    menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    navigation.addEventListener('click', event => {
      if (event.target.closest('a[href]')) setMenu(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && compactHeader.matches && menuButton.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuButton.focus();
      }
    });
    compactHeader.addEventListener('change', syncMenu);
    window.addEventListener('resize', updateHeaderHeightVar, { passive: true });
    window.addEventListener('load', updateHeaderHeightVar);
    // These changes share one pre-paint task; no ready-looking inert control.
    document.documentElement.classList.remove('no-js');
    syncMenu();
    window.siteMenu = { setMenu };
    document.documentElement.dataset.navigationReady = 'true';
    return true;
  };
  if (!enhance()) {
    const observer = new MutationObserver(() => {
      if (enhance()) observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  }
})();
