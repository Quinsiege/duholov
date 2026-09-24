'use strict';
/* Чат Ордена (3.18): каналы — Общий, Торговля, Разломы, Помощь и своя Дружина. Сообщения пишет и отдаёт сервер
   (chatSend / chatList / chatReport): он проверяет уровень, дружину, частоту, чистит текст и не пропускает ссылки.
   Пока экран открыт, новые сообщения подгружаются раз в несколько секунд. */

const Chat = {
  ch: 'all',
  msgs: {},          // канал → сообщения
  KEY: 'duholov.chat.hide', // скрытые игроки (удобство на этом телефоне)
  POLL: 4000,

  badge() { return ''; },
  hidden() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (e) { return []; } },
  hide(pid) { try { const h = this.hidden(); if (!h.includes(pid)) h.push(pid); localStorage.setItem(this.KEY, JSON.stringify(h.slice(-200))); } catch (e) {} },
  channels() { return Rules.CHAT_CHANNELS.filter(([k]) => k !== 'clan' || S.d.clan); },
  time(t) { const d = new Date(t), now = new Date(); return d.toDateString() === now.toDateString() ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); },

  screen() {
    Sfx.init(); Sfx.play('tap');
    if (!this.channels().some(([k]) => k === this.ch)) this.ch = 'all';
    const scr = UI.screen('Чат Ордена', `<div class="chips chat-tabs"></div><div class="chat-list"></div>`, 'chat-screen');
    const bar = U.el(`<form class="chat-bar"><input class="input chat-in" maxlength="${Rules.CHAT.MAX}" placeholder="${S.d.level >= Rules.CHAT.LEVEL ? 'Сообщение…' : `Писать можно с ${Rules.CHAT.LEVEL} уровня`}" autocomplete="off" enterkeyhint="send" ${S.d.level >= Rules.CHAT.LEVEL ? '' : 'disabled'}>
      <button class="btn primary chat-send" aria-label="Отправить" ${S.d.level >= Rules.CHAT.LEVEL ? '' : 'disabled'}>➤</button></form>`);
    scr.appendChild(bar);
    const body = scr.querySelector('.screen-body'), list = scr.querySelector('.chat-list'), tabs = scr.querySelector('.chat-tabs');
    const renderTabs = () => { tabs.innerHTML = this.channels().map(([k, t]) => `<button data-ch="${k}" class="${k === this.ch ? 'on' : ''}">${t}</button>`).join(''); };
    const atBottom = () => body.scrollHeight - body.scrollTop - body.clientHeight < 80;
    const render = (stick) => {
      const hid = this.hidden(), ms = (this.msgs[this.ch] || []).filter(m => !hid.includes(m.pid));
      const hint = { all: 'Общий разговор Ловчих.', trade: 'Торговля: договаривайтесь о сделках — сами сделки идут через Аукцион.', raid: 'Ищите команду для Разломов: пишите код комнаты и место.', help: 'Вопросы новичков и советы бывалых.', clan: 'Канал твоей дружины — его видят только свои.' }[this.ch];
      list.innerHTML = `<div class="chat-hint">${hint} Ссылки запрещены, грубость скрывается.</div>` + (ms.length ? ms.map(m => `
        <div class="msg ${m.mine ? 'mine' : ''}" data-id="${m.id}">
          ${m.mine ? '' : `<button class="msg-who" data-pid="${U.esc(m.pid)}" data-name="${U.esc(m.name)}"><b class="${m.clan ? 'cl-' + U.esc(m.clan) : ''}">${U.esc(m.name)}</b><small>ур. ${m.lvl | 0}</small></button>`}
          <div class="msg-text">${U.esc(m.text)}</div><time>${this.time(m.t)}</time></div>`).join('') : '<div class="q-note">Здесь пока тихо. Напиши первым!</div>');
      if (stick) body.scrollTop = body.scrollHeight;
    };
    const load = async (full) => {
      const ch = this.ch, have = this.msgs[ch] || [];
      const after = full || !have.length ? 0 : have[have.length - 1].id;
      let r;
      try { r = await Game.act('chatList', { ch, after }); } catch (e) { if (full) list.innerHTML = `<div class="q-note">${U.esc(e.message)}</div>`; return; }
      if (ch !== this.ch || !scr.isConnected) return;
      const stick = full || atBottom();
      this.msgs[ch] = (full ? r.msgs : have.concat(r.msgs.filter(m => !have.some(x => x.id === m.id)))).slice(-150);
      if (full || r.msgs.length) render(stick);
    };
    const show = (ch, dir) => { this.ch = ch; renderTabs(); render(true); UI.slideIn(list, dir); load(true); };
    tabs.addEventListener('click', e => {
      const b = e.target.closest('[data-ch]'); if (!b || b.dataset.ch === this.ch) return;
      const keys = this.channels().map(c => c[0]);
      show(b.dataset.ch, Math.sign(keys.indexOf(b.dataset.ch) - keys.indexOf(this.ch)));
    });
    UI.swipeTabs(body, this.channels().map(c => c[0]), () => this.ch, show);
    list.addEventListener('click', e => {
      const w = e.target.closest('.msg-who'); if (!w) return;
      const msg = w.closest('.msg'), pid = w.dataset.pid, name = w.dataset.name;
      UI.modal({
        title: U.esc(name), html: '<p class="small">Что сделать?</p>',
        buttons: [
          { label: 'В друзья', cls: 'primary', fn: async () => { const r = await Game.try('friendAdd', { pid }); if (r) UI.toast(`${U.esc(r.name)} теперь в друзьях!`, 'good'); } },
          { label: 'Пожаловаться', fn: async () => { if (await Game.try('chatReport', { id: +msg.dataset.id })) UI.toast('Жалоба отправлена — спасибо'); } },
          { label: 'Скрыть', cls: 'danger', fn: () => { this.hide(pid); render(false); UI.toast('Сообщения этого Ловчего скрыты на этом телефоне'); } },
        ],
      });
    });
    const input = bar.querySelector('.chat-in');
    bar.addEventListener('submit', async e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || bar._busy) return;
      bar._busy = true;
      const r = await Game.try('chatSend', { ch: this.ch, text });
      bar._busy = false;
      if (!r) return;
      input.value = '';
      const have = this.msgs[this.ch] || [];
      if (!have.some(m => m.id === r.msg.id)) have.push(r.msg);
      this.msgs[this.ch] = have;
      render(true);
    });
    renderTabs(); render(true); load(true);
    const timer = setInterval(() => { if (!scr.isConnected) { clearInterval(timer); return; } if (!document.hidden) load(false); }, this.POLL);
  },
};
