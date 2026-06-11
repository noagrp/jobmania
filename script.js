// === FIRE CURSOR LOGIC ===
document.addEventListener('mousemove', e => createFire(e.clientX, e.clientY, false));
document.addEventListener('mousedown', e => {
    for(let i = 0; i < 8; i++) {
        setTimeout(() => createFire(e.clientX + (Math.random()*30-15), e.clientY + (Math.random()*30-15), true), i*40);
    }
});
function createFire(x, y, isClick) {
    const p = document.createElement('div');
    p.className = 'fire-particle';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    if(isClick) {
        p.style.width = '20px';
        p.style.height = '20px';
        p.style.animationDuration = '0.8s';
    }
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 800);
}

// === RELATIONAL ENGINE ===
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
    const container = document.getElementById('page-container');
    container.innerHTML = `<div class="loading"><div class="spinner"></div>Initializing Jobmania Relational API...</div>`;

    try {
        await fetchAllData();
        buildGlobalDictionary();
        MasterSkillUniverse.init(DB.suAbilities, DB.suPassives, DB.suBuffs);
        console.log("✅ Jobmania Wiki Loaded Successfully");
        renderHome();
    } catch (err) {
        console.error("❌ Failed to load:", err);
        container.innerHTML = `<h2 style="color:red; text-align:center;">Failed to load data</h2><p style="text-align:center;">${err.message}</p>`;
    }
}

