const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 680, H = 600;
canvas.width = W; canvas.height = H;

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function lerp(a, b, t) { return a + (b - a) * t; }
function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x1-x2)**2 + (y1-y2)**2;
  if (l2 === 0) return Math.hypot(px-x1, py-y1);
  let t = ((px-x1)*(x2-x1) + (py-y1)*(y2-y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t*(x2-x1)), py - (y1 + t*(y2-y1)));
}

// ==================== STATE ====================
let state = 'title';
let wavePhase = 1;
let itemSelectRound = 0;
let frameCount = 0;
let waveTimer = 0;
let bossType = 0;
let waveClearing = false;
let loopCount = 1;

// ==================== 呪字システム ====================
let curseSlots = [];          // 取得済み呪字リスト
let curseUsedFlags = {};      // 1回限り効果の使用済みフラグ
// フラグ: 命復活済み, 死モード, HP上昇無効, 基/礎バフタイマー, 号灰暗光のboss強制指定
let pendingForceBoss   = 0;
let pendingJuCurse     = false; // 呪: 強制3連呪字選択中
let curseHaiActive     = false; // 排: 右端「取得しない」→ランダム呪字
let curseMuCount       = 0;     // 無: 取得回数
let curseMuFixed       = false; // 無: 左端固定中
let curseKyoUsed       = false; // 虚: 使用済み（無を排除）
let pendingItemDiscard = 0;     // 放棄phase残回数
let pendingItemDiscardCallback = null;
let pendingHelperDouble = false; // 絆: ヘルパー2体化   // 次ボスを強制指定する番号(0=なし)
let pendingExtraCurse  = false; // 灰: 次の呪字選択で追加1回
let pendingKanCount = 0;        // 環: 捨て/入れ替え回数カウント（HP+1,DMG+1用）
let pendingExtraKameCurse = 0;  // 亀・邪: 追加呪字選択回数
let pendingExtraItemSelect = 0; // 暗: 追加アイテム選択3回
let curseDeathMode     = false; // 死: maxHP固定1
let curseReviveUsed    = false; // 命: 復活済み
let curseReviveHalved  = false; // 命: 復活後ダメージ半減中
let curseKisoBuffTimer = 0;   // 基: 発動後10秒バフタイマー
let curseReisoBuff     = false; // 礎: バリア/SF発動後バフ中
let curseReisoCoolTimer = 0;  // 礎: 礎バフタイマー
let recentBosses = [];

// ストックヒール
let stockHealCount  = 1;   // 現在所持数（初期1）
let stockHealMax    = 3;   // 最大所持数
let stockHealAmount = 10;  // 1回の回復量
// カルマゲージ
let karmaOrange = 0;
let karmaRed    = 0;
let karmaOrangeThresh = 8;
let karmaRedThresh    = 80;
let karmaParticles = [];
let pendingCurseApplyQueue = []; // 呪字キュー
// ダメージポップアップ
let damagePopups = [];
// 状態異常システム
// player状態異常
let playerPoison = null;    // { lv, timer, maxTimer, tickTimer }
let playerFragile = null;   // { lv, timer }
// 敵の状態異常は各敵オブジェクトに statusEffects フィールドで管理
let statusParticles = [];   // エフェクト用パーティクル
// ファイア燃料
let fireFuel = 0;
let fireFuelMax = 0;
let fireKeyHeld = false;

// ==================== EVENT SYSTEM ====================
let eventProbability = 0; // 初期確率は0%（1週目）
let currentEvent = null; // 現在のイベント: 'swarm', 'fog', 'doubleDamage', 'droplets', 'giant_blackhole', 'pillar'
let lastEvent = null; // 前回のイベント（連続防止用）
let eventEnemyType = null; // 大量発生の敵タイプ
let eventDamageMult = 1; // ダメージ倍率
let fogIntensity = 0; // 霧の強度（0-1）
let eventWarningTimer = 0; // 警告メッセージの表示タイマー
let eventWarningText = ''; // 警告メッセージ
let showDebugEventProbability = false; // Iキーでイベント確率表示切替
let dropletEnemies = []; // しずく敵の配列
let eventItemBonusUsed = false; // イベント時のアイテム選択ボーナスを使用したか
let forceNextEvent = false; // Oキーによる次フェーズ強制イベント発動フラグ
let pendingEventBonus = false; // イベントwave突破後、次アイテム選択でボーナス付与するフラグ

// 巨大ブラックホールイベント
let bhEvent = null; // { x, y, phase:'suck'/'blow', phaseTimer, totalTimer, particles }
// ピラーイベント
let pillarEvent = null; // { timer, laserTimer, lasers }
let pillarLasers = []; // creeping laser配列

const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyP') player.invincible = !player.invincible;
  if (e.code === 'KeyI') {
    showDebugEventProbability = !showDebugEventProbability;
    eventWarningText = showDebugEventProbability ? '🔍 イベント確率表示 ON' : '🔍 イベント確率表示 OFF';
    eventWarningTimer = 30;
    e.preventDefault();
    return;
  }
  if (e.code === 'KeyO' && (state === 'wave' || state === 'boss' || state === 'itemSelect')) {
    forceNextEvent = true;
    // 画面にコマンド受付を表示
    eventWarningText = '★ 次のフェーズでイベント発生確定！ ★';
    eventWarningTimer = 120;
  }
  if (e.code === 'KeyZ' && player.hasBarrier && !player.barrierActive && player.barrierRechargeCooldown <= 0 && player.alive && (state === 'wave' || state === 'boss')) {
    player.barrierActive = true;
    player.barrierTimer = 0;
    player.barrierHp = 20;
    if (curseSlots.includes('基')) curseKisoBuffTimer = 600;
    if (curseSlots.includes('礎')) { player.hp = Math.min(player.maxHp, player.hp + 10); curseReisoBuff = true; curseReisoCoolTimer = 600; }
    e.preventDefault();
    return;
  }
  if (e.code === 'KeyA' && player.hasSuperFlash && player.superFlashRechargeCooldown <= 0 && player.alive && (state === 'wave' || state === 'boss')) {
    activateSuperFlash();
    e.preventDefault();
    return;
  }
  // Vキー長押しでファイア
  if (e.code === 'KeyV') { fireKeyHeld = true; }
  if (e.code === 'KeyC' && player.alive && (state === 'wave' || state === 'boss') && stockHealCount > 0) {
    stockHealCount--;
    player.hp = Math.min(player.maxHp, player.hp + stockHealAmount);
    spawnDamagePopup(player.x, player.y - 30, stockHealAmount, false);
    e.preventDefault();
    return;
  }
  if (e.code === 'KeyN' && player.hasFragileShot && player.fragileshotCooldown <= 0 && player.alive && (state === 'wave' || state === 'boss')) {
    firePlayerFragileShot();
    e.preventDefault();
    return;
  }
  e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'KeyV') fireKeyHeld = false; });

// ==================== PLAYER ====================
const player = {
  x: W/2, y: H - 80,
  hp: 30, maxHp: 30,
  speed: 3.5, damage: 1, bulletSpeed: 12, shootInterval: 22,
  shootTimer: 0, damageTimer: 0, alive: true, invincible: false,
  has3Way: false, hasSide: false, hasBack: false, hasHoming: false, hasPierce: false,
  items: [],
  laserTimer: 0, bombTimer: 0, shotgunTimer: 0, sniperTimer: 0,
  itemPlasmaTimer: 0, boomerangTimer: 0, bubbleTimer: 0, stickAngle: 0,
  tornadoTimer: 0, meteorTimer: 0, helperSpawnCount: 0,
  hasDash: false, dashTimer: 0, dashCooldown: 0, dashTrail: [],
  dashCharges: 1, dashCharge2Cooldown: 0,
  hasBarrier: false, barrierActive: false, barrierTimer: 0, barrierHp: 20, barrierRechargeCooldown: 0,
  hasSuperFlash: false, superFlashTimer: 0, screenFlashTimer: 0, screenFlashColor: null, superFlashRechargeCooldown: 0,
  hasFragileShot: false, fragileshotCooldown: 0,
};

let sniper = { x: W/2, y: H - 50 };

function hitPlayer(frames = 30) {
  // hitPlayerDamage に統一（激_dmg2x・eventDamageMult 両方を正しく適用するため）
  hitPlayerDamage(1, frames);
}

// ダメージ量を指定して受ける関数（レーザーやハートの突進用）
function hitPlayerDamage(amount, frames = 30) {
  if (!player.alive || player.invincible || player.damageTimer > 0) return;

  // 指定されたダメージにイベント倍率をかける
  let finalDmg = amount * eventDamageMult;
  // 激: 受けるダメージ2倍
  if (curseUsedFlags['激_dmg2x']) finalDmg = Math.max(1, Math.ceil(finalDmg * 2));

  if (player.barrierActive) {
    player.barrierHp -= finalDmg;
    if (player.barrierHp <= 0) {
      player.barrierActive = false;
      player.barrierRechargeCooldown = 2400;
      // 礎: バリア消滅時HP+10 & バフ
      if (curseSlots.includes('礎')) { player.hp = Math.min(player.maxHp, player.hp + 10); curseReisoBuff = true; curseReisoCoolTimer = 600; }
    }
    player.damageTimer = 10;
  } else {
    player.hp -= finalDmg;
    // 自機ダメージポップアップ（赤）
    spawnDamagePopup(player.x, player.y - 20, finalDmg, true);
    // カルマ: 受けたダメージで蓄積
    if (player.items.includes('karma')) addKarma(finalDmg);
    player.damageTimer = curseSlots.includes('避') ? frames * 3 : frames;
    if (player.hp <= 0) {
      // 命: 一度だけ最大HPで復活
      if (curseSlots.includes('命') && !curseReviveUsed) {
        curseReviveUsed = true;
        player.hp = player.maxHp; player.alive = true;
        player.screenFlashTimer = 20; player.screenFlashColor = 'rgba(255,100,255,0.6)';
      } else {
        player.hp = 0; player.alive = false;
      }
    }
  }
}

// 通常の接触ダメージなどはこれを使う
function hitPlayer(frames = 30) {
  hitPlayerDamage(1, frames);
}

function resetPlayer() {
  player.x = W/2; player.y = H - 80;
  player.hp = 30; player.maxHp = 30;
  player.speed = 3.5; player.damage = 2; player.bulletSpeed = 12; player.shootInterval = 22;
  player.shootTimer = 0; player.damageTimer = 0; player.alive = true; player.invincible = false;
  player.has3Way = false; player.hasSide = false; player.hasBack = false; player.hasHoming = false; player.hasPierce = false;
  player.items = [];
  player.laserTimer = 0; player.bombTimer = 0; player.shotgunTimer = 0; player.sniperTimer = 0;
  player.itemPlasmaTimer = 0; player.stickAngle = 0;
  player.hasBarrier = false; player.barrierActive = false; player.barrierTimer = 0; player.barrierHp = 20; player.barrierRechargeCooldown = 0;
  player.hasSuperFlash = false; player.superFlashTimer = 0; player.screenFlashTimer = 0; player.screenFlashColor = null; player.superFlashRechargeCooldown = 0;
  player.hasFragileShot = false; player.fragileshotCooldown = 0;
  sniper = { x: W/2, y: H - 50 };
  playerChakrams = [];
  playerBubbles = [];
  playerTornadoes = [];
  playerMeteors = [];
  playerFragileShots = [];
  player.chakramTimer = 0;
  player.bubbleTimer = 0;
  player.tornadoTimer = 0;
  player.meteorTimer = 0;
  player.helperSpawnCount = 0;
  helperUnits = [];
  player.hasDash = false; player.dashTimer = 0; player.dashCooldown = 0;
  player.dashTrail = []; player.dashCharges = 1; player.dashCharge2Cooldown = 0;
  loopCount = 1;
  
  // イベント状態をリセット（1週目は0%、2週目以降は初期確率に戻す）
  eventProbability = getBaseEventProbability();
  currentEvent = null;
  lastEvent = null;
  eventEnemyType = null;
  eventDamageMult = 1;
  fogIntensity = 0;
  eventWarningTimer = 0;
  eventWarningText = '';
  dropletEnemies = [];
  eventItemBonusUsed = false;
  forceNextEvent = false;
  pendingEventBonus = false;
  recentBosses = [];
  curseSlots = []; curseUsedFlags = {};
  stockHealCount = 1; stockHealMax = 3; stockHealAmount = 10;
  karmaOrange = 0; karmaRed = 0; karmaOrangeThresh = 8; karmaRedThresh = 80;
  karmaParticles = []; damagePopups = [];
  pendingCurseApplyQueue = [];
  playerPoison = null; playerFragile = null; statusParticles = [];
  fireFuel = 0; fireFuelMax = 0; fireKeyHeld = false; if(typeof resetFireParticles==='function')resetFireParticles();
  pendingForceBoss = 0; pendingExtraCurse = false; pendingExtraItemSelect = 0; pendingJuCurse = false;
  pendingKanCount = 0; pendingExtraKameCurse = 0;
  curseHaiActive = false; curseMuCount = 0; curseMuFixed = false; curseKyoUsed = false;
  pendingItemDiscard = 0; pendingItemDiscardCallback = null; pendingHelperDouble = false;
  curseDeathMode = false; curseReviveUsed = false; curseReviveHalved = false;
  curseKisoBuffTimer = 0; curseReisoBuff = false; curseReisoCoolTimer = 0;
}

