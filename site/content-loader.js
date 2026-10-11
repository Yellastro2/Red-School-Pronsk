// Подставляет надписи из JSON, сохраняя исходную HTML-разметку как запасной вариант.
// Работает на GitHub Pages и локальном HTTP-сервере, без сборки и серверного кода.
(async function () {
  const hasBindings = document.querySelector('[data-content], [data-content-src], [data-content-paragraphs]');
  if (!hasBindings) return;

  let data;
  try {
    const response = await fetch('./site/content.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}: site/content.json`);
    data = await response.json();
  } catch (error) {
    console.error('Не удалось загрузить site/content.json, оставляем встроенный текст:', error);
    return;
  }

  function lookup(path) {
    return path.split('.').reduce((value, key) => value == null ? undefined : value[key], data);
  }

  // Только textContent / DOM-атрибуты. JSON не интерпретируется как HTML.
  for (const element of document.querySelectorAll('[data-content]')) {
    const value = lookup(element.dataset.content);
    if (typeof value === 'string' || typeof value === 'number') element.textContent = value;
  }
  for (const attribute of ['src', 'alt', 'href', 'content', 'poster']) {
    for (const element of document.querySelectorAll(`[data-content-${attribute}]`)) {
      const value = lookup(element.getAttribute(`data-content-${attribute}`));
      if (typeof value === 'string') element.setAttribute(attribute, value);
    }
  }
  for (const container of document.querySelectorAll('[data-content-paragraphs]')) {
    const paragraphs = lookup(container.dataset.contentParagraphs);
    if (!Array.isArray(paragraphs) || !paragraphs.every(value => typeof value === 'string')) continue;
    const fragment = document.createDocumentFragment();
    for (const value of paragraphs) {
      const p = document.createElement('p');
      p.textContent = value;
      fragment.appendChild(p);
    }
    container.replaceChildren(fragment);
  }

  if (document.body.classList.contains('page-home')) {
    if (typeof data.home?.seo?.title === 'string') document.title = data.home.seo.title;
    // Штатная кнопка-постер <model-viewer> — это HTML в Shadow DOM.
    // Меняем её фон через CSS-переменную, чтобы путь из JSON тоже работал.
    const poster = data.home?.model?.poster;
    const posterButton = document.querySelector('.model-poster');
    if (posterButton && typeof poster === 'string' && poster) {
      const absoluteURL = new URL(poster, document.baseURI).href;
      posterButton.style.setProperty('--model-poster-image', `url(${JSON.stringify(absoluteURL)})`);
    }
  }
})();
