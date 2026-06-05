function drawBossCircle(b, color, r) {
  ctx.save(); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI*2); ctx.fill(); ctx.restore();
}
function drawBossHpBar(b) {
  ctx.fillStyle='#333'; ctx.fillRect(W-120,20,100,10);
  ctx.fillStyle=b.color; ctx.fillRect(W-120,20,100*(b.hp/b.maxHp),10);
}

// ==================== ITEMS ====================
const ALL_ITEMS = [
  { id:'hp2', name:'HPアップ＋２', icon:'❤️', desc:'+2 HP（最大HPも増加）', maxCount: 999, apply(){ player.maxHp+=2; player.hp=Math.min(player.hp+2,player.maxHp); } },
  { id:'hp3', name:'HPアップ＋３', icon:'❤️', desc:'+3 HP（最大HPも増加）', maxCount: 999, apply(){ player.maxHp+=3; player.hp=Math.min(player.hp+3,player.maxHp); } },
  { id:'hp5', name:'HPアップ＋５', icon:'❤️', desc:'+5 HP（最大HPも増加、(２回まで取得可能)）', maxCount: 2, apply(){ player.maxHp+=5; player.hp=Math.min(player.hp+5,player.maxHp); } },
  { id:'dmg1', name:'ダメージアップ＋１', icon:'⚔️', desc:'+1 ダメージ', maxCount: 999, apply(){ player.damage+=1; } },
  { id:'dmg2', name:'ダメージアップ＋２', icon:'⚔️', desc:'+2 ダメージ', maxCount: 999, apply(){ player.damage+=2; } },
  { id:'dmg3', name:'ダメージアップ＋３', icon:'⚔️', desc:'+3 ダメージ(２回まで取得可能)', maxCount: 2, apply(){ player.damage+=3; } },
  { id:'stockheal', name:'ストックヒール', icon:'🧪', desc:'Cキーで発動、HP+10回復。使うと消費。最大3つまで', maxCount: 999,
    apply(){
      if (stockHealCount < stockHealMax) stockHealCount++;
    }},
  { id:'heal', name:'体力回復', icon:'💊', desc:'最大HPの半分を回復。バリア/SF再チャージ。ファイア燃料も全回復', maxCount: 999, apply(){ const heal = Math.floor(player.maxHp / 2); player.hp = Math.min(player.maxHp, player.hp + heal); if (player.hasBarrier) player.barrierRechargeCooldown = 0; if (player.hasSuperFlash) player.superFlashRechargeCooldown = 0; if (fireFuelMax > 0) fireFuel = fireFuelMax; } },
  { id:'bspd', name:'弾速アップ', icon:'💨', desc:'+10% 弾速', maxCount: 999, apply(){ player.bulletSpeed*=1.1; } },
  { id:'tempo', name:'テンポアップ', icon:'🎵', desc:'+10% 連射速度', maxCount: 999, apply(){ player.shootInterval=Math.max(2,Math.floor(player.shootInterval*0.90)); } },

  { id:'3way', name:'拡散弾', icon:'🔱', desc:'複数の弾を放つようになる', maxCount: 2, apply(){ player.has3Way=true; } },
  { id:'side', name:'サイド弾', icon:'↔️', desc:'左右固定に弾が追加', maxCount: 1, apply(){ player.hasSide=true; } },
  { id:'back', name:'バック弾', icon:'⬇️', desc:'下方向に弾が追加', maxCount: 1, apply(){ player.hasBack=true; } },
  { id:'homing', name:'追尾弾', icon:'🎯', desc:'敵を自動追尾する弾', maxCount: 1, apply(){ player.hasHoming=true; } },
  { id:'laser', name:'レーザー', icon:'✨', desc:'自機の位置からレーザーを放つ。lvアップで本数が増える', maxCount: 4, apply(){} },
  { id:'bomb', name:'ボム', icon:'💣', desc:'時間差で爆発する弾を放つ。lvアップで爆発後の弾の数が増える', maxCount: 4, apply(){} },
  { id:'shotgun', name:'ショットガン', icon:'💥', desc:'扇状に複数の弾を発射。lvアップで弾の数が増える', maxCount: 4, apply(){} },
  { id:'sniper', name:'ミニスナイパー', icon:'🛸', desc:'遠くの敵を狙撃し、マークを付与する。このマークが複数ある場合、共鳴してダメージを与える（ボスには無効）', maxCount: 4, apply(){} },
  { id:'plasma', name:'プラズマ', icon:'⚡', desc:'敵の位置にプラズマを発生させる。lvアップで範囲が広がる', maxCount: 4, apply(){} },
  { id:'stick', name:'スティック', icon:'🪄', desc:'自機から回転する棒が伸び、敵の弾を防ぐ。lvアップで棒が更に伸びる', maxCount: 4, apply(){} },
  { id:'chakram', name:'チャクラム', icon:'⭕️', desc:'壁に触れると1回反射するチャクラムを放つ。lvアップで大きくなる。lv4で2回反射', maxCount: 4, apply(){} },
  { id:'bubble', name:'バブル', icon:'🫧', desc:'壁に触れると分裂し反射するバブルを放つ。lvアップで分裂＆反射回数が増える', maxCount: 4, apply(){} },
  { id:'tornado', name:'トルネード', icon:'🌀', desc:'三日月形の弾が渦を巻きながら広がる。lvアップで大きくなる。lv4で2連射', maxCount: 4, apply(){} },
  { id:'meteor', name:'メテオ', icon:'☄️', desc:'画面外から出現し、弾を噴射しながら敵に突進する。lvアップで大きくなる。lv4で追加のミニメテオを２つ放つ', maxCount: 4, apply(){} },
  { id:'helper', name:'ヘルパー', icon:'🌟', desc:'独自行動する味方ユニット。lvアップで攻撃パターンが増える', maxCount: 4,
    apply(){
      const lv = player.items.filter(id=>id==='helper').length + 1;
      spawnHelperUnit(lv);
    }},
  { id:'karma', name:'カルマ', icon:'🌿', desc:'受けたダメージがカルマゲージに蓄積。橙:周囲範囲攻撃、赤:全体攻撃。lvアップで発動が速くなる', maxCount: 4,
    apply(){
      const lv = player.items.filter(id=>id==='karma').length + 1;
      const { ot, rt } = getKarmaThresholds(lv);
      if (karmaOrange >= ot) karmaOrange = ot - 1;
      if (karmaRed    >= rt) karmaRed    = rt - 1;
      karmaOrangeThresh = ot;
      karmaRedThresh    = rt;
    }},
  { id:'fire', name:'ファイア', icon:'🔥', desc:'Vキー長押しで炎を噴射。状態異常「炎上」。lv↑で射程・燃料アップ', maxCount: 4,
    apply(){
      const lv = player.items.filter(id=>id==='fire').length + 1;
      const fuelMax = [200,300,400,600][lv-1] || 200;
      fireFuelMax = fuelMax;
      fireFuel = fireFuelMax; // 取得時に全回復
    }},
  { id:'poisontrap', name:'ポイズントラップ', icon:'☠️', desc:'自機周囲に常時毒円を展開。lv↑で範囲拡大。lv4で毒の継続時間が5秒→8秒に', maxCount: 4,
    apply(){
    }},
  { id:'barrier', name:'バリア', icon:'🟢', desc:'Zキーで発動。HPが20のバリアが10秒間発動する', maxCount: 1, apply(){ player.hasBarrier = true; } },
  { id:'superflash', name:'スーパーフラッシュ', icon:'💛', desc:'Aキーで発動。画面内すべての敵に100×周回数ダメージを与える', maxCount: 1, apply(){ player.hasSuperFlash = true; } },
  { id:'dash', name:'ダッシュ', icon:'👟', desc:'Bキーで高速ダッシュ。ダッシュ中は無敵。CT2秒', maxCount: 1, apply(){ player.hasDash = true; } },
  { id:'fragileshot', name:'脆弱弾', icon:'🔷', desc:'Nキーで発射。敵に当たると脆弱を付与する', maxCount: 1,
  apply(){
    if (!player.hasFragileShot) player.hasFragileShot = true;
  }},
];

