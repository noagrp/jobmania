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

async function initWiki() {
    await fetchAllData();
    buildGlobalDictionary();
    buildReverseRelationships();
    renderHome(false);
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

function extractName(item) {
    return item.Name || item['Ability Name'] || item.Job || item.Material || 
           item['Passive Name'] || item.Relic || item['Ability/Switch Skill'] || item.Buff || item.Passive || "Unknown";
}

function buildGlobalDictionary() {
    Object.keys(DB).forEach(cat => {
        DB[cat].forEach((item, index) => {
            item.wikiNumber = index;
            const name = String(extractName(item)).trim();
            Dictionary[`${cat}_${name}`] = { category: cat, idx: index, name: name };
        });
    });
}

function strictLinker(commaString, allowedCategory) {
    if (!commaString) return '<span style="color:#666;">None</span>';
    return String(commaString).split(/[,-]/).map(s => s.trim()).filter(Boolean).map(item => {
        const found = Object.values(Dictionary).find(d => d.category === allowedCategory && d.name.toLowerCase() === item.toLowerCase());
        return found ? `<a class="wiki-link" onclick="renderPage('${found.category}', ${found.idx})">${item}</a>` : `<span class="list-chip">${item}</span>`;
    }).join(' ');
}

function renderPage(cat, idx) {
    const entry = DB[cat][idx];
    let html = `<h1>${extractName(entry)}</h1><div class="data-card">`;
    
    for (const [k, v] of Object.entries(entry)) {
        if (['wikiNumber', 'usedBy', 'craftedBy'].includes(k)) continue;
        
        let val = v || '<span style="color:#666;">Null</span>';
        
        // DYNAMIC LINKING LOGIC
        // We check if the key matches our known Ability/Passive headers
        const isAbilityKey = k.includes('Deck') || k.includes('Ability') || k.includes('Switch');
        const isPassiveKey = k.includes('Passive');

        if (isAbilityKey && v && v !== "Null") {
            val = strictLinker(v, 'abilities');
        } else if (isPassiveKey && v && v !== "Null") {
            val = strictLinker(v, 'passives');
        }

        html += `<div class="property-row">
                    <div class="property-key">${k}</div>
                    <div class="property-value">${val}</div>
                 </div>`;
    }
    document.getElementById('page-container').innerHTML = html + `</div>`;
}
// ... [Keep your existing renderHome, renderCategory, and toggleNav functions] ...
window.onload = initWiki;
