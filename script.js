/**
 * FIRE CURSOR EFFECT ENGINE
 */
document.addEventListener('mousemove', (e) => {
    createFire(e.clientX, e.clientY, false);
});

document.addEventListener('mousedown', (e) => {
    for(let i = 0; i < 8; i++) {
        setTimeout(() => {
            createFire(e.clientX + (Math.random() * 30 - 15), e.clientY + (Math.random() * 30 - 15), true);
        }, i * 40);
    }
});

function createFire(x, y, isClick) {
    const particle = document.createElement('div');
    particle.className = 'fire-particle';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    
    if (isClick) {
        particle.style.width = '20px';
        particle.style.height = '20px';
        particle.style.animationDuration = '0.8s';
    }
    
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 800);
}

/**
 * JOBMANIA WIKI ENGINE
 */
const API_BASE = "https://noagrp.github.io/jobmania/";
const CACHE_BUSTER = "?t=" + Date.now();

const DB = {
    characters: [], jobs: [], abilities: [], crafting: [], materials: [],
    passives: [], relics: [], relicPassives: [],
    suAbilities: [], suBuffs: [], suPassives: []
};
const Dictionary = {}; 

async function initWiki() {
    try {
        await fetchAllData();
        buildGlobalDictionary();
        buildCraftingLinks();
        history.replaceState({ view: 'home' }, '', '#home');
        renderHome(false);
    } catch (error) {
        setHTML(`<h1>Critical Error</h1><div class="data-card"><p>Failed to connect to the Jobmania API: ${error.message}</p></div>`);
    }
}

async function fetchJSON(filename) {
    try {
        const response = await fetch(`${API_BASE}${filename}${CACHE_BUSTER}`);
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        console.warn(`Could not load ${filename}`);
        return [];
    }
}

async function fetchAllData() {
    const [
        chars, jobs, abilities, crafting, materials, 
        passives, relics, relicPassives, 
        suAbil, suBuff, suPass
    ] = await Promise.all([
        fetchJSON('jobmania_characters.json'), fetchJSON('jobmania_jobs.json'), fetchJSON('jobmania_abilities.json'), 
        fetchJSON('jobmania_job_crafting.json'), fetchJSON('jobmania_materials.json'),
        fetchJSON('jobmania_passive_skills.json'), fetchJSON('jobmania_relics.json'), fetchJSON('jobmania_relic_passives.json'),
        fetchJSON('jobmania_skill_unit_abilities.json'), fetchJSON('jobmania_skill_unit_buffes.json'), fetchJSON('jobmania_skill_unit_passive_skills.json')
    ]);

    DB.characters = chars; DB.jobs = jobs; DB.abilities = abilities; 
    DB.crafting = crafting; DB.materials = materials;
    DB.passives = passives; DB.relics = relics; DB.relicPassives = relicPassives;
    DB.suAbilities = suAbil; DB.suBuffs = suBuff; DB.suPassives = suPass;
}

function extractName(item) {
    // Specific priority for Relics (Title) and Relic Passives (Concatenate)
    let name = item.Title || item.Concatenate || item.Name || item['Ability Name'] || item.Job || item.Material || 
               item['Passive Skill'] || item.Passive || item['Passive Name'] ||
               item.Relic || item['Relic Name'] || item['Relic Passive'] || 
               item['Ability/Switch Skill'] || item.Buff || item.id;
    return name || "Unknown";
}

function buildGlobalDictionary() {
    Object.keys(DB).forEach(cat => {
        DB[cat].forEach((item, index) => {
            item.wikiNumber = index + 1; 
            const name = extractName(item).toString().trim();
            Dictionary[`${cat}_${index}`] = { category: cat, ref: item, originalName: name };
        });
    });
}

function buildCraftingLinks() {
    DB.crafting.forEach(recipe => {
        const targetJob = recipe.target_class;
        const reqMat = recipe.material_required;
        const srcClass = recipe.source_class;
        if (reqMat && Object.values(Dictionary).find(d => d.originalName === reqMat)) {
            const matRef = Object.values(Dictionary).find(d => d.originalName === reqMat).ref;
            if (!matRef.usedInRecipes) matRef.usedInRecipes = [];
            matRef.usedInRecipes.push(`Combines with ${srcClass} for ${targetJob}`);
        }
        if (targetJob && Object.values(Dictionary).find(d => d.originalName === targetJob)) {
            const jobRef = Object.values(Dictionary).find(d => d.originalName === targetJob).ref;
            jobRef.craftingRecipe = `Combine ${srcClass} + ${reqMat}`;
        }
    });
}

function parseTextForLinks(text) {
    if (!text || text === "") return '<span style="color:#666;">Null</span>';
    let processedText = String(text);
    Object.values(Dictionary).forEach(d => {
        if (processedText.includes(d.originalName) && d.originalName.length > 3) {
            const idx = Object.keys(Dictionary).find(key => Dictionary[key] === d).split('_')[1];
            processedText = processedText.replace(d.originalName, `<a class="wiki-link" onclick="renderPage('${d.category}', ${idx})">${d.originalName}</a>`);
        }
    });
    return processedText;
}

