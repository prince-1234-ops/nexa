
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FIGHT NIGHT — MMA Arena</title>
<style>
:root {
  --metal: #c9cbd0;
  --ink: #08090b;
  --red: #a83237;
  --blue: #728a9e;
  --panel: #111316;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  min-height: 100%;
  background: #08090b;
  color: #e8e8e8;
  font-family: Arial, Helvetica, sans-serif;
  overflow-x: hidden;
}

body {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 18px;
  background: radial-gradient(ellipse at 50% 0%, #25272a, #101113 46%, #050506);
}

.shell {
  width: min(1120px, 100%);
}

.topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  font-weight: 900;
  letter-spacing: .19em;
  font-size: clamp(14px, 2vw, 20px);
}

.brand span {
  color: #aeb3ba;
}

.emblem {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  border: 1px solid #73777d;
  border-radius: 50%;
  background: linear-gradient(135deg, #393c41, #111214);
}

.top-actions {
  display: flex;
  gap: 8px;
}

button {
  font: inherit;
  cursor: pointer;
  touch-action: manipulation;
}

.small-btn {
  background: #191b1e;
  color: #d4d5d8;
  border: 1px solid #45484d;
  border-radius: 4px;
  padding: 8px 12px;
  font-weight: 750;
  font-size: 11px;
}

.gameframe {
  position: relative;
  border: 1px solid #55585d;
  overflow: hidden;
  box-shadow: 0 25px 80px #000c, 0 0 0 5px #151618;
  background: #08090b;
}

canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  background: #090a0b;
}

.hud {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  display: grid;
  grid-template-columns: 1fr 72px 1fr;
  align-items: start;
  gap: 14px;
  padding: 18px 21px;
  pointer-events: none;
  text-shadow: 0 2px 4px #000;
}

.fighter-ui {
  min-width: 0;
}

.fighter-ui.right {
  text-align: right;
}

.fighter-name {
  font-size: clamp(10px, 1.2vw, 14px);
  font-weight: 900;
  letter-spacing: .17em;
  margin-bottom: 8px;
}

.fighter-name small {
  font-size: .72em;
  opacity: .62;
}

.bar-outline {
  height: 11px;
  padding: 2px;
  background: #08090a;
  border: 1px solid #7f8388;
}

.healthbar {
  height: 100%;
  width: 100%;
  transition: width .12s linear;
  background: #b6b9bd;
}

.healthbar.enemy {
  background: #a63a40;
}

.bar-outline.enemybox {
  display: flex;
  justify-content: flex-end;
}

.bar-outline.enemybox .healthbar {
  background: #a63a40;
}

.fighter-sub {
  margin-top: 6px;
  color: #aeb1b6;
  font-size: 9px;
  font-weight: 700;
}

.timer-wrap {
  text-align: center;
}

.timer {
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 850;
}

.round {
  font-size: 8px;
  color: #b0b2b6;
  margin-top: 6px;
}

