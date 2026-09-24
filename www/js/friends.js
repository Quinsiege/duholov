'use strict';
/* Друзья и подарки — через сервер игры.
   Код дружбы (DUHF1) несёт код игрока: кто добавил код друга, тот становится его другом, а сервер
   сообщает об этом второму — дружба взаимная. Подарки отправляются одной кнопкой и ждут друга
   в «Друзьях»: от каждого друга — один раз в день. */

// Приглашение по ссылке ?ref=<код игрока>: новичок сразу в друзьях у пригласившего, оба получают подарки (считает сервер)
const Invite = {
  KEY: 'duholov.ref',
  grab() {
    const m = location.search.match(/[?&]ref=([a-z0-9]{8,40})(&|$)/);
    if (m) { try { localStorage.setItem(this.KEY, m[1]); } catch (e) {} }
  },
  ref() { try { return localStorage.getItem(this.KEY) || ''; } catch (e) { return ''; } },
  done(name) {
    try { localStorage.removeItem(this.KEY); } catch (e) {}
    if (name) UI.toast(`Ты и ${U.esc(name)} теперь друзья! Стартовый подарок уже в сумке.`, 'good');
  },
  link() { return `${location.origin}${location.pathname}?ref=${S.d.pid}`; },
  share() {
    Friends.shareText(`Лови духов вместе со мной в «Духолове»! Открой ссылку — мы сразу станем друзьями, а тебе достанется стартовый подарок:\n${this.link()}`);
  },
};

