// 2주차 실습 4 「SPACE DODGE」 모의 실행기
// 실제 CyberPi 연결이나 Python 해석기가 아닙니다. 예제 코드의 흐름을 JavaScript로 옮겨
// 128×128 LCD 화면, 효과음, 실행 중인 코드 위치를 브라우저에서 재현합니다.
// 아이콘 그림·효과음·반복 속도는 교육용 근사 표현이며 실제 기기와 수치 비교를 하지 않았습니다.

export const SPACE_DODGE_SOURCE = `# ==================================================
# 2주차 실습 4 : 기울기 조종 게임
# SPACE DODGE - 우주선 운석 피하기
# 스프라이트 + 기울기 센서 + 사운드
# ==================================================

import cyberpi
import time
import random


# 1. 게임 환경 설정
# --------------------------------------------------

DIR = 1              # 조종 방향 (반대라면 -1)
MAX_SPEED = 6        # 우주선 최대 이동 속도
ROCK_SPEED = 4       # 운석 낙하 속도
DELAY = 0.05         # 게임 반복 지연 시간
VOLUME = 70          # 사운드 볼륨 (0~100)

cyberpi.audio.set_vol(VOLUME)


# 2. 스프라이트 객체 생성
# --------------------------------------------------

player = cyberpi.sprite()
player.draw_pixel("rocket")
player.set_size(100)

rock = cyberpi.sprite()
rock.draw_pixel("fire")
rock.set_size(75)

player.hide()
rock.hide()
cyberpi.screen.render()


# 3. 게임 시작 화면
# --------------------------------------------------

cyberpi.display.clear()
cyberpi.console.println("SPACE DODGE")
cyberpi.console.println("우주선 운석 피하기")
cyberpi.console.println("A: 시작")

# 게임 준비 효과음
cyberpi.audio.play("ready")


# 4. 게임 전체 반복문
# --------------------------------------------------

while True:

    # A 버튼 입력 대기
    while not cyberpi.controller.is_press("a"):
        time.sleep(0.05)

    # 버튼을 놓을 때까지 대기
    while cyberpi.controller.is_press("a"):
        time.sleep(0.05)


    # 5. 게임 초기화
    # ----------------------------------------------

    cyberpi.display.clear()

    # 어두운 우주 배경
    cyberpi.background.fill(0, 0, 30)

    # 우주선과 운석의 시작 위치
    player.move_to(64, 110)
    rock.move_to(random.randint(10, 118), 0)

    player.show()
    rock.show()

    # 점수 초기화
    score = 0

    cyberpi.screen.render()

    # 게임 시작 효과음
    cyberpi.audio.play_until("start")


    # 6. 게임 진행 반복문
    # ----------------------------------------------

    while True:

        # 6-1. 기울기 센서 측정
        angle = cyberpi.get_roll() * DIR

        # 기울기 각도를 이동 속도로 변환
        speed = int(angle / 5)


        # 6-2. 최대 이동 속도 제한
        if speed > MAX_SPEED:
            speed = MAX_SPEED

        if speed < -MAX_SPEED:
            speed = -MAX_SPEED


        # 6-3. 우주선의 새로운 X좌표 계산
        x = player.get_x() + speed

        # 왼쪽 벽 충돌 방지
        if x < 8:
            x = 8

        # 오른쪽 벽 충돌 방지
        if x > 120:
            x = 120

        player.set_x(x)


        # 6-4. 운석을 아래쪽으로 이동
        rock.move_y(ROCK_SPEED)


        # 6-5. 우주선과 운석의 충돌 검사
        if player.is_touch(rock):

            cyberpi.screen.render()

            # 폭발 효과음이 끝날 때까지 재생
            cyberpi.audio.play_until("explosion")

            # 게임 진행 반복문 종료
            break


        # 6-6. 운석 회피 성공
        if rock.get_y() > 128:

            # 점수 1점 증가
            score = score + 1

            # 5점마다 특별 효과음 재생
            if score % 5 == 0:
                cyberpi.audio.play("level-up")

            # 일반 점수 획득 효과음
            else:
                cyberpi.audio.play("score")

            # 새로운 운석 생성
            rock.move_to(random.randint(10, 118), 0)


        # 6-7. 화면 갱신
        cyberpi.screen.render()

        # 게임 속도 조절
        time.sleep(DELAY)


    # 7. 게임 종료 및 결과 표시
    # ----------------------------------------------

    player.hide()
    rock.hide()

    cyberpi.screen.render()
    cyberpi.display.clear()

    cyberpi.console.println("GAME OVER")
    cyberpi.console.println("------------")
    cyberpi.console.println("점수: " + str(score))
    cyberpi.console.println("A: 다시 시작")

    # 게임 종료 효과음
    cyberpi.audio.play_until("sad")

    # 버튼 중복 입력 방지
    while cyberpi.controller.is_press("a"):
        time.sleep(0.05)
`;

