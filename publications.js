// Progressive enhancement: the seven editorial cards and BTÜ link work without JS.
(() => {
  const gallery = document.getElementById('publication-gallery');
  const archive = globalThis.publicationArchive;
  if (!gallery || !archive) return;
  const selected = [...gallery.querySelectorAll('.featured-pub-card')];
  const byId = new Map(archive.publications.map(publication => [publication.id, publication]));
  if (selected.length !== archive.selectedIds.length || selected.some((card, i) =>
    card.dataset.publicationId !== archive.selectedIds[i] || !byId.has(card.dataset.publicationId))) return;

  const selectedIds = new Set(archive.selectedIds);
  const remaining = archive.publications.filter(publication => !selectedIds.has(publication.id))
    .sort((a, b) => b.year - a.year || a.sourceRecords[0] - b.sourceRecords[0]);
  if (!remaining.length) return;
  let expanded = false;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  // BTÜ occasionally lists the publisher institution in its journal field.
  const journalName = publication => publication.verification.publisherJournal || publication.journal;
  const fallback = publication => {
    const cover = element('div', 'pub-img text-cover publication-type-cover', journalName(publication));
    cover.setAttribute('role', 'img');
    cover.setAttribute('aria-label', journalName(publication) + ' — tipografik kapak; makale görseli değildir');
    return cover;
  };
  const card = publication => {
    const link = element('a', 'featured-pub-card');
    link.dataset.publicationId = publication.id;
    link.dataset.archiveExtra = '';
    link.href = publication.articleUrl || publication.sourceProfile;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const frame = element('div', 'pub-image-wrapper');
    if (publication.image.src) {
      const image = element('img', 'pub-img publication-figure');
      image.loading = 'lazy';
      image.decoding = 'async';
      image.alt = publication.title + ' — ' + publication.image.figure;
      image.src = publication.image.src;
      frame.append(image);
    } else frame.append(fallback(publication));
    const meta = element('div', 'pub-meta');
    meta.append(element('span', '', String(publication.year)), element('span', '', journalName(publication)));
    link.append(frame, meta, element('h4', 'pub-title-hover', publication.title),
      element('span', 'editorial-link', publication.articleUrl ? 'Makaleyi İncele ↗' : 'BTÜ Yayın Listesinde Gör ↗'));
    return link;
  };
  // Failed local image loads keep a meaningful cover instead of a broken image.
  const replaceFailedImage = image => {
    const publication = byId.get(image.closest('[data-publication-id]')?.dataset.publicationId);
    if (publication) image.replaceWith(fallback(publication));
  };
  gallery.addEventListener('error', event => {
    if (event.target.matches('img.pub-img')) replaceFailedImage(event.target);
  }, true);
  gallery.querySelectorAll('img').forEach(image => {
    if (image.complete && !image.naturalWidth) replaceFailedImage(image);
  });

  const tools = element('div', 'publication-archive-tools');
  const count = element('p', 'publication-archive-count',
    selected.length + ' seçilmiş / ' + archive.publications.length + ' benzersiz makale');
  const scope = element('p', 'publication-archive-count',
    'Kapsam: BTÜ ' + archive.sourceCategory + ' listesi · ' + archive.checkedAt +
    '. Bildiriler, kitaplar ve projeler bu galeriye dahil değildir.');
  scope.id = 'publication-archive-scope';
  gallery.setAttribute('aria-describedby', scope.id);
  const controls = element('div', 'publication-archive-controls');
  const previous = element('button', '', '←');
  const next = element('button', '', '→');
  for (const [button, label] of [[previous, 'Önceki yayınlar'], [next, 'Sonraki yayınlar']]) {
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-controls', gallery.id);
    controls.append(button);
  }
  tools.append(count, controls);
  gallery.before(tools);
  tools.before(scope);
  const status = element('p', 'publication-archive-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  gallery.after(status);

  const toggle = element('button', 'publication-archive-toggle');
  toggle.type = 'button';
  const cover = element('span', 'pub-image-wrapper text-cover', '+');
  cover.setAttribute('aria-hidden', 'true');
  const label = element('span', 'pub-title-hover', 'Tüm Yayınları Gör');
  const detail = element('span', 'publication-archive-detail', remaining.length + ' diğer yayın');
  toggle.append(cover, label, detail);
  gallery.append(toggle);

  const actions = element('div', 'publication-archive-actions');
  const topToggle = element('button', 'publication-archive-button', 'Tüm Makaleleri Gör');
  topToggle.type = 'button';
  for (const button of [topToggle, toggle]) {
    button.setAttribute('aria-controls', gallery.id);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-describedby', scope.id);
  }
  const yearNavigation = element('div', 'publication-year-navigation');
  yearNavigation.hidden = true;
  const yearLabel = element('label', '', 'Yıla Git');
  yearLabel.htmlFor = 'publication-year';
  const yearSelect = element('select');
  yearSelect.id = 'publication-year';
  yearSelect.setAttribute('aria-controls', gallery.id);
  const prompt = element('option', '', 'Yıl seçin');
  prompt.value = '';
  yearSelect.append(prompt);
  [...new Set(archive.publications.map(publication => publication.year))]
    .sort((a, b) => b - a).forEach(year => {
      const option = element('option', '', String(year));
      option.value = String(year);
      yearSelect.append(option);
    });
  yearNavigation.append(yearLabel, yearSelect);
  actions.append(topToggle, yearNavigation);
  scope.before(actions);

  const updateControls = () => {
    previous.disabled = gallery.scrollLeft <= 1;
    next.disabled = gallery.scrollLeft >= gallery.scrollWidth - gallery.clientWidth - 1;
  };
  const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
  const scrollHorizontallyTo = target => gallery.scrollTo({
    left: gallery.scrollLeft + target.getBoundingClientRect().left - gallery.getBoundingClientRect().left,
    behavior: motion()
  });
  previous.addEventListener('click', () => gallery.scrollBy({ left: -gallery.clientWidth, behavior: motion() }));
  next.addEventListener('click', () => gallery.scrollBy({ left: gallery.clientWidth, behavior: motion() }));
  gallery.addEventListener('scroll', updateControls, { passive: true });
  window.addEventListener('resize', updateControls);
  const toggleArchive = event => {
    if (event.defaultPrevented) return; // A mouse drag is not an expansion request.
    expanded = !expanded;
    if (expanded) {
      const fragment = document.createDocumentFragment();
      remaining.forEach(publication => fragment.append(card(publication)));
      gallery.insertBefore(fragment, toggle);
    } else gallery.querySelectorAll('[data-archive-extra]').forEach(node => node.remove());
    for (const button of [topToggle, toggle]) button.setAttribute('aria-expanded', String(expanded));
    topToggle.textContent = expanded ? 'Seçilmiş Yayınlara Dön' : 'Tüm Makaleleri Gör';
    yearNavigation.hidden = !expanded;
    yearSelect.value = '';
    label.textContent = expanded ? 'Seçilmiş Yayınlara Dön' : 'Tüm Yayınları Gör';
    detail.textContent = expanded ? selected.length + ' seçilmiş yayın' : remaining.length + ' diğer yayın';
    count.textContent = (expanded ? archive.publications.length : selected.length) +
      ' / ' + archive.publications.length + ' benzersiz makale';
    status.textContent = expanded
      ? remaining.length + ' yayın eklendi. Ek yayınlar yeniden eskiye sıralandı.'
      : 'Seçilmiş yayınlara dönüldü.';
    // The upper control keeps its focus; the end card retains keyboard traversal.
    const target = expanded ? gallery.querySelector('[data-archive-extra]') : selected[0];
    (event.currentTarget === topToggle ? topToggle : target).focus({ preventScroll: true });
    if (expanded && event.currentTarget === topToggle) scrollHorizontallyTo(target);
    else if (expanded) target.scrollIntoView({ block: 'nearest', inline: 'start', behavior: motion() });
    else gallery.scrollTo({ left: 0, behavior: motion() });
    updateControls();
  };
  topToggle.addEventListener('click', toggleArchive);
  toggle.addEventListener('click', toggleArchive);
  yearSelect.addEventListener('change', () => {
    if (!expanded || !yearSelect.value) return;
    // Keep the editorial order: the first matching card may be selected already.
    const target = [...gallery.querySelectorAll('.featured-pub-card')].find(link =>
      String(byId.get(link.dataset.publicationId).year) === yearSelect.value);
    if (!target) return;
    scrollHorizontallyTo(target);
    // Native select keyboard use remains uninterrupted; only the scrollport moves.
    status.textContent = yearSelect.value + ' yılının ilk makalesi: ' + byId.get(target.dataset.publicationId).title;
  });
  updateControls();

  // Attribution is available on the page without nesting links inside a card link.
  const sources = element('details', 'publication-image-sources');
  sources.append(element('summary', '', 'Makale görselleri: kaynaklar ve lisanslar'));
  const list = element('ul');
  for (const publication of archive.publications.filter(publication => publication.image.src)) {
    const image = publication.image;
    const item = element('li');
    const source = element('a', '', image.attribution + ' · ' + publication.title + ' · ' + image.figure);
    source.href = image.sourceUrl;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    const license = element('a', '', image.license);
    license.href = image.licenseUrl;
    license.target = '_blank';
    license.rel = 'noopener noreferrer';
    item.append(source, document.createTextNode(' — '), license,
      document.createTextNode('. ' + image.changes));
    list.append(item);
  }
  sources.append(list);
  status.after(sources);
})();