// ==================== 呪字データ ====================
const ALL_CURSES = [
  { id:'癒', icon:'癒', name:'癒', desc:'各雑魚敵フェーズ開始時にHPを5回復',
    apply(){ /* startWave内で処理 */ } },
  { id:'育', icon:'育', name:'育', desc:'ボスフェーズを突破するたびにHP+10。',
    apply(){ /* continueGame内で処理 */ } },
  { id:'吸', icon:'吸', name:'吸', desc:'雑魚敵撃破時10%の確率でHPを1回復',
    apply(){ } },
  { id:'命', icon:'命', name:'命', desc:'HP0時に一度だけ最大HPで復活',
    apply(){ } },
  { id:'倍', icon:'倍', name:'倍', desc:'ダメージ×2。最大HPが現在の半分(最低1)になる',
    apply(){
      player.damage = Math.max(1, player.damage * 2);
      if (!curseDeathMode) player.maxHp = Math.max(1, Math.floor(player.maxHp / 2));
      player.hp = Math.min(player.maxHp, player.hp);
    }},
  { id:'暴', icon:'暴', name:'暴', desc:'テンポ+60%、弾速+40%、ダメージ-5',
    apply(){
      player.shootInterval = Math.max(4, Math.floor(player.shootInterval / 1.6));
      player.bulletSpeed *= 1.4;
      player.damage = Math.max(1, player.damage - 5);
    }},
  { id:'電', icon:'電', name:'電', desc:'雑魚敵撃破時、10%の確率でプラズマ発生するようになる',
    apply(){ } },
  { id:'満', icon:'満', name:'満', desc:'未取得のlv4アイテムを1つlv4で取得する',
    apply(){
      const lv4ids = ['laser','shotgun','bomb','sniper','plasma','stick','chakram','bubble','tornado','meteor','helper','karma','fire','poisontrap'];
      const notFull = lv4ids.filter(id => player.items.filter(x=>x===id).length < 4);
      const prefer = notFull.filter(id => !player.items.includes(id));
      const pool = prefer.length > 0 ? prefer : notFull;
      if (pool.length > 0) {
        const chosen = pool[Math.floor(Math.random()*pool.length)];
        const item = ALL_ITEMS.find(i=>i.id===chosen);
        while (player.items.filter(x=>x===chosen).length < 4) { player.items.push(chosen); if(item) item.apply(); }
      }
    }},
  { id:'全', icon:'全', name:'全', desc:'未取得のlv4アイテムを全て1つずつ取得する',
    apply(){
      const lv4ids = ['laser','shotgun','bomb','sniper','plasma','stick','chakram','bubble','tornado','meteor','helper','karma','fire','poisontrap'];
      for (const id of lv4ids) {
        if (!player.items.includes(id)) {
          const item = ALL_ITEMS.find(i=>i.id===id);
          player.items.push(id); if(item) item.apply();
        }
      }
    }},
  { id:'得', icon:'得', name:'得', desc:'ダメージ+1、HP+2、サイド弾・バック弾・追尾弾を取得',
    apply(){
      player.damage += 1;
      if (!curseDeathMode) player.maxHp += 2;
      if (!player.hasSide) { player.hasSide = true; player.items.push('side'); }
      if (!player.hasBack) { player.hasBack = true; player.items.push('back'); }
      if (!player.hasHoming) { player.hasHoming = true; player.items.push('homing'); }
    }},
  { id:'装', icon:'装', name:'装', desc:'ダメージ+2、HP+3、バリア・スーパーフラッシュを取得',
    apply(){
      player.damage += 2;
      if (!curseDeathMode) player.maxHp += 3;
      if (!player.hasBarrier) { player.hasBarrier = true; player.items.push('barrier'); }
      if (!player.hasSuperFlash) { player.hasSuperFlash = true; player.items.push('superflash'); }
    }},
  { id:'基', icon:'基', name:'基', desc:'バリアを取得。バリア/SFのCT30秒に。発動後10秒間ダメージ2倍',
    apply(){
      if (!player.hasBarrier) { player.hasBarrier = true; player.items.push('barrier'); }
      player.barrierRechargeCooldown = Math.min(player.barrierRechargeCooldown, 1800);
      player.superFlashRechargeCooldown = Math.min(player.superFlashRechargeCooldown, 1800);
    }},
  { id:'礎', icon:'礎', name:'礎', desc:'スーパーフラッシュを取得。バリア/SF発動時HP+10。発動後10秒テンポ+10%・弾速+10%',
    apply(){ if (!player.hasSuperFlash) { player.hasSuperFlash = true; player.items.push('superflash'); } } },
  { id:'炎', icon:'炎', name:'炎', desc:'ファイアを1つ取得。燃料上限+200・全回復。ダメージが2に',
    apply(){
      // apply()内で lv = filter('fire').length+1 を計算するため、push前にapplyを呼ぶ
      if (player.items.filter(x=>x==='fire').length < 4) {
        const fi = ALL_ITEMS.find(i=>i.id==='fire'); if(fi) fi.apply();
        player.items.push('fire');
      }
      fireFuelMax += 200; fireFuel = fireFuelMax;
      // 炎フラグはupdatePlayerOptions内でcurseSlots.includes('炎')で判定
    }},
  { id:'蟲', icon:'蟲', name:'蟲', desc:'ポイズントラップを1つ取得。全ての毒ダメージが+2アップ',
    apply(){
      // apply()内でlv計算するため、push前にapplyを呼ぶ
      if (player.items.filter(x=>x==='poisontrap').length < 4) {
        const pi = ALL_ITEMS.find(i=>i.id==='poisontrap'); if(pi) pi.apply();
        player.items.push('poisontrap');
      }
    }},
  { id:'染', icon:'染', name:'染', desc:'ミニスナイパーを1つ取得。ミニスナイパーの狙撃ヒット時、毒を3秒間付与（毒lvはスナイパーlvとリンク）',
    apply(){
      // ミニスナイパーを1つ取得（lv上限はALL_ITEMS側で管理）
      const snItem = ALL_ITEMS.find(i=>i.id==='sniper');
      if (player.items.filter(x=>x==='sniper').length < (snItem ? snItem.maxCount : 4)) {
        player.items.push('sniper');
        if (snItem && snItem.apply) snItem.apply();
      }
    } },
  { id:'渦', icon:'渦', name:'渦', desc:'トルネードを1つ取得。トルネードlv4の時、一度に連続で放たれる数が2つから3つになる',
    apply(){
      if (player.items.filter(x=>x==='tornado').length < 4) {
        const ti = ALL_ITEMS.find(i=>i.id==='tornado'); if(ti) ti.apply();
        player.items.push('tornado');
      }
    }},
  { id:'亀', icon:'亀', name:'亀', desc:'HP+100、ダメージ-15、テンポ-70%、弾速-50。HPを全回復。追加で3回の呪字選択画面に入る',
    apply(){
      if (!curseDeathMode) player.maxHp += 100;
      player.hp = player.maxHp;
      player.damage = Math.max(1, player.damage - 15);
      player.shootInterval = Math.floor(player.shootInterval / 0.3); // テンポ-70%（間隔を約3.3倍に）
      player.bulletSpeed = Math.max(1, player.bulletSpeed * 0.5);    // 弾速-50%
      pendingExtraKameCurse = (pendingExtraKameCurse || 0) + 2;
    }},
  { id:'邪', icon:'邪', name:'邪', desc:'即座に4回のアイテム放棄画面に入る。その後2回の呪字選択画面に入る',
    apply(){
      pendingItemDiscard += 4;
      // 仕様: 放棄後に追加で呪字選択が2回になるように、pendingExtraCurse のみ設定
      pendingExtraCurse = true;
    }},
  { id:'環', icon:'環', name:'環', desc:'アイテムや呪字を捨てる（混・乱の入れ替えを含む）度にHP+1、ダメージ+1',
    apply(){ }},
  { id:'富', icon:'富', name:'富', desc:'HP＋30、ダメージ-5',
    apply(){ if (!curseDeathMode) { player.maxHp += 30; player.hp = Math.min(player.maxHp, player.hp + 30); } player.damage -= 5; }},
  { id:'金', icon:'金', name:'金', desc:'HP-20、ダメージ＋6',
    apply(){
      if (!curseDeathMode) { player.maxHp -= 20; player.hp = Math.min(player.maxHp, player.hp + 20); }
      player.damage += 6;
    }},
  { id:'脆', icon:'脆', name:'脆', desc:'脆弱弾を取得。脆弱弾の脆弱lvが2に強化される',
    apply(){
      const currentLv = getFragileShotLevel();
      if (!player.hasFragileShot) {
        player.hasFragileShot = true;
        player.items.push('fragileshot');
      }
      // 取得済みでも未取得でも、脆弱弾のレベルが2になるように1枚追加する
      if (currentLv < 2) {
        player.items.push('fragileshot');
      }
    }},
  { id:'兵', icon:'兵', name:'兵', desc:'ダメージ+2。1回のアイテム放棄画面に入る。次ボスがオレンジソルジャー（2）確定',
    apply(){
      player.damage += 2;
      pendingItemDiscard += 1;
      pendingForceBoss = 2;
    }},
  { id:'号', icon:'号', name:'号', desc:'レーザー・プラズマ・チャクラムを2つずつ取得。次のボスがイエローシグナル（8）確定',
    apply(){
      const toAdd = [{id:'laser', max:4}, {id:'plasma', max:4}, {id:'chakram', max:4}];
      for (const {id, max} of toAdd) {
        let added = 0;
        while (added < 2 && player.items.filter(x=>x===id).length < max) {
          const item = ALL_ITEMS.find(i=>i.id===id);
          player.items.push(id); if(item) item.apply(); added++;
        }
      }
      pendingForceBoss = 8;
    }},
  { id:'灰', icon:'灰', name:'灰', desc:'次回の呪字選択でのみ追加でもう1つ呪字を選べる。次のボスがグレアン(12)確定',
    apply(){
      pendingForceBoss = 12;
      if (!curseUsedFlags['灰']) { curseUsedFlags['灰'] = true; pendingExtraCurse = true; }
    }},
  { id:'暗', icon:'暗', name:'暗', desc:'即座に3回のアイテム選択に入る。次のボスがイクリプス(13)確定',
    apply(){
      pendingForceBoss = 13;
      pendingExtraItemSelect += 3;
    }},
  { id:'輝', icon:'輝', name:'輝', desc:'ダメージ+5、最大HP+10。次のボスがラディアンス(16)確定',
    apply(){
      player.damage += 5;
      if (!curseDeathMode) player.maxHp += 10;
      pendingForceBoss = 16 ;
    }},
  { id:'夢', icon:'夢', name:'夢', desc:'次回からボスphase突破時に追加アイテム選択1回。次ボスがドリームストーム（14）確定',
    apply(){
      pendingForceBoss = 14;
      curseUsedFlags['夢_extra'] = true;
    }},
  { id:'異', icon:'異', name:'異', desc:'イベント初期発生確率を30%→60%に引き上げ',
    apply(){ eventProbability = Math.max(eventProbability, 0.6); } },
  { id:'避', icon:'避', name:'避', desc:'被弾時の無敵時間が4倍になる',
    apply(){ } },
  { id:'捨', icon:'捨', name:'捨', desc:'全アイテムを捨て、その個数の2倍分ダメージ・最大HPアップ。HPを全回復',
    apply(){
      const cnt = player.items.length;
      player.items = [];
      player.has3Way=false; player.hasSide=false; player.hasBack=false; player.hasHoming=false;
      player.hasBarrier=false; player.barrierActive=false; player.hasSuperFlash=false;
      player.hasDash=false; helperUnits = [];
      player.damage = Math.max(1, player.damage + cnt * 2);
      if (!curseDeathMode) player.maxHp += cnt * 2;
      player.hp = player.maxHp;
    }},
  { id:'走', icon:'走', name:'走', desc:'弾速+10%。ダッシュを取得。ダッシュが2回連続で使えるようになる',
    apply(){
      player.bulletSpeed *= 1.1;
      player.hasDash = true;
      if (!player.items.includes('dash')) player.items.push('dash');
      player.dashCharges = 2;
    }},
  { id:'速', icon:'速', name:'速', desc:'自機の移動速度が1.4倍になる',
    apply(){ /* updatePlayer内で speed に乗算 */ } },
  { id:'怒', icon:'怒', name:'怒', desc:'HP10以下の時、弾ダメージ2倍・テンポ+20%',
    apply(){ } },
  { id:'友', icon:'友', name:'友', desc:'ダメージ+2、HP+2。ミニスナイパーとヘルパーを1つずつ取得。以降これらを取得するたびにダメージ+1・HP+1',
    apply(){
      player.damage += 2;
      if (!curseDeathMode) player.maxHp += 2;
      player.hp = Math.min(player.maxHp, player.hp);
      const snItem = ALL_ITEMS.find(i=>i.id==='sniper');
      if (player.items.filter(x=>x==='sniper').length < 4) { player.items.push('sniper'); if(snItem) snItem.apply(); }
      const hlItem = ALL_ITEMS.find(i=>i.id==='helper');
      if (player.items.filter(x=>x==='helper').length < 4) { player.items.push('helper'); if(hlItem) hlItem.apply(); }
    }},
  { id:'妬', icon:'妬', name:'妬', desc:'ダメージ+10。lv4アイテムを取得するたびにダメージ-1（最大10回）',
    apply(){ player.damage += 10; } },
  { id:'護', icon:'護', name:'護', desc:'HP+30、ダメージ-8、テンポ-20%、弾速-20%',
    apply(){
      if (!curseDeathMode) { player.maxHp += 50; player.hp = Math.min(player.maxHp, player.hp + 30); }
      player.damage = Math.max(1, player.damage - 8);
      player.shootInterval = Math.floor(player.shootInterval / 0.8);
      player.bulletSpeed *= 0.8;
    }},
  { id:'進', icon:'進', name:'進', desc:'次の雑魚敵phaseをスキップし、即座にアイテム選択phaseに入る',
    apply(){ } },
  { id:'祝', icon:'祝', name:'祝', desc:'イベントフェーズをクリアするたびに追加で呪字を1つ選択できる',
    apply(){ } },
  { id:'呪', icon:'呪', name:'呪', desc:'即座に3回の呪字選択画面に入る。但し選択肢が1つであり「取得しない」が無い',
    apply(){
      // apply後に連鎖選択を開始（selectCurse内で処理）
      pendingJuCurse = true;
    }},
  { id:'業', icon:'業', name:'業', desc:'HP+10、体力を全回復。カルマを1つ取得。',
    apply(){
      if (!curseDeathMode) { player.maxHp += 10; }
      player.hp = player.maxHp;
      // カルマを1取得（maxCount: 4の上限チェック）
      if (player.items.filter(x=>x==='karma').length < 4) {
        const ki = ALL_ITEMS.find(i=>i.id==='karma');
        if(ki) ki.apply();
        player.items.push('karma');
      }
    }},
  { id:'激', icon:'激', name:'激', desc:'即座に4回のアイテム選択画面に入る。受けるダメージが常に2倍になる',
    apply(){
      // 受けるダメージ2倍フラグを設定
      curseUsedFlags['激_dmg2x'] = true;
      // 仕様変更: 即時呪字追加は廃止。代わりに追加で4回のアイテム選択画面に入る
      pendingExtraItemSelect = (pendingExtraItemSelect || 0) + 4;
    }},

  { id:'混', icon:'混', name:'混', desc:'所持アイテムを全て別のアイテムにシャッフルする。未取得優先',
    apply(){
      const cnt = player.items.length;
      player.has3Way=false; player.hasSide=false; player.hasBack=false; player.hasHoming=false;
      player.hasBarrier=false; player.barrierActive=false; player.hasSuperFlash=false;
      player.hasDash=false; player.dashCharges=1;
      player.items=[]; helperUnits = [];
      // 環: シャッフル前のアイテム数ぶん「捨てた」扱い
      if (curseSlots.includes('環') && cnt > 0) {
        player.damage += cnt;
        if (!curseDeathMode) { player.maxHp += cnt; player.hp = Math.min(player.maxHp, player.hp + cnt); }
      }
      for (let i = 0; i < cnt; i++) {
        const notHeld = ALL_ITEMS.filter(it => !player.items.includes(it.id) && it.maxCount >= 1);
        const pool = notHeld.length > 0 ? notHeld : ALL_ITEMS.filter(it => {
          const have = player.items.filter(x=>x===it.id).length;
          return have < it.maxCount;
        });
        if (pool.length === 0) break;
        const chosen = pool[Math.floor(Math.random()*pool.length)];
        player.items.push(chosen.id); chosen.apply();
      }
    }},
  { id:'乱', icon:'乱', name:'乱', desc:'所持している呪字（乱は除く）を全てシャッフルして別の呪字に置き換える',
    apply(){
      const count = curseSlots.length; // 乱自身も含む
      // 環: 入れ替え前の呪字数ぶん「捨てた」扱い（乱apply時点でcurseSlotsに乱はまだない）
      const kanActive = curseSlots.includes('環');
      curseSlots = [];
      if (kanActive && count > 0) {
        player.damage += count;
        if (!curseDeathMode) { player.maxHp += count; player.hp = Math.min(player.maxHp, player.hp + count); }
      }
      const pool = [...ALL_CURSES].sort(() => Math.random() - 0.5);
      for (const cs of pool) {
        if (curseSlots.length >= count) break;
        cs.apply();
        curseSlots.push(cs.id);
      }
    }},
  { id:'治', icon:'治', name:'治', desc:'HP+5。プラスヒールの出現率UP・回復量+5（2倍時+10）',
    apply(){
      if (!curseDeathMode) player.maxHp += 5;
      player.hp = Math.min(player.maxHp, player.hp + 5);
      // 出現率・回復量はupdateで参照
    }},
  { id:'蓄', icon:'蓄', name:'蓄', desc:'ストックヒールを1つ獲得。最大所持数5に。回復量+15に強化',
    apply(){
      stockHealMax = 5;
      stockHealAmount = 15;
      if (stockHealCount < stockHealMax) stockHealCount++;
    }},
  { id:'排', icon:'排', name:'排', desc:'即座に2回のアイテム放棄画面に入り、HP＋6、ダメージ＋3',
    apply(){ pendingItemDiscard += 2; if (!curseDeathMode) { player.maxHp += 6; player.hp = Math.min(player.maxHp, player.hp + 6); } player.damage += 3; }},
  { id:'虚', icon:'虚', name:'虚', desc:'所持している「無」の数×ダメージ+4・HP+4。以後「無」が選択肢から消える',
    apply(){
      const mu = curseSlots.filter(x=>x==='無').length;
      player.damage += mu * 4;
      if (!curseDeathMode) { player.maxHp += mu * 4; player.hp = Math.min(player.maxHp, player.hp + mu*4); }
      curseKyoUsed = true; curseMuFixed = false;
    }},
  { id:'無', icon:'無', name:'無', get desc(){ return curseMuCount > 0 ? '【取得済】効果なし。何度でも取得可能' : '【未取得】次回の呪字選択左端が「無」固定になる。何度でも取得可能'; },
    apply(){
      curseMuCount++;
      if (curseMuCount === 1) curseMuFixed = true; // 初回のみ固定化開始
    }},
  { id:'砲', icon:'砲', name:'砲', desc:'ダメージ+10、テンポ-50%、弾速-30%',
    apply(){
      player.damage += 10;
      player.shootInterval = Math.floor(player.shootInterval / 0.5);
      player.bulletSpeed *= 0.7;
    }},
  { id:'掃', icon:'掃', name:'掃', desc:'直ちに2回のアイテム放棄画面に入る',
    apply(){ pendingItemDiscard += 2; }},
  { id:'除', icon:'除', name:'除', desc:'ダメージ+2、HP+4。直ちに5回のアイテム放棄画面に入る',
    apply(){
      player.damage += 2;
      if (!curseDeathMode) { player.maxHp += 4; player.hp = Math.min(player.maxHp, player.hp + 4); }
      pendingItemDiscard += 5;
    }},
  { id:'換', icon:'換', name:'換', desc:'直ちに3回のアイテム放棄画面に入り、その後に3回のアイテム選択画面に入る',
    apply(){ pendingItemDiscard += 3; pendingExtraItemSelect += 3; }},
  { id:'弱', icon:'弱', name:'弱', desc:'ダメージ-5、HP-5',
    apply(){
      player.damage = Math.max(1, player.damage - 5);
      player.maxHp = Math.max(1, player.maxHp - 5);
      player.hp = Math.min(player.maxHp, player.hp);
    }},
  { id:'低', icon:'低', name:'低', desc:'ダメージ+1、HP-2',
    apply(){
      player.damage += 1;
      player.maxHp = Math.max(1, player.maxHp - 2);
      player.hp = Math.min(player.maxHp, player.hp);
    }},
  { id:'再', icon:'再', name:'再', desc:'次回以降の呪字選択でリロール回数+2にされる',
    apply(){ curseUsedFlags['再_extra'] = (curseUsedFlags['再_extra']||0) + 2; }},
  { id:'死', icon:'死', name:'死', desc:'ダメージ+50。最大HP2固定（HP上昇無効）',
    apply(){
      player.damage += 50;
      curseDeathMode = true;
      player.maxHp = 2; player.hp = 2;
    }},
];

function getFragileShotLevel() {
  return Math.max(0, player.items.filter(x => x === 'fragileshot').length);
}

function getBaseEventProbability() {
  if (loopCount <= 1) return 0;
  return curseSlots.includes('異') ? 0.6 : 0.3;
}

function getRandomCurses(n) {
  // 既に取得している呪字は基本除外（複数取得不可な呪字）
  const singleUse = ['癒','育','吸','命','倍','暴','電','満','全','得','装','基','礎','号','灰','暗','輝','異','避','捨','死','走','速','怒','友','妬','護','祝','呪','進','業','激','混','乱','治','蓄','排','虚','砲','掃','除','換','弱','低','兵','再','夢','炎','染','脆','蟲','渦','亀','邪','富','金','環'];//現在の呪字数→57
  // 虚取得後は無を除外、未取得の場合は何度でも取得可
  const isMuExcluded = curseKyoUsed;
  const pool = ALL_CURSES.filter(c => {
    if (singleUse.includes(c.id) && curseSlots.includes(c.id)) return false;
    if (c.id === '灰' && curseUsedFlags['灰']) return false;
    if (c.id === '暗' && curseSlots.includes('暗')) return false;
    if (c.id === '進' && curseUsedFlags['進']) return false;
    if (c.id === '無' && isMuExcluded) return false;
    if (c.id === '虚' && curseKyoUsed) return false;
    if (c.id === '渦' && curseUsedFlags['渦']) return false;
    if (c.id === '亀' && curseSlots.includes('亀')) return false;
    if (c.id === '邪' && curseSlots.includes('邪')) return false;
    return true;
  });
  const shuffled = [...pool].sort(() => Math.random()-0.5);
  return shuffled.slice(0, n);
}

