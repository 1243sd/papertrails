import { readTreasurePack } from './treasure-pack.js';
import { createTreasureStorage } from './treasure-storage.js';
import { createTreasureCompanions } from './treasure-companions.js';
import { createTreasureStage } from './treasure-stage.js';

export function createTreasureUI(root, onClose, { onPack, storage = createTreasureStorage() } = {}) {
  const prompt = document.createElement('div');
  prompt.className = 'treasure-prompt';
  prompt.setAttribute('role', 'status');
  prompt.hidden = true;
  const dialog = document.createElement('dialog');
  dialog.className = 'treasure-dialog';
  dialog.setAttribute('aria-labelledby', 'treasure-title');
  const title = document.createElement('h2');
  title.id = 'treasure-title';
  const caption = document.createElement('div');
  caption.className = 'treasure-caption';
  const content = document.createElement('div');
  content.className = 'treasure-content';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '关闭';
  button.className = 'treasure-close';
  const companions = createTreasureCompanions();
  const stage = createTreasureStage();
  const header = document.createElement('header');
  header.className = 'treasure-header';
  const heading = document.createElement('div');
  heading.append(caption, title);
  header.append(heading);
  const footer = document.createElement('footer');
  footer.className = 'treasure-footer';
  footer.append(companions.element, button);
  const paper = document.createElement('div');
  paper.className = 'treasure-paper';
  paper.append(stage.element, header, content, footer);
  const scroll = document.createElement('div');
  scroll.className = 'treasure-scroll';
  scroll.append(paper);
  dialog.append(scroll);
  root.append(prompt, dialog);
  const upload = document.createElement('input');
  upload.type = 'file';
  upload.accept = '.zip,application/zip';
  upload.setAttribute('aria-label', '选择 ZIP 宝藏包');
  const uploadLabel = document.createElement('label');
  uploadLabel.className = 'treasure-upload';
  uploadLabel.append('选择 ZIP 宝藏包', upload);
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  let pack = null;
  let storageError = '';
  let loading = true;
  let importing = false;
  let disposed = false;
  let shown = null;
  let imageUrl = '';

  function clearImage() {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = '';
  }

  function currentStatus() {
    return storageError || (pack ? '当前宝藏包：' + pack.manifest.title : '尚未导入宝藏包。');
  }

  function renderTreasure(id, theme) {
    clearImage();
    const item = pack?.manifest.treasures[id];
    title.textContent = item?.title || theme.title;
    content.replaceChildren();
    if (!item) {
      content.textContent = loading ? '正在取出礼物…' : '这份礼物还没放进去。';
      return;
    }
    const image = document.createElement('img');
    image.alt = theme.title + '的照片';
    imageUrl = URL.createObjectURL(pack.images[item.image]);
    image.src = imageUrl;
    const photo = document.createElement('figure');
    photo.className = 'treasure-photo';
    photo.append(image);
    const text = document.createElement('p');
    text.className = 'treasure-message';
    text.textContent = item.message;
    content.append(photo, text);
  }

  storage.load().then((saved) => {
    if (disposed) return;
    loading = false;
    pack = saved;
    onPack?.(pack, pack ? 'ready' : 'empty');
    if (shown) renderTreasure(shown.id, shown.theme);
    else if (!importing) status.textContent = currentStatus();
  }).catch((error) => {
    if (disposed) return;
    loading = false;
    storageError = error.message;
    onPack?.(null, 'error');
    if (shown) renderTreasure(shown.id, shown.theme);
    else if (!importing) status.textContent = currentStatus();
  });

  const onImport = async () => {
    const file = upload.files[0];
    if (!file || importing) return;
    importing = true;
    upload.disabled = true;
    status.dataset.error = 'false';
    status.textContent = '正在检查宝藏包…';
    try {
      const loaded = await readTreasurePack(file);
      if (disposed) return;
      await storage.replace(loaded);
      if (disposed) return;
      pack = loaded;
      storageError = '';
      onPack?.(pack, 'ready');
      status.textContent = '已导入：' + pack.manifest.title;
      if (shown) renderTreasure(shown.id, shown.theme);
    } catch (error) {
      status.dataset.error = 'true';
      status.textContent = error.message || '导入失败，请检查宝藏包。';
    } finally {
      importing = false;
      upload.disabled = false;
      upload.value = '';
    }
  };
  upload.addEventListener('change', onImport);

  const close = () => {
    if (!dialog.open) return;
    dialog.close();
    companions.hide();
    stage.hide();
    shown = null;
    clearImage();
    content.replaceChildren();
    onClose();
  };
  const cancel = (event) => {
    event.preventDefault();
    close();
  };
  button.addEventListener('click', close);
  dialog.addEventListener('cancel', cancel);

  return {
    get open() { return dialog.open; },
    prompt(text) {
      prompt.hidden = !text;
      if (prompt.textContent !== text) prompt.textContent = text;
    },
    showTreasure(id, theme) {
      shown = { id, theme };
      dialog.dataset.season = id;
      dialog.style.setProperty('--season-color', theme.color);
      caption.textContent = theme.title;
      renderTreasure(id, theme);
      if (!dialog.open) dialog.showModal();
      header.append(companions.element);
      companions.show();
      stage.show(id);
      scroll.scrollTop = 0;
      button.focus({ preventScroll: true });
    },
    showImport() {
      clearImage();
      companions.hide();
      stage.hide();
      shown = null;
      dialog.dataset.season = 'import';
      dialog.style.removeProperty('--season-color');
      title.textContent = '导入宝藏包';
      caption.textContent = '';
      if (!importing) {
        status.dataset.error = String(!!storageError);
        status.textContent = currentStatus();
      }
      const description = document.createElement('p');
      description.textContent = '四季的文字、照片和冬季视频会保存在此浏览器。';
      content.replaceChildren(description, uploadLabel, status);
      if (!dialog.open) dialog.showModal();
      upload.focus();
    },
    close,
    dispose() {
      disposed = true;
      close();
      storage.dispose();
      upload.removeEventListener('change', onImport);
      button.removeEventListener('click', close);
      dialog.removeEventListener('cancel', cancel);
      prompt.remove();
      dialog.remove();
    },
  };
}