export const SOURCE_LINES = SPACE_DODGE_SOURCE.replace(/\n$/, '').split('\n');

// 코드 줄 번호(0부터)를 문구로 찾습니다. 원본 코드를 고치면 이 목록도 함께 맞춰야 합니다.
function at(snippet, from = 0) {
  const index = SOURCE_LINES.findIndex((line, i) => i >= from && line.includes(snippet));
  if (index < 0) throw new Error('코드 줄을 찾지 못했습니다: ' + snippet);
  return index;
}
const L = {};
L.config = [at('# 1. 게임 환경 설정'), at('cyberpi.audio.set_vol(VOLUME)')];
L.sprites = [at('# 2. 스프라이트 객체 생성'), at('cyberpi.screen.render()', at('rock.hide()'))];
L.title = [at('# 3. 게임 시작 화면'), at('cyberpi.audio.play("ready")')];
L.waitPress = at('while not cyberpi.controller.is_press("a"):');
L.waitPressRange = [L.waitPress, at('time.sleep(0.05)', L.waitPress)];
L.waitRelease = at('while cyberpi.controller.is_press("a"):', L.waitPress + 1);
L.waitReleaseRange = [L.waitRelease, at('time.sleep(0.05)', L.waitRelease)];
L.init = [at('# 5. 게임 초기화'), at('cyberpi.audio.play_until("start")')];
L.start = at('cyberpi.audio.play_until("start")');
L.loop = [at('# 6-1. 기울기 센서 측정'), at('time.sleep(DELAY)')];
L.touch = at('if player.is_touch(rock):');
L.explosion = at('cyberpi.audio.play_until("explosion")');
L.levelUp = at('cyberpi.audio.play("level-up")');
L.score = at('cyberpi.audio.play("score")');
L.over = [at('# 7. 게임 종료 및 결과 표시'), at('cyberpi.audio.play_until("sad")')];
L.sad = at('cyberpi.audio.play_until("sad")');
L.release = at('while cyberpi.controller.is_press("a"):', L.sad);
L.releaseRange = [L.release, at('time.sleep(0.05)', L.release)];
export const CODE_LINES = L;

// 16×16 픽셀 아이콘. 이 페이지에서 그린 근사 그림이며 CyberPi 내장 아이콘의 복제가 아닙니다.
const ICONS = {
  rocket: {
    pal: {R: '#ff5a64', W: '#eef3f8', B: '#3d7bff', C: '#a6ecff', G: '#8b9bab', O: '#ff9f1c', Y: '#ffe36e'},
    art: [
      '.......RR.......',
      '......RRRR......',
      '.....RRRRRR.....',
      '.....WWWWWW.....',
      '.....WWBBWW.....',
      '.....WBCCBW.....',
      '.....WBCCBW.....',
      '.....WWBBWW.....',
      '.....WWWWWW.....',
      '....RWWWWWWR....',
      '...RRWWWWWWRR...',
      '..RRRWGWWGWRRR..',
      '..RR.WWWWWW.RR..',
      '......OYYO......',
      '......YOOY......',
      '.......OO.......'
    ]
  },
  fire: {
    pal: {R: '#e8402c', O: '#ff8c1a', Y: '#ffd23f', W: '#fff4cf'},
    art: [
      '.......R........',
      '.......RR.......',
      '......RRR.......',
      '......RRRR..R...',
      '..R..RROORR.R...',
      '..RR.ROOORRRR...',
      '..RRRROOOORRR...',
      '.RRROOOYOOORR...',
      '.RROOOYYYOOORR..',
      '.RROOYYYYYOORR..',
      '.RROYYYWYYYORR..',
      '.RROYYWWWYYORR..',
      '..ROYYWWWYYOR...',
      '..RROYYYYYORR...',
      '...RROOOOORR....',
      '.....RRRRR......'
    ]
  }
};
for (const [name, icon] of Object.entries(ICONS)) {
  if (icon.art.length !== 16 || icon.art.some(row => row.length !== 16)) throw new Error('아이콘 크기 오류: ' + name);
}
export const ICON_NAMES = Object.keys(ICONS);

