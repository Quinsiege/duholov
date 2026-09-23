'use strict';
/* Резервная копия прогресса: файл JSON с контрольной суммой */

const Backup = {
  sum(data) { return U.h('duholov-backup', JSON.stringify(data)).toFixed(15); },
  fileName() { return `duholov-${S.d.name.replace(/[^\wа-яё-]/gi, '_')}-${U.today()}.json`; },

  async save() {
    const payload = { app: 'duholov', v: '1.5', t: Date.now(), sum: this.sum(S.d), data: S.d };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const file = new File([blob], this.fileName(), { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Духолов: резервная копия' }); UI.toast('Копия готова', 'good'); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    Album.download(blob, this.fileName());
  },

  async load(file) {
    let p;
    try { p = JSON.parse(await file.text()); } catch (e) { UI.toast('Не удалось прочитать файл'); return; }
    if (!p || p.app !== 'duholov' || !p.data || !Array.isArray(p.data.spirits)) { UI.toast('Это не резервная копия Духолова'); return; }
    if (p.sum !== this.sum(p.data)) { UI.toast('Файл повреждён или изменён'); return; }
    const d = p.data;
    UI.confirm('Восстановить копию?',
      `Текущий прогресс (${U.esc(S.d.name)}, ур. ${S.d.level}, духов: ${S.d.spirits.length}) будет заменён копией от ${new Date(p.t).toLocaleString('ru-RU')}: ${U.esc(d.name)}, ур. ${d.level}, духов: ${d.spirits.length}.`,
      'Восстановить', () => {
        S.d = d; S.migrate(); S.save(true);
        location.reload();
      }, 'Отмена', true);
  },
};
