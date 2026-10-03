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
    if (name) UI.toast(ru`Ты и ${U.esc(name)} теперь друзья! Стартовый подарок уже в сумке.`, 'good');
  },
  link() { return `${location.origin}${location.pathname}?ref=${S.d.pid}`; },
  share() {
    Friends.shareText(ru`Лови духов вместе со мной в «Духолове»! Открой ссылку — мы сразу станем друзьями, а тебе достанется стартовый подарок:\n${this.link()}`);
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
    if (Math.floor(U.h('duholov-' + prefix, m[1]) * 2176782336).toString(36).padStart(6, '0') !== m[2]) throw new Error(ru`Код повреждён — скопируй его целиком`);
    try {
      const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(escape(atob(b64 + '='.repeat((4 - b64.length % 4) % 4)))));
    } catch (e) { throw new Error(ru`Не удалось прочитать код`); }
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
      r.added.forEach(n => UI.toast(ru`Новый друг: ${U.esc(n)} — вы теперь в друзьях друг у друга`, 'good'));
      if (r.added.length) Sfx.play('success');
      const before = this.inbox.length;
      this.inbox = r.inbox;
      if (r.inbox.length > before) UI.toast(ru`Тебе пришли подарки: ${r.inbox.length}. Открой «Меню → Друзья»`, 'good');
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
        if (!p || !p.i) throw new Error(ru`В коде ошибка`);
        const r = await Game.act('friendAdd', { pid: p.i });
        Sfx.play('success');
        UI.toast(r.isNew ? ru`${U.esc(r.name)} теперь в друзьях!` : ru`Данные друга ${U.esc(r.name)} обновлены`, 'good');
      } else if (/DUHG1\./.test(txt)) {
        throw new Error(ru`Подарки теперь приходят сами — загляни в «Друзья»`);
      } else if (/DUH[12]\./i.test(txt)) {
        throw new Error(ru`Передача духов по коду закрыта — продавай и покупай духов на Аукционе`);
      } else throw new Error(ru`Не похоже на код Духолова`);
      after && after();
      UI.refreshHud();
    } catch (e) { UI.toast(U.esc(e.message || ru`Не получилось`)); Sfx.play('error'); }
  },

  async openGift(g, done) {
    const r = await Game.try('giftOpen', { id: g.id });
    if (!r) return;
    this.inbox = this.inbox.filter(x => x.id !== g.id);
    Sfx.play('hatch'); U.vibrate([30, 50, 80]);
    const f = this.find(g.from);
    UI.modal({
      title: g.invite ? ru`Подарок за приглашение: ${U.esc(r.name)}` : ru`Подарок от ${U.esc(r.name)}`, cls: 'gift-modal',
      html: `<div class="trade-sp">${Art.item('gift')}</div><div class="lvl-rw">${r.got.map(x => `<div>${x.k === 'xp' ? `<b class="big-n">+${U.fmtNum(x.n)}</b>` : x.k === 'cocoon' ? Art.cocoon(5) : Art.item(x.k)}<span>${I18N.back(x.label)}${x.k === 'xp' ? '' : ` ×${x.n}`}</span></div>`).join('')}</div>
        ${f ? `<p class="small">${ru`Дружба: ${FRIEND_LEVELS[this.level(f)].name} (${f.pts} ★)`}</p>` : ''}`,
      buttons: [{ label: ru`Спасибо!`, cls: 'primary' }], tap: true,
    });
    done && done();
    UI.refreshHud();
  },

  /* ---------------- ЭКРАН ---------------- */
  // 4.15: Друзья — в композиции карточки духа: сверху (≤30%) знак дружбы в волшебном круге, справа «ДРУЗЕЙ ··· N», подарки
  // отдельным блоком, метка новых подарков; ниже вкладки «Друзья · Позвать · Вместе», содержимое листается внутри панели
  screen() {
    const pane = (k, html, on) => `<div class="dt-pane ${on ? 'on' : ''}" data-pane="${k}">${html}</div>`;
    const scr = UI.screen(ru`Друзья`, `
      <div class="det det2 fr2" style="--c:#f472b6">
        <div class="dt-hero">
          <div class="det-art fr2-art"><span class="fr2-ico">${UI.menuIcon('swap')}</span></div>
          <div class="dt-info">
            <div class="det-hp">${ru`Дарите подарки и сражайтесь вместе`}</div>
            <div class="det-power"><small>${ru`ДРУЗЕЙ`}</small><b class="fr-count"></b></div>
            <div class="det-lvl"><span>${ru`Подарков в сумке: ${'<b class="gift-n"></b>'}`}</span></div>
            <div class="det-tags fr2-tags"></div>
          </div>
        </div>
        <div class="seg dt-tabs">${[['list', ru`Друзья`], ['add', ru`Позвать`], ['coop', ru`Вместе`]].map(([k, t], i) => `<button data-tab="${k}" class="${i ? '' : 'on'}">${t}${k === 'list' ? '<i class="dt-dot fr2-dot hidden"></i>' : ''}</button>`).join('')}</div>
        <div class="dt-panel">
          ${pane('list', '<div class="fr-inbox"></div><div class="list fr-list"></div>', true)}
          ${pane('add', `
            <button class="btn primary wide my-invite">${ru`Позвать друга по ссылке`}<small>${ru`откроет ссылку — и вы сразу друзья, обоим подарки`}</small></button>
            <div class="fr-btns"><button class="btn ghost small my-qr">${ru`Мой QR-код`}</button><button class="btn ghost small my-share">${ru`Мой код дружбы`}</button></div>
            <div class="fr-or"><span>${ru`или код друга`}</span></div>
            ${Trade.canScan() ? `<button class="btn ghost wide scan-btn">${ru`Сканировать QR-код`}</button>` : ''}
            <textarea class="input code-in" rows="2" placeholder="${ru`Вставь код: DUHF1…`}"></textarea>
            <button class="btn ghost wide accept-btn">${ru`Добавить по коду`}</button>
            <div class="lg2-rule">${ru`Достаточно, чтобы один из вас добавил код другого, — дружба станет взаимной.`}</div>`)}
          ${pane('coop', `
            <div class="dx-none fr2-coop"><b>${ru`Совместный разлом`}</b><small>${ru`Друг у разлома нажал «Позвать друзей» и прислал код из 5 символов? Введи его — и в бой вместе, где бы ты ни был.`}</small></div>
            <div class="fr-btns fr2-coop-in"><input class="input coop-code-in" maxlength="5" placeholder="${ru`КОД`}" autocapitalize="characters"><button class="btn primary coop-join-btn">${ru`Войти`}</button></div>`)}
        </div>
      </div>`, 'friends-screen det-screen');
    scr.addEventListener('click', e => {
      const tb = e.target.closest('[data-tab]'); if (!tb) return;
      Sfx.play('tap'); U.$$('[data-tab]', scr).forEach(x => x.classList.toggle('on', x === tb)); U.$$('.dt-pane', scr).forEach(p => p.classList.toggle('on', p.dataset.pane === tb.dataset.tab));
    });
    const render = () => {
      if (!scr.isConnected) return;
      scr.querySelector('.fr-count').textContent = S.d.friends.length;
      scr.querySelector('.gift-n').textContent = S.d.items.gift || 0;
      scr.querySelector('.fr2-tags').innerHTML = this.inbox.length ? `<span class="fr2-new">🎁 ${ru`пришло подарков: ${this.inbox.length}`}</span>` : `<span>${ru`подарок каждому другу — раз в день`}</span>`;
      scr.querySelector('.fr2-dot').classList.toggle('hidden', !this.inbox.length);
      scr.querySelector('.fr-inbox').innerHTML = this.inbox.length ? `<div class="panel gift-inbox"><b>${ru`Подарки от друзей`}</b>${this.inbox.map(g => `
        <div class="row gift-row" data-id="${g.id}"><div class="row-ico">${Art.item('gift')}</div><div class="row-main"><b>${U.esc(g.name)}</b><small>${g.invite ? ru`за приглашение` + ' · ' : ''}${new Date(g.t).toLocaleString(I18N.locale)}</small></div>
        <button class="btn small primary open-gift">${ru`Открыть`}</button></div>`).join('')}</div>` : '';
      const today = U.today();
      scr.querySelector('.fr-list').innerHTML = S.d.friends.length ? [...S.d.friends].sort((a, b) => b.pts - a.pts).map(f => {
        const lv = this.level(f), next = FRIEND_LEVELS[lv + 1];
        return `<div class="row fr-row" data-id="${f.id}">
          <div class="fr-ava">${Art.avatar(f.look || { cloak: GUARD_COLORS[Math.floor(U.h(f.id) * GUARD_COLORS.length)], eyes: '#5eead4', emblem: 'charm' })}</div>
          <div class="row-main"><b>${U.esc(f.name)}${f.lvl ? ` <span class="fr-lvl">${ru`ур. ${f.lvl}`}</span>` : ''}${f.recv === today ? ` <span class="fr-got" title="${ru`Подарок от друга сегодня получен`}">🎁</span>` : ''}</b><small>${FRIEND_LEVELS[lv].name}${next ? ` · ★ ${f.pts}/${next.pts}` : ' · ' + ru`высший уровень`}</small>
            <div class="pbar"><i style="width:${next ? Math.min(100, (f.pts - FRIEND_LEVELS[lv].pts) / (next.pts - FRIEND_LEVELS[lv].pts) * 100) : 100}%"></i></div></div>
          <button class="btn small ${f.sent === today ? 'ghost' : 'primary'} send-gift" ${f.sent === today ? 'disabled' : ''}>${f.sent === today ? ru`Отправлен` : ru`Подарок`}</button>
        </div>`;
      }).join('') : `<div class="row"><div class="row-main"><small>${ru`Пока никого — позови друга по ссылке или добавь его код ниже.`}</small></div></div>`;
    };
    render();
    // проверить, не добавил ли кто-нибудь меня и не пришли ли подарки, пока экран открыт
    Bus.on('friends', render);
    this.sync();
    const input = scr.querySelector('.code-in');
    scr.querySelector('.accept-btn').onclick = () => this.accept(input.value, () => { input.value = ''; render(); });
    const sb = scr.querySelector('.scan-btn');
    if (sb) sb.onclick = () => Trade.scan(code => this.accept(code, render));
    scr.querySelector('.my-share').onclick = () => this.shareText(ru`Добавь меня в друзья в Духолове! «Меню → Друзья» → вставь код:\n${this.myCode()}`);
    scr.querySelector('.my-qr').onclick = () => this.showQR(ru`Мой код дружбы`, this.myCode());
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
          Sfx.play('send');
          UI.toast(ru`Подарок отправлен: ${U.esc(f.name)} получит его в «Друзьях»`, 'good');
          render();
        }
        return;
      }
      this.profile(f, render);
    });
  },
  // Профиль друга (3.21.1) — та же карточка Ловчего, с дружбой, сильнейшими духами, поединком и подарком
  profile(f, render) { return this.card(f.id, { name: f.name, look: f.look, render }); },
  // 3.21: карточка любого Ловчего — из чата, таблицы Лиги и списка друзей. Данные с сервера (playerCard): облик, уровень,
  // клан, Лига, успехи, спутник и сильнейший дух; у взаимных друзей — ещё три сильнейших духа (friendProfile) и поединок.
  // o: { name, look } — показать сразу; o.chat: { report, hide } — действия чата; o.render — обновить список друзей
  // 4.14.1: карточка — на весь экран, в композиции карточки духа: имя у стрелки назад, сверху облик в руническом круге,
  // звание, «УРОВЕНЬ ··· N», Лига отдельным блоком, метки; ниже главные действия и вкладки «Достижения · Духи · Дружба»
  async card(pid, o = {}) {
    Sfx.init(); Sfx.play('tap');
    const hero = (look, info) => `<div class="dt-hero"><div class="det-art pf-ava"><div class="prof-ava p3d">${M3D.stage(look || undefined)}</div></div><div class="dt-info">${info}</div></div>`;
    const scr = UI.screen(U.esc(o.name || ru`Ловчий`), `<div class="det det2 prof2 pcard" style="--c:#a78bfa">
      ${hero(o.look, `<div class="det-hp">${ru`Загружаю карточку…`}</div>`)}<div class="pcard-load"><div class="pc-skel"></div><div class="pc-skel"></div></div></div>`, 'det-screen pcard-screen');
    M3D.mount(scr); // 5.1.41: облик Ловчего — 3D-моделью (стоит)
    const close = () => UI.closeScreen(scr), changed = () => { if (o.render) o.render(); };
    const chatBtns = () => o.chat ? `<div class="dt-about-acts"><button class="btn ghost small pc-report">${ru`Пожаловаться`}</button><button class="btn ghost danger small pc-hide">${ru`Скрыть сообщения`}</button></div>` : '';
    let p;
    try { p = await Game.act('playerCard', { pid }); } catch (e) { p = { error: e.message }; }
    if (!scr.isConnected) return;
    const root = scr.querySelector('.pcard');
    if (p.error) { root.innerHTML = hero(o.look, `<div class="det-hp">${U.esc(p.error)}</div>`) + `<div class="dt-panel"><div class="dt-pane on">${chatBtns()}</div></div>`; M3D.mount(root); return; }
    const cl = CLANS[p.clan], lg = p.league, rk = LEAGUE_RANKS[lg.rank], f = this.find(pid), today = U.today();
    const seen = { now: ru`в игре сейчас`, today: ru`заходил сегодня`, week: ru`заходил на неделе`, long: ru`давно не заходил` }[p.seen];
    if (f) { f.name = p.name; f.lvl = p.lvl; if (p.look) f.look = p.look; }
    scr.querySelector('.screen-head h2').textContent = p.name;
    const row = (t, v, cls = '') => `<div class="dt-row ${cls}"><span>${t}</span><b>${v}</b></div>`;
    const spc = (x, label) => x ? `<div class="pcs-sp el-${SP[x.sid].el}">${label ? `<small>${label}</small>` : ''}<div class="pcs-a">${Art.img(x.sid, x.shiny, x.dark)}</div><b>${U.esc(x.nick || SP[x.sid].name)}</b><em>${ru`ур. ${x.lvl} · сила ${U.fmtNum(x.power)}`}</em></div>` : '';
    const pane = (k, html, on) => `<div class="dt-pane ${on ? 'on' : ''}" data-pane="${k}">${html}</div>`;
    const friendPane = () => {
      const fr = this.find(pid);
      if (p.me) return `<div class="dx-none"><b>${ru`Это ты`}</b><small>${ru`Так твою карточку видят другие Ловчие.`}</small></div>`;
      if (!fr) return `<div class="dx-none"><b>${p.friend === 'wants' ? ru`Хочет с тобой дружить` : ru`Не в друзьях`}</b><small>${ru`Друзья обмениваются подарками и сражаются в поединках. Дружба растёт от подарков, поединков и совместных разломов.`}</small></div>${chatBtns()}`;
      const lv = this.level(fr), cur = FRIEND_LEVELS[lv], nx = FRIEND_LEVELS[lv + 1], mutual = p.friend === 'mutual';
      return `<div class="dt-rows">
          ${row(ru`Дружба`, mutual ? cur.name : ru`заявка отправлена`, 'gold')}
          ${mutual ? `<div class="dt-row dt-evo-row"><span>${ru`Очки дружбы`}</span><b>★ ${fr.pts}${nx ? ` / ${nx.pts}` : ''}</b>
            <div class="dt-evo-bar"><div class="pbar"><i style="width:${nx ? Math.min(100, (fr.pts - cur.pts) / (nx.pts - cur.pts) * 100) : 100}%"></i></div><small>${nx ? ru`до «${nx.name}»` : ru`высший уровень`}</small></div></div>` : ''}
          ${fr.added ? row(ru`В друзьях с`, new Date(fr.added).toLocaleDateString(I18N.locale)) : ''}
          ${mutual ? row(ru`Подарок от него`, fr.recv === today ? ru`сегодня получен` : ru`сегодня не было`) : ''}
          ${mutual ? row(ru`Поединок сегодня`, fr.spar === today ? ru`был — дальше тренировки` : ru`награда дня ждёт`) : ''}
        </div>
        <div class="dt-about-acts"><button class="btn ghost danger small pc-del">${mutual ? ru`Удалить из друзей` : ru`Отменить заявку`}</button></div>
        ${chatBtns()}`;
    };
    const actsHtml = () => {
      const fr = this.find(pid), st = p.friend;
      if (p.me) return '';
      if (st === 'mutual' && fr) return `<button class="btn small primary pc-spar ${p.top ? '' : 'disabled'}" ${p.top ? '' : `data-err="${ru`Загружаю духов друга…`}"`}>⚔ ${fr.spar === today ? ru`Тренировка` : ru`Поединок`}</button>
        <button class="btn ghost small pc-gift ${fr.sent === today ? 'disabled' : ''}" ${fr.sent === today ? `data-err="${ru`Подарок сегодня уже отправлен`}"` : ''}>🎁 ${fr.sent === today ? ru`Отправлен` : ru`Подарок · ${S.d.items.gift || 0}`}</button>`;
      if (st === 'sent') return `<button class="btn ghost small disabled" data-err="${ru`Ждём, когда добавит в ответ`}">${ru`Заявка отправлена`}</button>`;
      return `<button class="btn small primary pc-add">${st === 'wants' ? ru`Принять дружбу` : ru`Добавить в друзья`}</button>`;
    };
    root.style.setProperty('--c', cl ? cl.color : '#a78bfa');
    root.innerHTML = `
      ${hero(p.look, `
        <div class="det-hp">${ru`${UI.rank(p.lvl)} Ордена Оберега`}</div>
        <div class="det-power"><small>${ru`УРОВЕНЬ`}</small><b>${p.lvl}</b></div>
        <div class="det-lvl pcard-lg"><span><span class="lg-badge xs">${League.badge(lg.rank)}</span> ${ru`Лига: <b>${rk.name}</b>`} · ${League.cup()}${U.fmtNum(lg.pts != null ? lg.pts : (lg.stars | 0) * 100)}</span></div>
        <div class="det-tags">${cl ? `<span class="tag-crest" style="color:${cl.color}"><i>${Art.clanCrest(p.clan)}</i>${cl.short}</span>` : ''}<span class="pcard-seen s-${p.seen}">${p.me ? ru`это ты` : seen}</span></div>`)}
      <div class="pf-acts pcard-acts">${actsHtml()}</div>
      <div class="seg dt-tabs">${[['ach', ru`Достижения`], ['spirits', ru`Духи`], ['friend', p.me ? ru`Это ты` : ru`Дружба`]].map(([k, t], i) => `<button data-tab="${k}" class="${i ? '' : 'on'}">${t}</button>`).join('')}</div>
      <div class="dt-panel">
        ${pane('ach', `
          <div class="pf-key">
            <div><b>${U.fmtNum(p.caught)}</b><small>${ru`поймано духов`}</small></div>
            <div><b>${p.dex}<em>/${SPECIES.length}</em></b><small>${ru`бестиарий`}</small></div>
            <div><b>${U.fmtDist(p.km * 1000)}</b><small>${ru`пройдено`}</small></div>
          </div>
          <div class="dt-rows">
            ${row(ru`Закрыто разломов`, U.fmtNum(p.raids))}
            ${row(ru`Поединков`, U.fmtNum(p.duels))}
            ${row(ru`Золотых знаков`, p.medals)}
            ${row(ru`Лучшая лига`, LEAGUE_RANKS[Math.max(lg.best, lg.rank)].name)}
            ${p.days ? row(ru`В Ордене`, ru`${p.days} ${U.plural(p.days, ru`день`, ru`дня`, ru`дней`)}`) : ''}
          </div>`, true)}
        ${pane('spirits', p.buddy || p.best ? `
          <div class="pcs-two">${spc(p.buddy, ru`Спутник`)}${spc(p.best, ru`Сильнейший дух`)}</div>
          <div class="pcs-top"></div>` : `<div class="dx-none"><b>${ru`Духи скрыты`}</b><small>${ru`Ловчий ещё не выбрал спутника.`}</small></div>`)}
        ${pane('friend', friendPane())}
      </div>`;
    M3D.mount(root);
    const redrawActs = () => { const a = root.querySelector('.pcard-acts'); if (a) a.innerHTML = actsHtml(); };
    // у взаимного друга — три сильнейших духа (для поединка)
    if (p.friend === 'mutual' && f) {
      Game.act('friendProfile', { pid }).then(fp => {
        if (!scr.isConnected || !fp || !fp.top) return;
        p.top = fp.top;
        const t = root.querySelector('.pcs-top');
        if (t && fp.top.length) t.innerHTML = `<div class="pf-mh"><span>${ru`Сильнейшие духи — для поединка`}</span></div><div class="pcs-three">${fp.top.map(x => spc(x)).join('')}</div>`;
        redrawActs();
      }).catch(e => { const t = root.querySelector('.pcs-top'); if (scr.isConnected && t) t.innerHTML = `<div class="det-why">${U.esc(e.message)}</div>`; });
    }
    root.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.tab) { Sfx.play('tap'); U.$$('[data-tab]', root).forEach(x => x.classList.toggle('on', x === b)); U.$$('.dt-pane', root).forEach(x => x.classList.toggle('on', x.dataset.pane === b.dataset.tab)); return; }
      if (b.dataset.err) { UI.toast(b.dataset.err); return; }
      if (b.classList.contains('pc-report')) { close(); o.chat.report(); }
      else if (b.classList.contains('pc-hide')) { close(); o.chat.hide(); }
      else if (b.classList.contains('pc-add')) {
        b.disabled = true;
        const r = await Game.try('friendAdd', { pid });
        if (!r) { b.disabled = false; return; }
        Sfx.play('send');
        UI.toast(p.friend === 'wants' ? ru`${U.esc(r.name)} теперь твой друг!` : ru`Заявка отправлена: когда ${U.esc(r.name)} добавит тебя в ответ, вы станете друзьями`, 'good');
        close(); changed();
        setTimeout(() => this.card(pid, o), 230); // открыть заново — уже как друга
      } else if (b.classList.contains('pc-spar')) {
        close(); Duel.openSpar(this.find(pid), p.top);
      } else if (b.classList.contains('pc-gift')) {
        b.disabled = true;
        if (await Game.try('giftSend', { pid })) { Sfx.play('send'); UI.toast(ru`Подарок отправлен: ${U.esc(p.name)} получит его в «Друзьях»`, 'good'); changed(); }
        redrawActs();
      } else if (b.classList.contains('pc-del')) {
        UI.confirm(U.esc(p.name), p.friend === 'mutual' ? ru`Удалить из друзей? Уровень дружбы пропадёт.` : ru`Отменить заявку в друзья?`, p.friend === 'mutual' ? ru`Удалить` : ru`Отменить`, async () => {
          if (await Game.try('friendRemove', { pid })) { close(); changed(); }
        }, ru`Оставить`, true);
      }
    });
  },
  async shareText(text) {
    if (navigator.share) { try { await navigator.share({ title: ru`Духолов`, text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(text); UI.toast(ru`Скопировано — вставь в мессенджер`, 'good'); } catch (e) { UI.toast(ru`Скопируй код вручную`); }
  },
  showQR(title, code, shareText) {
    const m = UI.modal({
      title, cls: 'trade-modal',
      html: `<div class="qr-box"><span class="small">${ru`Рисую QR-код…`}</span></div><textarea class="input code-text" readonly rows="3">${U.esc(code)}</textarea>`,
      buttons: [
        { label: ru`Копировать`, keep: true, fn: w => Trade.copy(w.querySelector('.code-text')) },
        { label: ru`Поделиться`, cls: 'primary', keep: true, fn: () => this.shareText(shareText || code) },
      ],
    });
    Trade.qrSvg(code).then(svg => { m.querySelector('.qr-box').innerHTML = svg; })
      .catch(() => { m.querySelector('.qr-box').innerHTML = `<span class="small">${ru`QR-код недоступен без интернета — отправь текстовый код.`}</span>`; });
  },
};
