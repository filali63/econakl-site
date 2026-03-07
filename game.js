'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');
const overlayScore = document.getElementById('overlay-score');
const startBtn = document.getElementById('start-btn');

const W = canvas.width;
const H = canvas.height;

// ─── Constants ────────────────────────────────────────────────────────────────
const GRAVITY = 0.35;
const JUMP_FORCE = -11;
const PLAYER_W = 46;
const PLAYER_H = 46;
const PLATFORM_W = 70;
const PLATFORM_H = 14;
const PLATFORM_COUNT = 9;
const SCROLL_THRESHOLD = H / 2.5;

// Platform types
const TYPE_NORMAL   = 'normal';
const TYPE_MOVING   = 'moving';
const TYPE_BREAKING = 'breaking';
const TYPE_SPRING   = 'spring';

// ─── Colour palette ───────────────────────────────────────────────────────────
const SKY_TOP    = '#cdeeff';
const SKY_BOT    = '#e8f8ff';
const P_NORMAL   = '#4caf50';
const P_MOVING   = '#2196f3';
const P_BREAKING = '#ff5722';
const P_SPRING   = '#9c27b0';

// ─── State ────────────────────────────────────────────────────────────────────
let player, platforms, score, highScore, gameRunning, animId;
let keys = {};
let cameraY = 0;          // world-units scrolled upward
let particles = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

// ─── Platform factory ─────────────────────────────────────────────────────────
function makePlatform(x, y, type = TYPE_NORMAL) {
  return {
    x, y,
    w: PLATFORM_W,
    h: PLATFORM_H,
    type,
    // moving
    dx: type === TYPE_MOVING ? (Math.random() < 0.5 ? 1.2 : -1.2) : 0,
    // breaking
    cracked: false,
    opacity: 1,
    // spring
    springActive: false,
  };
}

function randomType(score) {
  const r = Math.random();
  if (score < 500)  return TYPE_NORMAL;
  if (score < 1500) return r < 0.15 ? TYPE_MOVING  : TYPE_NORMAL;
  if (score < 3000) return r < 0.12 ? TYPE_BREAKING : r < 0.25 ? TYPE_MOVING : TYPE_NORMAL;
  // high score chaos
  if (r < 0.10) return TYPE_BREAKING;
  if (r < 0.22) return TYPE_MOVING;
  if (r < 0.28) return TYPE_SPRING;
  return TYPE_NORMAL;
}

// ─── Initialise / Reset ───────────────────────────────────────────────────────
function init() {
  score = 0;
  cameraY = 0;
  particles = [];
  keys = {};

  player = {
    x: W / 2 - PLAYER_W / 2,
    y: H - 160,
    vy: 0,
    vx: 0,
    facingRight: true,
    squish: 1,      // y-scale for squash & stretch
    eyeAnim: 0,
  };

  // Generate initial platforms
  platforms = [];
  // Guaranteed safe first platform directly below the player
  platforms.push(makePlatform(W / 2 - PLATFORM_W / 2, H - 120, TYPE_NORMAL));

  for (let i = 1; i < PLATFORM_COUNT; i++) {
    const py = H - 120 - i * (H / PLATFORM_COUNT);
    const px = rand(10, W - PLATFORM_W - 10);
    platforms.push(makePlatform(px, py, TYPE_NORMAL));
  }

  player.vy = JUMP_FORCE;
  scoreEl.textContent = '0';
}