// ==================== アイテム放棄PHASE ====================
function showItemDiscard(times, onComplete) {
  if (times <= 0 || player.items.length === 0) { onComplete(); return; }

  function doOneDiscard() {
    if (times <= 0 || player.items.length === 0) { onComplete(); return; }
    times--;

    // 現在のアイテムから最大4つを選択肢として表示
    const unique = [...new Set(player.items)];
    const choices = unique.sort(() => Math.random()-0.5).slice(0, 4);

    let html = `<div class="item-select-title" style="color:#ff8866;text-shadow:0 0 15px #ff4400">⚠️ アイテム放棄 ⚠️</div>`;
    html += `<div class="info-text" style="margin-bottom:16px;color:#ffaa88">捨てるアイテムを1つ選んでください</div>`;
    html += `<div class="item-cards">`;
    for (const id of choices) {
      const it = ALL_ITEMS.find(i=>i.id===id);
      if (!it) continue;
      const cnt = player.items.filter(x=>x===id).length;
      html += `<div class="item-card" style="border-color:#ff440044"
           onmouseover="this.style.borderColor='#ff6644';this.style.boxShadow='0 0 18px #ff664466'"
           onmouseout="this.style.borderColor='#ff440044';this.style.boxShadow=''"
           onclick="discardItem('${id}')">
        <div class="item-card-icon" style="font-size:28px">${it.icon}</div>
        <div class="item-card-name" style="color:#ff8866">${it.name} ${ cnt>1 ? 'Lv'+cnt : '' }</div>
        <div class="item-card-desc">${it.desc}</div>
      </div>`;
    }
    html += `</div>`;
    showOverlay(html);
    window._discardCallback = doOneDiscard;
  }
  doOneDiscard();
}

window.discardItem = function(id) {
  // アイテムを1つ削除（lv-1相当）
  const idx = player.items.indexOf(id);
  if (idx >= 0) player.items.splice(idx, 1);
  // ステータス系アイテムは逆適用（捨てた分を戻す）
  const statReverse = {
    'hp2':  () => { player.maxHp = Math.max(1, player.maxHp - 2); player.hp = Math.min(player.hp, player.maxHp); },
    'hp3':  () => { player.maxHp = Math.max(1, player.maxHp - 3); player.hp = Math.min(player.hp, player.maxHp); },
    'hp5':  () => { player.maxHp = Math.max(1, player.maxHp - 5); player.hp = Math.min(player.hp, player.maxHp); },
    'dmg1': () => { player.damage = Math.max(1, player.damage - 1); },
    'dmg2': () => { player.damage = Math.max(1, player.damage - 2); },
    'dmg3': () => { player.damage = Math.max(1, player.damage - 3); },
  };
  if (statReverse[id]) statReverse[id]();
  // 環: アイテムを捨てるたびにHP+1, DMG+1
  if (curseSlots.includes('環')) {
    player.damage += 1;
    if (!curseDeathMode) { player.maxHp += 1; player.hp = Math.min(player.maxHp, player.hp + 1); }
  }
  // 特殊フラグの更新
  if (id === 'barrier' && player.items.filter(x=>x==='barrier').length === 0) player.hasBarrier = false;
  if (id === 'superflash' && player.items.filter(x=>x==='superflash').length === 0) player.hasSuperFlash = false;
  if (id === '3way' && player.items.filter(x=>x==='3way').length === 0) player.has3Way = false;
  if (id === 'side' && player.items.filter(x=>x==='side').length === 0) player.hasSide = false;
  if (id === 'back' && player.items.filter(x=>x==='back').length === 0) player.hasBack = false;
  if (id === 'homing' && player.items.filter(x=>x==='homing').length === 0) player.hasHoming = false;
  if (id === 'dash' && player.items.filter(x=>x==='dash').length === 0) player.hasDash = false;
  if (id === 'fragileshot') {
    player.hasFragileShot = player.items.some(x => x === 'fragileshot');
  }
  if (id === 'helper') { const lv = player.items.filter(x=>x==='helper').length; if(lv===0) helperUnits=[]; }
  if (window._discardCallback) window._discardCallback();
};

function showCurseSelect(onComplete, extraTimes = 0, allowReroll = true) {
  const kameTimes = pendingExtraKameCurse || 0;
  pendingExtraKameCurse = 0;
  const times = 1 + (pendingExtraCurse ? 1 : 0) + extraTimes + kameTimes;
  pendingExtraCurse = false;
  let remaining = times;
  const extraReroll = curseUsedFlags['再_extra'] || 0;
  let rerollLeft = allowReroll ? (1 + extraReroll) : 0; // 再呪字でリロール回数増
  let extraChoices = 0; // リロールのたびに+1される選択肢

  function doOnePick() {
    if (remaining <= 0) {
      // 暗: 追加アイテム選択
      if (pendingExtraItemSelect > 0) {
        const n = pendingExtraItemSelect; pendingExtraItemSelect = 0;
        showItemSelectSequence('【呪字効果】追加アイテム選択', n, onComplete);
      } else {
        onComplete();
      }
      return;
    }
    remaining--;
    // 亀による追加呪字選択を現在進行中の選択で反映
    if (pendingExtraKameCurse > 0) {
      remaining += pendingExtraKameCurse;
      pendingExtraKameCurse = 0;
    }
    // 複数連続選択の場合、毎回リロール回数をリセット
    rerollLeft = allowReroll ? (1 + (curseUsedFlags['再_extra'] || 0)) : 0;
    extraChoices = 0;
    // 無: 左端固定
    let picks = getRandomCurses(3 + extraChoices);
    if (curseMuFixed && !curseKyoUsed) {
      const muCurse = ALL_CURSES.find(c=>c.id==='無');
      picks = [muCurse, ...getRandomCurses(2).filter(c=>c.id!=='無')].slice(0,3);
    }
    renderCursePick(picks);
  }

  function renderCursePick(choices) {
    let html = `<div class="item-select-title" style="color:#cc88ff;text-shadow:0 0 15px #aa44ff">🔮 呪字選択 🔮</div>`;
    html += `<div class="info-text" style="margin-bottom:16px;color:#bb77ee">呪字は強力だが、代償を伴う...</div>`;
    html += `<div class="item-cards">`;
    for (const cs of choices) {
      html += `
        <div class="item-card" style="border-color:#6622aa44"
             onmouseover="this.style.borderColor='#aa44ff';this.style.boxShadow='0 0 18px #aa44ff66'"
             onmouseout="this.style.borderColor='#6622aa44';this.style.boxShadow=''"
             onclick="selectCurse('${cs.id}')">
          <div class="item-card-icon" style="color:#cc88ff;text-shadow:0 0 12px #aa44ff;font-size:32px">${cs.icon}</div>
          <div class="item-card-name" style="color:#cc88ff">${cs.name}</div>
          <div class="item-card-desc">${cs.desc}</div>
        </div>`;
    }
    // 4枚目は常にランダム呪字（「取得しない」廃止）
    const extra4 = getRandomCurses(1).filter(c => !choices.includes(c))[0] || getRandomCurses(1)[0];
    if (extra4) {
      html += `<div class="item-card" style="border-color:#6622aa44"
           onmouseover="this.style.borderColor='#aa44ff';this.style.boxShadow='0 0 18px #aa44ff66'"
           onmouseout="this.style.borderColor='#6622aa44';this.style.boxShadow=''"
           onclick="selectCurse('${extra4.id}')">
        <div class="item-card-icon" style="color:#cc88ff;text-shadow:0 0 12px #aa44ff;font-size:32px">${extra4.icon}</div>
        <div class="item-card-name" style="color:#cc88ff">${extra4.name}</div>
        <div class="item-card-desc">${extra4.desc}</div>
      </div>`;
    }
    html += `</div>`;
    // リロールボタン
    if (rerollLeft > 0) {
      html += `<div style="margin-top:10px;text-align:center">
        <button onclick="curseReroll()" style="background:rgba(60,20,80,0.85);border:1px solid #8844cc;color:#cc88ff;padding:6px 20px;border-radius:6px;cursor:pointer;font-size:13px">
          🔄 リロール（残り${rerollLeft}回）
        </button></div>`;
    }
    if (curseSlots.length > 0) {
      html += `<div class="info-text" style="margin-top:8px">所持呪字：</div><div class="item-list-display">`;
      for (const id of curseSlots) { const cs = ALL_CURSES.find(c=>c.id===id); if(cs) html += `<span class="item-badge" style="border-color:#aa44ff;color:#cc88ff">${cs.icon} ${cs.name}</span>`; }
      html += `</div>`;
    }
    showOverlay(html);
    window._curseSelectCallback = doOnePick;
    window.curseReroll = function() {
      if (rerollLeft <= 0) return;
      rerollLeft--;
      if (extraReroll > 0) extraChoices++;
      // rerenderのみ（remainingは消費しない・増やさない）
      let picks = getRandomCurses(3 + extraChoices);
      if (curseMuFixed && !curseKyoUsed) {
        const muCurse = ALL_CURSES.find(c=>c.id==='無');
        picks = [muCurse, ...getRandomCurses(2).filter(c=>c.id!=='無')].slice(0,3);
      }
      renderCursePick(picks);
    };
  }

  doOnePick();
}

window.selectCurse = function(id) {
  if (id !== 'none') {
    const cs = ALL_CURSES.find(c=>c.id===id);
    if (cs) { cs.apply(); curseSlots.push(id); }
  }
  // アイテム放棄phase
  if (pendingItemDiscard > 0) {
    const n = pendingItemDiscard; pendingItemDiscard = 0;
    const orig = window._curseSelectCallback;
    // 放棄完了後に換の追加アイテム選択も処理
    const afterDiscard = () => {
      // 優先: 追加アイテム選択があれば先に処理
      if (pendingExtraItemSelect > 0) {
        const ni = pendingExtraItemSelect; pendingExtraItemSelect = 0;
        showItemSelectSequence('換の呪字 — アイテム選択', ni, () => {
          // アイテム選択完了後、追加呪字フラグがあれば差し込む
          if (pendingExtraCurse) {
            pendingExtraCurse = false;
            showCurseSelect(orig || (()=>{}), 1, true);
          } else if (orig) {
            orig();
          }
        });
      } else if (pendingExtraCurse) {
        // 放棄のみ発生していて追加呪字フラグが立っている場合
        pendingExtraCurse = false;
        showCurseSelect(orig || (()=>{}), 1, true);
      } else if (orig) {
        orig();
      }
    };
    showItemDiscard(n, afterDiscard);
    window._curseSelectCallback = null;
    return;
  }
    // 亀や類似の追加呪字フラグがあればここで差し込む
    if (pendingExtraKameCurse > 0) {
      const k = pendingExtraKameCurse || 0;
      pendingExtraKameCurse = 0;
      const orig = window._curseSelectCallback;
      // extraTimes=k を渡して追加選択を行い、完了後に元のコールバックへ戻す
      showCurseSelect(orig || (()=>{}), k, true);
      return;
    }
  // 激: apply後にpendingExtraCurseがセットされていたら追加選択を差し込む
  if (pendingExtraCurse) {
    pendingExtraCurse = false;
    // 現在のコールバック（doOnePick）の前に1回分追加で選択させる
    const origCallback = window._curseSelectCallback;
    window._curseSelectCallback = function() {
      window._curseSelectCallback = origCallback;
      // extraTimes=1 を渡して追加選択を確実に行う
      showCurseSelect(origCallback || (()=>{}), 1, true);
    };
    if (window._curseSelectCallback) { window._curseSelectCallback(); return; }
  }
  // 呪: apply後に強制3連呪字選択
  if (pendingJuCurse) {
    pendingJuCurse = false;
    let juRemaining = 3;
    const doJuPick = () => {
      if (juRemaining <= 0) { if (window._curseSelectCallback) window._curseSelectCallback(); return; }
      juRemaining--;
      const choices = getRandomCurses(1);
      if (choices.length === 0) { doJuPick(); return; }
      const cs2 = choices[0];
      let html = `<div class="item-select-title" style="color:#cc88ff;text-shadow:0 0 15px #aa44ff">🔮 呪の呪字 🔮</div>`;
      html += `<div class="info-text" style="margin-bottom:16px;color:#bb77ee">残り${juRemaining+1}回 — 必ず取得する</div>`;
      html += `<div class="item-cards">`;
      html += `<div class="item-card" style="border-color:#aa44ff"
           onmouseover="this.style.borderColor='#cc88ff'" onmouseout="this.style.borderColor='#aa44ff'"
           onclick="selectJuCurse('${cs2.id}')">
        <div class="item-card-icon" style="color:#cc88ff;font-size:32px">${cs2.icon}</div>
        <div class="item-card-name" style="color:#cc88ff">${cs2.name}</div>
        <div class="item-card-desc">${cs2.desc}</div>
      </div>`;
      html += `</div>`;
      showOverlay(html);
      window._juCallback = doJuPick;
    };
    doJuPick();
    return;
  }
  if (window._curseSelectCallback) window._curseSelectCallback();
};

window.selectJuCurse = function(id) {
  const cs = ALL_CURSES.find(c=>c.id===id);
  if (cs) { cs.apply(); curseSlots.push(id); }
  // 呪字効果でpendingItemDiscardが発生した場合は放棄phaseを挟む
  if (pendingItemDiscard > 0) {
    const n = pendingItemDiscard; pendingItemDiscard = 0;
    const orig = window._juCallback;
    const afterDiscard = () => {
      if (pendingExtraItemSelect > 0) {
        const ni = pendingExtraItemSelect; pendingExtraItemSelect = 0;
        showItemSelectSequence('追加アイテム選択', ni, orig || (()=>{}));
      } else if (orig) orig();
    };
    showItemDiscard(n, afterDiscard);
    window._juCallback = null;
    return;
  }
  if (window._juCallback) window._juCallback();
};

function getAvailableItems() {
  const pool = [];
  
  for (const item of ALL_ITEMS) {
    const count = player.items.filter(id => id === item.id).length;
    // 所持数が上限未満なら、プールに追加するだけ（同時出現の制限は getRandomItems 側で行われる）
    if (count < item.maxCount) {
      if (item.id === 'barrier' && player.barrierRechargeCooldown > 0) continue;
      if (item.id === 'superflash' && player.superFlashRechargeCooldown > 0) continue;
      if (item.id === 'stockheal' && stockHealCount >= stockHealMax) continue;
      
      pool.push(item);
    }
  }
  return pool;
}

function getRandomItems(n) {
  const dmgIds = ['dmg1', 'dmg2', 'dmg3'];
  const hpIds = ['hp2', 'hp3', 'hp4', 'hp5'];
  const pool = getAvailableItems();
  const result = [];
  const shuffled = pool.sort(() => Math.random()-0.5);
  
  for (const item of shuffled) {
    if (result.length >= n) break;
    const hasDmgGroup = result.some(i => dmgIds.includes(i.id));
    const hasHpGroup = result.some(i => hpIds.includes(i.id));
    
    if ((dmgIds.includes(item.id) && hasDmgGroup) || (hpIds.includes(item.id) && hasHpGroup)) {
      continue;
    }
    result.push(item);
  }
  
  return result;
}