// 효과음: CyberPi 내장 음원이 아니라 Web Audio로 합성한 근사음입니다. dur(초)는 play_until 대기 시간입니다.
const note = n => 440 * Math.pow(2, (n - 69) / 12);
function tone(ctx, out, t, {f, f2, d, type = 'square', g = .22, a = .006}) {
  const osc = ctx.createOscillator(), amp = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(f, t);
  if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t + d);
  amp.gain.setValueAtTime(.0001, t); amp.gain.exponentialRampToValueAtTime(g, t + a); amp.gain.exponentialRampToValueAtTime(.0001, t + d);
  osc.connect(amp).connect(out); osc.start(t); osc.stop(t + d + .03);
}
function noise(ctx, out, t, {d, g = .6, f = 2200, f2 = 110}) {
  const length = Math.ceil(ctx.sampleRate * d), buffer = ctx.createBuffer(1, length, ctx.sampleRate), data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), amp = ctx.createGain();
  source.buffer = buffer; filter.type = 'lowpass';
  filter.frequency.setValueAtTime(f, t); filter.frequency.exponentialRampToValueAtTime(f2, t + d);
  amp.gain.setValueAtTime(g, t); amp.gain.exponentialRampToValueAtTime(.0001, t + d);
  source.connect(filter).connect(amp).connect(out); source.start(t); source.stop(t + d);
}
const SOUNDS = {
  ready: {dur: .55, play: (c, o, t) => { tone(c, o, t, {f: note(72), d: .18, type: 'triangle', g: .32}); tone(c, o, t + .2, {f: note(79), d: .32, type: 'triangle', g: .32}); }},
  start: {dur: .95, play: (c, o, t) => { [72, 76, 79, 84].forEach((n, i) => tone(c, o, t + i * .13, {f: note(n), d: i === 3 ? .45 : .14, g: .16})); }},
  score: {dur: .16, play: (c, o, t) => { tone(c, o, t, {f: note(88), f2: note(95), d: .12, g: .14}); }},
  'level-up': {dur: .72, play: (c, o, t) => { [72, 76, 79, 84, 88].forEach((n, i) => tone(c, o, t + i * .08, {f: note(n), d: i === 4 ? .34 : .09, g: .15})); }},
  explosion: {dur: 1.0, play: (c, o, t) => { noise(c, o, t, {d: 1.0}); tone(c, o, t, {f: 150, f2: 38, d: .55, type: 'sawtooth', g: .22}); }},
  sad: {dur: 1.75, play: (c, o, t) => { [[67, .36], [66, .36], [65, .36], [64, .62]].reduce((s, [n, d], i) => { tone(c, o, s, {f: note(n), f2: note(n) * (i === 3 ? .94 : .99), d, type: 'triangle', g: .3}); return s + d + .02; }, t); }}
};

class SoundOutput {
  constructor() { this.ctx = null; this.master = null; this.volume = 1; this.muted = false; }
  unlock() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      try { this.ctx = new AudioContextClass(); } catch { return; }
      this.connect();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }
  connect() { this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination); this.apply(); }
  apply() { if (this.master) this.master.gain.value = this.muted ? 0 : this.volume * .55; }
  setVolume(value) { this.volume = Math.max(0, Math.min(100, Number(value) || 0)) / 100; this.apply(); }
  setMuted(muted) { this.muted = Boolean(muted); this.apply(); }
  silence() { if (!this.master) return; try { this.master.disconnect(); } catch {} this.connect(); }
  play(name) {
    const sound = SOUNDS[name];
    if (!sound) return .3;
    if (this.ctx && this.master && !this.muted) { try { sound.play(this.ctx, this.master, this.ctx.currentTime + .01); } catch {} }
    return sound.dur;
  }
}

