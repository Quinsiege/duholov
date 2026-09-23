'use strict';
/* Альбом: последние 12 снимков духов (уменьшенные копии хранятся на устройстве) */

const Album = {
  KEY: 'duholov.album',
  MAX: 12,
  list() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (e) { return []; } },
  store(arr) {
    // если места мало — выбрасываем старые снимки, пока не поместится
    while (arr.length) {
      try { localStorage.setItem(this.KEY, JSON.stringify(arr)); return; } catch (e) { arr.pop(); }
    }
    try { localStorage.removeItem(this.KEY); } catch (e) {}
  },
  add(p) { const a = this.list(); a.unshift(p); this.store(a.slice(0, this.MAX)); },
  remove(i) { const a = this.list(); a.splice(i, 1); this.store(a); },

  async blobFromData(dataUrl) { return (await fetch(dataUrl)).blob(); },
  async share(blob, name) {
    const file = new File([blob], name, { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Духолов', text: 'Смотри, кого я поймал в Духолове!' }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    this.download(blob, name);
  },
  download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    UI.toast('Снимок сохранён', 'good');
  },
  preview(blob, name) {
    const url = URL.createObjectURL(blob);
    UI.modal({
      title: 'Снимок', cls: 'photo-modal',
      html: `<img class="photo-img" src="${url}" alt="Снимок духа"><p class="small">Копия добавлена в альбом (Профиль → Альбом).</p>`,
      buttons: [
        { label: 'Сохранить', keep: true, fn: () => this.download(blob, name) },
        { label: 'Поделиться', cls: 'primary', keep: true, fn: () => this.share(blob, name) },
      ],
    });
  },
  open(i) {
    const p = this.list()[i]; if (!p) return;
    const m = UI.modal({
      title: SP[p.sid] ? SP[p.sid].name : 'Снимок', cls: 'photo-modal',
      html: `<img class="photo-img" src="${p.img}" alt=""><p class="small">${new Date(p.t).toLocaleString('ru-RU')}</p>`,
      buttons: [
        { label: 'Удалить', cls: 'danger', fn: () => { this.remove(i); UI.toast('Снимок удалён'); } },
        { label: 'Поделиться', cls: 'primary', keep: true, fn: async () => this.share(await this.blobFromData(p.img), 'duholov.jpg') },
      ],
    });
    return m;
  },
  html() {
    const a = this.list();
    return a.length ? `<div class="album">${a.map((p, i) => `<button class="album-item" data-i="${i}"><img src="${p.img}" alt=""></button>`).join('')}</div>`
      : '<div class="prof-buddy empty-b">Снимков пока нет. Нажми на камеру во время встречи с духом.</div>';
  },
};