// ==================== UI / OVERLAY ====================
function showOverlay(html) {
  const el = document.getElementById('overlay'); el.innerHTML = html; el.classList.remove('hidden');
}
function hideOverlay() { document.getElementById('overlay').classList.add('hidden'); }

function showInitialItemSelect() {
  resetPlayer();
  bossRushMode = false;
  itemSelectRound = 0;
  showItemSelectSequence('初期アイテム選択', 6, () => {
    // 初期アイテム選択後に呪字選択
    showCurseSelect(() => { hideOverlay(); startWave(1); });
  });
}

function showItemSelectSequence(title, totalPicks, onComplete) {
  let picksLeft = totalPicks;
  function doNextPick() {
    if (picksLeft <= 0) { onComplete(); return; }
    const picked = totalPicks - picksLeft + 1;
    const items = getRandomItems(4);
    showItemSelectScreen(items, title, `${picked} / ${totalPicks} 個目を選択`, () => { picksLeft--; doNextPick(); });
  }
  doNextPick();
}

function showItemSelectScreen(items, title, subtitle, callback) {
  let html = `<div class="item-select-title">${title}</div>`;
  if (subtitle) html += `<div class="info-text" style="margin-bottom:20px">${subtitle}</div>`;
  html += `<div class="item-cards">`;
  for (const item of items) {
    const count = player.items.filter(id => id === item.id).length;
    const onceClass = item.maxCount === 1 ? ' once-only' : '';
    let badgeStr = '';
    if (item.maxCount === 1) badgeStr = '<span class="badge">1回限り</span>';
    else if (item.maxCount <= 4) badgeStr = `<span class="badge">Lv ${count+1}/${item.maxCount}</span>`;
    
    html += `
      <div class="item-card${onceClass}" onclick="selectItem('${item.id}')">
        ${badgeStr}
        <div class="item-card-icon">${item.icon}</div>
        <div class="item-card-name">${item.name}</div>
        <div class="item-card-desc">${item.desc}</div>
      </div>`;
  }
  html += `</div>`;
  if (player.items.length > 0) {
    html += `<div class="info-text">所持アイテム：</div><div class="item-list-display">`;
    for (const id of player.items) {
      const it = ALL_ITEMS.find(i=>i.id===id);
      if (it) html += `<span class="item-badge">${it.icon} ${it.name}</span>`;
    }
    html += `</div>`;
  }
  showOverlay(html);
  window._itemSelectCallback = callback;
}

window.selectItem = function(id) {
  const item = ALL_ITEMS.find(i=>i.id===id);
  if (!item) return;
  item.apply();
  player.items.push(id);
  // 友呪字: sniper/helper取得でダメージ+1・HP+1
  if (curseSlots.includes('友') && (id === 'sniper' || id === 'helper')) {
    player.damage += 1;
    if (!curseDeathMode) { player.maxHp += 1; player.hp = Math.min(player.maxHp, player.hp + 1); }
  }
  // 妬呪字: lv4アイテム取得でダメージ-1 (最大10回)
  const _lv4ids = ['laser','shotgun','bomb','sniper','plasma','stick','chakram','bubble','tornado','meteor','helper','fire','poisontrap'];
  if (curseSlots.includes('妬') && _lv4ids.includes(id)) {
    if (!curseUsedFlags['妬_count']) curseUsedFlags['妬_count'] = 0;
    if (curseUsedFlags['妬_count'] < 10) { curseUsedFlags['妬_count']++; player.damage = Math.max(1, player.damage - 1); }
  }
  if (window._itemSelectCallback) window._itemSelectCallback();
};

function startWave(phase) {
  // 癒: 各雑魚敵phase開始時HP+5
  if (curseSlots.includes('癒') && !curseDeathMode) { player.hp = Math.min(player.maxHp, player.hp + 5); }
  // ファイア燃料: wave突破ごとに+100
  if (fireFuelMax > 0) fireFuel = Math.min(fireFuelMax, fireFuel + 100);
  // 進: wave1スキップ（1回限り）
  if (curseSlots.includes('進') && phase === 1 && !curseUsedFlags['進']) {
    curseUsedFlags['進'] = true;
    wavePhase = 1;
    waveComplete();
    return;
  }
  wavePhase = phase; state = 'wave';
  enemies = []; enemyBullets = []; playerBullets = []; playerLasers = []; playerBombs = []; playerChakrams = []; playerBubbles = []; enemyLasers = []; plasmas = []; playerTornadoes = []; playerMeteors = []; playerFragileShots = [];
  player._poisonAura = null; // playerBullets リセットに伴いオーラ参照もリセット（次フレームで再生成）
  waveTimer = 0; spawnTimer = 0; waveClearing = false;
  boss = null; bossManager = null;

  // currentEvent / eventEnemyType / eventDamageMult / fogIntensity はtriggerEvent()で設定済みなので保持。
  // dropletEnemiesだけ空にしてwave内で生成する。
  eventWarningTimer = 0;
  dropletEnemies = [];

  hideOverlay(); showPhaseBanner(phase);

  // dropletsイベント
  if (currentEvent === 'droplets') {
    const d1 = createDropletEnemy();
    enemies.push(d1);
    dropletEnemies.push(d1);
  }
  // 巨大ブラックホールイベント初期化
  if (currentEvent === 'giant_blackhole') {
    const bx = 80 + Math.random()*(W-160), by = 80 + Math.random()*(H/2);
    bhEvent = { x: bx, y: by, phase: 'suck', phaseTimer: 0, totalTimer: 0, particles: [], bhParticles: [] };
  }
  // ピラーイベント初期化
  if (currentEvent === 'pillar') {
    pillarEvent = { laserTimer: 0 };
    pillarLasers = [];
  }
}

let bannerTimer = 0, bannerText = '', showBanner = false;
let bannerSubText = ''; // イベントメッセージ用サブテキスト
let bannerSubColor = '#f00'; // サブテキスト色

function showPhaseBanner(phase) {
  showBanner = true;
  bannerText = `WAVE ${phase}`;
  bannerTimer = currentEvent ? 180 : 120; // イベントありは長めに表示
  bannerSubText = currentEvent ? eventWarningText : '';
  bannerSubColor = currentEvent === 'doubleDamage' ? '#ff4444' :
                   currentEvent === 'fog'          ? '#aaaaff' :
                   currentEvent === 'droplets'     ? '#66ddff' :
                   currentEvent === 'swarm'        ? '#ff6600' :
                   currentEvent === 'giant_blackhole' ? '#cc66ff' :
                   currentEvent === 'pillar'       ? '#ffcc00' : '#f00';
}

// ========== ショップ削除 ==========

function waveComplete() {
  // シミュレーションモード分岐
  if (simulationMode) { simPhaseComplete(); return; }

  state = 'itemSelect'; itemSelectRound = wavePhase;

  const titles = ['','WAVE 1 クリア！','WAVE 2 クリア！','WAVE 3 クリア！'];
  const baseTitle = titles[wavePhase] || 'アイテム選択';

  // ★修正：終わったウェーブのイベント状態をここでリセットする
  currentEvent = null;
  eventEnemyType = null;
  eventDamageMult = 1;
  fogIntensity = 0;
  bhEvent = null;
  pillarEvent = null;
  pillarLasers = [];

  const goNext = () => {
    hideOverlay();
    // ★修正：ここにあったイベントリセット処理を削除しました
    if (wavePhase < 3) startWave(wavePhase + 1);
    else startBoss();
  };

  // ② 次waveのイベント発動判定
  let nextEventTriggered = false;
  
  // 1週目は0%、2週目以降は初期確率(30%/60%)から始め、雑魚敵phase突破ごとに+10%ずつ上げる
  if (wavePhase < 3) {
    const baseChance = getBaseEventProbability();
    if (forceNextEvent || (loopCount > 1 && Math.random() < eventProbability)) {
      triggerEvent();
      nextEventTriggered = true;
      eventProbability = baseChance;
      forceNextEvent = false;
    } else if (loopCount > 1) {
      eventProbability = Math.min(1.0, eventProbability + 0.1);
    }
  } else {
    forceNextEvent = false; // ボス前ならフラグを消火
  }

  // ③ イベント突破ボーナスの付与判定
  const hasBonusNow = pendingEventBonus;
  pendingEventBonus = false;

  if (nextEventTriggered) {
    pendingEventBonus = true; 
  }

  const itemCount = 3 + (hasBonusNow ? 1 : 0);

  const waveGoNextBase = (curseSlots.includes('祝') && hasBonusNow) ? () => showCurseSelect(goNext) : goNext;

  if (nextEventTriggered) {
    showEventAnnounce(baseTitle, itemCount, hasBonusNow, waveGoNextBase);
  } else {
    const titleWithBonus = hasBonusNow
      ? `${baseTitle} ✦ イベント突破ボーナス ✦`
      : baseTitle;
    showItemSelectSequence(titleWithBonus, itemCount, waveGoNextBase);
  }
}


function showEventAnnounce(baseTitle, itemCount, hasBonusNow, onAllComplete) {
  // 次waveのイベント内容詳細テキスト
  const nameMap = {tri:'トライ',diamond:'ダイヤモンド',square:'スクエア',hex:'ヘックス',
    sideTri:'サイドトライ',rect:'レクト',circle:'サークル',plus:'プラス',
    pentagon:'ペンタゴン',octagon:'オクタゴン',arrow:'アロー',star:'スター'};
  const eventDescMap = {
    swarm:       { color:'#ff6600', icon:'⚠️', title:'大量発生イベント！',
                   desc:`次のWAVEで<span style="color:#ff6600;font-weight:bold">${nameMap[eventEnemyType]||eventEnemyType}</span>が大量出現する！` },
    fog:         { color:'#aaaaff', icon:'🌫️', title:'濃霧発生イベント！',
                   desc:'次のWAVEは<span style="color:#aaaaff;font-weight:bold">濃霧</span>に覆われ、視界が悪化する！' },
    doubleDamage:{ color:'#ff4444', icon:'💢', title:'敵強化イベント！',
                   desc:'次のWAVEは<span style="color:#ff4444;font-weight:bold">敵のダメージが2倍</span>になる！' },
    droplets:    { color:'#66ddff', icon:'💗', title:'ハート出現イベント！',
                   desc:'次のWAVEで<span style="color:#66ddff;font-weight:bold">不死身のハート</span>が出現する！体当たりに注意！' },
    giant_blackhole: { color:'#cc66ff', icon:'🌀', title:'巨大ブラックホール発生イベント！',
                   desc:'次のWAVEで<span style="color:#cc66ff;font-weight:bold">巨大ブラックホール</span>が出現！吸い込みと吐き出しに翻弄される！' },
    pillar:      { color:'#ffcc00', icon:'⚡', title:'ピラーイベント！',
                   desc:'次のWAVEで<span style="color:#ffcc00;font-weight:bold">壁からレーザー</span>が3秒ごとに迫ってくる！各レーザー2ダメージ！' },
  };
  const info = eventDescMap[currentEvent] || { color:'#ff0', icon:'⚡', title:'イベント発生！', desc:'次のWAVEで特殊なイベントが起きる！' };

  // ① まず通常アイテム選択（ボーナスありなら+1枚込み）
  const titleWithBonus = hasBonusNow ? `${baseTitle} ✦ イベント突破ボーナス ✦` : baseTitle;
  showItemSelectSequence(titleWithBonus, itemCount, () => {
    // ② アイテム選択完了後にイベント告知画面
    showOverlay(`
      <div style="text-align:center;padding:20px">
        <div style="font-size:48px;margin-bottom:8px">${info.icon}</div>
        <div style="font-size:32px;font-weight:bold;color:${info.color};
             text-shadow:0 0 20px ${info.color};letter-spacing:4px;margin-bottom:16px">
          ⚡ EVENT INCOMING ⚡
        </div>
        <div style="font-size:22px;color:#fff;font-weight:bold;margin-bottom:12px">${info.title}</div>
        <div style="font-size:15px;color:#ccc;margin-bottom:28px;line-height:1.6">${info.desc}</div>
        <div style="font-size:13px;color:#888;margin-bottom:24px">
          ★ このイベントを突破すると、次のアイテム選択でボーナス+1個獲得！
        </div>
        <button class="btn" style="border-color:${info.color};color:${info.color};font-size:16px;padding:14px 40px"
          onclick="window._eventConfirmCallback && window._eventConfirmCallback()">
          次のWAVEへ →
        </button>
      </div>
    `);
    window._eventConfirmCallback = () => { onAllComplete(); };
  });
}


function triggerEvent() {
  const allEvents = ['swarm', 'fog', 'doubleDamage', 'droplets', 'giant_blackhole', 'pillar'];
  // 前回と同じイベントを除外して連続防止
  const availableEvents = allEvents.filter(e => e !== lastEvent);
  currentEvent = availableEvents[Math.floor(Math.random() * availableEvents.length)];
  lastEvent = currentEvent; // 次回の連続防止のために記録
  
  eventWarningText = '';
  eventWarningTimer = 0; // wave開始時のバナーで表示するため0に（wave中には不要）
  
  switch(currentEvent) {
    case 'swarm': {
      const enemies_types = ['tri', 'diamond', 'square', 'hex', 'sideTri', 'rect', 'circle', 'plus', 'pentagon', 'octagon', 'arrow', 'star'];
      eventEnemyType = enemies_types[Math.floor(Math.random() * enemies_types.length)];
      const nameMap = { tri: 'トライ', diamond: 'ダイヤモンド', square: 'スクエア', hex: 'ヘックス', sideTri: 'サイドトライ', rect: 'レクト', circle: 'サークル', plus: 'プラス', pentagon: 'ペンタゴン', octagon: 'オクタゴン', arrow: 'アロー', star: 'スター' };
      eventWarningText = `⚠ ${nameMap[eventEnemyType]}大量発生！`;
      break;
    }
    case 'fog':
      eventWarningText = '🌫 濃霧発生！視界が悪化する！';
      fogIntensity = 0.9;
      break;
    case 'doubleDamage':
      eventWarningText = '💢 敵のダメージ2倍！';
      eventDamageMult = 2;
      break;
    case 'droplets':
      eventWarningText = '💗 ハート発進！不死身の体当たりに注意！';
      // droplets敵はwave開始時（startWave後）に生成する
      dropletEnemies = [];
      break;
    case 'giant_blackhole':
      eventWarningText = '🌀 巨大ブラックホール出現！';
      bhEvent = null; // startWave時に初期化
      break;
    case 'pillar':
      eventWarningText = '⚡ ピラー発動！壁からレーザーが迫る！';
      pillarEvent = null;
      pillarLasers = [];
      break;
  }
}

function drawEventWarning() {
  if (eventWarningTimer > 0) {
    ctx.save();
    ctx.font = 'bold 40px Courier New';
    ctx.fillStyle = '#f00';
    ctx.shadowColor = '#f00';
    ctx.shadowBlur = 20;
    ctx.textAlign = 'center';
    ctx.fillText(eventWarningText, W/2, H/2);
    ctx.textAlign = 'left';
    ctx.restore();
    eventWarningTimer--;
  }
}

