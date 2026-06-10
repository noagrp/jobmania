// --- FIRE CURSOR LOGIC ---
document.addEventListener('mousemove', e => createFire(e.clientX, e.clientY, false));
document.addEventListener('mousedown', e => {
    for(let i=0; i<8; i++) setTimeout(() => createFire(e.clientX+(Math.random()*30-15), e.clientY+(Math.random()*30-15), true), i*40);
});
function createFire(x, y, isClick) {
    const p = document.createElement('div'); p.className = 'fire-particle';
    p.style.left = x+'px'; p.style.top = y+'px';
    if(isClick) { p.style.width='20px'; p.style.height='20px'; p.style.animationDuration='0.8s'; }
    document.body.appendChild(p); setTimeout(() => p.remove(), 800);
}

// --- RELATIONAL ENGINE ---
const API_BASE = "https://noagrp.github.io/jobmania/";
const DB = {
    characters: [], jobs: [], abilities: [], crafting: [], materials: [],
    passives: [], relics: [], relicPassives: [],
    suAbilities: [], suBuffs: [], suPassives: []
};
const Dictionary = {}; 

window.renderHome = renderHome;
window.renderCategory = renderCategory;
window.renderPage = renderPage;
window.toggleNav = toggleNav;

async function initWiki() {
    await fetchAllData();
    buildGlobalDictionary();
    // Initialize the combined Skill Universe
    MasterSkillUniverse.init(DB.suAbilities, DB.suPassives, DB.suBuffs);
    renderHome();
}

async function fetchAllData() {
    const map = {
        characters: 'jobmania_characters', jobs: 'jobmania_jobs', abilities: 'jobmania_abilities',
        crafting: 'jobmania_job_crafting', materials: 'jobmania_materials',
        passives: 'jobmania_passive_skills', relics: 'jobmania_relics', relicPassives: 'jobmania_relic_passives',
        suAbilities: 'jobmania_skill_unit_abilities', suBuffs: 'jobmania_skill_unit_buffes', suPassives: 'jobmania_skill_unit_passive_skills'
    };
    const keys = Object.keys(map);
    const results = await Promise.all(keys.map(k => fetch(`${API_BASE}${map[k]}.json?t=${Date.now()}`).then(r => r.json()).catch(() => [])));
    keys.forEach((k, i) => DB[k] = results[i]);
}

/** * UNIVERSAL SKILL ENGINE 
 */
const MasterSkillUniverse = {
    map: {},
    init(abilities, passives, buffs) {
        [...abilities, ...passives, ...buffs].forEach(u => {
            const name = u['Ability/Switch Skill'] || u['Passive'] || u['Buff'];
            if (name) this.map[name.trim()] = u;
        });
    },
    get(name) { return this.map[name.trim()]; },
    calculate(unit) {
        if (!unit || !unit.Skill) return "";
        const x = parseFloat(unit['MaxStack X'] || unit['Multiplier'] || 1);
        const effect = unit.Effect || "";
        // Formula Logic
        if (unit.Skill === "Damage") return ` (${unit.Multiplier || 'X'}% ${effect} Damage)`;
        if (unit.Skill === "InstantBoost" || unit.Skill === "Buff") return ` (${effect} +${5 * x}%)`;
        if (unit.Skill === "Debuff") return ` (${effect} Debuff)`;
        return ` (${unit.Skill})`;
    }
};

function extractName(item) {
    return item.Name || item['Ability Name'] || item.Job || item.Material || 
           item['Passive Name'] || item.Relic || item['Ability/Switch Skill'] || item.Buff || item.Passive || "Unknown";
}

function buildGlobalDictionary() {
    Object.keys(DB).forEach(cat => {
        DB[cat].forEach((item, index) => {
            const name = String(extractName(item)).trim();
            Dictionary[`${cat}_${name.toLowerCase()}`] = { category: cat, idx: index, name: name };
        });
    });
}

function strictLinker(commaString, allowedCategory) {
    if (!commaString || commaString === "" || commaString === "Null") return '<span style="color:#666;">Null</span>';
    return String(commaString).split(/[,-]/).map(s => s.trim()).filter(Boolean).map(item => {
        const key = `${allowedCategory}_${item.toLowerCase()}`;
        const found = Dictionary[key];
        // Integrate the Skill Engine math
        const unit = MasterSkillUniverse.get(item);
        const calc = unit ? MasterSkillUniverse.calculate(unit) : "";
        
        return found ? `<a class="wiki-link" onclick="renderPage('${found.category}', ${found.idx})">${item}</a>${calc}` : `<span class="list-chip">${item}</span>`;
    }).join(' ');
}

function toggleNav() { document.getElementById('sidebar').classList.toggle('open'); }

