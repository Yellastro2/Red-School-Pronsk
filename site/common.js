(function () {
  const copy = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], window.redSchoolContent?.ui) ?? fallback;
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? copy('menu.close', 'Закрыть меню') : copy('menu.open', 'Открыть меню'));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }
  const panel = document.getElementById('model-section');
  if (!panel) return;
  const expand = document.getElementById('expand-model');
  const fullscreen = document.getElementById('fullscreen-model');
  const close = document.getElementById('close-model');
  const model = document.getElementById('school-model');
  function isFullscreen() { return document.fullscreenElement === panel; }
  function sync() {
    const opened = panel.classList.contains('expanded') || isFullscreen();
    document.body.classList.toggle('dialog-open', opened);
    expand?.setAttribute('aria-label', opened ? copy('model.collapseAria', 'Свернуть 3D-просмотрщик') : copy('model.expandAria', 'Развернуть 3D-просмотрщик'));
    if (expand) expand.querySelector('.tool-label').textContent = opened ? copy('model.collapseLabel', 'Свернуть') : copy('model.expandLabel', 'Развернуть');
    if (fullscreen) fullscreen.setAttribute('aria-label', isFullscreen() ? copy('model.exitFullscreenAria', 'Выйти из полноэкранного режима') : copy('model.fullscreenAria', 'Включить полноэкранный режим'));
  }
  function exitView() {
    panel.classList.remove('expanded');
    if (isFullscreen() && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    sync();
  }
  expand?.addEventListener('click', () => {
    if (isFullscreen()) { exitView(); return; }
    panel.classList.toggle('expanded');
    sync();
  });
  fullscreen?.addEventListener('click', async () => {
    if (isFullscreen()) { await document.exitFullscreen().catch(() => {}); sync(); return; }
    if (panel.requestFullscreen) {
      try { await panel.requestFullscreen(); sync(); return; } catch (_) { /* На iOS используем развёрнутый режим */ }
    }
    panel.classList.add('expanded');
    sync();
  });
  close?.addEventListener('click', exitView);
  window.addEventListener('redschool:content-ready', sync);
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('expanded')) exitView(); });
  // model-viewer 4.x: reveal принимает только auto или manual.
  // При manual для пользовательской кнопки требуется явный dismissPoster().
  const posterButton = model?.querySelector('.model-poster');
  const status = document.getElementById('model-status');
  let modelLoading = false;
  let modelLoaded = false;
  let waitHandle = null;

  function showModelStatus(message, isError = false) {
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle('is-error', isError);
  }

  function loadModel() {
    if (!model || modelLoading || modelLoaded) return;
    modelLoading = true;
    if (posterButton) {
      posterButton.disabled = true;
      const label = posterButton.querySelector('.poster-label strong');
      if (label) label.textContent = copy('model.loadingPoster', 'Загружаем реконструкцию…');
    }
    showModelStatus(copy('model.preparing', 'Подготавливаем 3D-просмотрщик…'));
    // Если CDN недоступен, не оставляем посетителя с бесконечной загрузкой.
    waitHandle = setTimeout(() => {
      if (!modelLoaded) showModelStatus(copy('model.slow', 'Модель долго загружается. Проверьте соединение и доступность файла red_school1_2.glb.'), true);
    }, 20000);
    customElements.whenDefined('model-viewer').then(() => {
      if (!modelLoaded) {
        showModelStatus(copy('model.loading', 'Загрузка 3D-модели…'));
        model.dismissPoster();
      }
    });
  }

  posterButton?.addEventListener('click', loadModel);
  model?.addEventListener('load', () => {
    modelLoaded = true;
    modelLoading = false;
    if (waitHandle) clearTimeout(waitHandle);
    showModelStatus('');
  });
  model?.addEventListener('error', event => {
    console.error('Не удалось открыть 3D-модель:', event.detail || event);
    if (waitHandle) clearTimeout(waitHandle);
    modelLoading = false;
    if (posterButton) {
      posterButton.disabled = false;
      const label = posterButton.querySelector('.poster-label strong');
      if (label) label.textContent = copy('model.retry', 'Попробовать загрузить 3D снова');
    }
    if (typeof model.showPoster === 'function') model.showPoster();
    showModelStatus(copy('model.failed', 'Не удалось загрузить 3D-модель. Убедитесь, что файл red_school1_2.glb лежит рядом с index.html, а сайт открыт через http://localhost или HTTPS.'), true);
  });
  window.addEventListener('school:modelviewer-error', event => {
    if (waitHandle) clearTimeout(waitHandle);
    modelLoading = false;
    if (posterButton) {
      posterButton.disabled = false;
      const label = posterButton.querySelector('.poster-label strong');
      if (label) label.textContent = copy('model.unavailable', 'Библиотека 3D недоступна');
    }
    showModelStatus(copy('model.cdnError', 'Библиотека 3D-просмотра недоступна. Проверьте интернет или блокировку Google CDN и cdnjs.'), true);
    console.error('model-viewer CDN:', event.detail);
  });
  model?.addEventListener('progress', e => {
    const bar = model.querySelector('.model-progress-bar');
    if (bar) bar.style.width = `${Math.round((e.detail?.totalProgress ?? 0) * 100)}%`;
  });
})();
