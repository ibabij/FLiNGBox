const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://flingtrainer.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// 100% Official Authentic Chinese Game Titles
const ENGLISH_TO_OFFICIAL_CN = {
  'monster hunter wilds': '怪物猎人：荒野',
  'monster hunter world': '怪物猎人：世界',
  'monster hunter rise': '怪物猎人：崛起',
  'black myth wukong': '黑神话：悟空',
  'black myth: wukong': '黑神话：悟空',
  'cyberpunk 2077': '赛博朋克 2077',
  'elden ring': '艾尔登法环',
  'shadow of the erdtree': '黄金树幽影',
  'palworld': '幻兽帕鲁',
  'red dead redemption 2': '荒野大镖客：救赎 2',
  'resident evil 4': '生化危机 4',
  'resident evil 2': '生化危机 2',
  'resident evil 3': '生化危机 3',
  'resident evil 7': '生化危机 7',
  'resident evil village': '生化危机：村庄',
  'the witcher 3': '巫师 3：狂猎',
  'sekiro': '只狼：影逝二度',
  'sekiro shadows die twice': '只狼：影逝二度',
  'god of war': '战神',
  'god of war ragnarok': '战神：诸神黄昏',
  'assassins creed': '刺客信条',
  'assassins creed shadows': '刺客信条：影',
  'assassins creed mirage': '刺客信条：幻景',
  'assassins creed valhalla': '刺客信条：英灵殿',
  'baldurs gate 3': '博德之门 3',
  'diablo iv': '暗黑破坏神 4',
  's.t.a.l.k.e.r. 2': '潜行者 2：切尔诺贝利之心',
  'stalker 2': '潜行者 2：切尔诺贝利之心',
  'stalker 2 heart of chornobyl': '潜行者 2：切尔诺贝利之心',
  'it takes two': '双人成行',
  'hogwarts legacy': '霍格沃茨之遗',
  'kingdom come deliverance ii': '天国：拯救 2',
  'kingdom come deliverance': '天国：拯救',
  'helldivers 2': '绝地潜兵 2',
  'hades ii': '哈迪斯 2',
  'hades': '哈迪斯',
  'dead space': '死亡空间',
  'ghost of tsushima': '对马岛之魂',
  'wo long': '卧龙：苍天陨落',
  'nioh 2': '仁王 2',
  'nioh': '仁王',
  'starfield': '星空',
  'dave the diver': '潜水员戴夫',
  'stardew valley': '星露谷物语',
  'terraria': '泰拉瑞亚',
  'final fantasy vii': '最终幻想 7',
  'final fantasy xvi': '最终幻想 16',
  'armored core vi': '装甲核心 6',
  'like a dragon': '人中之龙 / 如龙',
  'octopath traveler': '八方旅人 / 歧路旅人',
  'borderlands 3': '无主之地 3',
  'doom eternal': '毁灭战士：永恒',
  'devil may cry 5': '鬼泣 5',
  'nier automata': '尼尔：机械纪元',
  'escape from tarkov': '逃离塔科夫',
  'cities skylines ii': '城市：天际线 2',
  'civilization vi': '文明 6',
  'civilization vii': '文明 7',
  'stellaris': '群星',
  'hearts of iron iv': '钢铁雄心 4',
  'crusader kings iii': '十字军之王 3',
  'hollow knight': '空洞骑士',
  'slay the spire': '杀戮尖塔',
  'dead cells': '死亡细胞',
  'lies of p': '匹诺曹的谎言',
  'silent hill 2': '寂静岭 2',
  'the sinking city 2': '沉没之城 2',
  'survival log': '求生日志',
  'village in the shade': '树荫之村',
  'horizon zero dawn': '地平线：零之曙光',
  'horizon forbidden west': '地平线：西之绝境',
  'dying light 2': '消逝的光芒 2',
  'dragons dogma 2': '龙之信条 2',
  'stellar blade': '剑星',
  'no rest for the wicked': '恶意不息',
  'sons of the forest': '森林之子',
  'satisfactory': '幸福工厂',
  'frostpunk 2': '冰汽时代 2',
  'death stranding': '死亡搁浅'
};