class Cancelled extends Error {}
function makeToken() { return {cancelled: false, waits: new Set()}; }
function wait(token, ms) {
  return new Promise((resolve, reject) => {
    if (token.cancelled) { reject(new Cancelled()); return; }
    const entry = {id: 0, reject};
    entry.id = setTimeout(() => { token.waits.delete(entry); if (token.cancelled) reject(new Cancelled()); else resolve(); }, ms);
    token.waits.add(entry);
  });
}
function cancel(token) {
  token.cancelled = true;
  for (const entry of token.waits) { clearTimeout(entry.id); entry.reject(new Cancelled()); }
  token.waits.clear();
}

const LCD = 128, LINE = 16, MAX_ROWS = 8;
const FONT_FAMILY = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';

class Sprite {
  constructor() { this.icon = null; this.x = 64; this.y = 64; this.size = 100; this.visible = true; }
  get w() { return Math.max(1, Math.round(16 * this.size / 100)); }
  draw_pixel(name) { this.icon = ICONS[name] ? name : null; }
  set_size(percent) { this.size = Number(percent); }
  show() { this.visible = true; }
  hide() { this.visible = false; }
  move_to(x, y) { this.x = x; this.y = y; }
  set_x(x) { this.x = x; }
  move_y(dy) { this.y += dy; }
  get_x() { return this.x; }
  get_y() { return this.y; }
  get left() { return Math.round(this.x - this.w / 2); }
  get top() { return Math.round(this.y - this.w / 2); }
  // 두 아이콘의 채워진 픽셀이 한 칸이라도 겹치면 닿은 것으로 보는 근사 판정입니다.
  is_touch(other) {
    if (!this.visible || !other.visible || !this.icon || !other.icon) return false;
    const x0 = Math.max(this.left, other.left), x1 = Math.min(this.left + this.w, other.left + other.w);
    const y0 = Math.max(this.top, other.top), y1 = Math.min(this.top + this.w, other.top + other.w);
    if (x0 >= x1 || y0 >= y1) return false;
    const a = iconMask(this.icon, this.w), b = iconMask(other.icon, other.w);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (a[(y - this.top) * this.w + (x - this.left)] && b[(y - other.top) * other.w + (x - other.left)]) return true;
    }
    return false;
  }
}
// 크기를 바꾼 아이콘의 채움 여부(최근접 표본)를 미리 계산합니다.
const maskCache = new Map();
function iconMask(name, w) {
  const key = name + ':' + w;
  if (!maskCache.has(key)) {
    const art = ICONS[name].art, mask = new Uint8Array(w * w);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      mask[y * w + x] = art[Math.floor((y + .5) * 16 / w)][Math.floor((x + .5) * 16 / w)] !== '.' ? 1 : 0;
    }
    maskCache.set(key, mask);
  }
  return maskCache.get(key);
}

/**
 * @param {{canvas:HTMLCanvasElement,onPresent?:(mode:string)=>void,onLine?:(cursor:{line:number|null,range:number[]|null})=>void,onVars?:(vars:object)=>void}} options
 */
