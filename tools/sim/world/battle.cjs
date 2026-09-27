'use strict';
/* Модель боёв для симуляции: те же правила, что в duel.js (Капища, вторжения) и raid.js (разломы), —
   удары, энергия, приёмы, щиты, уклоны, смена духа, таймер, — но без экрана и за доли миллисекунды.
   Живого игрока описывает «мастерство» sk: { tap — доля от предельного темпа ударов, orb — тапов в мини-игре приёма
   (из 12), shield — ставит ли щит на приём соперника, dodge — успевает ли увернуться в разломе, water — пьёт ли Живую воду }.
   При eff ≈ 0,6 игрок наносит около 60% от предельного урона (Rules.duelMaxDamage / raidMaxDamage). */

function skillOf(eff, dodge) {
  const e = Math.max(0.3, Math.min(0.95, eff));
  return { tap: 0.55 + 0.5 * e, orb: 4 + 10 * e, shield: 0.35 + 0.7 * e, dodge: dodge == null ? 0.25 + 0.6 * e : dodge, water: true, switchSmart: e > 0.55 };
}

// Поединок 3 на 3 (duel.js): me — [{ sp, hpf }] (hpf — доля здоровья на входе), foe — духи соперника, T — { speed, shield }
function duel(G, me, foe, T, sk, rnd = Math.random) {
  const { S, SP, Raid, Duel } = G, MOVES = G.MOVES;
  const fighter = (sp, f) => { const x = S.battle(sp), max = x.hp * Duel.HPX; return { sp, atk: x.atk, def: x.def, max, cur: Math.max(1, Math.round(max * f)), energy: 0, emul: x.energy || 1, el: SP[sp.sid].el, move2: !!sp.move2 }; };
  const A = { team: me.map(m => fighter(m.sp, m.hpf == null ? 1 : m.hpf)), idx: 0, shields: 2, busy: 0 };
  const B = { team: foe.map(sp => fighter(sp, 1)), idx: 0, shields: 2, busy: 1.5 };
  const eff = (a, d) => Raid.eff(a, d);
  // первым выпускаем духа, выгодного против первого духа соперника
  const pickBest = () => {
    const f = B.team[B.idx];
    let best = -1, bv = -1;
    A.team.forEach((m, i) => { if (m.cur <= 0) return; const v = eff(m.el, f.el) / eff(f.el, m.el) * (sk.switchSmart ? 1 : 0.5 + rnd()) * (0.4 + 0.6 * m.cur / m.max); if (v > bv) { bv = v; best = i; } });
    return best;
  };
  A.idx = Math.max(0, pickBest());
  let t = Duel.TIME, dealt = 0, pause = 0; // pause — паузы на приёмы и смену духа: игровое время стоит, настоящее идёт
  const tapGap = 0.5 / sk.tap;
  let nextTap = tapGap * rnd();
  const dt = 0.05;
  const faint = side => {
    const s = side === 'A' ? A : B;
    const alive = s.team.some(x => x.cur > 0);
    if (!alive) return true;
    if (side === 'B') { s.idx = s.team.findIndex(x => x.cur > 0); s.busy = 1.2; pause += 0.9; } // добровольную смену (перезарядка 25 с) не моделируем
    else { A.idx = pickBest(); A.busy = 0.3; pause += 1.5; }
    return false;
  };
  let over = null;
  while (t > 0 && !over) {
    t -= dt; A.busy -= dt; B.busy -= dt; nextTap -= dt;
    const m = A.team[A.idx], f = B.team[B.idx];
    // соперник
    if (B.busy <= 0) {
      if (f.energy >= Duel.COST && (rnd() < 0.45 || m.cur < m.max * 0.35)) {
        f.energy -= Duel.COST; pause += 1;
        const useShield = A.shields > 0 && rnd() < sk.shield;
        let n;
        if (useShield) { A.shields--; n = 1; } else n = Raid.dmg(f.atk, m.def, Duel.CHARGE, f.el, m.el);
        m.cur -= n; B.busy = T.speed;
        if (m.cur <= 0 && faint('A')) { over = 'B'; break; }
        continue; // пауза на решение — время не идёт
      }
      f.energy = Math.min(100, f.energy + 7);
      const n = Raid.dmg(f.atk, m.def, Duel.FAST, f.el, m.el);
      m.cur -= n; B.busy = T.speed + rnd() * 0.25;
      if (m.cur <= 0 && faint('A')) { over = 'B'; break; }
      if (m.cur <= 0) continue;
    }
    // игрок: приём, как только хватает энергии (второй — если выучен и дешевле)
    const mm = A.team[A.idx];
    const kind = mm.energy >= MOVES.charge.cost ? 'charge' : mm.move2 && mm.energy >= MOVES.charge2.cost ? 'charge2' : null;
    if (kind) {
      mm.energy -= MOVES[kind].cost; pause += 2.2;
      const taps = Math.max(0, sk.orb + (rnd() - 0.5) * 4), mult = 0.55 + 0.45 * Math.min(1, taps / 12);
      const ff = B.team[B.idx];
      const shield = B.shields > 0 && rnd() < T.shield * (ff.cur < ff.max * 0.5 ? 1.2 : 0.9);
      let n;
      if (shield) { B.shields--; n = 1; } else n = Raid.dmg(mm.atk, ff.def, MOVES[kind].power * mult, mm.el, ff.el);
      ff.cur -= n; dealt += Math.min(n, ff.cur + n);
      if (ff.cur <= 0 && faint('B')) { over = 'A'; break; }
      continue;
    }
    if (A.busy <= 0 && nextTap <= 0) {
      const ff = B.team[B.idx];
      A.busy = 0.5; nextTap = tapGap * (0.8 + 0.4 * rnd());
      mm.energy = Math.min(100, mm.energy + 7 * mm.emul);
      const n = Raid.dmg(mm.atk, ff.def, Duel.FAST, mm.el, ff.el);
      ff.cur -= n; dealt += Math.min(n, ff.cur + n);
      if (ff.cur <= 0 && faint('B')) { over = 'A'; break; }
    }
  }
  const share = s => s.team.reduce((a, x) => a + Math.max(0, x.cur) / x.max, 0) / s.team.length;
  const win = over ? over === 'A' : share(A) >= share(B);
  const hp = {};
  A.team.forEach(x => { hp[x.sp.uid] = Math.round(Math.max(0, x.cur) / x.max * 1000) / 1000; });
  return { win, t: Duel.TIME - Math.max(0, t) + pause, hp, dealt };
}