const Friends = {
  inbox: [],   // подарки, которые ждут открытия (присылает сервер)
  busy: false,

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

  // Кто добавил меня и какие подарки ждут — спрашиваем у сервера
  async sync() {
    if (!Game.on() || !S.d || this.busy) return;
    this.busy = true;
    try {
      const r = await Game.act('friendsSync');
      r.added.forEach(n => UI.toast(`Новый друг: ${U.esc(n)} — вы теперь в друзьях друг у друга`, 'good'));
      if (r.added.length) Sfx.play('catch');
      const before = this.inbox.length;
      this.inbox = r.inbox;
      if (r.inbox.length > before) UI.toast(`Тебе пришли подарки: ${r.inbox.length}. Открой «Меню → Друзья»`, 'good');
      Bus.emit('friends');
      UI.refreshHud();
    } catch (e) { console.warn('Друзья:', e.message); }
    this.busy = false;
  },

  // Код дружбы (DUHF1). Посылки с духами (DUH2) закрыты с 3.18 — духов продают на аукционе
  async accept(code, after) {
    const txt = String(code);
    try {
      if (/DUHF1\./.test(txt)) {
        const p = this.unpack('DUHF1', txt);
        if (!p || !p.i) throw new Error('В коде ошибка');
        const r = await Game.act('friendAdd', { pid: p.i });
        Sfx.play('catch');
        UI.toast(r.isNew ? `${U.esc(r.name)} теперь в друзьях!` : `Данные друга ${U.esc(r.name)} обновлены`, 'good');
      } else if (/DUHG1\./.test(txt)) {
        throw new Error('Подарки теперь приходят сами — загляни в «Друзья»');
      } else if (/DUH[12]\./i.test(txt)) {
        throw new Error('Передача духов по коду закрыта — продавай и покупай духов на Аукционе');
      } else throw new Error('Не похоже на код Духолова');
      after && after();
      UI.refreshHud();
    } catch (e) { UI.toast(U.esc(e.message || 'Не получилось')); Sfx.play('miss'); }
  },

  async openGift(g, done) {
    const r = await Game.try('giftOpen', { id: g.id });
    if (!r) return;
    this.inbox = this.inbox.filter(x => x.id !== g.id);
    Sfx.play('hatch'); U.vibrate([30, 50, 80]);
    const f = this.find(g.from);
    UI.modal({
      title: g.invite ? `Подарок за приглашение: ${U.esc(r.name)}` : `Подарок от ${U.esc(r.name)}`, cls: 'gift-modal',
      html: `<div class="trade-sp">${Art.item('gift')}</div><div class="lvl-rw">${r.got.map(x => `<div>${x.k === 'xp' ? `<b class="big-n">+${U.fmtNum(x.n)}</b>` : x.k === 'cocoon' ? Art.cocoon(5) : Art.item(x.k)}<span>${x.label}${x.k === 'xp' ? '' : ` ×${x.n}`}</span></div>`).join('')}</div>
        ${f ? `<p class="small">Дружба: ${FRIEND_LEVELS[this.level(f)].name} (${f.pts} ★)</p>` : ''}`,
      buttons: [{ label: 'Спасибо!', cls: 'primary' }],
    });
    done && done();
    UI.refreshHud();
  },

  /* ---------------- ЭКРАН ---------------- */
  screen() {
    const scr = UI.screen('Друзья', `
      <div class="panel fr-me">
        <b>Мой код дружбы</b>
        <small>Достаточно, чтобы один из вас добавил код другого, — дружба станет взаимной. Дарите друг другу подарки каждый день.</small>
        <div class="fr-btns"><button class="btn small my-qr">Показать QR</button><button class="btn small my-share">Код дружбы</button></div>
        <button class="btn primary wide my-invite">Позвать друга по ссылке</button>
        <small>Друг откроет ссылку — и вы сразу станете друзьями, а вам обоим придут подарки.</small>
      </div>
      <div class="fr-inbox"></div>
      <div class="panel trade-in">
        <b>Вставить код</b>
        <small>Код дружбы от другого Ловчего.</small>
        ${Trade.canScan() ? '<button class="btn wide scan-btn">Сканировать QR-код</button>' : ''}
        <textarea class="input code-in" rows="3" placeholder="DUHF1…"></textarea>
        <button class="btn primary wide accept-btn">Принять</button>
      </div>
      <div class="panel trade-in coop-join">
        <b>Совместный разлом</b>
        <small>Друг у разлома нажал «Позвать друзей» и прислал код из 5 символов? Введи его — и в бой вместе, где бы ты ни был.</small>
        <div class="fr-btns"><input class="input coop-code-in" maxlength="5" placeholder="КОД" autocapitalize="characters"><button class="btn primary coop-join-btn">Войти</button></div>
      </div>
      <div class="fr-head"><h3 class="prof-h">Друзья <small class="fr-count"></small></h3><span class="small">Подарков в сумке: <b class="gift-n"></b></span></div>
      <div class="list fr-list"></div>
      `, 'friends-screen');
    const render = () => {
      if (!scr.isConnected) return;
      scr.querySelector('.fr-count').textContent = S.d.friends.length;
      scr.querySelector('.gift-n').textContent = S.d.items.gift || 0;
      scr.querySelector('.fr-inbox').innerHTML = this.inbox.length ? `<div class="panel gift-inbox"><b>Подарки от друзей</b>${this.inbox.map(g => `
        <div class="row gift-row" data-id="${g.id}"><div class="row-ico">${Art.item('gift')}</div><div class="row-main"><b>${U.esc(g.name)}</b><small>${g.invite ? 'за приглашение · ' : ''}${new Date(g.t).toLocaleString('ru-RU')}</small></div>
        <button class="btn small primary open-gift">Открыть</button></div>`).join('')}</div>` : '';
      const today = U.today();
      scr.querySelector('.fr-list').innerHTML = S.d.friends.length ? [...S.d.friends].sort((a, b) => b.pts - a.pts).map(f => {
        const lv = this.level(f), next = FRIEND_LEVELS[lv + 1];
        return `<div class="row fr-row" data-id="${f.id}">
          <div class="fr-ava">${Art.avatar(f.look || { cloak: GUARD_COLORS[Math.floor(U.h(f.id) * GUARD_COLORS.length)], eyes: '#5eead4', emblem: 'charm' })}</div>
          <div class="row-main"><b>${U.esc(f.name)}</b><small>${FRIEND_LEVELS[lv].name}${next ? ` · ★ ${f.pts}/${next.pts}` : ' · высший уровень'}${f.recv === today ? ' · подарок получен' : ''}</small>
            <div class="pbar"><i style="width:${next ? Math.min(100, (f.pts - FRIEND_LEVELS[lv].pts) / (next.pts - FRIEND_LEVELS[lv].pts) * 100) : 100}%"></i></div></div>
          <button class="btn small ${f.sent === today ? 'ghost' : 'primary'} send-gift" ${f.sent === today ? 'disabled' : ''}>${f.sent === today ? 'Отправлен' : 'Подарок'}</button>
        </div>`;
      }).join('') : '<div class="row"><div class="row-main"><small>Пока никого. Обменяйтесь кодами дружбы!</small></div></div>';
    };
    render();
    // проверить, не добавил ли кто-нибудь меня и не пришли ли подарки, пока экран открыт
    Bus.on('friends', render);
    this.sync();
    const input = scr.querySelector('.code-in');
    scr.querySelector('.accept-btn').onclick = () => this.accept(input.value, () => { input.value = ''; render(); });
    const sb = scr.querySelector('.scan-btn');
    if (sb) sb.onclick = () => Trade.scan(code => this.accept(code, render));
    scr.querySelector('.my-share').onclick = () => this.shareText(`Добавь меня в друзья в Духолове! «Меню → Друзья» → вставь код:\n${this.myCode()}`);
    scr.querySelector('.my-qr').onclick = () => this.showQR('Мой код дружбы', this.myCode());
    scr.querySelector('.my-invite').onclick = () => Invite.share();
    scr.querySelector('.coop-join-btn').onclick = () => {
      const code = scr.querySelector('.coop-code-in').value;
      UI.closeScreen(scr);
      Coop.join(code);
    };
    scr.querySelector('.fr-inbox').addEventListener('click', e => {
      const row = e.target.closest('.gift-row'); if (!row || !e.target.closest('.open-gift')) return;
      const g = this.inbox.find(x => x.id === row.dataset.id);
      if (g) this.openGift(g, render);
    });
    scr.querySelector('.fr-list').addEventListener('click', async e => {
      const row = e.target.closest('.fr-row'); if (!row) return;
      const f = this.find(row.dataset.id); if (!f) return;
      if (e.target.closest('.send-gift')) {
        if (await Game.try('giftSend', { pid: f.id })) {
          Sfx.play('spin');
          UI.toast(`Подарок отправлен: ${U.esc(f.name)} получит его в «Друзьях»`, 'good');
          render();
        }
        return;
      }
      this.profile(f, render);
    });
  },
  // Профиль друга: уровень, спутник, сильнейшие духи, успехи (данные — с сервера, только для взаимных друзей)
  async profile(f, render) {
    const since = `В друзьях с ${new Date(f.added).toLocaleDateString('ru-RU')} · ${FRIEND_LEVELS[this.level(f)].name} (★ ${f.pts})`;
    const m = UI.modal({
      title: U.esc(f.name), cls: 'fr-prof-modal',
      html: `<div class="fr-prof"><p class="small">Загружаю профиль…</p></div><p class="small fr-since">${since}</p>`,
      buttons: [
        { label: 'Удалить', cls: 'danger', fn: () => UI.confirm(U.esc(f.name), 'Удалить из друзей? Уровень дружбы пропадёт.', 'Удалить', async () => { if (await Game.try('friendRemove', { pid: f.id })) render(); }, 'Отмена', true) },
        { label: 'Закрыть', cls: 'primary' },
      ],
    });
    let p = null;
    try { p = await Game.act('friendProfile', { pid: f.id }); } catch (e) { p = { error: e.message }; }
    const box = m.querySelector('.fr-prof');
    if (!box) return;
    if (p.error) { box.innerHTML = `<p class="small">${U.esc(p.error)}</p>`; return; }
    const seen = p.seen ? Date.now() - new Date(p.seen).getTime() : null;
    const seenText = seen == null ? '' : seen < 15 * 60000 ? 'в игре сейчас' : seen < 86400000 ? `был в игре ${new Date(p.seen).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : `был в игре ${new Date(p.seen).toLocaleDateString('ru-RU')}`;
    const spirit = x => `<div class="fr-sp">${Art.img(x.sid, x.shiny, x.dark)}<b>${U.esc(x.nick || SP[x.sid].name)}</b><small>СИЛА ${x.power}</small></div>`;
    box.innerHTML = `
      <div class="fr-prof-head"><div class="fr-prof-ava">${Art.avatar(p.look || undefined)}</div>
        <div><b class="fr-prof-lvl">Уровень ${p.level}</b><small>${UI.rank(p.level)}${seenText ? ' · ' + seenText : ''}</small>
        ${p.buddy ? `<small>Спутник: ${SP[p.buddy].name}</small>` : ''}</div></div>
      <div class="prof-stats fr-prof-stats">
        <div><b>${p.caught}</b><span>поймано</span></div><div><b>${p.dex}</b><span>видов</span></div><div><b>${U.fmtDist(p.km * 1000)}</b><span>пройдено</span></div>
        <div><b>${p.raids}</b><span>разломов</span></div><div><b>${p.medals}</b><span>золотых знаков</span></div><div><b>${p.rank ? LEAGUE_RANKS[p.rank].name : '—'}</b><span>Лига</span></div>
      </div>
      ${p.top.length ? `<div class="fr-sub">Сильнейшие духи</div><div class="fr-top">${p.top.map(spirit).join('')}</div>
        <button class="btn primary wide fr-spar">Поединок ${f.spar === U.today() ? '(тренировка)' : '— награда дня'}</button>` : ''}`;
    const sb = box.querySelector('.fr-spar');
    if (sb) sb.onclick = () => { m.close(); Duel.openSpar(this.find(f.id) || f, p.top); };
    render();
  },
  // 3.21: карточка любого Ловчего — из чата и таблицы Лиги. Данные с сервера (playerCard): облик, уровень, дружина,
  // Лига, успехи, спутник и сильнейший дух. o: { name, look } — показать сразу; o.chat: { report, hide } — действия чата
  async card(pid, o = {}) {
    Sfx.init(); Sfx.play('tap');
    const m = UI.modal({ cls: 'pc-modal', buttons: [], html: `<div class="pc"><button class="pc-x" aria-label="Закрыть">${UI.I.close || '✕'}</button>
      <div class="pc-hero"><div class="pc-ava">${Art.avatar(o.look || undefined)}</div><div class="pc-id"><b class="pc-name">${U.esc(o.name || 'Ловчий')}</b><small>Загружаю карточку…</small></div></div>
      <div class="pc-body"><div class="pc-skel"></div><div class="pc-skel"></div></div><div class="pc-acts"></div></div>` });
    m.querySelector('.pc-x').onclick = () => m.close();
    const acts = m.querySelector('.pc-acts');
    const chatActs = () => o.chat ? `<div class="pc-acts2"><button class="btn small ghost pc-report">Пожаловаться</button><button class="btn small ghost danger pc-hide">Скрыть сообщения</button></div>` : '';
    const wire = () => {
      const rp = acts.querySelector('.pc-report'), hd = acts.querySelector('.pc-hide');
      if (rp) rp.onclick = () => { m.close(); o.chat.report(); };
      if (hd) hd.onclick = () => { m.close(); o.chat.hide(); };
    };
    let p;
    try { p = await Game.act('playerCard', { pid }); } catch (e) { p = { error: e.message }; }
    if (!m.isConnected) return;
    if (p.error) {
      m.querySelector('.pc-id small').textContent = p.error;
      m.querySelector('.pc-body').remove(); acts.innerHTML = chatActs(); wire();
      return;
    }
    const cl = CLANS[p.clan], lg = p.league, rk = LEAGUE_RANKS[lg.rank];
    const seen = { now: 'в игре сейчас', today: 'заходил сегодня', week: 'заходил на неделе', long: 'давно не заходил' }[p.seen];
    const sp = (x, label) => x ? `<div class="pc-sp"><small class="pc-sp-l">${label}</small>${Art.img(x.sid, x.shiny, x.dark)}<b>${U.esc(x.nick || SP[x.sid].name)}</b><small>ур. ${x.lvl} · сила ${U.fmtNum(x.power)}</small></div>` : '';
    const stat = (n, t) => `<div><b>${n}</b><span>${t}</span></div>`;
    m.querySelector('.pc').style.setProperty('--cc', cl ? cl.color : '#a78bfa');
    m.querySelector('.pc-hero').innerHTML = `<div class="pc-ava">${Art.avatar(p.look || undefined)}<span class="pc-lvl">${p.lvl}</span></div>
      <div class="pc-id"><b class="pc-name">${U.esc(p.name)}</b><small>${UI.rank(p.lvl)} · ${p.lvl} уровень</small>
        <div class="pc-tags">${cl ? `<span class="pc-tag clan">${cl.short}</span>` : ''}<span class="pc-tag seen-${p.seen}">${p.me ? 'это ты' : seen}</span></div></div>`;
    m.querySelector('.pc-body').innerHTML = `
      <div class="pc-league"><div class="lg-mini r${lg.rank}">${lg.rank + 1}</div><div class="row-main"><b>${rk.name}</b><small>Лига · ★ ${lg.stars} в этом сезоне${lg.best > lg.rank ? ` · лучший ранг — ${LEAGUE_RANKS[lg.best].name}` : ''}</small></div></div>
      <div class="pc-stats">${stat(U.fmtNum(p.caught), 'поймано')}${stat(p.dex, 'видов')}${stat(U.fmtDist(p.km * 1000), 'пройдено')}${stat(U.fmtNum(p.raids), 'разломов')}${stat(U.fmtNum(p.duels), 'поединков')}${stat(p.medals, 'золотых знаков')}</div>
      ${p.buddy || p.best ? `<div class="pc-sps">${sp(p.buddy, 'Спутник')}${sp(p.best, 'Сильнейший дух')}</div>` : ''}
      ${p.days ? `<div class="pc-foot">В Ордене ${p.days} ${U.plural(p.days, 'день', 'дня', 'дней')}</div>` : ''}`;
    const f = this.find(pid);
    const friendBtn = p.me ? '' : p.friend === 'mutual' ? '<button class="btn wide pc-prof">Профиль друга</button>'
      : p.friend === 'sent' ? '<button class="btn wide pc-wait" disabled>Заявка отправлена — ждём ответ</button>'
      : `<button class="btn primary wide pc-add">${p.friend === 'wants' ? 'Принять дружбу' : 'Добавить в друзья'}</button>`;
    acts.innerHTML = friendBtn + chatActs();
    wire();
    const add = acts.querySelector('.pc-add'), prof = acts.querySelector('.pc-prof');
    if (add) add.onclick = async () => {
      add.disabled = true;
      const r = await Game.try('friendAdd', { pid });
      if (!r) { add.disabled = false; return; }
      Sfx.play('spin');
      UI.toast(p.friend === 'wants' ? `${U.esc(r.name)} теперь твой друг!` : `Заявка отправлена: когда ${U.esc(r.name)} добавит тебя в ответ, вы станете друзьями`, 'good');
      add.outerHTML = p.friend === 'wants' ? '<button class="btn wide pc-prof">Профиль друга</button>' : '<button class="btn wide pc-wait" disabled>Заявка отправлена — ждём ответ</button>';
      const pb = acts.querySelector('.pc-prof');
      if (pb) pb.onclick = () => { m.close(); this.profile(this.find(pid), () => {}); };
    };
    if (prof && f) prof.onclick = () => { m.close(); this.profile(f, () => {}); };
  },
  async shareText(text) {
    if (navigator.share) { try { await navigator.share({ title: 'Духолов', text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(text); UI.toast('Скопировано — вставь в мессенджер', 'good'); } catch (e) { UI.toast('Скопируй код вручную'); }
  },
  showQR(title, code, shareText) {
    const m = UI.modal({
      title, cls: 'trade-modal',
      html: `<div class="qr-box"><span class="small">Рисую QR-код…</span></div><textarea class="input code-text" readonly rows="3">${U.esc(code)}</textarea>`,
      buttons: [
        { label: 'Копировать', keep: true, fn: w => Trade.copy(w.querySelector('.code-text')) },
        { label: 'Поделиться', cls: 'primary', keep: true, fn: () => this.shareText(shareText || code) },
      ],
    });
    Trade.qrSvg(code).then(svg => { m.querySelector('.qr-box').innerHTML = svg; })
      .catch(() => { m.querySelector('.qr-box').innerHTML = '<span class="small">QR-код недоступен без интернета — отправь текстовый код.</span>'; });
  },
};