export function createSpaceDodge({canvas, onPresent, onLine, onVars}) {
  const ctx = canvas.getContext('2d');
  const iconImages = {};
  for (const [name, icon] of Object.entries(ICONS)) {
    const image = document.createElement('canvas'); image.width = image.height = 16;
    const c = image.getContext('2d');
    icon.art.forEach((row, y) => [...row].forEach((key, x) => { if (icon.pal[key]) { c.fillStyle = icon.pal[key]; c.fillRect(x, y, 1, 1); } }));
    iconImages[name] = image;
  }
  let scale = Math.max(1, Math.round(canvas.width / LCD));
  const screen = {mode: 'off', bg: 'rgb(0,0,0)', lines: [], sprites: [], frame: [], frameBg: 'rgb(0,0,0)'};
  const input = {a: false, b: false, roll: 0};
  const sound = new SoundOutput();
  let token = null, cursor = {line: null, range: null}, flashUntil = 0;

  function wrapLines(lines) {
    const rows = [], limit = (LCD - 4) * scale;
    for (const text of lines) {
      let row = '';
      for (const ch of text) {
        if (row && ctx.measureText(row + ch).width > limit) { rows.push(row); row = ch; } else row += ch;
      }
      rows.push(row);
    }
    return rows;
  }
  function draw() {
    const size = LCD * scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    if (screen.mode === 'sprite') {
      ctx.fillStyle = screen.frameBg; ctx.fillRect(0, 0, size, size);
      for (const s of screen.frame) {
        const image = iconImages[s.icon]; if (!image) continue;
        ctx.drawImage(image, s.left * scale, s.top * scale, s.w * scale, s.w * scale);
      }
    } else {
      ctx.fillStyle = screen.mode === 'off' ? '#030507' : '#000'; ctx.fillRect(0, 0, size, size);
      if (screen.mode === 'console') {
        ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'top'; ctx.font = `600 ${12 * scale}px ${FONT_FAMILY}`;
        wrapLines(screen.lines).slice(-MAX_ROWS).forEach((row, i) => ctx.fillText(row, 2 * scale, (3 + i * LINE) * scale));
      }
    }
    onPresent?.(screen.mode);
  }
  function setCursor(line, range = cursor.range) {
    if (line === cursor.line && range === cursor.range) return;
    cursor = {line, range}; onLine?.(cursor);
  }
  function vars(values) { onVars?.(values); }

  // 예제 코드의 cyberpi API 중 이 프로그램이 쓰는 부분만 흉내 냅니다.
  const cyberpi = {
    audio: {
      set_vol: value => sound.setVolume(value),
      play: name => { sound.play(name); },
      play_until: name => wait(token, sound.play(name) * 1000)
    },
    sprite: () => { const sprite = new Sprite(); screen.sprites.push(sprite); return sprite; },
    screen: {
      render() {
        screen.mode = 'sprite'; screen.frameBg = screen.bg;
        screen.frame = screen.sprites.filter(s => s.visible && s.icon).map(s => ({icon: s.icon, left: s.left, top: s.top, w: s.w}));
        draw();
      }
    },
    display: { clear() { screen.lines = []; screen.mode = 'console'; draw(); } },
    console: { println(text) { screen.lines.push(String(text)); screen.mode = 'console'; draw(); } },
    background: { fill(r, g, b) { screen.bg = `rgb(${r},${g},${b})`; } },
    controller: { is_press: key => Boolean(input[key]) },
    get_roll: () => Math.round(input.roll)
  };
  const randint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  async function program(tk) {
    const sleep = seconds => wait(tk, seconds * 1000);
    const DIR = 1, MAX_SPEED = 6, ROCK_SPEED = 4, DELAY = 0.05, VOLUME = 70;

    setCursor(L.config[1], L.config);
    cyberpi.audio.set_vol(VOLUME);

    setCursor(null, L.sprites);
    const player = cyberpi.sprite(); player.draw_pixel('rocket'); player.set_size(100);
    const rock = cyberpi.sprite(); rock.draw_pixel('fire'); rock.set_size(75);
    player.hide(); rock.hide(); cyberpi.screen.render();

    setCursor(null, L.title);
    cyberpi.display.clear();
    cyberpi.console.println('SPACE DODGE');
    cyberpi.console.println('우주선 운석 피하기');
    cyberpi.console.println('A: 시작');
    cyberpi.audio.play('ready');
    vars({phase: 'title'});

    while (true) {
      setCursor(L.waitPress, L.waitPressRange);
      while (!cyberpi.controller.is_press('a')) await sleep(0.05);
      setCursor(L.waitRelease, L.waitReleaseRange);
      while (cyberpi.controller.is_press('a')) await sleep(0.05);

      setCursor(null, L.init);
      cyberpi.display.clear();
      cyberpi.background.fill(0, 0, 30);
      player.move_to(64, 110);
      rock.move_to(randint(10, 118), 0);
      player.show(); rock.show();
      let score = 0;
      cyberpi.screen.render();
      vars({phase: 'ready', angle: null, speed: null, x: player.get_x(), rockY: rock.get_y(), score});
      setCursor(L.start, L.init);
      await cyberpi.audio.play_until('start');

      while (true) {
        const now = performance.now();
        if (now > flashUntil) setCursor(null, L.loop);
        const angle = cyberpi.get_roll() * DIR;
        let speed = Math.trunc(angle / 5); // Python int()와 같이 0 방향으로 버림
        if (speed > MAX_SPEED) speed = MAX_SPEED;
        if (speed < -MAX_SPEED) speed = -MAX_SPEED;
        let x = player.get_x() + speed;
        if (x < 8) x = 8;
        if (x > 120) x = 120;
        player.set_x(x);
        rock.move_y(ROCK_SPEED);

        if (player.is_touch(rock)) {
          cyberpi.screen.render();
          vars({phase: 'crash', angle, speed, x, rockY: rock.get_y(), score});
          setCursor(L.explosion, L.loop);
          await cyberpi.audio.play_until('explosion');
          break;
        }
        if (rock.get_y() > 128) {
          score = score + 1;
          if (score % 5 === 0) { cyberpi.audio.play('level-up'); setCursor(L.levelUp, L.loop); }
          else { cyberpi.audio.play('score'); setCursor(L.score, L.loop); }
          flashUntil = now + 450;
          rock.move_to(randint(10, 118), 0);
        }
        cyberpi.screen.render();
        vars({phase: 'play', angle, speed, x, rockY: rock.get_y(), score});
        await sleep(DELAY);
      }

      setCursor(null, L.over);
      player.hide(); rock.hide();
      cyberpi.screen.render();
      cyberpi.display.clear();
      cyberpi.console.println('GAME OVER');
      cyberpi.console.println('------------');
      cyberpi.console.println('점수: ' + String(score));
      cyberpi.console.println('A: 다시 시작');
      vars({phase: 'over', angle: null, speed: null, x: null, rockY: null, score});
      setCursor(L.sad, L.over);
      await cyberpi.audio.play_until('sad');
      setCursor(L.release, L.releaseRange);
      while (cyberpi.controller.is_press('a')) await sleep(0.05);
    }
  }

  const api = {
    get running() { return Boolean(token); },
    get scale() { return scale; },
    start() {
      api.stop(false);
      sound.unlock(); sound.silence();
      screen.sprites = []; screen.lines = []; screen.frame = []; screen.bg = screen.frameBg = 'rgb(0,0,0)'; screen.mode = 'console';
      flashUntil = 0; draw();
      const tk = token = makeToken();
      program(tk).catch(error => { if (!(error instanceof Cancelled)) { console.error(error); vars({phase: 'error', message: error.message}); } })
        .finally(() => { if (token === tk) token = null; });
    },
    stop(report = true) {
      if (token) { cancel(token); token = null; }
      sound.silence();
      screen.mode = 'off'; screen.lines = []; screen.sprites = []; screen.frame = [];
      draw(); setCursor(null, null);
      if (report) vars({phase: 'stopped'});
    },
    setButton(key, down) { input[key] = Boolean(down); },
    setRoll(degrees) { input.roll = Math.max(-180, Math.min(180, Number(degrees) || 0)); },
    setMuted(muted) { sound.setMuted(muted); },
    // 주어진 CSS 크기(px)를 채우고, LCD 1픽셀이 기기 픽셀 정수배에 가장 가깝도록 내부 해상도를 고릅니다.
    // 정확히 맞으면 픽셀 경계를 그대로, 아니면 부드럽게 확대·축소해 표시합니다.
    fit(available) {
      const dpr = window.devicePixelRatio || 1;
      const css = Math.max(180, Math.floor(available));
      const next = Math.max(2, Math.min(8, Math.round(css * dpr / LCD)));
      if (next !== scale) { scale = next; canvas.width = canvas.height = LCD * scale; }
      canvas.style.width = canvas.style.height = css + 'px';
      canvas.style.imageRendering = Math.abs(css * dpr - LCD * scale) < 1 ? 'pixelated' : 'auto';
      draw();
      return css;
    },
    redraw: draw
  };
  return api;
}