function startBoss() {
  state = 'boss';
  enemies = []; enemyBullets = []; playerBullets = []; playerLasers = []; playerBombs = []; playerChakrams = []; playerBubbles = []; enemyLasers = []; plasmas = [];
  player._poisonAura = null;
  
  currentEvent = null;
  eventEnemyType = null;
  eventDamageMult = 1;
  fogIntensity = 0;
  eventWarningTimer = 0;
  dropletEnemies = [];
  
  // 既存の確定ボス指定と、通常選出の両方をカバーするため 1〜18 までの候補を使う
  let availableBosses = [];
  for (let i = 1; i <= 18; i++) {
    // 最近戦ったボス(最大5体)に含まれていなければ、抽選対象にする
    if (!recentBosses.includes(i)) availableBosses.push(i);
  }
  // 万が一空になった場合（基本ありえません）のフェイルセーフ
  if (availableBosses.length === 0) availableBosses = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
  
  if (pendingForceBoss > 0) {
    bossType = Math.max(1, Math.min(18, pendingForceBoss));
    pendingForceBoss = 0;
  } else {
    bossType = availableBosses[Math.floor(Math.random() * availableBosses.length)];
  }
  
  // 選ばれたボスを履歴の最後に追加し、5体を超えたら古い履歴を消す
  recentBosses.push(bossType);
  if (recentBosses.length > 5) recentBosses.shift();
  
  boss = null; bossManager = null;
  switch(bossType) {
    case 1: boss = createBoss1(); break; case 2: boss = createBoss2(); break;
    case 3: boss = createBoss3(); break; case 4: boss = createBoss4(); break;
    case 5: boss = createBoss5(); break; case 6: boss = createBoss6(); break;
    case 7: boss = createBoss7(); break; case 8: bossManager = createBoss8(); break;
    case 9: boss = createBoss9(); break; case 10: boss = createBoss10(); break;
    case 11: boss = createBoss11(); break; case 12: boss = createBoss12(); break;
    case 13: boss = createBoss13(); break; case 14: boss = createBoss14(); break;
    case 15: boss = createBoss15(); break; case 16: boss = createBoss16(); break;
    case 17: boss = createBoss17(); break; case 18: boss = createBoss18(); break;
  }
  showBanner = true; bannerText = `BOSS ${bossType} INCOMING`; bannerTimer = 150;
}

function showClearScreen() {
  state = 'clear';
  // シミュレーションモード分岐
  if (simulationMode) { simPhaseComplete(); return; }
  // ボス撃破報酬：ストックヒール+1
  if (stockHealCount < stockHealMax) stockHealCount++;
  // ボス撃破後に呪字選択（ボスラッシュ除く）
  if (!bossRushMode) {
    showCurseSelect(() => { showClearScreenActual(); }, 1); // ボス後は2回呪字選択
  } else {
    showClearScreenActual();
  }
}

function showClearScreenActual() {
  // 夢: ボスphase突破ごとに追加アイテム選択
  if (curseUsedFlags['夢_extra'] && !bossRushMode) {
    showItemSelectSequence('夢の加護 — 追加アイテム選択', 1, () => showClearScreenActual2());
    return;
  }
  showClearScreenActual2();
}
function showClearScreenActual2() {
  let html = `<div class="clear-banner">★ ${bossRushMode ? 'BOSS DEFEATED' : 'STAGE CLEAR'} ★</div>`;
  html += `<div class="info-text" style="margin-bottom:16px">ボスを撃破した！</div>`;
  html += `<div class="info-text">所持アイテム：</div><div class="item-list-display">`;
  for (const id of player.items) { const it = ALL_ITEMS.find(i=>i.id===id); if(it) html += `<span class="item-badge">${it.icon} ${it.name}</span>`; }
  if (curseSlots.length > 0) {
    html += `</div><div class="info-text" style="margin-top:8px">所持呪字：</div><div class="item-list-display">`;
    for (const id of curseSlots) { const cs = ALL_CURSES.find(c=>c.id===id); if(cs) html += `<span class="item-badge" style="border-color:#aa44ff;color:#cc88ff">${cs.icon} ${cs.name}</span>`; }
  }
  html += `</div><div style="margin-top:32px;display:flex;gap:16px">`;
  if (bossRushMode) {
    html += `<button class="btn" style="border-color:#f90;color:#f90" onclick="showBossSelect()">ボス選択へ戻る</button>`;
    html += `<button class="btn" style="border-color:#f88;color:#f88" onclick="backToTitle()">タイトルへ</button>`;
  } else {
    html += `<button class="btn" onclick="continueGame()">続けてプレイ</button>`;
    html += `<button class="btn" style="border-color:#f88;color:#f88" onclick="backToTitle()">タイトルへ</button>`;
  }
  html += `</div>`; showOverlay(html);
}

function showGameOverScreen() {
  state = 'gameover';
  let html = `<div class="gameover-banner">GAME OVER</div>`;
  if (simulationMode) {
    const sim = SIMULATIONS.find(s => s.id === simulationId);
    html += `<div class="info-text" style="margin-bottom:24px">SIMULATION ${simulationId}「${sim ? sim.name : ''}」— PHASE ${simulationPhase} で力尽きた...</div>`;
    html += `<button class="btn" style="border-color:#00ffcc;color:#00ffcc" onclick="startSimulation(${simulationId})">再挑戦</button>`;
    html += `<button class="btn" onclick="showSimulationSelect()">シミュレーション選択へ</button>`;
  } else if (bossRushMode) {
    html += `<div class="info-text" style="margin-bottom:24px">BOSS ${bossType} — ${BOSS_INFO[bossType-1].name} に敗北...</div>`;
    html += `<button class="btn" style="border-color:#f90;color:#f90" onclick="startBossRush(${bossType})">再挑戦</button>`;
    html += `<button class="btn" onclick="showBossSelect()">ボス選択へ戻る</button>`;
  } else {
    html += `<div class="info-text" style="margin-bottom:24px">WAVE ${wavePhase} で力尽きた...</div>`;
    html += `<button class="btn" onclick="retryGame()">もう一度挑戦</button>`;
  }
  html += `<button class="btn" style="border-color:#f88;color:#f88" onclick="backToTitle()">タイトルへ</button>`;
  showOverlay(html);
}

window.continueGame = function() {
  hideOverlay(); enemies=[]; enemyBullets=[]; playerBullets=[]; playerLasers=[]; playerBombs=[]; enemyLasers=[]; plasmas=[];
  player._poisonAura = null;
  player.alive = true; player.hp = Math.min(player.maxHp, player.hp + 3); loopCount++; bossRushMode = false;
  if (curseSlots.includes('育')) { if (!curseDeathMode) player.maxHp += 10; player.hp = Math.min(player.maxHp, player.hp); }
  // 次周開始時は最低でも基準確率(30%/60%)を維持する
  currentEvent = null; eventEnemyType = null; eventDamageMult = 1; fogIntensity = 0;
  eventWarningTimer = 0; dropletEnemies = []; pendingEventBonus = false;
  if (loopCount > 1) eventProbability = Math.max(eventProbability, getBaseEventProbability());
  startWave(1);
};
window.retryGame = function() { resetPlayer(); hideOverlay(); showInitialItemSelect(); };
window.backToTitle = function() { resetPlayer(); bossRushMode = false; simulationMode = false; simulationId = 0; simulationPhase = 0; showTitleScreen(); state = 'title'; };

// ==================== SIMULATION MODE ====================
let simulationMode = false;
let simulationId = 0;
let simulationPhase = 0;   // 1-5
let simEnemyHpMult = 1;    // シミュレーション用敵HPボーナス倍率

// --- シミュレーション定義 ---
const SIMULATIONS = [
  {
    id: 1,
    name: '霧時々弾幕',
    color: '#aaaaff',
    icon: '🌫️',
    desc: '霧と弾幕が交互に襲いかかる。',
    initialItems: ['dmg2','hp5','hp5','bomb','bomb','shotgun','shotgun','sniper','laser','chakram','chakram','stockheal'],
    initialCurses: ['吸','電'],
    phases: [
      { type: 'event', event: 'fog', label: 'PHASE 1 — イベント（濃霧）',
        rewards: { items: ['3way','shotgun','sniper','tempo','tempo'], curses: ['装'] } },
      { type: 'wave', label: 'PHASE 2 — 通常',
        rewards: { items: ['3way','fragileshot','bomb','laser','dmg2','stockheal','bspd'], curses: [] } },
      { type: 'boss', bossId: 10, label: 'PHASE 4 — BOSS 10 パープルドゥーム',hpMult: 3,
        rewards: { items: ['stick','chakram','bspd','hp3'], curses: ['走'] } },
      { type: 'event', event: 'fog', label: 'PHASE 3 — イベント（濃霧）',hpMult: 2,
        rewards: { items: ['shotgun','laser','sniper','heal','stockheal'], curses: [] } },
      { type: 'event', event: 'swarm', swarmType: 'hex', label: 'PHASE 5 — イベント（大量発生：ヘキサゴン）',hpMult: 3,
        rewards: { items: [], curses: [] } },
    ]
  },
  {
    id: 2,
    name: '宇宙の災害',
    color: '#cc66ff',
    icon: '🌀',
    desc: '巨大ブラックホールと凶悪なボスが次々と迫る。',
    initialItems: ['barrier','dash'],
    initialCurses: ['命','得','友'],
    phases: [
      { type: 'event', event: 'giant_blackhole', label: 'PHASE 1 — イベント（巨大ブラックホール）',
        rewards: { items: ['dmg1','heal','stockheal','sniper','helper'], curses: ['満','速','染'] } },
      { type: 'event', event: 'pillar', label: 'PHASE 2 — イベント（ピラー）',
        rewards: { items: ['karma','stockheal'], curses: ['換'] } },
      { type: 'boss', bossId: 13, label: 'PHASE 3 — BOSS 13 イクリプス',
        rewards: { items: ['hp3','helper'], curses: ['業'] } },
      { type: 'event', event: 'giant_blackhole', label: 'PHASE 4 — イベント（巨大ブラックホール）',
        rewards: { items: ['dmg1','heal','stockheal'], curses: [] } },
      { type: 'boss', bossId: 16, label: 'PHASE 5 — BOSS 16 ラディアンス', hpMult: 2,
        rewards: { items: [], curses: [] } },
    ]
  },
  {
    id: 3,
    name: 'インフレーション',
    color: '#ffcc00',
    icon: '📈',
    desc: '火力を極限まで高め、超高HPの敵を粉砕せよ。',
    initialItems: ['3way','tempo','tempo','bspd','bspd'],
    initialCurses: ['友','満','全','環','得','基','礎'],
    phases: [
      { type: 'event', event: 'doubleDamage', label: 'PHASE 1 — イベント（敵強化）',
        rewards: { items: ['tempo','bspd'], curses: [] } },
      { type: 'wave', label: 'PHASE 2 — 通常', hpMult: 3,
        rewards: { items: ['tempo','bspd'], curses: ['無','無','無','無','無','虚'] } },
      { type: 'boss', bossId: 2, label: 'PHASE 3 — BOSS 2 オレンジソルジャー', hpMult: 4,
        rewards: { items: [], curses: ['捨','満','金','倍','蓄'] } },
      { type: 'event', event: 'droplets', label: 'PHASE 4 — イベント（ハート出現）', hpMult: 6,
        rewards: { items: ['3way','3way','tempo','tempo','bspd','bspd','stockheal','stockheal'], curses: ['全'] } },
      { type: 'boss', bossId: 15, label: 'PHASE 5 — BOSS 15 リバースハーモニー', hpMult: 8,
        rewards: { items: [], curses: [] } },
    ]
  },
  {
    id: 4,
    name: '堪え難き苦痛',
    color: '#ff4466',
    icon: '💀',
    desc: 'カルマで死を超えた先に何がある。極限の苦痛に堪えよ。',
    initialItems: ['karma','karma','karma'],
    initialCurses: ['業','装','倍','富','亀','護','妬','装','吸','蓄','無','無','無','無','激'],
    phases: [
      { type: 'wave', label: 'PHASE 1 — 通常',
        rewards: { items: ['dmg2','dmg2','dmg2','stockheal','heal'], curses: ['無','無','無'] } },
      { type: 'event', event: 'pillar', label: 'PHASE 2 — イベント（ピラー）',
        rewards: { items: ['dmg3','dmg3','heal','stockheal'], curses: ['無','無','無'] } },
      { type: 'event', event: 'doubleDamage', label: 'PHASE 3 — イベント（敵強化）', hpMult: 2,
        rewards: { items: ['heal','stockheal'], curses: ['虚'] } },
      { type: 'boss', bossId: 8, label: 'PHASE 4 — BOSS 8 イエローシグナル', hpMult: 3,
        rewards: { items: ['heal','stockheal','stockheal'], curses: [] } },
      { type: 'event', event: 'doubleDamage', label: 'PHASE 5 — イベント（敵強化）', hpMult: 5,
        rewards: { items: [], curses: [] } },
    ]
  },
];

// --- シミュレーション選択画面 ---
window.showSimulationSelect = function() {
  state = 'title';
  let html = `<div class="item-select-title" style="color:#00ffcc;text-shadow:0 0 15px #00ffcc">SIMULATION MODE</div>`;
  html += `<div class="info-text" style="margin-bottom:20px">固定されたシナリオに挑戦しよう。初期アイテム・呪字が固定で支給される。</div>`;
  html += `<div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;margin-bottom:24px;max-height:500px;overflow-y:auto;padding:0 12px;border:1px solid #ffffff15;border-radius:8px;">`;
  for (const sim of SIMULATIONS) {
    const phaseIcons = sim.phases.map(p =>
      p.type === 'boss' ? `🔴 BOSS ${p.bossId}` :
      p.type === 'event' ? `⚡ イベント` : `👾 通常`
    ).join(' → ');
    html += `
      <div class="item-card" style="border-color:${sim.color}44;width:260px;padding:16px;cursor:pointer;flex-shrink:0;"
           onmouseover="this.style.borderColor='${sim.color}';this.style.boxShadow='0 0 20px ${sim.color}55'"
           onmouseout="this.style.borderColor='${sim.color}44';this.style.boxShadow=''"
           onclick="startSimulation(${sim.id})">
        <div style="font-size:36px;margin-bottom:6px">${sim.icon}</div>
        <div style="font-size:15px;font-weight:bold;color:${sim.color};margin-bottom:6px;letter-spacing:1px">
          SIMULATION ${sim.id}<br>${sim.name}
        </div>
        <div class="item-card-desc" style="font-size:10px;margin-bottom:10px">${sim.desc}</div>
        <div style="font-size:9px;color:#888;line-height:1.8">${phaseIcons}</div>
      </div>`;
  }
  html += `</div>`;
  html += `<button class="btn" style="border-color:#666;color:#666" onclick="showTitleScreen()">← BACK</button>`;
  showOverlay(html);
};

// --- シミュレーション開始 ---
window.startSimulation = function(id) {
  const sim = SIMULATIONS.find(s => s.id === id);
  if (!sim) return;
  simulationMode = true;
  simulationId = id;
  simulationPhase = 0;
  bossRushMode = false;
  resetPlayer();

  // 固定アイテム・呪字を順番に表示して付与
  showSimFixedGrants(sim.initialItems, sim.initialCurses, () => {
    // チェック: 呪字の中に「即座にX回のアイテム選択（呪字）選択」があれば通常選択画面へ
    processSimCurseExtraSelects(() => {
      hideOverlay();
      startSimPhase(1);
    });
  });
};