// Comprehensive Chinese to English Game Title Mapping
const GAME_NAME_DICTIONARY = {
  '怪物猎人': 'Monster Hunter',
  '怪物猎人荒野': 'Monster Hunter Wilds',
  '怪物猎人 荒野': 'Monster Hunter Wilds',
  '怪猎荒野': 'Monster Hunter Wilds',
  '怪猎': 'Monster Hunter',
  '怪物猎人崛起': 'Monster Hunter Rise',
  '怪物猎人世界': 'Monster Hunter World',
  '黑神话': 'Black Myth Wukong',
  '黑神话悟空': 'Black Myth Wukong',
  '黑神话 悟空': 'Black Myth Wukong',
  '悟空': 'Black Myth Wukong',
  '赛博朋克': 'Cyberpunk 2077',
  '赛博朋克2077': 'Cyberpunk 2077',
  '赛博朋克 2077': 'Cyberpunk 2077',
  '2077': 'Cyberpunk 2077',
  '艾尔登法环': 'Elden Ring',
  '老头环': 'Elden Ring',
  '法环': 'Elden Ring',
  '黄金树幽影': 'Shadow of the Erdtree',
  '幻兽帕鲁': 'Palworld',
  '帕鲁': 'Palworld',
  '荒野大镖客': 'Red Dead Redemption 2',
  '荒野大镖客2': 'Red Dead Redemption 2',
  '大表哥': 'Red Dead Redemption 2',
  '大表哥2': 'Red Dead Redemption 2',
  '生化危机': 'Resident Evil',
  '生化危机4': 'Resident Evil 4',
  '生化危机2': 'Resident Evil 2',
  '生化危机3': 'Resident Evil 3',
  '生化危机7': 'Resident Evil 7',
  '生化危机8': 'Resident Evil Village',
  '生化危机重制版': 'Resident Evil',
  '巫师': 'The Witcher 3',
  '巫师3': 'The Witcher 3',
  '狂猎': 'The Witcher 3',
  '只狼': 'Sekiro',
  '影逝二度': 'Sekiro Shadows Die Twice',
  '战神': 'God of War',
  '战神诸神黄昏': 'God of War Ragnarok',
  '刺客信条': 'Assassin\'s Creed',
  '刺客信条影': 'Assassin\'s Creed Shadows',
  '刺客信条幻景': 'Assassin\'s Creed Mirage',
  '刺客信条英灵殿': 'Assassin\'s Creed Valhalla',
  '博德之门': 'Baldur\'s Gate 3',
  '博德之门3': 'Baldur\'s Gate 3',
  '暗黑破坏神': 'Diablo',
  '暗黑4': 'Diablo IV',
  '极品飞车': 'Need for Speed',
  '极品飞车不羁': 'Need for Speed Unbound',
  '古墓丽影': 'Tomb Raider',
  '孤岛惊魂': 'Far Cry',
  '孤岛惊魂6': 'Far Cry 6',
  '辐射': 'Fallout',
  '辐射4': 'Fallout 4',
  '潜行者': 'S.T.A.L.K.E.R.',
  '潜行者2': 'S.T.A.L.K.E.R. 2',
  '双人成行': 'It Takes Two',
  '霍格沃茨之遗': 'Hogwarts Legacy',
  '霍格沃茨': 'Hogwarts Legacy',
  '天国拯救': 'Kingdom Come Deliverance',
  '天国拯救2': 'Kingdom Come Deliverance II',
  '绝地潜兵': 'Helldivers',
  '绝地潜兵2': 'Helldivers 2',
  '地狱潜者': 'Helldivers',
  '哈迪斯': 'Hades',
  '哈迪斯2': 'Hades II',
  '死亡空间': 'Dead Space',
  '对马岛之魂': 'Ghost of Tsushima',
  '对马岛': 'Ghost of Tsushima',
  '卧龙': 'Wo Long',
  '仁王': 'Nioh',
  '仁王2': 'Nioh 2',
  '星空': 'Starfield',
  '潜水员戴夫': 'Dave the Diver',
  '星露谷物语': 'Stardew Valley',
  '星露谷': 'Stardew Valley',
  '泰拉瑞亚': 'Terraria',
  '最终幻想': 'Final Fantasy',
  '最终幻想7': 'Final Fantasy VII',
  '最终幻想16': 'Final Fantasy XVI',
  '装甲核心': 'Armored Core VI',
  '装甲核心6': 'Armored Core VI',
  '如龙': 'Like a Dragon',
  '如龙8': 'Like a Dragon Infinite Wealth',
  '八方旅人': 'Octopath Traveler',
  '歧路旅人': 'Octopath Traveler',
  '无主之地': 'Borderlands',
  '毁灭战士': 'DOOM',
  '鬼泣': 'Devil May Cry',
  '鬼泣5': 'Devil May Cry 5',
  '尼尔': 'Nier Automata',
  '机械纪元': 'Nier Automata',
  '逃离塔科夫': 'Escape from Tarkov',
  '城市天际线': 'Cities Skylines',
  '城市天际线2': 'Cities Skylines II',
  '文明': 'Civilization',
  '文明6': 'Civilization VI',
  '文明7': 'Civilization VII',
  '群星': 'Stellaris',
  '钢铁雄心': 'Hearts of Iron IV',
  '钢铁雄心4': 'Hearts of Iron IV',
  '十字军之王': 'Crusader Kings III',
  '空洞骑士': 'Hollow Knight',
  '杀戮尖塔': 'Slay the Spire',
  '死亡细胞': 'Dead Cells',
  '匹诺曹的谎言': 'Lies of P',
  '匹诺曹': 'Lies of P',
  '寂静岭': 'Silent Hill',
  '寂静岭2': 'Silent Hill 2',
  '沉没之城': 'The Sinking City',
  '沉没之城2': 'The Sinking City 2',
  '生存日志': 'Survival Log',
  '林中之村': 'Village in the Shade',
  '地平线': 'Horizon',
  '零之曙光': 'Horizon Zero Dawn',
  '西之绝境': 'Horizon Forbidden West',
  '看门狗': 'Watch Dogs',
  '地铁': 'Metro Exodus',
  '漫威蜘蛛侠': 'Marvel\'s Spider-Man',
  '蜘蛛侠': 'Spider-Man',
  '消逝的光芒': 'Dying Light',
  '消逝的光芒2': 'Dying Light 2',
  '腐朽之都': 'State of Decay 2',
  '腐烂国度': 'State of Decay 2',
  '无双大蛇': 'Warriors Orochi',
  '真三国无双': 'Dynasty Warriors',
  '三国志': 'Romance of the Three Kingdoms',
  '战锤': 'Warhammer',
  '星际战士': 'Space Marine 2',
  '星际战士2': 'Space Marine 2',
  '龙之信条': 'Dragon\'s Dogma',
  '龙之信条2': 'Dragon\'s Dogma 2',
  '剑星': 'Stellar Blade',
  '恶意不息': 'No Rest for the Wicked',
  '森林之子': 'Sons of the Forest',
  '幸福工厂': 'Satisfactory',
  '冰汽时代': 'Frostpunk',
  '冰汽时代2': 'Frostpunk 2',
  '死亡搁浅': 'Death Stranding'
};