// ─── Particle system ──────────────────────────────────────────────────────────
function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + rand(-0.3, 0.3);
    const speed = rand(2, 5);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color,
      r: rand(3, 7),
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= 0.03;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y - cameraY, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Drawing ──────────────────────────────────────────────────────────────────
function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(1, SKY_BOT);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle cloud blobs
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  const seed = Math.floor(cameraY / 180);
  for (let i = 0; i < 5; i++) {
    const cx = ((seed * 137 + i * 89) % (W - 80)) + 40;
    const cy = ((seed * 61 + i * 113) % H);
    const r  = 22 + (i * 7) % 18;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.8, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + r, cy, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function platformColor(p) {
  switch (p.type) {
    case TYPE_MOVING:   return P_MOVING;
    case TYPE_BREAKING: return p.cracked ? '#bf360c' : P_BREAKING;
    case TYPE_SPRING:   return P_SPRING;
    default:            return P_NORMAL;
  }
}

function drawPlatform(p) {
  const sy = p.y - cameraY;
  if (sy > H + 20 || sy < -30) return;

  ctx.save();
  ctx.globalAlpha = p.opacity;

  const color = platformColor(p);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(p.x + p.w / 2, sy + p.h + 5, p.w / 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(p.x, sy, p.w, p.h, 7);
  ctx.fill();

  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.roundRect(p.x + 4, sy + 3, p.w - 8, 4, 3);
  ctx.fill();

  // Crack lines for breaking
  if (p.type === TYPE_BREAKING && p.cracked) {
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x + p.w * 0.3, sy + 2);
    ctx.lineTo(p.x + p.w * 0.45, sy + p.h - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x + p.w * 0.55, sy + 2);
    ctx.lineTo(p.x + p.w * 0.7, sy + p.h - 2);
    ctx.stroke();
  }

  // Spring coil
  if (p.type === TYPE_SPRING) {
    const sh = p.springActive ? 18 : 10;
    ctx.strokeStyle = '#e040fb';
    ctx.lineWidth = 2.5;
    const cx = p.x + p.w / 2;
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.05) {
      const sx = cx + Math.sin(t * Math.PI * 4) * 7;
      const sy2 = sy - t * sh;
      t === 0 ? ctx.moveTo(sx, sy2) : ctx.lineTo(sx, sy2);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawPlayer() {
  const px = player.x;
  const py = player.y - cameraY;
  const w = PLAYER_W;
  const h = PLAYER_H * player.squish;
  const wStretch = PLAYER_W / player.squish;

  ctx.save();
  ctx.translate(px + w / 2, py + PLAYER_H / 2);
  if (!player.facingRight) ctx.scale(-1, 1);

  // Body – green blob
  ctx.fillStyle = '#66bb6a';
  ctx.beginPath();
  ctx.ellipse(0, 0, wStretch / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly
  ctx.fillStyle = '#a5d6a7';
  ctx.beginPath();
  ctx.ellipse(2, 4, wStretch * 0.28, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye white
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(8, -6, 8, 9, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  const blink = Math.sin(player.eyeAnim) > 0.95;
  if (blink) {
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(3, -6);
    ctx.lineTo(13, -6);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath();
    ctx.ellipse(10, -6, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(11, -8, 1.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nose
  ctx.fillStyle = '#ef9a9a';
  ctx.beginPath();
  ctx.ellipse(14, -2, 4, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = '#388e3c';
  ctx.beginPath();
  ctx.ellipse(-6, h / 2 - 2, 6, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(6, h / 2 - 2, 6, 5, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawScore() {
  scoreEl.textContent = score;
}

// ─── Platform generation ──────────────────────────────────────────────────────
function generatePlatforms() {
  // Find topmost platform
  let minY = Infinity;
  for (const p of platforms) minY = Math.min(minY, p.y);

  // While there is room above, add more platforms
  while (minY > cameraY - H) {
    const gap = rand(60, 95 + Math.min(score / 30, 60));
    const py  = minY - gap;
    const px  = rand(10, W - PLATFORM_W - 10);
    platforms.push(makePlatform(px, py, randomType(score)));
    minY = py;
  }

  // Remove platforms that scrolled far below
  platforms = platforms.filter(p => p.y - cameraY < H + 40);
}

// ─── Collision ────────────────────────────────────────────────────────────────
function checkCollisions() {
  if (player.vy <= 0) return; // only collide when falling

  for (const p of platforms) {
    const pTop  = p.y;
    const pBot  = p.y + p.h;
    const plTop = player.y;
    const plBot = player.y + PLAYER_H;
    const plLeft  = player.x + 6;
    const plRight = player.x + PLAYER_W - 6;

    if (
      plBot >= pTop &&
      plBot <= pBot + 12 &&
      plRight > p.x + 4 &&
      plLeft  < p.x + p.w - 4
    ) {
      if (p.type === TYPE_BREAKING) {
        if (!p.cracked) {
          p.cracked = true;
          spawnParticles(p.x + p.w / 2, p.y - cameraY, P_BREAKING, 10);
          // give one bounce before it vanishes
          bounce(JUMP_FORCE, p);
          // fade out
          const fadeInterval = setInterval(() => {
            p.opacity -= 0.08;
            if (p.opacity <= 0) {
              p.opacity = 0;
              clearInterval(fadeInterval);
            }
          }, 30);
          return;
        }
        // already cracked – fall through
        continue;
      }

      if (p.type === TYPE_SPRING) {
        p.springActive = true;
        setTimeout(() => { p.springActive = false; }, 300);
        bounce(JUMP_FORCE * 1.7, p);
        spawnParticles(p.x + p.w / 2, p.y - cameraY, P_SPRING, 12);
      } else {
        bounce(JUMP_FORCE, p);
      }
      return;
    }
  }
}

function bounce(force, platform) {
  player.vy = force;
  player.squish = 0.55;
  if (platform) {
    spawnParticles(platform.x + platform.w / 2, platform.y - cameraY, platformColor(platform), 6);
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────
function update() {
  // Input: keyboard
  let ax = 0;
  if (keys['ArrowLeft']  || keys['a'] || keys['A']) ax = -0.7;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) ax = 0.7;

  // Mobile: deviceorientation
  if (window._tiltX !== undefined) ax = window._tiltX * 0.15;

  player.vx = player.vx * 0.82 + ax * 2.2;
  player.x += player.vx;

  // Wrap horizontally
  if (player.x + PLAYER_W < 0) player.x = W;
  if (player.x > W) player.x = -PLAYER_W;

  if (player.vx >  0.3) player.facingRight = true;
  if (player.vx < -0.3) player.facingRight = false;

  // Gravity & vertical movement
  player.vy += GRAVITY;
  player.y  += player.vy;

  // Squash & stretch
  player.squish += (1 - player.squish) * 0.18;
  if (player.squish > 1.25) player.squish = 1.25;
  if (player.vy < -4) player.squish = 1 + Math.min((-player.vy - 4) * 0.04, 0.25);

  // Eye blink
  player.eyeAnim += 0.02;

  // Camera follow (only scroll up)
  const playerScreenY = player.y - cameraY;
  if (playerScreenY < SCROLL_THRESHOLD) {
    const delta = SCROLL_THRESHOLD - playerScreenY;
    cameraY -= delta;
    score = Math.max(score, Math.floor(-cameraY / 5));
  }

  // Update moving platforms
  for (const p of platforms) {
    if (p.type === TYPE_MOVING) {
      p.x += p.dx;
      if (p.x < 0 || p.x + p.w > W) p.dx *= -1;
    }
  }

  checkCollisions();
  generatePlatforms();
  updateParticles();

  // Game over: player fell off bottom
  if (player.y - cameraY > H + 40) {
    endGame();
  }
}

// ─── Game loop ────────────────────────────────────────────────────────────────
function loop() {
  if (!gameRunning) return;

  update();

  drawBackground();
  platforms.forEach(drawPlatform);
  drawParticles();
  drawPlayer();
  drawScore();

  animId = requestAnimationFrame(loop);
}

// ─── Start / End ──────────────────────────────────────────────────────────────
function startGame() {
  highScore = highScore || 0;
  init();
  overlay.classList.remove('visible');
  gameRunning = true;
  cancelAnimationFrame(animId);
  loop();
}

function endGame() {
  gameRunning = false;
  cancelAnimationFrame(animId);
  highScore = Math.max(highScore || 0, score);

  overlayScore.textContent = `Score: ${score}  |  Meilleur: ${highScore}`;
  startBtn.textContent = 'Rejouer';
  overlay.classList.add('visible');
}

// ─── Input ────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => { keys[e.key] = true; });
document.addEventListener('keyup',   e => { keys[e.key] = false; });

// Mobile tilt
window.addEventListener('deviceorientation', e => {
  // gamma: left/right tilt in degrees
  window._tiltX = Math.max(-15, Math.min(15, e.gamma || 0)) / 15;
});

startBtn.addEventListener('click', startGame);

// Draw a static frame on load
(function staticFrame() {
  drawBackground();
})();
