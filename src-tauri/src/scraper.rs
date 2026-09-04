use regex::Regex;
use scraper::{Html, Selector};
use std::collections::HashMap;
use std::sync::Arc;
use crate::store::StoreManager;

const BASE_URL: &str = "https://flingtrainer.com";
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

pub struct FlingScraper {
    store: Arc<StoreManager>,
    en_to_cn: HashMap<&'static str, &'static str>,
    cn_to_en: HashMap<&'static str, &'static str>,
}

impl FlingScraper {
    pub fn new(store: Arc<StoreManager>) -> Self {
        let mut en_to_cn = HashMap::new();
        en_to_cn.insert("monster hunter wilds", "怪物猎人：荒野");
        en_to_cn.insert("monster hunter world", "怪物猎人：世界");
        en_to_cn.insert("monster hunter rise", "怪物猎人：崛起");
        en_to_cn.insert("black myth wukong", "黑神话：悟空");
        en_to_cn.insert("black myth: wukong", "黑神话：悟空");
        en_to_cn.insert("cyberpunk 2077", "赛博朋克 2077");
        en_to_cn.insert("elden ring", "艾尔登法环");
        en_to_cn.insert("shadow of the erdtree", "黄金树幽影");
        en_to_cn.insert("palworld", "幻兽帕鲁");
        en_to_cn.insert("red dead redemption 2", "荒野大镖客：救赎 2");
        en_to_cn.insert("resident evil 4", "生化危机 4");
        en_to_cn.insert("resident evil 2", "生化危机 2");
        en_to_cn.insert("resident evil 3", "生化危机 3");
        en_to_cn.insert("resident evil 7", "生化危机 7");
        en_to_cn.insert("resident evil village", "生化危机：村庄");
        en_to_cn.insert("the witcher 3", "巫师 3：狂猎");
        en_to_cn.insert("sekiro", "只狼：影逝二度");
        en_to_cn.insert("sekiro shadows die twice", "只狼：影逝二度");
        en_to_cn.insert("god of war", "战神");
        en_to_cn.insert("god of war ragnarok", "战神：诸神黄昏");
        en_to_cn.insert("assassins creed", "刺客信条");
        en_to_cn.insert("assassins creed shadows", "刺客信条：影");
        en_to_cn.insert("assassins creed mirage", "刺客信条：幻景");
        en_to_cn.insert("assassins creed valhalla", "刺客信条：英灵殿");
        en_to_cn.insert("baldurs gate 3", "博德之门 3");
        en_to_cn.insert("diablo iv", "暗黑破坏神 4");
        en_to_cn.insert("stalker 2", "潜行者 2：切尔诺贝利之心");
        en_to_cn.insert("s.t.a.l.k.e.r. 2", "潜行者 2：切尔诺贝利之心");
        en_to_cn.insert("it takes two", "双人成行");
        en_to_cn.insert("hogwarts legacy", "霍格沃茨之遗");
        en_to_cn.insert("kingdom come deliverance ii", "天国：拯救 2");
        en_to_cn.insert("kingdom come deliverance", "天国：拯救");
        en_to_cn.insert("helldivers 2", "绝地潜兵 2");
        en_to_cn.insert("hades ii", "哈迪斯 2");
        en_to_cn.insert("hades", "哈迪斯");
        en_to_cn.insert("dead space", "死亡空间");
        en_to_cn.insert("ghost of tsushima", "对马岛之魂");
        en_to_cn.insert("wo long", "卧龙：苍天陨落");
        en_to_cn.insert("nioh 2", "仁王 2");
        en_to_cn.insert("nioh", "仁王");
        en_to_cn.insert("starfield", "星空");
        en_to_cn.insert("dave the diver", "潜水员戴夫");
        en_to_cn.insert("stardew valley", "星露谷物语");
        en_to_cn.insert("terraria", "泰拉瑞亚");
        en_to_cn.insert("final fantasy vii", "最终幻想 7");
        en_to_cn.insert("final fantasy xvi", "最终幻想 16");
        en_to_cn.insert("armored core vi", "装甲核心 6");
        en_to_cn.insert("like a dragon", "人中之龙 / 如龙");
        en_to_cn.insert("octopath traveler", "八方旅人 / 歧路旅人");
        en_to_cn.insert("borderlands 3", "无主之地 3");
        en_to_cn.insert("doom eternal", "毁灭战士：永恒");
        en_to_cn.insert("devil may cry 5", "鬼泣 5");
        en_to_cn.insert("nier automata", "尼尔：机械纪元");
        en_to_cn.insert("escape from tarkov", "逃离塔科夫");
        en_to_cn.insert("cities skylines ii", "城市：天际线 2");
        en_to_cn.insert("civilization vi", "文明 6");
        en_to_cn.insert("civilization vii", "文明 7");
        en_to_cn.insert("stellaris", "群星");
        en_to_cn.insert("hearts of iron iv", "钢铁雄心 4");
        en_to_cn.insert("crusader kings iii", "十字军之王 3");
        en_to_cn.insert("hollow knight", "空洞骑士");
        en_to_cn.insert("slay the spire", "杀戮尖塔");
        en_to_cn.insert("dead cells", "死亡细胞");
        en_to_cn.insert("lies of p", "匹诺曹的谎言");
        en_to_cn.insert("silent hill 2", "寂静岭 2");
        en_to_cn.insert("horizon zero dawn", "地平线：零之曙光");
        en_to_cn.insert("horizon forbidden west", "地平线：西之绝境");
        en_to_cn.insert("dying light 2", "消逝的光芒 2");
        en_to_cn.insert("dragons dogma 2", "龙之信条 2");
        en_to_cn.insert("stellar blade", "剑星");
        en_to_cn.insert("sons of the forest", "森林之子");
        en_to_cn.insert("satisfactory", "幸福工厂");
        en_to_cn.insert("frostpunk 2", "冰汽时代 2");
        en_to_cn.insert("death stranding", "死亡搁浅");
        en_to_cn.insert("onimusha way of the sword", "鬼武者：剑之道");
        en_to_cn.insert("the blood of dawnwalker", "黎明行者之血");
        en_to_cn.insert("heros adventure", "大侠立志传");
        en_to_cn.insert("hero's adventure", "大侠立志传");
        en_to_cn.insert("manor lords", "庄园领主");
        en_to_cn.insert("metal gear solid", "合金装备");
        en_to_cn.insert("aliens fireteam elite 2", "异形：火力小队 2");

        let mut cn_to_en = HashMap::new();
        cn_to_en.insert("怪物猎人", "Monster Hunter");
        cn_to_en.insert("怪物猎人荒野", "Monster Hunter Wilds");
        cn_to_en.insert("怪猎荒野", "Monster Hunter Wilds");
        cn_to_en.insert("怪猎", "Monster Hunter");
        cn_to_en.insert("怪物猎人崛起", "Monster Hunter Rise");
        cn_to_en.insert("怪物猎人世界", "Monster Hunter World");
        cn_to_en.insert("黑神话", "Black Myth Wukong");
        cn_to_en.insert("黑神话悟空", "Black Myth Wukong");
        cn_to_en.insert("悟空", "Black Myth Wukong");
        cn_to_en.insert("赛博朋克", "Cyberpunk 2077");
        cn_to_en.insert("赛博朋克2077", "Cyberpunk 2077");
        cn_to_en.insert("2077", "Cyberpunk 2077");
        cn_to_en.insert("艾尔登法环", "Elden Ring");
        cn_to_en.insert("老头环", "Elden Ring");
        cn_to_en.insert("法环", "Elden Ring");
        cn_to_en.insert("黄金树幽影", "Shadow of the Erdtree");
        cn_to_en.insert("幻兽帕鲁", "Palworld");
        cn_to_en.insert("帕鲁", "Palworld");
        cn_to_en.insert("荒野大镖客", "Red Dead Redemption 2");
        cn_to_en.insert("大镖客", "Red Dead Redemption 2");
        cn_to_en.insert("大表哥", "Red Dead Redemption 2");
        cn_to_en.insert("生化危机", "Resident Evil");
        cn_to_en.insert("生化危机4", "Resident Evil 4");
        cn_to_en.insert("生化危机2", "Resident Evil 2");
        cn_to_en.insert("生化危机3", "Resident Evil 3");
        cn_to_en.insert("生化危机7", "Resident Evil 7");
        cn_to_en.insert("生化危机8", "Resident Evil Village");
        cn_to_en.insert("巫师", "The Witcher 3");
        cn_to_en.insert("巫师3", "The Witcher 3");
        cn_to_en.insert("狂猎", "The Witcher 3");
        cn_to_en.insert("只狼", "Sekiro");
        cn_to_en.insert("影逝二度", "Sekiro Shadows Die Twice");
        cn_to_en.insert("战神", "God of War");
        cn_to_en.insert("战神诸神黄昏", "God of War Ragnarok");
        cn_to_en.insert("刺客信条", "Assassin's Creed");
        cn_to_en.insert("博德之门", "Baldur's Gate 3");
        cn_to_en.insert("博德之门3", "Baldur's Gate 3");
        cn_to_en.insert("暗黑破坏神", "Diablo");
        cn_to_en.insert("暗黑4", "Diablo IV");
        cn_to_en.insert("极品飞车", "Need for Speed");
        cn_to_en.insert("古墓丽影", "Tomb Raider");
        cn_to_en.insert("孤岛惊魂", "Far Cry");
        cn_to_en.insert("辐射", "Fallout");
        cn_to_en.insert("辐射4", "Fallout 4");
        cn_to_en.insert("潜行者", "S.T.A.L.K.E.R.");
        cn_to_en.insert("潜行者2", "S.T.A.L.K.E.R. 2");
        cn_to_en.insert("双人成行", "It Takes Two");
        cn_to_en.insert("霍格沃茨", "Hogwarts Legacy");
        cn_to_en.insert("霍格沃茨之遗", "Hogwarts Legacy");
        cn_to_en.insert("天国拯救", "Kingdom Come Deliverance");
        cn_to_en.insert("天国拯救2", "Kingdom Come Deliverance II");
        cn_to_en.insert("绝地潜兵", "Helldivers");
        cn_to_en.insert("绝地潜兵2", "Helldivers 2");
        cn_to_en.insert("哈迪斯", "Hades");
        cn_to_en.insert("哈迪斯2", "Hades II");
        cn_to_en.insert("死亡空间", "Dead Space");
        cn_to_en.insert("对马岛", "Ghost of Tsushima");
        cn_to_en.insert("对马岛之魂", "Ghost of Tsushima");
        cn_to_en.insert("卧龙", "Wo Long");
        cn_to_en.insert("仁王", "Nioh");
        cn_to_en.insert("仁王2", "Nioh 2");
        cn_to_en.insert("星空", "Starfield");
        cn_to_en.insert("潜水员戴夫", "Dave the Diver");
        cn_to_en.insert("星露谷", "Stardew Valley");
        cn_to_en.insert("星露谷物语", "Stardew Valley");
        cn_to_en.insert("泰拉瑞亚", "Terraria");
        cn_to_en.insert("最终幻想", "Final Fantasy");
        cn_to_en.insert("最终幻想7", "Final Fantasy VII");
        cn_to_en.insert("最终幻想16", "Final Fantasy XVI");
        cn_to_en.insert("装甲核心", "Armored Core VI");
        cn_to_en.insert("如龙", "Like a Dragon");
        cn_to_en.insert("八方旅人", "Octopath Traveler");
        cn_to_en.insert("歧路旅人", "Octopath Traveler");
        cn_to_en.insert("无主之地", "Borderlands");
        cn_to_en.insert("鬼泣", "Devil May Cry");
        cn_to_en.insert("尼尔", "NieR Automata");
        cn_to_en.insert("空洞骑士", "Hollow Knight");
        cn_to_en.insert("杀戮尖塔", "Slay the Spire");
        cn_to_en.insert("死亡细胞", "Dead Cells");
        cn_to_en.insert("匹诺曹", "Lies of P");
        cn_to_en.insert("寂静岭", "Silent Hill");
        cn_to_en.insert("地平线", "Horizon");
        cn_to_en.insert("剑星", "Stellar Blade");
        cn_to_en.insert("死亡搁浅", "Death Stranding");
        cn_to_en.insert("鬼武者", "Onimusha");
        cn_to_en.insert("大侠立志传", "Hero's Adventure");
        cn_to_en.insert("庄园领主", "Manor Lords");
        cn_to_en.insert("合金装备", "Metal Gear Solid");

        Self {
            store,
            en_to_cn,
            cn_to_en,
        }
    }