// 固定アイテム/呪字付与画面（1つずつ）
function showSimFixedGrants(itemIds, curseIds, onComplete) {
  const allGrants = [
    ...itemIds.map(id => ({ kind: 'item', id })),
    ...curseIds.map(id => ({ kind: 'curse', id }))
  ];
  let displayIdx = 0;  // ★ 表示インデックス（付与はボタン押下時）
  const total = allGrants.length;

  function showCurrent() {
    if (displayIdx >= total) { onComplete(); return; }
    const grant = allGrants[displayIdx];
    const current = displayIdx + 1;

    if (grant.kind === 'item') {
      const item = ALL_ITEMS.find(i => i.id === grant.id);
      if (!item) { displayIdx++; showCurrent(); return; }
      const previewCount = player.items.filter(x => x === grant.id).length + 1;
      let badgeStr = '';
      if (item.maxCount === 1) badgeStr = '<span class="badge">1回限り</span>';
      else if (item.maxCount <= 4) badgeStr = `<span class="badge">Lv ${previewCount}/${item.maxCount}</span>`;
      const previewItems = [...player.items, grant.id];
      showOverlay(`
        <div class="item-select-title" style="color:#00ffcc;text-shadow:0 0 12px #00ffcc">📦 初期アイテム支給</div>
        <div class="info-text" style="margin-bottom:16px">${current} / ${total} 個目</div>
        <div class="item-cards" style="justify-content:center">
          <div class="item-card" style="border-color:#00ffcc88;box-shadow:0 0 18px #00ffcc44;pointer-events:none">
            ${badgeStr}
            <div class="item-card-icon">${item.icon}</div>
            <div class="item-card-name">${item.name}</div>
            <div class="item-card-desc">${item.desc}</div>
          </div>
        </div>
        <div class="info-text" style="margin-top:16px">所持アイテム（取得後）：</div>
        <div class="item-list-display">${previewItems.map(id=>{const it=ALL_ITEMS.find(i=>i.id===id);return it?`<span class="item-badge">${it.icon} ${it.name}</span>`:''}).join('')}</div>
        <button class="btn" style="border-color:#00ffcc;color:#00ffcc;margin-top:16px" onclick="window._simGrantNext()">次へ →</button>
      `);
      // ★ ボタン押下時に付与
      window._simGrantNext = () => {
        item.apply();
        player.items.push(grant.id);
        displayIdx++;
        showCurrent();
      };

    } else {
      const cs = ALL_CURSES.find(c => c.id === grant.id);
      if (!cs) { displayIdx++; showCurrent(); return; }
      const previewCurses = [...curseSlots, grant.id];
      showOverlay(`
        <div class="item-select-title" style="color:#cc88ff;text-shadow:0 0 12px #aa44ff">🔮 初期呪字支給</div>
        <div class="info-text" style="margin-bottom:16px">${current} / ${total} 個目</div>
        <div class="item-cards" style="justify-content:center">
          <div class="item-card" style="border-color:#aa44ff88;box-shadow:0 0 18px #aa44ff44;pointer-events:none">
            <div class="item-card-icon" style="color:#cc88ff;font-size:32px">${cs.icon}</div>
            <div class="item-card-name" style="color:#cc88ff">${cs.name}</div>
            <div class="item-card-desc">${cs.desc}</div>
          </div>
        </div>
        <div class="info-text" style="margin-top:16px">所持呪字（取得後）：</div>
        <div class="item-list-display">${previewCurses.map(id=>{const c=ALL_CURSES.find(x=>x.id===id);return c?`<span class="item-badge" style="border-color:#aa44ff;color:#cc88ff">${c.icon} ${c.name}</span>`:''}).join('')}</div>
        <button class="btn" style="border-color:#cc88ff;color:#cc88ff;margin-top:16px" onclick="window._simGrantNext()">次へ →</button>
      `);
      // ★ ボタン押下時に付与
      window._simGrantNext = () => {
        curseSlots.push(grant.id);
        cs.apply();
        displayIdx++;
        showCurrent();
      };
    }
  }
  showCurrent();
}

// 呪字効果による追加選択処理（「直ちにX回のアイテム/呪字選択画面」効果）
function processSimCurseExtraSelects(onComplete) {
  // 放棄: 換呪字など
  let discardTimes = pendingItemDiscard || 0;
  pendingItemDiscard = 0;
  // 暗: 3回アイテム選択
  let extraItems = pendingExtraItemSelect || 0;
  pendingExtraItemSelect = 0;
  // 亀: 追加呪字3回
  let extraCurses = pendingExtraKameCurse || 0;
  pendingExtraKameCurse = 0;
  // 呪: 3回呪字選択
  let extraCursePending = pendingExtraCurse ? 1 : 0;
  pendingExtraCurse = false;

  const totalExtra = discardTimes + extraItems + extraCurses + extraCursePending;
  if (totalExtra === 0) { onComplete(); return; }

  // 通常の選択画面を開く（ランダム選択）
  function doDiscard(n, cb) {
    if (n <= 0) { cb(); return; }
    showItemDiscard(n, cb);
  }
  function doExtraItems(n, cb) {
    if (n <= 0) { cb(); return; }
    showItemSelectSequence('【呪字効果】追加アイテム選択', n, cb);
  }
  function doExtraCurses(n, cb) {
    if (n <= 0) { cb(); return; }
    showCurseSelect(cb, n, true);
  }

  doDiscard(discardTimes, () => {
    doExtraItems(extraItems, () => {
      doExtraCurses(extraCurses + extraCursePending, onComplete);
    });
  });
}

// --- フェーズ開始 ---
function startSimPhase(phase) {
  const sim = SIMULATIONS.find(s => s.id === simulationId);
  if (!sim) return;
  simulationPhase = phase;
  const phaseDef = sim.phases[phase - 1];

  // 共通リセット
  function commonReset() {
    enemies = []; enemyBullets = []; playerBullets = []; playerLasers = []; playerBombs = [];
    playerChakrams = []; playerBubbles = []; enemyLasers = []; plasmas = [];
    playerTornadoes = []; playerMeteors = []; playerFragileShots = [];
    player._poisonAura = null;
    waveTimer = 0; spawnTimer = 0; waveClearing = false;
    boss = null; bossManager = null;
    bhEvent = null; pillarEvent = null; pillarLasers = []; dropletEnemies = [];
    currentEvent = null; eventEnemyType = null; eventDamageMult = 1; fogIntensity = 0; eventWarningTimer = 0;
    simEnemyHpMult = 1;
  }

  hideOverlay();

  if (phaseDef.type === 'wave') {
    commonReset();
    if (phaseDef.hpMult) simEnemyHpMult = phaseDef.hpMult;
    if (phaseDef.damageMult) { currentEvent = 'doubleDamage'; eventDamageMult = phaseDef.damageMult; }
    wavePhase = phase; state = 'wave';
    if (curseSlots.includes('癒') && !curseDeathMode) { player.hp = Math.min(player.maxHp, player.hp + 5); }
    if (fireFuelMax > 0) fireFuel = Math.min(fireFuelMax, fireFuel + 100);
    const waveHpInfo = phaseDef.hpMult ? ` ［敵HP×${phaseDef.hpMult}］` : '';
    const waveDmgInfo = phaseDef.damageMult ? ` ／ 敵ダメージ×${phaseDef.damageMult}` : '';
    showBanner = true; bannerText = `PHASE ${phase} — 雑魚敵`; bannerTimer = 120;
    bannerSubText = (phaseDef.hpMult || phaseDef.damageMult) ? `⚠${waveHpInfo}${waveDmgInfo}` : '';
    bannerSubColor = '#ff6644';

  } else if (phaseDef.type === 'event') {
    commonReset();
    if (phaseDef.hpMult) simEnemyHpMult = phaseDef.hpMult;
    currentEvent = phaseDef.event;
    eventEnemyType = phaseDef.swarmType || null;
    if (phaseDef.damageMult) eventDamageMult = phaseDef.damageMult;
    // イベント別初期化
    if (currentEvent === 'fog') fogIntensity = 0.9;
    if (currentEvent === 'giant_blackhole') {
      const bx = 80 + Math.random()*(W-160), by = 80 + Math.random()*(H/2);
      bhEvent = { x: bx, y: by, phase: 'suck', phaseTimer: 0, totalTimer: 0, particles: [], bhParticles: [] };
    }
    if (currentEvent === 'doubleDamage') { eventDamageMult = 2; }
    if (currentEvent === 'pillar') { pillarEvent = { laserTimer: 0 }; pillarLasers = []; }
    if (currentEvent === 'droplets') {
      const d1 = createDropletEnemy(); enemies.push(d1); dropletEnemies.push(d1);
    }
    wavePhase = phase; state = 'wave';
    if (curseSlots.includes('癒') && !curseDeathMode) { player.hp = Math.min(player.maxHp, player.hp + 5); }
    if (fireFuelMax > 0) fireFuel = Math.min(fireFuelMax, fireFuel + 100);
    const simEventNames = { fog:'濃霧', giant_blackhole:'巨大ブラックホール', pillar:'ピラー', swarm:'大量発生', doubleDamage:'敵強化', droplets:'ハート出現' };
    showBanner = true;
    bannerText = `PHASE ${phase} — ${simEventNames[currentEvent] || 'イベント'}`;
    bannerTimer = 180;
    const evHpInfo = phaseDef.hpMult ? ` ／ 敵HP×${phaseDef.hpMult}` : '';
    const evDmgInfo = (phaseDef.damageMult && currentEvent !== 'doubleDamage') ? ` ／ 敵ダメ×${phaseDef.damageMult}` : '';
    bannerSubText = currentEvent === 'fog' ? `🌫 濃霧発生！${evHpInfo}` :
                    currentEvent === 'giant_blackhole' ? `🌀 巨大ブラックホール出現！${evHpInfo}` :
                    currentEvent === 'pillar' ? `⚡ ピラー発動！${evHpInfo}` :
                    currentEvent === 'swarm' ? `⚠ ${eventEnemyType}大量発生！${evHpInfo}` :
                    currentEvent === 'doubleDamage' ? `💢 敵強化！ダメージ×${eventDamageMult}${evHpInfo}` :
                    currentEvent === 'droplets' ? `💜 ハート形の敵出現！${evHpInfo}` : `${evHpInfo}${evDmgInfo}`;
    bannerSubColor = currentEvent === 'fog' ? '#aaaaff' :
                     currentEvent === 'giant_blackhole' ? '#cc66ff' :
                     currentEvent === 'pillar' ? '#ffcc00' :
                     currentEvent === 'swarm' ? '#ff6600' :
                     currentEvent === 'doubleDamage' ? '#ff4444' : '#fff';

  } else if (phaseDef.type === 'boss') {
    commonReset();
    if (phaseDef.hpMult) simEnemyHpMult = phaseDef.hpMult;
    state = 'boss';
    bossType = phaseDef.bossId;
    switch(bossType) {
      case 1: boss = createBoss1(); break; case 2: boss = createBoss2(); break;
      case 3: boss = createBoss3(); break; case 4: boss = createBoss4(); break;
      case 5: boss = createBoss5(); break; case 6: boss = createBoss6(); break;
      case 7: boss = createBoss7(); break; case 8: bossManager = createBoss8(); break;
      case 9: boss = createBoss9(); break; case 10: boss = createBoss10(); break;
      case 11: boss = createBoss11(); break; case 12: boss = createBoss12(); break;
      case 13: boss = createBoss13(); break; case 14: boss = createBoss14(); break;
      case 15: boss = createBoss15(); break; case 16: boss = createBoss16(); break;
      case 17: boss = createBoss17(); break; case 18: boss = createBoss18(); break;
    }
    // ボスHPに倍率適用
    if (phaseDef.hpMult && phaseDef.hpMult !== 1) {
      if (boss) { boss.hp = Math.round(boss.hp * phaseDef.hpMult); boss.maxHp = boss.hp; }
      if (bossManager && bossManager.boss) { bossManager.boss.hp = Math.round(bossManager.boss.hp * phaseDef.hpMult); bossManager.boss.maxHp = bossManager.boss.hp; }
    }
    const bossHpInfo = phaseDef.hpMult ? ` ／ HP×${phaseDef.hpMult}` : '';
    showBanner = true;
    bannerText = `PHASE ${phase} — BOSS ${bossType} INCOMING`;
    bannerTimer = 150; bannerSubText = bossHpInfo ? `⚠${bossHpInfo}` : ''; bannerSubColor = '#f44';
  }
}

// --- フェーズクリア後処理（waveCompleteとshowClearScreenから分岐） ---
function simPhaseComplete() {
  const sim = SIMULATIONS.find(s => s.id === simulationId);
  if (!sim) return;
  // ★ 報酬表示中はgameLoopのwave/boss処理を止める
  state = 'simReward';
  waveClearing = false;
  const phaseDef = sim.phases[simulationPhase - 1];
  const rewards = phaseDef.rewards;
  const isLastPhase = simulationPhase >= 5;

  // イベント状態リセット
  currentEvent = null; eventEnemyType = null; eventDamageMult = 1; fogIntensity = 0;
  bhEvent = null; pillarEvent = null; pillarLasers = [];

  if (isLastPhase) {
    // シミュレーションクリア
    showSimulationClear(sim);
    return;
  }

  // 報酬付与 → 次フェーズへ
  const allRewards = [
    ...rewards.items.map(id => ({ kind: 'item', id })),
    ...rewards.curses.map(id => ({ kind: 'curse', id }))
  ];

  if (allRewards.length === 0) {
    // 報酬なし → 直接次フェーズへ呪字効果チェック後
    processSimCurseExtraSelects(() => {
      startSimPhase(simulationPhase + 1);
    });
    return;
  }

  // 報酬画面表示
  showSimRewardGrants(allRewards, `PHASE ${simulationPhase} クリア！`, () => {
    processSimCurseExtraSelects(() => {
      startSimPhase(simulationPhase + 1);
    });
  });
}