function renderHome(push = true) {
    if (push) history.pushState({ view: 'home' }, '', '#home');
    setHTML(`
        <div class="header-flex" style="display: flex; align-items: center; gap: 20px; border-bottom: 2px solid var(--border); padding-bottom: 20px; margin-bottom: 25px;">
            <img src="${API_BASE}jobmania_official_icon.png" alt="Jobmania Icon" style="width: 90px; height: 90px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.6); object-fit: cover;">
            <div>
                <h1 style="border: none; padding: 0; margin: 0; font-size: 34px;">Jobmania - Eternal Dungeon</h1>
                <div style="color: var(--highlight); font-weight: 800; margin-top: 6px; font-size: 14px; letter-spacing: 1px;">AUBJECTIVE TECHNOLOGY LTD.</div>
                <div style="color: #aaa; font-size: 12px; margin-top: 4px; font-weight: 600;">Contains Ads • In-app purchases</div>
            </div>
        </div>

        <div class="data-card" style="border-left: 5px solid var(--accent);">
            <p style="font-size: 16px; margin-top: 0; line-height: 1.6;">
                Pick a Hero and a job then embark on an eternal journey of dungeon descending. Acquire random abilities and jobs through the journey and build your own unique play style. How far can you go?
            </p>
            <h3 style="color: white; margin-top: 25px; border-bottom: 1px dashed var(--border); padding-bottom: 8px;">Features</h3>
            <ul style="line-height: 1.8; color: #ddd; padding-left: 20px; font-size: 15px;">
                <li><strong>Rogue lite</strong>, procedural enemies and events generation.</li>
                <li><strong>Dungeon crawler</strong>, descend into the dungeon as much as you can.</li>
                <li><strong>Strategic deck building</strong>, build your own unique deck by adding abilities into your deck via chests and defeating enemies.</li>
                <li><strong>RPG Turn-based combat system</strong>, complex but easy to play. Defeat tons of different enemies, challenging but addictive.</li>
                <li><strong>Equip 3 jobs at once</strong>, swap, and use their abilities strategically for powerful synergy.</li>
                <li><strong>Crafting:</strong> Combine jobs and materials to craft new unique jobs.</li>
                <li><strong>Gacha:</strong> Get new heroes from Gacha, enemies defeated from the last run will appear in a special Gacha pool!</li>
                <li><strong>Relics:</strong> Collect special relics to enhance your build further.</li>
                <li><strong>References:</strong> A lot of Memes, Anime and Movies references in the game!</li>
                <li><strong>Free</strong> with ads and in-app purchases, remove all ads with one purchase.</li>
                <li><strong>Portrait screen only</strong>, you can play this game with one hand.</li>
            </ul>
            <div style="margin: 30px 0 10px; display: flex; gap: 15px; flex-wrap: wrap;">
                <a href="https://play.google.com/store/apps/details?id=com.aubjective.jobmania" target="_blank" class="store-btn btn-play">📱 Google Play</a>
                <a href="https://apps.apple.com/app/jobmania-eternal-crusade/id1531238064" target="_blank" class="store-btn btn-apple">🍎 App Store</a>
                <a href="https://discord.gg/6U5FNFVrwb" target="_blank" class="store-btn" style="background: #5865F2; color: white; border: 2px solid #5865F2;">💬 Join Discord</a>
            </div>
        </div>
    `);
}

function renderCategory(cat, title, push = true) {
    if (push) history.pushState({ view: 'cat', cat, title }, '', `#cat-${cat}`);
    let html = `<h1>${title}</h1><div class="wiki-grid">`;
    DB[cat].forEach((item, idx) => {
        html += `<div class="grid-item" onclick="renderPage('${cat}', ${idx})">
            <div class="grid-item-id">ID #${item.wikiNumber}</div>
            <div class="grid-item-title">${extractName(item)}</div></div>`;
    });
    setHTML(html + `</div>`);
}

function renderPage(cat, idx, push = true) {
    const entry = DB[cat][idx];
    if (push) history.pushState({ view: 'page', cat, idx }, '', `#${cat}-${idx}`);
    let html = `<h1>ID #${entry.wikiNumber}: ${extractName(entry)}</h1><div class="data-card">`;
    
    // Mechanics categories isolation check
    const isEngineMechanic = ['suAbilities', 'suBuffs', 'suPassives'].includes(cat);

    for (const [k, v] of Object.entries(entry)) {
        if (k === 'wikiNumber' || k === 'usedInRecipes' || k === 'craftingRecipe') continue;
        
        // Display raw value if it is an Engine Mechanic, otherwise apply link parsing
        const displayValue = isEngineMechanic ? (v || '<span style="color:#666;">Null</span>') : parseTextForLinks(v);
        
        html += `<div class="property-row"><div class="property-key">${k}</div><div class="property-value">${displayValue}</div></div>`;
    }
    
    if (entry.craftingRecipe && !isEngineMechanic) html += `<h3>Crafting Recipe</h3><div class="property-row"><div class="property-key">Recipe</div><div class="property-value">${parseTextForLinks(entry.craftingRecipe)}</div></div>`;
    if (entry.usedInRecipes && !isEngineMechanic) html += `<h3>Used to Craft</h3><ul>${entry.usedInRecipes.map(r => `<li>${parseTextForLinks(r)}</li>`).join('')}</ul>`;
    
    setHTML(html + `</div>`);
}

function setHTML(h) { 
    document.getElementById('page-container').innerHTML = h; 
    document.getElementById('content').scrollTop = 0; 
}

function toggleNav() { 
    document.getElementById('sidebar').classList.toggle('open'); 
}

window.addEventListener('popstate', e => e.state?.view === 'home' ? renderHome(false) : (e.state?.view === 'cat' ? renderCategory(e.state.cat, e.state.title, false) : (e.state?.view === 'page' ? renderPage(e.state.cat, e.state.idx, false) : null)));
window.onload = initWiki;