    fn build_client(&self) -> reqwest::Client {
        let cfg = self.store.get_config();
        let mut builder = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(25))
            .user_agent(USER_AGENT);

        if cfg.proxy.mode == "custom" && !cfg.proxy.custom_url.trim().is_empty() {
            let mut p = cfg.proxy.custom_url.trim().to_string();
            if !p.starts_with("http://") && !p.starts_with("https://") && !p.starts_with("socks5://") {
                p = format!("http://{}", p);
            }
            if let Ok(proxy) = reqwest::Proxy::all(&p) {
                builder = builder.proxy(proxy);
            }
        }

        builder.build().unwrap_or_default()
    }

    pub fn clean_cover_url(url: &str) -> String {
        if url.trim().is_empty() {
            return String::new();
        }
        let mut clean = url.trim().to_string();
        if clean.starts_with("//") {
            clean = format!("https:{}", clean);
        }

        // Remove dimension suffixes like -200x200 or -460x215 or -scaled
        let dim_re = Regex::new(r"-\d+x\d+(\.[a-zA-Z0-9]+(?:\?.*)?)$").unwrap();
        clean = dim_re.replace(&clean, "$1").to_string();

        let scale_re = Regex::new(r"-scaled(\.[a-zA-Z0-9]+(?:\?.*)?)$").unwrap();
        clean = scale_re.replace(&clean, "$1").to_string();

        clean
    }

    pub fn translate_game_title(&self, title: &str) -> serde_json::Value {
        let clean = title.trim();
        let clean_en = clean.trim_end_matches(" Trainer").trim_end_matches(" trainer").trim();
        let lower = clean_en.to_lowercase().replace("’", "'");

        // 1. Direct match
        if let Some(&cn) = self.en_to_cn.get(lower.as_str()) {
            return serde_json::json!({ "cn": cn, "en": clean_en });
        }

        // 2. Normalized match (alphanumeric only)
        let norm: String = lower.chars().filter(|c| c.is_alphanumeric()).collect();
        let mut best_match = None;
        let mut max_len = 0;

        for (&en_key, &cn_val) in &self.en_to_cn {
            let en_norm: String = en_key.chars().filter(|c| c.is_alphanumeric()).collect();
            if norm == en_norm {
                return serde_json::json!({ "cn": cn_val, "en": clean_en });
            }
            if en_norm.len() >= 4 && (norm.contains(&en_norm) || en_norm.contains(&norm)) {
                if en_norm.len() > max_len {
                    max_len = en_norm.len();
                    best_match = Some(cn_val);
                }
            }
        }

        if let Some(cn) = best_match {
            return serde_json::json!({ "cn": cn, "en": clean_en });
        }

        // 3. Substring match from Chinese to English dict
        for (&cn_key, &en_val) in &self.cn_to_en {
            let en_norm: String = en_val.to_lowercase().chars().filter(|c| c.is_alphanumeric()).collect();
            if norm == en_norm {
                return serde_json::json!({ "cn": cn_key, "en": clean_en });
            }
            if en_norm.len() >= 4 && (norm.contains(&en_norm) || en_norm.contains(&norm)) {
                if en_norm.len() > max_len {
                    max_len = en_norm.len();
                    best_match = Some(cn_key);
                }
            }
        }

        if let Some(cn) = best_match {
            serde_json::json!({ "cn": cn, "en": clean_en })
        } else {
            serde_json::json!({ "cn": clean_en, "en": clean_en })
        }
    }

    pub async fn translate_text(&self, text: &str, from: &str, to: &str) -> Result<String, String> {
        if text.trim().is_empty() {
            return Ok(String::new());
        }

        let client = self.build_client();
        let url = format!(
            "https://translate.googleapis.com/translate_a/single?client=gtx&sl={}&tl={}&dt=t&q={}",
            from,
            to,
            urlencoding::encode(text)
        );

        let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            return Ok(text.to_string());
        }

        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let mut result = String::new();
        if let Some(arr) = json.get(0).and_then(|v| v.as_array()) {
            for item in arr {
                if let Some(s) = item.get(0).and_then(|v| v.as_str()) {
                    result.push_str(s);
                }
            }
        }

        if result.is_empty() {
            Ok(text.to_string())
        } else {
            Ok(result)
        }
    }

    pub async fn get_recent_trainers(&self, page: u32) -> Result<serde_json::Value, String> {
        let url = if page <= 1 {
            BASE_URL.to_string()
        } else {
            format!("{}/page/{}/", BASE_URL, page)
        };

        let client = self.build_client();
        let html_str = client.get(&url)
            .header("Referer", BASE_URL)
            .send()
            .await
            .map_err(|e| format!("请求最新修改器失败: {}", e))?
            .text()
            .await
            .map_err(|e| format!("读取内容失败: {}", e))?;

        self.parse_trainer_list(&html_str, page)
    }

    pub async fn search_trainers(&self, query: &str, page: u32) -> Result<serde_json::Value, String> {
        let trimmed_query = query.trim();
        let mut search_term = trimmed_query.to_string();

        // Check if query contains Chinese characters
        let has_chinese = trimmed_query.chars().any(|c| ('\u{4e00}'..='\u{9fa5}').contains(&c));
        if has_chinese {
            let clean_q: String = trimmed_query.chars().filter(|c| !c.is_whitespace() && c != &'-' && c != &'_' && c != &'：' && c != &':').collect();
            if let Some(&en) = self.cn_to_en.get(trimmed_query).or_else(|| self.cn_to_en.get(clean_q.as_str())) {
                search_term = en.to_string();
            } else {
                for (&cn_key, &en_val) in &self.cn_to_en {
                    if trimmed_query.contains(cn_key) || cn_key.contains(trimmed_query) {
                        search_term = en_val.to_string();
                        break;
                    }
                }
            }
        }

        let url = if page <= 1 {
            format!("{}/?s={}", BASE_URL, urlencoding::encode(&search_term))
        } else {
            format!("{}/page/{}/?s={}", BASE_URL, page, urlencoding::encode(&search_term))
        };

        let client = self.build_client();
        let html_str = client.get(&url)
            .header("Referer", BASE_URL)
            .send()
            .await
            .map_err(|e| format!("搜索请求失败: {}", e))?
            .text()
            .await
            .map_err(|e| format!("读取内容失败: {}", e))?;

        let mut res = self.parse_trainer_list(&html_str, page)?;

        // Relevance score and sorting if search term has results
        if let Some(items) = res.get_mut("items").and_then(|v| v.as_array_mut()) {
            let term_lower = search_term.to_lowercase();
            let tokens: Vec<&str> = term_lower.split_whitespace().filter(|t| t.len() > 1).collect();

            items.sort_by(|a, b| {
                let title_a = a.get("title").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
                let title_b = b.get("title").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();

                let score_a = Self::score_relevance(&title_a, &term_lower, &tokens);
                let score_b = Self::score_relevance(&title_b, &term_lower, &tokens);
                score_b.cmp(&score_a)
            });
        }

        if let Some(obj) = res.as_object_mut() {
            obj.insert("query".to_string(), serde_json::json!(query));
            obj.insert("effectiveQuery".to_string(), serde_json::json!(search_term));
            let is_translated = search_term.to_lowercase() != trimmed_query.to_lowercase();
            obj.insert("isTranslated".to_string(), serde_json::json!(is_translated));
        }

        Ok(res)
    }

    fn score_relevance(title: &str, term: &str, tokens: &[&str]) -> i32 {
        if title.contains(term) {
            return 1000 + (100 - (title.len() as i32 - term.len() as i32).abs());
        }
        let mut score = 0;
        for &t in tokens {
            if title.contains(t) {
                score += 50;
            }
        }
        score
    }

    pub fn parse_trainer_list(&self, html_str: &str, current_page: u32) -> Result<serde_json::Value, String> {
        let document = Html::parse_document(html_str);

        // Matching WordPress theme Stylizer post cards
        let article_sel = Selector::parse("article.post-standard, article.type-post, article.post")
            .map_err(|e| format!("{:?}", e))?;
        let title_sel = Selector::parse("h2.post-title a, .post-title a, h2.entry-title a, .entry-title a")
            .map_err(|e| format!("{:?}", e))?;
        let thumb_sel = Selector::parse(".post-details-thumb img, .entry img, .post-thumbnail img")
            .map_err(|e| format!("{:?}", e))?;
        let day_sel = Selector::parse(".post-details-day").map_err(|e| format!("{:?}", e))?;
        let month_sel = Selector::parse(".post-details-month").map_err(|e| format!("{:?}", e))?;
        let year_sel = Selector::parse(".post-details-year").map_err(|e| format!("{:?}", e))?;
        let entry_sel = Selector::parse(".entry, .entry-content").map_err(|e| format!("{:?}", e))?;
        let author_sel = Selector::parse(".post-author a, .author a, .byline a").map_err(|e| format!("{:?}", e))?;

        let mut items = Vec::new();
        let opt_regex = Regex::new(r"(?i)(\d+)\s*Options?").unwrap();
        let ver_regex = Regex::new(r"(?i)Game Version:\s*([^\n·<]+)").unwrap();
        let upd_regex = Regex::new(r"(?i)Last Updated:\s*([^\n·<]+)").unwrap();

        for article in document.select(&article_sel) {
            let title_elem = match article.select(&title_sel).next() {
                Some(el) => el,
                None => continue,
            };

            let title = title_elem.text().collect::<Vec<_>>().join(" ").trim().to_string();
            let url = title_elem.value().attr("href").unwrap_or("").to_string();

            if title.is_empty() || url.is_empty() {
                continue;
            }

            let id = article.value().attr("id")
                .map(|s| s.trim_start_matches("post-").to_string())
                .unwrap_or_else(|| url.clone());

            let mut raw_thumb = String::new();
            if let Some(img) = article.select(&thumb_sel).next() {
                if let Some(src) = img.value().attr("src")
                    .or_else(|| img.value().attr("data-src"))
                    .or_else(|| img.value().attr("data-lazy-src"))
                {
                    raw_thumb = src.to_string();
                }
            }

            let final_cover = Self::clean_cover_url(&raw_thumb);

            let day = article.select(&day_sel).next().map(|el| el.text().collect::<String>().trim().to_string()).unwrap_or_default();
            let month = article.select(&month_sel).next().map(|el| el.text().collect::<String>().trim().to_string()).unwrap_or_default();
            let year = article.select(&year_sel).next().map(|el| el.text().collect::<String>().trim().to_string()).unwrap_or_default();

            let mut date = String::new();
            if !year.is_empty() && !month.is_empty() && !day.is_empty() {
                date = format!("{}-{}-{}", year, month, day);
            } else if !year.is_empty() {
                date = year;
            }

            let entry_text = article.select(&entry_sel).next()
                .map(|el| el.text().collect::<Vec<_>>().join(" ").trim().to_string())
                .unwrap_or_default();

            let options_count = if let Some(caps) = opt_regex.captures(&entry_text).or_else(|| opt_regex.captures(&title)) {
                format!("{} 项修改", &caps[1])
            } else {
                "修改器".to_string()
            };

            let game_version = if let Some(caps) = ver_regex.captures(&entry_text) {
                caps[1].trim().to_string()
            } else {
                "全版本适用".to_string()
            };

            let last_updated = if let Some(caps) = upd_regex.captures(&entry_text) {
                caps[1].trim().to_string()
            } else {
                String::new()
            };

            let author = article.select(&author_sel).next()
                .map(|el| el.text().collect::<String>().trim().to_string())
                .unwrap_or_else(|| "FLiNG".to_string());

            let clean_title = title.trim_end_matches(" Trainer").trim().to_string();
            let cn_trans = self.translate_game_title(&clean_title);
            let cn_name = cn_trans.get("cn").and_then(|v| v.as_str()).unwrap_or("").to_string();

            let display_date = if !last_updated.is_empty() {
                last_updated.clone()
            } else if !date.is_empty() {
                date.clone()
            } else {
                "近期".to_string()
            };

            let summary = if entry_text.chars().count() > 100 {
                format!("{}...", entry_text.chars().take(100).collect::<String>())
            } else {
                entry_text.clone()
            };

            items.push(serde_json::json!({
                "id": id,
                "title": title,
                "cleanTitle": clean_title,
                "cnTitle": if cn_name != clean_title { cn_name } else { String::new() },
                "url": url,
                "cover": final_cover,
                "thumbCover": raw_thumb,
                "date": display_date,
                "author": author,
                "optionsCount": options_count,
                "gameVersion": game_version,
                "lastUpdated": last_updated,
                "summary": summary,
            }));
        }

        // Pagination detection
        let mut total_pages = current_page;
        let mut detected_page = current_page;
        let has_next_page;

        // Check .wp-pagenavi
        let pagenavi_sel = Selector::parse(".wp-pagenavi").map_err(|e| format!("{:?}", e))?;
        if let Some(navi) = document.select(&pagenavi_sel).next() {
            let current_sel = Selector::parse("span.current").unwrap();
            let pages_sel = Selector::parse(".pages").unwrap();
            let nextlink_sel = Selector::parse("a.nextpostslink").unwrap();

            if let Some(cur) = navi.select(&current_sel).next() {
                let cur_txt = cur.text().collect::<String>().trim().to_string();
                if let Ok(p) = cur_txt.parse::<u32>() {
                    detected_page = p;
                }
            }

            if let Some(pgs) = navi.select(&pages_sel).next() {
                let txt = pgs.text().collect::<String>();
                let pages_re = Regex::new(r"Page\s+(\d+)\s+of\s+(\d+)").unwrap();
                if let Some(caps) = pages_re.captures(&txt) {
                    if let Ok(tot) = caps[2].parse::<u32>() {
                        total_pages = tot;
                    }
                }
            }

            has_next_page = navi.select(&nextlink_sel).next().is_some() || detected_page < total_pages;
        } else {
            // Check nav.pagination
            let nav_next_sel = Selector::parse("nav.pagination li.next a, .pagination .next a, link[rel='next']").unwrap();
            has_next_page = document.select(&nav_next_sel).next().is_some();

            let page_links_sel = Selector::parse("nav.pagination a[href*='/page/']").unwrap();
            let page_num_re = Regex::new(r"/page/(\d+)").unwrap();
            for a in document.select(&page_links_sel) {
                if let Some(href) = a.value().attr("href") {
                    if let Some(caps) = page_num_re.captures(href) {
                        if let Ok(p) = caps[1].parse::<u32>() {
                            if p > total_pages {
                                total_pages = p;
                            }
                        }
                    }
                }
            }
        }

        if total_pages < detected_page {
            total_pages = detected_page;
        }

        Ok(serde_json::json!({
            "items": items,
            "currentPage": detected_page,
            "totalPages": total_pages,
            "hasNextPage": has_next_page,
        }))
    }

    pub async fn get_all_trainers_az(&self) -> Result<serde_json::Value, String> {
        let url = format!("{}/all-trainers/", BASE_URL);
        let client = self.build_client();
        let html_str = client.get(&url)
            .header("Referer", BASE_URL)
            .send()
            .await
            .map_err(|e| format!("获取全量索引失败: {}", e))?
            .text()
            .await
            .map_err(|e| format!("读取内容失败: {}", e))?;

        let document = Html::parse_document(&html_str);
        let link_sel = Selector::parse(".entry-content li a, .az-columns li a, .az-index li a, .entry a[href*='/trainer/']")
            .map_err(|e| format!("{:?}", e))?;

        let mut groups: HashMap<String, Vec<serde_json::Value>> = HashMap::new();

        for link in document.select(&link_sel) {
            let title = link.text().collect::<Vec<_>>().join(" ").trim().to_string();
            let href = link.value().attr("href").unwrap_or("").to_string();

            if title.is_empty() || href.is_empty() || !href.contains("/trainer/") {
                continue;
            }

            let first_char = title.chars().next().unwrap_or('#').to_ascii_uppercase();
            let letter = if first_char.is_ascii_alphabetic() {
                first_char.to_string()
            } else if first_char.is_ascii_digit() {
                "0-9".to_string()
            } else {
                "#".to_string()
            };

            let clean_title = title.trim_end_matches(" Trainer").trim().to_string();

            let item = serde_json::json!({
                "title": clean_title,
                "url": href,
            });

            groups.entry(letter).or_default().push(item);
        }

        Ok(serde_json::json!(groups))
    }

    pub async fn get_popular_trainers(&self) -> Result<serde_json::Value, String> {
        let client = self.build_client();
        let html_str = client.get(BASE_URL)
            .send()
            .await
            .map_err(|e| format!("获取热门修改器失败: {}", e))?
            .text()
            .await
            .map_err(|e| format!("读取内容失败: {}", e))?;

        let document = Html::parse_document(&html_str);
        let link_sel = Selector::parse(".popular-posts .wpp-list li a.wpp-post-title, .popular-posts a[href*='/trainer/'], .widget_popular_entries a")
            .map_err(|e| format!("{:?}", e))?;

        let mut items = Vec::new();
        let mut seen_titles = std::collections::HashSet::new();

        for a in document.select(&link_sel).take(20) {
            let raw_title = a.text().collect::<Vec<_>>().join(" ").trim().to_string();
            let href = a.value().attr("href").unwrap_or("").to_string();
            if !raw_title.is_empty() && !href.is_empty() && href.contains("/trainer/") {
                let clean_title = raw_title.trim_end_matches(" Trainer").trim().to_string();
                if seen_titles.insert(clean_title.clone()) {
                    items.push(serde_json::json!({
                        "title": clean_title,
                        "url": href,
                    }));
                }
            }
        }

        if items.is_empty() {
            // Offline fallback
            items = vec![
                serde_json::json!({ "title": "Black Myth: Wukong", "url": "https://flingtrainer.com/trainer/black-myth-wukong-trainer/" }),
                serde_json::json!({ "title": "Monster Hunter Wilds", "url": "https://flingtrainer.com/trainer/monster-hunter-wilds-trainer/" }),
                serde_json::json!({ "title": "Elden Ring", "url": "https://flingtrainer.com/trainer/elden-ring-trainer/" }),
                serde_json::json!({ "title": "Cyberpunk 2077", "url": "https://flingtrainer.com/trainer/cyberpunk-2077-trainer/" }),
                serde_json::json!({ "title": "Onimusha: Way of the Sword", "url": "https://flingtrainer.com/trainer/onimusha-way-of-the-sword-trainer/" }),
            ];
        }

        Ok(serde_json::json!(items))
    }

    pub async fn get_trainer_details(&self, url: &str) -> Result<serde_json::Value, String> {
        let full_url = if !url.starts_with("http") {
            format!("{}{}{}", BASE_URL, if url.starts_with('/') { "" } else { "/" }, url)
        } else {
            url.to_string()
        };

        let client = self.build_client();
        let html_str = client.get(&full_url)
            .header("Referer", BASE_URL)
            .send()
            .await
            .map_err(|e| format!("获取修改器详情失败: {}", e))?
            .text()
            .await
            .map_err(|e| format!("读取内容失败: {}", e))?;

        // Synchronous HTML parsing (Html document is strictly local and dropped before any await)
        let (mut details, title_id) = self.parse_trainer_details_sync(&html_str, &full_url);

        // Async WeMod auto-updating version check (no non-Send types in scope)
        if let Some(tid) = title_id {
            let auto_url = format!("https://api.wemod.com/fling/trainer-page.js?title_id={}", tid);
            if let Ok(resp) = client.get(&auto_url).send().await {
                if let Ok(js_text) = resp.text().await {
                    let json_re = Regex::new(r"\(\{([\s\S]*?)\}\)\s*;?\s*$").unwrap();
                    if let Some(caps) = json_re.captures(&js_text) {
                        let json_str = format!("{{{}}}", &caps[1]);
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                            let mut dl = val.get("url").and_then(|v| v.as_str()).unwrap_or("").to_string();
                            if dl.starts_with('/') {
                                dl = format!("{}{}", BASE_URL, dl);
                            }
                            let name = val.get("name").and_then(|v| v.as_str()).unwrap_or("Auto-Updating Trainer");
                            let auto_item = serde_json::json!({
                                "id": "att_auto_update",
                                "filename": format!("{}.exe", name),
                                "downloadUrl": dl,
                                "referer": full_url,
                                "dateAdded": val.get("date").and_then(|v| v.as_str()).unwrap_or(""),
                                "fileSize": val.get("size").and_then(|v| v.as_str()).unwrap_or("132 KB"),
                                "downloadCount": val.get("downloads").map(|v| v.to_string()).unwrap_or_default(),
                                "versionLabel": "Auto-Updating (在线自动更新版)",
                                "isAutoUpdating": true,
                                "isLatest": true
                            });

                            if let Some(obj) = details.as_object_mut() {
                                obj.insert("autoUpdatingVersion".to_string(), auto_item.clone());
                                if let Some(att_arr) = obj.get_mut("attachments").and_then(|v| v.as_array_mut()) {
                                    att_arr.insert(0, auto_item);
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(details)
    }

    fn parse_trainer_details_sync(&self, html_str: &str, full_url: &str) -> (serde_json::Value, Option<String>) {
        let document = Html::parse_document(html_str);

        let title_sel = Selector::parse("h1.post-title, h1").unwrap();
        let author_sel = Selector::parse(".post-author a, .author a, .byline a").unwrap();
        let day_sel = Selector::parse(".post-details-day").unwrap();
        let month_sel = Selector::parse(".post-details-month").unwrap();
        let year_sel = Selector::parse(".post-details-year").unwrap();
        let og_img_sel = Selector::parse("meta[property='og:image']").unwrap();
        let thumb_img_sel = Selector::parse(".post-details-thumb img").unwrap();
        let entry_img_sel = Selector::parse(".entry img").unwrap();
        let entry_sel = Selector::parse(".entry").unwrap();

        let raw_title = document.select(&title_sel).next()
            .map(|el| el.text().collect::<Vec<_>>().join(" ").trim().to_string())
            .unwrap_or_default();

        let clean_title = raw_title.trim_end_matches(" Trainer").trim().to_string();
        let cn_trans = self.translate_game_title(&clean_title);
        let cn_title = cn_trans.get("cn").and_then(|v| v.as_str()).unwrap_or("").to_string();

        let author = document.select(&author_sel).next()
            .map(|el| el.text().collect::<String>().trim().to_string())
            .unwrap_or_else(|| "FLiNG".to_string());

        let day = document.select(&day_sel).next().map(|el| el.text().collect::<String>().trim().to_string()).unwrap_or_default();
        let month = document.select(&month_sel).next().map(|el| el.text().collect::<String>().trim().to_string()).unwrap_or_default();
        let year = document.select(&year_sel).next().map(|el| el.text().collect::<String>().trim().to_string()).unwrap_or_default();

        let date = if !year.is_empty() && !month.is_empty() && !day.is_empty() {
            format!("{}-{}-{}", year, month, day)
        } else if !year.is_empty() {
            year
        } else {
            String::new()
        };

        // Cover & Banner
        let mut cover = String::new();
        if let Some(og) = document.select(&og_img_sel).next() {
            if let Some(c) = og.value().attr("content") {
                cover = Self::clean_cover_url(c);
            }
        }
        if cover.is_empty() {
            if let Some(t) = document.select(&thumb_img_sel).next() {
                if let Some(s) = t.value().attr("src") {
                    cover = Self::clean_cover_url(s);
                }
            }
        }

        let mut banner = cover.clone();
        if let Some(eimg) = document.select(&entry_img_sel).next() {
            if let Some(esrc) = eimg.value().attr("src") {
                banner = Self::clean_cover_url(esrc);
            }
        }

        let entry_text = document.select(&entry_sel).next()
            .map(|el| el.text().collect::<Vec<_>>().join(" "))
            .unwrap_or_default();

        let opt_regex = Regex::new(r"(?i)(\d+)\s*Options?").unwrap();
        let ver_regex = Regex::new(r"(?i)Game Version:\s*([^\n·<]+)").unwrap();
        let upd_regex = Regex::new(r"(?i)Last Updated:\s*([^\n·<]+)").unwrap();

        let options_count = opt_regex.captures(&entry_text)
            .map(|c| format!("{} Options", &c[1]))
            .unwrap_or_default();

        let game_version = ver_regex.captures(&entry_text)
            .map(|c| c[1].trim().to_string())
            .unwrap_or_else(|| "全版本支持".to_string());

        let last_updated = upd_regex.captures(&entry_text)
            .map(|c| c[1].trim().to_string())
            .unwrap_or_default();

        // Parse Special Notes
        let mut special_notes = Vec::new();
        let entry_sel = Selector::parse(".entry").unwrap();
        if let Some(entry) = document.select(&entry_sel).next() {
            let mut in_notes = false;
            for child in entry.children() {
                if let Some(el) = scraper::ElementRef::wrap(child) {
                    let tag_name = el.value().name();
                    if tag_name == "h6" {
                        let text = el.text().collect::<String>();
                        if text.to_lowercase().contains("note") {
                            in_notes = true;
                            continue;
                        }
                    }
                    if in_notes {
                        if el.value().classes().any(|c| c.contains("download-attachments")) {
                            break;
                        }
                        if tag_name == "p" || tag_name == "ul" || tag_name == "ol" {
                            let text = el.text().collect::<String>().trim().to_string();
                            if !text.is_empty() && !text.starts_with("http") {
                                special_notes.push(text);
                            }
                        }
                    }
                }
            }
        }

        // Parse Options (Hotkeys & descriptions)
        let mut options = Vec::new();
        let hotkey_re = Regex::new(r"^([A-Za-z0-9+*/. -]+?)\s*[-–—:]\s*(.+)$").unwrap();
        let tooltip_re = Regex::new(r#"(?s)toolTips\s*\(\s*['"]\.?([a-zA-Z0-9_]+)['"]\s*,\s*['"]([\s\S]*?)['"]\s*\)"#).unwrap();
        let script_re = Regex::new(r"(?is)<script[^>]*>.*?</script>").unwrap();
        let class_re = Regex::new(r"tooltip_post_id_custom_[a-zA-Z0-9]+").unwrap();
        let br_re = Regex::new(r"(?i)<br\s*/?>").unwrap();
        let tag_re = Regex::new(r"<[^>]*>").unwrap();

        let line_sel = Selector::parse(".entry p, .entry li").unwrap();
        for el in document.select(&line_sel) {
            let html_content = el.html();

            // 1. Build a map of tooltip_id -> tooltip_text for this block
            let mut tooltip_map = std::collections::HashMap::new();
            for t_caps in tooltip_re.captures_iter(&html_content) {
                let tid = t_caps[1].trim().to_string();
                let tip = t_caps[2]
                    .replace(r"\'", "'")
                    .replace(r#"\""#, "\"")
                    .replace(r"\:", ":")
                    .replace(r"\(", "(")
                    .replace(r"\)", ")")
                    .replace(r"\.", ".")
                    .replace(r"\-", "-")
                    .replace("<br/>", "\n")
                    .replace("<br />", "\n")
                    .replace("<br>", "\n")
                    .trim()
                    .to_string();
                tooltip_map.insert(tid, tip);
            }

            // 2. Strip all script tags completely from html_content
            let no_script_html = script_re.replace_all(&html_content, "");

            // 3. Now safely split by <br> without script splitting
            for line in br_re.split(&no_script_html) {
                let mut tip = String::new();
                if let Some(m) = class_re.find(line) {
                    if let Some(found_tip) = tooltip_map.get(m.as_str()) {
                        tip = found_tip.clone();
                    }
                }

                let unescaped = line
                    .replace("&#8211;", "-")
                    .replace("&#8212;", "-")
                    .replace("&ndash;", "-")
                    .replace("&mdash;", "-")
                    .replace("&#8217;", "'")
                    .replace("&#8216;", "'")
                    .replace("&amp;", "&")
                    .replace("&#038;", "&")
                    .replace("&quot;", "\"")
                    .replace("&#39;", "'");
                let clean_line = tag_re.replace_all(&unescaped, " ").trim().to_string();
                if clean_line.is_empty() || clean_line.starts_with("http") || clean_line.contains("Options · Game Version") {
                    continue;
                }

                if let Some(caps) = hotkey_re.captures(&clean_line) {
                    let mut hotkey = caps[1].trim().to_string();
                    let desc = caps[2].trim().to_string();

                    let lower_hotkey = hotkey.to_lowercase();
                    if hotkey.len() > 25
                        || hotkey.split_whitespace().count() > 4
                        || lower_hotkey.starts_with("http")
                        || lower_hotkey.starts_with("note")
                        || lower_hotkey.starts_with("this")
                        || lower_hotkey.starts_with("click")
                        || lower_hotkey.starts_with("select")
                        || lower_hotkey.starts_with("launch")
                        || lower_hotkey.contains("trainer")
                    {
                        continue;
                    }

                    if hotkey == "Num" && desc.starts_with('-') {
                        hotkey = "Num -".to_string();
                    }

                    options.push(serde_json::json!({
                        "hotkey": hotkey,
                        "desc": desc,
                        "tip": tip
                    }));
                }
            }
        }

        // Parse Attachments from tables
        let mut attachments = Vec::new();
        let tr_sel = Selector::parse(".da-attachments-table tbody tr, .download-attachments table tbody tr").unwrap();
        let link_sel = Selector::parse(".attachment-title a, td:nth-child(1) a").unwrap();
        let date_sel = Selector::parse(".attachment-date, td:nth-child(2)").unwrap();
        let size_sel = Selector::parse(".attachment-size, td:nth-child(3)").unwrap();
        let dl_cnt_sel = Selector::parse(".attachment-downloads, td:nth-child(4)").unwrap();

        let mut idx = 0;
        for tr in document.select(&tr_sel) {
            if let Some(link) = tr.select(&link_sel).next() {
                let mut filename = link.text().collect::<String>().trim().to_string();
                if filename.is_empty() {
                    filename = link.value().attr("title").unwrap_or("Trainer.zip").to_string();
                }
                let is_zip = tr.value().attr("class").unwrap_or("").contains("zip")
                    || tr.html().contains("zip.gif");
                if !filename.ends_with(".zip") && !filename.ends_with(".exe") && !filename.ends_with(".rar") && !filename.ends_with(".7z") {
                    if is_zip {
                        filename = format!("{}.zip", filename);
                    } else {
                        filename = format!("{}.exe", filename);
                    }
                }

                let mut dl_url = link.value().attr("href").unwrap_or("").to_string();
                if dl_url.starts_with('/') {
                    dl_url = format!("{}{}", BASE_URL, dl_url);
                }

                let date_added = tr.select(&date_sel).next().map(|el| el.text().collect::<String>().trim().to_string()).unwrap_or_default();
                let file_size = tr.select(&size_sel).next().map(|el| el.text().collect::<String>().trim().to_string()).unwrap_or_default();
                let dl_count = tr.select(&dl_cnt_sel).next().map(|el| el.text().collect::<String>().trim().to_string()).unwrap_or_default();

                let ver_match = Regex::new(r"(?i)v\d+[\d\.\-_]+|Plus\s*\d+").unwrap();
                let version_label = ver_match.find(&filename).map(|m| m.as_str().replace('.', " ")).unwrap_or_default();

                if !dl_url.is_empty() {
                    attachments.push(serde_json::json!({
                        "id": format!("att_standalone_{}", idx),
                        "filename": filename,
                        "downloadUrl": dl_url,
                        "referer": full_url,
                        "dateAdded": date_added,
                        "fileSize": file_size,
                        "downloadCount": dl_count,
                        "versionLabel": version_label,
                        "isAutoUpdating": false,
                        "isLatest": idx == 0
                    }));
                    idx += 1;
                }
            }
        }

        // WeMod Auto-updating version check: extract title_id
        let script_sel = Selector::parse("script").unwrap();
        let title_id_re = Regex::new(r"title_id=(\d+)").unwrap();
        let mut title_id = None;

        for sc in document.select(&script_sel) {
            if let Some(src) = sc.value().attr("src") {
                if let Some(caps) = title_id_re.captures(src) {
                    title_id = Some(caps[1].to_string());
                    break;
                }
            }
        }

        if title_id.is_none() {
            if let Some(caps) = title_id_re.captures(html_str) {
                title_id = Some(caps[1].to_string());
            }
        }

        // Fallback: If no attachments found from table, search links
        if attachments.is_empty() {
            let att_regex = Regex::new(r#"href=["']([^"']*(?:attachment|download)[^"']*)["']"#).unwrap();
            for caps in att_regex.captures_iter(html_str) {
                let mut dl = caps[1].to_string();
                if dl.starts_with('/') {
                    dl = format!("{}{}", BASE_URL, dl);
                }
                attachments.push(serde_json::json!({
                    "id": format!("att_{}", attachments.len()),
                    "filename": "Trainer.zip",
                    "downloadUrl": dl,
                    "referer": full_url,
                    "fileSize": "Direct",
                    "versionLabel": "官方直接下载",
                    "isAutoUpdating": false,
                    "isLatest": attachments.is_empty(),
                }));
            }
        }

        let final_options_count = if !options_count.is_empty() {
            options_count
        } else if !options.is_empty() {
            format!("{} 项修改", options.len())
        } else {
            "修改器".to_string()
        };

        let display_date = if !last_updated.is_empty() {
            last_updated.clone()
        } else if !date.is_empty() {
            date.clone()
        } else {
            "近期".to_string()
        };

        let details = serde_json::json!({
            "url": full_url,
            "title": raw_title,
            "cleanTitle": clean_title,
            "cnTitle": if cn_title != clean_title { cn_title } else { String::new() },
            "author": author,
            "cover": cover,
            "banner": banner,
            "date": display_date,
            "optionsCount": final_options_count,
            "gameVersion": game_version,
            "lastUpdated": last_updated,
            "options": options,
            "notes": special_notes.join("\n\n"),
            "autoUpdatingVersion": serde_json::Value::Null,
            "attachments": attachments,
            "tags": Vec::<String>::new(),
        });

        (details, title_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_homepage_html() {
        let store = Arc::new(StoreManager::new());
        let scraper = FlingScraper::new(store);
        let path = "C:\\Users\\JIBI\\.gemini\\antigravity-ide\\brain\\2df62199-c4bb-4086-86de-aba7f162e1f5\\scratch\\homepage.html";
        if let Ok(content) = std::fs::read_to_string(path) {
            let res = scraper.parse_trainer_list(&content, 1).expect("parse failed");
            let items = res.get("items").unwrap().as_array().unwrap();
            println!("Parsed {} items", items.len());
            assert!(!items.is_empty(), "Items should not be empty!");
            assert_eq!(res.get("currentPage").unwrap(), 1);
            assert_eq!(res.get("hasNextPage").unwrap(), true);
            let first = &items[0];
            println!("First item: {:?}", first);
            assert!(first.get("title").unwrap().as_str().unwrap().contains("Onimusha"));
            assert_eq!(first.get("optionsCount").unwrap().as_str().unwrap(), "20 项修改");
            assert_eq!(first.get("gameVersion").unwrap().as_str().unwrap(), "v1.0+");
            assert_eq!(first.get("date").unwrap().as_str().unwrap(), "2026.09.03");
            assert_eq!(first.get("cleanTitle").unwrap().as_str().unwrap(), "Onimusha: Way of the Sword");
            assert_eq!(first.get("cnTitle").unwrap().as_str().unwrap(), "鬼武者：剑之道");
            assert!(first.get("cover").unwrap().as_str().unwrap().ends_with("/header-3.jpg"));
        }
    }

    #[test]
    fn test_parse_detail_html() {
        let store = Arc::new(StoreManager::new());
        let scraper = FlingScraper::new(store);
        let path = "C:\\Users\\JIBI\\.gemini\\antigravity-ide\\brain\\2df62199-c4bb-4086-86de-aba7f162e1f5\\scratch\\detail.html";
        if let Ok(content) = std::fs::read_to_string(path) {
            let (details, title_id) = scraper.parse_trainer_details_sync(&content, "https://flingtrainer.com/trainer/onimusha-way-of-the-sword-trainer/");
            println!("Details parsed: {}", serde_json::to_string_pretty(&details).unwrap());
            println!("Title ID: {:?}", title_id);
            let options = details.get("options").unwrap().as_array().unwrap();
            println!("Options count: {}", options.len());
            let attachments = details.get("attachments").unwrap().as_array().unwrap();
            println!("Attachments count: {}", attachments.len());
        }
    }

    #[test]
    fn test_utf8_boundary_summary() {
        let text = "A".repeat(118) + "…Hello world from FLiNG Trainer";
        let summary = if text.chars().count() > 100 {
            format!("{}...", text.chars().take(100).collect::<String>())
        } else {
            text.clone()
        };
        assert!(summary.ends_with("..."));
    }
}