async function fetchAllData() {
    const map = {
        characters: 'jobmania_characters', jobs: 'jobmania_jobs', abilities: 'jobmania_abilities',
        crafting: 'jobmania_job_crafting', materials: 'jobmania_materials',
        passives: 'jobmania_passive_skills', relics: 'jobmania_relics', relicPassives: 'jobmania_relic_passives',
        suAbilities: 'jobmania_skill_unit_abilities', suBuffs: 'jobmania_skill_unit_buffes', suPassives: 'jobmania_skill_unit_passive_skills'
    };

    for (const [key, file] of Object.entries(map)) {
        try {
            const res = await fetch(`${API_BASE}${file}.json?t=${Date.now()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const rawData = await res.json();
            // Data Sanitization: Filter out items without a valid ID immediately
            DB[key] = rawData.filter(item => {
                const id = extractName(item);
                return id && id !== "Unknown" && id.trim() !== "";
            });
            console.log(`Loaded ${key}: ${DB[key].length} items`);
        } catch (e) {
            console.warn(`Failed to load ${file}:`, e);
            DB[key] = [];
        }
    }
}

/** UNIVERSAL SKILL ENGINE */
const MasterSkillUniverse = {
    map: {},
    init(abilities, passives, buffs) {
        [...abilities, ...passives, ...buffs].forEach(u => {
            const name = u['Ability/Switch Skill'] || u['Passive'] || u['Buff'] || u['Ability Name'];
            if (name) this.map[name.trim()] = u;
        });
    },
    get(name) { return this.map[name?.trim()] || null; },
    calculate(ability) {
        if (!ability) return "No data";
        let desc = "";

        for (let i = 1; i <= 4; i++) {
            const skillKey = i === 1 ? "Skill Unit 1" : `SkillUnit ${i}`;
            const effectKey = i === 1 ? "Column_5" : `Column_${(i*3)+2}`;
            const multKey = i === 1 ? "Multiplier" : `Multiplier_${i}`;

            const skill = ability[skillKey];
            if (!skill || skill === "" || skill === "Null") continue;

            const effect = ability[effectKey] || "";
            let mult = parseFloat(ability[multKey]) || 1;

            const unit = this.get(skill);
            let line = "";

            switch (skill) {
                case "Damage": line = `Deal <strong>${(mult*100).toFixed(0)}%</strong> ${effect || 'Raw'} damage`; break;
                case "Heal": line = `Recover <strong>${(mult*100).toFixed(0)}%</strong> ${effect || 'Raw'} HP`; break;
                case "Protect": line = `Gain <strong>${(mult*100).toFixed(0)}%</strong> ${effect} Protect`; break;
                case "Buff":
                case "InstantBoost": line = `+<strong>${(mult*5).toFixed(0)}%</strong> ${effect} Buff`; break;
                case "Debuff": line = `Apply <strong>${mult}</strong> stack(s) of ${effect} Debuff`; break;
                case "Sacrifice": line = `Self Sacrifice (${(mult*100).toFixed(0)}% HP)`; break;
                case "Reflect": line = `Reflect <strong>${(mult*100).toFixed(0)}%</strong> ${effect} damage`; break;
                default:
                    if (unit?.Description) line = unit.Description.replace(/X%/g, `${(mult*100).toFixed(0)}%`).replace(/X/g, mult);
                    else line = `${skill} ${effect} ×${mult}`;
            }
            if (line) desc += `<div style="margin:6px 0; padding-left:10px; border-left:3px solid #ff9800;">• ${line}</div>`;
        }

        const applies = [ability.Apply1, ability.Apply2, ability.Apply3, ability.Apply4].filter(Boolean).join(", ");
        if (applies) desc += `<div style="margin-top:12px; color:#aaa; font-size:0.9em;">Tags: ${applies}</div>`;
        return desc || `<small style="color:#888;">Basic ability — check Skill Unit for full details</small>`;
    }
};

function extractName(item) {
    return item.Name || item['Ability Name'] || item.Job || item.Material ||
           item['Passive Name'] || item.Relic || item['Ability/Switch Skill'] ||
           item.Buff || item.Passive || item.Column_0 || item.Concatenate || "Unknown";
}

function buildGlobalDictionary() {
    Object.keys(DB).forEach(cat => {
        DB[cat].forEach((item, index) => {
            const name = String(extractName(item)).trim();
            if (name && name !== "Unknown") Dictionary[`${cat}_${name.toLowerCase()}`] = { category: cat, idx: index, name: name };
        });
    });
}

function autoSmartLink(commaString) {
    if (!commaString || commaString === "Null" || commaString === "") return '<span style="color:#666;">Null</span>';
    return String(commaString).split(/[|,]/).map(segment => {
        return segment.trim().split('-').map(item => {
            const trimmed = item.trim();
            if (!trimmed) return "";
            let found = null;
            for (const cat in DB) {
                if (Dictionary[`${cat}_${trimmed.toLowerCase()}`]) {
                    found = Dictionary[`${cat}_${trimmed.toLowerCase()}`];
                    break;
                }
            }
            const unit = MasterSkillUniverse.get(trimmed);
            const calc = unit ? MasterSkillUniverse.calculate(unit) : "";
            return found ? `<a class="wiki-link" onclick="renderPage('${found.category}', ${found.idx})">${trimmed}</a>${calc}` : `<span class="list-chip">${trimmed}</span>`;
        }).join('<span style="color:#666;">-</span>');
    }).join(' | ');
}

function renderHome() {
    document.getElementById('page-container').innerHTML = `
        <div class="header-flex" style="border-bottom: 2px solid var(--border); padding-bottom: 20px; margin-bottom: 25px; text-align:center;">
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
                <li>Strategic deck building, build your own unique deck.</li>
                <li>RPG Turn-based combat system.</li>
                <li>Equip 3 jobs at once with powerful synergy.</li>
                <li>Combine jobs and materials to craft new jobs.</li>
                <li>Gacha system with defeated enemies.</li>
                <li>Collect special relics.</li>
            </ol>

            <div style="margin-top: 30px; padding: 15px; background: #222; border-radius: 10px; text-align: center;">
                <p>Join our discord discussion at <br>
                <a href="https://discord.gg/6U5FNFVrwb" target="_blank" style="color: var(--highlight); font-weight: bold;">https://discord.gg/6U5FNFVrwb</a></p>
            </div>

            <div style="margin-top: 30px;">
                <a href="https://play.google.com/store/apps/details?id=com.aubjective.jobmania" target="_blank" style="display: inline-block; padding: 12px 20px; background: #073042; color: #fff; text-decoration: none; border-radius: 8px;">📱 Download on Google Play</a>
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
    const entry = DB[cat]?.[idx];
    if (!entry) return;

    let html = `<h1>${extractName(entry)}</h1><div class="data-card">`;

    for (const [k, v] of Object.entries(entry)) {
        if (['wikiNumber', 'usedBy'].includes(k)) continue;

        let val = v ?? '<span style="color:#666;">Null</span>';

        const linkable = ['Deck Abilities * 5','Deck Abilities * 3','Deck Abilities * 2','Deck Ability * 1',
                          'Switch Skill','Player Ability 1','Player Ability 2','5 Abilities','3 Abilities',
                          '2 Abilities','1 Ability','Random Abilities','Passive Skill','Player Passive Skill 1',
                          'Player Passive Skill 2','Passives','Column_0','Material','Material_2','Material_3','Material_4'];

        if (linkable.includes(k)) val = autoSmartLink(v);

        html += `<div class="property-row"><div class="property-key">${k}</div><div class="property-value">${val}</div></div>`;
    }
    html += `</div>`;

    if (['abilities', 'suAbilities', 'passives'].includes(cat)) {
        html += `
        <div class="effect-summary" style="margin-top:25px; padding:20px; background:#1a1a1a; border-radius:10px; border:1px solid #444;">
            <strong style="color:#ff9800;">Effect Breakdown:</strong><br><br>
            ${MasterSkillUniverse.calculate(entry)}
        </div>`;
    }

    document.getElementById('page-container').innerHTML = html;
}

function toggleNav() { 
    document.getElementById('sidebar').classList.toggle('open'); 
}

window.onload = initWiki;
