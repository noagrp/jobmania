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
        <h1>Jobmania - Eternal Dungeon</h1>
        <div class="data-card">
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                <img src="${API_BASE}jobmania_official_icon.png" alt="Jobmania Icon" style="width: 80px; height: 80px; border-radius: 15px;">
                <p>Pick a Hero and a job then embark on an eternal journey of dungeon descending. Acquire random abilities and jobs through the journey and build your own unique play style.</p>
            </div>
            <a href="https://play.google.com/store/apps/details?id=com.aubjective.jobmania" target="_blank" class="store-btn btn-play">📱 Download on Google Play</a>
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

        if (abilityHeaders.includes(k)) val = strictLinker(v, 'abilities');
        else if (passiveHeaders.includes(k)) val = strictLinker(v, 'passives');

        html += `<div class="property-row"><div class="property-key">${k}</div><div class="property-value">${val}</div></div>`;
    }
    document.getElementById('page-container').innerHTML = html + `</div>`;
}

window.onload = initWiki;
