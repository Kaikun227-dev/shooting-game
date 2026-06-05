// ==================== BOSS SYSTEM ====================
let boss = null, bossManager = null;

// === BOSS 1: PHASE SHIFT ===
function createBoss1() {
  return { x: W/2, y: 100, hp: loopHP(600), maxHp: loopHP(600), alive: true, color: '#f0f',
    teleportTimer: 0, fireTimer: 0,
    update() {
      if (this.hp <= this.maxHp * 0.25) {
        this.teleportTimer++;
        if (this.teleportTimer > 180) {
          this.x = 50 + Math.random()*(W-100);
          this.y = 50 + Math.random()*(H/2);
          this.teleportTimer = 0;
        }
      } else {
        this.x += Math.sin(Date.now()/500)*2;
      }
      this.fireTimer++;
      const f = this.fireTimer;
      if (this.hp <= this.maxHp * 0.25) {
        if (f % 20 === 0) {
          for (let i=0; i<12; i++) fireEnemy(this.x, this.y, Math.random()*Math.PI*2, 4);
        }
      } else if (this.hp <= this.maxHp * 0.5) {
        if (f % 10 === 0) {
          const a = Math.atan2(player.y-this.y, player.x-this.x);
          fireEnemy(this.x, this.y, a, 4);
        }
      } else if (this.hp <= this.maxHp * 0.75) {
        if (f % 50 === 0) {
          const a = Math.atan2(player.y-this.y, player.x-this.x);
          for (let i=-1; i<=1; i++) fireEnemy(this.x, this.y, a+i*0.26, 3);
        }
      } else {
        if (f % 60 === 0) {
          for (let i=0; i<16; i++) fireEnemy(this.x, this.y, i*Math.PI/8, 2);
        }
      }
    },
    hit(d) { this.hp -= d; if(this.hp<=0){this.hp=0;this.alive=false;} },
    draw() { drawBossCircle(this, this.color, 35); drawBossHpBar(this); }
  };
}