class FlingScraper {
  constructor(store) {
    this.store = store;
    this.azCache = null;
    this.azCacheTime = 0;
  }

  getAxiosClient() {
    const config = this.store ? this.store.getConfig() : {};
    const axiosOptions = {
      timeout: 15000,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    };

    if (config.proxy && config.proxy.mode === 'custom' && config.proxy.customUrl) {
      try {
        let proxyStr = config.proxy.customUrl.trim();
        if (!/^https?:\/\//i.test(proxyStr)) {
          proxyStr = 'http://' + proxyStr;
        }
        const proxyUrl = new URL(proxyStr);
        axiosOptions.proxy = {
          protocol: proxyUrl.protocol.replace(':', ''),
          host: proxyUrl.hostname,
          port: parseInt(proxyUrl.port, 10),
          auth: proxyUrl.username ? { username: proxyUrl.username, password: proxyUrl.password } : undefined
        };
      } catch (e) {
        console.error('Invalid custom proxy URL:', e);
      }
    }

    return axios.create(axiosOptions);
  }

  /**
   * Remove WordPress resolution dimension suffixes (-200x200, -scaled) to get true full HD cover
   */
  _cleanCoverUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let clean = url.trim();
    if (clean.startsWith('//')) {
      clean = 'https:' + clean;
    }
    // Remove dimension suffix: e.g. header-6-200x200.jpg -> header-6.jpg
    clean = clean.replace(/-\d+x\d+(\.[a-zA-Z0-9]+(?:\?.*)?)$/i, '$1');
    clean = clean.replace(/-scaled(\.[a-zA-Z0-9]+(?:\?.*)?)$/i, '$1');
    return clean;
  }

  /**
   * Parse trainer cards from Cheerio instance
   */
  _parsePostList($) {
    const items = [];
    $('article.post-standard, article.type-post').each((_, el) => {
      const $el = $(el);
      const id = $el.attr('id') ? $el.attr('id').replace('post-', '') : Math.random().toString(36).substr(2, 9);
      const titleLink = $el.find('h2.post-title a');
      const title = titleLink.text().trim();
      const url = titleLink.attr('href');

      if (!title || !url) return;

      const thumbImg = $el.find('.post-details-thumb img');
      let rawThumb = thumbImg.attr('src') || thumbImg.attr('data-src') || '';
      if (rawThumb && rawThumb.startsWith('//')) {
        rawThumb = 'https:' + rawThumb;
      }
      
      let finalCover = this._cleanCoverUrl(rawThumb);
      let finalThumb = rawThumb;

      // If thumbnail is a Gravatar avatar, try getting actual game art from .entry
      if (!rawThumb || rawThumb.includes('gravatar.com') || rawThumb.includes('default_avatar')) {
        const entryImg = $el.find('.entry img').first().attr('src');
        if (entryImg) {
          finalCover = this._cleanCoverUrl(entryImg);
          finalThumb = entryImg;
        }
      }

      const day = $el.find('.post-details-day').text().trim();
      const month = $el.find('.post-details-month').text().trim();
      const year = $el.find('.post-details-year').text().trim();
      const date = [year, month, day].filter(Boolean).join('-');

      const entryText = $el.find('.entry').text().trim();
      
      // Parse Options Count (e.g., "28 Options")
      let optionsCount = '';
      const optionsMatch = entryText.match(/(\d+)\s+Options/i);
      if (optionsMatch) {
        optionsCount = optionsMatch[1] + ' 项修改';
      }

      // Parse Game Version (e.g., "Game Version: v1.0+")
      let gameVersion = '';
      const versionMatch = entryText.match(/Game Version:\s*([^\n·]+)/i);
      if (versionMatch) {
        gameVersion = versionMatch[1].trim();
      }

      // Parse Last Updated (e.g., "Last Updated: 2026.08.25")
      let lastUpdated = '';
      const updatedMatch = entryText.match(/Last Updated:\s*([^\n·]+)/i);
      if (updatedMatch) {
        lastUpdated = updatedMatch[1].trim();
      }

      const cleanTitle = title.replace(/\s+Trainer$/i, '').trim();
      let cnTitle = cleanTitle;

      const cleanLower = cleanTitle.toLowerCase();
      if (ENGLISH_TO_OFFICIAL_CN[cleanLower]) {
        cnTitle = ENGLISH_TO_OFFICIAL_CN[cleanLower];
      } else {
        const norm = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
        let bestMatch = null;
        let maxMatchLen = 0;

        for (const [en, cn] of Object.entries(ENGLISH_TO_OFFICIAL_CN)) {
          const enNorm = en.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (norm === enNorm) {
            bestMatch = cn;
            break;
          }
          if (enNorm.length >= 4 && (norm.includes(enNorm) || enNorm.includes(norm))) {
            if (enNorm.length > maxMatchLen) {
              maxMatchLen = enNorm.length;
              bestMatch = cn;
            }
          }
        }

        if (!bestMatch) {
          for (const [cn, en] of Object.entries(GAME_NAME_DICTIONARY)) {
            const enNorm = en.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (norm === enNorm) {
              bestMatch = cn;
              break;
            }
            if (enNorm.length >= 4 && (norm.includes(enNorm) || enNorm.includes(norm))) {
              if (enNorm.length > maxMatchLen) {
                maxMatchLen = enNorm.length;
                bestMatch = cn;
              }
            }
          }
        }

        if (bestMatch) {
          cnTitle = bestMatch;
        }
      }

      items.push({
        id,
        title,
        cleanTitle,
        cnTitle,
        url,
        cover: finalCover,
        thumbCover: finalThumb,
        date: lastUpdated || date,
        optionsCount: optionsCount || '修改器',
        gameVersion: gameVersion || '全版本适用',
        summary: entryText.replace(/\s+/g, ' ').substring(0, 120)
      });
    });

    // Pagination detection
    let hasNextPage = false;
    let totalPages = 1;
    let currentPage = 1;

    const navi = $('.wp-pagenavi');
    if (navi.length > 0) {
      const current = navi.find('span.current').text().trim();
      currentPage = parseInt(current, 10) || 1;
      const pagesText = navi.find('.pages').text().trim(); // "Page 1 of 95"
      const match = pagesText.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
      if (match) {
        totalPages = parseInt(match[2], 10) || 1;
      }
      hasNextPage = navi.find('a.nextpostslink').length > 0 || currentPage < totalPages;
    } else {
      hasNextPage = $('link[rel="next"]').length > 0 || $('.nav-previous a').length > 0;
    }

    return { items, hasNextPage, currentPage, totalPages };
  }

  /**
   * Get recently updated trainers with pagination
   */
  async getRecentTrainers(page = 1) {
    const client = this.getAxiosClient();
    const url = page > 1 ? `${BASE_URL}/page/${page}/` : `${BASE_URL}/`;
    try {
      const res = await client.get(url);
      const $ = cheerio.load(res.data);
      const result = this._parsePostList($);
      result.currentPage = page;
      return result;
    } catch (e) {
      console.error(`Error fetching recent trainers (page ${page}):`, e.message);
      throw new Error(`无法获取最新修改器列表: ${e.message}`);
    }
  }

  /**
   * Translate Chinese query to English game title
   */
  async _translateChineseQuery(query) {
    if (!query || !query.trim()) return query;
    const trimmed = query.trim();

    // Check if query contains Chinese characters
    if (!/[\u4e00-\u9fa5]/.test(trimmed)) {
      return trimmed;
    }

    // 1. Direct dictionary match
    if (GAME_NAME_DICTIONARY[trimmed]) {
      return GAME_NAME_DICTIONARY[trimmed];
    }

    // 2. Normalized dictionary match
    const cleanQ = trimmed.replace(/[\s\-_:：]/g, '');
    if (GAME_NAME_DICTIONARY[cleanQ]) {
      return GAME_NAME_DICTIONARY[cleanQ];
    }

    // 3. Partial substring dictionary match
    for (const [cn, en] of Object.entries(GAME_NAME_DICTIONARY)) {
      if (trimmed.includes(cn) || cn.includes(trimmed)) {
        return en;
      }
    }

    // 4. Online translation API fallback
    try {
      const client = this.getAxiosClient();
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=zh-CN|en`;
      const res = await client.get(url, { timeout: 3500 });
      if (res.data && res.data.responseData && res.data.responseData.translatedText) {
        const translated = res.data.responseData.translatedText.trim();
        const cleanEn = translated.replace(/[^a-zA-Z0-9\s:.-]/g, '').trim();
        if (cleanEn && cleanEn.length > 1) {
          return cleanEn;
        }
      }
    } catch (e) {
      console.log('Online translation fallback skipped:', e.message);
    }

    return trimmed;
  }

  /**
   * Universal translation helper for cheat options & notes (Google free API + MyMemory + memory cache)
   */
  async translateText(text, from = 'en', to = 'zh-CN') {
    if (!text || !text.trim()) return text;
    const trimmed = text.trim();
    if (!this.translationCache) this.translationCache = {};
    if (this.translationCache[trimmed]) {
      return this.translationCache[trimmed];
    }

    const client = this.getAxiosClient();

    // 1. Try Google Translate free API endpoint
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(trimmed)}`;
      const res = await client.get(url, { timeout: 4000 });
      if (res.data && res.data[0]) {
        const translated = res.data[0].map(s => s[0]).join('').trim();
        if (translated) {
          this.translationCache[trimmed] = translated;
          return translated;
        }
      }
    } catch (e) {
      // fallback
    }

    // 2. Try MyMemory API endpoint
    try {
      const url2 = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${from}|${to}`;
      const res2 = await client.get(url2, { timeout: 3500 });
      if (res2.data && res2.data.responseData && res2.data.responseData.translatedText) {
        const tr2 = res2.data.responseData.translatedText.trim();
        this.translationCache[trimmed] = tr2;
        return tr2;
      }
    } catch (e) {
      // fallback
    }

    return trimmed;
  }

  /**
   * Search relevance scorer to filter out loose WordPress false positives
   */
  _scoreRelevance(itemTitle, query) {
    if (!itemTitle || !query) return 0;
    const normTitle = itemTitle.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const normQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const queryTokens = normQuery.split(/\s+/).filter(t => t.length > 1);

    if (normTitle.includes(normQuery)) {
      return 1000 + (100 - Math.abs(normTitle.length - normQuery.length));
    }

    let matchCount = 0;
    let score = 0;

    for (const token of queryTokens) {
      const regex = new RegExp(`\\b${token}`, 'i');
      if (regex.test(normTitle)) {
        matchCount++;
        score += 50;
        if (normTitle.includes(token)) score += 20;
      }
    }

    // For multi-word queries (e.g. "Black Myth Wukong" or "Monster Hunter"), eliminate low-relevance results
    if (queryTokens.length >= 2) {
      const matchRatio = matchCount / queryTokens.length;
      if (matchRatio < 0.4) {
        return 0; // Filter out false positives (e.g. just "Black" in Black Ops when searching Black Myth)
      }
      score += matchRatio * 200;
    } else if (queryTokens.length === 1 && matchCount === 0) {
      return 0;
    }

    return score;
  }

  /**
   * Search trainers by keyword (supports both English and automatic Chinese translation)
   */
  async searchTrainers(query, page = 1) {
    if (!query || !query.trim()) {
      return this.getRecentTrainers(page);
    }

    const originalQuery = query.trim();
    const effectiveQuery = await this._translateChineseQuery(originalQuery);

    const client = this.getAxiosClient();
    const encoded = encodeURIComponent(effectiveQuery);
    const url = page > 1 
      ? `${BASE_URL}/page/${page}/?s=${encoded}` 
      : `${BASE_URL}/?s=${encoded}`;

    try {
      const res = await client.get(url);
      const $ = cheerio.load(res.data);
      const result = this._parsePostList($);
      result.query = originalQuery;
      result.effectiveQuery = effectiveQuery;
      result.isTranslated = effectiveQuery.toLowerCase() !== originalQuery.toLowerCase();
      result.currentPage = page;

      // Smart relevance filtering and ranking for search queries
      if (result.items && result.items.length > 0) {
        const scored = result.items
          .map(item => ({ ...item, _score: this._scoreRelevance(item.title, effectiveQuery) }))
          .filter(item => item._score > 0)
          .sort((a, b) => b._score - a._score);

        if (scored.length > 0) {
          result.items = scored;
        }
      }

      return result;
    } catch (e) {
      console.error(`Error searching trainers (${query}, page ${page}):`, e.message);
      throw new Error(`搜索修改器失败: ${e.message}`);
    }
  }

  /**
   * Scrape "Popular Trainers" from flingtrainer.com homepage
   */
  async getPopularTrainers() {
    if (this._popularCache && (Date.now() - this._popularCacheTime < 3600000)) {
      return this._popularCache;
    }

    try {
      const client = this.getAxiosClient();
      const res = await client.get(BASE_URL);
      const $ = cheerio.load(res.data);
      const popular = [];

      $('.widget').each((_, widgetEl) => {
        const title = $(widgetEl).find('.widget-title, h1, h2, h3, h4').text().trim();
        if (/popular/i.test(title)) {
          $(widgetEl).find('a').each((_, aEl) => {
            const rawTitle = $(aEl).text().trim();
            const href = $(aEl).attr('href');
            if (rawTitle && href && href.includes('/trainer/')) {
              const cleanTitle = rawTitle.replace(/\s+Trainer$/i, '').trim();
              if (cleanTitle && !popular.some(p => p.title === cleanTitle)) {
                popular.push({
                  title: cleanTitle,
                  url: href
                });
              }
            }
          });
        }
      });

      if (popular.length > 0) {
        this._popularCache = popular;
        this._popularCacheTime = Date.now();
        return popular;
      }
    } catch (e) {
      console.error('Failed to scrape popular trainers:', e.message);
    }

    // Fallback if network offline
    return [
      { title: 'Black Myth: Wukong' },
      { title: 'Monster Hunter Wilds' },
      { title: 'Elden Ring' },
      { title: 'Cyberpunk 2077' },
      { title: 'S.T.A.L.K.E.R. 2: Heart of Chornobyl' }
    ];
  }

  /**
   * Resolve official Chinese game name via Steam Store Search API (Free & Official)
   */
  async _resolveSteamGameTitle(cleanTitle) {
    try {
      const client = this.getAxiosClient();
      const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanTitle)}&l=schinese&cc=CN`;
      const res = await client.get(url, { timeout: 4500 });
      if (res.data && res.data.items && res.data.items.length > 0) {
        const top = res.data.items[0];
        if (top && top.name) {
          const steamName = top.name.trim();
          if (/[\u4e00-\u9fa5]/.test(steamName)) {
            return steamName;
          }
        }
      }
    } catch (e) {
      // Steam API timed out or network error
    }
    return null;
  }

  /**
   * Translate Game title to Chinese (Local Dict -> Steam Official API -> Online Fallback)
   */
  async translateGameTitle(title) {
    if (!title || typeof title !== 'string') return { cn: title, en: title };
    const cleanTitle = title.replace(/\s+Trainer$/i, '').trim();

    if (!this._gameTitleCache) this._gameTitleCache = {};
    if (this._gameTitleCache[cleanTitle]) {
      return { cn: this._gameTitleCache[cleanTitle], en: cleanTitle };
    }

    // 1. Direct Official 1:1 Match (Local 0ms)
    const cleanLower = cleanTitle.toLowerCase();
    if (ENGLISH_TO_OFFICIAL_CN[cleanLower]) {
      this._gameTitleCache[cleanTitle] = ENGLISH_TO_OFFICIAL_CN[cleanLower];
      return { cn: ENGLISH_TO_OFFICIAL_CN[cleanLower], en: cleanTitle };
    }

    const norm = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    let bestMatch = null;
    let maxMatchLen = 0;

    for (const [en, cn] of Object.entries(ENGLISH_TO_OFFICIAL_CN)) {
      const enNorm = en.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (norm === enNorm) {
        bestMatch = cn;
        break;
      }
      if (enNorm.length >= 4 && (norm.includes(enNorm) || enNorm.includes(norm))) {
        if (enNorm.length > maxMatchLen) {
          maxMatchLen = enNorm.length;
          bestMatch = cn;
        }
      }
    }

    if (!bestMatch) {
      for (const [cn, en] of Object.entries(GAME_NAME_DICTIONARY)) {
        const enNorm = en.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (norm === enNorm) {
          bestMatch = cn;
          break;
        }
        if (enNorm.length >= 4 && (norm.includes(enNorm) || enNorm.includes(norm))) {
          if (enNorm.length > maxMatchLen) {
            maxMatchLen = enNorm.length;
            bestMatch = cn;
          }
        }
      }
    }

    if (bestMatch) {
      this._gameTitleCache[cleanTitle] = bestMatch;
      return { cn: bestMatch, en: cleanTitle };
    }

    // 2. Steam Official Store API (100% Authentic Chinese)
    try {
      const steamCn = await this._resolveSteamGameTitle(cleanTitle);
      if (steamCn && steamCn !== cleanTitle) {
        this._gameTitleCache[cleanTitle] = steamCn;
        return { cn: steamCn, en: cleanTitle };
      }
    } catch (e) {
      // Steam fallback
    }

    // 3. Online translation fallback
    try {
      const translated = await this.translateText(cleanTitle, 'en', 'zh-CN');
      if (translated && translated !== cleanTitle && /[\u4e00-\u9fa5]/.test(translated)) {
        this._gameTitleCache[cleanTitle] = translated;
        return { cn: translated, en: cleanTitle };
      }
    } catch (e) {
      // fallback
    }

    return { cn: cleanTitle, en: cleanTitle };
  }

  /**
   * Get all trainers indexed by A-Z
   */
  async getAllTrainersAZ() {
    const now = Date.now();
    // Cache for 30 minutes
    if (this.azCache && now - this.azCacheTime < 30 * 60 * 1000) {
      return this.azCache;
    }

    const client = this.getAxiosClient();
    try {
      const res = await client.get(`${BASE_URL}/all-trainers/`);
      const $ = cheerio.load(res.data);
      const alphabetMap = {};

      $('.letter-section, .az-letters-section, .entry-content').find('h2, h3, .letter-title').each((_, letterEl) => {
        const letter = $(letterEl).text().trim().toUpperCase();
        if (letter.length > 2) return;

        const list = $(letterEl).next('ul');
        if (list.length > 0) {
          const items = [];
          list.find('li a').each((_, a) => {
            const title = $(a).text().trim();
            const url = $(a).attr('href');
            if (title && url) {
              items.push({ title, url });
            }
          });
          if (items.length > 0) {
            alphabetMap[letter] = items;
          }
        }
      });

      // If standard letter-section not found, try generic list parsing
      if (Object.keys(alphabetMap).length === 0) {
        $('.entry a[href*="/trainer/"]').each((_, a) => {
          const title = $(a).text().trim();
          const url = $(a).attr('href');
          if (title && url) {
            const firstChar = title.charAt(0).toUpperCase();
            const key = (firstChar >= 'A' && firstChar <= 'Z') ? firstChar : '#';
            if (!alphabetMap[key]) alphabetMap[key] = [];
            alphabetMap[key].push({ title, url });
          }
        });
      }

      this.azCache = alphabetMap;
      this.azCacheTime = now;
      return alphabetMap;
    } catch (e) {
      console.error('Error fetching A-Z list:', e.message);
      throw new Error(`获取全量索引失败: ${e.message}`);
    }
  }

  /**
   * Get full details of a specific trainer page
   */
  async getTrainerDetails(url) {
    if (!url.startsWith('http')) {
      url = BASE_URL + (url.startsWith('/') ? '' : '/') + url;
    }

    const client = this.getAxiosClient();
    try {
      const res = await client.get(url);
      const $ = cheerio.load(res.data);

      const title = $('h1.post-title').text().trim() || $('h1').first().text().trim();
      const author = $('.post-author a').text().trim() || 'FLiNG';
      const day = $('.post-details-day').text().trim();
      const month = $('.post-details-month').text().trim();
      const year = $('.post-details-year').text().trim();
      const date = [year, month, day].filter(Boolean).join('-');

      // Official Game Cover Icon (header-X.jpg / 200x200 square game art)
      const ogImg = $('meta[property="og:image"]').attr('content') || '';
      const rawThumb = $('.post-details-thumb img').attr('src') || '';
      const entryImg = $('.entry img').first().attr('src') || '';

      let cover = '';
      if (ogImg) {
        cover = this._cleanCoverUrl(ogImg);
      } else if (rawThumb && !rawThumb.includes('gravatar.com') && !rawThumb.includes('default_avatar')) {
        cover = this._cleanCoverUrl(rawThumb);
      }

      // Background Banner (wide screenshot in details drawer)
      let banner = this._cleanCoverUrl(entryImg) || cover;
      let thumbCover = ogImg || rawThumb || cover;

      // Header summary line (e.g. "28 Options · Game Version: v1.0+ · Last Updated: 2026.08.25")
      const entryEl = $('.entry');
      const entryText = entryEl.text();
      
      let optionsCount = '';
      const optionsMatch = entryText.match(/(\d+)\s+Options/i);
      if (optionsMatch) optionsCount = optionsMatch[1] + ' Options';

      let gameVersion = '';
      const versionMatch = entryText.match(/Game Version:\s*([^\n·<]+)/i);
      if (versionMatch) gameVersion = versionMatch[1].trim();

      let lastUpdated = '';
      const updatedMatch = entryText.match(/Last Updated:\s*([^\n·<]+)/i);
      if (updatedMatch) lastUpdated = updatedMatch[1].trim();

      // Parse Cheat Options (Hotkeys and description)
      const options = [];
      const specialNotes = [];

      // Extract Special Notes if available
      entryEl.find('h6').each((_, h6) => {
        const heading = $(h6).text().trim();
        if (/special\s*notes/i.test(heading) || /notes/i.test(heading)) {
          let next = $(h6).next();
          while (next.length && !next.is('h6') && !next.hasClass('download-attachments') && !next.find('.download-attachments').length) {
            const noteText = next.text().trim();
            if (noteText && !noteText.includes('Download')) {
              specialNotes.push(noteText);
            }
            next = next.next();
          }
        }
      });

      // Look for paragraphs with hotkey format
      entryEl.find('p, li').each((_, p) => {
        const html = $(p).html() || '';
        const lines = html.split(/<br\s*\/?>/i);

        lines.forEach(line => {
          const clean$ = cheerio.load(`<div>${line}</div>`);
          
          // Extract tooltip text if any script exists
          let tip = '';
          const scriptMatch = line.match(/toolTips\s*\(\s*['"][^'"]+['"]\s*,\s*['"](.*?)['"]\s*\)/);
          if (scriptMatch) {
            tip = scriptMatch[1]
              .replace(/\\'/g, "'")
              .replace(/\\"/g, '"')
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/\\/g, '')
              .trim();
          }

          clean$('script').remove();
          clean$('.tooltipsall').remove();
          const lineText = clean$.text().trim();
          
          if (!lineText || lineText.startsWith('<') || lineText.startsWith('http') || lineText.includes('Download') || lineText.includes('Options · Game Version')) {
            return;
          }

          // Hotkey split pattern: e.g. "Num 1 – Infinite Health", "Ctrl+Num . - Set Game Speed", "Shift+F1 - ..."
          const splitMatch = lineText.match(/^([A-Za-z0-9\+\s\.\*\/\-]+?)\s*[\–\-\—\:]\s*(.+)$/);
          if (splitMatch) {
            let hotkey = splitMatch[1].trim();
            let fullDesc = splitMatch[2].trim();

            if (hotkey.toLowerCase() === 'http' || hotkey.toLowerCase() === 'https') {
              return;
            }

            // Handle edge case like "Num – – Stamina Consumption Rate"
            if (hotkey === 'Num' && fullDesc.startsWith('–')) {
              hotkey = 'Num -';
              fullDesc = fullDesc.replace(/^[\–\-\—\s]+/, '');
            }

            options.push({
              hotkey,
              desc: fullDesc,
              tip
            });
          }
        });
      });

      // Parse Standalone Versions from Download Attachments table
      const attachments = [];
      $('.da-attachments-table tbody tr, .download-attachments table tbody tr').each((idx, tr) => {
        const $tr = $(tr);
        const linkEl = $tr.find('.attachment-title a, td:nth-child(1) a');
        const rawName = linkEl.text().trim() || linkEl.attr('title') || 'Trainer.exe';
        let filename = rawName;
        if (!/\.(zip|exe|rar|7z)$/i.test(filename)) {
          filename = filename + '.exe';
        }
        let downloadUrl = linkEl.attr('href') || '';
        
        if (downloadUrl && downloadUrl.startsWith('/')) {
          downloadUrl = BASE_URL + downloadUrl;
        }

        const dateAdded = $tr.find('.attachment-date, td:nth-child(2)').text().trim();
        const fileSize = $tr.find('.attachment-size, td:nth-child(3)').text().trim();
        const downloadCount = $tr.find('.attachment-downloads, td:nth-child(4)').text().trim();

        // Extract version label from filename (e.g. "v1.0-v20251216", "v1.0 Plus 61")
        let versionLabel = '';
        const verMatch = filename.match(/v\d+[\d\.\-_]+|Plus\.\d+/i);
        if (verMatch) {
          versionLabel = verMatch[0].replace(/\./g, ' ');
        }

        if (downloadUrl) {
          attachments.push({
            id: 'att_standalone_' + idx,
            filename,
            downloadUrl,
            referer: url,
            dateAdded,
            fileSize,
            downloadCount,
            versionLabel,
            isAutoUpdating: false,
            isLatest: idx === 0
          });
        }
      });

      // Fetch Auto-Updating Version from WeMod script if present on page
      let autoUpdatingVersion = null;
      let titleId = null;

      $('script').each((_, el) => {
        const src = $(el).attr('src') || '';
        const match = src.match(/title_id=(\d+)/);
        if (match) titleId = match[1];
      });

      if (!titleId) {
        const rawMatch = res.data.match(/api\.wemod\.com\/fling\/trainer-page\.js\?title_id=(\d+)/);
        if (rawMatch) titleId = rawMatch[1];
      }

      if (titleId) {
        try {
          const autoRes = await this.getAxiosClient().get(`https://api.wemod.com/fling/trainer-page.js?title_id=${titleId}`);
          const jsonMatch = autoRes.data.match(/\(\{([\s\S]*?)\}\)\s*;?\s*$/);
          if (jsonMatch) {
            const autoData = JSON.parse('{' + jsonMatch[1] + '}');
            let dlUrl = autoData.url || '';
            if (dlUrl.startsWith('/')) {
              dlUrl = BASE_URL + dlUrl;
            }
            autoUpdatingVersion = {
              id: 'att_auto_update',
              filename: autoData.name ? autoData.name + '.exe' : 'Auto-Updating Trainer.exe',
              downloadUrl: dlUrl,
              referer: url,
              dateAdded: autoData.date || lastUpdated || '',
              fileSize: autoData.size || '132 KB',
              downloadCount: autoData.downloads ? String(autoData.downloads) : '0',
              versionLabel: 'Auto-Updating (在线自动更新版)',
              isAutoUpdating: true,
              isLatest: true
            };
          }
        } catch (autoErr) {
          console.warn('Error fetching auto-updating version:', autoErr.message);
        }
      }

      // If auto-updating version exists, place it at the front of attachments
      if (autoUpdatingVersion) {
        attachments.unshift(autoUpdatingVersion);
      }

      // Tags
      const tags = [];
      $('.post-tags a').each((_, a) => {
        const tag = $(a).text().trim();
        if (tag) tags.push(tag);
      });

      return {
        url,
        title,
        author,
        cover,
        banner,
        date: lastUpdated || date,
        optionsCount: optionsCount || (options.length ? `${options.length} Options` : '修改器'),
        gameVersion: gameVersion || '全版本支持',
        lastUpdated,
        options,
        notes: specialNotes.join('\n\n'),
        autoUpdatingVersion,
        attachments,
        tags
      };
    } catch (e) {
      console.error(`Error fetching trainer details for ${url}:`, e.message);
      throw new Error(`获取修改器详情失败: ${e.message}`);
    }
  }
}

module.exports = FlingScraper;
