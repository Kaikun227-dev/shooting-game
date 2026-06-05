// === BOSS 10 ===
function createBoss10() {
  return { x: W/2, y: 100, tx: W/2, ty: 100, hp: loopHP(1400), maxHp: loopHP(1400), alive: true, color: '#cc3399',
    state: 'idle', stateTimer: 0, subState: 0, attackCount: 0, moveTimer: 0,
    update() {
      // attack5以外で不定期に移動
      if (this.state !== 'attack5') {
        this.x += (this.tx - this.x)*0.02; this.y += (this.ty - this.y)*0.02;
        this.moveTimer++;
        if (this.moveTimer > 30 + Math.random()*40) {
          this.tx = 50 + Math.random()*(W-100); this.ty = 50 + Math.random()*(H/2);
          this.moveTimer = 0;
        }
      }
      
      if (this.state === 'idle') {
        this.stateTimer++;
        if (this.stateTimer > 90) { this.state = 'attack' + randInt(1, 6); this.stateTimer = 0; this.subState = 0; this.attackCount = 0; }
      }
      else if (this.state === 'attack1') {
        // 等間隔レーザー（縦、その後横）2回連続で放つ
        if (this.stateTimer === 0) {
          // 1回目：縦方向
          for(let i=0; i<9; i++) enemyLasers.push({axis:'v', pos: (i+0.5)*(W/8.5), warningTimer: 60, activeTimer: 20});
        }
        else if (this.stateTimer === 80) {
          // 2回目：横方向
          for(let i=0; i<9; i++) enemyLasers.push({axis:'h', pos: (i+0.5)*(H/8.5), warningTimer: 60, activeTimer: 20});
        }
        this.stateTimer++; if (this.stateTimer > 160) this.endAttack();
      }
      else if (this.state === 'attack2') {
        // ダブルクロスレーザー
        if (this.stateTimer === 0) {
          this.px = player.x; this.py = player.y;
          // 1回目：十字
          enemyLasers.push({axis:'custom', angle: 0, x: this.px, y: this.py, warningTimer: 50, activeTimer: 20});
          enemyLasers.push({axis:'custom', angle: Math.PI/2, x: this.px, y: this.py, warningTimer: 50, activeTimer: 20});
          enemyLasers.push({axis:'custom', angle: Math.PI, x: this.px, y: this.py, warningTimer: 50, activeTimer: 20});
          enemyLasers.push({axis:'custom', angle: 3*Math.PI/2, x: this.px, y: this.py, warningTimer: 50, activeTimer: 20});
        }
        if (this.stateTimer === 80) {
          // 2回目：2*2間隔のクロス
          const off = 50;
          enemyLasers.push({axis:'custom', angle: Math.PI/4, x: this.px+off, y: this.py+off, warningTimer: 50, activeTimer: 20});
          enemyLasers.push({axis:'custom', angle: Math.PI/4, x: this.px-off, y: this.py-off, warningTimer: 50, activeTimer: 20});
          enemyLasers.push({axis:'custom', angle: -Math.PI/4, x: this.px+off, y: this.py-off, warningTimer: 50, activeTimer: 20});
          enemyLasers.push({axis:'custom', angle: -Math.PI/4, x: this.px-off, y: this.py+off, warningTimer: 50, activeTimer: 20});
          enemyLasers.push({axis:'custom', angle: 3*Math.PI/4, x: this.px+off, y: this.py+off, warningTimer: 50, activeTimer: 20});
          enemyLasers.push({axis:'custom', angle: 3*Math.PI/4, x: this.px-off, y: this.py-off, warningTimer: 50, activeTimer: 20});
          enemyLasers.push({axis:'custom', angle: -3*Math.PI/4, x: this.px+off, y: this.py-off, warningTimer: 50, activeTimer: 20});
          enemyLasers.push({axis:'custom', angle: -3*Math.PI/4, x: this.px-off, y: this.py+off, warningTimer: 50, activeTimer: 20});
        }
        this.stateTimer++; if (this.stateTimer > 180) this.endAttack();
      }
      else if (this.state === 'attack3') {
        // 連続レーザー（8回、固定間隔で）
        if (this.stateTimer % 20 === 0 && this.attackCount < 8) {
          enemyLasers.push({axis: 'v', pos: player.x, warningTimer: 25, activeTimer: 15});
          this.attackCount++;
        }
        this.stateTimer++; if (this.attackCount >= 8 && this.stateTimer > 50) this.endAttack();
      }
      else if (this.state === 'attack4') {
        // 通常プラズマ（自機位置に非常に大きなプラズマ）
        if (this.stateTimer === 0) plasmas.push({x: player.x, y: player.y, maxR: 350, timer: 0, isPlayer: false, lightningTimer: 0});
        this.stateTimer++; if (this.stateTimer > 160) this.endAttack();
      }
      else if (this.state === 'attack5') {
        // ボスプラズマ（ボス中心に大きなプラズマ + ランダムな8位置に中程度プラズマ、ボスは停止）
        if (this.stateTimer === 0) {
          plasmas.push({x: this.x, y: this.y, maxR: 250, timer: 0, isPlayer: false, lightningTimer: 0});
          for(let i=0; i<8; i++) plasmas.push({x: Math.random()*W, y: Math.random()*H, maxR: 100, timer: 0, isPlayer: false, lightningTimer: 0});
          this.bossStoppedX = this.x; this.bossStoppedY = this.y;
        }
        // ボスの位置を固定（停止）
        this.x = this.bossStoppedX; this.y = this.bossStoppedY;
        this.stateTimer++; if (this.stateTimer > 160) this.endAttack();
      }
      else if (this.state === 'attack6') {
        // 連続プラズマ（4回 + 少し間 + 4回、計8回）
        if (this.subState === 0 && this.stateTimer % 30 === 0 && this.attackCount < 4) {
          plasmas.push({x: player.x, y: player.y, maxR: 60, timer: 0, isPlayer: false, lightningTimer: 0});
          this.attackCount++; if (this.attackCount === 4) { this.subState = 1; this.stateTimer = 0; }
        }
        else if (this.subState === 1 && this.stateTimer > 60) { this.subState = 2; this.stateTimer = 0; this.attackCount = 0; }
        else if (this.subState === 2 && this.stateTimer % 30 === 0 && this.attackCount < 4) {
          plasmas.push({x: player.x, y: player.y, maxR: 60, timer: 0, isPlayer: false, lightningTimer: 0});
          this.attackCount++;
        }
        this.stateTimer++; if (this.attackCount >= 4 && this.subState === 2 && this.stateTimer > 180) this.endAttack();
      }
    },
    endAttack() { this.state = 'idle'; this.stateTimer = 0; this.moveTimer = 0; this.tx = 50 + Math.random()*(W-100); this.ty = 50 + Math.random()*(H/2); },
    hit(d) { this.hp -= d; if(this.hp<=0){this.hp=0;this.alive=false;} },
    draw() { drawBossCircle(this, this.color, 35); drawBossHpBar(this); }
  };
}

function createBoss11() {
  return { x: W/2, y: 100, tx: W/2, ty: 100, hp: loopHP(1400), maxHp: loopHP(1400), alive: true, color: '#00bfff',
    state: 'idle', stateTimer: 0, subState: 0, attackCount: 0, moveTimer: 0,
    update() {
      // attack6以外で不定期に移動
      if (this.state !== 'attack6') {
        this.x += (this.tx - this.x)*0.02; this.y += (this.ty - this.y)*0.02;
        this.moveTimer++;
        if (this.moveTimer > 30 + Math.random()*40) {
          this.tx = 50 + Math.random()*(W-100); this.ty = 50 + Math.random()*(H/2);
          this.moveTimer = 0;
        }
      }
      
      if (this.state === 'idle') {
        this.stateTimer++;
        if (this.stateTimer > 90) { this.state = 'attack' + randInt(1, 6); this.stateTimer = 0; this.subState = 0; this.attackCount = 0; }
      }
      else if (this.state === 'attack1') {
        // ランページチャクラム：ランダムな方向へチャクラムを4回発射
        if (this.stateTimer === 0) {
          this.attackCount = 0;
        }
        if (this.stateTimer % 20 === 0 && this.attackCount < 4) {
          const a = Math.random() * Math.PI * 2;
          enemyBullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, alive: true, type: 'enemyChakram', size: 12, color: '#ff6699', reflectCount: 0, maxReflect: 2, trail: [] });
          this.attackCount++;
        }
        this.stateTimer++; if (this.attackCount >= 4 && this.stateTimer > 140) this.endAttack();
      }
      else if (this.state === 'attack2') {
        // 三方向チャクラム：2回攻撃
        if (this.stateTimer === 0) {
          // 1回目：三方向
          const dx = player.x - this.x, dy = player.y - this.y, d = Math.hypot(dx, dy) || 1;
          const angle = Math.atan2(dy, dx);
          for (let i = -1; i <= 1; i++) {
            const a = angle + i * Math.PI / 6;
            enemyBullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, alive: true, type: 'enemyChakram', size: 12, color: '#ff6699', reflectCount: 0, maxReflect: 2, trail: [] });
          }
        }
        if (this.stateTimer === 60) {
          // 2回目：間の2方向
          const dx = player.x - this.x, dy = player.y - this.y, d = Math.hypot(dx, dy) || 1;
          const angle = Math.atan2(dy, dx);
          for (let i = -0.5; i <= 0.5; i += 1) {
            const a = angle + i * Math.PI / 6;
            enemyBullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, alive: true, type: 'enemyChakram', size: 12, color: '#ff6699', reflectCount: 0, maxReflect: 2, trail: [] });
          }
        }
        this.stateTimer++; if (this.stateTimer > 120) this.endAttack();
      }
      else if (this.state === 'attack3') {
        // 八方向チャクラム：周囲8方向に通常チャクラム（2回）
        if (this.stateTimer === 0) {
          for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4;
            enemyBullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, alive: true, type: 'enemyChakram', size: 12, color: '#ff6699', reflectCount: 0, maxReflect: 2, trail: [] });
          }
        }
        if (this.stateTimer === 45) {
          // 2回目：1回目の間に放つ
          for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4 + Math.PI / 8; // 間にずらす
            enemyBullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, alive: true, type: 'enemyChakram', size: 12, color: '#ff6699', reflectCount: 0, maxReflect: 2, trail: [] });
          }
        }
        this.stateTimer++; if (this.stateTimer > 120) this.endAttack();
      }
      else if (this.state === 'attack4') {
        // 連続チャクラム：自機に向かって6回連続でチャクラム
        if (this.stateTimer % 20 === 0 && this.attackCount < 6) {
          const dx = player.x - this.x, dy = player.y - this.y, d = Math.hypot(dx, dy) || 1;
          enemyBullets.push({ x: this.x, y: this.y, vx: (dx / d) * 6, vy: (dy / d) * 6, alive: true, type: 'enemyChakram', size: 12, color: '#ff6699', reflectCount: 0, maxReflect: 2, trail: [] });
          this.attackCount++;
        }
        this.stateTimer++; if (this.attackCount >= 6 && this.stateTimer > 140) this.endAttack();
      }
      else if (this.state === 'attack5') {
        // クロスチャクラム：X字にチャクラムを3回投げる
        if (this.stateTimer % 40 === 0 && this.attackCount < 3) {
          const angles = [Math.PI/4, 3*Math.PI/4, 5*Math.PI/4, 7*Math.PI/4];
          for (const a of angles) {
            enemyBullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, alive: true, type: 'enemyChakram', size: 12, color: '#ff6699', reflectCount: 0, maxReflect: 2, trail: [] });
          }
          this.attackCount++;
        }
        this.stateTimer++; if (this.attackCount >= 3 && this.stateTimer > 140) this.endAttack();
      }
      else if (this.state === 'attack6') {
        // プラズマ＆チャクラム：その場にとどまり、250Rのプラズマ攻撃後、32方向にチャクラム
        if (this.stateTimer === 0) {
          this.bossStoppedX = this.x;
          this.bossStoppedY = this.y;
          plasmas.push({x: this.x, y: this.y, maxR: 300, timer: 0, isPlayer: false, lightningTimer: 0, owner: 'boss11'});
        }
        if (this.stateTimer === 143) {
          for (let i = 0; i < 32; i++) {
            const a = i * Math.PI * 2 / 32;
            enemyBullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, alive: true, type: 'enemyChakram', size: 12, color: '#ff6699', reflectCount: 0, maxReflect: 2, trail: [] });
          }
        }
        // ボスは停止
        this.x = this.bossStoppedX;
        this.y = this.bossStoppedY;
        this.stateTimer++; if (this.stateTimer > 160) this.endAttack();
      }
    },
    endAttack() { this.state = 'idle'; this.stateTimer = 0; this.moveTimer = 0; this.tx = 50 + Math.random()*(W-100); this.ty = 50 + Math.random()*(H/2); },
    hit(d) { this.hp -= d; if(this.hp<=0){this.hp=0;this.alive=false;} },
    draw() { 
      drawBossCircle(this, this.color, 35); drawBossHpBar(this); 
    }
  };
}

// === BOSS 12 ===
function createBoss12() {
  return { 
    x: W/2, y: 100, tx: W/2, ty: 100, hp: loopHP(1600), maxHp: loopHP(1600), alive: true, color: '#888888',
    state: 'idle', stateTimer: 0, subState: 0, attackCount: 0, moveTimer: 0, 
    stickLen: 0, stickAngle: 0, pDamTimer: 0,
    dashVx: 0, dashVy: 0, dashTrail: [], // 突進移動用

    update() {
      // --- 突進移動ロジック---
      this.moveTimer++;
      if (this.moveTimer > 60) {
        this.moveTimer = 0;
        const a = Math.random() * Math.PI * 2;
        const speed = 6;
        this.dashVx = Math.cos(a) * speed;
        this.dashVy = Math.sin(a) * speed;
      }

      // 残像の追加
      if (frameCount % 2 === 0) {
        this.dashTrail.push({x: this.x, y: this.y, life: 10});
      }
      
      this.x += this.dashVx; 
      this.y += this.dashVy;

      // 画面端での反射
      if (this.x < 30 || this.x > W-30) { this.dashVx *= -1; this.x = Math.max(30, Math.min(W-30, this.x)); }
      if (this.y < 30 || this.y > H-30) { this.dashVy *= -1; this.y = Math.max(30, Math.min(H-30, this.y)); }
      
      // 突進自体にダメージ判定
      if (player.alive && !player.invincible && Math.hypot(player.x-this.x, player.y-this.y) < 35 && player.damageTimer === 0) {
        hitPlayer(30);
      }

      // 残像の更新
      for (const t of this.dashTrail) t.life--;
      this.dashTrail = this.dashTrail.filter(t => t.life > 0);

      // --- 攻撃パターン ---
      if (this.state === 'idle') {
        this.stateTimer++;
        if (this.stateTimer > 90) {
          this.state = 'attack' + randInt(1, 6);
          this.stateTimer = 0;
          this.subState = 0;
          this.attackCount = 0;
        }
      }
      else if (this.state === 'attack1') {
        // 連続チャクラム：自機に向かって8回連続でチャクラム
        if (this.stateTimer % 20 === 0 && this.attackCount < 8) {
          const dx = player.x - this.x, dy = player.y - this.y, d = Math.hypot(dx, dy) || 1;
          enemyBullets.push({ 
            x: this.x, y: this.y, vx: (dx/d)*6, vy: (dy/d)*6, alive: true, 
            type: 'enemyChakram', size: 12, color: '#ff6699', reflectCount: 0, maxReflect: 2, trail: [] 
          });
          this.attackCount++;
        }
        this.stateTimer++; if (this.attackCount >= 8 && this.stateTimer > 190) this.endAttack();
      }
      else if (this.state === 'attack2') {
        // レーザーラッシュ：自機位置に32回
        if (this.stateTimer % 8 === 0 && this.attackCount < 16) {
          const angle = Math.random() * Math.PI * 2;
          enemyLasers.push({axis: 'custom', angle: angle, x: player.x, y: player.y, warningTimer: 15, activeTimer: 12});
          this.attackCount++;
        }
        this.stateTimer++; if (this.attackCount >= 16 && this.stateTimer > 120) this.endAttack();
      }
      else if (this.state === 'attack3') {
        // プラズマラッシュ：ランダム位置に12回
        if (this.stateTimer % 10 === 0 && this.attackCount < 12) {
          plasmas.push({x: Math.random()*W, y: Math.random()*H, maxR: 80, timer: 0, isPlayer: false, lightningTimer: 0});
          this.attackCount++;
        }
        this.stateTimer++; if (this.attackCount >= 12 && this.stateTimer > 180) this.endAttack();
      }
      else if (this.state === 'attack4') {
        // 32方向弾：4回連続
        if (this.stateTimer % 40 === 0 && this.attackCount < 4) {
          for (let i = 0; i < 32; i++) fireEnemy(this.x, this.y, i * Math.PI * 2 / 32, 4);
          this.attackCount++;
        }
        this.stateTimer++; if (this.attackCount >= 4 && this.stateTimer > 150) this.endAttack();
      }
      else if (this.state === 'attack5') {
        // 一斉レーザー
        if (this.stateTimer === 0) {
          for (let i = 0; i < 30; i++) {
            enemyLasers.push({axis: 'custom', angle: Math.random()*Math.PI*2, x: Math.random()*W, y: Math.random()*H, warningTimer: 50, activeTimer: 20});
          }
        }
        this.stateTimer++; if (this.stateTimer > 100) this.endAttack();
      }
      else if (this.state === 'attack6') {
        // スティックぶん回し（突進移動しながら）
        if (this.stateTimer === 0) { this.stickLen = 0; this.stickAngle = 0; this.pDamTimer = 0; }
        if (this.pDamTimer > 0) this.pDamTimer--;
        if (this.stateTimer < 30) this.stickLen = Math.min(H/3, this.stickLen + 8);
        else if (this.stateTimer < 180) this.stickAngle += Math.PI / 16;
        else if (this.stateTimer < 210) this.stickLen = Math.max(0, this.stickLen - 8);

        if (this.stickLen > 0 && this.pDamTimer === 0) {
          for (let i = 0; i < 4; i++) {
            const a = this.stickAngle + i * Math.PI / 2;
            const x2 = this.x + Math.cos(a) * this.stickLen, y2 = this.y + Math.sin(a) * this.stickLen;
            if (distToSegment(player.x, player.y, this.x, this.y, x2, y2) < 14) { hitPlayer(30); this.pDamTimer = 30; break; }
          }
          for (const b of playerBullets) {
            if (!b.alive) continue;
            for (let i = 0; i < 4; i++) {
              const a = this.stickAngle + i * Math.PI / 2;
              const x2 = this.x + Math.cos(a) * this.stickLen, y2 = this.y + Math.sin(a) * this.stickLen;
              if (distToSegment(b.x, b.y, this.x, this.y, x2, y2) < 10) { b.alive = false; break; }
            }
          }
        }
        this.stateTimer++; if (this.stateTimer > 210) { this.stickLen = 0; this.endAttack(); }
      }
    },
    endAttack() { this.state = 'idle'; this.stateTimer = 0; },
    hit(d) { this.hp -= d; if(this.hp<=0){this.hp=0;this.alive=false;this.dashTrail=[];} },
    draw() {
      // 残像の描画
      for (const t of this.dashTrail) {
        ctx.save(); ctx.globalAlpha = t.life/10*0.4; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(t.x, t.y, 35, 0, Math.PI*2); ctx.fill(); ctx.restore();
      }
      // スティックの描画
      if (this.stickLen > 0) {
        ctx.save(); ctx.strokeStyle = '#f00'; ctx.lineWidth = 6; ctx.shadowColor = '#f00'; ctx.shadowBlur = 10;
        for (let i = 0; i < 4; i++) {
          const a = this.stickAngle + i * Math.PI / 2;
          ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(a)*this.stickLen, this.y + Math.sin(a)*this.stickLen); ctx.stroke();
        }
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const a = this.stickAngle + i * Math.PI / 2;
          ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(a)*this.stickLen, this.y + Math.sin(a)*this.stickLen); ctx.stroke();
        }
        ctx.restore();
      }
      drawBossCircle(this, this.color, 35); drawBossHpBar(this);
    }
  };
}