function renderHome() {
    document.getElementById('page-container').innerHTML = `
        <div class="header-flex" style="border-bottom: 2px solid var(--border); padding-bottom: 20px; margin-bottom: 25px;">
            <img src="${API_BASE}jobmania_official_icon.png" alt="Jobmania Icon" style="width: 90px; height: 90px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.6); margin-bottom: 10px;">
            <h1 style="margin: 0; font-size: 32px;">Jobmania - Eternal Dungeon</h1>
            <div style="color: var(--highlight); font-weight: 800; font-size: 14px; letter-spacing: 1px;">AUBJECTIVE TECHNOLOGY LTD.</div>
            <div style="color: #aaa; font-size: 12px; margin-top: 4px; font-weight: 600;">Contains ads • In-app purchases</div>
        </div>

        <div class="data-card">
            <p style="font-size: 16px; line-height: 1.6;">
                Pick a Hero and a job then embark on an eternal journey of dungeon descending.<br>
                Acquire random abilities and jobs through the journey and build your own unique play style.<br>
                <strong>How far can you go?</strong>
            </p>
            
            <h3 style="color: white; margin-top: 25px; border-bottom: 1px dashed var(--border); padding-bottom: 8px;">FEATURES</h3>
            <ol style="line-height: 1.8; color: #ddd; padding-left: 20px; font-size: 15px;">
                <li>Rogue lite, procedural enemies and events generation.</li>
                <li>Dungeon crawler, descend into the dungeon as much as you can.</li>
                <li>Strategic deck building, build your own unique deck by adding abilities into your deck via chests and defeating enemies.</li>
                <li>RPG Turn-based combat system, complex but easy to play. Defeat tons of different enemies, challenging but addictive.</li>
                <li>Equip 3 jobs at once, swap, and use their abilities strategically for powerful synergy.</li>
                <li>Combine jobs and materials to craft new unique jobs.</li>
                <li>Get new heroes from Gacha, enemies defeated from the last run will appear in a special Gacha pool!</li>
                <li>Collect special relics to enhance your build further.</li>
                <li>A lot of Memes, Anime and Movies references in the game!</li>
                <li>Free with ads and in-app purchases, remove all ads with one purchase.</li>
                <li>Portrait screen only, you can play this game with one hand.</li>
            </ol>

            <div style="margin-top: 30px; padding: 15px; background: #222; border-radius: 10px; text-align: center;">
                <p>Join our discord discussion at <br>
                <a href="https://discord.gg/6U5FNFVrwb" target="_blank" style="color: var(--highlight); font-weight: bold;">https://discord.gg/6U5FNFVrwb</a></p>
            </div>

            <div style="margin-top: 30px;">
                <a href="https://play.google.com/store/apps/details?id=com.aubjective.jobmania" target="_blank" class="store-btn btn-play" style="display: inline-block; padding: 12px 20px; background: #073042; color: #fff; text-decoration: none; border-radius: 8px;">📱 Download on Google Play</a>
            </div>
        </div>
    `;
}

function renderCategory(cat, title) {
    let html = `<h1>${title}</h1><div class="wiki-grid">`;
    DB[cat].forEach((item, idx) => {
        html += `<div class="grid-item" onclick="renderPage('${cat}', ${idx})">
            <div class="grid-item-title">${extractName(item)}</div></div>`;
    });
    document.getElementById('page-container').innerHTML = html + `</div>`;
}

function renderPage(cat, idx) {
    const entry = DB[cat][idx];
    if(!entry) return;
    let html = `<h1>${extractName(entry)}</h1><div class="data-card">`;
    
    for (const [k, v] of Object.entries(entry)) {
        if (k === 'wikiNumber' || k === 'usedBy') continue;
        
        let val = v || '<span style="color:#666;">Null</span>';
        
        const abilityHeaders = ['Deck Abilities * 5', 'Deck Abilities * 3', 'Deck Abilities * 2', 'Deck Ability * 1', 'Switch Skill', 'Player Ability 1', 'Player Ability 2', '5 Abilities', '3 Abilities', '2 Abilities', '1 Ability', 'Random Abilities'];
        const passiveHeaders = ['Passive Skill', 'Player Passive Skill 1', 'Player Passive Skill 2', 'Passives'];
        const jobHeaders = ['Column_0', 'One Star', 'TwoStar', 'Three Star', 'Four Star', 'Five Star'];
        const materialHeaders = ['Material', 'Material_2', 'Material_3', 'Material_4'];

        if (abilityHeaders.includes(k)) val = strictLinker(v, 'abilities');
        else if (passiveHeaders.includes(k)) val = strictLinker(v, 'passives');
        else if (jobHeaders.includes(k)) val = strictLinker(v, 'jobs');
        else if (materialHeaders.includes(k)) val = strictLinker(v, 'materials');

        html += `<div class="property-row"><div class="property-key">${k}</div><div class="property-value">${val}</div></div>`;
    }
    document.getElementById('page-container').innerHTML = html + `</div>`;
}

window.onload = initWiki;