// Разлом (raid.js): players — [{ team: [{ sp, hpf }], sk, waterLeft }] (первый — сам игрок, остальные — союзники), r — разлом { tier, boss, rl }
function raid(G, players, r, hpMul = 1, rnd = Math.random) {
  const { S, SP, Raid } = G, T = Raid.TIER[r.tier], bs = Raid.bossStats(r), bel = SP[r.boss].el;
  let bossHp = Math.round(bs.hp * hpMul), t = 90;
  const P = players.map(p => ({
    sk: p.sk, waterLeft: p.waterLeft || 0, waters: 0, ko: false, energy: 0, cool: 0, idx: 0, dealt: 0,
    nextAtk: 3.2, tele: 0, tapGap: 0.32 / p.sk.tap, nextTap: rnd() * 0.3,
    team: p.team.map(m => { const x = S.battle(m.sp); return { sp: m.sp, atk: x.atk, def: x.def, emul: x.energy || 1, el: SP[m.sp.sid].el, max: x.hp * 5, cur: Math.max(1, Math.round(x.hp * 5 * (m.hpf == null ? 1 : m.hpf))) }; }),
  }));
  // первым — самый сильный против босса
  P.forEach(p => { p.team.sort((a, b) => b.atk * Raid.eff(b.el, bel) - a.atk * Raid.eff(a.el, bel)); });
  const dt = 0.05;
  while (t > 0 && bossHp > 0 && P.some(p => !p.ko)) {
    t -= dt;
    for (const p of P) {
      if (p.ko) continue;
      p.cool -= dt; p.nextTap -= dt;
      const m = p.team[p.idx];
      // босс бьёт каждого Ловчего отдельно (у каждого — свой экран)
      if (p.tele > 0) {
        p.tele -= dt;
        if (p.tele <= 0) {
          p.nextAtk = 2.2 + rnd() * 1.4;
          let n = Raid.dmg(bs.atk, m.def, bs.pw || T.pw, bel, m.el);
          if (rnd() < p.sk.dodge) n = Math.max(1, Math.floor(n * 0.2));
          m.cur = Math.max(0, m.cur - n);
          if (m.cur <= 0) {
            const next = p.team.findIndex(x => x.cur > 0);
            if (next < 0) { p.ko = true; continue; }
            p.idx = next; p.energy = 0;
          } else if (p.sk.water && p.waterLeft > 0 && p.waters < 3 && m.cur < m.max * 0.3) {
            p.waterLeft--; p.waters++; m.cur = Math.min(m.max, m.cur + m.max / 2);
          }
        }
      } else { p.nextAtk -= dt; if (p.nextAtk <= 0) p.tele = 0.9; }
      const c = p.team[p.idx];
      if (p.energy >= 50) {
        p.energy -= 50;
        const n = Raid.dmg(c.atk, bs.def, 75, c.el, bel); bossHp -= n; p.dealt += n;
      } else if (p.cool <= 0 && p.nextTap <= 0) {
        p.cool = 0.32; p.nextTap = p.tapGap * (0.8 + 0.4 * rnd());
        p.energy = Math.min(100, p.energy + 6 * c.emul);
        const n = Raid.dmg(c.atk, bs.def, 12, c.el, bel); bossHp -= n; p.dealt += n;
      }
      if (bossHp <= 0) break;
    }
  }
  const me = P[0], hp = {};
  me.team.forEach(x => { hp[x.sp.uid] = Math.round(Math.max(0, x.cur) / x.max * 1000) / 1000; });
  return { win: bossHp <= 0, t: 90 - Math.max(0, t), hp, waters: me.waters, dealt: me.dealt, left: Math.max(0, bossHp) / (bs.hp * hpMul) };
}

module.exports = { skillOf, duel, raid };