// === BOSS 13: ECLIPSE ===
function createBoss13() {
  return {
    x: W / 2, y: H / 3, hp: loopHP(2400), maxHp: loopHP(2400), alive: true, color: '#000',
    state: 'idle', stateTimer: 0,
    attackCount: 0, maxAttacks: 2,
    bubbles: [], convergeBullets: [], convergeBaseAngle: 0,
    rotLasers: [], rotLaserStep: 0,  // 回転レーザー用
    rampageLasers: [], rampageLaserStep: 0,  // ランページレーザー用
    autoLaserTimer: 0,  // HP半分以下の自動ホーミングレーザー

    update() {
      this.stateTimer++;
      this.updateBubbles();
      this.updateConvergeBullets();
      this.updateRotLasers();
      this.updateRampageLasers();

      // HP半分以下で3秒(180f)ごとに自機へホーミングレーザーを発射（行動数にカウントしない）
      if (this.hp < this.maxHp * 0.6 && this.alive) {
        this.autoLaserTimer++;
        if (this.autoLaserTimer >= 180) {
          this.autoLaserTimer = 0;
          const a = Math.atan2(player.y - this.y, player.x - this.x);
          const len = Math.max(W, H) * 2;
          this.rotLasers.push({ x: this.x, y: this.y, angle: a, length: len, timer: 0, warningTime: 30, activeTime: 60, alive: true, isAuto: true });
        }
      }

      switch (this.state) {
        case 'idle':
          if (this.stateTimer > 40) {
            if (this.attackCount >= this.maxAttacks) {
              this.state = 'teleport_out';
              this.stateTimer = 0;
              this.attackCount = 0;
              this.maxAttacks = Math.random() < 0.5 ? 2 : 3;
            } else {
              this.chooseAttack();
            }
          }
          break;

        case 'teleport_out':
          if (this.stateTimer > 30) {
            this.x = 80 + Math.random() * (W - 160);
            this.y = 80 + Math.random() * (H / 2 - 80);
            this.state = 'teleport_in';
            this.stateTimer = 0;
          }
          break;

        case 'teleport_in':
          if (this.stateTimer > 30) { this.state = 'idle'; this.stateTimer = 0; }
          break;

        case 'attack_spread':
          if (this.stateTimer <= 180) {
            if (this.stateTimer % 4 === 0) {
              const a = Math.atan2(player.y - this.y, player.x - this.x);
              fireEnemy(this.x, this.y, a + (Math.random()-0.5)*0.5, 2 + Math.random()*6, { color: '#fff', glow: '#888' });
            }
          } else { this.endAttack(); }
          break;

        case 'attack_converge':
          if (this.stateTimer === 30 || this.stateTimer === 60 || this.stateTimer === 90) {
            const baseAngle = (this.stateTimer === 60) ? Math.random() * Math.PI : this.convergeBaseAngle;
            if (this.stateTimer === 30) this.convergeBaseAngle = baseAngle;
            const R = 600; 
            for (let i = 0; i < 32; i++) {
              const a = baseAngle + (i * Math.PI * 2 / 32);
              this.convergeBullets.push({
                x: this.x + Math.cos(a)*R, y: this.y + Math.sin(a)*R,
                vx: Math.cos(a + Math.PI)*7, vy: Math.sin(a + Math.PI)*7,
                speed: 7, color: '#fff', glow: '#555', alive: true
              });
            }
          }
          if (this.stateTimer > 200) this.endAttack();
          break;

        case 'attack_blackhole':
          if (this.stateTimer < 180) {
            const dx = this.x - player.x, dy = this.y - player.y, dist = Math.hypot(dx, dy);
            if (dist > 0 && !player.invincible) { player.x += (dx / dist) * 2.3; player.y += (dy / dist) * 2.3; }
            if (this.stateTimer % 1 === 0) {
              const a = Math.random() * Math.PI * 3;
              const R = 600;
              this.convergeBullets.push({
                x: this.x + Math.cos(a)*R, y: this.y + Math.sin(a)*R,
                vx: Math.cos(a + Math.PI)*9, vy: Math.sin(a + Math.PI)*9,
                speed: 10, color: '#fff', glow: '#fff', alive: true
              });
            }
          } else { this.state = 'attack_bubble'; this.stateTimer = 0; }
          break;

        case 'attack_bubble':
          if (this.stateTimer === 10) {
            const a = Math.atan2(player.y - this.y, player.x - this.x);
            // 残像・消滅演出付きのバブル
            this.bubbles.push({
              x: this.x, y: this.y,
              vx: Math.cos(a)*6, vy: Math.sin(a)*6,
              radius: 60, minRadius: 15, reflectRemaining: 4, alive: true,
              trail: [], burst: false, burstTimer: 0, burstParticles: []
            });
          }
          // バブルを放ったらすぐ次の行動へ（バブルが消えるのを待たない）
          if (this.stateTimer > 10) this.endAttack();
          break;

        case 'attack_rampage_laser':
          // ランダムな方向に白いレーザーを32回放つ
          if (this.stateTimer === 1) { this.rampageLaserStep = 0; }
          if (this.rampageLaserStep < 32 && this.stateTimer % 4 === 0) {
            const angle = Math.random() * Math.PI * 2;
            const len = Math.max(W, H) * 2;
            this.rampageLasers.push({ x: this.x, y: this.y, angle: angle, length: len, timer: 0, warningTime: 20, activeTime: 50, alive: true });
            this.rampageLaserStep++;
          }
          if (this.rampageLaserStep >= 32 && this.rampageLasers.length === 0) this.endAttack();
          break;

        case 'attack_rotation_laser':
          // 64回高速で少しずつ角度をずらしながら両方向にレーザーを放つ（1周）
          if (this.stateTimer === 1) { this.rotLaserStep = 0; }
          if (this.rotLaserStep < 32 && this.stateTimer % 6 === 0) {
            const angle = -Math.PI/2 + (this.rotLaserStep / 32) * Math.PI * 2;
            const len = Math.max(W, H) * 1.8;
            // 両方向（angle と angle+π）にレーザーを1本ずつ生成
            this.rotLasers.push({ x: this.x, y: this.y, angle: angle,          length: len, timer: 0, warningTime: 10, activeTime: 28, alive: true });
            this.rotLasers.push({ x: this.x, y: this.y, angle: angle + Math.PI, length: len, timer: 0, warningTime: 10, activeTime: 28, alive: true });
            this.rotLaserStep++;
          }
          if (this.rotLaserStep >= 32 && this.rotLasers.length === 0) this.endAttack();
          break;
      }
    },

    chooseAttack() {
      const attacks = ['attack_spread', 'attack_converge', 'attack_blackhole', 'attack_rotation_laser', 'attack_rampage_laser'];
      this.state = attacks[Math.floor(Math.random() * attacks.length)];
      this.stateTimer = 0;
    },

    endAttack() { this.state = 'idle'; this.stateTimer = 0; this.attackCount++; },

    updateBubbles() {
      for (const s of this.bubbles) {
        if (!s.alive) continue;

        // 残像を記録
        s.trail = s.trail || [];
        s.trail.unshift({ x: s.x, y: s.y, alpha: 0.25 });
        if (s.trail.length > 10) s.trail.pop();

        // バーストアニメーション
        if (s.burst) {
          s.burstTimer--;
          for (const p of s.burstParticles) {
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed;
            p.alpha *= 0.88;
          }
          if (s.burstTimer <= 0) s.alive = false;
          continue;
        }

        s.x += s.vx; s.y += s.vy;
        let ref = false, wall = false;
        if (s.x - s.radius < 0) { wall = true; if (s.reflectRemaining > 0) { s.x = s.radius; s.vx = Math.abs(s.vx); ref = true; } }
        if (s.x + s.radius > W) { wall = true; if (s.reflectRemaining > 0) { s.x = W - s.radius; s.vx = -Math.abs(s.vx); ref = true; } }
        if (s.y - s.radius < 0) { wall = true; if (s.reflectRemaining > 0) { s.y = s.radius; s.vy = Math.abs(s.vy); ref = true; } }
        if (s.y + s.radius > H) { wall = true; if (s.reflectRemaining > 0) { s.y = H - s.radius; s.vy = -Math.abs(s.vy); ref = true; } }
        if (ref) {
          const nr = Math.max(s.minRadius, s.radius * 0.7), sp = Math.hypot(s.vx, s.vy), ang = Math.atan2(s.vy, s.vx) + Math.PI/3;
          this.bubbles.push({ x: s.x, y: s.y, vx: Math.cos(ang)*sp, vy: Math.sin(ang)*sp, radius: nr, minRadius: s.minRadius, reflectRemaining: s.reflectRemaining-1, alive: true, trail: [], burst: false, burstTimer: 0, burstParticles: [] });
          s.radius = nr; s.reflectRemaining--;
        }
        if (wall && !ref && !s.burst) {
          // 消える演出（バースト）
          s.burst = true;
          s.burstTimer = 14;
          s.burstParticles = [];
          for (let i = 0; i < 12; i++) {
            s.burstParticles.push({ x: 0, y: 0, angle: (Math.PI*2/12)*i, speed: 2 + Math.random()*3, alpha: 1 });
          }
          s.vx = 0; s.vy = 0;
        }
        if (player.alive && !player.invincible && Math.hypot(player.x - s.x, player.y - s.y) < s.radius + 16) hitPlayerDamage(1, 30);
      }
      this.bubbles = this.bubbles.filter(s => s.alive);
    },

    updateConvergeBullets() {
      for (const b of this.convergeBullets) {
        if (!b.alive) continue;
        b.x += b.vx; b.y += b.vy;
        if (Math.hypot(b.x - this.x, b.y - this.y) < b.speed + 5) b.alive = false;
        if (player.alive && !player.invincible && Math.hypot(player.x - b.x, player.y - b.y) < 10) hitPlayerDamage(1, 30);
      }
      this.convergeBullets = this.convergeBullets.filter(b => b.alive);
    },

    updateRotLasers() {
      for (const l of this.rotLasers) {
        l.timer++;
        if (l.timer >= l.warningTime && l.timer < l.activeTime) {
          if (player.alive && !player.invincible) {
            const vx = Math.cos(l.angle), vy = Math.sin(l.angle);
            const dx = player.x - l.x, dy = player.y - l.y;
            const t = dx*vx + dy*vy;
            if (t > 0 && t < l.length) {
              const dist = Math.hypot(player.x - (l.x + t*vx), player.y - (l.y + t*vy));
              if (dist < 10) hitPlayerDamage(2, 20);
            }
          }
        }
        if (l.timer >= l.activeTime) l.alive = false;
      }
      this.rotLasers = this.rotLasers.filter(l => l.alive);
    },

    updateRampageLasers() {
      for (const l of this.rampageLasers) {
        l.timer++;
        if (l.timer >= l.warningTime && l.timer < l.activeTime) {
          if (player.alive && !player.invincible) {
            const vx = Math.cos(l.angle), vy = Math.sin(l.angle);
            const dx = player.x - l.x, dy = player.y - l.y;
            const t = dx*vx + dy*vy;
            if (t > 0 && t < l.length) {
              const dist = Math.hypot(player.x - (l.x + t*vx), player.y - (l.y + t*vy));
              if (dist < 10) hitPlayerDamage(2, 20);
            }
          }
        }
        if (l.timer >= l.activeTime) l.alive = false;
      }
      this.rampageLasers = this.rampageLasers.filter(l => l.alive);
    },

    hit(d) {
      if (this.state === 'teleport_out' || this.state === 'teleport_in') return;
      this.hp -= d; if (this.hp <= 0) { this.hp = 0; this.alive = false; }
    },

    draw() {
      for (const b of this.convergeBullets) {
        ctx.save(); ctx.fillStyle = b.color; ctx.shadowColor = b.glow; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      // バブル描画（残像・バースト演出付き）
      for (const s of this.bubbles) {
        ctx.save();
        if (s.burst) {
          // バースト（消滅）演出
          for (const p of s.burstParticles || []) {
            ctx.globalAlpha = p.alpha * 0.8;
            ctx.fillStyle = 'rgba(220, 220, 255, 0.9)';
            ctx.beginPath(); ctx.arc(s.x + p.x, s.y + p.y, Math.max(2, s.radius * 0.15), 0, Math.PI*2); ctx.fill();
          }
          ctx.restore();
          continue;
        }
        // 残像
        for (const t of s.trail || []) {
          ctx.globalAlpha = t.alpha;
          ctx.fillStyle = 'rgba(200, 200, 255, 0.3)';
          ctx.strokeStyle = 'rgba(220, 220, 255, 0.2)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(t.x, t.y, s.radius * 0.85, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        }
        // 本体
        ctx.globalAlpha = 1;
        const alpha = 0.35 + 0.2 * Math.sin(frameCount * 0.15);
        ctx.fillStyle = `rgba(200, 200, 255, ${alpha})`; ctx.strokeStyle = 'rgba(220, 220, 255, 0.9)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      // ランページレーザー描画（白色・ボス起点）
      for (const l of this.rampageLasers) {
        ctx.save();
        if (l.timer < l.warningTime) {
          // 予告：細い白輝線
          ctx.globalAlpha = 0.1 + 0.55 * (l.timer / l.warningTime);
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.shadowColor = '#aaaaff'; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.moveTo(l.x, l.y);
          ctx.lineTo(l.x + Math.cos(l.angle)*l.length, l.y + Math.sin(l.angle)*l.length); ctx.stroke();
          ctx.setLineDash([]);
        } else {
          const progress = (l.timer - l.warningTime) / (l.activeTime - l.warningTime);
          ctx.globalAlpha = 0.92 * (1 - progress * 0.5);
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, 14 * (1 - progress));
          ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 24; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(l.x, l.y);
          ctx.lineTo(l.x + Math.cos(l.angle)*l.length, l.y + Math.sin(l.angle)*l.length); ctx.stroke();
        }
        ctx.restore();
      }
      // 自動ホーミングレーザー（rotLasersのisAuto）は通常の回転レーザー描画で表示

      // 回転レーザー描画（白色・太め・両方向）
      for (const l of this.rotLasers) {
        ctx.save();
        if (l.isAuto) {
          // 自動ホーミングレーザー：予告輝線 → 本体太線
          if (l.timer < l.warningTime) {
            const warnP = l.timer / l.warningTime;
            ctx.globalAlpha = 0.1 + 0.55 * warnP;
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
            ctx.setLineDash([]); ctx.lineCap = 'round';
            ctx.shadowColor = '#aaaaff'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.moveTo(l.x, l.y);
            ctx.lineTo(l.x + Math.cos(l.angle)*l.length, l.y + Math.sin(l.angle)*l.length);
            ctx.stroke(); ctx.setLineDash([]);
          } else {
            const progress = (l.timer - l.warningTime) / (l.activeTime - l.warningTime);
            ctx.globalAlpha = 0.95 * (1 - progress * 0.5);
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, 18 * (1 - progress));
            ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 28; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(l.x, l.y);
            ctx.lineTo(l.x + Math.cos(l.angle)*l.length, l.y + Math.sin(l.angle)*l.length);
            ctx.stroke();
          }
        } else {
          // 回転レーザー：予告輝線 → 本体太線
          if (l.timer < l.warningTime) {
            const warnP = l.timer / l.warningTime;
            ctx.globalAlpha = 0.1 + 0.55 * warnP;
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
            ctx.setLineDash([]); ctx.lineCap = 'round';
            ctx.shadowColor = '#aaaaff'; ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.moveTo(l.x, l.y);
            ctx.lineTo(l.x + Math.cos(l.angle)*l.length, l.y + Math.sin(l.angle)*l.length);
            ctx.stroke(); ctx.setLineDash([]);
          } else {
            const progress = (l.timer - l.warningTime) / (l.activeTime - l.warningTime);
            const w = Math.max(2, 22 * (1 - progress));
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w;
            ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 30;
            ctx.globalAlpha = 0.9 * (1 - progress * 0.4); ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(l.x, l.y);
            ctx.lineTo(l.x + Math.cos(l.angle)*l.length, l.y + Math.sin(l.angle)*l.length);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      if (this.state === 'attack_blackhole') {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(frameCount * 0.1);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.4;
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(0, 0, 40 + Math.random() * 80, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
      }
      ctx.save();
      let sc = 1, op = 1;
      if (this.state === 'teleport_out') sc = op = 1 - (this.stateTimer / 30);
      else if (this.state === 'teleport_in') sc = op = this.stateTimer / 30;
      if (sc > 0) {
        ctx.translate(this.x, this.y); ctx.scale(sc, sc); ctx.globalAlpha = op;
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 30 * ((this.state === 'attack_flash') ? 2 : 1);
        ctx.beginPath(); ctx.arc(0, 0, 32 + Math.sin(frameCount * 0.1) * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = this.color; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      if (this.hp > 0 && op > 0) {
        const oc = this.color; this.color = 'rgba(240, 240, 240, 0.9)';
        if (typeof drawBossHpBar === 'function') drawBossHpBar(this);
        this.color = oc;
      }
    }
  };
}


// === BOSS 14: DREAM STORM ===
function createBoss14() {
  return {
    x: W/2, y: H/3, hp: loopHP(2500), maxHp: loopHP(2500), alive: true, color: '#cc88ff',
    rotation: 0,
    state: 'idle', stateTimer: 0,
    attackCount: 0, maxAttacks: 3,
    // 攻撃用配列
    bossTornadoes: [], bossMeteors: [], bossLasers: [],
    // 連続レーザーカウンタ
    seqLaserStep: 0, seqLaserTimer: 0,
    // 扇拡大レーザー
    fanStep: 0, fanBaseAngle: 0, fanTimer: 0,
    // 子分展開
    minionPhaseTriggered: false, minionBarrier: false, minions: [],

    update() {
      this.stateTimer++;
      this.rotation += 0.018;
      this.updateBossTornadoes();
      this.updateBossMeteors();
      this.updateBossLasers();
      this.updateMinions();

      // 子分展開トリガー（HP40%以下、1回限り）
      if (!this.minionPhaseTriggered && this.hp <= this.maxHp * 0.4) {
        this.minionPhaseTriggered = true;
        this.minionBarrier = true;
        this.state = 'minion_phase'; this.stateTimer = 0;
        this.spawnMinions();
      }

      switch (this.state) {
        case 'idle':
          if (this.stateTimer > 15) {
            if (this.attackCount >= this.maxAttacks) {
              this.state='teleport_out'; this.stateTimer=0; this.attackCount=0;
              this.maxAttacks = Math.random()<0.5?2:3;
            } else { this.chooseAttack(); }
          }
          break;
        case 'teleport_out':
          if (this.stateTimer>25){this.x=80+Math.random()*(W-160);this.y=80+Math.random()*(H/2-80);this.state='teleport_in';this.stateTimer=0;}
          break;
        case 'teleport_in':
          if (this.stateTimer>25){this.state='idle';this.stateTimer=0;}
          break;
        case 'attack_tornado':
          // ★修正：トルネードの発射間隔を広げ（10, 30, 50フレーム目）
          if ([10,30,50].includes(this.stateTimer)) {
            const colors=['#ff88bb','#88ccff','#cc88ff'];
            const ci=[10,30,50].indexOf(this.stateTimer);
            this.fireBossTornado(colors[ci]);
          }
          // ★修正：3つ目を出したら、画面に残っていても即座に次の行動へ
          if (this.stateTimer > 55) this.endAttack();
          break;
        case 'attack_meteor':
          if (this.stateTimer===1) this.meteorStep=0;
          if (this.meteorStep<6 && this.stateTimer%18===0) {
            const colors=['#ff88bb','#88ccff','#cc88ff','#ff88bb','#88ccff','#cc88ff'];
            this.fireBossMeteor(colors[this.meteorStep], this.meteorStep);
            this.meteorStep++;
          }
          if (this.meteorStep>=6&&this.bossMeteors.length===0) this.endAttack();
          break;
        case 'attack_laser32':
          if (this.stateTimer===1) {
            for(let i=0;i<32;i++){
              const a=(Math.PI*2/32)*i;
              // ★修正：予告線を少し長く（warningTime: 35, activeTime: 50）
              this.bossLasers.push({x:this.x,y:this.y,angle:a,length:Math.max(W,H)*2,timer:0,warningTime:55,activeTime:70,alive:true,color:'#cc88ff',dmg:2});
            }
          }
          if (this.stateTimer>80&&this.bossLasers.length===0) this.endAttack();
          break;
        case 'attack_seq_laser':
          if (this.stateTimer===1){this.seqLaserStep=0;}
          if (this.seqLaserStep<8 && this.stateTimer%15===0) {
            const a=Math.atan2(player.y-this.y,player.x-this.x);
            // ★修正：予告線を少し長く（warningTime: 25, activeTime: 40）
            this.bossLasers.push({x:this.x,y:this.y,angle:a,length:Math.max(W,H)*2,timer:0,warningTime:45,activeTime:60,alive:true,color:'#88ccff',dmg:2});
            this.seqLaserStep++;
          }
          if (this.seqLaserStep>=8&&this.bossLasers.length===0) this.endAttack();
          break;
        case 'attack_fan_laser':
          if (this.stateTimer===1){this.fanStep=0;this.fanBaseAngle=Math.atan2(player.y-this.y,player.x-this.x);}
          if (this.fanStep<7 && this.stateTimer%15===0) {
            const spread=this.fanStep*0.22;
            if (this.fanStep===0) {
              // ★修正：1本目の予告線を長く（warningTime: 24, activeTime: 40）
              this.bossLasers.push({x:this.x,y:this.y,angle:this.fanBaseAngle,length:Math.max(W,H)*2,timer:0,warningTime:45,activeTime:60,alive:true,color:'#ff88bb',dmg:2});
            } else {
              this.bossLasers.push({x:this.x,y:this.y,angle:this.fanBaseAngle-spread,length:Math.max(W,H)*2,timer:0,warningTime:55,activeTime:70,alive:true,color:'#ff88bb',dmg:2});
              this.bossLasers.push({x:this.x,y:this.y,angle:this.fanBaseAngle+spread,length:Math.max(W,H)*2,timer:0,warningTime:55,activeTime:70,alive:true,color:'#ff88bb',dmg:2});
            }
            this.fanStep++;
          }
          if (this.fanStep>=7&&this.bossLasers.length===0) this.endAttack();
          break;
        case 'minion_phase':
          // 全ミニオン撃破でバリア解除
          if (this.minions.every(m=>!m.alive)) {
            this.minionBarrier=false; this.state='idle'; this.stateTimer=0;
          }
          break;
      }
    },

    chooseAttack() {
      const atks=['attack_tornado','attack_meteor','attack_laser32','attack_seq_laser','attack_fan_laser'];
      this.state=atks[Math.floor(Math.random()*atks.length)]; this.stateTimer=0;
    },
    endAttack(){this.state='idle';this.stateTimer=0;this.attackCount++;},

    fireBossTornado(color) {
      const angle=Math.random()*Math.PI*2;
      this.bossTornadoes.push({
        x:this.x,y:this.y,originX:this.x,originY:this.y,
        baseAngle:angle,t:0,
        size:22,
        speed:0.55,color,
        trail:[],alive:true,hitSet:new Set()
      });
    },
    fireBossMeteor(color, idx) {
      const side=idx%4;
      let sx,sy;
      if(side===0){sx=Math.random()*W;sy=-50;}
      else if(side===1){sx=W+50;sy=Math.random()*H;}
      else if(side===2){sx=Math.random()*W;sy=H+50;}
      else{sx=-50;sy=Math.random()*H;}
      const dx=player.x-sx,dy=player.y-sy,len=Math.hypot(dx,dy)||1;
      this.bossMeteors.push({x:sx,y:sy,vx:(dx/len)*6,vy:(dy/len)*6,angle:Math.atan2(dy,dx),size:44,color,trail:[],alive:true,hitSet:new Set()});
    },

    updateBossTornadoes() {
      for(const t of this.bossTornadoes){
        if(!t.alive)continue;
        t.t++;
        const r=t.speed*t.t*1.6,angle=t.baseAngle+t.t*0.06;
        t.x=t.originX+Math.cos(angle)*r;t.y=t.originY+Math.sin(angle)*r;
        t.trail.unshift({x:t.x,y:t.y,alpha:0.32});if(t.trail.length>7)t.trail.pop();
        if(r>Math.max(W,H)*0.75||t.t>500){t.alive=false;continue;}
        if(player.alive&&!player.invincible&&!t.hitSet.has('player')&&Math.hypot(player.x-t.x,player.y-t.y)<t.size+14){
          hitPlayerDamage(1,30); t.hitSet.add('player'); setTimeout(()=>t.hitSet.delete('player'),500);
        }
      }
      this.bossTornadoes=this.bossTornadoes.filter(t=>t.alive);
    },
    updateBossMeteors() {
      for(const m of this.bossMeteors){
        if(!m.alive)continue;
        m.x+=m.vx;m.y+=m.vy;
        m.trail.unshift({x:m.x,y:m.y,alpha:0.38});if(m.trail.length>9)m.trail.pop();
        if(!m.hitSet)m.hitSet=new Set();
        if(player.alive&&!player.invincible&&!m.hitSet.has('player')&&Math.hypot(player.x-m.x,player.y-m.y)<m.size+16){
          hitPlayerDamage(1,30); m.hitSet.add('player'); setTimeout(()=>m.hitSet.delete('player'),400);
        }
        if(m.x<-120||m.x>W+120||m.y<-120||m.y>H+120)m.alive=false;
      }
      this.bossMeteors=this.bossMeteors.filter(m=>m.alive);
    },
    updateBossLasers() {
      for(const l of this.bossLasers){
        l.timer++;
        if(l.timer>=l.warningTime&&l.timer<l.activeTime){
          if(player.alive&&!player.invincible){
            const vx=Math.cos(l.angle),vy=Math.sin(l.angle);
            const dx=player.x-l.x,dy=player.y-l.y,t2=dx*vx+dy*vy;
            if(t2>0&&t2<l.length&&Math.hypot(player.x-(l.x+t2*vx),player.y-(l.y+t2*vy))<12) hitPlayerDamage(l.dmg,30);
          }
        }
        if(l.timer>=l.activeTime)l.alive=false;
      }
      this.bossLasers=this.bossLasers.filter(l=>l.alive);
    },

    spawnMinions() {
      const colors=['#ff88bb','#88ccff','#cc88ff'];
      const types=['pink','cyan','purple'];
      for(let i=0;i<3;i++){
        this.minions.push({
          type:types[i],color:colors[i],
          x:100+Math.random()*(W-200),y:80+Math.random()*(H/2),
          hp:100,maxHp:100,alive:true,
          fireTimer:0,moveTimer:0,
          tx:100+Math.random()*(W-200),ty:80+Math.random()*(H/2),
          state:'move',stateTimer:0,
          plasmaFired:false,dashTrail:[],
          laser:null,
          statusEffects:{},
          update:function(){
            this.stateTimer++;
            if(this.type==='pink'){
              // 2秒ごとに自機へレーザー
              this.fireTimer++;
              if(this.fireTimer>=120){
                this.fireTimer=0;
                if(player.alive){
                  const a=Math.atan2(player.y-this.y,player.x-this.x);
                  const llen=Math.max(W,H)*2;
                  this.laser={x:this.x,y:this.y,angle:a,length:llen,timer:0,warningTime:30,activeTime:56,alive:true,color:'#ff88bb',dmg:2};
                }
              }
              if(this.laser){
                this.laser.timer++;
                if(this.laser.timer>=this.laser.warningTime&&this.laser.timer<this.laser.activeTime){
                  if(player.alive&&!player.invincible){
                    const vx=Math.cos(this.laser.angle),vy=Math.sin(this.laser.angle);
                    const dx=player.x-this.x,dy=player.y-this.y,t2=dx*vx+dy*vy;
                    if(t2>0&&t2<this.laser.length&&Math.hypot(player.x-(this.x+t2*vx),player.y-(this.y+t2*vy))<12) hitPlayerDamage(2,20);
                  }
                }
                if(this.laser.timer>=this.laser.activeTime)this.laser=null;
              }
            } else if(this.type==='cyan'){
              // 挙持不審移動
              if(this.state==='move'){
                this.x+=(this.tx-this.x)*0.04;this.y+=(this.ty-this.y)*0.04;
                if(this.stateTimer>40){this.state=Math.random()<0.4?'stop':'dash';this.stateTimer=0;}
              } else if(this.state==='stop'){
                if(this.stateTimer>20){this.tx=80+Math.random()*(W-160);this.ty=60+Math.random()*(H/2-60);this.state='move';this.stateTimer=0;}
              } else if(this.state==='dash'){
                this.x+=(this.tx-this.x)*0.18;this.y+=(this.ty-this.y)*0.18;
                if(this.stateTimer>18){this.tx=80+Math.random()*(W-160);this.ty=60+Math.random()*(H/2-60);this.state='move';this.stateTimer=0;}
              }
              this.x=Math.max(30,Math.min(W-30,this.x));this.y=Math.max(30,Math.min(H-30,this.y));
              // 16方向弾
              this.fireTimer++;
              if(this.fireTimer>=100){this.fireTimer=0;for(let i=0;i<16;i++)fireEnemy(this.x,this.y,i*Math.PI/8,3,{color:'#88ccff',glow:'#44aaff'});}
            } else if(this.type==='purple'){
              // ランダム突進→プラズマ
              if(this.state==='move'){
                this.dashTrail.unshift({x:this.x,y:this.y,alpha:0.4});if(this.dashTrail.length>8)this.dashTrail.pop();
                this.x+=(this.tx-this.x)*0.16;this.y+=(this.ty-this.y)*0.16;
                if(Math.hypot(this.x-this.tx,this.y-this.ty)<20){
                  plasmas.push({x:this.x,y:this.y,maxR:140,timer:0,isPlayer:false,lightningTimer:0,dmg:2});
                  this.state='wait';this.stateTimer=0;
                }
              } else if(this.state==='wait'){
                for(const t of this.dashTrail)t.alpha-=0.05;
                this.dashTrail=this.dashTrail.filter(t=>t.alpha>0);
                if(this.stateTimer>180){this.tx=80+Math.random()*(W-160);this.ty=60+Math.random()*(H/2-60);this.state='move';this.stateTimer=0;}
              }
            }
          },
          hit:function(d){this.hp-=d;if(this.hp<=0){this.hp=0;this.alive=false;}},
          draw:function(){
            ctx.save();
            for(const t of this.dashTrail||[]){ctx.save();ctx.globalAlpha=t.alpha*0.5;ctx.fillStyle=this.color;ctx.shadowColor=this.color;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(t.x,t.y,14,0,Math.PI*2);ctx.fill();ctx.restore();}
            ctx.fillStyle=this.color;ctx.shadowColor=this.color;ctx.shadowBlur=16;
            ctx.beginPath();ctx.arc(this.x,this.y,16,0,Math.PI*2);ctx.fill();
            if(this.laser){
              const l=this.laser;
              ctx.save();
              if(l.timer<l.warningTime){const wp=l.timer/l.warningTime;ctx.globalAlpha=0.1+0.55*wp;ctx.strokeStyle=l.color;ctx.lineWidth=1;ctx.setLineDash([]);ctx.shadowColor=l.color;ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(l.x+Math.cos(l.angle)*l.length,l.y+Math.sin(l.angle)*l.length);ctx.stroke();}
              else{const prog=(l.timer-l.warningTime)/(l.activeTime-l.warningTime);ctx.globalAlpha=0.9*(1-prog*0.5);ctx.strokeStyle=l.color;ctx.lineWidth=Math.max(1,10*(1-prog));ctx.shadowColor=l.color;ctx.shadowBlur=14;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(l.x+Math.cos(l.angle)*l.length,l.y+Math.sin(l.angle)*l.length);ctx.stroke();}
              ctx.restore();
            }
            ctx.fillStyle='#333';ctx.fillRect(this.x-18,this.y-26,36,5);
            ctx.fillStyle=this.color;ctx.fillRect(this.x-18,this.y-26,36*(this.hp/this.maxHp),5);
            ctx.restore();
          }
        });
      }
    },
    updateMinions(){for(const m of this.minions)if(m.alive)m.update();},

    hit(d){
      if(this.minionBarrier)return; 
      this.hp-=d;if(this.hp<=0){this.hp=0;this.alive=false;}
    },

    draw(){
      // トルネード残像・本体
      for(const t of this.bossTornadoes){
        for(const tr of t.trail){ctx.save();ctx.globalAlpha=tr.alpha*0.55;ctx.fillStyle=t.color;drawCrescent(ctx,tr.x,tr.y,t.size*0.85,t.t*0.22);ctx.restore();}
        ctx.save();ctx.fillStyle=t.color;ctx.shadowColor=t.color;ctx.shadowBlur=10;drawCrescent(ctx,t.x,t.y,t.size,t.t*0.22);ctx.restore();
      }
      // メテオ残像・本体
      for(const m of this.bossMeteors){
        for(const tr of m.trail){ctx.save();ctx.globalAlpha=tr.alpha*0.45;ctx.fillStyle=m.color;drawMeteorShape(ctx,tr.x,tr.y,m.size*0.75,m.angle);ctx.restore();}
        ctx.save();ctx.fillStyle=m.color;ctx.shadowColor=m.color;ctx.shadowBlur=12;drawMeteorShape(ctx,m.x,m.y,m.size,m.angle);ctx.restore();
      }
      // レーザー描画
      for(const l of this.bossLasers){
        ctx.save();
        if(l.timer<l.warningTime){const wp=l.timer/l.warningTime;ctx.globalAlpha=0.1+0.55*wp;ctx.strokeStyle=l.color;ctx.lineWidth=1;ctx.shadowColor=l.color;ctx.shadowBlur=8;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(l.x+Math.cos(l.angle)*l.length,l.y+Math.sin(l.angle)*l.length);ctx.stroke();}
        else{const prog=(l.timer-l.warningTime)/(l.activeTime-l.warningTime);ctx.globalAlpha=0.9*(1-prog*0.5);ctx.strokeStyle=l.color;ctx.lineWidth=Math.max(1,14*(1-prog));ctx.shadowColor=l.color;ctx.shadowBlur=20;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(l.x+Math.cos(l.angle)*l.length,l.y+Math.sin(l.angle)*l.length);ctx.stroke();}
        ctx.restore();
      }
      // ミニオン描画
      for(const m of this.minions)if(m.alive)m.draw();
      // バリアリング
      if(this.minionBarrier){
        ctx.save();ctx.globalAlpha=0.3+0.15*Math.sin(frameCount*0.1);
        ctx.strokeStyle='#ffffff';ctx.lineWidth=4;ctx.shadowColor='#ffffff';ctx.shadowBlur=20;
        ctx.beginPath();ctx.arc(this.x,this.y,50,0,Math.PI*2);ctx.stroke();
        ctx.restore();
      }
      // ボス本体（3色が混ざる丸）
      ctx.save();
      let sc = 1, op = 1;
      if (this.state === 'teleport_out') sc = op = 1 - (this.stateTimer / 25);
      else if (this.state === 'teleport_in') sc = op = this.stateTimer / 25;
      if (sc > 0) {
        ctx.translate(this.x, this.y);
        ctx.scale(sc, sc);
        ctx.globalAlpha = op;
        ctx.rotate(this.rotation);
        const colors = ['#ff88bb', '#88ccff', '#cc88ff'];
        for(let s = 0; s < 3; s++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 35, (Math.PI*2/3)*s, (Math.PI*2/3)*(s+1));
          ctx.closePath();
          ctx.fillStyle = colors[s];
          ctx.shadowColor = colors[s];
          ctx.shadowBlur = 15;
          ctx.fill();
        }
      }
      ctx.restore();

      if (this.hp > 0 && op > 0) drawBossHpBar(this);
    }
  };
}

// ==================== BOSS 15: リバースハーモニー ====================
function createBoss15() {
  const GC = 4, GR = 4;
  const CW = W / GC, CH = H / GR;

  function makeGrid() {
    const g = [];
    for (let r = 0; r < GR; r++)
      for (let c = 0; c < GC; c++)
        g.push((r + c) % 2);
    return g;
  }

  return {
    x: W/2, y: H/2,
    hp: loopHP(2600), maxHp: loopHP(2600),
    alive: true, color: '#ff3333',
    rotation: 0,

    introPhase: 'split',
    introTimer: 0,
    redBallX: -60,  redBallY: H/2,
    whiteBallX: W+60, whiteBallY: H/2,
    flashAlpha: 0,

    state: 'intro',
    stateTimer: 0,
    moveTimer: 0,
    tx: W/2, ty: H/2,

    domainActive: false,
    domainFlash: 0,
    grid: makeGrid(),
    savedGrid: null, // 特殊共鳴でのエリア退避用
    gridInitTime: 0,

    resonColor: -1,
    resonActive: false,
    resonTimer: 0,

    chargeVx: 0, chargeVy: 0,
    chargeTimer: 0,

    bigMeteors: [],
    meteoCnt: 0,
    phaseMeteorTimer: 0,
    phaseMeteors: [],
    chargeTrail: [],

    endAttack() {
      this.state = 'idle';
      this.stateTimer = 0;
      this.resonActive = false;
      this.resonColor = -1;
      // 特殊共鳴後にエリアを元の状態に戻す
      if (this.savedGrid) {
        this.grid = [...this.savedGrid];
        this.savedGrid = null;
      }
    },

    update() {
      this.rotation += 0.02;

      if (this.state === 'intro') {
        this.introTimer++;
        if (this.introPhase === 'split') {
          const t = Math.min(1, this.introTimer / 70);
          const ease = 1 - (1 - t) * (1 - t);
          this.redBallX   = lerp(-60,  W/2, ease);
          this.whiteBallX = lerp(W+60, W/2, ease);
          if (this.introTimer >= 70) {
            this.introPhase = 'flash'; this.introTimer = 0;
          }
        } else if (this.introPhase === 'flash') {
          this.flashAlpha = Math.max(0, 1 - this.introTimer / 30);
          if (this.introTimer === 1) {
            for (let i = 0; i < 64; i++) {
              const a = (i / 64) * Math.PI * 2;
              const spd = 3 + Math.random() * 5;
              enemyBullets.push({
                x: W/2, y: H/2,
                vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
                alive: true, decor: true,
                color: i % 2 === 0 ? '#ff3333' : '#eef6ff',
                life: 40 + Math.floor(Math.random() * 20)
              });
            }
          }
          if (this.introTimer >= 4) {
            this.introPhase = 'done'; this.introTimer = 0;
            this.x = W/2; this.y = H/2;
          }
        } else {
          if (this.introTimer >= 4) {
            this.state = 'domain'; this.stateTimer = 0;
            this.domainActive = true;
          }
        }
        return;
      }

      const isStop = ['domain','resonance','specialResonance','charge'].includes(this.state);
      if (!isStop) {
        this.x += (this.tx - this.x) * 0.025;
        this.y += (this.ty - this.y) * 0.025;
        this.moveTimer++;
        if (this.moveTimer > 20 + Math.random() * 35) {
          this.tx = 80 + Math.random() * (W - 160);
          this.ty = 80 + Math.random() * (H - 140);
          this.moveTimer = 0;
        }
      }

      if (this.state === 'domain') {
        if (this.stateTimer >= 120) {
          this.state = 'idle'; this.stateTimer = 0;
        }
      }

      // --- 通常共鳴 ---
      if (this.state === 'resonance') {
        if (this.resonTimer <= 0) {
          this.resonColor = Math.random() < 0.5 ? 0 : 1;
          this.resonTimer = 180;
          this.resonActive = true;
        }
        
        // 残り120f(2秒)で発光＆常時ダメージ判定
        if (this.resonTimer <= 120) {
          let pr = Math.floor(player.y / CH);
          let pc = Math.floor(player.x / CW);
          pr = Math.max(0, Math.min(GR - 1, pr));
          pc = Math.max(0, Math.min(GC - 1, pc));
          if (this.grid[pr * GC + pc] === this.resonColor) {
            if (player.alive && !player.invincible && player.damageTimer === 0) hitPlayerDamage(2, 30);
          }
        }

        this.resonTimer--;
        if (this.resonTimer <= 0) this.endAttack();
      }

      // --- 特殊共鳴 (新技) ---
      if (this.state === 'specialResonance') {
        if (this.resonTimer <= 0) {
          this.savedGrid = [...this.grid]; // 現在のエリアを退避
          this.resonColor = Math.random() < 0.5 ? 0 : 1;
          const safeIdx = Math.floor(Math.random() * (GC * GR)); // セーフエリアを1箇所決定
          for (let i = 0; i < GC * GR; i++) {
            // セーフエリア以外をすべて攻撃色に染める
            this.grid[i] = (i === safeIdx) ? (1 - this.resonColor) : this.resonColor;
          }
          this.resonTimer = 180;
          this.resonActive = true;
        }
        
        // 残り120f(2秒)で発光＆常時ダメージ判定
        if (this.resonTimer <= 120) {
          let pr = Math.floor(player.y / CH);
          let pc = Math.floor(player.x / CW);
          pr = Math.max(0, Math.min(GR - 1, pr));
          pc = Math.max(0, Math.min(GC - 1, pc));
          if (this.grid[pr * GC + pc] === this.resonColor) {
            if (player.alive && !player.invincible && player.damageTimer === 0) hitPlayerDamage(2, 30);
          }
        }

        this.resonTimer--;
        if (this.resonTimer <= 0) this.endAttack();
      }

      if (this.state === 'reverse') {
        if (this.stateTimer === 1) {
          for (let i = 0; i < 64; i++) {
            const a = (Math.PI * 2 / 64) * i;
            fireEnemy(this.x, this.y, a, 3, { color: '#ffffff', glow: '#ffffff'});
          }
          for (let r = 0; r < GR; r++) {
            for (let c = 0; c < GC; c++) {
              const idx = r * GC + c;
              this.grid[idx] ^= 1;
            }
          }
        }
        if (this.stateTimer >= 30) this.endAttack();
      }

      if (this.state === 'bigMeteor') {
        // --- メテオの速度・位置調整 ---
        if (this.stateTimer === 1) {
          this.meteoCnt = 0;
          this.bigMeteors.push({
            x: W + 200, y: H * 0.25, vx: -7.4, vy: 0, // 速度アップ
            angle: Math.PI,
            size: 170, life: 200, color: '#ff0000', alive: true, trail: []
          });
        }
        if (this.stateTimer === 130) {
          this.bigMeteors.push({
            x: -200, y: H * 0.75, vx: 7.4, vy: 0, // 速度アップ
            angle: 0, 
            size: 170, life: 200, color: '#ffffff', alive: true, trail: []
          });
        }
        if (this.stateTimer >= 260) this.endAttack();
      }

      if (this.state === 'charge') {
        if (this.stateTimer === 1) {
          const angle = Math.atan2(player.y - this.y, player.x - this.x);
          this.chargeVx = Math.cos(angle) * 9;
          this.chargeVy = Math.sin(angle) * 9;
          this.chargeTimer = 240;
        }
        this.x += this.chargeVx;
        this.y += this.chargeVy;
        this.chargeTrail.unshift({ x: this.x, y: this.y, alpha: 0.45 });
        if (this.chargeTrail.length > 12) this.chargeTrail.pop();

        // 突進中のプレイヤーへの当たり判定
        if (player.alive && !player.invincible && player.damageTimer === 0 && Math.hypot(player.x - this.x, player.y - this.y) < 36) {
          hitPlayerDamage(2, 30);
        }

        if (this.x < 32 || this.x > W - 32) {
          this.chargeVx *= -1;
          for (let i = 0; i < 32; i++) {
            const a = (Math.PI * 2 / 32) * i;
            fireEnemy(this.x, this.y, a, 5, { color: '#ff3333', glow: '#ff0000'});
          }
        }
        if (this.y < 32 || this.y > H - 32) {
          this.chargeVy *= -1;
          for (let i = 0; i < 32; i++) {
            const a = (Math.PI * 2 / 32) * i;
            fireEnemy(this.x, this.y, a, 5, { color: '#ff3333', glow: '#ff0000'});
          }
        }
        this.x = Math.max(32, Math.min(W - 32, this.x));
        this.y = Math.max(32, Math.min(H - 32, this.y));
        
        this.chargeTimer--;
        if (this.chargeTimer <= 0) this.endAttack();
      }

      if (this.state === 'idle') {
        if (this.stateTimer > 40) {
          const r = Math.random();
          if (r < 0.15) { this.state = 'domain'; this.stateTimer = 0; }
          else if (r < 0.35) { this.state = 'resonance'; this.stateTimer = 0; this.resonTimer = 0; }
          else if (r < 0.50) { this.state = 'specialResonance'; this.stateTimer = 0; this.resonTimer = 0; } // 新技
          else if (r < 0.65) { this.state = 'reverse'; this.stateTimer = 0; }
          else if (r < 0.85) { this.state = 'bigMeteor'; this.stateTimer = 0; }
          else { this.state = 'charge'; this.stateTimer = 0; }
        }
      }

      if (this.hp <= this.maxHp * 0.5) {
        this.phaseMeteorTimer++;
        if (this.phaseMeteorTimer >= 180) {
          this.phaseMeteorTimer = 0;
          this.spawnPhaseMeteors();
        }
      } else {
        this.phaseMeteorTimer = 0;
      }

      if (this.state !== 'charge') {
        for (const tr of this.chargeTrail) tr.alpha -= 0.04;
        this.chargeTrail = this.chargeTrail.filter(tr => tr.alpha > 0);
      }

      this.updatePhaseMeteors();
      this.updateBigMeteors();
      this.stateTimer++;
    },

    updateBigMeteors() {
      for (const m of this.bigMeteors) {
        if (!m.alive) continue;
        m.x += m.vx; m.y += m.vy;
        m.life--;
        if (m.life <= 0) m.alive = false;
        m.trail.unshift({x: m.x, y: m.y, alpha: 0.4}); 
        if (m.trail.length > 12) m.trail.pop();
        if (player.alive && !player.invincible && Math.hypot(m.x - player.x, m.y - player.y) < m.size + 12) {
          if (player.damageTimer === 0) hitPlayerDamage(2, 30);
          // 貫通（消滅させない）
        }
      }
      this.bigMeteors = this.bigMeteors.filter(m => m.alive);
    },

    spawnPhaseMeteors() {
      const colors = ['#ff3333', '#ffffff'];
      for (const color of colors) {
        const side = Math.floor(Math.random() * 4);
        let sx, sy;
        if (side === 0) { sx = Math.random() * W; sy = -60; }
        else if (side === 1) { sx = W + 60; sy = Math.random() * H; }
        else if (side === 2) { sx = Math.random() * W; sy = H + 60; }
        else { sx = -60; sy = Math.random() * H; }
        const dx = player.x - sx;
        const dy = player.y - sy;
        const len = Math.hypot(dx, dy) || 1;
        this.phaseMeteors.push({
          x: sx, y: sy,
          vx: (dx / len) * 5, vy: (dy / len) * 5,
          angle: Math.atan2(dy, dx),
          size: 58,
          color,
          trail: [],
          alive: true,
          hitSet: new Set()
        });
      }
    },

    updatePhaseMeteors() {
      for (const m of this.phaseMeteors) {
        if (!m.alive) continue;
        m.x += m.vx; m.y += m.vy;
        m.trail.unshift({ x: m.x, y: m.y, alpha: 0.4 });
        if (m.trail.length > 10) m.trail.pop();
        if (player.alive && !player.invincible && !m.hitSet.has('player') && Math.hypot(player.x - m.x, player.y - m.y) < m.size + 14) {
          hitPlayerDamage(1, 30);
          m.hitSet.add('player');
          setTimeout(() => m.hitSet.delete('player'), 400);
        }
        if (m.x < -120 || m.x > W + 120 || m.y < -120 || m.y > H + 120) m.alive = false;
      }
      this.phaseMeteors = this.phaseMeteors.filter(m => m.alive);
    },

    draw() {
      // 領域の常時表示
      if (this.domainActive) {
        for (let r = 0; r < GR; r++) {
          for (let c = 0; c < GC; c++) {
            const idx = r * GC + c;
            ctx.fillStyle = this.grid[idx] === 1 ? 'rgba(255,130,130,0.15)' : 'rgba(255,255,255,0.15)';
            ctx.fillRect(c * CW, r * CH, CW, CH);
          }
        }
      }

      if (this.state === 'intro') {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(this.redBallX, this.redBallY, 28, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#eef6ff';
        ctx.beginPath();
        ctx.arc(this.whiteBallX, this.whiteBallY, 28, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
        if (this.introPhase === 'flash') {
          ctx.save();
          ctx.globalAlpha = this.flashAlpha;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
      }

      if (this.state !== 'intro') {
        for (const m of this.bigMeteors) {
          for (const tr of m.trail) {
            ctx.save();
            ctx.globalAlpha = tr.alpha * 0.4;
            ctx.fillStyle = m.color;
            ctx.shadowColor = m.color;
            ctx.shadowBlur = 12;
            // 残像を大きく描画
            drawMeteorShape(ctx, tr.x, tr.y, m.size * 0.85, m.angle);
            ctx.restore();
          }
          ctx.save();
          ctx.fillStyle = m.color; 
          ctx.shadowColor = m.color; 
          ctx.shadowBlur = 20;
          drawMeteorShape(ctx, m.x, m.y, m.size, m.angle);
          ctx.restore();
        }

        for (const m of this.phaseMeteors) {
          for (const tr of m.trail) {
            ctx.save();
            ctx.globalAlpha = tr.alpha * 0.35;
            ctx.fillStyle = m.color;
            ctx.shadowColor = m.color;
            ctx.shadowBlur = 14;
            drawMeteorShape(ctx, tr.x, tr.y, m.size * 0.75, m.angle);
            ctx.restore();
          }
          ctx.save();
          ctx.fillStyle = m.color;
          ctx.shadowColor = m.color;
          ctx.shadowBlur = 18;
          drawMeteorShape(ctx, m.x, m.y, m.size, m.angle);
          ctx.restore();
        }

        // 共鳴発光エフェクト（予告中は薄く、判定発生中は濃く点滅）
        if (this.resonActive && this.resonColor >= 0) {
          const isWarning = this.resonTimer > 120;
          for (let r = 0; r < GR; r++) {
            for (let c = 0; c < GC; c++) {
              const idx = r * GC + c;
              if (this.grid[idx] === this.resonColor) {
                ctx.save();
                if (isWarning) {
                  ctx.globalAlpha = 0.2;
                  ctx.fillStyle = this.resonColor === 1 ? '#ff8888' : '#ffffff';
                  ctx.fillRect(c * CW, r * CH, CW, CH);
                } else {
                  ctx.globalAlpha = 0.4 + 0.2 * Math.sin(frameCount * 0.1);
                  ctx.fillStyle = this.resonColor === 1 ? '#ff3333' : '#eef6ff';
                  ctx.shadowColor = this.resonColor === 1 ? '#ff0000' : '#ffffff';
                  ctx.shadowBlur = 30;
                  ctx.fillRect(c * CW, r * CH, CW, CH);
                }
                ctx.restore();
              }
            }
          }
        }

      if (this.chargeTrail.length) {
        for (const tr of this.chargeTrail) {
          ctx.save();
          ctx.globalAlpha = tr.alpha * 0.32;
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, 28, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
        ctx.beginPath();
        ctx.arc(0, 0, 35, Math.PI, 0);
        ctx.fillStyle = '#ff3333';
        ctx.shadowColor = '#ff3333';
        ctx.shadowBlur = 24;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 24;
        ctx.fill();
        ctx.restore();
      }

      if (this.hp > 0 && this.state !== 'intro') drawBossHpBar(this);
    }
  };
}


// === BOSS 16: SUN ===
function createBoss16() {
  return {
    x: W / 2, y: -100, hp: loopHP(3000), maxHp: loopHP(3000), alive: true,
    color: '#ffea75', borderColor: '#ff8c00',
    state: 'intro', stateTimer: 0,
    attackCount: 0, maxAttacks: 3,
    lasers: [], creepingDir: 0, bombs: [],
    autoCreepTimer: 0, autoCreepActive: false, autoCreepStep: 0, autoCreepDir: 0,

    update() {
      this.stateTimer++;
      this.updateLasers();
      this.updateBombs();

      // HP半分以下の場合、3秒(180f)ごとに自動でcreeping_laserを発動（行動数にカウントしない）
      if (this.hp < this.maxHp * 0.6 && this.alive) {
        this.autoCreepTimer++;
        if (this.autoCreepActive) {
          this.autoCreepStep++;
          const t = this.autoCreepStep;
          if (t % 10 === 0 && t <= 120) {
            const p = t / 120;
            const dir = this.autoCreepDir;
            if (dir === 0) this.addLaser(0, p*(H/2), 0, W, 20, 40);
            else if (dir === 1) this.addLaser(0, H - p*(H/2), 0, W, 20, 40);
            else if (dir === 2) this.addLaser(p*(W/2), 0, Math.PI/2, H, 20, 40);
            else if (dir === 3) this.addLaser(W - p*(W/2), 0, Math.PI/2, H, 20, 40);
          }
          if (this.autoCreepStep > 130) { this.autoCreepActive = false; this.autoCreepStep = 0; }
        }
        if (this.autoCreepTimer >= 180) {
          this.autoCreepTimer = 0;
          this.autoCreepActive = true;
          this.autoCreepStep = 0;
          this.autoCreepDir = Math.floor(Math.random()*4);
        }
      }

      switch (this.state) {
        case 'intro':
          this.y += 1.5; if (this.y >= H / 3) { this.y = H / 3; this.state = 'idle'; this.stateTimer = 0; }
          break;
        case 'idle':
          if (this.stateTimer > 18) {
            if (this.attackCount >= this.maxAttacks) {
              this.state = 'teleport_out'; this.stateTimer = 0; this.attackCount = 0;
              this.maxAttacks = Math.random() < 0.5 ? 2 : 3;
            } else { this.chooseAttack(); }
          }
          break;
        case 'teleport_out':
          if (this.stateTimer > 20) {
            this.x = 80 + Math.random() * (W - 160); this.y = 80 + Math.random() * (H / 2 - 80);
            this.state = 'teleport_in'; this.stateTimer = 0;
          }
          break;
        case 'teleport_in':
          if (this.stateTimer > 20) { this.state = 'idle'; this.stateTimer = 0; }
          break;
        case 'attack_laser_16':
          if (this.stateTimer === 20 || this.stateTimer === 45 || this.stateTimer === 70) {
            let off = (this.stateTimer === 45) ? Math.PI/12 : (this.stateTimer === 70 ? Math.PI/28 : 0);
            for (let i = 0; i < 16; i++) this.addLaser(this.x, this.y, off + i*Math.PI*2/16, Math.max(W,H)*1.5, 32, 30);
          }
          if (this.stateTimer > 100) this.endAttack();
          break;
        case 'attack_32_spread':
          // ボスが4つの爆弾を順に投げる（速度違い）。投げ終わったらすぐ次の行動へ
          if (this.stateTimer === 1) { this.bombThrowCount = 0; }
          if ([8, 16, 24, 32].includes(this.stateTimer)) {
            const idx = [8,16,24,32].indexOf(this.stateTimer);
            const angle = (Math.PI * 2 / 4) * idx + Math.PI * 0.1;
            const speed = 3 + idx * 1.2;  // 速度が違う
            const fuseTime = 60 + idx * 15; // 爆発タイミングも少し違う
            this.bombs.push({ x: this.x, y: this.y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, fuseTime: fuseTime, timer: 0, alive: true });
            this.bombThrowCount++;
          }
          // 4つ投げ終わったらすぐ次の行動へ
          if (this.bombThrowCount >= 4 && this.stateTimer > 32) this.endAttack();
          break;

        case 'attack_plasma_omni': {
          // 3波: 6→8→14個のプラズマがボス周囲に輪状に出現、ダメージ2
          const waveConf = [{n:6,r:100},{n:8,r:180},{n:16,r:450}];
          if (this.stateTimer === 20 || this.stateTimer === 80 || this.stateTimer === 140) {
            const wi = this.stateTimer === 20 ? 0 : (this.stateTimer === 80 ? 1 : 2);
            const {n, r} = waveConf[wi];
            for (let i = 0; i < n; i++) {
              const a = (Math.PI*2/n)*i;
              plasmas.push({ x: this.x + Math.cos(a)*r, y: this.y + Math.sin(a)*r, maxR: 120, timer: 0, isPlayer: false, lightningTimer: 0, ringColor: '#ff8c00', dmg: 2 });
            }
          }
          if (this.stateTimer > 150) this.endAttack();
          break;
        }
        case 'attack_omni':
          if (this.stateTimer <= 60 && this.stateTimer % 2 === 0) {
            const a = this.stateTimer * 0.5;
            for (let i = 0; i < 8; i++) fireEnemy(this.x, this.y, a + i*Math.PI*4/8, 8, { color: '#ffcc00', glow: '#ff6600' });
          } else if (this.stateTimer > 70) { this.endAttack(); }
          break;
        case 'attack_creeping_laser':
          // 10フレームごとに1本ずつ連続発射し、発射後すぐに次の行動へ移る
          if (this.stateTimer === 1) {
            this.creepingDir = Math.floor(Math.random()*4);
            this.creepingCount = 0;
          }
          if (this.stateTimer % 8 === 0 && this.creepingCount < 12) {
            this.creepingCount = (this.creepingCount || 0) + 1;
            const p = this.creepingCount / 12;
            if (this.creepingDir === 0) this.addLaser(0, p*(H/2), 0, W, 20, 55);
            else if (this.creepingDir === 1) this.addLaser(0, H - p*(H/2), 0, W, 20, 55);
            else if (this.creepingDir === 2) this.addLaser(p*(W/2), 0, Math.PI/2, H, 20, 55);
            else if (this.creepingDir === 3) this.addLaser(W - p*(W/2), 0, Math.PI/2, H, 20, 55);
          }
          // 12本目を撃ち終わったらすぐ終了
          if (this.creepingCount >= 12) this.endAttack();
          break;
      }
    },

    chooseAttack() {
      const atks = ['attack_laser_16', 'attack_32_spread', 'attack_omni', 'attack_creeping_laser', 'attack_plasma_omni'];
      this.state = atks[Math.floor(Math.random() * atks.length)];
      this.stateTimer = 0;
    },

    endAttack() { this.state = 'idle'; this.stateTimer = 0; this.attackCount++; },

    updateBombs() {
      for (const b of this.bombs) {
        if (!b.alive) continue;
        b.x += b.vx; b.y += b.vy;
        b.vy += 0.12; // 重力
        // 壁バウンド
        if (b.x < 12) { b.x = 12; b.vx = Math.abs(b.vx) * 0.7; }
        if (b.x > W-12) { b.x = W-12; b.vx = -Math.abs(b.vx) * 0.7; }
        if (b.y > H-12) { b.y = H-12; b.vy = -Math.abs(b.vy) * 0.5; }
        b.timer++;
        if (b.timer >= b.fuseTime) {
          // 爆発：32方向弾を放つ
          for (let i = 0; i < 32; i++) fireEnemy(b.x, b.y, i*Math.PI*2/32, 4, { color: '#ff8c00', glow: '#ff4400' });
          b.alive = false;
        }
      }
      this.bombs = this.bombs.filter(b => b.alive);
    },

    addLaser(x, y, angle, length, width, maxTime) {
      this.lasers.push({ x, y, angle, length, width, timer: 0, warningTime: 20, activeTime: maxTime, alive: true });
    },

    updateLasers() {
      for (const l of this.lasers) {
        l.timer++;
        if (l.timer > l.warningTime && l.timer < l.activeTime && player.alive && !player.invincible) {
          const dx = player.x - l.x, dy = player.y - l.y, vx = Math.cos(l.angle), vy = Math.sin(l.angle);
          const t = dx * vx + dy * vy;
          if (t > 0 && t < l.length) {
            const dist = Math.hypot(player.x - (l.x + t*vx), player.y - (l.y + t*vy));
            if (dist < l.width/2 + 5) hitPlayerDamage(2, 30); // ダメージを2に強化
          }
        }
        if (l.timer >= l.activeTime) l.alive = false;
      }
      this.lasers = this.lasers.filter(l => l.alive);
    },

    distToSegment(px, py, x1, y1, x2, y2) {
      const l2 = Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2);
      if (l2 === 0) return Math.hypot(px-x1, py-y1);
      let t = ((px-x1)*(x2-x1) + (py-y1)*(y2-y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t*(x2-x1)), py - (y1 + t*(y2-y1)));
    },

    hit(d) {
      if (this.state === 'intro' || this.state === 'teleport_out' || this.state === 'teleport_in') return;
      this.hp -= d; if (this.hp <= 0) { this.hp = 0; this.alive = false; }
    },

    draw() {
      // 爆弾描画（シンプルな丸）
      for (const b of this.bombs) {
        if (!b.alive) continue;
        ctx.save();
        const fuseRatio = b.timer / b.fuseTime;
        ctx.fillStyle = fuseRatio > 0.7 ? '#ff4400' : '#ff8c00';
        ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
      // レーザー
// レーザーの描画部分
      for (const l of this.lasers) {
        ctx.save();
        if (l.timer <= l.warningTime) {
          // 予告線：細い輝線
          const wp = l.timer / l.warningTime;
          ctx.globalAlpha = 0.1 + 0.55 * wp;
          ctx.strokeStyle = 'rgba(255, 140, 0, 0.9)';
          ctx.lineWidth = 1;
          ctx.shadowColor = '#ff8c00'; ctx.shadowBlur = 8;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(l.x, l.y);
          ctx.lineTo(l.x + Math.cos(l.angle) * l.length, l.y + Math.sin(l.angle) * l.length);
          ctx.stroke();
        } else {
          // レーザー本体
          const w = l.width * (1 - (l.timer - l.warningTime) / (l.activeTime - l.warningTime));
          
          // 外側のオレンジ色の光
          ctx.strokeStyle = this.borderColor; // オレンジ色 (#ff8c00)
          ctx.lineWidth = w;
          ctx.shadowColor = this.borderColor;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.moveTo(l.x, l.y);
          ctx.lineTo(l.x + Math.cos(l.angle) * l.length, l.y + Math.sin(l.angle) * l.length);
          ctx.stroke();
          
        }
        ctx.restore();
      }

      // 赤いスティック描画
      if (this.hp < this.maxHp * 0.5) {
        ctx.save();
        ctx.strokeStyle = this.stickColor; ctx.lineWidth = 8; ctx.shadowBlur = 10; ctx.shadowColor = '#f00';
        for (let i = 0; i < 3; i++) {
          const ang = this.stickAngle + (i * Math.PI * 2 / 3);
          ctx.beginPath(); ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x + Math.cos(ang)*180, this.y + Math.sin(ang)*180); ctx.stroke();
        }
        ctx.restore();
      }

      // 本体
      ctx.save();
      let sc = 1, op = 1;
      if (this.state === 'teleport_out') sc = op = 1 - (this.stateTimer/30);
      else if (this.state === 'teleport_in') sc = op = this.stateTimer/30;
      if (sc > 0) {
        ctx.translate(this.x, this.y); ctx.scale(sc, sc); ctx.globalAlpha = op;
        ctx.shadowColor = this.borderColor; ctx.shadowBlur = 40 + Math.sin(frameCount*0.2)*10;
        ctx.fillStyle = this.borderColor; ctx.beginPath();
        for (let i = 0; i < 32; i++) {
          const r = (i%2===0?45:35), a = frameCount*0.02 + (i*Math.PI/16);
          ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
        }
        ctx.fill();
        ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
      if (this.hp > 0 && op > 0 && typeof drawBossHpBar === 'function') drawBossHpBar(this);
    }
  };
}

// ==================== BOSS 17: ミラージュ・コア ====================
function createBoss17() {
  const MIRROR_COUNT = 4;
  const MIRROR_DIST = 120;
  const MIRROR_RADIUS = 22;
  const MIRROR_MAX_HP = loopHP(100);
  const MIRROR_REGEN_TIME = 1200; // 全破壊後20秒で一斉復活

  function makeMirrors() {
    const arr = [];
    for (let i = 0; i < MIRROR_COUNT; i++) {
      arr.push({ hp: MIRROR_MAX_HP, alive: true, regenTimer: 0, angle: (Math.PI * 2 / MIRROR_COUNT) * i, marked: false });
    }
    return arr;
  }

  return {
    x: W / 2, y: -80, hp: loopHP(2200), maxHp: loopHP(2200), alive: true,
    color: '#c0d8ff', borderColor: '#7ab0ff',
    state: 'intro', stateTimer: 0,
    attackCount: 0, maxAttacks: 3,
    phase: 1,
    mirrorRotSpeed: 0.008,
    mirrorDist: MIRROR_DIST,
    mirrors: makeMirrors(),
    mirrorRegenCountdown: -1, // -1=非アクティブ、0以上=カウント中
    decoys: [],
    lasers: [],
    fanBullets: [],
    phaseExposeTimer: 0,
    phaseExposeDone: false,

    getPhase() {
      const r = this.hp / this.maxHp;
      if (r > 0.66) return 1;
      if (r > 0.33) return 2;
      return 3;

    },

    allMirrorsBroken() {
      return this.mirrors.every(m => !m.alive);
    },

    update() {
      this.stateTimer++;
      this.updateMirrors();
      this.updateDecoys();
      this.updateLasers();

      const newPhase = this.getPhase();
      if (newPhase !== this.phase) {
        this.phase = newPhase;
        if (this.phase === 2) this.mirrorRotSpeed = 0.016;
        if (this.phase === 3) this.mirrorRotSpeed = 0.022;
      }

      switch (this.state) {
        case 'intro':
          this.y += 1.5;
          if (this.y >= H / 3) { this.y = H / 3; this.state = 'idle'; this.stateTimer = 0; }
          break;
        case 'idle':
          if (this.stateTimer > 20) {
            if (this.attackCount >= this.maxAttacks) {
              this.state = 'teleport_out'; this.stateTimer = 0; this.attackCount = 0;
              this.maxAttacks = Math.random() < 0.5 ? 2 : 3;
            } else { this.chooseAttack(); }
          }
          break;
        case 'teleport_out':
          if (this.stateTimer > 20) {
            this.x = 80 + Math.random() * (W - 160); this.y = 80 + Math.random() * (H / 2 - 80);
            this.state = 'teleport_in'; this.stateTimer = 0;
          }
          break;
        case 'teleport_in':
          if (this.stateTimer > 20) { this.state = 'idle'; this.stateTimer = 0; }
          break;
        case 'phase4_expose':
          // 一斉破壊フラッシュ演出→60フレーム後に戦闘再開
          if (this.stateTimer > 60) { this.state = 'idle'; this.stateTimer = 0; }
          break;
        case 'attack_fan':
          if (this.stateTimer === 20 || this.stateTimer === 45 || this.stateTimer === 70) {
            const a = Math.atan2(player.y - this.y, player.x - this.x);
            const n = this.phase >= 3 ? 14 : 10;
            const spread = 0.12;
            for (let i = 0; i < n; i++) {
              const off = (i - (n - 1) / 2) * spread;
              fireEnemy(this.x, this.y, a + off, 5, { color: '#c0d8ff', glow: '#7ab0ff' });
            }
          }
          if (this.stateTimer > 90) this.endAttack();
          break;
        case 'attack_tri_laser': {
          // 3方向3連レーザー：プレイヤー方向±0.4radの3本を3回
          const shots = [20, 55, 90];
          if (shots.includes(this.stateTimer)) {
            const a = Math.atan2(player.y - this.y, player.x - this.x);
            const offsets = [-0.4, 0, 0.4];
            for (const off of offsets) {
              this.addLaser(this.x, this.y, a + off, Math.max(W, H) * 2, 16, 48);
            }
          }
          if (this.stateTimer > 130 && this.lasers.length === 0) this.endAttack();
          break;
        }
        case 'attack_decoy_spawn': {
          // ボス位置からデコイを飛ばして召喚（HP50%以上→1体、以下→2体）
          if (this.stateTimer === 10) {
            const cnt = (this.hp / this.maxHp) <= 0.5 ? 2 : 1;
            for (let i = 0; i < cnt; i++) {
              const tx = 80 + Math.random() * (W - 160);
              const ty = 60 + Math.random() * (H / 2 - 60);
              this.decoys.push(this.makeDecoy(this.x, this.y, tx, ty));
            }
          }
          if (this.stateTimer > 20) this.endAttack();
          break;
        }
        case 'attack_blowaway': {
          // 吹き飛ばし：自機を遠ざけながら周囲に弾を放つ、この間鏡片高速回転
          if (this.stateTimer === 1) { this.blowawayTimer = 120; this.blowawayBulletTimer = 0; }
          if (this.blowawayTimer > 0) {
            // 自機を遠ざける
            const dx = player.x - this.x, dy = player.y - this.y, dist = Math.hypot(dx, dy);
            if (dist > 0 && player.alive && !player.invincible) {
              player.x += (dx / dist) * 3.5; player.y += (dy / dist) * 3.5;
              player.x = Math.max(10, Math.min(W - 10, player.x));
              player.y = Math.max(10, Math.min(H - 10, player.y));
            }
            this.blowawayBulletTimer++;
            if (this.blowawayBulletTimer % 4 === 0) {
              // 64方向からランダムに選んで発射
              const numShots = 4 + Math.floor(Math.random() * 3);
              for (let i = 0; i < numShots; i++) {
                const randDir = Math.floor(Math.random() * 64);
                const a = randDir * Math.PI * 2 / 64;
                fireEnemy(this.x, this.y, a, 7 + Math.random() * 3, { color: '#c0d8ff', glow: '#7ab0ff' });
              }
            }
            this.blowawayTimer--;
          } else {
            this.endAttack();
          }
          break;
        }
        case 'attack_mirror_burst':
          if (this.stateTimer === 15) {
            for (const m of this.mirrors) {
              if (!m.alive) continue;
              const mx = this.x + Math.cos(m.angle) * MIRROR_DIST;
              const my = this.y + Math.sin(m.angle) * MIRROR_DIST;
              for (let i = 0; i < 16; i++) fireEnemy(mx, my, i * Math.PI / 4, 4, { color: '#d0b0ff', glow: '#a070ff' });
            }
          }
          if (this.stateTimer > 40) this.endAttack();
          break;
      }
    },

    chooseAttack() {
      const ph = this.phase;
      let pool = ['attack_fan', 'attack_tri_laser', 'attack_decoy_spawn', 'attack_blowaway', 'attack_mirror_burst'];
      this.state = pool[Math.floor(Math.random() * pool.length)];
      this.stateTimer = 0;
    },

    endAttack() { this.state = 'idle'; this.stateTimer = 0; this.attackCount++; },

    makeDecoy(startX, startY, tx, ty) {
      const ox = startX !== undefined ? startX : 80 + Math.random() * (W - 160);
      const oy = startY !== undefined ? startY : 60 + Math.random() * (H / 2 - 60);
      const destX = tx !== undefined ? tx : ox;
      const destY = ty !== undefined ? ty : oy;
      return {
        x: ox, y: oy, hp: loopHP(30), maxHp: loopHP(30), alive: true,
        marked: false,
        color: '#d0b0ff', borderColor: '#a070ff',
        stateTimer: 0, attackTimer: Math.floor(Math.random() * 80),
        moveTimer: 0, tx: destX, ty: destY,
        arriving: true, trail: [],
        update() {
          this.stateTimer++;
          // 召喚時の飛翔（arriving中は目標地点へ高速移動）
          if (this.arriving) {
            this.trail.unshift({ x: this.x, y: this.y, alpha: 0.55 });
            if (this.trail.length > 14) this.trail.pop();
            this.x += (this.tx - this.x) * 0.12;
            this.y += (this.ty - this.y) * 0.12;
            if (Math.hypot(this.x - this.tx, this.y - this.ty) < 6) {
              this.x = this.tx; this.y = this.ty; this.arriving = false;
            }
            return;
          }
          // 到着後は残像フェード
          for (const t of this.trail) t.alpha -= 0.04;
          this.trail = this.trail.filter(t => t.alpha > 0);

          this.moveTimer++;
          if (this.moveTimer > 50 + Math.random() * 50) {
            this.tx = 80 + Math.random() * (W - 160);
            this.ty = 60 + Math.random() * (H / 2 - 60);
            this.moveTimer = 0;
          }
          this.x += (this.tx - this.x) * 0.03;
          this.y += (this.ty - this.y) * 0.03;

          this.attackTimer++;
          if (this.attackTimer >= 110) {
            this.attackTimer = 0;
            // attack_fan 3方向のみ
            const a = Math.atan2(player.y - this.y, player.x - this.x);
            for (let i = 0; i < 3; i++) fireEnemy(this.x, this.y, a + (i - 2) * 0.18, 5, { color: '#d0b0ff', glow: '#a070ff' });
          }
          if (this.hp <= 0) {
            this.alive = false;
            for (let i = 0; i < 16; i++) fireEnemy(this.x, this.y, i * Math.PI / 8, 4, { color: '#d0b0ff', glow: '#a070ff' });
          }
        },
        hit(d) { this.hp -= d; if (this.hp < 0) this.hp = 0; },
        draw() {
          // 残像（召喚飛翔中 + 到着後フェード）
          for (const t of this.trail) {
            ctx.save(); ctx.globalAlpha = t.alpha * 0.6;
            ctx.fillStyle = '#a070ff'; ctx.shadowColor = '#a070ff'; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(t.x, t.y, 14, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          }
          ctx.save();
          const pulse = 0.85 + 0.15 * Math.sin(this.stateTimer * 0.15);
          ctx.translate(this.x, this.y); ctx.scale(pulse, pulse);
          ctx.fillStyle = this.borderColor; ctx.shadowColor = this.borderColor; ctx.shadowBlur = 20;
          ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = this.color; ctx.shadowBlur = 0;
          ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-5, -5, 4, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          // HP bar
          ctx.fillStyle = '#333'; ctx.fillRect(this.x - 18, this.y - 32, 36, 4);
          ctx.fillStyle = this.color; ctx.fillRect(this.x - 18, this.y - 32, 36 * (this.hp / this.maxHp), 4);
        }
      };
    },

    updateMirrors() {
      const blowing = this.state === 'attack_blowaway';
      const speed = blowing ? this.mirrorRotSpeed * 4 : this.mirrorRotSpeed;
      if (!this._mirrorAngleBase) this._mirrorAngleBase = 0;
      this._mirrorAngleBase += speed;
      for (let i = 0; i < this.mirrors.length; i++) {
        const m = this.mirrors[i];
        m.angle = this._mirrorAngleBase + (Math.PI * 2 / MIRROR_COUNT) * i;
        m.x = this.x + Math.cos(m.angle) * MIRROR_DIST;
        m.y = this.y + Math.sin(m.angle) * MIRROR_DIST;
      }

      // 全破壊されたらカウントダウン開始
      const allBroken = this.mirrors.every(m => !m.alive);
      if (allBroken && this.mirrorRegenCountdown < 0) {
        this.mirrorRegenCountdown = MIRROR_REGEN_TIME;
      }
      // カウントダウン中
      if (this.mirrorRegenCountdown >= 0) {
        this.mirrorRegenCountdown--;
        if (this.mirrorRegenCountdown <= 0) {
          // 一斉復活
          for (const m of this.mirrors) { m.alive = true; m.hp = MIRROR_MAX_HP; }
          this.mirrorRegenCountdown = -1;
        }
      }
    },

    updateDecoys() {
      for (const d of this.decoys) { if (d.alive) d.update(); }
      this.decoys = this.decoys.filter(d => d.alive);
    },

    addLaser(x, y, angle, length, width, maxTime) {
      this.lasers.push({ x, y, angle, length, width, timer: 0, warningTime: 22, activeTime: maxTime, alive: true });
    },

    updateLasers() {
      for (const l of this.lasers) {
        l.timer++;
        if (l.timer > l.warningTime && l.timer < l.activeTime && player.alive && !player.invincible) {
          const vx = Math.cos(l.angle), vy = Math.sin(l.angle);
          const dx = player.x - l.x, dy = player.y - l.y;
          const t = dx * vx + dy * vy;
          if (t > 0 && t < l.length) {
            const dist = Math.hypot(player.x - (l.x + t * vx), player.y - (l.y + t * vy));
            if (dist < l.width / 2 + 5) hitPlayerDamage(2, 30);
          }
        }
        if (l.timer >= l.activeTime) l.alive = false;
      }
      this.lasers = this.lasers.filter(l => l.alive);
    },

    hit(d) {
      if (this.state === 'intro' || this.state === 'teleport_out' || this.state === 'teleport_in' || this.state === 'phase4_expose') return;
      // 鏡片が1枚でも生きていれば本体無効
      if (!this.allMirrorsBroken()) return;
      this.hp -= d; if (this.hp <= 0) { this.hp = 0; this.alive = false; }
    },

    // 鏡片ヒット（外部から呼ぶ）
    hitMirror(bulletX, bulletY, dmg) {
      for (const m of this.mirrors) {
        if (!m.alive) continue;
        const mx = this.x + Math.cos(m.angle) * MIRROR_DIST;
        const my = this.y + Math.sin(m.angle) * MIRROR_DIST;
        if (Math.hypot(mx - bulletX, my - bulletY) < MIRROR_RADIUS + 6) {
          m.hp -= dmg;
          spawnDamagePopup(mx + (Math.random()-0.5)*14, my - 10, dmg, false);
          if (m.hp <= 0) { m.alive = false; }
          return true;
        }
      }
      return false;
    },

    draw() {
      // Phase4露出演出フラッシュ
      if (this.state === 'phase4_expose') {
        const alpha = Math.max(0, 0.5 - this.stateTimer / 120);
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#c0d8ff'; ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // レーザー
      for (const l of this.lasers) {
        ctx.save();
        if (l.timer <= l.warningTime) {
          ctx.globalAlpha = 0.1 + 0.6 * (l.timer / l.warningTime);
          ctx.strokeStyle = '#c0d8ff'; ctx.lineWidth = 1; ctx.shadowColor = '#7ab0ff'; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + Math.cos(l.angle) * l.length, l.y + Math.sin(l.angle) * l.length); ctx.stroke();
        } else {
          const prog = (l.timer - l.warningTime) / (l.activeTime - l.warningTime);
          ctx.globalAlpha = 0.9 * (1 - prog * 0.5);
          ctx.strokeStyle = '#c0d8ff'; ctx.lineWidth = Math.max(1, l.width * (1 - prog));
          ctx.shadowColor = '#c0d8ff'; ctx.shadowBlur = 20; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + Math.cos(l.angle) * l.length, l.y + Math.sin(l.angle) * l.length); ctx.stroke();
        }
        ctx.restore();
      }

      // デコイ
      for (const d of this.decoys) { if (d.alive) d.draw(); }

      // 鏡片
      for (const m of this.mirrors) {
        if (!m.alive) continue;
        const mx = this.x + Math.cos(m.angle) * MIRROR_DIST;
        const my = this.y + Math.sin(m.angle) * MIRROR_DIST;
        ctx.save();
        const hpRatio = m.hp / MIRROR_MAX_HP;
        const glow = hpRatio > 0.6 ? '#aaccff' : hpRatio > 0.3 ? '#ffcc88' : '#ff6666';
        ctx.fillStyle = '#ddeeff'; ctx.shadowColor = glow; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(mx, my, MIRROR_RADIUS, 0, Math.PI * 2); ctx.fill();
        // 亀裂表現（HP低下で線が入る）
        if (hpRatio < 0.7) {
          ctx.strokeStyle = glow; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
          ctx.beginPath(); ctx.moveTo(mx - 8, my - 6); ctx.lineTo(mx + 5, my + 8); ctx.stroke();
        }
        if (hpRatio < 0.4) {
          ctx.beginPath(); ctx.moveTo(mx + 6, my - 10); ctx.lineTo(mx - 4, my + 5); ctx.stroke();
        }
        // HPゲージ（鏡片下）
        ctx.globalAlpha = 1; ctx.fillStyle = '#334'; ctx.fillRect(mx - 16, my + 26, 32, 3);
        ctx.fillStyle = glow; ctx.fillRect(mx - 16, my + 26, 32 * hpRatio, 3);
        ctx.restore();
      }

      // 本体
      ctx.save();
      let sc = 1, op = 1;
      if (this.state === 'teleport_out') { sc = op = 1 - (this.stateTimer / 20); }
      else if (this.state === 'teleport_in') { sc = op = this.stateTimer / 20; }
      if (sc > 0) {
        ctx.translate(this.x, this.y); ctx.scale(sc, sc); ctx.globalAlpha = op;
        const isExposed = this.allMirrorsBroken();
        const glowCol = isExposed ? '#ffffff' : this.borderColor;

        // 無敵シールド発光（鏡片が生きている間）
        if (!isExposed) {
          const shieldPulse = 0.25 + 0.18 * Math.sin(frameCount * 0.18);
          ctx.save();
          ctx.globalAlpha = op * shieldPulse;
          ctx.strokeStyle = '#7ab0ff'; ctx.lineWidth = 6; ctx.shadowColor = '#7ab0ff'; ctx.shadowBlur = 30;
          ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = op * shieldPulse * 0.5;
          ctx.strokeStyle = '#c0d8ff'; ctx.lineWidth = 3; ctx.shadowBlur = 16;
          ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }

        ctx.globalAlpha = op;
        ctx.shadowColor = glowCol; ctx.shadowBlur = isExposed ? 50 + Math.sin(frameCount * 0.3) * 15 : 30;
        // 外縁：菱形リング
        ctx.strokeStyle = this.borderColor; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? 38 : 28;
          const a = frameCount * 0.012 + i * Math.PI / 4;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.stroke();
        // コア
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
        // 中心光点
        ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      if (this.hp > 0 && op > 0 && typeof drawBossHpBar === 'function') drawBossHpBar(this);
    }
  };
}

// ==================== BOSS 18: アーカイヴ・セラフ ====================
function createBoss18() {
  const NODE_DIST = 150;
  const NODE_CONFIGS = [
    { color: '#ff4444', borderColor: '#ff0000', role: 'red',    label: '弾速+' },
    { color: '#cc44ff', borderColor: '#9900ff', role: 'purple', label: 'レーザー' },
    { color: '#ffd700', borderColor: '#cc9900', role: 'gold',   label: '回復' },
    { color: '#4488ff', borderColor: '#0044ff', role: 'blue',   label: 'プラズマ' },
  ];

  function makeNodes() {
    return NODE_CONFIGS.map((cfg, i) => ({
      ...cfg,
      angle: (Math.PI * 2 / 4) * i,
      hp: loopHP(300), maxHp: loopHP(300), alive: true,
      effectTimer: 0, flashTimer: 0,
      // 解放モード用
      released: false, vx: 0, vy: 0, nx: 0, ny: 0, trail: [],
    }));
  }

  // フェーズごとの主要色とRECORDテキスト
  const PHASE_COLORS = ['#FFFFFF', '#9933ff', '#ff3333', '#ffea75'];
  const PHASE_NAMES  = ['ECLIPSE', 'DREAM STORM', 'REVERSE HARMONY', 'RADIANCE'];

  return {
    x: W / 2, y: -80, hp: loopHP(6000), maxHp: loopHP(6000), alive: true,
    color: '#ffd700', borderColor: '#9933ff',
    state: 'intro', stateTimer: 0,
    attackCount: 0, maxAttacks: 2,
    phase: 1,
    nodes: makeNodes(),
    isFinal: false,

    // Phase1（13系）用
    convergeBullets: [], bubbles: [], rampageLasers: [],
    // Phase2（14系）用
    bossTornadoes: [], bossMeteors: [], bossLasers: [],
    fanStep: 0, fanBaseAngle: 0, meteorStep: 0,
    // Phase3（15系）用
    bigMeteors: [], chargeVx: 0, chargeVy: 0, chargeTimer: 0, chargeTrail: [],
    // Phase4/Final（16系）用
    lasers16: [], creepingCount: 0, creepingDir: 0,
    // フェーズ演出
    phaseAnnounce: false, phaseAnnounceTimer: 0, phaseAnnounceText: '',
    phaseAnnounceColor: '#ffffff',
    // 紫ノード用
    purpleNodeTimer: 0,
    // 青ノード用
    blueNodeTimer: 0,
    // 金ノード用
    goldNodeTimer: 0,

    getPhase() {
      if (this.isFinal) return 5;
      const r = this.hp / this.maxHp;
      if (r > 0.875) return 1;
      if (r > 0.75) return 2;
      if (r > 0.625) return 3;
      if (r > 0.50) return 4;
      return 5;
    },

    update() {
      this.stateTimer++;
      this.updateNodes();
      this.updateNodeEffects();
      this.updateConvergeBullets();
      this.updateBubbles();
      this.updateRampageLasers();
      this.updateBossTornadoes();
      this.updateBossMeteors();
      this.updateBossLasers();
      this.updateBigMeteors();
      this.updateLasers16();

      // フェーズ移行チェック
      const newPhase = this.getPhase();
      if (!this.isFinal && newPhase !== this.phase) {
        this.phase = newPhase;
        this.triggerPhaseAnnounce(this.phase);
        this.state = 'phase_announce'; this.stateTimer = 0;
        this.attackCount = 0;
        return;
      }
      // Final突入（HP3000以下）
      if (!this.isFinal && this.hp <= loopHP(3000)) {
        this.isFinal = true; this.phase = 5;
        this.triggerPhaseAnnounce(5);
        this.state = 'phase_announce'; this.stateTimer = 0;
        this.attackCount = 0;
        return;
      }

      if (this.state === 'phase_announce') {
        if (this.stateTimer > 120) { this.state = 'idle'; this.stateTimer = 0; }
        return;
      }

      switch (this.state) {
        case 'intro':
          this.y += 1.5;
          if (this.y >= H / 3) { this.y = H / 3; this.triggerPhaseAnnounce(1); this.state = 'phase_announce'; this.stateTimer = 0; }
          break;
        case 'idle':
          if (this.stateTimer > 20) {
            if (this.attackCount >= this.maxAttacks) {
              this.state = 'teleport_out'; this.stateTimer = 0; this.attackCount = 0;
              this.maxAttacks = this.isFinal ? 1 : (Math.random() < 0.5 ? 2 : 3);
            } else { this.chooseAttack(); }
          }
          break;
        case 'teleport_out':
          if (this.stateTimer > 20) {
            this.x = 80 + Math.random() * (W - 160); this.y = 80 + Math.random() * (H / 2 - 80);
            this.state = 'teleport_in'; this.stateTimer = 0;
          }
          break;
        case 'teleport_in':
          if (this.stateTimer > 20) { this.state = 'idle'; this.stateTimer = 0; }
          break;

        // === Phase1: ECLIPSE系 ===
        case 'atk_blackhole':
          if (this.stateTimer < 150) {
            const dx = this.x - player.x, dy = this.y - player.y, dist = Math.hypot(dx, dy);
            if (dist > 0 && !player.invincible) { player.x += (dx / dist) * 2.0; player.y += (dy / dist) * 2.0; }
            if (this.stateTimer % 2 === 0) {
              const a = Math.random() * Math.PI * 3, R = 600;
              this.convergeBullets.push({ x: this.x + Math.cos(a) * R, y: this.y + Math.sin(a) * R, vx: Math.cos(a + Math.PI) * 8, vy: Math.sin(a + Math.PI) * 8, speed: 8, alive: true });
            }
          } else { this.state = 'atk_bubble'; this.stateTimer = 0; return; }
          break;
        case 'atk_bubble':
          if (this.stateTimer === 10) {
            const a = Math.atan2(player.y - this.y, player.x - this.x);
            this.bubbles.push({ x: this.x, y: this.y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, radius: 60, minRadius: 15, reflectRemaining: 4, alive: true, trail: [], burst: false, burstTimer: 0, burstParticles: [] });
          }
          if (this.stateTimer > 15) this.endAttack();
          break;
        case 'atk_converge':
          if (this.stateTimer === 30 || this.stateTimer === 60 || this.stateTimer === 90) {
            const a = Math.random() * Math.PI;
            const R = 600;
            for (let i = 0; i < 32; i++) {
              const ang = a + (i * Math.PI * 2 / 32);
              this.convergeBullets.push({ x: this.x + Math.cos(ang) * R, y: this.y + Math.sin(ang) * R, vx: Math.cos(ang + Math.PI) * 7, vy: Math.sin(ang + Math.PI) * 7, speed: 7, alive: true });
            }
          }
          if (this.stateTimer > 180) this.endAttack();
          break;
        case 'atk_rampage_laser':
          if (this.stateTimer === 1) this.rampageLaserStep = 0;
          if ((this.rampageLaserStep || 0) < 32 && this.stateTimer % 4 === 0) {
            const ang = Math.random() * Math.PI * 2;
            this.rampageLasers.push({ x: this.x, y: this.y, angle: ang, length: Math.max(W, H) * 2, timer: 0, warningTime: 20, activeTime: 50, alive: true });
            this.rampageLaserStep = (this.rampageLaserStep || 0) + 1;
          }
          if ((this.rampageLaserStep || 0) >= 32 && this.rampageLasers.length === 0) this.endAttack();
          break;

        // === Phase2: DREAM STORM系 ===
        case 'atk_tornado':
          if ([10, 30, 50].includes(this.stateTimer)) {
            const colors = ['#ff88bb', '#88ccff', '#cc88ff'];
            const ci = [10, 30, 50].indexOf(this.stateTimer);
            this.fireBossTornado(colors[ci]);
          }
          if (this.stateTimer > 55) this.endAttack();
          break;
        case 'atk_meteor':
          if (this.stateTimer === 1) this.meteorStep = 0;
          if (this.meteorStep < 6 && this.stateTimer % 18 === 0) {
            const colors = ['#ff88bb', '#88ccff', '#cc88ff', '#ff88bb', '#88ccff', '#cc88ff'];
            this.fireBossMeteor(colors[this.meteorStep], this.meteorStep);
            this.meteorStep++;
          }
          if (this.meteorStep >= 6 && this.bossMeteors.length === 0) this.endAttack();
          break;
        case 'atk_fan_laser':
          if (this.stateTimer === 1) { this.fanStep = 0; this.fanBaseAngle = Math.atan2(player.y - this.y, player.x - this.x); }
          if (this.fanStep < 7 && this.stateTimer % 15 === 0) {
            const spread = this.fanStep * 0.22;
            if (this.fanStep === 0) {
              this.bossLasers.push({ x: this.x, y: this.y, angle: this.fanBaseAngle, length: Math.max(W, H) * 2, timer: 0, warningTime: 45, activeTime: 60, alive: true, color: '#ffd700', dmg: 2 });
            } else {
              this.bossLasers.push({ x: this.x, y: this.y, angle: this.fanBaseAngle - spread, length: Math.max(W, H) * 2, timer: 0, warningTime: 55, activeTime: 70, alive: true, color: '#ffd700', dmg: 2 });
              this.bossLasers.push({ x: this.x, y: this.y, angle: this.fanBaseAngle + spread, length: Math.max(W, H) * 2, timer: 0, warningTime: 55, activeTime: 70, alive: true, color: '#ffd700', dmg: 2 });
            }
            this.fanStep++;
          }
          if (this.fanStep >= 7 && this.bossLasers.length === 0) this.endAttack();
          break;

        // === Phase3: REVERSE HARMONY系 ===
        case 'atk_bigMeteor':
          if (this.stateTimer === 1) {
            this.bigMeteors.push({ x: W + 200, y: H * 0.25, vx: -7.4, vy: 0, angle: Math.PI, size: 170, life: 200, color: '#ff3333', alive: true, trail: [] });
          }
          if (this.stateTimer === 130) {
            this.bigMeteors.push({ x: -200, y: H * 0.75, vx: 7.4, vy: 0, angle: 0, size: 170, life: 200, color: '#ffd700', alive: true, trail: [] });
          }
          if (this.stateTimer >= 260) this.endAttack();
          break;
        case 'atk_reverse':
          if (this.stateTimer === 1) {
            for (let i = 0; i < 64; i++) { const a = (Math.PI * 2 / 64) * i; fireEnemy(this.x, this.y, a, 3, { color: '#ffd700', glow: '#9933ff' }); }
          }
          if (this.stateTimer >= 30) this.endAttack();
          break;
        case 'atk_charge':
          if (this.stateTimer === 1) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.chargeVx = Math.cos(angle) * 9; this.chargeVy = Math.sin(angle) * 9; this.chargeTimer = 220;
          }
          this.x += this.chargeVx; this.y += this.chargeVy;
          this.chargeTrail.unshift({ x: this.x, y: this.y, alpha: 0.4 });
          if (this.chargeTrail.length > 12) this.chargeTrail.pop();
          // 突進中のプレイヤーへの当たり判定
          if (player.alive && !player.invincible && player.damageTimer === 0 && Math.hypot(player.x - this.x, player.y - this.y) < 36) {
            hitPlayerDamage(2, 30);
          }
          if (this.x < 32 || this.x > W - 32) {
            this.chargeVx *= -1;
            for (let i = 0; i < 24; i++) fireEnemy(this.x, this.y, i * Math.PI * 2 / 24, 4, { color: '#ffd700', glow: '#9933ff' });
          }
          if (this.y < 32 || this.y > H - 32) {
            this.chargeVy *= -1;
            for (let i = 0; i < 24; i++) fireEnemy(this.x, this.y, i * Math.PI * 2 / 24, 4, { color: '#ffd700', glow: '#9933ff' });
          }
          this.x = Math.max(32, Math.min(W - 32, this.x));
          this.y = Math.max(32, Math.min(H - 32, this.y));
          this.chargeTimer--;
          if (this.chargeTimer <= 0) this.endAttack();
          break;

        // === Phase4/Final: RADIANCE系 ===
        case 'atk_laser_16':
          if (this.stateTimer === 20 || this.stateTimer === 45 || this.stateTimer === 70) {
            const off = this.stateTimer === 45 ? Math.PI / 12 : this.stateTimer === 70 ? Math.PI / 28 : 0;
            for (let i = 0; i < 16; i++) this.addLaser16(this.x, this.y, off + i * Math.PI * 2 / 16, Math.max(W, H) * 1.5, 32, 30);
          }
          if (this.stateTimer > 100) this.endAttack();
          break;
        case 'atk_plasma_omni': {
          const waveConf = [{ n: 6, r: 100 }, { n: 8, r: 180 }, { n: 16, r: 450 }];
          if (this.stateTimer === 20 || this.stateTimer === 80 || this.stateTimer === 140) {
            const wi = this.stateTimer === 20 ? 0 : this.stateTimer === 80 ? 1 : 2;
            const { n, r } = waveConf[wi];
            for (let i = 0; i < n; i++) {
              const a = (Math.PI * 2 / n) * i;
              plasmas.push({ x: this.x + Math.cos(a) * r, y: this.y + Math.sin(a) * r, maxR: 120, timer: 0, isPlayer: false, lightningTimer: 0, ringColor: '#ffd700', dmg: 2 });
            }
          }
          if (this.stateTimer > 150) this.endAttack();
          break;
        }
        case 'atk_creeping_laser':
          if (this.stateTimer === 1) { this.creepingDir = Math.floor(Math.random() * 4); this.creepingCount = 0; }
          if (this.stateTimer % 8 === 0 && this.creepingCount < 12) {
            this.creepingCount++;
            const p = this.creepingCount / 12;
            if (this.creepingDir === 0) this.addLaser16(0, p * (H / 2), 0, W, 20, 55);
            else if (this.creepingDir === 1) this.addLaser16(0, H - p * (H / 2), 0, W, 20, 55);
            else if (this.creepingDir === 2) this.addLaser16(p * (W / 2), 0, Math.PI / 2, H, 20, 55);
            else this.addLaser16(W - p * (W / 2), 0, Math.PI / 2, H, 20, 55);
          }
          if (this.creepingCount >= 12) this.endAttack();
          break;
      }

      // chargeTrailのフェード（突進以外）
      if (this.state !== 'atk_charge') {
        for (const tr of this.chargeTrail) tr.alpha -= 0.04;
        this.chargeTrail = this.chargeTrail.filter(tr => tr.alpha > 0);
      }
    },

    triggerPhaseAnnounce(ph) {
      this.phaseAnnounce = true; this.phaseAnnounceTimer = 120;
      if (ph === 5) {
        this.phaseAnnounceText = 'ARCHIVE BREAK';
        this.phaseAnnounceColor = '#ffffff';
      } else {
        this.phaseAnnounceText = `RECORD ${12 + ph} — ${PHASE_NAMES[ph - 1]}`;
        this.phaseAnnounceColor = PHASE_COLORS[ph - 1];
      }
    },

    chooseAttack() {
      const ph = this.phase;
      let pool;
      if (ph === 1) pool = ['atk_blackhole', 'atk_converge', 'atk_rampage_laser'];
      else if (ph === 2) pool = ['atk_tornado', 'atk_meteor', 'atk_fan_laser'];
      else if (ph === 3) pool = ['atk_bigMeteor', 'atk_reverse', 'atk_charge'];
      else if (ph === 4) pool = ['atk_laser_16', 'atk_plasma_omni', 'atk_creeping_laser'];
      else pool = ['atk_blackhole', 'atk_rampage_laser', 'atk_converge', 'atk_tornado','atk_meteor', 'atk_fan_laser', 'atk_bigMeteor','atk_reverse', 'atk_charge', 'atk_laser_16', 'atk_plasma_omni', 'atk_creeping_laser'];
      this.state = pool[Math.floor(Math.random() * pool.length)];
      this.stateTimer = 0;
    },

    endAttack() { this.state = 'idle'; this.stateTimer = 0; this.attackCount++; },

    updateNodes() {
      const isReleased = (this.hp / this.maxHp) <= 0.5;

      if (!isReleased) {
        // 通常モード：ボス周回 + 定期16方向弾
        const rotBase = frameCount * 0.01;
        for (let i = 0; i < this.nodes.length; i++) {
          const n = this.nodes[i];
          n.angle = rotBase + (Math.PI * 2 / 4) * i;
          n.nx = this.x + Math.cos(n.angle) * NODE_DIST;
          n.ny = this.y + Math.sin(n.angle) * NODE_DIST;
          n.released = false;
        }
        // 定期射撃
        if (!this._nodeShootTimer) this._nodeShootTimer = 0;
        if (!this._nodeShootIndex) this._nodeShootIndex = 0;
        this._nodeShootTimer++;
        const shootInterval = 180;
        if (this._nodeShootTimer >= shootInterval) {
          this._nodeShootTimer = 0;
          const n = this.nodes[this._nodeShootIndex % 4];
          const nx = n.nx || (this.x + Math.cos(n.angle) * NODE_DIST);
          const ny = n.ny || (this.y + Math.sin(n.angle) * NODE_DIST);
          for (let i = 0; i < 16; i++) {
            fireEnemy(nx, ny, i * Math.PI / 8, 3.5, { color: n.color, glow: n.borderColor });
          }
          n.flashTimer = 25;
          this._nodeShootIndex++;
        }
        for (const n of this.nodes) { if (n.flashTimer > 0) n.flashTimer--; }
      } else {
        // 解放モード：各ノードがランダム方向に突進・壁反射
        for (let i = 0; i < this.nodes.length; i++) {
          const n = this.nodes[i];
          if (!n.released) {
            // 解放初期化：ランダムな方向へ
            n.released = true;
            n.nx = this.x + Math.cos(n.angle) * NODE_DIST;
            n.ny = this.y + Math.sin(n.angle) * NODE_DIST;
            const spd = 4.5;
            const randAngle = Math.random() * Math.PI * 2;
            n.vx = Math.cos(randAngle) * spd;
            n.vy = Math.sin(randAngle) * spd;
            n.trail = [];
          }
          // 残像
          n.trail.unshift({ x: n.nx, y: n.ny, alpha: 0.5 });
          if (n.trail.length > 18) n.trail.pop();
          for (const t of n.trail) t.alpha -= 0.025;
          n.trail = n.trail.filter(t => t.alpha > 0);
          // 移動
          n.nx += n.vx; n.ny += n.vy;
          // 壁反射（50%で変則反射）
          const spd = Math.hypot(n.vx, n.vy);
          if (n.nx < 20) {
            n.nx = 20;
            if (Math.random() < 0.5) {
              // 変則：右向き成分を保ちつつY方向をランダム
              n.vx = Math.abs(n.vx);
              n.vy = (Math.random() * 2 - 1) * spd * 0.9;
              const s2 = Math.hypot(n.vx, n.vy) || 1;
              n.vx = n.vx / s2 * spd; n.vy = n.vy / s2 * spd;
            } else { n.vx = Math.abs(n.vx); }
          }
          if (n.nx > W - 20) {
            n.nx = W - 20;
            if (Math.random() < 0.5) {
              n.vx = -Math.abs(n.vx);
              n.vy = (Math.random() * 2 - 1) * spd * 0.9;
              const s2 = Math.hypot(n.vx, n.vy) || 1;
              n.vx = n.vx / s2 * spd; n.vy = n.vy / s2 * spd;
            } else { n.vx = -Math.abs(n.vx); }
          }
          if (n.ny < 20) {
            n.ny = 20;
            if (Math.random() < 0.5) {
              n.vy = Math.abs(n.vy);
              n.vx = (Math.random() * 2 - 1) * spd * 0.9;
              const s2 = Math.hypot(n.vx, n.vy) || 1;
              n.vx = n.vx / s2 * spd; n.vy = n.vy / s2 * spd;
            } else { n.vy = Math.abs(n.vy); }
          }
          if (n.ny > H - 20) {
            n.ny = H - 20;
            if (Math.random() < 0.5) {
              n.vy = -Math.abs(n.vy);
              n.vx = (Math.random() * 2 - 1) * spd * 0.9;
              const s2 = Math.hypot(n.vx, n.vy) || 1;
              n.vx = n.vx / s2 * spd; n.vy = n.vy / s2 * spd;
            } else { n.vy = -Math.abs(n.vy); }
          }
          // プレイヤーへの当たり判定（1ダメ）
          if (player.alive && !player.invincible && player.damageTimer === 0 && Math.hypot(player.x - n.nx, player.y - n.ny) < 22) {
            hitPlayerDamage(1, 30);
          }
        }
      }
    },

    updateNodeEffects() {
      // ノード効果は廃止。updateNodes内で処理。
    },

    hitNode(bx, by, dmg) {
      // ノードはダメージを受けるが破壊不可（肉壁として機能）
      for (const n of this.nodes) {
        const nx = n.released ? n.nx : (this.x + Math.cos(n.angle) * NODE_DIST);
        const ny = n.released ? n.ny : (this.y + Math.sin(n.angle) * NODE_DIST);
        if (Math.hypot(nx - bx, ny - by) < 22) {
          return true;
        }
      }
      return false;
    },

    // Phase1系 update
    updateConvergeBullets() {
      for (const b of this.convergeBullets) {
        if (!b.alive) continue;
        b.x += b.vx; b.y += b.vy;
        if (Math.hypot(b.x - this.x, b.y - this.y) < b.speed + 5) b.alive = false;
        if (player.alive && !player.invincible && Math.hypot(player.x - b.x, player.y - b.y) < 10) hitPlayerDamage(1, 30);
      }
      this.convergeBullets = this.convergeBullets.filter(b => b.alive);
    },
    updateBubbles() {
      for (const s of this.bubbles) {
        if (!s.alive) continue;
        s.trail = s.trail || [];
        s.trail.unshift({ x: s.x, y: s.y, alpha: 0.25 });
        if (s.trail.length > 10) s.trail.pop();
        if (s.burst) {
          s.burstTimer--;
          for (const p of s.burstParticles) { p.x += Math.cos(p.angle) * p.speed; p.y += Math.sin(p.angle) * p.speed; p.alpha *= 0.88; }
          if (s.burstTimer <= 0) s.alive = false;
          continue;
        }
        s.x += s.vx; s.y += s.vy;
        let ref = false, wall = false;
        if (s.x - s.radius < 0) { wall = true; if (s.reflectRemaining > 0) { s.x = s.radius; s.vx = Math.abs(s.vx); ref = true; } }
        if (s.x + s.radius > W) { wall = true; if (s.reflectRemaining > 0) { s.x = W - s.radius; s.vx = -Math.abs(s.vx); ref = true; } }
        if (s.y - s.radius < 0) { wall = true; if (s.reflectRemaining > 0) { s.y = s.radius; s.vy = Math.abs(s.vy); ref = true; } }
        if (s.y + s.radius > H) { wall = true; if (s.reflectRemaining > 0) { s.y = H - s.radius; s.vy = -Math.abs(s.vy); ref = true; } }
        if (ref) {
          const nr = Math.max(s.minRadius, s.radius * 0.7), sp = Math.hypot(s.vx, s.vy), ang = Math.atan2(s.vy, s.vx) + Math.PI / 3;
          this.bubbles.push({ x: s.x, y: s.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, radius: nr, minRadius: s.minRadius, reflectRemaining: s.reflectRemaining - 1, alive: true, trail: [], burst: false, burstTimer: 0, burstParticles: [] });
          s.radius = nr; s.reflectRemaining--;
        }
        if (wall && !ref && !s.burst) {
          s.burst = true; s.burstTimer = 14; s.burstParticles = [];
          for (let i = 0; i < 12; i++) s.burstParticles.push({ x: 0, y: 0, angle: (Math.PI * 2 / 12) * i, speed: 2 + Math.random() * 3, alpha: 1 });
          s.vx = 0; s.vy = 0;
        }
        if (player.alive && !player.invincible && Math.hypot(player.x - s.x, player.y - s.y) < s.radius + 16) hitPlayerDamage(1, 30);
      }
      this.bubbles = this.bubbles.filter(s => s.alive);
    },
    updateRampageLasers() {
      for (const l of this.rampageLasers) {
        l.timer++;
        if (l.timer >= l.warningTime && l.timer < l.activeTime && player.alive && !player.invincible) {
          const vx = Math.cos(l.angle), vy = Math.sin(l.angle), dx = player.x - l.x, dy = player.y - l.y, t = dx * vx + dy * vy;
          if (t > 0 && t < l.length && Math.hypot(player.x - (l.x + t * vx), player.y - (l.y + t * vy)) < 10) hitPlayerDamage(2, 20);
        }
        if (l.timer >= l.activeTime) l.alive = false;
      }
      this.rampageLasers = this.rampageLasers.filter(l => l.alive);
    },

    // Phase2系 update
    fireBossTornado(color) {
      const angle = Math.random() * Math.PI * 2;
      this.bossTornadoes.push({ x: this.x, y: this.y, originX: this.x, originY: this.y, baseAngle: angle, t: 0, size: 22, speed: 0.55, color, trail: [], alive: true, hitSet: new Set() });
    },
    fireBossMeteor(color, idx) {
      const side = idx % 4;
      let sx, sy;
      if (side === 0) { sx = Math.random() * W; sy = -50; }
      else if (side === 1) { sx = W + 50; sy = Math.random() * H; }
      else if (side === 2) { sx = Math.random() * W; sy = H + 50; }
      else { sx = -50; sy = Math.random() * H; }
      const dx = player.x - sx, dy = player.y - sy, len = Math.hypot(dx, dy) || 1;
      this.bossMeteors.push({ x: sx, y: sy, vx: (dx / len) * 6, vy: (dy / len) * 6, angle: Math.atan2(dy, dx), size: 44, color, trail: [], alive: true, hitSet: new Set() });
    },
    updateBossTornadoes() {
      for (const t of this.bossTornadoes) {
        if (!t.alive) continue;
        t.t++;
        const r = t.speed * t.t * 1.6, angle = t.baseAngle + t.t * 0.06;
        t.x = t.originX + Math.cos(angle) * r; t.y = t.originY + Math.sin(angle) * r;
        t.trail.unshift({ x: t.x, y: t.y, alpha: 0.32 }); if (t.trail.length > 7) t.trail.pop();
        if (r > Math.max(W, H) * 0.75 || t.t > 500) { t.alive = false; continue; }
        if (player.alive && !player.invincible && !t.hitSet.has('p') && Math.hypot(player.x - t.x, player.y - t.y) < t.size + 14) {
          hitPlayerDamage(1, 30); t.hitSet.add('p'); setTimeout(() => t.hitSet.delete('p'), 500);
        }
      }
      this.bossTornadoes = this.bossTornadoes.filter(t => t.alive);
    },
    updateBossMeteors() {
      for (const m of this.bossMeteors) {
        if (!m.alive) continue;
        m.x += m.vx; m.y += m.vy;
        m.trail.unshift({ x: m.x, y: m.y, alpha: 0.38 }); if (m.trail.length > 9) m.trail.pop();
        if (!m.hitSet) m.hitSet = new Set();
        if (player.alive && !player.invincible && !m.hitSet.has('p') && Math.hypot(player.x - m.x, player.y - m.y) < m.size + 16) {
          hitPlayerDamage(1, 30); m.hitSet.add('p'); setTimeout(() => m.hitSet.delete('p'), 400);
        }
        if (m.x < -120 || m.x > W + 120 || m.y < -120 || m.y > H + 120) m.alive = false;
      }
      this.bossMeteors = this.bossMeteors.filter(m => m.alive);
    },
    updateBossLasers() {
      for (const l of this.bossLasers) {
        l.timer++;
        if (l.timer >= l.warningTime && l.timer < l.activeTime && player.alive && !player.invincible) {
          const vx = Math.cos(l.angle), vy = Math.sin(l.angle), dx = player.x - l.x, dy = player.y - l.y, t2 = dx * vx + dy * vy;
          if (t2 > 0 && t2 < l.length && Math.hypot(player.x - (l.x + t2 * vx), player.y - (l.y + t2 * vy)) < 12) hitPlayerDamage(l.dmg, 30);
        }
        if (l.timer >= l.activeTime) l.alive = false;
      }
      this.bossLasers = this.bossLasers.filter(l => l.alive);
    },

    // Phase3系 update
    updateBigMeteors() {
      for (const m of this.bigMeteors) {
        if (!m.alive) continue;
        m.x += m.vx; m.y += m.vy; m.life--;
        if (m.life <= 0) m.alive = false;
        m.trail.unshift({ x: m.x, y: m.y, alpha: 0.4 }); if (m.trail.length > 12) m.trail.pop();
        if (player.alive && !player.invincible && Math.hypot(m.x - player.x, m.y - player.y) < m.size + 12) {
          if (player.damageTimer === 0) hitPlayerDamage(2, 30);
        }
      }
      this.bigMeteors = this.bigMeteors.filter(m => m.alive);
    },

    // Phase4系 update
    addLaser16(x, y, angle, length, width, maxTime) {
      this.lasers16.push({ x, y, angle, length, width, timer: 0, warningTime: 20, activeTime: maxTime, alive: true });
    },
    updateLasers16() {
      for (const l of this.lasers16) {
        l.timer++;
        if (l.timer > l.warningTime && l.timer < l.activeTime && player.alive && !player.invincible) {
          const vx = Math.cos(l.angle), vy = Math.sin(l.angle), dx = player.x - l.x, dy = player.y - l.y, t = dx * vx + dy * vy;
          if (t > 0 && t < l.length && Math.hypot(player.x - (l.x + t * vx), player.y - (l.y + t * vy)) < l.width / 2 + 5) hitPlayerDamage(2, 30);
        }
        if (l.timer >= l.activeTime) l.alive = false;
      }
      this.lasers16 = this.lasers16.filter(l => l.alive);
    },

    hit(d) {
      if (this.state === 'intro' || this.state === 'teleport_out' || this.state === 'teleport_in' || this.state === 'phase_announce') return;
      this.hp -= d; if (this.hp <= 0) { this.hp = 0; this.alive = false; }
    },

    draw() {
      // ブラックホール吸い込みエフェクト（Boss13と同等、atk_blackhole中）
      if (this.state === 'atk_blackhole') {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(frameCount * 0.1);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.4;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, 40 + Math.random() * 80, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        // 中心暗化グラデ
        ctx.save();
        const bhAlpha = Math.min(0.5, this.stateTimer / 60 * 0.5);
        const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 100);
        grd.addColorStop(0, `rgba(0,0,10,${bhAlpha})`);
        grd.addColorStop(1, 'rgba(0,0,10,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(this.x, this.y, 100, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // フェーズ演出（収束弾・バブル）
      for (const b of this.convergeBullets) {
        ctx.save(); ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#9933ff'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      for (const s of this.bubbles) {
        ctx.save();
        if (s.burst) {
          for (const p of s.burstParticles || []) { ctx.globalAlpha = p.alpha * 0.8; ctx.fillStyle = 'rgba(220,220,255,0.9)'; ctx.beginPath(); ctx.arc(s.x + p.x, s.y + p.y, Math.max(2, s.radius * 0.15), 0, Math.PI * 2); ctx.fill(); }
        } else {
          for (const t of s.trail || []) { ctx.globalAlpha = t.alpha; ctx.fillStyle = 'rgba(200,200,255,0.3)'; ctx.beginPath(); ctx.arc(t.x, t.y, s.radius * 0.85, 0, Math.PI * 2); ctx.fill(); }
          ctx.globalAlpha = 1;
          ctx.fillStyle = `rgba(200,200,255,${0.35 + 0.2 * Math.sin(frameCount * 0.15)})`; ctx.strokeStyle = 'rgba(220,220,255,0.9)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }

      // ランページレーザー
      for (const l of this.rampageLasers) {
        ctx.save();
        if (l.timer < l.warningTime) {
          ctx.globalAlpha = 0.1 + 0.55 * (l.timer / l.warningTime); ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1; ctx.shadowColor = '#9933ff'; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + Math.cos(l.angle) * l.length, l.y + Math.sin(l.angle) * l.length); ctx.stroke();
        } else {
          const prog = (l.timer - l.warningTime) / (l.activeTime - l.warningTime);
          ctx.globalAlpha = 0.92 * (1 - prog * 0.5); ctx.strokeStyle = '#ffd700'; ctx.lineWidth = Math.max(1, 14 * (1 - prog)); ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 24; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + Math.cos(l.angle) * l.length, l.y + Math.sin(l.angle) * l.length); ctx.stroke();
        }
        ctx.restore();
      }

      // トルネード
      for (const t of this.bossTornadoes) {
        for (const tr of t.trail) { ctx.save(); ctx.globalAlpha = tr.alpha * 0.55; ctx.fillStyle = t.color; drawCrescent(ctx, tr.x, tr.y, t.size * 0.85, t.t * 0.22); ctx.restore(); }
        ctx.save(); ctx.fillStyle = t.color; ctx.shadowColor = t.color; ctx.shadowBlur = 10; drawCrescent(ctx, t.x, t.y, t.size, t.t * 0.22); ctx.restore();
      }
      // メテオ（Ph2）
      for (const m of this.bossMeteors) {
        for (const tr of m.trail) { ctx.save(); ctx.globalAlpha = tr.alpha * 0.45; ctx.fillStyle = m.color; drawMeteorShape(ctx, tr.x, tr.y, m.size * 0.75, m.angle); ctx.restore(); }
        ctx.save(); ctx.fillStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = 12; drawMeteorShape(ctx, m.x, m.y, m.size, m.angle); ctx.restore();
      }
      // bossLasers（Ph2）
      for (const l of this.bossLasers) {
        ctx.save();
        if (l.timer < l.warningTime) {
          const wp = l.timer / l.warningTime; ctx.globalAlpha = 0.1 + 0.55 * wp; ctx.strokeStyle = l.color; ctx.lineWidth = 1; ctx.shadowColor = l.color; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + Math.cos(l.angle) * l.length, l.y + Math.sin(l.angle) * l.length); ctx.stroke();
        } else {
          const prog = (l.timer - l.warningTime) / (l.activeTime - l.warningTime); ctx.globalAlpha = 0.9 * (1 - prog * 0.5); ctx.strokeStyle = l.color; ctx.lineWidth = Math.max(1, 14 * (1 - prog)); ctx.shadowColor = l.color; ctx.shadowBlur = 20; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + Math.cos(l.angle) * l.length, l.y + Math.sin(l.angle) * l.length); ctx.stroke();
        }
        ctx.restore();
      }

      // bigMeteor（Ph3）
      for (const m of this.bigMeteors) {
        for (const tr of m.trail) { ctx.save(); ctx.globalAlpha = tr.alpha * 0.4; ctx.fillStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = 12; drawMeteorShape(ctx, tr.x, tr.y, m.size * 0.85, m.angle); ctx.restore(); }
        ctx.save(); ctx.fillStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = 20; drawMeteorShape(ctx, m.x, m.y, m.size, m.angle); ctx.restore();
      }
      // charge残像
      for (const tr of this.chargeTrail) {
        ctx.save(); ctx.globalAlpha = tr.alpha * 0.32; ctx.fillStyle = '#9933ff'; ctx.shadowColor = '#9933ff'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(tr.x, tr.y, 28, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }

      // lasers16（Ph4）
      for (const l of this.lasers16) {
        ctx.save();
        if (l.timer <= l.warningTime) {
          ctx.globalAlpha = 0.1 + 0.55 * (l.timer / l.warningTime); ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1; ctx.shadowColor = '#ff8c00'; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + Math.cos(l.angle) * l.length, l.y + Math.sin(l.angle) * l.length); ctx.stroke();
        } else {
          const w = l.width * (1 - (l.timer - l.warningTime) / (l.activeTime - l.warningTime));
          ctx.strokeStyle = '#ffd700'; ctx.lineWidth = w; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 15;
          ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + Math.cos(l.angle) * l.length, l.y + Math.sin(l.angle) * l.length); ctx.stroke();
        }
        ctx.restore();
      }

      // ノード
      for (const n of this.nodes) {
        const nx = n.released ? n.nx : (this.x + Math.cos(n.angle) * NODE_DIST);
        const ny = n.released ? n.ny : (this.y + Math.sin(n.angle) * NODE_DIST);

        // 解放モード：残像描画
        if (n.released && n.trail) {
          for (const t of n.trail) {
            ctx.save(); ctx.globalAlpha = t.alpha * 0.55;
            ctx.fillStyle = n.color; ctx.shadowColor = n.borderColor; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(t.x, t.y, 18, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          }
        }

        ctx.save();
        const flash = n.flashTimer > 0 ? (n.flashTimer / 25) : 0;
        const blur = 16 + flash * 40 + (n.released ? 10 : 0);
        ctx.shadowColor = n.borderColor; ctx.shadowBlur = blur;
        ctx.globalAlpha = 1;
        ctx.fillStyle = n.borderColor;
        ctx.beginPath(); ctx.arc(nx, ny, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = (flash > 0.5 || n.released) ? '#ffffff' : n.color;
        ctx.beginPath(); ctx.arc(nx, ny, 14, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // 通常モードのみ接続線表示
        if (!n.released) {
          ctx.save(); ctx.globalAlpha = 0.2; ctx.strokeStyle = n.color; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
          ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(nx, ny); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        }
      }

      // 本体（天使的コア）
      ctx.save();
      let sc = 1, op = 1;
      if (this.state === 'teleport_out') { sc = op = 1 - (this.stateTimer / 20); }
      else if (this.state === 'teleport_in') { sc = op = this.stateTimer / 20; }
      if (this.state === 'phase_announce') op = 0.4 + 0.3 * Math.sin(this.stateTimer * 0.15);

      if (sc > 0) {
        ctx.translate(this.x, this.y); ctx.scale(sc, sc); ctx.globalAlpha = op;
        // 記録翼（対称アーク）
        const wRot = frameCount * 0.008;
        for (let w = 0; w < 2; w++) {
          const wr = w === 0 ? wRot : -wRot;
          ctx.save(); ctx.rotate(wr);
          ctx.strokeStyle = this.isFinal ? '#ffffff' : '#9933ff'; ctx.lineWidth = 2; ctx.globalAlpha = op * 0.5; ctx.shadowColor = this.borderColor; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(0, 0, 55, -Math.PI * 0.7, -Math.PI * 0.1); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, 70, -Math.PI * 0.6, -Math.PI * 0.2); ctx.stroke();
          ctx.restore();
        }
        // コア外縁（黒×金）
        ctx.globalAlpha = op;
        ctx.shadowColor = this.isFinal ? '#ffffff' : this.borderColor; ctx.shadowBlur = 40 + Math.sin(frameCount * 0.2) * 10;
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const r = i % 2 === 0 ? 34 : 26;
          const a = frameCount * 0.015 + i * Math.PI / 8;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.stroke();
        // 内コア
        ctx.fillStyle = this.isFinal ? '#ffffff' : this.color;
        ctx.shadowColor = this.isFinal ? '#ffffff' : this.color; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      // フェーズ演出テキスト
      if (this.state === 'phase_announce') {
        const alpha = Math.min(1, this.stateTimer / 20) * Math.min(1, (120 - this.stateTimer) / 20);
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.font = 'bold 28px Courier New'; ctx.textAlign = 'center';
        ctx.fillStyle = this.phaseAnnounceColor; ctx.shadowColor = this.phaseAnnounceColor; ctx.shadowBlur = 30;
        ctx.fillText(this.phaseAnnounceText, W / 2, H / 2);
        ctx.textAlign = 'left'; ctx.restore();
      }

      if (this.hp > 0 && op > 0 && typeof drawBossHpBar === 'function') drawBossHpBar(this);
    }
  };
}
