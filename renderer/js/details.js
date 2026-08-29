const detailsModule = (() => {
  let currentTrainer = null;
  let isTranslateMode = true;
  const translationCache = {};

  const VOCAB_MAP = {
    // Verbs & Actions
    'edit': '修改',
    'set': '设置',
    'add': '增加',
    'get': '获取',
    'get all': '获取全部',
    'unlock': '解锁',
    'unlock all': '解锁全部',
    'infinite': '无限',
    'unlimited': '无限',
    'max': '最大',
    'maximum': '最大',
    'min': '最小',
    'minimum': '最小',
    'zero': '清零',
    'no': '无',
    'easy': '简单 / 快速',
    'fast': '快速',
    'quick': '快速',
    'instant': '瞬间',
    'super': '超级',
    'freeze': '锁定',
    'lock': '锁定',
    'ignore': '无视',
    'prevent': '防止',
    'disable': '禁用',
    'enable': '启用',
    'fill': '填满',
    'drain': '清空',
    'clear': '清除',
    'reset': '重置',
    'custom': '自定义',
    '100%': '100%',
    'multiplier': '倍率',
    'rate': '比率',
    'chance': '几率',

    // Character & Stats
    'health': '生命值 (HP)',
    'hp': '生命值 (HP)',
    'stamina': '体力 / 耐力 (SP)',
    'sp': '体力 / 技能点',
    'mana': '法力值 (MP)',
    'mp': '法力值 (MP)',
    'fp': '专注值 (FP)',
    'focus': '专注力',
    'energy': '能量',
    'oxygen': '氧气',
    'shield': '护盾',
    'armor': '护甲 / 防具',
    'defense': '防御力',
    'attack': '攻击力',
    'damage': '伤害',
    'power': '力量',
    'crit': '暴击',
    'critical': '暴击',
    'critical rate': '暴击率',
    'critical chance': '暴击几率',
    'critical damage': '暴击伤害',
    'drop rate': '物品掉落率',
    'exp': '经验值 (EXP)',
    'exp/experience': '经验值 (EXP)',
    'experience': '经验值',
    'level': '等级',
    'player level': '玩家等级',
    'rank': '段位 / 军阶',
    'hunter rank': '猎人等级 (HR)',
    'hunter rank points': '猎人等级点数',
    'master rank': '大师等级 (MR)',
    'points': '点数',
    'skill points': '技能点',
    'attribute points': '属性点',
    'stat points': '属性点',
    'talent points': '天赋点',
    'perk points': '专长点',

    // Economy & Items
    'money': '金钱',
    'gold': '金币',
    'zenny': '金钱 (Zenny)',
    'pts': '调查点数 (PTS)',
    'coins': '硬币',
    'cash': '现金',
    'credits': '信用点',
    'souls': '灵魂 (Souls)',
    'runes': '卢恩 (Runes)',
    'materials': '锻造材料',
    'crafting materials': '锻造材料',
    'items': '物品',
    'usable items': '可用物品',
    'consumables': '消耗品',
    'inventory': '物品栏',
    'inventory capacity': '背包容量',
    'carry weight': '负重上限',
    'weight': '重量 / 负重',
    'equipment weight': '装备重量',
    'capacity': '容量',
    'durability': '武器耐久度',
    'weapon durability': '武器耐久度',
    'sharpness': '斩味 (武器锋利度)',
    'max sharpness': '最大斩味',
    'ammo': '弹药',
    'arrows': '弓箭',
    'bullets': '子弹',
    'fuel': '燃料',
    'battery': '电池电量',

    // Combat Mechanics
    'recoil': '后坐力',
    'spread': '弹道扩散',
    'accuracy': '精准度',
    'reload': '装弹',
    'cooldown': '冷却时间 (CD)',
    'skill cooldown': '技能冷却时间',
    'cast time': '施法时间',
    'bow charge': '弓箭蓄力',
    'charge': '蓄力',
    'stun': '眩晕',
    'fall damage': '坠落伤害',
    'status effects': '负面异常状态',
    'negative status': '异常状态',
    'invulnerable': '伤害免疫',
    'gauge': '能量槽 / 仪表',
    'spirit gauge': '气刃槽 (Spirit Gauge)',
    'kinsect stamina': '猎虫耐力 (Kinsect Stamina)',

    // Movement & Environment
    'speed': '速度',
    'movement speed': '移动速度',
    'player speed': '玩家速度',
    'game speed': '游戏速度',
    'jump height': '跳跃高度',
    'jumps': '跳跃次数',
    'time': '时间',
    'daytime': '白天时间',
    'countdown': '倒计时',
    'countdown timer': '倒计时器',

    // Teleport & Special Modes
    'god mode': '无敌模式',
    'ignore hits': '免疫伤害判定',
    'god mode/ignore hits': '无敌模式 / 免疫伤害',
    'one-hit kills': '一击必杀',
    'one hit kill': '一击必杀',
    'one hit destroy': '一击破坏',
    'one hit break': '一击破防',
    'super damage': '超级伤害',
    'super damage/one-hit kills': '超级伤害 / 一击必杀',
    'super damage/one hit kill': '超级伤害 / 一击必杀',
    'stealth mode': '隐身模式',
    'ghost mode': '幽灵穿墙模式',
    'fly mode': '飞行模式',
    'slow motion': '子弹时间 / 慢动作',
    'rapid fire': '快速射击 / 连射',
    'save location': '保存当前位置',
    'teleport': '瞬间传送',
    'undo teleport': '撤销传送',
    'teleport to waypoint': '传送到标记点',
    'teleport to custom location': '传送到自定义位置',
    'no crafting requirements': '无需锻造材料',
    'easy crafting': '简单锻造 / 制造',
    'free crafting': '免费锻造',
    'ignore crafting materials': '无视锻造材料需求',
    'ignore equipment requirements': '无视装备要求'
  };

  const CHEAT_GRAMMAR_RULES = [
    // Multi-word exact matches (Longest first)
    [/god mode\s*\/\s*take no damage/i, '无敌模式 / 不受伤害'],
    [/god mode\s*\/\s*invulnerable/i, '无敌模式 / 免死'],
    [/god mode\s*\/\s*ignore hits/i, '无敌模式 / 免疫伤害判定'],
    [/god mode/i, '无敌模式'],
    [/infinite health/i, '无限生命'],
    [/infinite stamina/i, '无限体力 / 耐力'],
    [/infinite mana/i, '无限法力 / 魔法'],
    [/infinite fp/i, '无限专注值 (FP)'],
    [/infinite mp/i, '无限魔法值 (MP)'],
    [/infinite sp/i, '无限耐力 / 技能点'],
    [/infinite shield/i, '无限护盾'],
    [/infinite armor/i, '无限护甲'],
    [/infinite oxygen/i, '无限氧气'],
    [/infinite ammo\s*\/\s*special ammo/i, '无限弹药 / 特殊弹药'],
    [/infinite ammo/i, '无限弹药'],
    [/no reload/i, '无需装弹'],
    [/super accuracy/i, '超级精准度'],
    [/no recoil/i, '无后坐力'],
    [/rapid fire/i, '快速射击 / 连射'],
    [/instant bow charge/i, '弓箭瞬间蓄力'],
    [/one hit kill/i, '一击必杀'],
    [/one hit stun/i, '一击倒地 / 击晕'],
    [/one hit break armor/i, '一击破甲'],
    [/one hit break/i, '一击破防 / 破甲'],
    [/one hit destroy shield/i, '一击破盾'],
    [/one hit destroy/i, '一击破坏'],
    [/super damage\s*\/\s*one hit kill/i, '超级伤害 / 一击必杀'],
    [/super damage/i, '超级伤害'],
    [/damage multiplier/i, '伤害倍率'],
    [/defense multiplier/i, '防御倍率'],
    [/exp multiplier/i, '经验倍率'],
    [/money multiplier/i, '金钱倍率'],
    [/score multiplier/i, '分数倍率'],
    [/game speed/i, '游戏速度'],
    [/player speed/i, '玩家速度'],
    [/movement speed/i, '移动速度'],
    [/jump height/i, '跳跃高度'],
    [/infinite jumps/i, '无限跳跃'],
    [/stealth\s*\/\s*invisibility/i, '隐身模式 / 不被发现'],
    [/stealth mode/i, '隐身模式'],
    [/ghost mode/i, '幽灵穿墙模式'],
    [/freeze daytime/i, '锁定白天时间'],
    [/freeze timer\s*\/\s*countdown/i, '锁定倒计时'],
    [/freeze timer/i, '锁定计时器'],
    [/freeze mission timer/i, '锁定任务时间'],
    [/ignore crafting requirements/i, '无视锻造/制造材料需求'],
    [/ignore upgrade requirements/i, '无视装备升级需求'],
    [/ignore building requirements/i, '无视建筑材料需求'],
    [/ignore research requirements/i, '无视科技研究需求'],
    [/ignore equipment requirements/i, '无视装备佩戴要求'],
    [/free crafting/i, '免费制作 / 锻造'],
    [/free shopping/i, '免费购买'],
    [/max drop rate/i, '最高物品掉落率'],
    [/100% drop rate/i, '100% 物品掉落率'],
    [/100% critical chance/i, '100% 暴击率'],
    [/100% steal chance/i, '100% 偷窃成功率'],
    [/instant cooldown/i, '技能瞬间冷却'],
    [/no cooldown/i, '技能无冷却'],
    [/infinite skill points/i, '无限技能点'],
    [/infinite stat points/i, '无限属性点'],
    [/infinite talent points/i, '无限天赋点'],
    [/infinite attribute points/i, '无限属性点'],
    [/infinite perk points/i, '无限特长点'],
    [/infinite money/i, '无限金钱'],
    [/infinite gold/i, '无限金币'],
    [/infinite cash/i, '无限现金'],
    [/infinite coins/i, '无限硬币'],
    [/infinite credits/i, '无限信用点'],
    [/infinite souls/i, '无限灵魂 / 卢恩'],
    [/infinite runes/i, '无限卢恩'],
    [/infinite weight/i, '无限负重'],
    [/zero weight/i, '负重清零'],
    [/infinite items/i, '无限物品'],
    [/infinite consumables/i, '无限消耗品'],
    [/infinite potions/i, '无限药水'],
    [/infinite materials/i, '无限材料'],
    [/infinite resources/i, '无限资源'],
    [/infinite weapon sharpness/i, '无限武器斩味 / 锋利度'],
    [/infinite weapon durability/i, '无限武器耐久度'],
    [/infinite armor durability/i, '无限防具耐久度'],
    [/weapon never breaks/i, '武器永不损坏'],
    [/max hunter rank points/i, '最高猎人等级点数'],
    [/max hunter rank/i, '最高猎人等级 (HR)'],
    [/max master rank/i, '最高大师等级 (MR)'],
    [/edit gold/i, '编辑金币'],
    [/edit money/i, '编辑金钱'],
    [/edit souls/i, '编辑灵魂'],
    [/edit runes/i, '编辑卢恩'],
    [/edit exp/i, '编辑经验值'],
    [/edit level/i, '编辑等级'],
    [/no hunger/i, '不会饥饿'],
    [/no thirst/i, '不会口渴'],
    [/no fatigue/i, '不会疲劳'],
    [/max body temperature/i, '维持最佳体温'],
    [/immune to all status effects/i, '免疫全部异常状态'],
    [/immune to all debuffs/i, '免疫全部负面效果'],
    [/save location/i, '保存当前位置'],
    [/teleport/i, '瞬间传送'],
    [/undo teleport/i, '撤销传送'],
    [/teleport to waypoint/i, '传送到地图标记点']
  ];

  function translateOptionDesc(text) {
    if (!text) return '';
    const trimmed = text.trim();
    if (translationCache[trimmed]) {
      return translationCache[trimmed];
    }

    // 1. Try FLiNG Cheat Grammar Rules (Direct phrase matches)
    for (const [pattern, replacement] of CHEAT_GRAMMAR_RULES) {
      if (pattern.test(trimmed)) {
        const compiled = trimmed.replace(pattern, replacement);
        translationCache[trimmed] = compiled;
        return compiled;
      }
    }

    const lower = trimmed.toLowerCase();
    if (VOCAB_MAP[lower]) {
      translationCache[trimmed] = VOCAB_MAP[lower];
      return VOCAB_MAP[lower];
    }

    // 2. Structural transforms (Edit/Set/Add/Infinite/Multiplier)
    let result = trimmed;
    result = result.replace(/^Edit\s+(.+)$/i, (_, m) => `编辑 ${translateSegment(m)}`);
    result = result.replace(/^Set\s+(.+)$/i, (_, m) => `设置 ${translateSegment(m)}`);
    result = result.replace(/^Add\s+(.+)$/i, (_, m) => `增加 ${translateSegment(m)}`);
    result = result.replace(/^Infinite\s+(.+)$/i, (_, m) => `无限 ${translateSegment(m)}`);
    result = result.replace(/^Unlimited\s+(.+)$/i, (_, m) => `无限 ${translateSegment(m)}`);
    result = result.replace(/^Max\s+(.+)$/i, (_, m) => `最大 ${translateSegment(m)}`);
    result = result.replace(/^Min\s+(.+)$/i, (_, m) => `最小 ${translateSegment(m)}`);
    result = result.replace(/^Easy\s+(.+)$/i, (_, m) => `简单 / 快速 ${translateSegment(m)}`);
    result = result.replace(/^Instant\s+(.+)$/i, (_, m) => `瞬间 ${translateSegment(m)}`);
    result = result.replace(/^Zero\s+(.+)$/i, (_, m) => `${translateSegment(m)} 清零`);
    result = result.replace(/^No\s+(.+)$/i, (_, m) => `无 ${translateSegment(m)}`);
    result = result.replace(/^Freeze\s+(.+)$/i, (_, m) => `锁定 ${translateSegment(m)}`);
    result = result.replace(/^Lock\s+(.+)$/i, (_, m) => `锁定 ${translateSegment(m)}`);
    result = result.replace(/^Unlock\s+All\s+(.+)$/i, (_, m) => `解锁全部 ${translateSegment(m)}`);
    result = result.replace(/^Get\s+All\s+(.+)$/i, (_, m) => `获取全部 ${translateSegment(m)}`);
    result = result.replace(/^(.+)\s+Multiplier$/i, (_, m) => `${translateSegment(m)} 倍率`);
    result = result.replace(/^(.+)\s+Won't\s+Decrease$/i, (_, m) => `${translateSegment(m)} 不减`);
    result = result.replace(/^(.+)\s+Won't\s+Increase$/i, (_, m) => `${translateSegment(m)} 不增`);

    const finalRes = result !== trimmed ? result : translateSegment(trimmed);
    if (/[\u4e00-\u9fa5]/.test(finalRes)) {
      translationCache[trimmed] = finalRes;
    }
    return finalRes;
  }

  function translateSegment(seg) {
    const l = seg.toLowerCase().trim();
    if (VOCAB_MAP[l]) return VOCAB_MAP[l];

    let out = seg;
    for (const [en, cn] of Object.entries(VOCAB_MAP)) {
      if (en.length > 2) {
        const reg = new RegExp(`\\b${en}\\b`, 'gi');
        if (reg.test(out)) {
          out = out.replace(reg, cn);
        }
      }
    }
    return out;
  }

  function init() {
    const modal = document.getElementById('modal-trainer-details');
    const btnClose = document.getElementById('btn-close-modal');
    const btnFavorite = document.getElementById('modal-btn-favorite');
    const btnOpenUrl = document.getElementById('modal-btn-open-url');
    const btnToggleTranslate = document.getElementById('btn-toggle-translate');
    const translateBtnText = document.getElementById('translate-btn-text');

    if (btnClose) {
      btnClose.addEventListener('click', closeModal);
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    // Modal Tabs Switching
    const modalTabs = document.querySelectorAll('.modal-tab');
    modalTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        modalTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetTabId = tab.getAttribute('data-tab');
        const targetPane = document.getElementById(targetTabId);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    // Translation Toggle Switch
    if (btnToggleTranslate) {
      btnToggleTranslate.addEventListener('click', () => {
        isTranslateMode = !isTranslateMode;
        const noticeEl = document.getElementById('options-translation-notice');
        if (isTranslateMode) {
          btnToggleTranslate.classList.remove('off');
          if (translateBtnText) translateBtnText.textContent = '🌐 中文翻译 ON';
          if (noticeEl) noticeEl.classList.remove('hidden');
          showToast('已开启中文功能翻译（机翻仅供参考）', 'info');
        } else {
          btnToggleTranslate.classList.add('off');
          if (translateBtnText) translateBtnText.textContent = '🌐 英文原版';
          if (noticeEl) noticeEl.classList.add('hidden');
          showToast('已切换为英文原版', 'info');
        }
        if (currentTrainer && currentTrainer.options) {
          renderOptionsList(currentTrainer.options);
        }
      });
    }

    if (btnFavorite) {
      btnFavorite.addEventListener('click', async () => {
        if (!currentTrainer) return;
        await window.electronAPI.library.toggleFavorite(currentTrainer);
        updateFavoriteButtonState();
        showToast('已更新收藏状态', 'success');
      });
    }

    if (btnOpenUrl) {
      btnOpenUrl.addEventListener('click', () => {
        if (currentTrainer && currentTrainer.url) {
          window.electronAPI.shell.openExternal(currentTrainer.url);
        }
      });
    }

    // Banner & Cover Image Click to Preview
    const bannerEl = document.getElementById('modal-banner');
    if (bannerEl) {
      bannerEl.addEventListener('click', (e) => {
        if (e.target.closest('#btn-close-modal') || e.target.closest('#modal-btn-favorite') || e.target.closest('#modal-btn-open-url') || e.target.closest('#modal-thumb-box')) {
          return;
        }
        if (currentTrainer && (currentTrainer.banner || currentTrainer.cover)) {
          openLightbox(currentTrainer.banner || currentTrainer.cover, `${currentTrainer.title} - 背景大图预览`);
        }
      });
    }

    const thumbBoxEl = document.getElementById('modal-thumb-box');
    if (thumbBoxEl) {
      thumbBoxEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentTrainer && currentTrainer.cover) {
          openLightbox(currentTrainer.cover, `${currentTrainer.title} - 官方游戏封面`);
        }
      });
    }

    // Lightbox Controls
    const lightbox = document.getElementById('modal-image-preview');
    const btnCloseLightbox = document.getElementById('btn-close-lightbox');
    if (btnCloseLightbox) {
      btnCloseLightbox.addEventListener('click', closeLightbox);
    }
    if (lightbox) {
      lightbox.addEventListener('click', () => {
        closeLightbox();
      });
    }

    // Keyboard ESC listener
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (lightbox && !lightbox.classList.contains('hidden')) {
          closeLightbox();
        } else {
          closeModal();
        }
      }
    });
  }

  function openLightbox(imgUrl, captionText = '') {
    const lightbox = document.getElementById('modal-image-preview');
    const imgEl = document.getElementById('lightbox-img');
    const captionEl = document.getElementById('lightbox-caption');
    if (!lightbox || !imgEl) return;

    imgEl.src = imgUrl;
    if (captionEl) captionEl.textContent = captionText;
    lightbox.classList.remove('hidden');
  }

  function closeLightbox() {
    const lightbox = document.getElementById('modal-image-preview');
    if (lightbox) lightbox.classList.add('hidden');
  }

  function closeModal() {
    const modal = document.getElementById('modal-trainer-details');
    if (modal) modal.classList.add('hidden');
    currentTrainer = null;
  }

  async function updateFavoriteButtonState() {
    if (!currentTrainer) return;
    const isFav = await window.electronAPI.library.isFavorite(currentTrainer.url || currentTrainer.id);
    const btnFav = document.getElementById('modal-btn-favorite');
    if (btnFav) {
      if (isFav) {
        btnFav.style.color = 'var(--accent-cyan)';
        btnFav.style.borderColor = 'var(--accent-cyan)';
      } else {
        btnFav.style.color = '';
        btnFav.style.borderColor = '';
      }
    }
  }

  async function openDetails(url, previewItem = {}) {
    const modal = document.getElementById('modal-trainer-details');
    if (!modal) return;

    modal.classList.remove('hidden');

    // Populate preview info first
    const titleEl = document.getElementById('modal-game-title');
    const coverEl = document.getElementById('modal-cover-img');
    const bannerEl = document.getElementById('modal-banner');
    const versionEl = document.getElementById('modal-version-tag');
    const optionsCountEl = document.getElementById('modal-options-count');
    const dateEl = document.getElementById('modal-date-tag');
    const optionsListEl = document.getElementById('modal-options-list');
    const downloadsListEl = document.getElementById('modal-downloads-list');
    const notesBoxEl = document.getElementById('modal-notes-box');
    const downloadsBadgeEl = document.getElementById('modal-downloads-badge');

    const fallbackCover = 'https://flingtrainer.com/wp-content/uploads/2019/05/cropped-free-icon-bw_icon-template-psd-3-3-200x200.png';

    titleEl.textContent = previewItem.title || '加载中...';
    coverEl.src = previewItem.cover || fallbackCover;
    versionEl.textContent = previewItem.gameVersion || '获取中...';
    optionsCountEl.textContent = previewItem.optionsCount || '修改器';
    dateEl.textContent = previewItem.date || '';
    if (notesBoxEl) notesBoxEl.classList.add('hidden');
    if (downloadsBadgeEl) downloadsBadgeEl.textContent = '...';

    optionsListEl.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">正在获取功能热键列表与下载数据...</div>';
    downloadsListEl.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">正在解析下载附件...</div>';

    currentTrainer = { url, ...previewItem };
    updateFavoriteButtonState();

    try {
      const details = await window.electronAPI.scraper.getDetails({ url });
      currentTrainer = { ...currentTrainer, ...details };

      const rawTitle = details.title || previewItem.title || '';
      const cleanEn = previewItem.cleanTitle || rawTitle.replace(/\s+Trainer$/i, '').trim();

      const config = await window.electronAPI.settings.get();
      if (config && config.translateGameTitles) {
        let displayCn = previewItem.cnTitle || cleanEn;
        if (/[\u4e00-\u9fa5]/.test(displayCn) && displayCn !== cleanEn) {
          titleEl.textContent = `${displayCn} (${cleanEn})`;
        } else {
          titleEl.textContent = rawTitle;
          if (window.electronAPI?.scraper?.translateGameTitle) {
            window.electronAPI.scraper.translateGameTitle({ title: cleanEn }).then(res => {
              if (res && res.cn && /[\u4e00-\u9fa5]/.test(res.cn) && res.cn !== cleanEn) {
                titleEl.textContent = `${res.cn} (${cleanEn})`;
              }
            }).catch(() => {});
          }
        }
      } else {
        titleEl.textContent = rawTitle;
      }
      if (details.cover) coverEl.src = details.cover;
      if (details.banner) {
        bannerEl.style.backgroundImage = `url('${details.banner}')`;
      }
      versionEl.textContent = details.gameVersion || '全版本';
      optionsCountEl.textContent = details.optionsCount || `${details.options.length} 项修改`;
      dateEl.textContent = details.date || details.lastUpdated || '';

      // Update downloads count badge
      if (downloadsBadgeEl) {
        downloadsBadgeEl.textContent = details.attachments ? `${details.attachments.length} 个版本` : '0';
      }

      // Render Notes if available
      if (notesBoxEl) {
        if (details.notes) {
          notesBoxEl.innerHTML = `
            <div class="notes-header">
              <div style="display: flex; align-items: center; gap: 6px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>特别说明 & 反作弊使用须知</span>
              </div>
              <button id="btn-translate-notes" class="btn-text-link" style="margin-left: auto; font-size: 12px; color: var(--accent-cyan); cursor: pointer;">🌐 翻译为中文</button>
            </div>
            <div class="notes-body" id="modal-notes-body">${details.notes.replace(/\n/g, '<br>')}</div>
          `;
          notesBoxEl.classList.remove('hidden');

          const btnTrNotes = document.getElementById('btn-translate-notes');
          const notesBody = document.getElementById('modal-notes-body');
          if (btnTrNotes && notesBody) {
            btnTrNotes.addEventListener('click', async () => {
              btnTrNotes.textContent = '翻译中...';
              try {
                const tr = await window.electronAPI.scraper.translateText({ text: details.notes });
                if (tr) {
                  notesBody.innerHTML = tr.replace(/\n/g, '<br>');
                  btnTrNotes.textContent = '✓ 已翻译为中文';
                } else {
                  btnTrNotes.textContent = '翻译失败';
                }
              } catch (e) {
                btnTrNotes.textContent = '翻译失败';
              }
            });
          }
        } else {
          notesBoxEl.classList.add('hidden');
        }
      }

      renderOptionsList(details.options);
      renderDownloadsList(details.attachments, details);
    } catch (e) {
      optionsListEl.innerHTML = `<div style="grid-column: 1/-1; color: var(--color-danger); text-align: center; padding: 30px;">加载详情失败: ${e.message}</div>`;
      downloadsListEl.innerHTML = `<div style="color: var(--color-danger); text-align: center; padding: 30px;">加载下载链接失败: ${e.message}</div>`;
      showToast(e.message, 'error');
    }
  }

  function renderOptionsList(options) {
    const container = document.getElementById('modal-options-list');
    if (!container) return;

    container.innerHTML = '';
    if (!options || options.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 30px;">未解析到独立热键列表，请参考附件说明。</div>';
      return;
    }

    options.forEach((opt, index) => {
      const item = document.createElement('div');
      item.className = 'option-item-card';

      let descHtml = '';
      let isFullyTranslated = false;

      if (isTranslateMode) {
        const cnDesc = translateOptionDesc(opt.desc);
        isFullyTranslated = /[\u4e00-\u9fa5]/.test(cnDesc);
        if (cnDesc && cnDesc !== opt.desc) {
          descHtml = `
            <div class="option-desc">${cnDesc}</div>
            <div class="option-desc-en">${opt.desc}</div>
          `;
        } else {
          descHtml = `<div class="option-desc">${opt.desc}</div>`;
        }
      } else {
        descHtml = `<div class="option-desc">${opt.desc}</div>`;
      }

      item.innerHTML = `
        <div class="hotkey-badge">${opt.hotkey}</div>
        <div class="option-details">
          ${descHtml}
          ${opt.tip ? `<div class="option-tip">💡 说明: ${opt.tip}</div>` : ''}
        </div>
      `;
      container.appendChild(item);

      // If in translate mode and not fully translated locally, trigger background online translation
      if (isTranslateMode && !isFullyTranslated && window.electronAPI?.scraper?.translateText) {
        window.electronAPI.scraper.translateText({ text: opt.desc }).then(onlineTr => {
          if (onlineTr && onlineTr !== opt.desc && /[\u4e00-\u9fa5]/.test(onlineTr)) {
            translationCache[opt.desc] = onlineTr;
            const descEl = item.querySelector('.option-desc');
            const enEl = item.querySelector('.option-desc-en');
            if (descEl && isTranslateMode) {
              descEl.textContent = onlineTr;
              if (!enEl) {
                const newEn = document.createElement('div');
                newEn.className = 'option-desc-en';
                newEn.textContent = opt.desc;
                descEl.after(newEn);
              }
            }
          }
        }).catch(() => {});
      }
    });
  }

  function renderDownloadsList(attachments, trainerDetails) {
    const container = document.getElementById('modal-downloads-list');
    if (!container) return;

    container.innerHTML = '';
    if (!attachments || attachments.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 30px;">暂无直接附件下载，请访问网页原站。</div>';
      return;
    }

    const autoUpdateAtts = attachments.filter(a => a.isAutoUpdating);
    const standaloneAtts = attachments.filter(a => !a.isAutoUpdating);

    // Section 1: Auto-Updating Version (if present)
    if (autoUpdateAtts.length > 0) {
      const autoSection = document.createElement('div');
      autoSection.className = 'download-section-block';
      autoSection.innerHTML = `
        <div class="downloads-section-title">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; color: var(--accent-cyan);"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            <span style="color: #fff; font-weight: 700; font-size: 15px;">Auto-Updating Version (自动在线更新版)</span>
          </div>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          体积小巧（约 132 KB），启动时会自动更新适配最新游戏版本。
        </div>
      `;

      autoUpdateAtts.forEach(att => {
        const row = document.createElement('div');
        row.className = 'attachment-row attachment-autoupdate';

        const displayTitle = `${trainerDetails.title} (在线自更新版)`;

        row.innerHTML = `
          <div class="attachment-info">
            <div class="attachment-primary-line">
              <span class="primary-version-badge badge-cyan">⚡ Auto-Updating 在线更新版</span>
              <span class="primary-options-badge">🔄 随游戏更新自适应</span>
            </div>
            <div class="attachment-name">${displayTitle}</div>
            <div class="attachment-secondary-meta">
              <span>📦 ${att.fileSize || '132 KB'}</span>
              <span class="meta-dot">•</span>
              <span>📅 ${att.dateAdded || '最新'}</span>
              ${att.downloadCount ? `<span class="meta-dot">•</span><span>⬇️ ${att.downloadCount} 次下载</span>` : ''}
            </div>
          </div>
          <div class="attachment-actions">
            <button class="btn btn-primary btn-start-download">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>立即下载</span>
            </button>
          </div>
        `;

        row.querySelector('.btn-start-download').addEventListener('click', async () => {
          showToast(`已开始下载自动更新版: ${att.filename}`, 'info');
          window.downloadsModule?.startNewDownload({
            downloadUrl: att.downloadUrl,
            referer: att.referer || trainerDetails.url,
            filename: att.filename,
            gameTitle: trainerDetails.title,
            cover: trainerDetails.cover,
            thumbCover: trainerDetails.thumbCover || trainerDetails.cover,
            version: 'Auto-Updating (Latest)'
          });
        });

        autoSection.appendChild(row);
      });

      container.appendChild(autoSection);
    }

    // Section 2: Standalone Versions
    if (standaloneAtts.length > 0) {
      const standSection = document.createElement('div');
      standSection.className = 'download-section-block';
      standSection.innerHTML = `
        <div class="downloads-section-title" style="margin-top: 18px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; color: var(--accent-violet);"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
            <span style="color: #fff; font-weight: 700; font-size: 15px;">Standalone Versions (独立离线版本 - 共 ${standaloneAtts.length} 个)</span>
          </div>
          <span style="font-size: 12px; color: var(--text-muted);">单文件绿色版</span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          经典独立修改器，完全离线运行。若您的游戏版本不是最新版，可在此选择对应日期的历史版本。
        </div>
      `;

      standaloneAtts.forEach((att, idx) => {
        const row = document.createElement('div');
        const isLatest = idx === 0;
        row.className = `attachment-row ${isLatest ? 'attachment-latest' : 'attachment-history'}`;

        // Extract version and options from filename
        let versionStr = '';
        const vMatch = att.filename.match(/\b(v\d+(?:\.\d+)*(?:\.[a-zA-Z0-9]+)?|\bEarly\.Access\b|\bDemo\b)/i);
        if (vMatch) {
          versionStr = vMatch[1].replace(/\./g, '.');
        }

        let optionsStr = '';
        const optMatch = att.filename.match(/Plus\.(\d+)/i);
        if (optMatch) {
          optionsStr = `${optMatch[1]} 项修改`;
        }

        let cleanTitle = att.filename
          .replace(/\.Trainer-FLiNG.*$/i, '')
          .replace(/\.(zip|exe|rar)$/i, '')
          .replace(/\./g, ' ');

        row.innerHTML = `
          <div class="attachment-info">
            <div class="attachment-primary-line">
              <span class="primary-version-badge ${isLatest ? 'badge-emerald' : 'badge-slate'}">🏷️ ${versionStr ? `版本: ${versionStr}` : '全版本适用'}</span>
              ${optionsStr ? `<span class="primary-options-badge">⚡ ${optionsStr}</span>` : ''}
              ${isLatest ? '<span class="pill-latest-subtle">🌟 最新独立版</span>' : ''}
            </div>
            <div class="attachment-name">${cleanTitle || att.filename}</div>
            <div class="attachment-secondary-meta">
              <span>📦 ${att.fileSize || '未知大小'}</span>
              <span class="meta-dot">•</span>
              <span>📅 ${att.dateAdded || '历史'}</span>
              ${att.downloadCount ? `<span class="meta-dot">•</span><span>⬇️ ${att.downloadCount} 次下载</span>` : ''}
            </div>
          </div>
          <div class="attachment-actions">
            <button class="btn ${isLatest ? 'btn-primary' : 'btn-secondary'} btn-start-download">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>${isLatest ? '下载最新独立版' : '下载此版本'}</span>
            </button>
          </div>
        `;

        row.querySelector('.btn-start-download').addEventListener('click', async () => {
          showToast(`已开始下载独立版: ${att.filename}`, 'info');
          window.downloadsModule?.startNewDownload({
            downloadUrl: att.downloadUrl,
            referer: att.referer || trainerDetails.url,
            filename: att.filename,
            gameTitle: trainerDetails.title,
            cover: trainerDetails.cover,
            thumbCover: trainerDetails.thumbCover || trainerDetails.cover,
            version: att.versionLabel || trainerDetails.gameVersion
          });
        });

        standSection.appendChild(row);
      });

      container.appendChild(standSection);
    }
  }

  return {
    init,
    openDetails,
    closeModal
  };
})();

window.detailsModule = detailsModule;