function showSimRewardGrants(grants, phaseLabel, onComplete) {
  // ★ 付与済みインデックスを別途追跡（二重付与防止）
  let displayIdx = 0;   // 現在表示中のgrantインデックス
  const total = grants.length;

  // コールバック保存用
  window._simRewardCallback = onComplete;

  function showCurrent() {
    if (displayIdx >= total) { onComplete(); return; }
    const grant = grants[displayIdx];
    const current = displayIdx + 1;

    if (grant.kind === 'item') {
      const item = ALL_ITEMS.find(i => i.id === grant.id);
      if (!item) { displayIdx++; showCurrent(); return; }
      // 表示用に現在の所持数を使う（まだ付与前）
      const previewCount = player.items.filter(x => x === grant.id).length + 1;
      let badgeStr = '';
      if (item.maxCount === 1) badgeStr = '<span class="badge">1回限り</span>';
      else if (item.maxCount <= 4) badgeStr = `<span class="badge">Lv ${previewCount}/${item.maxCount}</span>`;
      const previewItems = [...player.items, grant.id];
      showOverlay(`
        <div class="item-select-title" style="color:#00ffcc;text-shadow:0 0 12px #00ffcc">✦ ${phaseLabel} — 突破報酬 ✦</div>
        <div class="info-text" style="margin-bottom:16px">報酬 ${current} / ${total}</div>
        <div class="item-cards" style="justify-content:center">
          <div class="item-card" style="border-color:#00ffcc88;box-shadow:0 0 18px #00ffcc44;pointer-events:none">
            ${badgeStr}
            <div class="item-card-icon">${item.icon}</div>
            <div class="item-card-name">${item.name}</div>
            <div class="item-card-desc">${item.desc}</div>
          </div>
        </div>
        <div class="info-text" style="margin-top:16px">所持アイテム（取得後）：</div>
        <div class="item-list-display">${previewItems.map(id=>{const it=ALL_ITEMS.find(i=>i.id===id);return it?`<span class="item-badge">${it.icon} ${it.name}</span>`:''}).join('')}</div>
        <button class="btn" style="border-color:#00ffcc;color:#00ffcc;margin-top:16px" onclick="window._simRewardNext()">次へ →</button>
      `);
      // ★ ボタンクリック時に付与 → 次へ
      window._simRewardNext = () => {
        item.apply();
        player.items.push(grant.id);
        if (curseSlots.includes('友') && (grant.id === 'sniper' || grant.id === 'helper')) {
          player.damage += 1;
          if (!curseDeathMode) { player.maxHp += 1; player.hp = Math.min(player.maxHp, player.hp + 1); }
        }
        displayIdx++;
        showCurrent();
      };

    } else {
      // curse
      const cs = ALL_CURSES.find(c => c.id === grant.id);
      if (!cs) { displayIdx++; showCurrent(); return; }
      const previewCurses = [...curseSlots, grant.id];
      showOverlay(`
        <div class="item-select-title" style="color:#cc88ff;text-shadow:0 0 12px #aa44ff">✦ ${phaseLabel} — 突破報酬（呪字） ✦</div>
        <div class="info-text" style="margin-bottom:16px">報酬 ${current} / ${total}</div>
        <div class="item-cards" style="justify-content:center">
          <div class="item-card" style="border-color:#aa44ff88;box-shadow:0 0 18px #aa44ff44;pointer-events:none">
            <div class="item-card-icon" style="color:#cc88ff;font-size:32px">${cs.icon}</div>
            <div class="item-card-name" style="color:#cc88ff">${cs.name}</div>
            <div class="item-card-desc">${cs.desc}</div>
          </div>
        </div>
        <div class="info-text" style="margin-top:16px">所持呪字（取得後）：</div>
        <div class="item-list-display">${previewCurses.map(id=>{const c=ALL_CURSES.find(x=>x.id===id);return c?`<span class="item-badge" style="border-color:#aa44ff;color:#cc88ff">${c.icon} ${c.name}</span>`:''}).join('')}</div>
        <button class="btn" style="border-color:#cc88ff;color:#cc88ff;margin-top:16px" onclick="window._simRewardNext()">次へ →</button>
      `);
      // ★ ボタンクリック時に付与 → 次へ
      window._simRewardNext = () => {
        curseSlots.push(grant.id);
        cs.apply();
        // 呪字効果でpendingItemDiscardが発生した場合は放棄phaseを挟む（換など）
        if (pendingItemDiscard > 0) {
          const n = pendingItemDiscard; pendingItemDiscard = 0;
          const origCallback = window._simRewardCallback;
          const afterDiscard = () => {
            if (pendingExtraItemSelect > 0) {
              const ni = pendingExtraItemSelect; pendingExtraItemSelect = 0;
              showItemSelectSequence('【呪字効果】追加アイテム選択', ni, origCallback);
            } else if (origCallback) origCallback();
          };
          showItemDiscard(n, afterDiscard);
          return;
        }
        displayIdx++;
        showCurrent();
      };
    }
  }
  showCurrent();
}

function showSimulationClear(sim) {
  state = 'clear';
  let html = `<div class="clear-banner" style="color:#00ffcc;text-shadow:0 0 20px #00ffcc">★ SIMULATION CLEAR ★</div>`;
  html += `<div class="info-text" style="margin-bottom:8px;color:#00ffcc;font-size:18px">${sim.icon} ${sim.name} — クリア！</div>`;
  html += `<div class="info-text" style="margin-bottom:16px">全5フェーズを突破した！</div>`;
  html += `<div class="info-text">所持アイテム：</div><div class="item-list-display">`;
  for (const id of player.items) { const it = ALL_ITEMS.find(i=>i.id===id); if(it) html += `<span class="item-badge">${it.icon} ${it.name}</span>`; }
  if (curseSlots.length > 0) {
    html += `</div><div class="info-text" style="margin-top:8px">所持呪字：</div><div class="item-list-display">`;
    for (const id of curseSlots) { const cs = ALL_CURSES.find(c=>c.id===id); if(cs) html += `<span class="item-badge" style="border-color:#aa44ff;color:#cc88ff">${cs.icon} ${cs.name}</span>`; }
  }
  html += `</div><div style="margin-top:32px;display:flex;gap:16px">`;
  html += `<button class="btn" style="border-color:#00ffcc;color:#00ffcc" onclick="showSimulationSelect()">シミュレーション選択へ</button>`;
  html += `<button class="btn" style="border-color:#f88;color:#f88" onclick="backToTitle()">タイトルへ</button>`;
  html += `</div>`;
  showOverlay(html);
}

// ==================== TITLE SCREEN ====================
function showTitleScreen() {
  state = 'title';
  showOverlay(`
    <div class="title-text">STELLAR ROGUE</div>
    <div class="subtitle-text">— ROGUELITE SHOOTER —</div>
    <button class="btn" onclick="showInitialItemSelect()">START GAME</button>
    <button class="btn" style="border-color:#f90;color:#f90;margin-top:4px" onclick="showBossSelect()">BOSS RUSH</button>
    <button class="btn" style="border-color:#00ffcc;color:#00ffcc;margin-top:4px" onclick="showSimulationSelect()">SIMULATION MODE</button>
    <div class="info-text" style="margin-top:20px">WASD / 矢印キー で移動 ｜ スペースキー で射撃</div>
  `);
}

// ==================== BOSS RUSH MODE ====================
let bossRushMode = false;
const BOSS_INFO = [
  { id:1, name:'マゼンター',  color:'#ff00ff', desc:'HPに応じてテレポート、全方向弾幕' },
  { id:2, name:'オレンジソルジャー',   color:'#ff9900', desc:'ヘルパーの師匠' },
  { id:3, name:'グリーンハイウェイ',  color:'#00ff00', desc:'追尾接近、高速コーナー移動' },
  { id:4, name:'ブルーウォール',  color:'#4444ff', desc:'壁から弾が飛んでくる' },
  { id:5, name:'ピンクストーム',  color:'#ff99ff', desc:'ヒットするたびテレポート、高密度弾' },
  { id:6, name:'ホーワイト',    color:'#ffffff', desc:'反射弾、時間差爆発、渦巻きの3段階' },
  { id:7, name:'レッドパニック',   color:'#ff5555', desc:'レーザーを放ち続ける者' },
  { id:8, name:'イエローシグナル',  color:'#ffff00', desc:'信号を送り続ける者' },
  { id:9, name:'スティッカー',color:'#fffdd0', desc:'画面外まで伸びる十字スティックで大回転' },
  { id:10,name:'パープルドゥーム', color:'#cc3399', desc:'電撃の申し子' },
  { id:11,name:'スカイブラスト',color:'#00bfff', desc:'チャクラムの達人' },
  { id:12,name:'グレアン',color:'#888888', desc:'凶悪な攻撃を多用する強者' },
  { id:13,name:'イクリプス',color:'#ffffff', desc:'光を喰らう暗黒' },
  { id:14,name:'ドリームストーム',color:'#cc88ff', desc:'夢と嵐の融合' },
  { id:15,name:'リバースハーモニー',color:'#ff3333', desc:'紅白の対立' },
  { id:16,name:'ラディアンス',color:'#ffbb66', desc:'絶対的なる光' },
  { id:17,name:'ミラージュ・コア',color:'#c0d8ff', desc:'鏡片と虚像が本体を守る謎めいた存在' },
  { id:18,name:'アーカイヴ・セラフ',color:'#ffd700', desc:'過去の記録を再生する究極の集大成ボス' },
];

window.showBossSelect = function() {
  state = 'title';
  let html = `<div class="item-select-title" style="color:#f90;text-shadow:0 0 15px #f90">BOSS RUSH</div>`;
  html += `<div class="info-text" style="margin-bottom:20px">戦いたいボスを選択（アイテム15個獲得後に開戦）</div>`;
  html += `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:24px">`;
  for (const b of BOSS_INFO) {
    html += `
      <div class="item-card" style="border-color:${b.color}44;width:150px;padding:12px 8px"
           onmouseover="this.style.borderColor='${b.color}';this.style.boxShadow='0 0 16px ${b.color}55'"
           onmouseout="this.style.borderColor='${b.color}44';this.style.boxShadow=''"
           onclick="startBossRush(${b.id})">
        <div style="font-size:20px;margin-bottom:4px;color:${b.color};text-shadow:0 0 10px ${b.color}">${b.color2 ? '<span style="background:linear-gradient(90deg,#fff 50%,#000 50%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">●</span>' : '●'}</div>
        <div style="font-size:10px;font-weight:bold;color:${b.color};margin-bottom:4px;letter-spacing:1px">BOSS ${b.id}<br>${b.name}</div>
        <div class="item-card-desc" style="font-size:9px">${b.desc}</div>
      </div>`;
  }
  html += `</div><button class="btn" style="border-color:#666;color:#666" onclick="showTitleScreen()">← BACK</button>`;
  showOverlay(html);
};

window.startBossRush = function(id) {
  bossRushMode = true; bossType = id; resetPlayer();
  showItemSelectSequence('BOSS RUSH — アイテム選択', 15, () => { hideOverlay(); launchBossRushBattle(); });
};

function launchBossRushBattle() {
  state = 'boss'; enemies=[]; enemyBullets=[]; playerBullets=[]; playerLasers=[]; playerBombs=[]; playerBoomerangs=[]; playerBubbles=[]; enemyLasers=[]; plasmas=[];
  player._poisonAura = null;
  boss = null; bossManager = null;
  switch(bossType) {
    case 1: boss = createBoss1(); break; case 2: boss = createBoss2(); break;
    case 3: boss = createBoss3(); break; case 4: boss = createBoss4(); break;
    case 5: boss = createBoss5(); break; case 6: boss = createBoss6(); break;
    case 7: boss = createBoss7(); break; case 8: bossManager = createBoss8(); break;
    case 9: boss = createBoss9(); break; case 10: boss = createBoss10(); break;
    case 11: boss = createBoss11(); break; case 12: boss = createBoss12(); break;
    case 13: boss = createBoss13(); break; case 14: boss = createBoss14(); break;
    case 15: boss = createBoss15(); break; case 16: boss = createBoss16(); break;
    case 17: boss = createBoss17(); break; case 18: boss = createBoss18(); break;
  }
  showBanner = true; bannerText = `BOSS ${bossType} — ${BOSS_INFO[bossType-1].name}`; bannerTimer = 150;
}

