// Резервный CDN на случай недоступности Google в регионе или сети.
// Версию фиксируем для воспроизводимого поведения на GitHub Pages и localhost.
const sources = [
  'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js',
];
let loaded = false;
const failures = [];
for (const source of sources) {
  try {
    await import(source);
    loaded = true;
    break;
  } catch (error) {
    failures.push({ source, message: String(error) });
    console.warn('Не удалось загрузить библиотеку model-viewer:', source, error);
  }
}
if (!loaded) {
  window.dispatchEvent(new CustomEvent('school:modelviewer-error', { detail: failures }));
}