// === BOSS 2: ORANGE ATTACKER ===
function createBoss2() {
  const b = {
    x: W/2, y: 100, hp: loopHP(800), maxHp: loopHP(800), alive: true, color: '#ff9900', // ← colorを追加してHPゲージをオレンジに
    // 挙動不審な移動（boss10/11型）
    state: 'move', stateTimer: 0,
    tx: W/2, ty: 100,
    // 攻撃
    attackTimer: 0, attackInterval: 90,
    rampageLasers: [], rampageStep: 0, rampageActive: false, rampageTimer: 0,

    update() {
      if (!this.alive) return;

      // === 修正ポイント1: ランページ中は移動をスキップ ===
      if (!this.rampageActive) {
        // 挙動不審移動
        this.stateTimer++;
        if (this.state === 'move') {
          this.x += (this.tx - this.x) * 0.04;
          this.y += (this.ty - this.y) * 0.04;
          if (this.stateTimer > 35 + Math.random()*30) {
            this.state = Math.random()<0.4?'stop':'dash'; this.stateTimer=0;
          }
        } else if (this.state === 'stop') {
          if (this.stateTimer > 20) {
            this.tx = 80+Math.random()*(W-160); this.ty = 60+Math.random()*(H/2-60);
            this.state='move'; this.stateTimer=0;
          }
        } else if (this.state === 'dash') {
          this.x += (this.tx-this.x)*0.15; this.y += (this.ty-this.y)*0.15;
          if (this.stateTimer>16){ this.tx=80+Math.random()*(W-160); this.ty=60+Math.random()*(H/2-60); this.state='move'; this.stateTimer=0; }
        }
        this.x=Math.max(40,Math.min(W-40,this.x)); this.y=Math.max(40,Math.min(H/2,this.y));
      }

      // ランページレーザー更新
      for (const l of this.rampageLasers) {
        l.timer++;
        if (l.timer>=l.warningTime && l.timer<l.activeTime) {
          if (player.alive && !player.invincible) {
            // レーザーの起点は発射時のボスの位置に固定されるため this.x, this.y を使用
            const vx=Math.cos(l.angle),vy=Math.sin(l.angle),dx=player.x-l.x,dy=player.y-l.y;
            const t=dx*vx+dy*vy;
            if (t>0&&t<l.length&&Math.hypot(player.x-(l.x+t*vx),player.y-(l.y+t*vy))<12) hitPlayerDamage(2,20);
          }
        }
        if (l.timer>=l.activeTime) l.alive=false;
      }
      this.rampageLasers = this.rampageLasers.filter(l=>l.alive);

      if (this.rampageActive) {
        this.rampageTimer++;
        if (this.rampageStep<16 && this.rampageTimer%4===0) {
          const angle=(Math.PI*2/16)*this.rampageStep+Math.random()*0.2;
          // === 修正ポイント2: warningTimeを10 -> 25に延長、activeTimeも合わせて調整 ===
          this.rampageLasers.push({
            x:this.x, y:this.y, angle, length:Math.max(W,H)*2, 
            timer:0, warningTime:25, activeTime:45, alive:true
          });
          this.rampageStep++;
        }
        if (this.rampageStep>=16&&this.rampageLasers.length===0){this.rampageActive=false;this.rampageTimer=0;this.rampageStep=0;}
        return; 
      }

      // 攻撃
      this.attackTimer++;
      if (this.attackTimer < this.attackInterval) return;
      this.attackTimer=0;
      const atk=['fan3','omni16','burst','rampage'][Math.floor(Math.random()*4)];
      if (atk==='fan3') {
        const a=Math.atan2(player.y-this.y,player.x-this.x);
        for(let i=-1;i<=1;i++) fireEnemy(this.x,this.y,a+i*0.2,7,{color:'#ff4444',glow:'#ff2200'});
      } else if (atk==='omni16') {
        for(let i=0;i<16;i++) fireEnemy(this.x,this.y,i*Math.PI/8,4,{color:'#ff4444',glow:'#ff2200'});
      } else if (atk==='burst') {
        const a=Math.atan2(player.y-this.y,player.x-this.x);
        for(let i=0;i<12;i++) setTimeout(()=>{if(this.alive)fireEnemy(this.x,this.y,a+(Math.random()-0.5)*0.15,5,{color:'#ff4444',glow:'#ff2200'});},i*70);
      } else if (atk==='rampage') {
        this.rampageActive=true; this.rampageTimer=0; this.rampageStep=0;
      }
    },

    hit(d) {
      this.hp -= d; if (this.hp<=0){this.hp=0;this.alive=false;}
    },

    draw() {
      // ランページレーザー描画
      for (const l of this.rampageLasers) {
        ctx.save();
        if (l.timer<l.warningTime){
          const wp = l.timer/l.warningTime;
          ctx.globalAlpha=0.1+0.55*wp; ctx.strokeStyle='#ff9966'; ctx.lineWidth=1; ctx.setLineDash([]); ctx.shadowColor='#ff4400'; ctx.shadowBlur=8;
          ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(l.x+Math.cos(l.angle)*l.length,l.y+Math.sin(l.angle)*l.length);ctx.stroke();
        } else {
          const prog=(l.timer-l.warningTime)/(l.activeTime-l.warningTime);
          ctx.globalAlpha=0.9*(1-prog*0.5); ctx.strokeStyle='#ff6600'; ctx.lineWidth=Math.max(1,12*(1-prog)); ctx.shadowColor='#ff4400'; ctx.shadowBlur=18; ctx.lineCap='round';
          ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(l.x+Math.cos(l.angle)*l.length,l.y+Math.sin(l.angle)*l.length);ctx.stroke();
        }
        ctx.restore();
      }
      drawBossCircle(this, '#ff8800', 35);
      drawBossHpBar(this);
    }
  };
  return b;
}

