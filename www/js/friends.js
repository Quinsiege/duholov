'use strict';
/* Друзья без сервера: коды дружбы (DUHF1) и подарков (DUHG1).
   Подарок адресован конкретному другу, открывается один раз, от каждого друга — раз в день. */

const Friends = {
  pack(prefix, obj) {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `${prefix}.${b64}.${Math.floor(U.h('duholov-' + prefix, b64) * 2176782336).toString(36).padStart(6, '0')}`;
  },
  unpack(prefix, code) {
    const m = String(code).replace(/\s+/g, '').match(new RegExp(prefix + '\\.([A-Za-z0-9_-]+)\\.([0-9a-z]{6})'));
    if (!m) return null;
    if (Math.floor(U.h('duholov-' + prefix, m[1]) * 2176782336).toString(36).padStart(6, '0') !== m[2]) throw new Error('Код повреждён — скопируй его целиком');
    try {
      const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(escape(atob(b64 + '='.repeat((4 - b64.length % 4) % 4)))));
    } catch (e) { throw new Error('Не удалось прочитать код'); }
  },

  myCode() { return this.pack('DUHF1', { i: S.d.pid, n: S.d.name, l: S.d.level }); },
  level(f) { let r = 0; FRIEND_LEVELS.forEach((x, i) => { if (f.pts >= x.pts) r = i; }); return r; },
  find(id) { return S.d.friends.find(f => f.id === id); },

  addPoint(f) {
    const before = this.level(f);
    f.pts++;
    const after = this.level(f);
    if (after > before) {
      const L = FRIEND_LEVELS[after];
      S.addXP(L.xp);
      UI.toast(`Дружба с ${U.esc(f.name)}: теперь «${L.name}»! +${U.fmtNum(L.xp * Ev.xpMul())} опыта`, 'good');
      Sfx.play('levelup');
    }
  },

  add(p) {
    if (!p.i || !p.n) throw new Error('В коде ошибка');
    if (p.i === S.d.pid) throw new Error('Это твой собственный код дружбы');
    let f = this.find(p.i);
    if (f) { f.name = String(p.n).slice(0, 20); f.lvl = p.l; S.save(); return { f, isNew: false }; }
    if (S.d.friends.length >= 50) throw new Error('Друзей уже 50 — это максимум');
    f = { id: p.i, name: String(p.n).slice(0, 20), lvl: p.l || 1, pts: 0, added: Date.now(), sent: '', recv: '' };
    S.d.friends.push(f);
    J.add('friend', { name: f.name });
    S.save();
    return { f, isNew: true };
  },
  remove(id) { S.d.friends = S.d.friends.filter(f => f.id !== id); S.save(); },

  // Подарок: содержимое решается при упаковке и лучше на высоких уровнях дружбы
  makeGift(f) {
    const today = U.today();
    if (f.sent === today) throw new Error('Сегодня этому другу подарок уже отправлен');
    if (!S.useItem('gift')) throw new Error('Подарков нет — они попадаются в родниках');
    const r = U.rng(U.uid()), lv = this.level(f);
    const c = { charm: 3 + Math.floor(r() * 4) };
    if (r() < 0.6) c.honey = 1 + Math.floor(r() * 2);
    if (r() < 0.4) c.water = 1;
    if (lv >= 2 && r() < 0.5) c.charm2 = 2;
    if (lv >= 3 && r() < 0.3) c.charm3 = 1;
    if (r() < 0.12 + lv * 0.03) c.cocoon = 5;
    f.sent = today;
    this.addPoint(f);
    J.add('gift', { dir: 'out', name: f.name });
    S.save();
    return this.pack('DUHG1', { f: S.d.pid, fn: S.d.name, to: f.id, d: today, k: U.uid(), c });
  },
  openGift(p) {
    if (p.to !== S.d.pid) throw new Error('Этот подарок адресован другому Ловчему');
    if (S.d.giftsOpened[p.k]) throw new Error('Этот подарок уже открыт');
    const f = this.find(p.f);
    if (!f) throw new Error(`Сначала добавь ${p.fn || 'отправителя'} в друзья — попроси его код дружбы`);
    if (f.recv === U.today()) throw new Error('Сегодня ты уже открывал подарок от этого друга — попробуй завтра');
    S.d.giftsOpened[p.k] = Date.now();
    f.recv = U.today();
    const { cocoon, ...items } = p.c || {};
    const got = S.giveRewards({ ...items, xp: 200 + this.level(f) * 100 });
    if (cocoon && S.d.cocoons.length < 9) { S.d.cocoons.push({ id: U.uid(), km: 5, walked: 0, inc: S.incubating() < 3 }); got.push({ k: 'cocoon', n: 1, label: 'Кокон 5 км' }); }
    this.addPoint(f);
    J.add('gift', { dir: 'in', name: f.name });
    S.save();
    return { f, got };
  },

  // Один вход для всех кодов: дух (DUH1), дружба (DUHF1), подарок (DUHG1)
  accept(code, after) {
    try {
      const txt = String(code);
      if (/DUHF1\./.test(txt)) {
        const { f, isNew } = this.add(this.unpack('DUHF1', txt));
        Sfx.play('catch');
        UI.toast(isNew ? `${U.esc(f.name)} теперь в друзьях!` : `Данные друга ${U.esc(f.name)} обновлены`, 'good');
      } else if (/DUHG1\./.test(txt)) {
        const { f, got } = this.openGift(this.unpack('DUHG1', txt));
        Sfx.play('hatch'); U.vibrate([30, 50, 80]);
        UI.modal({
          title: `Подарок от ${U.esc(f.name)}`, cls: 'gift-modal',
          html: `<div class="trade-sp">${Art.item('gift')}</div><div class="lvl-rw">${got.map(x => `<div>${x.k === 'xp' ? `<b class="big-n">+${U.fmtNum(x.n)}</b>` : x.k === 'cocoon' ? Art.cocoon(5) : Art.item(x.k)}<span>${x.label}${x.k === 'xp' ? '' : ` ×${x.n}`}</span></div>`).join('')}</div>
            <p class="small">Дружба: ${FRIEND_LEVELS[this.level(f)].name} (${f.pts} ★)</p>`,
          buttons: [{ label: 'Спасибо!', cls: 'primary' }],
        });
      } else if (/DUH1\./.test(txt)) {
        Trade.welcome(Trade.receive(txt));
      } else throw new Error('Не похоже на код Духолова');
      after && after();
      UI.refreshHud();
    } catch (e) { UI.toast(e.message || 'Не получилось'); Sfx.play('miss'); }
  },

  /* ---------------- ЭКРАН ---------------- */
  screen() {
    const scr = UI.screen('Друзья', `
      <div class="panel fr-me">
        <b>Мой код дружбы</b>
        <small>Отправь его другу, а его код добавь к себе — и дарите друг другу подарки каждый день.</small>
        <div class="fr-btns"><button class="btn small my-qr">Показать QR</button><button class="btn small primary my-share">Поделиться</button></div>
      </div>
      <div class="panel trade-in">
        <b>Вставить код</b>
        <small>Код дружбы, подарок или посылку с духом — игра сама поймёт, что это.</small>
        ${Trade.canScan() ? '<button class="btn wide scan-btn">Сканировать QR-код</button>' : ''}
        <textarea class="input code-in" rows="3" placeholder="DUHF1… / DUHG1… / DUH1…"></textarea>
        <button class="btn primary wide accept-btn">Принять</button>
      </div>
      <div class="panel trade-in coop-join">
        <b>Совместный разлом</b>
        <small>Друг у разлома нажал «Позвать друзей» и прислал код из 5 символов? Введи его — и в бой вместе, где бы ты ни был.</small>
        <div class="fr-btns"><input class="input coop-code-in" maxlength="5" placeholder="КОД" autocapitalize="characters"><button class="btn primary coop-join-btn">Войти</button></div>
      </div>
      <div class="fr-head"><h3 class="prof-h">Друзья <small class="fr-count"></small></h3><span class="small">Подарков в сумке: <b class="gift-n"></b></span></div>
      <div class="list fr-list"></div>
      <button class="btn ghost wide to-trade">Обмен духами →</button>`, 'friends-screen');
    const render = () => {
      scr.querySelector('.fr-count').textContent = S.d.friends.length;
      scr.querySelector('.gift-n').textContent = S.d.items.gift || 0;
      const today = U.today();
      scr.querySelector('.fr-list').innerHTML = S.d.friends.length ? [...S.d.friends].sort((a, b) => b.pts - a.pts).map(f => {
        const lv = this.level(f), next = FRIEND_LEVELS[lv + 1];
        return `<div class="row fr-row" data-id="${f.id}">
          <div class="fr-ava">${Art.avatar({ cloak: GUARD_COLORS[Math.floor(U.h(f.id) * GUARD_COLORS.length)], eyes: '#5eead4', emblem: 'charm' })}</div>
          <div class="row-main"><b>${U.esc(f.name)}</b><small>${FRIEND_LEVELS[lv].name}${next ? ` · ★ ${f.pts}/${next.pts}` : ' · высший уровень'}${f.recv === today ? ' · подарок получен' : ''}</small>
            <div class="pbar"><i style="width:${next ? Math.min(100, (f.pts - FRIEND_LEVELS[lv].pts) / (next.pts - FRIEND_LEVELS[lv].pts) * 100) : 100}%"></i></div></div>
          <button class="btn small ${f.sent === today ? 'ghost' : 'primary'} send-gift" ${f.sent === today ? 'disabled' : ''}>${f.sent === today ? 'Отправлен' : 'Подарок'}</button>
        </div>`;
      }).join('') : '<div class="row"><div class="row-main"><small>Пока никого. Обменяйтесь кодами дружбы!</small></div></div>';
    };
    render();
    const input = scr.querySelector('.code-in');
    scr.querySelector('.accept-btn').onclick = () => this.accept(input.value, () => { input.value = ''; render(); });
    const sb = scr.querySelector('.scan-btn');
    if (sb) sb.onclick = () => Trade.scan(code => this.accept(code, render));
    scr.querySelector('.my-share').onclick = () => this.shareText(`Добавь меня в друзья в Духолове! «Меню → Друзья» → вставь код:\n${this.myCode()}`);
    scr.querySelector('.my-qr').onclick = () => this.showQR('Мой код дружбы', this.myCode());
    scr.querySelector('.to-trade').onclick = () => Trade.screen();
    scr.querySelector('.coop-join-btn').onclick = () => {
      const code = scr.querySelector('.coop-code-in').value;
      UI.closeScreen(scr);
      Coop.join(code);
    };
    scr.querySelector('.fr-list').addEventListener('click', e => {
      const row = e.target.closest('.fr-row'); if (!row) return;
      const f = this.find(row.dataset.id);
      if (e.target.closest('.send-gift')) {
        try {
          const code = this.makeGift(f);
          Sfx.play('spin');
          render();
          this.showQR(`Подарок для ${U.esc(f.name)}`, code, `Лови подарок в Духолове! «Меню → Друзья» → вставь код:\n${code}`);
        } catch (err) { UI.toast(err.message); }
        return;
      }
      UI.confirm(U.esc(f.name), `Уровень дружбы: ${FRIEND_LEVELS[this.level(f)].name} (★ ${f.pts}). В друзьях с ${new Date(f.added).toLocaleDateString('ru-RU')}.`, 'Удалить из друзей', () => { this.remove(f.id); render(); }, 'Закрыть', true);
    });
  },
  async shareText(text) {
    if (navigator.share) { try { await navigator.share({ title: 'Духолов', text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(text); UI.toast('Скопировано — вставь в мессенджер', 'good'); } catch (e) { UI.toast('Скопируй код вручную'); }
  },
  showQR(title, code, shareText) {
    const m = UI.modal({
      title, cls: 'trade-modal',
      html: `<div class="qr-box"><span class="small">Рисую QR-код…</span></div><textarea class="input code-text" readonly rows="3">${code}</textarea>`,
      buttons: [
        { label: 'Копировать', keep: true, fn: w => Trade.copy(w.querySelector('.code-text')) },
        { label: 'Поделиться', cls: 'primary', keep: true, fn: () => this.shareText(shareText || code) },
      ],
    });
    Trade.qrSvg(code).then(svg => { m.querySelector('.qr-box').innerHTML = svg; })
      .catch(() => { m.querySelector('.qr-box').innerHTML = '<span class="small">QR-код недоступен без интернета — отправь текстовый код.</span>'; });
  },
};