// ==================== HUD ====================
function drawHUD() {
  const maxW = 100, hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = '#222'; ctx.fillRect(14, 14, maxW + 4, 14);
  ctx.fillStyle = hpRatio > 0.5 ? '#0f8' : hpRatio > 0.25 ? '#ff0' : '#f44';
  ctx.fillRect(16, 16, maxW * hpRatio, 10);
  ctx.strokeStyle = '#0ff'; ctx.lineWidth = 1; ctx.strokeRect(14, 14, maxW + 4, 14);
  ctx.fillStyle = '#0ff'; ctx.font = '12px Courier New'; ctx.fillText(`HP ${player.hp}/${player.maxHp}`, 16, 42);

  const wLabel = simulationMode
    ? `SIM ${simulationId} — PHASE ${simulationPhase}/5`
    : (state === 'boss' ? `BOSS ${bossType}` : `WAVE ${wavePhase}`);
  ctx.fillStyle = simulationMode ? '#00ffcc' : '#0af'; ctx.font = '11px Courier New'; ctx.fillText(wLabel, W/2 - 36, 20);
  if (loopCount > 1) {
    ctx.fillStyle = '#f90'; ctx.shadowColor = '#f90'; ctx.shadowBlur = 8;
    ctx.font = 'bold 11px Courier New'; ctx.fillText(`${loopCount}周目 ×${loopCount}HP`, W/2 - 38, 34); ctx.shadowBlur = 0;
  }
  if (state === 'wave') {
    const rem = Math.max(0, 30 - Math.floor(waveTimer/60));
    ctx.fillStyle = '#888'; ctx.font = '11px Courier New'; ctx.fillText(`TIME ${rem}s`, W/2 - 28, 46);
  }
  if (player.items.length > 0) {
    const icons = player.items.map(id => ALL_ITEMS.find(i=>i.id===id)?.icon || '').join('');
    ctx.fillStyle = '#666'; ctx.font = '12px serif'; ctx.fillText(icons, W - 260, 20);
  }
  if (player.invincible) {
    ctx.save(); ctx.font = 'bold 12px Courier New'; ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 12; ctx.fillText('★ INVINCIBLE [P]', 16, 60); ctx.restore();
  }
  if (showDebugEventProbability) {
    const baseChance = getBaseEventProbability();
    const actualPercent = Math.round(eventProbability * 100);
    const basePercent = Math.round(baseChance * 100);
    ctx.save();
    ctx.font = 'bold 11px Courier New';
    ctx.fillStyle = '#66ccff';
    ctx.shadowColor = '#66ccff';
    ctx.shadowBlur = 8;
    ctx.fillText(`DEBUG EVT ACTUAL ${actualPercent}% (base ${basePercent}%) [I]`, W - 320, 58);
    ctx.restore();
  }
  if (forceNextEvent) {
    ctx.save(); ctx.font = 'bold 11px Courier New'; ctx.fillStyle = '#ff6600'; ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 10;
    ctx.fillText('⚡ 次フェーズ: イベント確定', W/2 - 80, 58); ctx.restore();
  }
  if (player.hasBarrier) {
    if (player.barrierActive) {
      ctx.save(); ctx.font = 'bold 12px Courier New'; ctx.fillStyle = '#7f7'; ctx.shadowColor = '#7f7'; ctx.shadowBlur = 12; ctx.fillText(`[Z] BARRIER: ${player.barrierHp}/20`, 16, 92); ctx.restore();
    } else if (player.barrierRechargeCooldown > 0) {
      const seconds = Math.ceil(player.barrierRechargeCooldown / 60);
      ctx.save(); ctx.font = 'bold 12px Courier New'; ctx.fillStyle = '#888'; ctx.shadowColor = '#888'; ctx.shadowBlur = 8; ctx.fillText(`[Z] BARRIER RECHARGE ${seconds}s`, 16, 92); ctx.restore();
    } else {
      ctx.save(); ctx.font = 'bold 12px Courier New'; ctx.fillStyle = '#7f7'; ctx.shadowColor = '#7f7'; ctx.shadowBlur = 12; ctx.fillText('[Z] BARRIER READY', 16, 92); ctx.restore();
    }
  }
  // 弾ダメージ表示（HPバーの下）
  ctx.save();
  ctx.fillStyle = '#ffcc44'; ctx.font = 'bold 14px Courier New';
  ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 6;
  ctx.fillText(`DMG ${player.damage}`, 16, 58);
  // ファイア燃料ゲージ（左下）
  if (fireFuelMax > 0) {
    const fgx = 16, fgy = H - 38, fgw = 100, fgh = 10;
    const ratio = fireFuel / fireFuelMax;
    ctx.fillStyle = '#332200'; ctx.fillRect(fgx, fgy, fgw+4, fgh+2);
    ctx.fillStyle = fireKeyHeld && fireFuel > 0 ? '#ffee88' : '#ddcc66';
    ctx.fillRect(fgx+1, fgy+1, (fgw)*ratio, fgh);
    ctx.strokeStyle = '#ffdd88'; ctx.lineWidth = 1; ctx.strokeRect(fgx, fgy, fgw+4, fgh+2);
    ctx.fillStyle = '#ffee88'; ctx.font = '9px Courier New';
    ctx.fillText(`🔥 ${fireFuel}/${fireFuelMax}`, fgx+1, fgy-2);
  }

  // ストックヒール表示
  ctx.save();
  ctx.font = 'bold 12px Courier New';
  ctx.fillStyle = '#44ffaa'; ctx.shadowColor = '#00cc88'; ctx.shadowBlur = 6;
  ctx.fillText(`[C] 🧪 ${stockHealCount}/${stockHealMax}`, 16, 76);
  ctx.restore();
  // ダッシュクールダウン表示
  if (player.hasDash) {
    const cd1 = player.dashCooldown;
    const cd2 = curseSlots.includes('走') ? player.dashCharge2Cooldown : -1;
    const label1 = cd1 <= 0 ? 'DASH READY' : `DASH ${Math.ceil(cd1/60)}s`;
    ctx.save(); ctx.font = 'bold 12px Courier New';
    ctx.fillStyle = cd1 <= 0 ? '#44ccff' : '#666';
    ctx.shadowColor = cd1 <= 0 ? '#44ccff' : 'transparent'; ctx.shadowBlur = cd1 <= 0 ? 8 : 0;
    ctx.fillText(`[B] ${label1}`, 16, 124);
    if (cd2 >= 0) {
      const label2 = cd2 <= 0 ? 'DASH2 READY' : `DASH2 ${Math.ceil(cd2/60)}s`;
      ctx.fillStyle = cd2 <= 0 ? '#44ccff' : '#666';
      ctx.shadowColor = cd2 <= 0 ? '#44ccff' : 'transparent'; ctx.shadowBlur = cd2 <= 0 ? 8 : 0;
      ctx.fillText(label2, 16, 140);
    }
    ctx.restore();
  }
  if (player.hasFragileShot) {
    const cd = player.fragileshotCooldown;
    const lv = player.items.filter(id=>id==='fragileshot').length;
    const label = cd <= 0 ? `FRAGILE` : `FRAGILE ${Math.ceil(cd/60)}s`;
    ctx.save(); ctx.font = 'bold 12px Courier New';
    ctx.fillStyle = cd <= 0 ? '#88ccff' : '#666';
    ctx.shadowColor = cd <= 0 ? '#88ccff' : 'transparent'; ctx.shadowBlur = cd <= 0 ? 8 : 0;
    ctx.fillText(`[N] ${label}`, 16, 156);
    ctx.restore();
  }
  ctx.restore();

  // カルマゲージ表示
  if (player.items.includes('karma')) {
    const lv = player.items.filter(id=>id==='karma').length;
    const gaugeW = 80, gaugeH = 8;
    const gx = 122; // HPバー右隣
    // 橙ゲージ
    const oRatio = Math.min(1, karmaOrange / karmaOrangeThresh);
    ctx.fillStyle = '#332200'; ctx.fillRect(gx, 14, gaugeW + 4, gaugeH + 2);
    ctx.fillStyle = '#ff8800'; ctx.fillRect(gx + 1, 15, (gaugeW) * oRatio, gaugeH);
    ctx.strokeStyle = '#ffaa44'; ctx.lineWidth = 1; ctx.strokeRect(gx, 14, gaugeW + 4, gaugeH + 2);
    ctx.fillStyle = '#ffaa44'; ctx.font = '11px Courier New';
    ctx.fillText(`橙 ${karmaOrange}/${karmaOrangeThresh}`, gx + 1, 34);
    // 赤ゲージ
    const rRatio = Math.min(1, karmaRed / karmaRedThresh);
    const ry = 14 + gaugeH + 16;
    ctx.fillStyle = '#330000'; ctx.fillRect(gx, ry, gaugeW + 4, gaugeH + 2);
    ctx.fillStyle = '#cc2222'; ctx.fillRect(gx + 1, ry + 1, (gaugeW) * rRatio, gaugeH);
    ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 1; ctx.strokeRect(gx, ry, gaugeW + 4, gaugeH + 2);
    ctx.fillStyle = '#ff6666'; ctx.font = '11px Courier New';
    ctx.fillText(`赤 ${karmaRed}/${karmaRedThresh}`, gx + 1, ry + gaugeH + 12);
  }

  // 取得呪字を右下に表示
  if (curseSlots.length > 0) {
    const slotW = 28, slotH = 28, cols = 5;
    const rows = Math.ceil(curseSlots.length / cols);
    const startX = W - 16 - slotW * Math.min(cols, curseSlots.length);
    const startY = H - 16 - slotH * rows;
    ctx.save();
    for (let i = 0; i < curseSlots.length; i++) {
      const cs = ALL_CURSES.find(cc=>cc.id===curseSlots[i]);
      const col = i % cols, row = Math.floor(i / cols);
      const bx = startX + col * slotW, by = startY + row * slotH;
      ctx.fillStyle = 'rgba(40,0,60,0.75)';
      ctx.fillRect(bx, by, slotW - 2, slotH - 2);
      ctx.strokeStyle = '#6622aa'; ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, slotW - 2, slotH - 2);
      ctx.fillStyle = '#cc88ff'; ctx.font = 'bold 13px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#aa44ff'; ctx.shadowBlur = 8;
      ctx.fillText(cs ? cs.icon : curseSlots[i], bx + (slotW-2)/2, by + (slotH-2)/2);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  if (player.hasSuperFlash) {
    if (player.superFlashRechargeCooldown > 0) {
      const seconds = Math.ceil(player.superFlashRechargeCooldown / 60);
      ctx.save(); ctx.font = 'bold 12px Courier New'; ctx.fillStyle = '#888'; ctx.shadowColor = '#888'; ctx.shadowBlur = 8; ctx.fillText(`[A] SUPERFLASH RECHARGE ${seconds}s`, 16, 108); ctx.restore();
    } else {
      ctx.save(); ctx.font = 'bold 12px Courier New'; ctx.fillStyle = '#ffff00'; ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 12; ctx.fillText('[A] SUPERFLASH READY', 16, 108); ctx.restore();
    }
  }
}

// ==================== STARFIELD BG ====================
const stars = Array.from({length:80}, ()=>({x:Math.random()*W, y:Math.random()*H, s:Math.random()*1.5+0.3, speed:0.3+Math.random()*0.7}));
function drawStars() {
  for (const s of stars) {
    s.y += s.speed; if (s.y > H) { s.y = 0; s.x = Math.random()*W; }
    ctx.fillStyle = `rgba(255,255,255,${0.3+s.s*0.3})`; ctx.fillRect(s.x, s.y, s.s, s.s*2);
  }
}

// ==================== MAIN LOOP ====================
function gameLoop() {
  requestAnimationFrame(gameLoop);
  ctx.fillStyle = '#000510'; ctx.fillRect(0, 0, W, H);
  drawStars(); frameCount++;

  // ★ シミュレーション報酬表示中はgame処理を完全停止（オーバーレイのみ表示）
  if (state === 'simReward') { return; }

  if (state === 'wave') {
    waveTimer++;

    if (waveTimer % 60 === 0) {
      // 巨大ブラックホール発生イベント中は雑魚敵出現なし
      if (currentEvent !== 'giant_blackhole') {
        // シミュレーションモードではphaseに関わらず中程度のspawn
        const spawnPhase = simulationMode ? 3 : wavePhase;
        let count = 0;
        if (spawnPhase === 1) count = loopCount >= 2 ? 2 : 1;
        else if (spawnPhase === 2) count = loopCount >= 2 ? randInt(2,3) : randInt(1,2);
        else if (spawnPhase === 3) count = loopCount >= 2 ? randInt(3,4) : randInt(2,3);
        for(let i=0; i<count; i++) spawnEnemy();
      }
    }

    if (waveTimer === 15 * 60) {
      // 大量発生・巨大ブラックホール発生イベント中はelite出現をスキップ
      if (currentEvent !== 'swarm' && currentEvent !== 'giant_blackhole') {
        let eliteCount = 1;
        if (wavePhase === 2 && loopCount >= 2) eliteCount = 2;
        if (wavePhase === 3) eliteCount = loopCount >= 2 ? 3 : 2;
        const elites = ['pentagon', 'octagon', 'hex', 'star'];
        for(let i=0; i<eliteCount; i++) {
          const e = spawnSpecificEnemy(elites[randInt(0,3)]);
          if (e) e.isElite = true;
        }
      }
    }

    updatePlayer(); updateEnemies(); updatePlayerBullets(); updateEnemyBullets();
    
    if (currentEvent === 'droplets' && waveTimer === 15*60 && dropletEnemies.length < 2) {
      const d2 = createDropletEnemy();
      enemies.push(d2);
      dropletEnemies.push(d2);
    }
    
    drawEnemies(); drawPlayerBullets(); drawEnemyBullets(); drawPlayerTornadoes(); drawPlayerMeteors(); drawPlayerFragileShots(); drawHelperUnits(); drawKarmaParticles(); drawStatusParticles(); drawFireParticles(); drawPlayer(); drawDashTrail(); drawScreenFlash(); drawEventVisuals(); drawEventWarning(); drawDamagePopups(); drawHUD();

    if (waveTimer >= 30*60 && !waveClearing) {
      waveClearing = true; enemies = []; enemyBullets = []; enemyLasers = []; plasmas = [];
      setTimeout(() => { waveClearing = false; waveComplete(); }, 400);
    }

    if (showBanner) {
      ctx.save();
      ctx.font = 'bold 36px Courier New'; ctx.fillStyle = '#0f0'; ctx.shadowColor = '#0f0'; ctx.shadowBlur = 20;
      ctx.textAlign = 'center'; ctx.fillText(bannerText, W/2, bannerSubText ? H/2 - 30 : H/2);
      if (bannerSubText) {
        ctx.font = 'bold 22px Courier New'; ctx.fillStyle = bannerSubColor; ctx.shadowColor = bannerSubColor; ctx.shadowBlur = 16;
        ctx.fillText(bannerSubText, W/2, H/2 + 20);
      }
      ctx.textAlign = 'left'; ctx.restore();
      bannerTimer--; if (bannerTimer <= 0) { showBanner = false; bannerSubText = ''; }
    }
    if (!player.alive) showGameOverScreen();
  }
  else if (state === 'boss') {
    updatePlayer(); updatePlayerBullets(); updateEnemyBullets();

    if (boss) {
      boss.update();
      for (const b of playerBullets) {
        if (!b.alive || b.isPoisonAura) continue; // isPoisonAura はダメージなし
        // boss15ミニオンへのヒット判定
        if (boss.minions) {
          for (const m of boss.minions) {
            if (!m.alive || !b.alive) continue;
            if (Math.hypot(b.x-m.x, b.y-m.y) < 18) {
              applyDamageWithFragile(m, b.dmg, b.x, b.y);
              if (!b.infinitePierce && (!b.pierce || b.pierced)) b.alive = false;
              else if (!b.infinitePierce) b.pierced = true;
            }
          }
        }
        // boss17デコイへのヒット判定
        if (boss.decoys) {
          for (const d of boss.decoys) {
            if (!d.alive || !b.alive) continue;
            if (Math.hypot(b.x-d.x, b.y-d.y) < 22) {
              d.hit(b.dmg);
              spawnDamagePopup(d.x + (Math.random()-0.5)*20, d.y - 10, b.dmg, false);
              if (!b.infinitePierce && (!b.pierce || b.pierced)) b.alive = false;
              else if (!b.infinitePierce) b.pierced = true;
            }
          }
        }
        // boss17鏡片へのヒット判定（鏡片が生きていれば本体より先に処理）
        if (boss.hitMirror && b.alive) {
          if (boss.hitMirror(b.x, b.y, b.dmg)) {
            if (!b.infinitePierce && (!b.pierce || b.pierced)) b.alive = false;
            else if (!b.infinitePierce) b.pierced = true;
            continue;
          }
        }
        // boss18ノードへのヒット判定
        if (boss.hitNode && b.alive) {
          if (boss.hitNode(b.x, b.y, b.dmg)) {
            if (!b.infinitePierce && (!b.pierce || b.pierced)) b.alive = false;
            else if (!b.infinitePierce) b.pierced = true;
            continue;
          }
        }
        if (!b.alive) continue;
        if (Math.hypot(boss.x-b.x, boss.y-b.y) < 32) {
          applyDamageWithFragile(boss, b.dmg, b.x, b.y);
          if (b.infinitePierce) { /* スナイパーは貫通 */ }
          else if (!b.pierce || b.pierced) b.alive = false;
          else b.pierced = true;
        }
      }
      if (!boss.alive) { showClearScreen(); }
      processMarkedEntityResonance();
      boss.draw();
      drawMarkedBossEntities();
      if (resonanceEffectTimer > 0) drawResonance();
    } else if (bossManager) {
      bossManager.update();
      for (const b of playerBullets) {
        if (!b.alive || b.isPoisonAura) continue; // isPoisonAura はダメージなし
        bossManager.hit(b.dmg, b.x, b.y);
        const hitBoss = bossManager.boss ? Math.hypot(bossManager.boss.x-b.x, bossManager.boss.y-b.y) < 32 : false;
        let hitE = false;
        if(bossType===2){for(const e of bossManager.enemies)if(e.alive&&Math.hypot(e.x-b.x,e.y-b.y)<22){hitE=true;break;}}
        
        if (hitBoss || hitE) {
          if (b.infinitePierce) { }
          else if (!b.pierce || b.pierced) b.alive = false;
          else b.pierced = true;
        }
      }
      if (!bossManager.alive) { showClearScreen(); }
      processMarkedEntityResonance();
      bossManager.draw();
      drawMarkedBossEntities();
      if (resonanceEffectTimer > 0) drawResonance();
    }

    drawPlayerBullets(); drawEnemyBullets(); drawPlayerTornadoes(); drawPlayerMeteors(); drawPlayerFragileShots(); drawHelperUnits(); drawKarmaParticles(); drawStatusParticles(); drawFireParticles(); drawPlayer(); drawDashTrail(); drawScreenFlash(); drawDamagePopups(); drawHUD();

    if (showBanner) {
      ctx.save(); ctx.font = 'bold 32px Courier New'; ctx.fillStyle = '#f44'; ctx.shadowColor = '#f00'; ctx.shadowBlur = 30;
      ctx.textAlign = 'center'; ctx.fillText(bannerText, W/2, H/2); ctx.textAlign = 'left'; ctx.restore();
      bannerTimer--; if (bannerTimer <= 0) showBanner = false;
    }
    if (!player.alive) showGameOverScreen();
  }
}
showTitleScreen();
gameLoop();
