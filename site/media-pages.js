(async function () {
  const key = document.body.dataset.collection;
  if (!key) return;
  let items;
  let plans = [];
  try {
    const response = await fetch('./site/media.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}: site/media.json`);
    const media = await response.json();
    if (!Array.isArray(media[key])) throw new Error(`Нет раздела ${key} в media.json`);
    items = media[key];
    if (key === 'archive') plans = Array.isArray(media.plans) ? media.plans : [];
  } catch (error) {
    console.error('Не удалось прочитать каталог изображений:', error);
    const grid = document.getElementById('media-grid');
    if (grid) grid.textContent = 'Не удалось загрузить каталог. Проверьте файл site/media.json и запустите сайт через HTTP.';
    return;
  }
  const grid = document.getElementById('media-grid');
  const controls = document.getElementById('media-filters');
  const count = document.getElementById('media-count');
  const sortControl = document.getElementById('media-sort');
  const lightbox = document.getElementById('media-lightbox');
  const content = document.getElementById('lightbox-content');
  const categories = key === 'gallery' ? [['all', 'Все'], ['school', 'Школа'], ['pronsk', 'Пронск'], ['video', 'Видео']]
    : key === 'archive' ? [['all', 'Все'], ['docs', 'Документы'], ['maps', 'Карты и планы'], ['print', 'Публикации']]
    : [['all', 'Все фотографии']];
  let filtered = items;
  let currentCategory = 'all';
  if (sortControl) {
    sortControl.querySelector('option[value="original"]')?.remove();
    sortControl.value = 'oldest';
  }
  let sortMode = sortControl?.value || 'oldest';
  const validYear = item => Number.isInteger(item.year) && item.year > 0;
  const yearLabel = item => validYear(item) ? `${item.yearApprox ? 'ок. ' : ''}${item.year} г.` : '';
  // Материалы без года в любом направлении остаются в конце.
  function sortItems(list) {
    return list.sort((a, b) => {
      const aKnown = validYear(a), bKnown = validYear(b);
      if (!aKnown && !bKnown) return 0;
      if (!aKnown) return 1;
      if (!bKnown) return -1;
      return sortMode === 'oldest' ? a.year - b.year : b.year - a.year;
    });
  }
  let activeIndex = 0;
  let activeList = [];
  const zoomButton = document.getElementById('lightbox-zoom');
  let focusBefore = null;
  function textElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text;
    return node;
  }
  function render(category) {
    currentCategory = category;
    filtered = sortItems(category === 'all' ? [...items] : items.filter(x => x.category === category));
    controls.replaceChildren();
    categories.forEach(([id,label]) => {
      const b = textElement('button', 'filter-button'+(category === id?' active':''), label);
      b.type='button';b.setAttribute('aria-pressed',String(category===id));
      b.addEventListener('click',()=>render(id));
      controls.append(b);
    });
    count.textContent = `МАТЕРИАЛОВ: ${filtered.length}`;
    grid.replaceChildren();
    filtered.forEach((item, i) => {
      const b = document.createElement('button');
      b.type='button'; b.className='media-card';b.setAttribute('aria-label',`Открыть: ${item.title}`);
      b.style.textAlign='left';b.style.padding='0';b.style.color='inherit';b.style.font='inherit';
      if (item.type === 'video') {
        const thumb=document.createElement('video');thumb.className='media-thumb';thumb.src=item.src+'#t=0.1';thumb.preload='metadata';thumb.muted=true;thumb.playsInline=true;b.append(thumb);
      } else {
        const img=document.createElement('img');img.className='media-thumb';img.loading=i<4?'eager':'lazy';img.decoding='async';img.src=item.src;img.alt=item.title;b.append(img);
      }
      const meta=document.createElement('div');meta.className='media-meta';
      const info=document.createElement('div');
      if (validYear(item)) info.append(textElement('div','media-year',yearLabel(item)));
      info.append(textElement('h3','',item.title),textElement('p','',item.source|| (item.type === 'video'?'Видеоматериал':'Из коллекции проекта')));
      meta.append(info,textElement('span','media-arrow',item.type==='video'?'▶':'↗'));b.append(meta);
      b.addEventListener('click',()=>open(i));grid.append(b);
    });
    if(!filtered.length) grid.append(textElement('p','media-empty','В этом разделе пока нет материалов.'));
  }
  function renderPlans() {
    const target = document.getElementById('plans-grid');
    if (!target) return;
    target.replaceChildren();
    const plansCount = document.getElementById('plans-count');
    if (plansCount) plansCount.textContent = `ПЛАНОВ: ${plans.length}`;
    plans.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'media-card plan-card';
      button.setAttribute('aria-label', `Рассмотреть план: ${item.title}`);
      const figure = document.createElement('div');
      figure.className = 'plan-figure';
      const img = document.createElement('img');
      img.className = 'plan-thumb';
      img.src = item.src;
      img.alt = item.title;
      img.loading = index < 2 ? 'eager' : 'lazy';
      img.decoding = 'async';
      figure.append(img);
      const meta = document.createElement('div');
      meta.className = 'media-meta';
      const info = document.createElement('div');
      info.append(textElement('h3', '', item.title), textElement('p', '', 'Открыть и увеличить план'));
      meta.append(info, textElement('span', 'media-arrow', '↗'));
      button.append(figure, meta);
      button.addEventListener('click', () => open(index, plans));
      target.append(button);
    });
    if (!plans.length) target.append(textElement('p','media-empty','Планы пока не добавлены в каталог.'));
  }
  function resetZoom() {
    content.classList.remove('plans-zoomed');
    if (zoomButton) {
      zoomButton.setAttribute('aria-pressed', 'false');
      zoomButton.textContent = 'Увеличить +';
    }
    content.scrollTop = 0;
    content.scrollLeft = 0;
  }
    function show() {
    const item=activeList[activeIndex];
    resetZoom();
    if (zoomButton) zoomButton.hidden = activeList !== plans || item.type !== 'image';
    const countLabel=`${activeIndex+1} / ${activeList.length}`;
    document.getElementById('lightbox-counter').textContent=countLabel;
    const date = document.getElementById('lightbox-date');
    if (date) { date.textContent = yearLabel(item); date.hidden = !validYear(item); }
    document.getElementById('lightbox-title').textContent=item.title;
    document.getElementById('lightbox-desc').textContent=item.description||'';
    const source=document.getElementById('lightbox-source');source.replaceChildren();
    if(item.source) {
      source.append(textElement('span','',`Источник: ${item.source}`));
    } else {
      source.append(textElement('span','','Источник не указан'));
    }
    if(item.sourceUrl && /^https:\/\//.test(item.sourceUrl)){
      source.append(document.createTextNode(' · '));
      const a=textElement('a','','Перейти к первоисточнику ↗');a.href=item.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';source.append(a);
    }
    source.append(document.createTextNode(' · '));
    const original=textElement('a','','Открыть оригинал ↗');original.href=item.src;original.target='_blank';original.rel='noopener';source.append(original);
    content.replaceChildren();
    if(item.type === 'video'){
      const v=document.createElement('video');v.src=item.src;v.controls=true;v.autoplay=true;v.playsInline=true;v.preload='metadata';content.append(v);
    } else {
      const img=document.createElement('img');img.src=item.src;img.alt=item.title;content.append(img);
    }
  }
  function open(index, list=filtered){activeList=list;activeIndex=index;focusBefore=document.activeElement;lightbox.classList.add('visible');lightbox.setAttribute('aria-hidden','false');document.body.classList.add('dialog-open');show();document.getElementById('lightbox-close').focus();}
  function close(){if(!lightbox.classList.contains('visible'))return;lightbox.classList.remove('visible');lightbox.setAttribute('aria-hidden','true');document.body.classList.remove('dialog-open');resetZoom();content.replaceChildren();focusBefore?.focus();}
  function step(dir){if(!activeList.length)return;activeIndex=(activeIndex+dir+activeList.length)%activeList.length;show();}
  zoomButton?.addEventListener('click', () => {
    const zoomed = content.classList.toggle('plans-zoomed');
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    zoomButton.textContent = zoomed ? 'Уместить −' : 'Увеличить +';
    if (!zoomed) { content.scrollTop = 0; content.scrollLeft = 0; }
  });
  document.getElementById('lightbox-close').addEventListener('click',close);
  document.getElementById('lightbox-prev').addEventListener('click',()=>step(-1));
  document.getElementById('lightbox-next').addEventListener('click',()=>step(1));
  lightbox.addEventListener('click',e=>{if(e.target===lightbox || e.target.id==='lightbox-stage')close();});
  document.addEventListener('keydown',e=>{
    if(!lightbox.classList.contains('visible'))return;
    if(e.key==='Escape')close();else if(e.key==='ArrowLeft')step(-1);else if(e.key==='ArrowRight')step(1);
    else if(e.key==='Tab'){
      const controls=[...lightbox.querySelectorAll('button, a[href], video[controls]')].filter(el=>el.offsetParent !== null);
      const first=controls[0],last=controls.at(-1);
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
    }
  });
  sortControl?.addEventListener('change', () => { sortMode = sortControl.value; render(currentCategory); });
  render('all');
  if (key === 'archive') renderPlans();
})();