function drawDashTrail() {
  if (!player.dashTrail || player.dashTrail.length === 0) return;
  for (const t of player.dashTrail) {
    ctx.save();
    ctx.globalAlpha = t.alpha;
    ctx.fillStyle = '#88ccff';
    ctx.shadowColor = '#44aaff';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(t.x, t.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawPlayer() {
  const px = player.x, py = player.y;
  const isInvincible = player.invincible;
  
  const sniperLv = player.items.filter(id=>id==='sniper').length;
  if (sniperLv > 0 && player.alive) {
    ctx.save();
    ctx.fillStyle = '#cc00ff'; ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(sniper.x, sniper.y, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(sniper.x, sniper.y, 4, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Draw Player Stick
  const stickLv = player.items.filter(id=>id==='stick').length;
  if (stickLv > 0 && player.alive) {
    const len = stickLv === 1 ? 40 : (stickLv === 2 ? 80 : (stickLv === 3 ? 120 : 160));
    const x2 = px + Math.cos(player.stickAngle) * len;
    const y2 = py + Math.sin(player.stickAngle) * len;
    ctx.save(); ctx.strokeStyle = '#0ff'; ctx.lineWidth = 6; ctx.shadowColor = '#0ff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x2, y2);
    if (stickLv >= 4) {
      const x3 = px - Math.cos(player.stickAngle) * len;
      const y3 = py - Math.sin(player.stickAngle) * len;
      ctx.lineTo(x3, y3);
    }
    ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  if (player.barrierActive) {
    ctx.save();
    ctx.strokeStyle = '#7f7'; ctx.globalAlpha = 0.6; ctx.shadowColor = '#7f7'; ctx.shadowBlur = 12; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, 30, 0, Math.PI*2); ctx.stroke();
    // バリアのHPバー
    const barW = 50, barX = px - barW/2, barY = py - 45;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barW, 6);
    ctx.fillStyle = '#7f7'; ctx.fillRect(barX, barY, barW * (player.barrierHp / 20), 6);
    ctx.strokeStyle = '#7f7'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, 6);
    ctx.restore();
  }
  
  if (isInvincible && Math.floor(frameCount / 4) % 2 === 0) return;
  const outer = isInvincible ? '#ffd700' : (player.damageTimer > 0 ? '#f44' : '#0ff');
  ctx.save();
  ctx.fillStyle = outer; ctx.shadowColor = outer; ctx.shadowBlur = 12;
  ctx.fillRect(px - 18, py - 8, 36, 20);
  ctx.fillRect(px - 8, py - 22, 16, 16);
  ctx.fillStyle = '#ff0'; ctx.shadowColor = '#ff0'; ctx.shadowBlur = 8;
  ctx.fillRect(px - 13, py - 5, 26, 14);
  ctx.fillRect(px - 5, py - 18, 10, 12);
  ctx.restore();
}

function drawScreenFlash() {
  if (player.screenFlashTimer > 0) {
    const opacity = (player.screenFlashTimer / 30) * 0.6;
    ctx.fillStyle = `rgba(255, 255, 0, ${opacity})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function updatePlayer() {
  if (!player.alive) return;
  const canMoveA = !(player.hasSuperFlash && (state === 'wave' || state === 'boss'));
  if (keys['ArrowLeft'] || (canMoveA && keys['KeyA'])) player.x -= player.speed;
  if (keys['ArrowRight'] || keys['KeyD']) player.x += player.speed;
  if (keys['ArrowUp'] || keys['KeyW']) player.y -= player.speed;
  if (keys['ArrowDown'] || keys['KeyS']) player.y += player.speed;
  player.x = Math.max(18, Math.min(W - 18, player.x));
  player.y = Math.max(22, Math.min(H - 8, player.y));
  if (player.damageTimer > 0) player.damageTimer--;
  
  if (player.barrierActive) {
    player.barrierTimer++;
    if (player.barrierTimer >= 600) {
      // 10秒経過で自動消滅
      player.barrierActive = false;
      player.barrierTimer = 0;
      player.barrierRechargeCooldown = 2400; // 40秒リチャージ
    }
  }
  
  if (player.barrierRechargeCooldown > 0) {
    player.barrierRechargeCooldown--;
  }
  
  if (player.superFlashRechargeCooldown > 0) {
    player.superFlashRechargeCooldown--;
  }

  if (player.fragileshotCooldown > 0) {
    player.fragileshotCooldown--;
  }
  
  if (player.screenFlashTimer > 0) player.screenFlashTimer--;

  // 呪字タイマー更新
  if (curseKisoBuffTimer > 0) curseKisoBuffTimer--;
  if (curseReisoCoolTimer > 0) { curseReisoCoolTimer--; if (curseReisoCoolTimer <= 0) curseReisoBuff = false; }
  // 死: maxHP=1固定
  if (curseDeathMode) { player.maxHp = 1; player.hp = Math.min(1, player.hp); }
  
  // 速: 移動速度1.4倍フラグは speed 算出時に適用
  const baseSpeed = 3.5 * (curseSlots.includes('速') ? 1.4 : 1.0);
  player.speed = baseSpeed;

  // ダッシュ処理
  if (player.dashTimer > 0) {
    player.dashTimer--;
    // 残像記録
    player.dashTrail.unshift({ x: player.x, y: player.y, alpha: 0.5 });
    if (player.dashTrail.length > 8) player.dashTrail.pop();
    // 無敵中
    player.damageTimer = Math.max(player.damageTimer, 2);
  } else {
    // 残像フェード
    for (const t of player.dashTrail) t.alpha -= 0.08;
    player.dashTrail = player.dashTrail.filter(t => t.alpha > 0);
  }
  if (player.dashCooldown > 0) player.dashCooldown--;
  if (player.dashCharge2Cooldown > 0) player.dashCharge2Cooldown--;

  // Bキーでダッシュ発動
  if (keys['KeyB']) {
    // 2チャージ目（走呪字）
    const hasCharge2 = curseSlots.includes('走') && player.dashCharges >= 2;
    const canDash1 = player.hasDash && player.dashTimer <= 0 && player.dashCooldown <= 0;
    const canDash2 = hasCharge2 && player.dashTimer <= 0 && player.dashCharge2Cooldown <= 0;
    if (canDash1 || canDash2) {
      // 移動方向を計算
      let dx = 0, dy = 0;
      const canMoveA2 = !(player.hasSuperFlash && (state === 'wave' || state === 'boss'));
      if (keys['ArrowLeft']) dx -= 1;
      if (keys['ArrowRight']) dx += 1;
      if (keys['ArrowUp']) dy -= 1;
      if (keys['ArrowDown']) dy += 1;
      if (dx === 0 && dy === 0) dy = -1; // 方向キーなし → 上
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const dashSpeed = player.speed * 3;
      player.dashVx = dx * dashSpeed;
      player.dashVy = dy * dashSpeed;
      player.dashTimer = 8; // 0.5秒
      if (canDash1 && player.dashCooldown <= 0) {
        player.dashCooldown = 120; // 2秒
      } else if (canDash2) {
        player.dashCharge2Cooldown = 120;
      }
      keys['KeyB'] = false; // 連続発動防止
    }
  }
  if (player.dashTimer > 0 && player.dashVx !== undefined) {
    player.x += player.dashVx; player.y += player.dashVy;
    player.x = Math.max(18, Math.min(W - 18, player.x));
    player.y = Math.max(22, Math.min(H - 8, player.y));
  }

  const reisoBspeedMult = (curseReisoBuff) ? 1.1 : 1.0;
  const reisoBuletMult  = (curseReisoBuff) ? 1.1 : 1.0;
  // 怒: HP10以下でテンポ+20%
  const ikariTempoMult = (curseSlots.includes('怒') && player.hp <= 10) ? 1.2 : 1.0;
  player.shootTimer += reisoBspeedMult * ikariTempoMult;
  if (keys['Space'] && player.shootTimer >= player.shootInterval) {
    shootPlayer();
    player.shootTimer = 0;
  }
  updatePlayerOptions();
}

// ==================== NEW PLAYER OPTIONS (ITEMS) ====================
let playerLasers = [];
let playerBombs = [];
let enemyLasers = [];
let plasmas = [];
let playerTornadoes = [];   // トルネード
let playerMeteors = [];     // メテオ
let playerFragileShots = []; // 脆弱弾
let helperUnits = [];        // ヘルパー

function updatePlayerOptions() {
  const laserLv = player.items.filter(id=>id==='laser').length;
  const bombLv = player.items.filter(id=>id==='bomb').length;
  const shotgunLv = player.items.filter(id=>id==='shotgun').length;
  const sniperLv = player.items.filter(id=>id==='sniper').length;
  const plasmaLv = player.items.filter(id=>id==='plasma').length;
  const stickLv = player.items.filter(id=>id==='stick').length;
  const chakramLv = player.items.filter(id=>id==='chakram').length;
  const bubbleLv = player.items.filter(id=>id==='bubble').length;

  if (laserLv > 0) {
    player.laserTimer++;
    if (player.laserTimer >= 150) { player.laserTimer = 0; firePlayerLaser(laserLv); }
  }

  if (bombLv > 0) {
    player.bombTimer++;
    if (player.bombTimer >= 160) { player.bombTimer = 0; firePlayerBomb(bombLv); }
  }

  if (shotgunLv > 0) {
    player.shotgunTimer++;
    if (player.shotgunTimer >= 140) { player.shotgunTimer = 0; firePlayerShotgun(shotgunLv); }
  }

  if (sniperLv > 0) updateMiniSniper(sniperLv);

  if (plasmaLv > 0) {
    player.itemPlasmaTimer++;
    if (player.itemPlasmaTimer >= 130) {
      player.itemPlasmaTimer = 0;
      let target = findNearestEnemy();
      if (!target && boss && boss.alive) target = boss;
      if (target) {
        const r = plasmaLv === 1 ? 70 : (plasmaLv === 2 ? 100 : (plasmaLv === 3 ? 140 : 180));
        const dmg = player.damage + (plasmaLv >= 4 ? 40 : 20);
        plasmas.push({x: target.x, y: target.y, maxR: r, timer: 0, isPlayer: true, lightningTimer: 0, dmg});
      }
    }
  }


  if (chakramLv > 0) {
    player.chakramTimer++;
    const interval = chakramLv === 4 ? 70 : 100;
    if (player.chakramTimer >= interval) {
      player.chakramTimer = 0;
      firePlayerChakram(chakramLv);
    }
  }
  if (bubbleLv > 0) {
    player.bubbleTimer++;
    if (player.bubbleTimer >= 250) {
      player.bubbleTimer = 0;
      firePlayerBubble(bubbleLv);
    }
  }

  // トルネード
  const tornadoLv = player.items.filter(id=>id==='tornado').length;
  if (tornadoLv > 0) {
    player.tornadoTimer++;
    const interval = 140; // lv問わず固定テンポ
    if (player.tornadoTimer >= interval) {
      player.tornadoTimer = 0;
      firePlayerTornado(tornadoLv);
      if (tornadoLv >= 4) setTimeout(() => firePlayerTornado(tornadoLv), 200);
      if (tornadoLv >= 4 && curseSlots.includes('渦')) setTimeout(() => firePlayerTornado(tornadoLv), 400);
    }
  }

  // ヘルパーユニット数チェック (アイテム取得数に合わせてスポーン調整)
  const helperLv = player.items.filter(id=>id==='helper').length;
  const helperMax = pendingHelperDouble ? 2 : 1;
  if (helperLv > 0 && helperUnits.length < helperMax) {
    spawnHelperUnit(helperLv);
  } else if (helperUnits.length > 0) {
    // 既存ユニットのlvを毎フレーム同期（lv変動を即反映）
    helperUnits[0].lv = helperLv;
    helperUnits[0].attackInterval = helperLv >= 4 ? 55 : 90;
  }
  // helperアイテムがなければユニットを消す
  if (helperLv === 0) helperUnits = [];

  // メテオ
  const meteorLv = player.items.filter(id=>id==='meteor').length;
  if (meteorLv > 0) {
    player.meteorTimer++;
    const interval = 300;
    if (player.meteorTimer >= interval) {
      player.meteorTimer = 0;
      firePlayerMeteor(meteorLv);
    }
  }

  // ポイズントラップ
  const poisonTrapLv = player.items.filter(id=>id==='poisontrap').length;
  if (poisonTrapLv > 0) {
    // 常時自機位置に毒円を展開（発射弾なし）
    if (!player._poisonAura || !player._poisonAura.alive) {
      const trapR = poisonTrapLv===1?80 : poisonTrapLv===2?110 : poisonTrapLv===3?140 : 170;
      const aura = {
        x: player.x, y: player.y,
        vx: 0, vy: 0,
        dmg: 0, alive: true, pierce: true, pierced: false, infinitePierce: true,
        color:'#44ff44', glow:'#00aa00', size: 10,
        isPoisonTrap: true, isPoisonAura: true, poisonLv: poisonTrapLv,
        stopped: true, travelTimer: 60,
        trapR, trapTimer: 0, trapMaxTimer: Infinity,
        isPlayer: false,
        hitSet: new Set(), // infinitePierce 当たり判定ループで hitSet.has() が呼ばれるため必須
      };
      playerBullets.push(aura);
      player._poisonAura = aura;
    }
  }

  // ファイア
  const fireLv = player.items.filter(id=>id==='fire').length;
  if (!player.fireInterval) player.fireInterval = 0;
  if (player.fireInterval > 0) player.fireInterval--;
  if (fireLv > 0 && fireKeyHeld && fireFuel > 0 && player.alive && (state==='wave'||state==='boss') && player.fireInterval <= 0) {
    fireFuel--;
    firePlayerFire(fireLv);
    player.fireInterval = 4; // 4フレームに1回発射
  }
  // 炎呪字によるダメージ強化フラグ
  const fireIsEnhanced = curseSlots.includes('炎');

  if (stickLv > 0) {
    player.stickAngle += 0.03;
    const len = stickLv === 1 ? 40 : (stickLv === 2 ? 80 : (stickLv === 3 ? 120 : H/2));
    const x1 = player.x, y1 = player.y;
    const x2 = player.x + Math.cos(player.stickAngle) * len;
    const y2 = player.y + Math.sin(player.stickAngle) * len;
    const x3 = player.x - Math.cos(player.stickAngle) * len;
    const y3 = player.y - Math.sin(player.stickAngle) * len;

    // 敵の弾を防ぐ
    for (const b of enemyBullets) {
      if (distToSegment(b.x, b.y, x1, y1, x2, y2) < 10) b.alive = false;
      if (stickLv >= 4 && distToSegment(b.x, b.y, x1, y1, x3, y3) < 10) b.alive = false;
    }

    // 敵にダメージ（0.5秒クールダウン）
    const allE = [...enemies];
    if(boss && boss.alive) allE.push(boss);
    if(bossManager && bossManager.alive) {
      if(bossManager.boss && bossManager.boss.alive) allE.push(bossManager.boss);
      for(const e of (bossManager.enemies||[])) if(e.alive) allE.push(e);
      for(const m of (bossManager.minions||[])) if(m.alive) allE.push(m);
    }
    for (const e of allE) {
      if (!e.pStickTimer || e.pStickTimer <= 0) {
        let hit = distToSegment(e.x, e.y, x1, y1, x2, y2) < (e.size||30) + 5;
        if (!hit && stickLv >= 4) hit = distToSegment(e.x, e.y, x1, y1, x3, y3) < (e.size||30) + 5;
        if (hit) {
          if (e.hit) { e.hit(player.damage); spawnDamagePopup(e.x, e.y-10, player.damage, false); }
          else damageEnemy(e, player.damage);
          // 染: 毒付与
          if (curseSlots.includes('染')) { const snLv=player.items.filter(x=>x==='sniper').length; applyPoison(e, snLv||1, 180); }
          e.pStickTimer = 30; // 0.5s cooldown
        }
      }
      if (e.pStickTimer > 0) e.pStickTimer--;
    }
  }
}

function firePlayerLaser(lv) {
  const px = player.x, py = player.y;
  const dmg = (lv >= 4 ? 20 : 15) + player.damage;
  const add = (angle) => playerLasers.push({ x: px, y: py, angle, warning: 30, active: 15, dmg, hitSet: new Set() });
  if (lv === 1) add(-Math.PI/2);
  else if (lv === 2) { add(-Math.PI/2); add(0); }
  else if (lv === 3) { for (let i=0; i<4; i++) add(i * Math.PI/4); }
  else if (lv >= 4) { for (let i=0; i<8; i++) add(i * Math.PI/8); }
}

function firePlayerBomb(lv) {
  const target = findNearestEnemy();
  let vx = 0, vy = -4;
  if (target) {
    const a = Math.atan2(target.y - player.y, target.x - player.x);
    vx = Math.cos(a) * 4; vy = Math.sin(a) * 4;
  }
  const ways = lv === 1 ? 8 : (lv === 2 ? 16 : (lv === 3 ? 32 : 64));
  const dmg = (lv >= 4 ? 12 : 6) + player.damage;
  playerBombs.push({ x: player.x, y: player.y, vx, vy, timer: 60, ways, dmg });
}

function firePlayerShotgun(lv) {
  const target = findNearestEnemy();
  let baseAngle = -Math.PI/2;
  if (target) baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
  const num = lv === 1 ? 10 : (lv === 2 ? 20 : (lv === 3 ? 40 : 60));
  const dmg = 1 + (player.damage / 2);
  const spread = Math.PI / 3;
  for(let i=0; i<num; i++) {
    const a = baseAngle + (Math.random() - 0.5) * spread;
    const spd = 6 + Math.random() * 8;
    playerBullets.push({ x: player.x, y: player.y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd, dmg, homing: false, pierce: false, pierced: false, alive: true });
  }
}

function updateMiniSniper(lv) {
  const dx = player.x - sniper.x, dy = player.y - sniper.y, dist = Math.hypot(dx, dy);
  if (dist > 50) { sniper.x += dx * 0.08; sniper.y += dy * 0.08; }
  else if (dist < 35 && dist > 0) { sniper.x -= (dx/dist) * 2; sniper.y -= (dy/dist) * 2; }

  player.sniperTimer++;
  if (player.sniperTimer >= 130) {
    player.sniperTimer = 0;
    let allTargets = [];
    for(const e of enemies) if(e.alive) allTargets.push(e);
    // 全てのボスに攻撃
    if(boss && boss.alive) allTargets.push(boss);
    if (boss && boss.minions) for (const m of boss.minions) if (m.alive) allTargets.push(m);
    if (boss && boss.decoys) for (const d of boss.decoys) if (d.alive) allTargets.push(d);
    if (boss && boss.mirrors) {
      const mirrorDist = boss.mirrorDist || 120;
      for (const m of boss.mirrors) if (m.alive) {
        m.x = boss.x + Math.cos(m.angle) * mirrorDist;
        m.y = boss.y + Math.sin(m.angle) * mirrorDist;
        allTargets.push(m);
      }
    }
    if(bossManager) {
      if(bossManager.boss && bossManager.boss.alive) allTargets.push(bossManager.boss);
      for(const e of (bossManager.enemies||[])) if(e.alive) allTargets.push(e);
      for(const m of (bossManager.minions||[])) if(m.alive) allTargets.push(m);
    }
    const targets = [];
    for (const t of allTargets) targets.push({target: t, dist: Math.hypot(t.x - sniper.x, t.y - sniper.y)});
    targets.sort((a, b) => b.dist - a.dist); // Sort by distance descending (farthest first)
    const maxTargets = lv >= 4 ? 4 : lv;
    const dmg = lv >= 4 ? Math.floor(player.damage * 3) : Math.floor(player.damage * 2);
    for (let i = 0; i < Math.min(maxTargets, targets.length); i++) {
      const t = targets[i].target;
      if (t !== boss && (!bossManager || t !== bossManager.boss)) {
        t.marked = true;
      }
      const a = Math.atan2(t.y - sniper.y, t.x - sniper.x);
      playerBullets.push({ x: sniper.x, y: sniper.y, vx: Math.cos(a)*25, vy: Math.sin(a)*25, dmg, homing: false, pierce: true, infinitePierce: true, hitSet: new Set(), alive: true, isFromSniper: true }); 
    }
  }
}

function damageEnemy(e, dmg) {
  // 命呪字による実ダメージ半減（最低1）
  const realDmg = dmg; // 命復活後ダメージ半減は廃止
  // 基/礎バフ中: 弾ダメージ2倍
  const kisoBuff = (curseKisoBuffTimer > 0 || curseReisoBuff) ? 2 : 1;
  // 怒: HP10以下でダメージ2倍
  const ikariBuff = (curseSlots.includes('怒') && player.hp <= 10) ? 2 : 1;
  const finalDmg = realDmg * kisoBuff * ikariBuff;
  e.hp -= finalDmg;
  // 脆弱追加ダメージ
  const fragExtraDmg = applyFragileDamage(e, finalDmg);
  if (fragExtraDmg > 0) e.hp -= fragExtraDmg;
  // ダメージポップアップ
  const totalDisplayDmg = finalDmg + fragExtraDmg;
  spawnDamagePopup(e.x + (Math.random()-0.5)*20, e.y - 10, totalDisplayDmg, false);
  if (fragExtraDmg > 0) {
    spawnDamagePopup(e.x + (Math.random()-0.5)*20, e.y - 18, fragExtraDmg, false, true);
  }
  // (カルマは受けたダメージで蓄積 → hitPlayerDamage/hitPlayerで処理)
  if (e.hp <= 0) {
    if (e.type === 'plus' && !e.endured) {
      e.hp = 1; e.endured = true; e.x = 50 + Math.random()*(W-100); e.y = 50 + Math.random()*(H/2);
      for(let i=0; i<16; i++) fireEnemy(e.x, e.y, i*Math.PI/8, 3.5);
    } else {
      e.alive = false;
      onEnemyKilled(e);
    }
  }
}

// ==================== STATUS EFFECTS ====================

// --- 状態異常付与 ---
function applyPoison(target, lv, duration) {
  // target: player or enemy object
  if (target === player) {
    if (!playerPoison || playerPoison.lv < lv) {
      playerPoison = { lv, timer: duration, maxTimer: duration, tickTimer: 0 };
    } else {
      playerPoison.timer = Math.max(playerPoison.timer, duration);
    }
  } else {
    if (!target.statusEffects) target.statusEffects = {};
    const existing = target.statusEffects.poison;
    if (!existing || existing.lv < lv) {
      target.statusEffects.poison = { lv, timer: duration, maxTimer: duration, tickTimer: 0 };
    } else {
      existing.timer = Math.max(existing.timer, duration);
    }
  }
}

function applyFragile(target, lv, duration) {
  if (target === player) {
    if (!playerFragile || playerFragile.lv < lv) playerFragile = { lv, timer: duration };
    else playerFragile.timer = Math.max(playerFragile.timer, duration);
  } else {
    if (!target.statusEffects) target.statusEffects = {};
    const ex = target.statusEffects.fragile;
    if (!ex || ex.lv < lv) target.statusEffects.fragile = { lv, timer: duration };
    else ex.timer = Math.max(ex.timer, duration);
  }
}

// --- 状態異常更新 ---
function updateStatusEffects() {
  // プレイヤーの毒
  if (playerPoison) {
    playerPoison.timer--;
    playerPoison.tickTimer++;
    if (playerPoison.tickTimer >= 30) { // 0.5秒
      playerPoison.tickTimer = 0;
      hitPlayerDamage(playerPoison.lv, 5);
    }
    // エフェクト
    if (Math.random() < 0.3) {
      statusParticles.push({ x: player.x + (Math.random()-0.5)*20, y: player.y + (Math.random()-0.5)*20, vy: -0.8, life: 25, color: '#44ff44', type: 'poison' });
    }
    if (playerPoison.timer <= 0) playerPoison = null;
  }
  // プレイヤーの脆弱タイマー
  if (playerFragile) {
    playerFragile.timer--;
    if (playerFragile.timer <= 0) playerFragile = null;
    // エフェクト
    if (Math.random() < 0.2) {
      statusParticles.push({ x: player.x + (Math.random()-0.5)*24, y: player.y + (Math.random()-0.5)*24, vy: -0.6, life: 20, color: '#4466cc', type: 'fragile' });
    }
  }
  // 敵の状態異常
  for (const e of enemies) {
    if (!e.alive || !e.statusEffects) continue;
    const pe = e.statusEffects.poison;
    if (pe) {
      pe.timer--; pe.tickTimer = (pe.tickTimer||0) + 1;
      if (pe.tickTimer >= 30) { pe.tickTimer = 0; damageEnemy(e, pe.lv); }
      if (Math.random() < 0.25) statusParticles.push({ x: e.x+(Math.random()-0.5)*20, y: e.y+(Math.random()-0.5)*20, vy: -0.7, life: 22, color: '#44ff44', type: 'poison' });
      if (pe.timer <= 0) delete e.statusEffects.poison;
    }
    const fe = e.statusEffects.fragile;
    if (fe) {
      fe.timer--;
      if (Math.random() < 0.15) statusParticles.push({ x: e.x+(Math.random()-0.5)*22, y: e.y+(Math.random()-0.5)*22, vy: -0.5, life: 18, color: '#4466cc', type: 'fragile' });
      if (fe.timer <= 0) delete e.statusEffects.fragile;
    }
  }
  // ミニオンの状態異常（boss.minions / bossManager.minions）
  const allMinions = [
    ...((boss && boss.minions) ? boss.minions : []),
    ...((bossManager && bossManager.minions) ? bossManager.minions : []),
  ];
  for (const m of allMinions) {
    if (!m.alive || !m.statusEffects) continue;
    const pm = m.statusEffects.poison;
    if (pm) {
      pm.timer--; pm.tickTimer = (pm.tickTimer||0) + 1;
      if (pm.tickTimer >= 30) {
        pm.tickTimer = 0;
        if (m.hit) { m.hit(pm.lv); spawnDamagePopup(m.x + (Math.random()-0.5)*20, m.y - 10, pm.lv, false); }
        else { m.hp -= pm.lv; spawnDamagePopup(m.x + (Math.random()-0.5)*20, m.y - 10, pm.lv, false); if (m.hp <= 0) m.alive = false; }
      }
      if (Math.random() < 0.25) statusParticles.push({ x: m.x+(Math.random()-0.5)*20, y: m.y+(Math.random()-0.5)*20, vy: -0.7, life: 22, color: '#44ff44', type: 'poison' });
      if (pm.timer <= 0) delete m.statusEffects.poison;
    }
    const fm = m.statusEffects.fragile;
    if (fm) {
      fm.timer--;
      if (Math.random() < 0.15) statusParticles.push({ x: m.x+(Math.random()-0.5)*22, y: m.y+(Math.random()-0.5)*22, vy: -0.5, life: 18, color: '#4466cc', type: 'fragile' });
      if (fm.timer <= 0) delete m.statusEffects.fragile;
    }
  }
  // ボスの状態異常
  const bossTarget = boss || (bossManager && bossManager.boss);
  if (bossTarget && bossTarget.statusEffects) {
    const pb = bossTarget.statusEffects.poison;
    if (pb) {
      pb.timer--; pb.tickTimer = (pb.tickTimer||0) + 1;
      if (pb.tickTimer >= 30) {
        pb.tickTimer = 0;
        if (bossTarget.hit) bossTarget.hit(pb.lv);
        spawnDamagePopup(bossTarget.x + (Math.random()-0.5)*30, bossTarget.y - 20, pb.lv, false);
      }
      // ボスへの毒エフェクト
      if (Math.random() < 0.35) statusParticles.push({ x: bossTarget.x+(Math.random()-0.5)*40, y: bossTarget.y+(Math.random()-0.5)*40, vy: -0.9, life: 28, color: '#44ff44', type: 'poison' });
      if (pb.timer <= 0) delete bossTarget.statusEffects.poison;
    }
    const fb = bossTarget.statusEffects.fragile;
    if (fb) {
      fb.timer--;
      // ボスへの脆弱エフェクト
      if (Math.random() < 0.2) statusParticles.push({ x: bossTarget.x+(Math.random()-0.5)*44, y: bossTarget.y+(Math.random()-0.5)*44, vy: -0.6, life: 22, color: '#4466cc', type: 'fragile' });
      if(fb.timer<=0) delete bossTarget.statusEffects.fragile;
    }
  }
  // パーティクル更新
  for (const p of statusParticles) { p.y += p.vy; p.life--; }
  statusParticles = statusParticles.filter(p => p.life > 0).slice(0, 200);
}

function drawStatusParticles() {
  for (const p of statusParticles) {
    ctx.save();
    ctx.globalAlpha = (p.life / 25) * 0.8;
    ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.type === 'fragile' ? 3 : 2.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// 脆弱: ダメージを受けた時の追加ダメージ
function applyFragileDamage(target, dmg) {
  const fx = target === player ? playerFragile : (target.statusEffects && target.statusEffects.fragile);
  if (!fx) return 0;
  const extra = [2,4,6,8][fx.lv-1] || 0;
  return extra;
}

// ==================== KARMA ====================
function addKarma(dmg) {
  const lv = player.items.filter(id=>id==='karma').length;
  if (lv === 0) return;
  const addAmt = Math.max(1, dmg);
  karmaOrange += addAmt;
  karmaRed    += addAmt;

  // 橙発動チェック
  if (karmaOrange >= karmaOrangeThresh) {
    karmaOrange = 0;
    triggerKarmaOrange();
  }
  // 赤発動チェック
  if (karmaRed >= karmaRedThresh) {
    karmaRed = 0;
    triggerKarmaRed();
  }
}

function getKarmaThresholds(lv) {
  const ot = [7,6,5,4][lv-1] ?? 4;
  const rt = [70,60,50,40][lv-1] ??40;
  return { ot, rt };
}

function triggerKarmaOrange() {
  const dmg = player.damage * 3 + 20;
  const R = 300;
  // イバラエフェクト（橙）: Rに届く速度・寿命で放射（speed*life ≈ R）
  const pSpeed = 10; // 10*30=300pxで範囲端まで届く
  const pLife  = 30;
  for (let i = 0; i < 24; i++) {
    const a = (Math.PI*2/24)*i;
    karmaParticles.push({ x: player.x, y: player.y, vx: Math.cos(a)*pSpeed, vy: Math.sin(a)*pSpeed, life: pLife, maxLife: pLife, color: '#ff8800', type: 'thorn' });
  }
  // 範囲ダメージ（bossManager配下も含む）
  const allE = [...enemies];
  if (boss && boss.alive) allE.push(boss);
  if (bossManager && bossManager.alive) {
    if (bossManager.boss && bossManager.boss.alive) allE.push(bossManager.boss);
    for (const e of (bossManager.enemies||[])) if (e.alive) allE.push(e);
    for (const m of (bossManager.minions||[])) if (m.alive) allE.push(m);
  }
  for (const e of allE) {
    if (!e.alive) continue;
    if (Math.hypot(e.x - player.x, e.y - player.y) < R) {
      if (e.hit) e.hit(dmg); else { e.hp -= dmg; if(e.hp<=0){e.alive=false;onEnemyKilled(e);} }
      spawnDamagePopup(e.x, e.y - 10, dmg, false);
    }
  }
}

function triggerKarmaRed() {
  const dmg = player.damage * 10 + 60;
  // 画面全体イバラエフェクト（赤）
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    karmaParticles.push({ x, y, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, life: 50, maxLife: 50, color: '#cc0000', type: 'thorn_big' });
  }
  player.screenFlashTimer = 18; player.screenFlashColor = 'rgba(180,0,0,0.35)';
  // 全敵にダメージ（bossManager配下も含む）
  const allE = [...enemies];
  if (boss && boss.alive) allE.push(boss);
  if (bossManager && bossManager.alive) {
    if (bossManager.boss && bossManager.boss.alive) allE.push(bossManager.boss);
    for (const e of (bossManager.enemies||[])) if (e.alive) allE.push(e);
    for (const m of (bossManager.minions||[])) if (m.alive) allE.push(m);
  }
  for (const e of allE) {
    if (!e.alive) continue;
    if (e.hit) e.hit(dmg); else { e.hp -= dmg; if(e.hp<=0){e.alive=false;onEnemyKilled(e);} }
    spawnDamagePopup(e.x, e.y - 10, dmg, false);
  }
}

function updateKarmaParticles() {
  for (const p of karmaParticles) {
    p.x += p.vx; p.y += p.vy; p.life--;
    // トゲ状に分岐
    if (p.life % 8 === 0 && p.life > 8 && Math.random() < 0.25) {
      const branchSpeed = Math.hypot(p.vx, p.vy);
      const branchAngle = Math.atan2(p.vy, p.vx) + (Math.random()-0.5) * 0.8;
      karmaParticles.push({ x: p.x, y: p.y, vx: Math.cos(branchAngle)*branchSpeed*0.6, vy: Math.sin(branchAngle)*branchSpeed*0.6, life: Math.floor(p.life * 0.45), maxLife: p.maxLife, color: p.color, type: p.type });
    }
  }
  karmaParticles = karmaParticles.filter(p => p.life > 0).slice(0, 300); // 上限
}

function drawKarmaParticles() {
  for (const p of karmaParticles) {
    const alpha = p.life / p.maxLife;
    const sz = p.type === 'thorn_big' ? 4 : 2.5;
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    // トゲ形状（細長い菱形）
    ctx.beginPath();
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.vy, p.vx));
    ctx.moveTo(sz*3, 0); ctx.lineTo(0, sz); ctx.lineTo(-sz, 0); ctx.lineTo(0, -sz);
    ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.restore();
  }
}

// ==================== DAMAGE POPUP ====================
function spawnDamagePopup(x, y, dmg, isPlayer, isFragileExtra = false) {
  damagePopups.push({ x, y: y, vy: -1.2, life: 50, maxLife: 50, dmg: Math.ceil(dmg), isPlayer, isFragileExtra });
}

function updateDamagePopups() {
  for (const p of damagePopups) { p.y += p.vy; p.vy *= 0.97; p.life--; }
  damagePopups = damagePopups.filter(p => p.life > 0);
}

function drawDamagePopups() {
  ctx.save();
  for (const p of damagePopups) {
    const alpha = Math.min(1, p.life / 30);
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${p.isPlayer ? 18 : 16}px Courier New`;
    if (p.isFragileExtra) {
      ctx.fillStyle = '#88ccff';
      ctx.shadowColor = '#44bbff';
    } else {
      ctx.fillStyle = p.isPlayer ? '#ff4444' : '#ffffff';
      ctx.shadowColor = p.isPlayer ? '#ff0000' : '#ffcc00';
    }
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    const text = p.isFragileExtra ? `+${p.dmg}` : `${p.isPlayer ? '-' : ''}${p.dmg}`;
    ctx.fillText(text, p.x, p.y);
  }
  ctx.textAlign = 'left';
  ctx.restore();
}

function applyDamageWithFragile(target, dmg, x, y) {
  const extra = (target.statusEffects && target.statusEffects.fragile) ? applyFragileDamage(target, dmg) : 0;
  const total = dmg + extra;
  if (target.hit) {
    target.hit(total);
  } else {
    target.hp -= total;
    if (target.hp <= 0) target.alive = false;
  }
  spawnDamagePopup(x + (Math.random()-0.5)*20, y - 10, total, false);
  if (extra > 0) {
    spawnDamagePopup(x + (Math.random()-0.5)*20, y - 18, extra, false, true);
  }
}

function onEnemyKilled(e) {
  // 吸: 10%の確率でHP1回復
  if (curseSlots.includes('吸') && Math.random() < 0.1) {
    player.hp = Math.min(player.maxHp, player.hp + 1);
  }
  // 電: 5%の確率でプラズマ発生（ダメージ = 自機ダメージ×2）
  if (curseSlots.includes('電') && Math.random() < 0.15) {
    const pdmg = player.damage * 2;
    plasmas.push({ x: e.x, y: e.y, maxR: 100, timer: 0, isPlayer: true, lightningTimer: 0, dmg: pdmg });
  }
}

function drawMarkOnEnemy(e) {
  ctx.save();
  ctx.strokeStyle = '#cc00ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#cc00ff';
  ctx.shadowBlur = 6;
  const size = (e.size || 20) + 8;
  const centerX = e.x, centerY = e.y;
  
  // Draw crosshair pattern (銃の照準模様)
  ctx.beginPath();
  ctx.moveTo(centerX - size, centerY);
  ctx.lineTo(centerX - size * 0.6, centerY);
  ctx.moveTo(centerX + size * 0.6, centerY);
  ctx.lineTo(centerX + size, centerY);
  ctx.moveTo(centerX, centerY - size);
  ctx.lineTo(centerX, centerY - size * 0.6);
  ctx.moveTo(centerX, centerY + size * 0.6);
  ctx.lineTo(centerX, centerY + size);
  ctx.stroke();
  
  // Draw circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, size, 0, Math.PI*2);
  ctx.stroke();
  
  // Draw inner circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.6, 0, Math.PI*2);
  ctx.stroke();
  
  ctx.restore();
}

function drawResonance() {
  if (resonanceMarkedEnemies.length < 2) return;
  
  const alpha = resonanceEffectTimer / 12;
  ctx.save();
  ctx.strokeStyle = '#cc00ff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#cc00ff';
  ctx.shadowBlur = 10;
  ctx.globalAlpha = alpha * 0.8;
  
  // Draw lines between all marked enemies
  for (let i = 0; i < resonanceMarkedEnemies.length; i++) {
    for (let j = i + 1; j < resonanceMarkedEnemies.length; j++) {
      const e1 = resonanceMarkedEnemies[i];
      const e2 = resonanceMarkedEnemies[j];
      ctx.beginPath();
      ctx.moveTo(e1.x, e1.y);
      ctx.lineTo(e2.x, e2.y);
      ctx.stroke();
    }
  }
  
  // Make sniper glow purple
  ctx.fillStyle = '#cc00ff';
  ctx.shadowColor = '#cc00ff';
  ctx.shadowBlur = 15;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(sniper.x, sniper.y, 12, 0, Math.PI*2);
  ctx.fill();
  
  // Make marked enemies glow purple
  for (const e of resonanceMarkedEnemies) {
    ctx.beginPath();
    ctx.arc(e.x, e.y, (e.size || 20) + 10, 0, Math.PI*2);
    ctx.fill();
  }
  
  ctx.restore();
}

function drawMarkedBossEntities() {
  if (boss) {
    if (boss.minions) for (const m of boss.minions) if (m.alive && m.marked) drawMarkOnEnemy(m);
    if (boss.decoys) for (const d of boss.decoys) if (d.alive && d.marked) drawMarkOnEnemy(d);
    if (boss.mirrors) {
      const mirrorDist = boss.mirrorDist || 120;
      for (const m of boss.mirrors) if (m.alive && m.marked) {
        const mx = boss.x + Math.cos(m.angle) * mirrorDist;
        const my = boss.y + Math.sin(m.angle) * mirrorDist;
        drawMarkOnEnemy({ x: mx, y: my, size: 22 });
      }
    }
  }
  if (bossManager) {
    if (bossManager.boss && bossManager.boss.alive && bossManager.boss.marked) drawMarkOnEnemy(bossManager.boss);
    if (bossManager.minions) for (const m of bossManager.minions) if (m.alive && m.marked) drawMarkOnEnemy(m);
  }
}

function getMarkedEntitiesForResonance() {
  const list = [];
  for (const e of enemies) if (e.alive && e.marked) list.push(e);
  if (boss && boss.alive && boss.marked) list.push(boss);
  if (boss && boss.minions) for (const m of boss.minions) if (m.alive && m.marked) list.push(m);
  if (boss && boss.decoys) for (const d of boss.decoys) if (d.alive && d.marked) list.push(d);
  if (boss && boss.mirrors) for (const m of boss.mirrors) if (m.alive && m.marked) list.push(m);
  if (bossManager) {
    if (bossManager.boss && bossManager.boss.alive && bossManager.boss.marked) list.push(bossManager.boss);
    for (const e of (bossManager.enemies||[])) if (e.alive && e.marked) list.push(e);
    for (const m of (bossManager.minions||[])) if (m.alive && m.marked) list.push(m);
  }
  return list;
}

function applyResonanceDamage(e, dmg) {
  if (boss && boss.mirrors && boss.mirrors.includes(e)) {
    const mx = e.x !== undefined ? e.x : boss.x + Math.cos(e.angle) * boss.mirrorDist;
    const my = e.y !== undefined ? e.y : boss.y + Math.sin(e.angle) * boss.mirrorDist;
    boss.hitMirror(mx, my, dmg);
  } else if (e.hit) {
    e.hit(dmg);
  } else {
    damageEnemy(e, dmg);
  }
  e.marked = false;
}

function processMarkedEntityResonance() {
  markedEnemies = getMarkedEntitiesForResonance();
  if (markedEnemies.length >= 2) {
    resonanceTimer++;
    if (resonanceTimer >= 60) {
      resonanceEffectTimer = 12;
      resonanceMarkedEnemies = [...markedEnemies];
      resonanceTimer = 0;
      const dmg = player.damage + (10 * markedEnemies.length);
      for (const e of markedEnemies) applyResonanceDamage(e, dmg);
      markedEnemies = [];
    }
  } else {
    resonanceTimer = 0;
  }
  if (resonanceEffectTimer > 0) resonanceEffectTimer--;
}
function drawEventVisuals() {
  // 霧の描画
  if (fogIntensity > 0 && state === 'wave') {
    const clearRadius = 120; 
    ctx.save();
    
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(player.x, player.y, clearRadius, 0, Math.PI * 2, true);
    // 色を白っぽく変更
    ctx.fillStyle = `rgba(230, 230, 240, ${fogIntensity})`;
    ctx.fill();

    const grad = ctx.createRadialGradient(player.x, player.y, clearRadius * 0.4, player.x, player.y, clearRadius);
    // グラデーションの色も合わせる
    grad.addColorStop(0, 'rgba(230, 230, 240, 0)');
    grad.addColorStop(1, `rgba(230, 230, 240, ${fogIntensity})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(player.x, player.y, clearRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
  
  // ハート敵への赤い線の描画
  for (const d of dropletEnemies) {
    if (d && d.alive) {
      ctx.save();
      ctx.strokeStyle = '#f00';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#f00';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ===== 巨大ブラックホールイベント =====
  if (currentEvent === 'giant_blackhole' && bhEvent && state === 'wave') {
    const bh = bhEvent;
    bh.phaseTimer++;
    bh.totalTimer++;

    const PHASE_DUR = 360; // 6秒
    const TOTAL_DUR = 1800; // 30秒（5フェーズ）

    if (bh.phaseTimer >= PHASE_DUR) {
      bh.phaseTimer = 0;
      // テレポートして次フェーズへ
      bh.x = 80 + Math.random()*(W-160);
      bh.y = 80 + Math.random()*(H/2+60);
      bh.phase = (bh.phase === 'suck') ? 'blow' : 'suck';
    }

    const prog = bh.phaseTimer / PHASE_DUR;
    const isSuck = bh.phase === 'suck';

    // 自機を引き寄せ or 吐き出し
    if (player.alive && !player.invincible) {
      const dx = bh.x - player.x, dy = bh.y - player.y;
      const dist = Math.hypot(dx, dy) || 1;
      const force = isSuck ? 2.8 : -2.5;
      player.x += (dx / dist) * force;
      player.y += (dy / dist) * force;
      player.x = Math.max(18, Math.min(W-18, player.x));
      player.y = Math.max(22, Math.min(H-8, player.y));
    }

    // 吸い込みフェーズ：画面外からBHへ向かう弾（多め）とメテオ
    if (isSuck && frameCount % 3 === 0) {
      const side = Math.floor(Math.random()*4);
      let bx, by;
      if (side===0){bx=Math.random()*W;by=-10;}
      else if(side===1){bx=Math.random()*W;by=H+10;}
      else if(side===2){bx=-10;by=Math.random()*H;}
      else{bx=W+10;by=Math.random()*H;}
      const ddx=bh.x-bx,ddy=bh.y-by,dlen=Math.hypot(ddx,ddy)||1;
      const spd = 5+Math.random()*3;
      enemyBullets.push({x:bx,y:by,vx:(ddx/dlen)*spd,vy:(ddy/dlen)*spd,alive:true,isBhBullet:true,color:'#ff4444',glow:'#ff0000'});
    }
    if (isSuck && frameCount % 20 === 0) {
      const side = Math.floor(Math.random()*4);
      let mx,my;
      if(side===0){mx=Math.random()*W;my=-30;}else if(side===1){mx=Math.random()*W;my=H+30;}
      else if(side===2){mx=-30;my=Math.random()*H;}else{mx=W+30;my=Math.random()*H;}
      const ddx=bh.x-mx,ddy=bh.y-my,dlen=Math.hypot(ddx,ddy)||1;
      bh.bhParticles = bh.bhParticles || [];
      bh.bhParticles.push({x:mx,y:my,vx:(ddx/dlen)*7,vy:(ddy/dlen)*7,alive:true,size:36+Math.random()*14,angle:Math.random()*Math.PI*2,trail:[]});
    }

    // 吐き出しフェーズ：BHから弾（多め）とメテオをランダム方向に
    if (!isSuck && frameCount % 1 === 0) {
      const a = Math.random()*Math.PI*2, spd=6+Math.random()*4;
      enemyBullets.push({x:bh.x,y:bh.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,alive:true,color:'#ff4444',glow:'#ff0000'});
    }
    if (!isSuck && frameCount % 24 === 0) {
      const a = Math.random()*Math.PI*2;
      bh.bhParticles = bh.bhParticles || [];
      bh.bhParticles.push({x:bh.x,y:bh.y,vx:Math.cos(a)*8,vy:Math.sin(a)*8,alive:true,size:36+Math.random()*14,angle:Math.random()*Math.PI*2,trail:[]});
    }

    // メテオ更新・残像記録・衝突判定（当たっても消滅しない）
    bh.bhParticles = bh.bhParticles || [];
    for (const mp of bh.bhParticles) {
      mp.trail = mp.trail || [];
      mp.trail.unshift({x:mp.x,y:mp.y,alpha:0.38});
      if (mp.trail.length>8) mp.trail.pop();

      mp.x += mp.vx; mp.y += mp.vy; mp.angle += 0.1;
      if (mp.x<-80||mp.x>W+80||mp.y<-80||mp.y>H+80) { mp.alive=false; continue; }
      if (isSuck && Math.hypot(mp.x-bh.x,mp.y-bh.y)<30) { mp.alive=false; continue; }
      // 衝突しても消えない（ダメージのみ）
      if (player.alive && !player.invincible && Math.hypot(player.x-mp.x,player.y-mp.y)<mp.size+14) {
        hitPlayerDamage(2,20);
      }
    }
    bh.bhParticles = bh.bhParticles.filter(p=>p.alive);

    // 吸い込み時：弾がBH近くで消える
    if (isSuck) {
      for (const b of enemyBullets) {
        if (!b.alive) continue;
        if (Math.hypot(b.x-bh.x,b.y-bh.y)<25) { b.alive=false; continue; }
      }
    }

    // 描画：ブラックホール本体
    ctx.save();
    const bhR = 45 + 8*Math.sin(frameCount*0.08);
    const bhGrad = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, bhR*3);
    bhGrad.addColorStop(0, isSuck ? 'rgba(160,0,220,0.6)' : 'rgba(220,80,0,0.5)');
    bhGrad.addColorStop(0.4, isSuck ? 'rgba(80,0,140,0.3)' : 'rgba(160,40,0,0.25)');
    bhGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bhGrad;
    ctx.beginPath(); ctx.arc(bh.x, bh.y, bhR*3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.shadowColor = isSuck ? '#9900ff' : '#ff4400'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(bh.x, bh.y, bhR, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.5+0.3*Math.sin(frameCount*0.1);
    ctx.strokeStyle = isSuck ? '#cc44ff' : '#ff8800'; ctx.lineWidth = 3; ctx.shadowBlur = 12;
    for (let i=0; i<3; i++) {
      ctx.save(); ctx.translate(bh.x,bh.y); ctx.rotate(frameCount*0.07*(i%2===0?1:-1)+i*1.2);
      ctx.beginPath(); ctx.ellipse(0,0,bhR+12+i*8,bhR*0.35+i*4,0,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // メテオ描画（残像→本体、drawMeteorShape使用、赤色）
    for (const mp of (bh.bhParticles||[])) {
      for (const tr of (mp.trail||[])) {
        ctx.save();
        ctx.globalAlpha = tr.alpha * 0.45;
        ctx.fillStyle = '#ff2200';
        drawMeteorShape(ctx, tr.x, tr.y, mp.size * 0.75, mp.angle);
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = '#ff2200'; ctx.shadowColor='#ff0000'; ctx.shadowBlur=14;
      drawMeteorShape(ctx, mp.x, mp.y, mp.size, mp.angle);
      ctx.restore();
    }
  }

  // ===== ピラーイベント =====
  if (currentEvent === 'pillar' && pillarEvent && state === 'wave') {
    // ラディアンスのattack_creeping_laserと同方式：8fごとに1本、12本で1セット
    // セット終了後3秒待って次セット
    if (pillarEvent.cooldown === undefined) { pillarEvent.cooldown = 0; pillarEvent.creepingCount = 0; pillarEvent.creepingDir = Math.floor(Math.random()*4); pillarEvent.firing = true; }
    
    if (pillarEvent.firing) {
      pillarEvent.laserTimer++;
      if (pillarEvent.laserTimer % 8 === 0 && pillarEvent.creepingCount < 16) {
        pillarEvent.creepingCount++;
        const p = pillarEvent.creepingCount / 16;
        const dir = pillarEvent.creepingDir;
        // レーザーは画面半分まで（ラディアンスと同じ範囲指定）
        if (dir === 0) pillarLasers.push({x:0, y:p*(H/2), angle:0, len:W, timer:0, warningTime:20, activeTime:55, alive:true});
        else if(dir===1) pillarLasers.push({x:0, y:H-p*(H/2), angle:0, len:W, timer:0, warningTime:20, activeTime:55, alive:true});
        else if(dir===2) pillarLasers.push({x:p*(W/2), y:0, angle:Math.PI/2, len:H, timer:0, warningTime:20, activeTime:55, alive:true});
        else pillarLasers.push({x:W-p*(W/2), y:0, angle:Math.PI/2, len:H, timer:0, warningTime:20, activeTime:55, alive:true});
      }
      if (pillarEvent.creepingCount >= 16) {
        // セット終了→3秒クールダウンへ
        pillarEvent.firing = false;
        pillarEvent.cooldown = 180;
        pillarEvent.creepingCount = 0;
        pillarEvent.laserTimer = 0;
        pillarEvent.creepingDir = Math.floor(Math.random()*4);
      }
    } else {
      pillarEvent.cooldown--;
      if (pillarEvent.cooldown <= 0) pillarEvent.firing = true;
    }

    // pillarレーザー更新・衝突判定
    for (const l of pillarLasers) {
      if (!l.alive) continue;
      l.timer++;
      if (l.timer >= l.warningTime && l.timer < l.activeTime && player.alive && !player.invincible) {
        const vx=Math.cos(l.angle),vy=Math.sin(l.angle);
        const dx=player.x-l.x,dy=player.y-l.y;
        const t2=dx*vx+dy*vy;
        if(t2>0&&t2<l.len){
          const dist=Math.hypot(player.x-(l.x+t2*vx),player.y-(l.y+t2*vy));
          if(dist<12) hitPlayerDamage(2,25);
        }
      }
      if (l.timer>=l.activeTime) l.alive=false;
    }
    pillarLasers = pillarLasers.filter(l=>l.alive);

    // pillarレーザー描画（星形・ボス10と同色系：cc3399）
    for (const l of pillarLasers) {
      ctx.save();
      if (l.timer < l.warningTime) {
        const wp = l.timer/l.warningTime;
        ctx.globalAlpha = 0.1+0.55*wp;
        ctx.strokeStyle = '#ff66cc'; ctx.lineWidth = 1; ctx.setLineDash([]);
        ctx.shadowColor = '#cc3399'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(l.x,l.y); ctx.lineTo(l.x+Math.cos(l.angle)*l.len,l.y+Math.sin(l.angle)*l.len);
        ctx.stroke();
      } else {
        const prog = (l.timer-l.warningTime)/(l.activeTime-l.warningTime);
        ctx.globalAlpha = 0.9*(1-prog*0.45);
        ctx.strokeStyle = '#ff44cc'; ctx.lineWidth = Math.max(2,14*(1-prog));
        ctx.shadowColor = '#cc0088'; ctx.shadowBlur = 20; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(l.x,l.y); ctx.lineTo(l.x+Math.cos(l.angle)*l.len,l.y+Math.sin(l.angle)*l.len);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function activateSuperFlash() {
  // 基: クールタイム短縮 & 10秒間ダメージ2倍バフ
  const kisoCD = curseSlots.includes('基') ? 1800 : 3600;
  player.superFlashRechargeCooldown = kisoCD;
  if (curseSlots.includes('基')) curseKisoBuffTimer = 600;
  // 礎: HP+10 & バフ
  if (curseSlots.includes('礎')) { player.hp = Math.min(player.maxHp, player.hp + 10); curseReisoBuff = true; curseReisoCoolTimer = 600; }
  player.screenFlashTimer = 30;
  player.screenFlashColor = 'rgba(255, 255, 0, 0.6)';
  
  const dmg = 100 * loopCount;
  const allE = [...enemies];
  if (boss && boss.alive) {
    allE.push(boss);
    if (boss.minions) for (const m of boss.minions) if (m.alive) allE.push(m);
    // Boss17: 鏡片にもダメージ
    if (boss.mirrors) {
      for (const m of boss.mirrors) {
        if (!m.alive) continue;
        m.hp -= dmg;
        const mx = boss.x + Math.cos(m.angle) * 120;
        const my = boss.y + Math.sin(m.angle) * 120;
        spawnDamagePopup(mx + (Math.random()-0.5)*20, my - 10, dmg, false);
        if (m.hp <= 0) { m.alive = false; m.regenTimer = 0; }
      }
    }
    // Boss17: デコイにもダメージ
    if (boss.decoys) {
      for (const d of boss.decoys) {
        if (!d.alive) continue;
        d.hit(dmg);
        spawnDamagePopup(d.x + (Math.random()-0.5)*20, d.y - 10, dmg, false);
      }
    }
  }
  if (bossManager && bossManager.alive) {
    if (bossManager.boss && bossManager.boss.alive) allE.push(bossManager.boss);
    for (const e of (bossManager.enemies||[])) if (e.alive) allE.push(e);
    for (const m of (bossManager.minions||[])) if (m.alive) allE.push(m);
  }
  for (const e of allE) {
    if (e.hit) e.hit(dmg);
    else damageEnemy(e, dmg);
    spawnDamagePopup(e.x + (Math.random()-0.5)*20, e.y - 10, dmg, false);
  }
  
  // 敵の弾もすべて消去
  enemyBullets = [];
  enemyLasers = [];
  plasmas = plasmas.filter(p => p.isPlayer || p.ringColor);  // ringColor付き(ボス14プラズマ)は消去しない
}

// ==================== BULLETS ====================
function shootPlayer() {
  const bs = player.bulletSpeed;
  const dmg = player.damage;
  spawnPlayerBullet(player.x, player.y - 22, 0, -bs, dmg);
  if (player.has3Way) {
    const wayLv = player.items.filter(id=>id==='3way').length;
    spawnPlayerBullet(player.x, player.y - 22, -bs*0.5, -bs*0.87, dmg);
    spawnPlayerBullet(player.x, player.y - 22, bs*0.5, -bs*0.87, dmg);
    if (wayLv >= 2) {
      // lv2: 3way間に追加2発 → 5way
      spawnPlayerBullet(player.x, player.y - 22, -bs*0.26, -bs*0.97, dmg);
      spawnPlayerBullet(player.x, player.y - 22, bs*0.26, -bs*0.97, dmg);
    }
  }
  if (player.hasSide) {
    spawnPlayerBullet(player.x - 18, player.y, -bs, 0, dmg * 2);
    spawnPlayerBullet(player.x + 18, player.y, bs, 0, dmg * 2);
  }
  if (player.hasBack) {
    spawnPlayerBullet(player.x, player.y + 8, 0, bs, dmg * 2);
  }
  if (player.hasHoming) {
    const target = findNearestEnemy();
    if (target) {
      const dx = target.x - player.x, dy = target.y - player.y;
      const dist = Math.hypot(dx, dy);
      spawnPlayerBullet(player.x, player.y - 22, dx/dist*bs, dy/dist*bs, dmg, true);
    }
  }
}

function spawnPlayerBullet(x, y, vx, vy, dmg, homing=false) {
  playerBullets.push({ x, y, vx, vy, dmg, homing, pierce: player.hasPierce && !homing, pierced: false, alive: true });
}

function findNearestEnemy() {
  let nearest = null, minD = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < minD) { minD = d; nearest = e; }
  }
  if (boss && boss.alive) {
    const d = Math.hypot(boss.x - player.x, boss.y - player.y);
    if (d < minD) { minD = d; nearest = boss; }
  }
  if (bossManager && bossManager.alive) {
    if (bossManager.boss && bossManager.boss.alive) {
      const d = Math.hypot(bossManager.boss.x - player.x, bossManager.boss.y - player.y);
      if (d < minD) { minD = d; nearest = bossManager.boss; }
    }
    for (const e of (bossManager.enemies||[])) if (e.alive) {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < minD) { minD = d; nearest = e; }
    }
    for (const m of (bossManager.minions||[])) if (m.alive) {
      const d = Math.hypot(m.x - player.x, m.y - player.y);
      if (d < minD) { minD = d; nearest = m; }
    }
  }
  return nearest;
}

function updatePlayerBullets() {
  for (const b of playerBullets) {
    if (!b.alive) continue;

    // ポイズントラップ専用ロジック
    if (b.isPoisonTrap) {
      if (b.isPoisonAura) {
        // 常時自機追従オーラ
        b.x = player.x; b.y = player.y;
        b.trapTimer++;
        const ptLv = player.items.filter(id=>id==='poisontrap').length;
        b.poisonLv = ptLv;
        b.trapR = ptLv===1?80 : ptLv===2?110 : ptLv===3?140 : 170;
        // lv4: 毒継続時間8秒(480f)、それ以外は5秒(300f)
        const poisonDur = ptLv >= 4 ? 480 : 300;
        // 蟲: 毒ダメージ+2（applyPoisonのlvに+2を加算）
        const poisonLvBonus = curseSlots.includes('蟲') ? 2 : 0;
        const allEm = [...enemies];
        if (boss && boss.alive) allEm.push(boss);
        if (boss && boss.minions) for (const m of boss.minions) if (m.alive) allEm.push(m);
        if (bossManager && bossManager.boss && bossManager.boss.alive) allEm.push(bossManager.boss);
        for (const m of (bossManager && bossManager.minions || [])) if (m.alive) allEm.push(m);
        for (const e of allEm) {
          if (!e.alive) continue;
          if (Math.hypot(b.x - e.x, b.y - e.y) < b.trapR) {
            applyPoison(e, ptLv + poisonLvBonus, poisonDur);
          }
        }
        // ポイズントラップを持っていなければ消滅
        if (ptLv <= 0) b.alive = false;
      }
      continue;
    }

    // 通常弾
    if (b.homing) {
      const t = findNearestEnemy();
      if (t) {
        const dx = t.x - b.x, dy = t.y - b.y;
        const dist = Math.hypot(dx, dy);
        b.vx += (dx/dist * player.bulletSpeed - b.vx) * 0.08;
        b.vy += (dy/dist * player.bulletSpeed - b.vy) * 0.08;
      }
    }
    b.x += b.vx; b.y += b.vy;
    if (b.x < -50 || b.x > W+50 || b.y < -50 || b.y > H+50) b.alive = false;
  }
  playerBullets = playerBullets.filter(b => b.alive);

  for (const l of playerLasers) {
    if (l.warning > 0) l.warning--;
    else if (l.active > 0) {
      const allE = [];
      for (const e of enemies) if (e.alive) allE.push(e);
      if(boss && boss.alive) allE.push(boss);
      if(bossManager) {
         if(bossManager.boss && bossManager.boss.alive) allE.push(bossManager.boss);
         for(const e of (bossManager.enemies||[])) if(e.alive) allE.push(e);
         for(const m of (bossManager.minions||[])) if(m.alive) allE.push(m);
      }
      for (const e of allE) {
        if (!l.hitSet.has(e)) {
          const d = Math.abs(Math.sin(l.angle)*(e.x - l.x) - Math.cos(l.angle)*(e.y - l.y));
          if (d < (e.size || 25) + 10) {
            if(e.hit) { e.hit(l.dmg); spawnDamagePopup(e.x, e.y-10, l.dmg, false); } else damageEnemy(e, l.dmg);
            l.hitSet.add(e);
          }
        }
      }
      l.active--;
    }
  }
  playerLasers = playerLasers.filter(l => l.active > 0 || l.warning > 0);

  for (const b of playerBombs) {
    b.x += b.vx; b.y += b.vy;
    b.timer--;
    if (b.timer <= 0) {
      for (let i=0; i<b.ways; i++) spawnPlayerBullet(b.x, b.y, Math.cos(i*Math.PI*2/b.ways)*7, Math.sin(i*Math.PI*2/b.ways)*7, b.dmg);
      b.alive = false;
    } else b.alive = true;
  }
  playerBombs = playerBombs.filter(b => b.alive);
  updatePlayerChakrams();
  updatePlayerBubbles();
  updatePlayerTornadoes();
  updatePlayerMeteors();
  updatePlayerFragileShots();
  updateHelperUnits();
  updateKarmaParticles();
  updateDamagePopups();
  updateStatusEffects();
  updateFireParticles();
}

function drawPlayerBullets() {
  for (const b of playerBullets) {
    if (!b.alive || !b.isPoisonAura) continue;  // isPoisonAura のみ描画
    ctx.save();
    // 内側の薄い塗り（fill は一切しない → 後続描画に干渉しない）
    const pulse = 0.12 + 0.06*Math.sin(b.trapTimer*0.08);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#44ff44';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.trapR, 0, Math.PI*2); ctx.fill();
    // アウトライン（破線リング）
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#88ffaa'; ctx.lineWidth = 2;
    ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 12;
    ctx.setLineDash([10, 5]);
    ctx.lineDashOffset = -(b.trapTimer % 30);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.trapR, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);  // 必ず破線をリセット
    ctx.globalAlpha = 1;  // 必ずalphaをリセット
    ctx.shadowBlur = 0;   // 必ずshadowBlurをリセット
    ctx.restore();
  }
  for (const b of playerBullets) {
    if (b.isPoisonTrap) continue; // ポイズントラップは上のループで描画済み
    ctx.save(); 
    if (b.isFromSniper) {
      ctx.fillStyle = '#800080'; ctx.shadowColor = '#800080'; // Purple for sniper bullets
    } else {
      ctx.fillStyle = b.infinitePierce ? '#0ff' : '#ff0'; ctx.shadowColor = b.infinitePierce ? '#0ff' : '#ff0';
    }
    ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(b.x, b.y, b.infinitePierce ? 6 : 4, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }
  for (const b of playerBombs) {
    ctx.save(); ctx.fillStyle = '#ff8'; ctx.shadowColor = '#ff0'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(b.x, b.y, 8 + Math.sin(frameCount*0.3)*3, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }
  for (const b of playerChakrams) {
    ctx.save();
    for (const t of b.trail || []) {
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = '#ffeb99';
      ctx.beginPath();
      ctx.arc(t.x, t.y, b.size, 0, Math.PI*2);
      ctx.arc(t.x, t.y, b.size * 0.5, 0, Math.PI*2, true);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffeb99'; ctx.shadowColor = '#ffeb99'; ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI*2);
    ctx.arc(b.x, b.y, b.size * 0.5, 0, Math.PI*2, true);
    ctx.fill();
    ctx.restore();
  }
  for (const s of playerBubbles) {
    ctx.save();
    if (s.burst) {
      for (const p of s.burstParticles || []) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = 'rgba(180,240,255,0.9)';
        ctx.beginPath(); ctx.arc(s.x + p.x, s.y + p.y, Math.max(2, s.radius * 0.18), 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
      continue;
    }
    for (const t of s.trail || []) {
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = `rgba(160,255,255,${t.alpha * 0.5})`;
      ctx.strokeStyle = `rgba(180,255,255,${t.alpha * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(t.x, t.y, s.radius * 0.8, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }
    const alpha = 0.35 + 0.25 * Math.sin(frameCount * 0.15);
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(160,255,255,${alpha})`;
    ctx.strokeStyle = `rgba(180,255,255,0.8)`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  for (const l of playerLasers) {
    ctx.save();
    if(l.warning > 0) {
      const wp = 1 - l.warning/30;
      ctx.globalAlpha = 0.1 + 0.55*wp; ctx.strokeStyle = '#ffff66'; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.shadowColor='#ffff00'; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.moveTo(l.x - Math.cos(l.angle)*2000, l.y - Math.sin(l.angle)*2000); ctx.lineTo(l.x + Math.cos(l.angle)*2000, l.y + Math.sin(l.angle)*2000); ctx.stroke();
    } else if(l.active > 0) {
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#fff'; ctx.shadowColor='#ff0'; ctx.shadowBlur=15; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(l.x - Math.cos(l.angle)*2000, l.y - Math.sin(l.angle)*2000); ctx.lineTo(l.x + Math.cos(l.angle)*2000, l.y + Math.sin(l.angle)*2000); ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = '#ff0'; ctx.stroke();
    }
    ctx.restore();
  }
}

function updatePlayerChakrams() {
  for (const b of playerChakrams) {
    if (!b.alive) continue;
    b.trail = b.trail || [];
    b.trail.unshift({x: b.x, y: b.y, alpha: 0.3});
    if (b.trail.length > 10) b.trail.pop();
    b.x += b.vx; b.y += b.vy;

    let reflected = false;
    if (b.reflectRemaining > 0) {
      if (b.x - b.size < 0) {
        b.x = b.size;
        b.vx = Math.abs(b.vx);
        reflected = true;
      }
      if (b.x + b.size > W) {
        b.x = W - b.size;
        b.vx = -Math.abs(b.vx);
        reflected = true;
      }
      if (b.y - b.size < 0) {
        b.y = b.size;
        b.vy = Math.abs(b.vy);
        reflected = true;
      }
      if (b.y + b.size > H) {
        b.y = H - b.size;
        b.vy = -Math.abs(b.vy);
        reflected = true;
      }
      if (reflected) {
        b.reflectRemaining--;
        if (b.hitSet) b.hitSet.clear();
      }
    }

    if (b.reflectRemaining <= 0 && (b.x < -b.size || b.x > W + b.size || b.y < -b.size || b.y > H + b.size)) {
      b.alive = false;
    }

    const allE = [...enemies];
    if (boss && boss.alive) allE.push(boss);
    if (bossManager && bossManager.alive) {
      if (bossManager.boss && bossManager.boss.alive) allE.push(bossManager.boss);
      for (const e of (bossManager.enemies||[])) if (e.alive) allE.push(e);
      for (const m of (bossManager.minions||[])) if (m.alive) allE.push(m);
    }
    for (const e of allE) {
      if (!e.alive) continue;
      if (!b.hitSet) b.hitSet = new Set();
      if (b.hitSet.has(e)) continue;
      const size = e.size || 20;
      if (Math.hypot(b.x - e.x, b.y - e.y) < b.size + size) {
        if (e.hit) { e.hit(b.dmg); spawnDamagePopup(e.x, e.y-10, b.dmg, false); }
        else damageEnemy(e, b.dmg);
        b.hitSet.add(e);
      }
    }
  }
  playerChakrams = playerChakrams.filter(b => b.alive);
}

function updatePlayerBubbles() {
  for (const s of playerBubbles) {
    if (!s.alive) continue;
    s.trail = s.trail || [];
    s.trail.unshift({x: s.x, y: s.y, alpha: 0.2});
    if (s.trail.length > 12) s.trail.pop();
    s.x += s.vx; s.y += s.vy;
    s.timer++;

    let reflected = false;
    let wallHit = false;
    if (s.x - s.radius < 0) {
      wallHit = true;
      if (s.reflectRemaining > 0) {
        s.x = s.radius;
        s.vx = Math.abs(s.vx);
        reflected = true;
      }
    }
    if (s.x + s.radius > W) {
      wallHit = true;
      if (s.reflectRemaining > 0) {
        s.x = W - s.radius;
        s.vx = -Math.abs(s.vx);
        reflected = true;
      }
    }
    if (s.y - s.radius < 0) {
      wallHit = true;
      if (s.reflectRemaining > 0) {
        s.y = s.radius;
        s.vy = Math.abs(s.vy);
        reflected = true;
      }
    }
    if (s.y + s.radius > H) {
      wallHit = true;
      if (s.reflectRemaining > 0) {
        s.y = H - s.radius;
        s.vy = -Math.abs(s.vy);
        reflected = true;
      }
    }

    if (reflected && s.reflectRemaining > 0) {
      const splitRadius = Math.max(s.minRadius, s.radius * 0.7);
      const speed = Math.hypot(s.vx, s.vy);
      const angle = Math.atan2(s.vy, s.vx);
      const perp = angle + Math.PI/3;
      playerBubbles.push({
        x: s.x,
        y: s.y,
        vx: Math.cos(perp) * speed,
        vy: Math.sin(perp) * speed,
        radius: splitRadius,
        minRadius: s.minRadius,
        timer: 0,
        alive: true,
        hitSet: new Set(),
        dmg: s.dmg,
        reflectRemaining: s.reflectRemaining - 1,
        trail: []
      });
      s.radius = splitRadius;
      s.reflectRemaining--;
      if (s.hitSet) s.hitSet.clear();
    }

    if (wallHit && !reflected && !s.burst) {
      s.burst = true;
      s.burstTimer = 12;
      s.burstParticles = [];
      for (let i = 0; i < 10; i++) {
        s.burstParticles.push({
          x: 0,
          y: 0,
          angle: (Math.PI*2/10) * i,
          speed: 2 + Math.random() * 2,
          alpha: 1
        });
      }
      s.vx = 0;
      s.vy = 0;
    }

    if (s.burst) {
      s.burstTimer--;
      for (const p of s.burstParticles) {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.alpha *= 0.9;
      }
      if (s.burstTimer <= 0) s.alive = false;
      continue;
    }

    if (s.reflectRemaining <= 0 && (s.x < -s.radius || s.x > W + s.radius || s.y < -s.radius || s.y > H + s.radius)) {
      s.alive = false;
    }

    const allE = [...enemies];
    if (boss && boss.alive) allE.push(boss);
    if (bossManager && bossManager.alive) {
      if (bossManager.boss && bossManager.boss.alive) allE.push(bossManager.boss);
      for (const e of (bossManager.enemies||[])) if (e.alive) allE.push(e);
      for (const m of (bossManager.minions||[])) if (m.alive) allE.push(m);
    }
    for (const e of allE) {
      if (!e.alive) continue;
      if (!s.hitSet) s.hitSet = new Set();
      if (s.hitSet.has(e)) continue;
      const size = e.size || 20;
      if (Math.hypot(s.x - e.x, s.y - e.y) < s.radius + size) {
        if (e.hit) { e.hit(s.dmg); spawnDamagePopup(e.x, e.y-10, s.dmg, false); }
        else damageEnemy(e, s.dmg);
        s.hitSet.add(e);
      }
    }
  }
  playerBubbles = playerBubbles.filter(s => s.alive);
}

function firePlayerTornado(lv) {
  const size = lv === 1 ? 14 : (lv === 2 ? 16 : (lv === 3 ? 19 : 22));
  const speed = 0.55; // 全lv共通でゆっくり
  const angle = Math.random() * Math.PI * 2;
  playerTornadoes.push({
    x: player.x, y: player.y,
    originX: player.x, originY: player.y,  // 発射時の位置を固定
    baseAngle: angle, t: 0,
    size, speed, lv,
    dmg: lv >= 4 ? player.damage + 24 : player.damage + 12,
    trail: [], alive: true,
    hitSet: new Set(),
  });
}

function updatePlayerTornadoes() {
  const allTargets = [...enemies];
  if (boss && boss.alive) allTargets.push(boss);

  for (const t of playerTornadoes) {
    if (!t.alive) continue;
    t.t++;
    // 渦巻き運動: 半径が広がりながら回転
    const r = t.speed * t.t * 1.6; // 広がりを大きく
    const angle = t.baseAngle + t.t * 0.06; // 回転は緩やか
    t.x = t.originX + Math.cos(angle) * r;
    t.y = t.originY + Math.sin(angle) * r;

    // 残像
    t.trail.unshift({ x: t.x, y: t.y, alpha: 0.35 });
    if (t.trail.length > 7) t.trail.pop();

    // 寿命
    if (r > Math.max(W, H) * 0.75 || t.t > 500) { t.alive = false; continue; }

    // 当たり判定 (クールダウンあり)
    for (const e of allTargets) {
      if (!e.alive) continue;
      if (t.hitSet.has(e)) continue;
      if (Math.hypot(e.x - t.x, e.y - t.y) < (e.size || 30) + t.size) {
        if (e.hit) { e.hit(t.dmg); spawnDamagePopup(e.x, e.y-10, t.dmg, false); } else damageEnemy(e, t.dmg);
        t.hitSet.add(e);
        setTimeout(() => t.hitSet.delete(e), 500);
      }
    }
  }
  playerTornadoes = playerTornadoes.filter(t => t.alive);
}

function drawPlayerTornadoes() {
  for (const t of playerTornadoes) {
    // 残像
    for (const tr of t.trail) {
      ctx.save();
      ctx.globalAlpha = tr.alpha * 0.6;
      ctx.fillStyle = '#aaffaa';
      drawCrescent(ctx, tr.x, tr.y, t.size * 0.85, t.t * 0.22);
      ctx.restore();
    }
    // 本体（三日月形・薄黄緑）
    ctx.save();
    ctx.fillStyle = '#88ff88';
    ctx.shadowColor = '#44ff44';
    ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.9;
    drawCrescent(ctx, t.x, t.y, t.size, t.t * 0.22);
    ctx.restore();
  }
}

function drawCrescent(ctx, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.arc(r * 0.5, 0, r * 0.75, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();
}

function firePlayerFragileShot() {
  const target = findNearestEnemy();
  if (!target && boss && boss.alive) {
    // ボスだけの場合
  } else if (!target) {
    return; // ターゲットがない
  }
  
  const finalTarget = target || boss;
  const dx = finalTarget.x - player.x;
  const dy = finalTarget.y - player.y;
  const dist = Math.hypot(dx, dy);
  const vx = (dist > 0) ? (dx / dist) * 15 : 0; // 高速
  const vy = (dist > 0) ? (dy / dist) * 15 : 0;
  
  const lv = getFragileShotLevel();
  const fragileLv = lv >= 2 ? 2 : 1;
  
  playerFragileShots.push({
    x: player.x, y: player.y,
    vx, vy, trail: [],
    dmg: 1,
    fragileLv: fragileLv,
    fragileDuration: 600, // 10秒
    alive: true,
    hitSet: new Set(),
  });
  
  player.fragileshotCooldown = 1440; // 24秒クールタイム
}

function updatePlayerFragileShots() {
  const allTargets = [...enemies];
  if (boss && boss.alive) allTargets.push(boss);
  if (bossManager && bossManager.alive) {
    if (bossManager.boss && bossManager.boss.alive) allTargets.push(bossManager.boss);
    for (const e of (bossManager.enemies||[])) if (e.alive) allTargets.push(e);
    for (const m of (bossManager.minions||[])) if (m.alive) allTargets.push(m);
  }

  for (const fs of playerFragileShots) {
    if (!fs.alive) continue;
    
    fs.x += fs.vx;
    fs.y += fs.vy;

    // 残像
    fs.trail.unshift({ x: fs.x, y: fs.y, alpha: 0.4 });
    if (fs.trail.length > 5) fs.trail.pop();

    // 画面外判定
    if (fs.x < -20 || fs.x > W + 20 || fs.y < -20 || fs.y > H + 20) {
      fs.alive = false;
      continue;
    }

    // 敵への当たり判定
    for (const e of allTargets) {
      if (!e.alive) continue;
      if (fs.hitSet.has(e)) continue;
      const size = e.size || 30;
      if (Math.hypot(e.x - fs.x, e.y - fs.y) < 10 + size) {
        if (e.hit) { e.hit(fs.dmg); spawnDamagePopup(e.x, e.y-10, fs.dmg, false); }
        else damageEnemy(e, fs.dmg);
        
        // 脆弱付与
        applyFragile(e, fs.fragileLv, fs.fragileDuration);
        
        fs.hitSet.add(e);
        fs.alive = false;
        break;
      }
    }
  }

  playerFragileShots = playerFragileShots.filter(fs => fs.alive);
}

function drawPlayerFragileShots() {
  for (const fs of playerFragileShots) {
    // 残像
    for (const tr of fs.trail) {
      ctx.save();
      ctx.globalAlpha = tr.alpha * 0.5;
      ctx.fillStyle = '#0088ff';
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // 本体（群青色）
    ctx.save();
    ctx.fillStyle = '#0066ff';
    ctx.shadowColor = '#0044ff';
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(fs.x, fs.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function firePlayerMeteor(lv) {
  const allTargets = [...enemies];
  if (boss && boss.alive) allTargets.push(boss);
  if (allTargets.length === 0) return;

  const size = lv === 1 ? 30 : (lv === 2 ? 42 : (lv === 3 ? 54 : 68));
  const dmg = player.damage + (lv >= 4 ? 50 : 30);

  // ランダムな敵を1体選ぶ
  const target = allTargets[Math.floor(Math.random() * allTargets.length)];
  spawnMeteor(target, size, dmg, false, lv);

  // lv4: 小メテオ2つを別の敵に向けて追加発射
  if (lv >= 4) {
    const others = allTargets.filter(e => e !== target);
    const smDmg = player.damage + 25;
    for (let i = 0; i < 2; i++) {
      const smTarget = others.length > 0
        ? others[Math.floor(Math.random() * others.length)]
        : allTargets[Math.floor(Math.random() * allTargets.length)];
      spawnMeteor(smTarget, size * 0.6, smDmg, true, lv);
    }
  }
}

function spawnMeteor(target, size, dmg, isMini, lv) {
  // 画面外から出現（ランダムな辺）
  const side = Math.floor(Math.random() * 4);
  let sx, sy;
  if (side === 0) { sx = Math.random() * W; sy = -size * 2; }
  else if (side === 1) { sx = Math.random() * W; sy = H + size * 2; }
  else if (side === 2) { sx = -size * 2; sy = Math.random() * H; }
  else { sx = W + size * 2; sy = Math.random() * H; }

  const dx = target.x - sx, dy = target.y - sy;
  const len = Math.hypot(dx, dy) || 1;
  const speed = 8;

  playerMeteors.push({
    x: sx, y: sy,
    vx: (dx / len) * speed, vy: (dy / len) * speed,
    angle: Math.atan2(dy, dx),
    size, dmg, isMini, lv,
    trail: [], jetTimer: 0,
    alive: true, hit: false,
    target,
  });
}

function updatePlayerMeteors() {
  for (const m of playerMeteors) {
    if (!m.alive) continue;
    m.x += m.vx; m.y += m.vy;

    // 残像
    m.trail.unshift({ x: m.x, y: m.y, alpha: 0.4 });
    if (m.trail.length > 9) m.trail.pop();

    // 噴射弾（メテオのみ、毎4f）
    if (!m.isMini && m.jetTimer++ % 5 === 0) {
      const backAngle = m.angle + Math.PI;
      for (let i = 0; i < 3; i++) {
        const spread = (Math.random() - 0.5) * 0.5;
        const jspeed = 1.5 + Math.random() * 5;
        const jdmg = Math.max(1, Math.floor(player.damage));
        playerBullets.push({
          x: m.x, y: m.y,
          vx: Math.cos(backAngle + spread) * jspeed,
          vy: Math.sin(backAngle + spread) * jspeed,
          alive: true, dmg: jdmg,
          color: '#ffaa44', glow: '#ff6600',
          pierce: false, pierced: false, infinitePierce: false,
          isItem: true,
        });
      }
    }

    // 当たり判定（貫通: 0.4秒クールダウンで複数体にダメージ）
    if (!m.hitSet) m.hitSet = new Set();
    const allTargets = [...enemies];
    if (boss && boss.alive) allTargets.push(boss);
    for (const e of allTargets) {
      if (!e.alive) continue;
      if (m.hitSet.has(e)) continue;
      if (Math.hypot(e.x - m.x, e.y - m.y) < (e.size || 30) + m.size) {
        if (e.hit) { e.hit(m.dmg); spawnDamagePopup(e.x, e.y-10, m.dmg, false); } else damageEnemy(e, m.dmg);
        m.hitSet.add(e);
        setTimeout(() => m.hitSet && m.hitSet.delete(e), 400);
      }
    }

    // 画面外で消滅
    if (m.x < -200 || m.x > W + 200 || m.y < -200 || m.y > H + 200) m.alive = false;
  }
  playerMeteors = playerMeteors.filter(m => m.alive);
}

function drawPlayerMeteors() {
  for (const m of playerMeteors) {
    // 残像
    for (const tr of m.trail) {
      ctx.save();
      ctx.globalAlpha = tr.alpha * 0.5;
      ctx.fillStyle = '#ffaa44';
      drawMeteorShape(ctx, tr.x, tr.y, m.size * 0.8, m.angle);
      ctx.restore();
    }
    // 本体
    ctx.save();
    ctx.fillStyle = m.isMini ? '#ffcc88' : '#ffaa44';
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 14;
    drawMeteorShape(ctx, m.x, m.y, m.size, m.angle);
    ctx.restore();
  }
}

function drawMeteorShape(ctx, x, y, r, angle) {
  // ギザギザの丸（放射状のスパイク付き円）
  const spikes = 12;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = (Math.PI * 2 / (spikes * 2)) * i;
    const rad = i % 2 === 0 ? r : r * 0.65;
    if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ==================== HELPER UNIT ====================
function spawnHelperUnit(lv) {
  // 既存ユニットのlvだけ更新する（常に1体のみ）
  if (helperUnits.length > 0) { helperUnits[0].lv = lv; helperUnits[0].attackInterval = lv >= 4 ? 55 : 90; return; }
  // 初期位置: 自機の少し上
  const startX = player.x;
  const startY = player.y - 60;
  helperUnits.push({
    x: startX, y: startY, lv,
    // star/boss10型ステートマシン
    state: 'move',
    stateTimer: 0,
    tx: 60 + Math.random() * (W - 120),
    ty: 40 + Math.random() * (H / 2 - 40),
    // 攻撃
    attackTimer: 0,
    attackInterval: lv >= 4 ? 55 : 90,
    rampageActive: false, rampageTimer: 0, rampageStep: 0,
    lasers: [],
    alive: true,
  });
}

function updateHelperUnits() {
  const allTargets = [...enemies];
  if (boss && boss.alive) allTargets.push(boss);

  for (const h of helperUnits) {
    if (!h.alive) continue;

    // --- star敵型の素早い挙動不審移動 ---
    h.stateTimer++;
    if (!h.rampageActive) {
      if (h.state === 'move') {
        h.x += (h.tx - h.x) * 0.045;
        h.y += (h.ty - h.y) * 0.045;
        if (h.stateTimer > 40 + Math.random() * 30) {
          h.state = Math.random() < 0.45 ? 'stop' : 'dash';
          h.stateTimer = 0;
        }
      } else if (h.state === 'stop') {
        // 止まって次の目標を設定
        if (h.stateTimer > 15 + Math.random() * 20) {
          h.tx = 60 + Math.random() * (W - 120);
          h.ty = 40 + Math.random() * (H / 2 - 40);
          h.state = 'move'; h.stateTimer = 0;
        }
      } else if (h.state === 'dash') {
        // 高速突進
        h.x += (h.tx - h.x) * 0.18;
        h.y += (h.ty - h.y) * 0.18;
        if (h.stateTimer > 18) {
          h.tx = 60 + Math.random() * (W - 120);
          h.ty = 40 + Math.random() * (H / 2 - 40);
          h.state = 'move'; h.stateTimer = 0;
        }
      }
      h.x = Math.max(30, Math.min(W - 30, h.x));
      h.y = Math.max(30, Math.min(H - 30, h.y));
    }

    // --- レーザー更新 ---
    for (const l of h.lasers) {
      l.timer++;
      if (l.timer >= l.warningTime && l.timer < l.activeTime) {
        if (player.alive && !player.invincible) { /* ヘルパーレーザーは自機には当たらない */ }
        // 敵に当たる
        for (const e of allTargets) {
          if (!e.alive || (l.hitSet && l.hitSet.has(e))) continue;
          const vx = Math.cos(l.angle), vy = Math.sin(l.angle);
          const dx = e.x - l.x, dy = e.y - l.y;
          const t2 = dx*vx + dy*vy;
          if (t2 > 0 && t2 < l.length) {
            const dist = Math.hypot(e.x - (l.x + t2*vx), e.y - (l.y + t2*vy));
            if (dist < (e.size || 30)) {
              if (!l.hitSet) l.hitSet = new Set();
              if (e.hit) { e.hit(l.dmg); spawnDamagePopup(e.x, e.y-10, l.dmg, false); } else damageEnemy(e, l.dmg);
              l.hitSet.add(e);
            }
          }
        }
      }
      if (l.timer >= l.activeTime) l.alive = false;
    }
    h.lasers = h.lasers.filter(l => l.alive);

    // --- ランページレーザー進行 ---
    if (h.rampageActive) {
      h.rampageTimer++;
      if (h.rampageStep < 8 && h.rampageTimer % 6 === 0) {
        const angle = (Math.PI * 2 / 8) * h.rampageStep + Math.random() * 0.5;
        const dmg = player.damage + 20;
        h.lasers.push({ x: h.x, y: h.y, angle, length: Math.max(W,H)*2, timer: 0, warningTime: 10, activeTime: 28, alive: true, dmg, hitSet: new Set() });
        h.rampageStep++;
      }
      if (h.rampageStep >= 8 && h.lasers.length === 0) {
        h.rampageActive = false; h.rampageTimer = 0; h.rampageStep = 0;
      }
      continue; // ランページ中は通常攻撃しない
    }

    // --- 攻撃 ---
    h.attackTimer++;
    if (h.attackTimer < h.attackInterval) continue;
    if (allTargets.filter(e => e.alive).length === 0) continue;
    h.attackTimer = 0;

    // 一番近い敵を探す
    let nearestEnemy = null, nearestDist = Infinity;
    for (const e of allTargets) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - h.x, e.y - h.y);
      if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
    }

    // lv別攻撃ローテーション
    const possibleAttacks = ['fan3'];
    if (h.lv >= 2) possibleAttacks.push('omni16');
    if (h.lv >= 3) possibleAttacks.push('burst12');
    if (h.lv >= 4) possibleAttacks.push('rampage');

    // fan3を多めに選ぶ（確率調整）
    let attack;
    const r = Math.random();
    if (r < 0.5 || possibleAttacks.length === 1) {
      attack = 'fan3';
    } else {
      attack = possibleAttacks[1 + Math.floor(Math.random() * (possibleAttacks.length - 1))];
    }

    if (attack === 'fan3' && nearestEnemy) {
      // 狭い扇形三方向弾
      const baseAngle = Math.atan2(nearestEnemy.y - h.y, nearestEnemy.x - h.x);
      const dmg = player.damage + 3;
      const bspeed = 12;
      for (let i = -1; i <= 1; i++) {
        const a = baseAngle + i * 0.2;
        playerBullets.push({ x: h.x, y: h.y, vx: Math.cos(a)*bspeed, vy: Math.sin(a)*bspeed, alive: true, dmg, color: '#aaff44', glow: '#44ff44', pierce: false, pierced: false, infinitePierce: false, isItem: true });
      }
    } else if (attack === 'omni16') {
      // 16方向弾
      const dmg = player.damage + 5;
      for (let i = 0; i < 16; i++) {
        const a = (Math.PI * 2 / 16) * i;
        playerBullets.push({ x: h.x, y: h.y, vx: Math.cos(a)*5, vy: Math.sin(a)*5, alive: true, dmg, color: '#aaff44', glow: '#44ff44', pierce: false, pierced: false, infinitePierce: false, isItem: true });
      }
    } else if (attack === 'burst12' && nearestEnemy) {
      // 連続12発射
      const baseAngle = Math.atan2(nearestEnemy.y - h.y, nearestEnemy.x - h.x);
      const dmg = player.damage;
      for (let i = 0; i < 12; i++) {
        const delay = i * 60;
        setTimeout(() => {
          if (!h.alive) return;
          const a = baseAngle + (Math.random() - 0.5) * 0.15;
          playerBullets.push({ x: h.x, y: h.y, vx: Math.cos(a)*8, vy: Math.sin(a)*8, alive: true, dmg, color: '#aaff44', glow: '#44ff44', pierce: false, pierced: false, infinitePierce: false, isItem: true });
        }, delay);
      }
    } else if (attack === 'rampage') {
      // ランページレーザー（一時停止して32方向から8本）
      h.rampageActive = true; h.rampageTimer = 0; h.rampageStep = 0;
    }
  }
}

function drawHelperUnits() {
  for (const h of helperUnits) {
    if (!h.alive) continue;
    // レーザー描画
    for (const l of h.lasers) {
      ctx.save();
      if (l.timer < l.warningTime) {
        const wp = l.timer / l.warningTime;
        ctx.globalAlpha = 0.1 + 0.55 * wp;
        ctx.strokeStyle = '#aaff44'; ctx.lineWidth = 1;
        ctx.setLineDash([]); ctx.lineCap = 'round';
        ctx.shadowColor = '#44ff44'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.x + Math.cos(l.angle)*l.length, l.y + Math.sin(l.angle)*l.length);
        ctx.stroke();
      } else {
        const prog = (l.timer - l.warningTime) / (l.activeTime - l.warningTime);
        ctx.globalAlpha = 0.9 * (1 - prog * 0.5);
        ctx.strokeStyle = '#ccff66'; ctx.lineWidth = Math.max(1, 10*(1-prog));
        ctx.shadowColor = '#aaff44'; ctx.shadowBlur = 18; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(l.x, l.y);
        ctx.lineTo(l.x + Math.cos(l.angle)*l.length, l.y + Math.sin(l.angle)*l.length);
        ctx.stroke();
      }
      ctx.restore();
    }
    // ユニット本体（黄色+緑縁の丸）
    ctx.save();
    const pulse = 0.85 + 0.15 * Math.sin(Date.now() * 0.004);
    const r = 14 * pulse;
    // 外側（緑）
    ctx.beginPath(); ctx.arc(h.x, h.y, r + 4, 0, Math.PI*2);
    ctx.fillStyle = '#44cc22'; ctx.shadowColor = '#44ff44'; ctx.shadowBlur = 12; ctx.fill();
    // 内側（黄色）
    ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, Math.PI*2);
    ctx.fillStyle = '#ffee44'; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 8; ctx.fill();
    // ランページ中は白く点滅
    if (h.rampageActive && Math.floor(Date.now() / 100) % 2 === 0) {
      ctx.beginPath(); ctx.arc(h.x, h.y, r + 6, 0, Math.PI*2);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ==================== FIRE ====================
let fireParticles = [];

function firePlayerFire(lv) {
  const fireLv = lv;
  const maxDist = fireLv===1?150 : fireLv===2?200 : fireLv===3?250 : 300;
  const baseDmg = curseSlots.includes('炎') ? 2 : 1;
  const a = Math.atan2(player.y - (player.y+1), 0); // 上向き基準
  // 自機の前方向（最近くの敵へ）
  let targetAngle = -Math.PI/2;
  const allE = [...enemies]; if (boss&&boss.alive) allE.push(boss);
  let nearDist = Infinity, nearE = null;
  for (const e of allE) { if(!e.alive)continue; const d=Math.hypot(e.x-player.x,e.y-player.y); if(d<nearDist){nearDist=d;nearE=e;} }
  if (nearE) targetAngle = Math.atan2(nearE.y-player.y, nearE.x-player.x);

  // 扇状に3本の炎パーティクルを発射
  for (let i=-1; i<=1; i++) {
    const spread = i * 0.22;
    const ang = targetAngle + spread;
    const speed = 6 + Math.random()*1.5;
    fireParticles.push({
      x: player.x, y: player.y,
      vx: Math.cos(ang)*speed, vy: Math.sin(ang)*speed,
      life: Math.floor(maxDist / speed), maxLife: Math.floor(maxDist/speed),
      size: 5 + fireLv*1.5,
      dmg: baseDmg, lv: fireLv,
      hitSet: new Set(), alive: true,
      color: ['#ffaa44','#ff6600','#ff3300'][i+1],
      isEnhanced: curseSlots.includes('炎'),
    });
  }
}

function updateFireParticles() {
  const allE = [...enemies]; if (boss&&boss.alive) allE.push(boss);
  for (const fp of fireParticles) {
    if (!fp.alive) continue;
    fp.x += fp.vx; fp.y += fp.vy;
    fp.life--;
    if (fp.life <= 0) { fp.alive = false; continue; }
    for (const e of allE) {
      if (!e.alive || fp.hitSet.has(e)) continue;
      if (Math.hypot(fp.x-e.x, fp.y-e.y) < (e.size||20)+fp.size) {
        // 初回ヒット: 5*lv追加ダメージ
        const firstHit = !e.fireHitSet;
        if (!e.fireHitSet) e.fireHitSet = new Set();
        const isFirst = !e.fireHitSet.has('fired');
        const extraDmg = isFirst ? 5*fp.lv : 0;
        if (isFirst) e.fireHitSet.add('fired');
        const totalDmg = fp.dmg + extraDmg;
        if (e.hit) { e.hit(totalDmg); spawnDamagePopup(e.x, e.y-10, totalDmg, false); }
        else { damageEnemy(e, totalDmg); }
        // 脆弱ダメージ追加
        const fragExtra = applyFragileDamage(e, totalDmg);
        if (fragExtra>0) { if(e.hit)e.hit(fragExtra); else damageEnemy(e,fragExtra); }
        fp.hitSet.add(e);
        setTimeout(()=>fp.hitSet.delete(e), 100);
      }
    }
  }
  fireParticles = fireParticles.filter(fp => fp.alive);
}

function drawFireParticles() {
  for (const fp of fireParticles) {
    const alpha = (fp.life / fp.maxLife) * 0.85;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fp.color; ctx.shadowColor = fp.color; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(fp.x, fp.y, fp.size*(fp.life/fp.maxLife)+2, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

function resetFireParticles() { fireParticles = []; }

function firePlayerChakram(lv) {
  const target = findNearestEnemy();
  if (!target) return;
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  const size = 8 + lv * 4;
  const dmg = player.damage + lv * 5;
  playerChakrams.push({
    x: player.x,
    y: player.y,
    vx: Math.cos(angle) * 10,
    vy: Math.sin(angle) * 10,
    size,
    dmg,
    reflectRemaining: lv === 4 ? 2 : 1,
    alive: true,
    hitSet: new Set(),
    trail: []
  });
}

function firePlayerBubble(lv) {
  const target = findNearestEnemy();
  if (!target) return;
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  const speed = 8;
  const dmg = player.damage + 10;
  playerBubbles.push({
    x: player.x,
    y: player.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 80,
    minRadius: 20,
    timer: 0,
    alive: true,
    hitSet: new Set(),
    dmg,
    reflectRemaining: lv,
    trail: []
  });
}

function updateEnemyBullets() {
  for (const b of enemyBullets) {
    if (!b.alive) continue;
    if (playerBubbles.length > 0) {
      for (const sb of playerBubbles) {
        if (!sb.alive || !sb.blockBullets) continue;
        if (Math.hypot(b.x - sb.x, b.y - sb.y) < sb.radius + 4) { b.alive = false; break; }
      }
      if (!b.alive) continue;
    }
    if (b.splitTimer !== undefined) {
      b.splitTimer--;
      if (b.splitTimer <= 0 && !b.hasSplit) {
        b.hasSplit = true;
        for (let i = 0; i < 6; i++) enemyBullets.push({ x: b.x, y: b.y, vx: Math.cos(i*Math.PI/3)*4, vy: Math.sin(i*Math.PI/3)*4, alive: true });
        b.alive = false; continue;
      }
    }
    if (b.reflectable && !b.reflected) {
      if (b.x <= 0 || b.x >= W) { b.vx *= -1; b.reflected = true; }
      if (b.y <= 0 || b.y >= H) { b.vy *= -1; b.reflected = true; }
    }
    if (b.reflectableWalls) {
      if ((b.x <= 0 || b.x >= W) && b.reflectCount < 2) { b.vx *= -1; b.reflectCount++; }
      if ((b.y <= 0 || b.y >= H) && b.reflectCount < 2) { b.vy *= -1; b.reflectCount++; }
    }
    b.x += b.vx; b.y += b.vy;
    
    // Handle rampage bombs: expand to 16 directions after timer
    if (b.type === 'rampageBomb') {
      b.timer--;
      if (b.timer <= 0 && b.expandTimer === 0) {
        b.expandTimer = 1;
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          enemyBullets.push({x: b.x, y: b.y, vx: Math.cos(angle)*5, vy: Math.sin(angle)*5, alive: true, type: 'normalBullet', size: 6, color: '#ff6699'});
        }
        b.alive = false; continue;
      }
    }
    
    // Handle reflectable chakrams from enemies
    if (b.type === 'enemyChakram') {
      if (b.trail === undefined) b.trail = [];
      b.trail.unshift({x: b.x, y: b.y, alpha: 0.4});
      if (b.trail.length > 12) b.trail.pop();
      if (b.reflectCount < b.maxReflect) {
        if (b.x <= 0 || b.x >= W) { b.vx *= -1; b.reflectCount++; }
        if (b.y <= 0 || b.y >= H) { b.vy *= -1; b.reflectCount++; }
      }
    }
    
    if (b.x < -20 || b.x > W+20 || b.y < -20 || b.y > H+20) b.alive = false;
    if (player.alive && !player.invincible && Math.hypot(player.x - b.x, player.y - b.y) < 16) { hitPlayer(b.dmg || 15); b.alive = false; }
  }
  enemyBullets = enemyBullets.filter(b => b.alive);

  for(const l of enemyLasers) {
    if(l.warningTimer > 0) l.warningTimer--;
    else if(l.activeTimer > 0) {
      l.activeTimer--;
      if(player.alive && !player.invincible && player.damageTimer === 0) {
        let hit = false;
        if(l.axis === 'custom') {
          const dx = Math.cos(l.angle), dy = Math.sin(l.angle);
          const px = player.x - l.x, py = player.y - l.y;
          hit = Math.abs(px*dy - py*dx) < 14;
        } else hit = l.axis === 'h' ? Math.abs(player.y - l.pos) < 14 : Math.abs(player.x - l.pos) < 14;
        if(hit) hitPlayerDamage(2, 20);
      }
    } else l.done = true;
  }
  enemyLasers = enemyLasers.filter(l => !l.done);
  
  // Plasmas update (2.4s = 144 frames)
  for (const p of plasmas) {
    if (p.timer < 144) {
      p.timer++;
      if (p.timer === 144) {
        p.lightningTimer = 15;
        if (!p.isPlayer) {
          if (player.alive && !player.invincible && Math.hypot(player.x - p.x, player.y - p.y) <= p.maxR) hitPlayerDamage(2, 30);
        } else {
          const allE = [...enemies];
          if(boss && boss.alive) allE.push(boss);
          if(bossManager && bossManager.alive) {
            if(bossManager.boss && bossManager.boss.alive) allE.push(bossManager.boss);
            for(const e of (bossManager.enemies||[])) if(e.alive) allE.push(e);
            for(const m of (bossManager.minions||[])) if(m.alive) allE.push(m);
          }
          for (const e of allE) {
            if (Math.hypot(e.x - p.x, e.y - p.y) <= p.maxR) {
              if(e.hit) { e.hit(p.dmg); spawnDamagePopup(e.x, e.y-10, p.dmg, false); } else damageEnemy(e, p.dmg);
            }
          }
        }
      }
    } else if (p.lightningTimer > 0) {
      p.lightningTimer--;
      if (p.lightningTimer <= 0) {
        p.done = true;
      }
    }
  }
  plasmas = plasmas.filter(p => !p.done);
}

function drawEnemyBullets() {
  for (const b of enemyBullets) {
    ctx.save();
    if (b.type === 'enemyChakram' || b.type === 'bossChakram') {
      for (const t of b.trail || []) {
        ctx.globalAlpha = t.alpha;
        ctx.fillStyle = '#ff6699';
        ctx.beginPath();
        ctx.arc(t.x, t.y, b.size, 0, Math.PI*2);
        ctx.arc(t.x, t.y, b.size * 0.5, 0, Math.PI*2, true);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ff6699'; ctx.shadowColor = '#ff6699'; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI*2);
      ctx.arc(b.x, b.y, b.size * 0.5, 0, Math.PI*2, true);
      ctx.fill();
    } else if (b.type === 'rampageBomb') {
      ctx.fillStyle = '#ff6699'; ctx.shadowColor = '#ff6699'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#ffaaaa'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.size*1.5, 0, Math.PI*2); ctx.stroke();
    } else {
      ctx.fillStyle = b.color || '#f22'; ctx.shadowColor = b.glow || '#f00'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  for (const l of enemyLasers) {
    ctx.save();
    if(l.axis==='custom') {
      const len = 1500, x2 = l.x + Math.cos(l.angle)*len, y2 = l.y + Math.sin(l.angle)*len;
      const x1 = l.x - Math.cos(l.angle)*len, y1 = l.y - Math.sin(l.angle)*len;
      if(l.warningTimer > 0) {
        const wp = 1 - l.warningTimer / (l.warningTimer + 1);
        ctx.globalAlpha = 0.15 + 0.5*(l.warningTimer <= 20 ? 1 : 0.4);
        ctx.strokeStyle='#ff9999'; ctx.lineWidth=1; ctx.shadowColor='#ff4444'; ctx.shadowBlur=6; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      }
      else if(l.activeTimer > 0) { ctx.globalAlpha=0.9; ctx.shadowColor='#f55'; ctx.shadowBlur=20; ctx.strokeStyle='#ff8888'; ctx.lineWidth=8; ctx.setLineDash([]); }
      if(l.activeTimer > 0) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    } else {
      if(l.warningTimer > 0) {
        ctx.globalAlpha = 0.15 + (l.warningTimer <= 20 ? 0.5 : 0.25);
        ctx.strokeStyle='#ff9999'; ctx.lineWidth=1; ctx.shadowColor='#ff4444'; ctx.shadowBlur=6; ctx.setLineDash([]);
        ctx.beginPath(); l.axis==='h'?ctx.moveTo(0,l.pos):ctx.moveTo(l.pos,0); l.axis==='h'?ctx.lineTo(W,l.pos):ctx.lineTo(l.pos,H); ctx.stroke();
      }
      else if(l.activeTimer > 0) { ctx.globalAlpha=0.9; ctx.shadowColor='#f55'; ctx.shadowBlur=20; ctx.strokeStyle='#ff8888'; ctx.lineWidth=8; ctx.setLineDash([]); ctx.beginPath(); l.axis==='h'?ctx.moveTo(0,l.pos):ctx.moveTo(l.pos,0); l.axis==='h'?ctx.lineTo(W,l.pos):ctx.lineTo(l.pos,H); ctx.stroke(); }
    }
    ctx.restore();
  }
  for (const p of plasmas) {
    ctx.save();
    // ringColor があれば優先（ボス14オレンジプラズマ等）
    const ringC = p.ringColor || (p.isPlayer ? '#ff0' : '#f0f');
    if (p.timer < 144) {
      ctx.strokeStyle = ringC; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.maxR, 0, Math.PI*2); ctx.stroke();
      if (p.ringColor) {
        ctx.globalAlpha = 0.15; ctx.fillStyle = p.ringColor;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.maxR * (p.timer/144), 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = p.isPlayer ? 'rgba(255,255,0,0.2)' : 'rgba(255,0,255,0.2)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.maxR * (p.timer/144), 0, Math.PI*2); ctx.fill();
      }
    } else if (p.lightningTimer > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.maxR, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = p.isPlayer ? '#ff0' : '#eef'; ctx.lineWidth = 3; ctx.shadowColor = p.isPlayer ? '#ff0' : '#0ff'; ctx.shadowBlur = 10;
      for(let i=0; i<5; i++) {
        ctx.beginPath(); ctx.moveTo(p.x + (Math.random()-0.5)*p.maxR, p.y + (Math.random()-0.5)*p.maxR);
        for(let j=0; j<3; j++) ctx.lineTo(p.x + (Math.random()-0.5)*p.maxR*1.5, p.y + (Math.random()-0.5)*p.maxR*1.5); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function fireEnemy(ex, ey, angle, speed, opts={}) {
  const vx = Math.cos(angle)*speed, vy = Math.sin(angle)*speed;
  enemyBullets.push({ x: ex, y: ey, vx, vy, alive: true, ...opts });
}

// ==================== ENEMIES ====================
let enemies = [];
let markedEnemies = [];
let resonanceTimer = 0;
let resonanceEffectTimer = 0;
let resonanceMarkedEnemies = [];

function createTriEnemy(x) {
  return { type: 'tri', x, y: -20, vx: 0, vy: 0.8, hp: loopHP(18), maxHp: loopHP(18), alive: true, fireTimer: 0, size: 16, color: '#ffebb5', marked: false, markedDamageCount: 0,
    update() { this.y += this.vy; this.fireTimer++; if (this.fireTimer >= 100) { this.fireTimer = 0; for(let i=-1;i<=1;i++) fireEnemy(this.x,this.y,Math.PI/2+i*0.35,3); } if (this.y > H+30) fadeOut(this); },
    draw() { ctx.save(); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(this.x, this.y+this.size); ctx.lineTo(this.x-this.size, this.y-this.size*0.8); ctx.lineTo(this.x+this.size, this.y-this.size*0.8); ctx.closePath(); ctx.fill(); ctx.restore(); drawEnemyHp(this); }
  };
}

function createDiamondEnemy(x) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  return { type: 'diamond', x, y: -20, vx: dir*1.8, vy: 1.3, hp: loopHP(22), maxHp: loopHP(22), alive: true, fireTimer: 0, size: 19, reflectCount: 0, color: '#e86030', marked: false, markedDamageCount: 0,
    update() { this.x+=this.vx; this.y+=this.vy; if ((this.x<=0||this.x>=W)&&this.reflectCount<2) { this.vx*=-1; this.reflectCount++; } this.x=Math.max(0,Math.min(W,this.x)); this.fireTimer++;
      if (this.fireTimer>=80) { this.fireTimer=0; for(let a of [0,Math.PI/2,Math.PI,Math.PI*3/2]) { fireEnemy(this.x,this.y,a,3.5); fireEnemy(this.x,this.y,a,5.0); } } if (this.y>H+30||(this.reflectCount>=2&&(this.x<0||this.x>W))) fadeOut(this); },
    draw() { ctx.save(); ctx.fillStyle=this.color; ctx.shadowColor=this.color; ctx.shadowBlur=8; const s=this.size; ctx.beginPath(); ctx.moveTo(this.x, this.y-s); ctx.lineTo(this.x+s*0.7, this.y); ctx.lineTo(this.x, this.y+s); ctx.lineTo(this.x-s*0.7, this.y); ctx.closePath(); ctx.fill(); ctx.restore(); drawEnemyHp(this); }
  };
}

function createSquareEnemy(x) {
  return { type: 'square', x, y: -20, vx: 0, vy: 0.9, hp: loopHP(16), maxHp: loopHP(16), alive: true, fireTimer: 0, size: 14, color: '#99ff33', marked: false, markedDamageCount: 0,
    update() { this.y+=this.vy; this.fireTimer++; if(this.fireTimer>=90) { this.fireTimer=0; fireEnemy(this.x,this.y,Math.atan2(player.y-this.y,player.x-this.x),3.5); } if(this.y>H+30) fadeOut(this); },
    draw() { ctx.save(); ctx.fillStyle=this.color; ctx.shadowColor=this.color; ctx.shadowBlur=8; ctx.fillRect(this.x-this.size,this.y-this.size,this.size*2,this.size*2); ctx.restore(); drawEnemyHp(this); }
  };
}

function createHexEnemy(x) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  return { type: 'hex', x, y: -20, vx: dir*1.5, vy: 1.1, hp: loopHP(60), maxHp: loopHP(60), alive: true, fireTimer: 0, size: 20, color: '#cc99ff', marked: false, markedDamageCount: 0,
    update() { this.x+=this.vx; this.y+=this.vy; if(this.x<=0||this.x>=W)this.vx*=-1; this.x=Math.max(0,Math.min(W,this.x)); this.fireTimer++;
      if(this.fireTimer>=160) { this.fireTimer=0; for(let i=0;i<6;i++) enemyBullets.push({x:this.x,y:this.y,vx:Math.cos(i*Math.PI/3)*2,vy:Math.sin(i*Math.PI/3)*2,alive:true,splitTimer:90,hasSplit:false,color:'#ffff99',glow:'#ff0'}); } if(this.y>H+30) fadeOut(this); },
    draw() { ctx.save(); ctx.fillStyle=this.color; ctx.shadowColor=this.color; ctx.shadowBlur=8; const s=this.size; ctx.beginPath(); for(let i=0;i<6;i++){ const a=i*Math.PI/3-Math.PI/6; i===0?ctx.moveTo(this.x+Math.cos(a)*s,this.y+Math.sin(a)*s):ctx.lineTo(this.x+Math.cos(a)*s,this.y+Math.sin(a)*s); } ctx.closePath(); ctx.fill(); ctx.restore(); drawEnemyHp(this); }
  };
}

function createSideTriEnemy() {
  const fromRight = Math.random() < 0.5; const x = fromRight ? W + 20 : -20;
  return { type: 'sideTri', x, y: 60+Math.random()*(H-200), vx: fromRight?-2:2, vy: 0, hp: loopHP(24), maxHp: loopHP(24), alive: true, fireTimer: 0, size: 16, fromRight, color: '#66ccff', marked: false, markedDamageCount: 0,
    update() { this.x+=this.vx; this.fireTimer++; if(this.fireTimer>=50){ this.fireTimer=0; fireEnemy(this.x,this.y,-Math.PI/2,3.5); fireEnemy(this.x,this.y,Math.PI/2,3.5); } if((this.vx<0&&this.x<-30)||(this.vx>0&&this.x>W+30)) fadeOut(this); },
    draw() { ctx.save(); ctx.fillStyle=this.color; ctx.shadowColor=this.color; ctx.shadowBlur=8; const dir=this.fromRight?-1:1,s=this.size; ctx.beginPath(); ctx.moveTo(this.x+dir*s,this.y); ctx.lineTo(this.x-dir*s,this.y-s); ctx.lineTo(this.x-dir*s,this.y+s); ctx.closePath(); ctx.fill(); ctx.restore(); drawEnemyHp(this); }
  };
}

function createRectEnemy(x) {
  return { type: 'rect', x, y: -20, vx: 0, vy: 1.5, hp: loopHP(16), maxHp: loopHP(16), alive: true, fireTimer: 0, size: 15, color: '#ffb366', marked: false, markedDamageCount: 0,
    update() { this.y+=this.vy; this.fireTimer++; if(this.fireTimer>=100){ this.fireTimer=0; fireEnemy(this.x,this.y,0,3.5); fireEnemy(this.x,this.y,Math.PI,3.5); } if(this.y>H+30) fadeOut(this); },
    draw() { ctx.save(); ctx.fillStyle=this.color; ctx.shadowColor=this.color; ctx.shadowBlur=8; ctx.fillRect(this.x-10,this.y-15,20,30); ctx.restore(); drawEnemyHp(this); }
  };
}

function createPlusHealEnemy() {
  const x = 60 + Math.random() * (W - 120);
  return {
    type: 'plusheal', x, y: -20, hp: 9999, maxHp: 9999, alive: true, size: 16,
    speed: 1.0 + Math.random() * 0.5,
    update() {
      this.y += this.speed;
      if (this.y > H + 30) this.alive = false;
      // 自機と接触で回復
      if (player.alive && Math.hypot(player.x - this.x, player.y - this.y) < this.size + 14) {
        // 回復量計算（イベントダメージ2倍中は2倍、呪字「治」で+5）
        let healAmt = 3;
        if (eventDamageMult >= 2 || curseUsedFlags['dmg2x_event']) healAmt *= 2;
        if (curseSlots.includes('治')) healAmt += (eventDamageMult >= 2 ? 7 : 2);
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        spawnDamagePopup(this.x, this.y - 20, healAmt, false);
        // 消滅エフェクト
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI*2/10)*i;
          karmaParticles.push({ x: this.x, y: this.y, vx: Math.cos(a)*3, vy: Math.sin(a)*3, life: 20, maxLife: 20, color: '#44ff88', type: 'thorn' });
        }
        this.alive = false;
      }
    },
    hit(d) { /* 倒せない */ },
    draw() {
      ctx.save();
      const glow = 8 + 4 * Math.sin(frameCount * 0.12);
      ctx.fillStyle = '#44ff88'; ctx.shadowColor = '#00ff66'; ctx.shadowBlur = glow;
      // プラス形状
      const s = this.size, t = s * 0.38;
      ctx.fillRect(this.x - t, this.y - s, t*2, s*2);   // 縦
      ctx.fillRect(this.x - s, this.y - t, s*2, t*2);   // 横
      ctx.restore();
    }
  };
}

function createCircleEnemy(x) {
  return { type: 'circle', x, y: -20, hp: loopHP(50), maxHp: loopHP(50), alive: true, size: 15, color: '#ffffff', state: 'approach', timer: 0, dashVx: 0, dashVy: 0, dashTrail: [], charging: false, chargeTimer: 0, marked: false, markedDamageCount: 0,
    update() {
      if(this.state==='approach') { this.y+=1.2; this.timer++; if(this.timer>=100){ this.state='dash_loop'; this.chargeTimer=0; this.charging=false; } }
      else if(this.state==='dash_loop') {
        if(!this.charging){ this.chargeTimer++; if(this.chargeTimer>=80){ this.charging=true; this.chargeTimer=0; const dx=player.x-this.x,dy=player.y-this.y,d=Math.hypot(dx,dy)||1; this.dashVx=dx/d*8; this.dashVy=dy/d*8; } }
        else{ this.dashTrail.push({x:this.x,y:this.y,life:10}); this.x+=this.dashVx; this.y+=this.dashVy; if(this.x<30||this.x>W-30||this.y<30||this.y>H-30){ this.x=Math.max(30,Math.min(W-30,this.x)); this.y=Math.max(30,Math.min(H-30,this.y)); this.charging=false; this.dashVx=0; this.dashVy=0; } this.chargeTimer++; if(this.chargeTimer>30){ this.charging=false; this.chargeTimer=0; } }
      }
      for(const t of this.dashTrail) t.life--; this.dashTrail=this.dashTrail.filter(t=>t.life>0);
    },
    draw() { for(const t of this.dashTrail){ ctx.save(); ctx.globalAlpha=t.life/10*0.5; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(t.x,t.y,this.size,0,Math.PI*2); ctx.fill(); ctx.restore(); } ctx.save(); ctx.fillStyle=this.color; ctx.shadowColor=this.color; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill(); ctx.restore(); drawEnemyHp(this); }
  };
}

function createStarEnemy() {
  const x = Math.random()<0.5 ? (Math.random()<0.5 ? -20 : W+20) : Math.random()*W;
  const y = (x < 0 || x > W) ? Math.random()*(H/2) : -20;
  return { type: 'star', x, y, tx: W/2, ty: H/3, hp: loopHP(90), maxHp: loopHP(90), alive: true, size: 20, color: '#ff0', stateTimer: 0, state: 'move', laserTimer: 0, marked: false, markedDamageCount: 0,
    update() {
      this.stateTimer++;
      if(this.state==='move') { this.x+=(this.tx-this.x)*0.02; this.y+=(this.ty-this.y)*0.02; if(this.stateTimer>60){ this.state=Math.random()<0.5?'stop':'dash'; this.stateTimer=0; } }
      else if(this.state==='stop') { if(this.stateTimer>30){ this.tx=30+Math.random()*(W-60); this.ty=30+Math.random()*(H/2); this.state='move'; this.stateTimer=0; } }
      else if(this.state==='dash') { this.x+=(this.tx-this.x)*0.1; this.y+=(this.ty-this.y)*0.1; if(this.stateTimer>20){ this.tx=30+Math.random()*(W-60); this.ty=30+Math.random()*(H/2); this.state='move'; this.stateTimer=0; } }
      this.laserTimer++; if(this.laserTimer>=80){ this.laserTimer=0; const axis=Math.random()<0.5?'h':'v'; enemyLasers.push({axis,pos:axis==='h'?player.y:player.x,warningTimer:40,activeTimer:15}); }
    },
    draw() { ctx.save(); ctx.fillStyle=this.color; ctx.shadowColor=this.color; ctx.shadowBlur=10; ctx.translate(this.x,this.y); ctx.rotate(frameCount*0.05); ctx.beginPath(); for(let i=0;i<5;i++){ const a=i*Math.PI*2/5-Math.PI/2,a2=a+Math.PI/5; ctx.lineTo(Math.cos(a)*this.size,Math.sin(a)*this.size); ctx.lineTo(Math.cos(a2)*this.size*0.4,Math.sin(a2)*this.size*0.4); } ctx.closePath(); ctx.fill(); ctx.restore(); drawEnemyHp(this); }
  };
}

function createPlusEnemy() {
  return { type: 'plus', x: 50+Math.random()*(W-100), y: 50+Math.random()*(H/2), hp: loopHP(30), maxHp: loopHP(30), alive: true, fireTimer: 0, size: 18, color: '#ff99cc', teleportTimer: 0, endured: false, crossMode: true, marked: false, markedDamageCount: 0,
    update() { this.teleportTimer++; if(this.teleportTimer>=180){ this.teleportTimer=0; this.x=50+Math.random()*(W-100); this.y=50+Math.random()*(H/2); } this.fireTimer++; if(this.fireTimer>=60){ this.fireTimer=0; if(this.crossMode){ for(let i=0;i<4;i++) fireEnemy(this.x,this.y,i*Math.PI/2,3); } else { for(let i=0;i<4;i++) fireEnemy(this.x,this.y,Math.PI/4+i*Math.PI/2,3); } this.crossMode=!this.crossMode; } },
    draw() { ctx.save(); ctx.fillStyle=this.color; ctx.shadowColor=this.color; ctx.shadowBlur=8; const s=this.size,w=s*0.4; ctx.fillRect(this.x-s,this.y-w,s*2,w*2); ctx.fillRect(this.x-w,this.y-s,w*2,s*2); ctx.restore(); drawEnemyHp(this); }
  };
}

function createPentagonEnemy() {
  return { type: 'pentagon', x: 50+Math.random()*(W-100), y: H+30, hp: loopHP(100), maxHp: loopHP(100), alive: true, color: '#cc3399', size: 18, state: 'enter', stage: 1, actionTimer: 0, marked: false, markedDamageCount: 0,
    update() {
      if(this.state==='enter') { this.y-=2; if(this.y<=H-100){ this.state='attack'; this.actionTimer=0; } }
      else if(this.state==='attack') {
        if(this.actionTimer===0) { const r = this.stage===1?50:(this.stage===2?100:150); plasmas.push({x:player.x,y:player.y,maxR:r,timer:0,isPlayer:false,lightningTimer:0}); }
        this.actionTimer++; if(this.actionTimer>=200) { this.stage=Math.min(3,this.stage+1); this.actionTimer=0; }
      }
    },
    draw() { ctx.save(); ctx.fillStyle=this.color; ctx.shadowColor=this.color; ctx.shadowBlur=8; ctx.beginPath(); for(let i=0;i<5;i++){ const a=i*Math.PI*2/5-Math.PI/2; if(i===0)ctx.moveTo(this.x+Math.cos(a)*this.size,this.y+Math.sin(a)*this.size); else ctx.lineTo(this.x+Math.cos(a)*this.size,this.y+Math.sin(a)*this.size); } ctx.closePath(); ctx.fill(); ctx.restore(); drawEnemyHp(this); }
  };
}

function createOctagonEnemy() {
  const fromRight = Math.random() < 0.5;
  return { type: 'octagon', x: fromRight ? W+30 : -30, y: 50+Math.random()*(H-100), hp: loopHP(120), maxHp: loopHP(120), alive: true, color: '#3366ff', size: 22, state: 'enter', timer: 0, stickLen: 0, stickAngle: Math.PI/2, targetX: 100+Math.random()*(W-200), targetY: 100+Math.random()*(H-200), rotDir: 1, pDamTimer: 0, trailParticles: [], marked: false, markedDamageCount: 0,
    update() {
      if (this.pDamTimer > 0) this.pDamTimer--;
      if(this.state==='enter' || this.state==='move') { const dx=this.targetX-this.x,dy=this.targetY-this.y,d=Math.hypot(dx,dy); if(d<5){ this.state='extend'; this.timer=0; }else{ this.trailParticles.push({x:this.x,y:this.y,life:10}); this.x+=(dx/d)*5.5; this.y+=(dy/d)*5.5; } }
      else if(this.state==='extend') { this.stickLen+=2; if(this.stickLen>=H/4){ this.state='rotate'; this.timer=0; } }
      else if(this.state==='rotate') { this.stickAngle+=(Math.PI/180)*this.rotDir; this.timer++; if(this.timer>=360){ this.state='move'; this.stickLen=0; this.targetX=100+Math.random()*(W-200); this.targetY=100+Math.random()*(H-200); this.rotDir*=-1; } }
      for(const p of this.trailParticles) p.life--; this.trailParticles=this.trailParticles.filter(p=>p.life>0);
      if(this.stickLen>0) {
        const x1=this.x+Math.cos(this.stickAngle)*this.stickLen, y1=this.y+Math.sin(this.stickAngle)*this.stickLen;
        const x2=this.x-Math.cos(this.stickAngle)*this.stickLen, y2=this.y-Math.sin(this.stickAngle)*this.stickLen;
        if(this.pDamTimer===0 && distToSegment(player.x,player.y,x1,y1,x2,y2)<10+16) { hitPlayer(30); this.pDamTimer=30; }
        for(const b of playerBullets) { if(!b.alive) continue; if(distToSegment(b.x,b.y,x1,y1,x2,y2)<10) b.alive=false; }
      }
    },
    draw() {
      for(const p of this.trailParticles) { ctx.save(); ctx.globalAlpha=p.life/10*0.6; ctx.fillStyle='#3366ff'; ctx.beginPath(); ctx.arc(p.x,p.y,this.size*0.8,0,Math.PI*2); ctx.fill(); ctx.restore(); }
      if(this.stickLen>0) { const x1=this.x+Math.cos(this.stickAngle)*this.stickLen, y1=this.y+Math.sin(this.stickAngle)*this.stickLen; const x2=this.x-Math.cos(this.stickAngle)*this.stickLen, y2=this.y-Math.sin(this.stickAngle)*this.stickLen; ctx.save(); ctx.strokeStyle='#f00'; ctx.lineWidth=6; ctx.shadowColor='#f00'; ctx.shadowBlur=10; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke(); ctx.restore(); }
      ctx.save(); ctx.fillStyle=this.color; ctx.shadowColor=this.color; ctx.shadowBlur=8; ctx.beginPath(); for(let i=0;i<8;i++){ const a=i*Math.PI/4; if(i===0)ctx.moveTo(this.x+Math.cos(a)*this.size,this.y+Math.sin(a)*this.size); else ctx.lineTo(this.x+Math.cos(a)*this.size,this.y+Math.sin(a)*this.size); } ctx.closePath(); ctx.fill(); ctx.restore(); drawEnemyHp(this);
    }
  };
}

function createArrowEnemy() {
  const side = Math.random() < 0.5;
  const isTop = Math.random() < 0.5;
  let x, y;
  if (side) {
    x = Math.random() < 0.5 ? 30 : W - 30;
    y = 50 + Math.random() * (H - 100);
  } else {
    x = 50 + Math.random() * (W - 100);
    y = isTop ? 30 : H - 30;
  }
  return { type: 'arrow', x, y, hp: loopHP(36), maxHp: loopHP(36), alive: true, size: 24, color: '#ff3333', angle: 0, fireTimer: 0, marked: false, markedDamageCount: 0,
    update() {
      const dx = player.x - this.x, dy = player.y - this.y;
      this.angle = Math.atan2(dy, dx);
      this.fireTimer++;
      if (this.fireTimer >= 100) {
        this.fireTimer = 0;
        const d = Math.hypot(dx, dy) || 1;
        enemyBullets.push({ x: this.x, y: this.y, vx: (dx / d) * 6, vy: (dy / d) * 6, alive: true, type: 'enemyChakram', size: 12, color: '#ff6699', reflectCount: 0, maxReflect: 2, trail: [] });
      }
    },
    draw() {
      ctx.save();
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      // Draw isosceles triangle with concave base
      ctx.beginPath();
      ctx.moveTo(this.size, 0); // tip
      ctx.lineTo(-this.size * 0.6, -this.size * 0.6);
      ctx.lineTo(-this.size * 0.2, 0); // concave point
      ctx.lineTo(-this.size * 0.6, this.size * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      drawEnemyHp(this);
    }
  };
}



function fadeOut(e) { e.alive = false; }
function loopHP(baseHp) { const base = (loopCount <= 1) ? baseHp : (loopCount === 2) ? baseHp*2 : (loopCount === 3) ? baseHp*4 : (loopCount === 4) ? baseHp*6 : baseHp*(loopCount*2); return Math.round(base * simEnemyHpMult); }
function drawEnemyHp(e) { if(e.hp===e.maxHp)return; const bw=e.size*2+4,bx=e.x-bw/2,by=e.y-e.size-12; ctx.fillStyle='#333'; ctx.fillRect(bx,by,bw,5); ctx.fillStyle='#f44'; ctx.fillRect(bx,by,bw*(e.hp/e.maxHp),5); }

function spawnSpecificEnemy(t) {
  const x = 40 + Math.random()*(W-80);
  let e;
  switch(t) { case 'pentagon': e = createPentagonEnemy(); break; case 'octagon': e = createOctagonEnemy(); break; case 'hex': e = createHexEnemy(x); break; case 'star': e = createStarEnemy(); break; }
  if (e) enemies.push(e);
  return e;
}

function createDropletEnemy() {
  return { 
    type: 'droplet', x: 50+Math.random()*(W-100), y: -30, vx: 0, vy: 0, 
    hp: 9999, maxHp: 9999, alive: true, size: 24, color: '#e60073', 
    marked: false, markedDamageCount: 0,
    state: 'approach', stateTimer: 0, chargeTimer: 0, 
    dashVx: 0, dashVy: 0, dashTrail: [], charging: false, pDamTimer: 0,
    
    update() {
      if(this.state==='approach') { 
        this.y += 1.2; 
        this.stateTimer++; 
        if(this.stateTimer >= 100) { 
          this.state = 'dash_loop'; 
          this.chargeTimer = 0; 
          this.charging = false; 
        } 
      }
      else if(this.state==='dash_loop') {
        if(!this.charging) { 
          // 突進準備（停止時間）
          this.chargeTimer++; 
          // 準備時間を80から100に少し増やして、次の突進へのタメを作ります
          if(this.chargeTimer >= 100) { 
            this.charging = true; 
            this.chargeTimer = 0; 
            const dx = player.x - this.x, dy = player.y - this.y;
            const d = Math.hypot(dx, dy) || 1; 
            // 突進速度。8から10に上げてより「暴走」感を出しつつ
            this.dashVx = dx / d * 10; 
            this.dashVy = dy / d * 10; 
          } 
        }
        else {
          // 突進中
          this.dashTrail.push({x: this.x, y: this.y, life: 10});
          this.x += this.dashVx; 
          this.y += this.dashVy;

          // 壁判定
          let hitWall = false;
          if (this.x < 20 || this.x > W - 20) {
            this.dashVx *= -1; // X方向に反射
            this.x += this.dashVx * 0.3; // 反射して0.3倍分戻る
            hitWall = true;
          }
          if (this.y < 20 || this.y > H - 20) {
            this.dashVy *= -1; // Y方向に反射
            this.y += this.dashVy * 0.3; // 反射して0.3倍分戻る
            hitWall = true;
          }

          // 壁に当たったら突進終了、待機状態へ
          if (hitWall) {
            this.charging = false;
            this.chargeTimer = 0;
            this.dashVx = 0;
            this.dashVy = 0;
          }
        }
      }
      for(const t of this.dashTrail) t.life--; 
      this.dashTrail = this.dashTrail.filter(t => t.life > 0);
    },

    draw() { 
      for(const t of this.dashTrail){ 
        ctx.save(); ctx.globalAlpha = t.life/10*0.5; ctx.fillStyle = this.color; 
        ctx.beginPath(); ctx.arc(t.x, t.y, this.size, 0, Math.PI*2); ctx.fill(); ctx.restore(); 
      }
      ctx.save(); ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 8; 
      ctx.translate(this.x, this.y); 
      
      ctx.beginPath(); 
      const s = this.size * 0.8;
      ctx.moveTo(0, -s * 0.3); 
      ctx.bezierCurveTo(s * 1.2, -s * 1.5, s * 2.0, s * 0.5, 0, s * 1.5); 
      ctx.bezierCurveTo(-s * 2.0, s * 0.5, -s * 1.2, -s * 1.5, 0, -s * 0.3); 
      ctx.closePath(); 
      ctx.fill(); ctx.restore(); drawEnemyHp(this); 
    }
  };
}

function spawnEnemy() {
  const plusHealCount = curseSlots.includes('治') ? 3 : 1; // 治呪字で出現率UP
  const table = [ ...Array(20).fill('square'), ...Array(20).fill('tri'), ...Array(15).fill('rect'), ...Array(12).fill('sideTri'), ...Array(10).fill('diamond'), ...Array(5).fill('plus'), ...Array(5).fill('circle'), ...Array(5).fill('arrow'), ...Array(3).fill('hex'), ...Array(3).fill('pentagon'), ...Array(3).fill('octagon'), ...Array(3).fill('star'), ...Array(plusHealCount).fill('plusheal') ];
  
  let t;
  if (currentEvent === 'swarm' && eventEnemyType) {
    // 大量発生イベント中は選ばれた敵のみ出現
    t = eventEnemyType;
  } else {
    t = table[Math.floor(Math.random()*table.length)];
  }
  
  const x = 40 + Math.random()*(W-80); let e;
  switch(t) { case 'tri': e=createTriEnemy(x); break; case 'diamond': e=createDiamondEnemy(x); break; case 'square': e=createSquareEnemy(x); break; case 'hex': e=createHexEnemy(x); break; case 'sideTri': e=createSideTriEnemy(); break; case 'rect': e=createRectEnemy(x); break; case 'circle': e=createCircleEnemy(x); break; case 'star': e=createStarEnemy(); break; case 'plus': e=createPlusEnemy(); break; case 'pentagon': e=createPentagonEnemy(); break; case 'octagon': e=createOctagonEnemy(); break; case 'arrow': e=createArrowEnemy(); break; case 'plusheal': e=createPlusHealEnemy(); break; }
  if (e) enemies.push(e);
}

function updateEnemies() {
  for (const e of enemies) {
    if (!e.alive) continue; e.update();
    
    // 突進中の敵のみ接触ダメージ（通常の体当たりダメージは無し）
    if (e.charging && player.alive && !player.invincible && player.damageTimer === 0) {
      const hitRadius = e.size ? Math.max(20, e.size) : 20;
      if (Math.hypot(player.x - e.x, player.y - e.y) < hitRadius) {
        if (e.type === 'droplet') hitPlayerDamage(2, 30);
        else hitPlayer(30);
      }
    }
    
    for (const b of playerBullets) {
      if (!b.alive || b.isPoisonAura) continue; // isPoisonAura は毒付与のみ・ダメージなし
      if (Math.hypot(e.x - b.x, e.y - b.y) < (e.size||20) + 4) {
        if (b.infinitePierce) {
          if (!b.hitSet.has(e)) {
            damageEnemy(e, b.dmg); b.hitSet.add(e);
            // 染: スナイパー弾命中時に毒付与（マーク共鳴以外）
            if (b.isFromSniper && curseSlots.includes('染')) {
              const snLv = player.items.filter(x=>x==='sniper').length;
              applyPoison(e, snLv||1, 180);
            }
          }
        } 
        else { damageEnemy(e, b.dmg); if (!b.pierce || b.pierced) b.alive = false; else b.pierced = true; }
      }
    }
  }
  
  enemies = enemies.filter(e => e.alive);
  processMarkedEntityResonance();
}

function drawEnemies() { 
  for(const e of enemies) if(e.alive) e.draw();
  for(const e of enemies) if(e.alive && e.marked) drawMarkOnEnemy(e);
  if (resonanceEffectTimer > 0) drawResonance();
}