// === BOSS 3: CORNER RUSH ===
function createBoss3() {
  const corners = [[50,50], [W-50,50], [50,H-200], [W-50,H-200]];
  return { x: W/2, y: 100, hp: loopHP(700), maxHp: loopHP(700), alive: true, color: '#0f0',
    targetCorner: corners[Math.floor(Math.random()*4)], fireTimer: 0,
    update() {
      if (this.hp > this.maxHp/2) {
        const dx = player.x - this.x, dy = player.y - this.y, d = Math.hypot(dx, dy);
        if (d > 0) {
          this.x += dx/d*1.5;
          this.y += dy/d*1.5;
        }
      } else {
        const dx = this.targetCorner[0] - this.x, dy = this.targetCorner[1] - this.y, d = Math.hypot(dx, dy);
        if (d < 5) this.targetCorner = corners[Math.floor(Math.random()*4)];
        else {
          this.x += dx/d*3;
          this.y += dy/d*3;
        }
      }
      this.fireTimer++;
      if (this.hp > this.maxHp/2) {
        if (this.fireTimer % 60 === 0) {
          const a = Math.atan2(player.y-this.y, player.x-this.x);
          for (let o=-2; o<=2; o++) fireEnemy(this.x, this.y, a, 5+o);
        }
      } else {
        if (this.fireTimer % 50 === 0) {
          for (let i=0; i<24; i++) fireEnemy(this.x, this.y, i*Math.PI/12, 3);
        }
      }
    },
    hit(d) { this.hp -= d; if(this.hp<=0){this.hp=0;this.alive=false;} },
    draw() { drawBossCircle(this, this.color, 35); drawBossHpBar(this); }
  };
}
// === BOSS 4: WALL CANNON ===
function createBoss4() {
  return { x: W/2, y: 100, hp: loopHP(800), maxHp: loopHP(800), alive: true, color: '#44f',
    phase: 1, wallBullets: [], lastFire: 0, vx: 2.2, vy: 1.6, dashVx: 0, dashVy: 0, dashTrail: [], charging: false, chargeTimer: 0,
    update() {
      if (this.hp <= this.maxHp/2 && this.phase === 1) this.phase = 2;
      const spd = this.hp <= this.maxHp/2 ? 1.9 : 1.0;
      if (this.phase === 1) {
        this.x += this.vx*spd; this.y += this.vy*spd;
        if (this.x <= 30 || this.x >= W-30) this.vx *= -1;
        if (this.y <= 30 || this.y >= H-30) this.vy *= -1;
        this.x = Math.max(30, Math.min(W-30, this.x));
        this.y = Math.max(30, Math.min(H-30, this.y));
      } else {
        if (!this.charging) {
          this.chargeTimer++;
          if (this.chargeTimer >= 80) {
            this.charging = true; this.chargeTimer = 0;
            const dx = player.x - this.x, dy = player.y - this.y, dist = Math.hypot(dx, dy) || 1;
            this.dashVx = dx/dist*8; this.dashVy = dy/dist*8;
          }
        } else {
          this.dashTrail.push({x: this.x, y: this.y, life: 10});
          this.x += this.dashVx; this.y += this.dashVy;
          if (this.x < 30 || this.x > W-30 || this.y < 30 || this.y > H-30) {
            this.x = Math.max(30, Math.min(W-30, this.x));
            this.y = Math.max(30, Math.min(H-30, this.y));
            this.charging = false; this.dashVx = 0; this.dashVy = 0;
          }
          this.chargeTimer++;
          if (this.chargeTimer > 30) { this.charging = false; this.chargeTimer = 0; }
          if (player.alive && !player.invincible && Math.hypot(player.x-this.x, player.y-this.y) < 30 && player.damageTimer === 0) hitPlayer(25);
        }
      }
      for (const t of this.dashTrail) t.life--;
      this.dashTrail = this.dashTrail.filter(t => t.life > 0);
      const now = Date.now();
      if (now - this.lastFire > 180) {
        this.lastFire = now;
        if (this.phase === 1) {
          const side = Math.random() < 0.5 ? 'left' : 'right';
          this.wallBullets.push({x: side==='left' ? 0 : W, y: Math.random()*H, vx: side==='left' ? 3 : -3, vy: 0, alive: true});
        } else {
          const side = Math.random() < 0.5 ? 'top' : 'bottom';
          this.wallBullets.push({x: Math.random()*W, y: side==='top' ? 0 : H, vx: 0, vy: side==='top' ? 3 : -3, alive: true});
        }
      }
      for (const b of this.wallBullets) {
        b.x += b.vx; b.y += b.vy;
        if (b.x < -10 || b.x > W+10 || b.y < -10 || b.y > H+10) b.alive = false;
        if (player.alive && !player.invincible && Math.hypot(player.x-b.x, player.y-b.y) < 16) { hitPlayer(15); b.alive = false; }
      }
      this.wallBullets = this.wallBullets.filter(b => b.alive);
    },
    hit(d) { this.hp -= d; if(this.hp<=0){this.hp=0;this.alive=false;this.wallBullets=[];} },
    draw() {
      // 突進残像
      for (const t of this.dashTrail) {
        ctx.save(); ctx.globalAlpha = (t.life/10)*0.45;
        ctx.fillStyle = '#88f'; ctx.shadowColor = '#44f'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(t.x, t.y, 30, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
      drawBossCircle(this, (this.hp <= this.maxHp/2 && Math.floor(frameCount/6)%2===0) ? '#88f' : '#44f', 35);
      for (const b of this.wallBullets) {
        ctx.save(); ctx.fillStyle = '#f22'; ctx.shadowColor = '#f00'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
      drawBossHpBar(this);
    }
  };
}
// === BOSS 5: BLINK STORM ===
function createBoss5() {
  return { x: W/2, y: 100, hp: loopHP(400), maxHp: loopHP(400), alive: true, color: '#f9f',
    teleTimer: 0, teleInterval: 500+Math.random()*200, fireTimer: 0, angleOffset: 0,
    update() {
      this.teleTimer++;
      if (this.teleTimer >= this.teleInterval) {
        this.x = Math.random()*W;
        this.y = 100 + Math.random()*(H-200);
        this.teleTimer = 0;
        this.teleInterval = 200 + Math.random()*300;
      }
      this.fireTimer++;
      if (this.hp > this.maxHp/2) {
        if (this.fireTimer % 60 === 0) {
          for (let i=0; i<48; i++) fireEnemy(this.x, this.y, i*Math.PI/24, 2+Math.random()*2);
        }
      } else {
        if (this.fireTimer % 1 === 0) {
          fireEnemy(this.x, this.y, this.angleOffset*Math.PI/180, 3+Math.random()*2);
          this.angleOffset = (this.angleOffset + 10) % 360;
        }
      }
    },
    hit(d) {
      this.hp -= d;
      this.x = Math.random()*W;
      this.y = 100 + Math.random()*(H-200);
      if(this.hp<=0){this.hp=0;this.alive=false;}
    },
    draw() { drawBossCircle(this, this.color, 30); drawBossHpBar(this); }
  };
}
// === BOSS 6: TRI-PHASE ===
function createBoss6() {
  return { x: W/2, y: 100, hp: loopHP(900), maxHp: loopHP(900), alive: true, color: '#fff',
    phase: 1, sx: 3, sy: 2, fireTimer: 0, teleTimer: 0, angleOffset: 0, explodingBullets: [],
    update() {
      if (this.hp <= this.maxHp*0.7 && this.phase === 1) this.phase = 2;
      if (this.hp <= this.maxHp*0.4 && this.phase === 2) this.phase = 3;
      if (this.phase === 1) {
        this.x += this.sx;
        if (this.x <= 50 || this.x >= W-50) this.sx *= -1;
      } else if (this.phase === 2) {
        this.x += this.sx; this.y += this.sy;
        if (this.x <= 50 || this.x >= W-50) this.sx *= -1;
        if (this.y <= 50 || this.y >= H-50) this.sy *= -1;
      } else {
        this.teleTimer++;
        if (this.teleTimer > 240) {
          this.x = Math.random()*(W-100) + 50;
          this.y = 100 + Math.random()*(H-200);
          this.teleTimer = 0;
        }
      }
      this.fireTimer++;
      if (this.phase === 1) {
        if (this.fireTimer % 20 === 0) {
          const a = Math.atan2(player.y-this.y, player.x-this.x);
          enemyBullets.push({x: this.x, y: this.y, vx: Math.cos(a)*2, vy: Math.sin(a)*2, alive: true, reflectable: true, reflected: false});
        }
      } else if (this.phase === 2) {
        if (this.fireTimer % 120 === 0) this.explodingBullets.push({x: this.x, y: this.y, timer: 60});
        for (const b of this.explodingBullets) {
          b.timer--;
          if (b.timer <= 0) {
            for (let i=0; i<36; i++) fireEnemy(b.x, b.y, i*Math.PI/18, 3);
            b.done = true;
          }
        }
        this.explodingBullets = this.explodingBullets.filter(b => !b.done);
      } else {
        if (this.fireTimer % 15 === 0) {
          for (let i=0; i<8; i++) fireEnemy(this.x, this.y, i*Math.PI/4+this.angleOffset*Math.PI/180, 2);
          this.angleOffset = (this.angleOffset + 15) % 360;
        }
      }
    },
    hit(d) { this.hp -= d; if(this.hp<=0){this.hp=0;this.alive=false;} },
    draw() {
      for (const b of this.explodingBullets) {
        ctx.save(); ctx.fillStyle = 'rgba(255,255,100,0.6)';
        ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
      drawBossCircle(this, this.color, 35); drawBossHpBar(this);
    }
  };
}

// === BOSS 7: LASER BOSS ===
function createBoss7() {
  return { x: W/2, y: 100, hp: loopHP(900), maxHp: loopHP(900), alive: true, color: '#f55', phase: 1, fireTimer: 0, lasers: [], laserInterval: 40, charging: false, chargeTarget: {x:0,y:0}, chargeTimer: 0, dashVx: 0, dashVy: 0, dashTrail: [],
    update() {
      if (this.hp <= this.maxHp/2 && this.phase === 1) { this.phase = 2; this.laserInterval = 15; }
      this.fireTimer++; if (this.fireTimer % this.laserInterval === 0) { const axis = (Math.floor(this.fireTimer/this.laserInterval)%2===0)?'h':'v'; const pos = axis==='h'?60+Math.random()*(H-120):60+Math.random()*(W-120); this.lasers.push({ axis, pos, warning: true, warningTimer: 50, active: false, activeTimer: 22 }); }
      for (const l of this.lasers) { if(l.warning) { l.warningTimer--; if(l.warningTimer<=0){ l.warning=false; l.active=true; } } else if(l.active) { l.activeTimer--; if(player.alive&&!player.invincible){ const hit=l.axis==='h'?Math.abs(player.y-l.pos)<14:Math.abs(player.x-l.pos)<14; if(hit&&player.damageTimer===0)hitPlayerDamage(2,20); } if(l.activeTimer<=0)l.done=true; } }
      this.lasers = this.lasers.filter(l => !l.done);
      if (this.phase === 2) {
        if(!this.charging){ this.chargeTimer++; if(this.chargeTimer>=80){ this.charging=true; this.chargeTimer=0; const dx=player.x-this.x,dy=player.y-this.y,dist=Math.hypot(dx,dy)||1; this.dashVx=dx/dist*9; this.dashVy=dy/dist*9; } }
        else{ this.dashTrail.push({x:this.x,y:this.y,life:12}); this.x+=this.dashVx; this.y+=this.dashVy; if(this.x<30||this.x>W-30||this.y<30||this.y>H-30){ this.x=Math.max(30,Math.min(W-30,this.x)); this.y=Math.max(30,Math.min(H-30,this.y)); this.charging=false; this.dashVx=0; this.dashVy=0; } this.chargeTimer++; if(this.chargeTimer>30){ this.charging=false; this.chargeTimer=0; } if(player.alive&&!player.invincible&&Math.hypot(player.x-this.x,player.y-this.y)<34&&player.damageTimer===0){ hitPlayer(25); player.hp-=1; } }
        for(const t of this.dashTrail) t.life--; this.dashTrail=this.dashTrail.filter(t=>t.life>0);
      } else { this.x = W/2 + Math.sin(this.fireTimer/80)*120; this.y = 100 + Math.sin(this.fireTimer/120)*40; }
    },
    hit(d) { this.hp -= d; if(this.hp<=0){this.hp=0;this.alive=false;} },
    draw() { for (const t of this.dashTrail) { ctx.save(); ctx.globalAlpha=t.life/12*0.5; ctx.fillStyle='#f55'; ctx.beginPath(); ctx.arc(t.x,t.y,28,0,Math.PI*2); ctx.fill(); ctx.restore(); } for (const l of this.lasers) { ctx.save(); if(l.warning) { const wp = 1 - l.warningTimer/50; ctx.globalAlpha=0.1+0.55*wp; ctx.strokeStyle='#ff9999'; ctx.lineWidth=1; ctx.shadowColor='#ff4444'; ctx.shadowBlur=6; ctx.setLineDash([]); ctx.beginPath(); l.axis==='h'?ctx.moveTo(0,l.pos):ctx.moveTo(l.pos,0); l.axis==='h'?ctx.lineTo(W,l.pos):ctx.lineTo(l.pos,H); ctx.stroke(); } else if(l.active) { ctx.globalAlpha=0.9; ctx.shadowColor='#f55'; ctx.shadowBlur=20; ctx.strokeStyle='#ff8888'; ctx.lineWidth=8; ctx.setLineDash([]); ctx.beginPath(); l.axis==='h'?ctx.moveTo(0,l.pos):ctx.moveTo(l.pos,0); l.axis==='h'?ctx.lineTo(W,l.pos):ctx.lineTo(l.pos,H); ctx.stroke(); } ctx.restore(); } drawBossCircle(this, this.color, this.charging ? 36 : 35); drawBossHpBar(this); }
  };
}

// === BOSS 8: SIGNAL BOSS ===
function createBoss8() {
  return {
    boss: {
      x: W/2, y: 100, hp: loopHP(1000), maxHp: loopHP(1000), alive: true, color: '#ff0', signalTimer: 0,
      update(minions, sb) {
        if (Date.now() - this.signalTimer > 1200) {
          for (const m of minions) {
            if (m.alive) sb.push({
              x: this.x, y: this.y,
              vx: Math.cos(Math.atan2(m.y-this.y, m.x-this.x))*4,
              vy: Math.sin(Math.atan2(m.y-this.y, m.x-this.x))*4,
              alive: true,
              update(ms) {
                this.x += this.vx; this.y += this.vy;
                if (this.x<0 || this.x>W || this.y<0 || this.y>H) { this.alive=false; return; }
                for (const m of ms) {
                  if (m.alive && Math.hypot(this.x-m.x, this.y-m.y)<20) { m.signals++; this.alive=false; return; }
                }
              },
              draw() {
                ctx.save(); ctx.fillStyle='#ff0'; ctx.shadowColor='#ff0'; ctx.shadowBlur=10;
                ctx.beginPath(); ctx.arc(this.x, this.y, 6, 0, Math.PI*2); ctx.fill();
                ctx.restore();
              }
            });
          }
          this.signalTimer = Date.now();
        }
      },
      hit(d) { this.hp -= d; if(this.hp<=0){this.hp=0;this.alive=false;} },
      draw() { drawBossCircle(this, '#ff0', 35); }
    },
    minions: [], signalBullets: [], teleTimer: Date.now(), alive: true,
    update() {
      if (Date.now() - this.teleTimer > 6000) {
        this.boss.x = 100 + Math.random()*(W-200);
        this.boss.y = 100 + Math.random()*(H/2);
        for (const m of this.minions) if (m.alive) {
          m.x = 100 + Math.random()*(W-200);
          m.y = H/2 + Math.random()*(H/2-50);
        }
        this.teleTimer = Date.now();
      }
      if (this.boss.alive) this.boss.update(this.minions, this.signalBullets);
      while (this.minions.length < Math.min(5, 2+Math.floor((this.boss.maxHp-this.boss.hp)/(this.boss.maxHp/4)))) {
        this.minions.push({
          x: 100+Math.random()*(W-200), y: H/2+Math.random()*(H/2-50),
          hp: 99999999, maxHp: 99999999, alive: true, signals: 0, statusEffects: {},
          update() {
            while (this.signals > 0) {
              const p = ['3way','circle','multi','8wayLaser','reflect3','plasma'][Math.floor(Math.random()*6)];
              if (p === '3way') {
                for (let i=-1; i<=1; i++) fireEnemy(this.x, this.y, Math.atan2(player.y-this.y, player.x-this.x)+i*0.3, 5);
              } else if (p === 'circle') {
                for (let i=0; i<16; i++) fireEnemy(this.x, this.y, i*Math.PI/8, 3);
              } else if (p === 'multi') {
                for (let s of [3,4,5]) fireEnemy(this.x, this.y, Math.atan2(player.y-this.y, player.x-this.x), s);
              } else if (p === '8wayLaser') {
                for (let i=0; i<8; i++) {
                  const a = i*Math.PI/4;
                  enemyLasers.push({axis:'custom', angle:a, x:this.x, y:this.y, warningTimer:30, activeTimer:20});
                }
              } else if (p === 'reflect3') {
                const a = Math.atan2(player.y-this.y, player.x-this.x);
                for (let xi=0; xi<4; xi++) {
                  const xa = a + xi * Math.PI/2; // X字=45°刻みでなく90°刻み
                  enemyBullets.push({x: this.x, y: this.y, vx: Math.cos(xa)*7, vy: Math.sin(xa)*7, alive: true, type: 'enemyChakram', size: 12, color: '#ff6699', reflectCount: 0, maxReflect: 2, trail: []});
                }
              } else if (p === 'plasma') {
                plasmas.push({x: this.x, y: this.y, maxR: 160, timer: 0, isPlayer: false, lightningTimer: 0});
              }
              this.signals--;
            }
          },
          draw() {
            ctx.save(); ctx.fillStyle='#ff9'; ctx.shadowColor='#ff0'; ctx.shadowBlur=8;
            ctx.beginPath(); ctx.arc(this.x, this.y, 15, 0, Math.PI*2); ctx.fill();
            ctx.restore();
            ctx.fillStyle='#333'; ctx.fillRect(this.x-15, this.y-28, 30, 4);
            ctx.fillStyle='#ff0'; ctx.fillRect(this.x-15, this.y-28, 30*(this.hp/this.maxHp), 4);
          }
        });
      }
      for (const m of this.minions) if (m.alive) m.update();
      for (const s of this.signalBullets) s.update(this.minions);
      this.signalBullets = this.signalBullets.filter(s => s.alive);
      if (!this.boss.alive) {
        for (const m of this.minions) m.alive = false;
        this.alive = false;
      }
    },
    hit(d, bx, by) {
      if (this.boss.alive && Math.hypot(this.boss.x-bx, this.boss.y-by) < 30) {
        applyDamageWithFragile(this.boss, d, bx, by);
      } else for (const m of this.minions) if (m.alive && Math.hypot(m.x-bx, m.y-by) < 15) {
        applyDamageWithFragile(m, d, bx, by);
        break;
      }
    },
    draw() {
      this.boss.draw();
      for (const m of this.minions) if (m.alive) m.draw();
      for (const s of this.signalBullets) s.draw();
      if (this.boss.alive) {
        ctx.fillStyle = '#333'; ctx.fillRect(W-120, 20, 100, 10);
        ctx.fillStyle = '#ff0'; ctx.fillRect(W-120, 20, 100*(this.boss.hp/this.boss.maxHp), 10);
      }
    }
  };
}

// === BOSS 9 ===
function createBoss9() {
  return { x: W/2, y: H/2, hp: loopHP(1000), maxHp: loopHP(1000), alive: true, color: '#fffdd0',
    angle: 0, rotDir: 1, rotAccum: 0, stickLen: 0, fireTimer: 0, pDamTimer: 0,
    update() {
      if (this.pDamTimer > 0) this.pDamTimer--;
      if (this.stickLen < W + H) this.stickLen += 8;
      else {
        const speed = this.hp <= this.maxHp / 2 ? 0.015 : 0.008;
        this.angle += speed * this.rotDir;
        this.rotAccum += speed;
        if (this.rotAccum >= Math.PI * 2 * 3) { this.rotDir *= -1; this.rotAccum = 0; }
        
        this.fireTimer++;
        const interval = this.hp <= this.maxHp / 2 ? 10 : 20;
        if (this.fireTimer >= interval) {
          this.fireTimer = 0; fireEnemy(this.x, this.y, Math.random()*Math.PI*2, 4);
        }
      }
      if (this.stickLen > 0 && this.pDamTimer === 0) {
        for (let i=0; i<4; i++) {
          const a = this.angle + i * Math.PI/2;
          const x2 = this.x + Math.cos(a) * this.stickLen, y2 = this.y + Math.sin(a) * this.stickLen;
          if (distToSegment(player.x, player.y, this.x, this.y, x2, y2) < 14) { hitPlayer(30); this.pDamTimer = 30; break; }
        }
        for (const b of playerBullets) { 
          if (!b.alive) continue; 
          for (let i=0; i<4; i++) {
            const a = this.angle + i * Math.PI/2;
            const x2 = this.x + Math.cos(a) * this.stickLen, y2 = this.y + Math.sin(a) * this.stickLen;
            if (distToSegment(b.x, b.y, this.x, this.y, x2, y2) < 10) { 
              b.alive = false; 
              break; 
            }
          }
        }
      }
    },
    hit(d) { this.hp -= d; if(this.hp<=0){this.hp=0;this.alive=false;} },
    draw() {
      if (this.stickLen > 0) {
        ctx.save(); ctx.strokeStyle = '#f00'; ctx.lineWidth = 6; ctx.shadowColor = '#f00'; ctx.shadowBlur = 10;
        for(let i=0; i<4; i++) {
          const a = this.angle + i*Math.PI/2;
          ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(a)*this.stickLen, this.y + Math.sin(a)*this.stickLen); ctx.stroke();
        }
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        for(let i=0; i<4; i++) {
          const a = this.angle + i*Math.PI/2;
          ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(a)*this.stickLen, this.y + Math.sin(a)*this.stickLen); ctx.stroke();
        }
        ctx.restore();
      }
      drawBossCircle(this, this.color, 35); drawBossHpBar(this);
    }
  };
}
