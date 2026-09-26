'use strict';
/* Трейлер «Тонкая ночь» — видео (мелодия внутри) в исходном качестве 1080p 60 к/с. Файл лежит на сервере duholov.ru вне git
   (GitHub не принимает файлы больше 100 МБ; деплой его не трогает — rsync --exclude='video/'), одна копия на все сборки:
   сайт, тестовый контур, приложение, зеркало на GitHub Pages. Запускается сразу, без вопроса: при первом заходе
   после обновления и из «Книги Ордена». Появляется из темноты, в конце уходит в темноту; «Пропустить» — в любой момент.
   Звук: в приложении видео играет со звуком сразу; в браузере без касания экрана — без звука и с кнопкой «Включить звук»
   (браузеры не дают запускать звук сами). Нет сети или видео не загрузилось — трейлер тихо закрывается, игра идёт дальше. */

const Trailer = {
  KEY: 'duholov.trailer', VER: '6',
  SRC: 'https://duholov.ru/video/trailer.mp4',
  due() { try { return localStorage.getItem(this.KEY) !== this.VER; } catch (e) { return false; } },
  seen() { try { localStorage.setItem(this.KEY, this.VER); } catch (e) {} },

  play() {
    return new Promise(done => {
      const root = U.el(`<div class="tv">
        <video class="tv-v" playsinline webkit-playsinline preload="auto" src="${this.SRC}"></video>
        <button class="tv-snd hidden">Включить звук</button>
        <button class="tv-skip">Пропустить ›</button>
      </div>`);
      const v = root.querySelector('video'), snd = root.querySelector('.tv-snd');
      let ended = false, played = false;
      // фоновая музыка игры молчит, пока идёт трейлер
      Music.hold = true; Music.apply();
      document.body.appendChild(root);
      const back = () => finish();
      UI.pushLayer(back);
      const finish = () => {
        if (ended) return; ended = true;
        clearTimeout(wait);
        document.removeEventListener('visibilitychange', vis);
        UI.popLayer(back);
        if (played) this.seen();
        // уходит в темноту, звук видео затихает вместе с картинкой
        root.classList.add('out');
        const v0 = v.volume; let k = 0;
        const iv = setInterval(() => { k++; v.volume = Math.max(0, v0 * (1 - k / 8)); if (k >= 8) clearInterval(iv); }, 60);
        setTimeout(() => { v.pause(); v.removeAttribute('src'); v.load(); root.remove(); Music.hold = false; Music.apply(); done(); }, 600);
      };
      // видео не пошло за 12 с (нет сети) — не держим игрока
      const wait = setTimeout(() => { if (!played) finish(); }, 12000);
      v.addEventListener('playing', () => { played = true; root.classList.add('on'); }, { once: true });
      v.addEventListener('ended', finish);
      v.addEventListener('error', finish);
      const unmute = () => { v.muted = false; snd.classList.add('hidden'); };
      snd.onclick = e => { e.stopPropagation(); unmute(); };
      root.querySelector('.tv-skip').onclick = e => { e.stopPropagation(); finish(); };
      // в браузере без звука — касание по видео тоже включает звук
      v.onclick = () => { if (v.muted) unmute(); };
      // свернули приложение — пауза, вернулись — дальше
      const vis = () => { if (ended) return; if (document.hidden) v.pause(); else v.play().catch(() => {}); };
      document.addEventListener('visibilitychange', vis);
      // сразу со звуком; браузер не разрешил — без звука и с кнопкой
      v.muted = false;
      const p = v.play();
      if (p && p.catch) p.catch(() => { if (ended) return; v.muted = true; snd.classList.remove('hidden'); v.play().catch(() => finish()); });
    });
  },
};