.center-message {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
  background: linear-gradient(90deg, #050606df, #0a0a0bdc, #050606df);
  padding: 20px;
  text-align: center;
}

.center-message.hidden {
  display: none;
}

.modal-inner {
  max-width: 560px;
  width: 100%;
  padding: clamp(20px, 4vw, 38px);
  border: 1px solid #55595d;
  background: linear-gradient(145deg, #1a1c1fF5, #090a0bf7);
}

.eyebrow {
  font-size: 10px;
  letter-spacing: .28em;
  color: #b0b5bb;
  font-weight: 900;
}

h1 {
  margin: 12px 0 5px;
  font-size: clamp(34px, 6.5vw, 63px);
  line-height: .95;
  letter-spacing: .045em;
  font-weight: 950;
  text-transform: uppercase;
  color: #f0f0f0;
}

.subtitle {
  color: #bfc1c5;
  line-height: 1.6;
  font-size: 13px;
  margin: 13px auto 21px;
  max-width: 430px;
}

.start-btn {
  border: 1px solid #9a9da1;
  color: #f4f4f4;
  background: linear-gradient(180deg, #383b3f, #1e2023);
  padding: 14px 25px;
  font-weight: 900;
  letter-spacing: .16em;
  min-width: 190px;
}

.key-hints {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  color: #b8bbc0;
  font-size: 10px;
}

kbd {
  background: #242629;
  border: 1px solid #51545a;
  border-bottom-width: 2px;
  border-radius: 3px;
  padding: 3px 6px;
  color: #f4f4f4;
  font: 800 10px monospace;
  margin-right: 3px;
}

.bottomline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding-top: 12px;
  color: #7f8389;
  font-size: 10px;
}

.status {
  color: #d7d9dc;
  font-weight: 800;
}

.mobile-controls {
  display: none;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
  user-select: none;
}

.control-cluster {
  display: flex;
  gap: 7px;
  align-items: stretch;
  justify-content: center;
}

.control-btn {
  flex: 1;
  min-height: 48px;
  border-radius: 4px;
  border: 1px solid #414449;
  background: linear-gradient(180deg, #26282b, #141517);
  color: #ececee;
  font-weight: 900;
  font-size: 11px;
  box-shadow: 0 4px 0 #050506;
  touch-action: none;
}

.control-btn.attack {
  border-color: #6b4547;
  background: linear-gradient(180deg, #332326, #171416);
}

@media (max-width: 680px) {
  body {
    padding: 8px;
    align-items: flex-start;
  }

  .topline {
    margin-bottom: 8px;
  }

  .hud {
    padding: 10px 9px;
    grid-template-columns: 1fr 43px 1fr;
    gap: 7px;
  }

  .fighter-name {
    letter-spacing: .07em;
    margin-bottom: 5px;
  }

  .fighter-sub {
    font-size: 7px;
  }

  .round {
    font-size: 7px;
  }

  .timer {
    font-size: 23px;
  }

  .mobile-controls {
    display: grid;
  }

  .bottomline {
    font-size: 8px;
    flex-wrap: wrap;
  }
}
</style>
</head>

<body>
<div class="shell">

  <div class="topline">
    <div class="brand">
      <div class="emblem">FN</div>
      <div>FIGHT <span>NIGHT</span></div>
    </div>

    <div class="top-actions">
      <button class="small-btn" id="soundBtn">♫ SOUND: ON</button>
      <button class="small-btn" id="restartBtn">↻ RESTART</button>
    </div>
  </div>

  <main class="gameframe">
    <canvas id="game" width="1000" height="562"></canvas>

    <div class="hud">
      <div class="fighter-ui">
        <div class="fighter-name">RED CORNER <small>PLAYER 1</small></div>
        <div class="bar-outline">
          <div class="healthbar" id="playerHealth"></div>
        </div>
        <div class="fighter-sub" id="playerSub">HEAVY READY</div>
      </div>

      <div class="timer-wrap">
        <div class="timer" id="timer">99</div>
        <div class="round">ROUND 01</div>
      </div>

      <div class="fighter-ui right">
        <div class="fighter-name">BLUE CORNER <small>CPU</small></div>
        <div class="bar-outline enemybox">
          <div class="healthbar enemy" id="enemyHealth"></div>
        </div>
        <div class="fighter-sub" id="enemySub">OPPONENT</div>
      </div>
    </div>

    <div class="center-message" id="overlay">
      <div class="modal-inner">
        <div class="eyebrow">MIXED MARTIAL ARTS · ROUND 01</div>
        <h1 id="overlayTitle">FIGHT NIGHT</h1>
        <div class="subtitle" id="overlayText">
          Read your opponent, protect your head, and land clean strikes.
          Win by knockout or lead when the round ends.
        </div>
        <button class="start-btn" id="startBtn">START ROUND</button>

        <div class="key-hints">
          <span><kbd>A</kbd><kbd>D</kbd> Move</span>
          <span><kbd>W</kbd> Dodge</span>
          <span><kbd>S</kbd> Guard</span>
          <span><kbd>J</kbd> Jab</span>
          <span><kbd>K</kbd> Kick</span>
          <span><kbd>L</kbd> Heavy</span>
        </div>
      </div>
    </div>
  </main>

  <div class="mobile-controls">
    <div class="control-cluster">
      <button class="control-btn" data-key="a">LEFT</button>
      <button class="control-btn" data-key="d">RIGHT</button>
      <button class="control-btn" data-key="w">DODGE</button>
      <button class="control-btn" data-key="s">GUARD</button>
    </div>

    <div class="control-cluster">
      <button class="control-btn attack" data-key="j">JAB</button>
      <button class="control-btn attack" data-key="k">KICK</button>
      <button class="control-btn attack" data-key="l">HEAVY</button>
    </div>
  </div>

  <div class="bottomline">
    <span>KEEP YOUR GUARD UP. PICK YOUR SHOTS.</span>
    <span class="status" id="statusText">READY TO FIGHT</span>
    <span>KEYBOARD AND TOUCH CONTROLS</span>
  </div>
</div>

<script>
(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;
  const FLOOR = 456;

  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const startBtn = document.getElementById("startBtn");
  const statusText = document.getElementById("statusText");
  const playerHealthEl = document.getElementById("playerHealth");
  const enemyHealthEl = document.getElementById("enemyHealth");
  const timerEl = document.getElementById("timer");
  const playerSub = document.getElementById("playerSub");
  const enemySub = document.getElementById("enemySub");
  const soundBtn = document.getElementById("soundBtn");

  const keys = Object.create(null);
  const justPressed = Object.create(null);

  let gameState = "intro";
  let timeLeft = 99;
  let lastTimestamp = 0;
  let soundOn = true;
  let audioCtx = null;
  let shake = 0;
  let frame = 0;
  let particles = [];
  let announceTimer = 0;
  let announcement = "";

  function makeFighter(name, x, cpu = false) {
    return {
      name,
      x,
      y: FLOOR,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      cpu,
      grounded: true,
      blocking: false,
      attack: null,
      stun: 0,
      flash: 0,
      facing: cpu ? -1 : 1,
      walk: 0,
      combo: 0,
      comboTimer: 0,
      specialCooldown: 0,
      aiTimer: 0.5,
      aiBlock: 0,
      winPose: 0,
      dodgeTimer: 0
    };
  }

  let player;
  let enemy;

  function resetGame() {
    player = makeFighter("RED", 285);
    enemy = makeFighter("BLUE", 715, true);

    timeLeft = 99;
    particles = [];
    shake = 0;
    frame = 0;
    announceTimer = 0;
    announcement = "";
    gameState = "intro";

    updateHud();

    statusText.textContent = "READY TO FIGHT";
    overlayTitle.textContent = "FIGHT NIGHT";
    overlayText.textContent =
      "A fight under the lights. Protect your head, manage distance, and land clean strikes.";

    startBtn.textContent = "START ROUND";
    overlay.classList.remove("hidden");
  }

  function startGame() {
    if (gameState === "playing") return;

    if (gameState === "over") resetGame();

    gameState = "playing";
    overlay.classList.add("hidden");
    statusText.textContent = "FIGHT!";
    lastTimestamp = performance.now();
    unlockAudio();
  }

  function endGame(winner) {
    gameState = "over";
    overlay.classList.remove("hidden");

    if (winner === "player") {
      overlayTitle.textContent = "YOU WIN";
      overlayText.textContent = "You controlled the distance and stopped your opponent.";
      statusText.textContent = "CHAMPION";
    } else if (winner === "enemy") {
      overlayTitle.textContent = "KNOCKED OUT";
      overlayText.textContent = "You lost this round. Keep your guard up and manage distance.";
      statusText.textContent = "ROUND LOST";
    } else {
      overlayTitle.textContent = "TIME UP";
      overlayText.textContent =
        player.health >= enemy.health ? "YOU TAKE THE ROUND!" : "OPPONENT TAKES THE ROUND!";
      statusText.textContent = "TIME UP";
    }

    startBtn.textContent = "FIGHT AGAIN";
    playSound(winner === "player" ? "win" : "hit");
  }

  function unlockAudio() {
    if (!soundOn) return;

    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (error) {
      console.warn("Audio is unavailable.");
    }
  }

  function playSound(type) {
    if (!soundOn) return;

    unlockAudio();
    if (!audioCtx) return;

    const sounds = {
      punch: [110, 0.075, "square", 0.035],
      kick: [80, 0.12, "sawtooth", 0.045],
      block: [210, 0.055, "triangle", 0.025],
      special: [340, 0.2, "sawtooth", 0.035],
      hit: [65, 0.16, "triangle", 0.06],
      win: [520, 0.35, "triangle", 0.035]
    };

    const s = sounds[type] || sounds.hit;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = s[2];
    osc.frequency.setValueAtTime(s[0], now);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(35, s[0] * 0.53),
      now + s[1]
    );

    gain.gain.setValueAtTime(s[3], now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + s[1]);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + s[1] + 0.015);
  }

  function setAnnouncement(text) {
    announcement = text;
    announceTimer = 0.85;
  }

  function spawnSparks(x, y, color, count = 9) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 250;

      particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 40,
        life: 0.25 + Math.random() * 0.35,
        maxLife: 0.6,
        size: 2 + Math.random() * 4,
        color
      });
    }
  }

  function startAttack(f, type) {
    if (gameState !== "playing" || f.stun > 0 || f.attack || !f.grounded) {
      return;
    }

    if (type === "special" && f.specialCooldown > 0) return;

    const specs = {
      punch: { duration: 0.34, damage: 6, reach: 93, hitAt: 0.37, stun: 0.22 },
      kick: { duration: 0.53, damage: 11, reach: 122, hitAt: 0.43, stun: 0.31 },
      special: { duration: 0.62, damage: 15, reach: 132, hitAt: 0.55, stun: 0.38 }
    };

    const s = specs[type];
    f.attack = { type, t: 0, ...s, hitDone: false };
    f.blocking = false;

    if (type === "special") {
      f.specialCooldown = 3;
      playSound("special");
      setAnnouncement("HEAVY STRIKE");
    }
  }

  function hurt(target, source, damage, hitType) {
    const fromFront = target.facing === -source.facing;
    const blocked = target.blocking && target.grounded && fromFront;
    const realDamage = blocked ? Math.max(1, Math.round(damage * 0.18)) : damage;

    target.health = Math.max(0, target.health - realDamage);
    target.flash = blocked ? 0.08 : 0.14;
    target.stun = blocked ? 0.08 : hitType === "kick" ? 0.32 : 0.22;

    target.vx = source.facing * (
      blocked ? 48 : hitType === "kick" ? 155 : 92
    );

    if (!blocked) target.vy = 0;

    source.comboTimer = 1.25;

    if (!blocked) {
      source.combo++;
      spawnSparks(target.x, target.y - 59, "#b8c1ca", hitType === "kick" ? 6 : 4);
      shake = Math.max(shake, hitType === "kick" ? 3 : 1.5);
      playSound("hit");

      setAnnouncement(
        source.combo >= 3 ? "COMBINATION x" + source.combo :
        hitType === "kick" ? "CLEAN KICK" :
        hitType === "special" ? "HEAVY SHOT" : "CLEAN HIT"
      );
    } else {
      spawnSparks(target.x - source.facing * 22, target.y - 63, "#9ddcff", 5);
      playSound("block");
      setAnnouncement("BLOCKED");
    }

    updateHud();

    if (target.health <= 0) {
      endGame(source === player ? "player" : "enemy");
    }
  }

  function updateHud() {
    playerHealthEl.style.width = Math.max(0, player.health) + "%";
    enemyHealthEl.style.width = Math.max(0, enemy.health) + "%";

    timerEl.textContent = Math.max(0, Math.ceil(timeLeft))
      .toString().padStart(2, "0");

    playerSub.textContent =
      (player.specialCooldown <= 0 ? "HEAVY READY" :
      "HEAVY " + player.specialCooldown.toFixed(1) + "s") +
      " · COMBO x" + player.combo;

    enemySub.textContent =
      enemy.specialCooldown <= 0 ? "OPPONENT · HEAVY READY" :
      "OPPONENT · HEAVY " + enemy.specialCooldown.toFixed(1) + "s";
  }

  function updateFighter(f, other, dt) {
    f.facing = other.x >= f.x ? 1 : -1;

    if (f.flash > 0) f.flash = Math.max(0, f.flash - dt);
    if (f.dodgeTimer > 0) f.dodgeTimer = Math.max(0, f.dodgeTimer - dt);
    if (f.stun > 0) {
      f.stun = Math.max(0, f.stun - dt);
      f.blocking = false;
    }

    if (f.specialCooldown > 0) {
      f.specialCooldown = Math.max(0, f.specialCooldown - dt);
    }

    if (f.comboTimer > 0) {
      f.comboTimer -= dt;
      if (f.comboTimer <= 0) f.combo = 0;
    }

    if (f.attack) {
      f.attack.t += dt;

      if (!f.attack.hitDone &&
          f.attack.t / f.attack.duration >= f.attack.hitAt) {

        const range = Math.abs(other.x - f.x);

        if (range < f.attack.reach &&
            Math.abs(other.y - f.y) < 78 &&
            other.health > 0) {

          if (other.dodgeTimer <= 0) {
            hurt(other, f, f.attack.damage, f.attack.type);
          } else {
            setAnnouncement("STRIKE EVADED");
          }
        }

        f.attack.hitDone = true;
      }

      if (f.attack.t >= f.attack.duration) f.attack = null;
    }

    if (f.grounded && Math.abs(f.vx) > 0) {
      f.x += f.vx * dt;
      f.vx *= Math.pow(0.0008, dt);
      if (Math.abs(f.vx) < 6) f.vx = 0;
    }

    f.x = Math.max(62, Math.min(W - 62, f.x));
    f.walk += dt * (Math.abs(f.vx) > 20 ? 9 : 2);
  }

  function playerInput(dt) {
    if (player.stun > 0) return;

    const left = keys.a || keys.arrowleft;
    const right = keys.d || keys.arrowright;

    player.blocking = !!(keys.s || keys.arrowdown) && !player.attack;

    if (!player.attack && !player.blocking) {
      const direction = (right ? 1 : 0) - (left ? 1 : 0);

      if (direction) {
        player.x += direction * 255 * dt;
        player.x = Math.max(62, Math.min(W - 62, player.x));
        player.walk += dt * 10;
      }
    }

    if (justPressed.w || justPressed.arrowup) {
      if (!player.attack && player.grounded) {
        player.dodgeTimer = 0.24;
        player.x = Math.max(
          62,
          Math.min(W - 62, player.x - player.facing * 48)
        );
      }
    }

    if (justPressed.j) startAttack(player, "punch");
    if (justPressed.k) startAttack(player, "kick");
    if (justPressed.l) startAttack(player, "special");
  }

  function cpuInput(dt) {
    if (enemy.stun > 0) return;

    const distance = Math.abs(player.x - enemy.x);
    const dir = player.x > enemy.x ? 1 : -1;

    enemy.aiTimer -= dt;
    enemy.aiBlock = Math.max(0, enemy.aiBlock - dt);
    enemy.blocking = enemy.aiBlock > 0 && !enemy.attack;

    if (!enemy.attack && !enemy.blocking) {
      if (distance > 125) {
        enemy.x += dir * (distance > 270 ? 125 : 75) * dt;
        enemy.walk += dt * 9;
      }

      if (enemy.aiTimer <= 0) {
        enemy.aiTimer = 0.22 + Math.random() * 0.48;

        const playerWindup =
          player.attack && player.attack.t < player.attack.duration * 0.65;

        const roll = Math.random();

        if (playerWindup && distance < 140 && roll < 0.62) {
          enemy.aiBlock = 0.25 + Math.random() * 0.25;
          enemy.blocking = true;
        } else if (distance < 135 && roll < 0.55) {
          startAttack(enemy, roll < 0.29 ? "kick" : "punch");
        } else if (distance < 132 &&
                   enemy.specialCooldown <= 0 && roll > 0.78) {
          startAttack(enemy, "special");
        } else if (distance < 100 && roll < 0.18) {
          enemy.aiBlock = 0.3;
        }
      }
    }
  }

  function update(dt) {
    if (gameState !== "playing") return;

    frame++;
    timeLeft -= dt;

    if (timeLeft <= 0) {
      timeLeft = 0;
      updateHud();
      endGame("time");
      return;
    }

    playerInput(dt);
    cpuInput(dt);

    updateFighter(player, enemy, dt);
    updateFighter(enemy, player, dt);

    const dx = enemy.x - player.x;
    const minGap = 52;

    if (Math.abs(dx) < minGap) {
      const push = (minGap - Math.abs(dx)) / 2;
      player.x -= Math.sign(dx || 1) * push;
      enemy.x += Math.sign(dx || 1) * push;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 480 * dt;
      p.vx *= 0.985;

      if (p.life <= 0) particles.splice(i, 1);
    }

    if (shake > 0) shake = Math.max(0, shake - 28 * dt);
    if (announceTimer > 0) announceTimer = Math.max(0, announceTimer - dt);

    updateHud();

    for (const k in justPressed) delete justPressed[k];
  }

  function drawBackground() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#101214");
    bg.addColorStop(0.4, "#242629");
    bg.addColorStop(0.7, "#17191b");
    bg.addColorStop(1, "#08090a");

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Arena rigging.
    ctx.strokeStyle = "#45484b";
    ctx.lineWidth = 2;

    for (let x = -80; x < W + 100; x += 145) {
      ctx.beginPath();
      ctx.moveTo(500, 35);
      ctx.lineTo(x, 160);
      ctx.stroke();
    }

    ctx.strokeStyle = "#303336";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 86);
    ctx.lineTo(W, 86);
    ctx.stroke();

    // Arena spotlights.
    for (const x of [145, 335, 665, 855]) {
      const glow = ctx.createRadialGradient(x, 110, 3, x, 260, 245);
      glow.addColorStop(0, "rgba(235,238,240,.15)");
      glow.addColorStop(1, "rgba(235,238,240,0)");

      ctx.fillStyle = glow;
      ctx.fillRect(x - 220, 70, 440, 340);

      ctx.fillStyle = "#e0e2e4";
      ctx.fillRect(x - 9, 69, 18, 5);
    }

    // Dim crowd.
    for (let row = 0; row < 3; row++) {
      const base = 250 + row * 38;

      ctx.fillStyle = row === 0 ? "#111315" : "#090a0b";

      for (let x = -4; x < W + 10; x += 12) {
        const h = 11 + Math.abs(Math.sin(x * 0.093 + row * 1.9)) * 13;

        ctx.beginPath();
        ctx.ellipse(x + 4, base - h, 4.2, 4.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x, base - h + 4, 8, h + 14);
      }
    }

    // Cage fence.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 252, W, 190);
    ctx.clip();

    ctx.strokeStyle = "rgba(155,160,164,.24)";
    ctx.lineWidth = 0.8;

    for (let x = -220; x < W + 220; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, 246);
      ctx.lineTo(x + 150, 448);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 150, 246);
      ctx.lineTo(x, 448);
      ctx.stroke();
    }

    for (let y = 260; y < 448; y += 26) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.restore();

    ctx.strokeStyle = "#55595d";
    ctx.lineWidth = 5;

    for (const x of [24, 190, 375, 625, 810, 976]) {
      ctx.beginPath();
      ctx.moveTo(x, 242);
      ctx.lineTo(x, 452);
      ctx.stroke();
    }

    ctx.strokeStyle = "#777b80";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 275);
    ctx.lineTo(W, 275);
    ctx.moveTo(0, 323);
    ctx.lineTo(W, 323);
    ctx.stroke();

    // Canvas.
    const floor = ctx.createLinearGradient(0, 448, 0, H);
    floor.addColorStop(0, "#373a3d");
    floor.addColorStop(0.16, "#242629");
    floor.addColorStop(1, "#111214");

    ctx.fillStyle = floor;
    ctx.fillRect(0, 450, W, H - 450);

    ctx.strokeStyle = "#b5b8bb";
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 451);
    ctx.lineTo(W, 451);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "#d7d9db";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(500, 494, 68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function limb(x1, y1, x2, y2, width, color) {
    const g = ctx.createLinearGradient(x1 - width, y1, x2 + width, y2);

    g.addColorStop(0, "#443128");
    g.addColorStop(0.22, color);
    g.addColorStop(0.58, "#d0a184");
    g.addColorStop(0.82, color);
    g.addColorStop(1, "#5e4133");

    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(9,9,10,.65)";
    ctx.lineWidth = width + 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = g;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawGlove(x, y, angle, accent) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const g = ctx.createLinearGradient(-10, -8, 10, 9);
    g.addColorStop(0, "#55575a");
    g.addColorStop(0.3, "#222427");
    g.addColorStop(0.75, "#090a0b");
    g.addColorStop(1, "#494b4e");

    ctx.fillStyle = g;
    ctx.strokeStyle = "#090a0b";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.fillRect(-8, 5, 12, 3);

    ctx.restore();
  }

  function drawFighter(f) {
    const isPlayer = f === player;
    const skin = isPlayer ? "#a87455" : "#875d46";
    const skinLight = isPlayer ? "#d2a181" : "#b48262";
    const skinDark = isPlayer ? "#694735" : "#573b2d";
    const shorts = isPlayer ? "#202328" : "#2b2022";
    const trim = isPlayer ? "#b9bdc1" : "#a64045";

    const walk = Math.sin(f.walk) *
      (f.grounded && !f.attack ? 2.8 : 0);

    const breathing = Math.sin(frame * 0.075 + (isPlayer ? 0 : 1.7)) * 1.1;

    // Ground shadow.
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(f.x, FLOOR + 3, 37, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.facing, 1);

    // Legs.
    limb(-7, -44, -15 + walk, -25, 14, skin);
    limb(-15 + walk, -25, -22 + walk, -3, 10, skinDark);
    limb(7, -44, 14 - walk, -25, 14, skinLight);
    limb(14 - walk, -25, 20 - walk, -3, 10, skin);

    // Feet.
    ctx.fillStyle = "#18191b";
    ctx.beginPath();
    ctx.ellipse(-22 + walk, -2, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(19 - walk, -2, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // MMA shorts.
    const shortsG = ctx.createLinearGradient(-22, -51, 22, -23);
    shortsG.addColorStop(0, "#121416");
    shortsG.addColorStop(0.45, shorts);
    shortsG.addColorStop(1, "#08090a");

    ctx.fillStyle = shortsG;
    ctx.beginPath();
    ctx.moveTo(-18, -54);
    ctx.quadraticCurveTo(0, -49, 18, -54);
    ctx.lineTo(22, -32);
    ctx.lineTo(7, -25);
    ctx.lineTo(1, -36);
    ctx.lineTo(-5, -25);
    ctx.lineTo(-22, -32);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, -33);
    ctx.lineTo(-8, -31);
    ctx.moveTo(8, -31);
    ctx.lineTo(20, -33);
    ctx.stroke();

    // Upper body.
    ctx.save();
    ctx.translate(0, breathing);

    const torso = ctx.createLinearGradient(-24, -91, 24, -43);
    torso.addColorStop(0, skinDark);
    torso.addColorStop(0.2, skin);
    torso.addColorStop(0.47, skinLight);
    torso.addColorStop(0.72, skin);
    torso.addColorStop(1, skinDark);

    ctx.fillStyle = torso;
    ctx.beginPath();
    ctx.moveTo(-21, -84);
    ctx.quadraticCurveTo(-28, -90, -18, -93);
    ctx.quadraticCurveTo(-8, -99, 0, -95);
    ctx.quadraticCurveTo(12, -99, 20, -91);
    ctx.quadraticCurveTo(25, -88, 20, -79);
    ctx.lineTo(15, -54);
    ctx.quadraticCurveTo(7, -45, 0, -47);
    ctx.quadraticCurveTo(-10, -45, -16, -54);
    ctx.closePath();
    ctx.fill();

    // Chest and abdominal details.
    ctx.strokeStyle = "rgba(74,43,30,.55)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -85);
    ctx.lineTo(1, -66);
    ctx.moveTo(-1, -69);
    ctx.quadraticCurveTo(-8, -72, -13, -68);
    ctx.moveTo(2, -69);
    ctx.quadraticCurveTo(9, -72, 14, -68);
    ctx.moveTo(-9, -61);
    ctx.quadraticCurveTo(-3, -57, -1, -59);
    ctx.moveTo(3, -59);
    ctx.quadraticCurveTo(9, -57, 12, -61);
    ctx.moveTo(-8, -53);
    ctx.quadraticCurveTo(-3, -50, -1, -52);
    ctx.moveTo(3, -52);
    ctx.quadraticCurveTo(8, -50, 11, -54);
    ctx.stroke();

    // Neck.
    limb(-5, -91, -4, -101, 10, skin);
    limb(5, -91, 4, -101, 10, skinLight);

    // Guard position and punching animation.
    let rearHand = { x: -25, y: -83 };
    let frontElbow = { x: 25, y: -71 };
    let frontHand = { x: 24, y: -85 };

    if (f.blocking) {
      rearHand = { x: -10, y: -91 };
      frontElbow = { x: 20, y: -80 };
      frontHand = { x: 12, y: -94 };
    }

    if (f.attack && f.attack.type === "punch") {
      const p = f.attack.t / f.attack.duration;
      const ext = p > 0.13 && p < 0.78
        ? Math.sin((p - 0.13) / 0.65 * Math.PI) : 0;

      frontElbow = { x: 25 + ext * 14, y: -71 - ext * 2 };
      frontHand = { x: 24 + ext * 39, y: -82 - ext * 2 };
    }

    // Arms.
    limb(-17, -83, -27, -75, 12, skinDark);
    limb(-27, -75, -25, -83, 10, skin);
    limb(-25, -83, rearHand.x, rearHand.y, 9, skinLight);

    limb(17, -83, frontElbow.x, frontElbow.y, 13, skin);
    limb(frontElbow.x, frontElbow.y, frontHand.x, frontHand.y, 10, skinLight);

    drawGlove(rearHand.x, rearHand.y, -0.25, trim);
    drawGlove(frontHand.x, frontHand.y, -0.15, trim);

    // Head.
    ctx.fillStyle = skinDark;
    ctx.beginPath();
    ctx.ellipse(0, -110, 14, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    const headG = ctx.createLinearGradient(-13, -123, 14, -98);
    headG.addColorStop(0, skinDark);
    headG.addColorStop(0.36, skinLight);
    headG.addColorStop(0.72, skin);
    headG.addColorStop(1, skinDark);

    ctx.fillStyle = headG;
    ctx.beginPath();
    ctx.ellipse(0, -111, 12.5, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair.
    ctx.fillStyle = "#181513";
    ctx.beginPath();
    ctx.moveTo(-12, -116);
    ctx.quadraticCurveTo(-11, -130, 1, -128);
    ctx.quadraticCurveTo(12, -127, 13, -117);
    ctx.lineTo(8, -119);
    ctx.lineTo(1, -122);
    ctx.lineTo(-4, -118);
    ctx.closePath();
    ctx.fill();

    // Face.
    ctx.strokeStyle = "#4d3025";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(3, -113);
    ctx.lineTo(9, -114);
    ctx.stroke();

    ctx.fillStyle = "#171312";
    ctx.fillRect(5, -112, 3, 1.7);

    // Impact flash.
    if (f.flash > 0) {
      ctx.globalAlpha = Math.min(0.18, f.flash);
      ctx.fillStyle = "#fff";
      ctx.fillRect(-19, -91, 38, 45);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / (p.maxLife || 0.6)) * 0.6;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * 0.6, p.size,
        Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawAnnouncement() {
    if (announceTimer <= 0 || !announcement) return;

    ctx.save();
    ctx.globalAlpha = Math.min(1, announceTimer * 2);
    ctx.textAlign = "center";
    ctx.font = "800 18px Arial";
    ctx.fillStyle = "#e1e2e3";
    ctx.fillText(announcement, 500, 218);
    ctx.restore();
  }

  function draw() {
    ctx.save();

    if (shake > 0 && gameState === "playing") {
      ctx.translate(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake
      );
    }

    drawBackground();

    if (player.x < enemy.x) {
      drawFighter(player);
      drawFighter(enemy);
    } else {
      drawFighter(enemy);
      drawFighter(player);
    }

    drawParticles();
    drawAnnouncement();
    ctx.restore();
  }

  function loop(ts) {
    const dt = Math.min(
      0.033,
      (ts - (lastTimestamp || ts)) / 1000 || 0
    );

    lastTimestamp = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  const mappedKeys = {
    KeyA: "a",
    ArrowLeft: "arrowleft",
    KeyD: "d",
    ArrowRight: "arrowright",
    KeyW: "w",
    ArrowUp: "arrowup",
    KeyS: "s",
    ArrowDown: "arrowdown",
    KeyJ: "j",
    KeyK: "k",
    KeyL: "l"
  };

  window.addEventListener("keydown", e => {
    const k = mappedKeys[e.code] || e.key.toLowerCase();

    if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(k)) {
      e.preventDefault();
    }

    if (!keys[k]) justPressed[k] = true;
    keys[k] = true;

    if ((e.code === "Enter" || e.code === "Space") &&
        (gameState === "intro" || gameState === "over")) {
      startGame();
    }

    if (k === "escape" && gameState === "playing") {
      gameState = "paused";
      overlay.classList.remove("hidden");
      overlayTitle.textContent = "PAUSED";
      overlayText.textContent = "The fight is paused.";
      startBtn.textContent = "RESUME FIGHT";
      statusText.textContent = "PAUSED";
    }
  });

  window.addEventListener("keyup", e => {
    const k = mappedKeys[e.code] || e.key.toLowerCase();
    keys[k] = false;
  });

  window.addEventListener("blur", () => {
    for (const k in keys) keys[k] = false;
  });

  startBtn.addEventListener("click", () => {
    if (gameState === "paused") {
      gameState = "playing";
      overlay.classList.add("hidden");
      statusText.textContent = "FIGHT!";
      lastTimestamp = performance.now();
    } else {
      startGame();
    }
  });

  document.getElementById("restartBtn").addEventListener("click", () => {
    resetGame();
    startGame();
  });

  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.textContent = "♫ SOUND: " + (soundOn ? "ON" : "OFF");
    if (soundOn) unlockAudio();
  });

  document.querySelectorAll("[data-key]").forEach(btn => {
    const k = btn.dataset.key;

    const down = e => {
      e.preventDefault();
      if (!keys[k]) justPressed[k] = true;
      keys[k] = true;
      btn.classList.add("active");

      if (gameState === "intro") startGame();
    };

    const up = e => {
      e.preventDefault();
      keys[k] = false;
      btn.classList.remove("active");
    };

    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("pointerleave", up);
  });

  canvas.addEventListener("contextmenu", e => e.preventDefault());

  resetGame();
  requestAnimationFrame(loop);
})();
</script>
</body>
</html>
