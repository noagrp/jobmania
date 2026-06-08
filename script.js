// FIRE CURSOR
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

// RELATIONAL DATABASE ENGINE
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
        buildReverseRelationships(); // THE NEW ENGINE
        history.replaceState({ view: 'home' }, '', '#home');
        renderHome(false);
    } catch (error) {
        setHTML(`<h1>Critical Error</h1><div class="data-card"><p>Failed to connect to the API: ${error.message}</p></div>`);
    }
}

async function fetchJSON(filename) {
    try {
        const response = await fetch(`${API_BASE}${filename}${CACHE_BUSTER}`);
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        return [];
    }
}

async function fetchAllData() {
    const [
        chars, jobs, abilities, crafting, materials, passives, relics, relicPassives, suAbil, suBuff, suPass
    ] = await Promise.all([
        fetchJSON('jobmania_characters.json'), fetchJSON('jobmania_jobs.json'), fetchJSON('jobmania_abilities.json'), 
        fetchJSON('jobmania_job_crafting.json'), fetchJSON('jobmania_materials.json'),
        fetchJSON('jobmania_passive_skills.json'), fetchJSON('jobmania_relics.json'), fetchJSON('jobmania_relic_passives.json'),
        fetchJSON('jobmania_skill_unit_abilities.json'), fetchJSON('jobmania_skill_unit_buffes.json'), fetchJSON('jobmania_skill_unit_passive_skills.json')
    ]);

    DB.characters = chars; DB.jobs = jobs; DB.abilities = abilities; DB.crafting = crafting; DB.materials = materials;
    DB.passives = passives; DB.relics = relics; DB.relicPassives = relicPassives;
    DB.suAbilities = suAbil; DB.suBuffs = suBuff; DB.suPassives = suPass;
}

function extractName(item) {
    return item.Title || item.Concatenate || item.Name || item['Ability Name'] || item.Job || item.Material || 
           item['Passive Skill'] || item.Passive || item['Passive Name'] || item.Relic || item['Relic Name'] || 
           item['Relic Passive'] || item['Ability/Switch Skill'] || item.Buff || item.ID || "Unknown";
}

function buildGlobalDictionary() {
    Object.keys(DB).forEach(cat => {
        DB[cat].forEach((item, index) => {
            item.wikiNumber = index + 1; 
            const name = String(extractName(item)).trim();
            const uniqueKey = item.ID ? String(item.ID).trim() : name; 
            
            // We store the exact category so we can do strict targeted linking
            Dictionary[`${cat}_${uniqueKey}`] = { category: cat, idx: index, ref: item, originalName: name, id: uniqueKey };
        });
    });
}

function buildReverseRelationships() {
    // Reset usedBy arrays just in case
    Object.values(Dictionary).forEach(d => { d.ref.usedBy = []; d.ref.craftedBy = []; });

    // Helper: Find an item STRICTLY within a specific category
    function findTarget(identifier, targetCat) {
        identifier = String(identifier).trim();
        return Object.values(Dictionary).find(d => d.category === targetCat && (d.id === identifier || d.originalName === identifier));
    }

    // 1. Scan Jobs for what Abilities and Passives they use
    DB.jobs.forEach(job => {
        const jobName = extractName(job);
        const jobIdx = job.wikiNumber - 1;

        // Abilities used by this Job
        ['5 Abilities', '3 Abilities', '2 Abilities', '1 Ability', 'Switch Skill'].forEach(col => {
            if(job[col]) {
                job[col].split(',').map(s=>s.trim()).forEach(ab => {
                    let target = findTarget(ab, 'abilities');
                    if(target) target.ref.usedBy.push({ name: jobName, cat: 'jobs', idx: jobIdx, type: 'Job' });
                });
            }
        });

        // Passives used by this Job
        if(job['Passive Skill']) {
            job['Passive Skill'].split(',').map(s=>s.trim()).forEach(pa => {
                let target = findTarget(pa, 'passives');
                if(target) target.ref.usedBy.push({ name: jobName, cat: 'jobs', idx: jobIdx, type: 'Job' });
            });
        }
    });

    // 2. Scan Crafting Recipes to cross-link Materials and Jobs
    DB.crafting.forEach(recipe => {
        const targetJobId = recipe.target_class_id || recipe.target_class;
        const reqMatId = recipe.material_required_id || recipe.material_required;
        const srcClassId = recipe.source_class_id || recipe.source_class;
        
        let targetJob = findTarget(targetJobId, 'jobs');
        let reqMat = findTarget(reqMatId, 'materials');
        let srcClass = findTarget(srcClassId, 'jobs');

        if(targetJob && reqMat && srcClass) {
            reqMat.ref.usedBy.push({ name: targetJob.originalName, cat: 'jobs', idx: targetJob.idx, type: 'Crafts Job' });
            targetJob.ref.craftedBy.push(`Combine [ ${srcClass.originalName} ] + [ ${reqMat.originalName} ]`);
        }
    });
}

// STRICT LINKER: Only looks in the allowed category! No accidental cross-linking.
function strictLinker(commaString, allowedCategory) {
    if (!commaString || commaString === "") return '<span style="color:#666;">Null</span>';
    
    let items = String(commaString).split(',').map(s => s.trim()).filter(s => s !== "");
    let htmlResult = "";

    items.forEach(item => {
        let target = Object.values(Dictionary).find(d => d.category === allowedCategory && (d.id === item || d.originalName === item));
        
        if (target) {
            htmlResult += `<a class="wiki-link" onclick="renderPage('${target.category}', ${target.idx})">${target.originalName}</a> `;
        } else {
            htmlResult += `<span class="list-chip" style="background:#444;">${item}</span> `;
        }
    });

    return htmlResult;
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
            <p style="font-size: 16px; margin-top: 0; line-height: 1.6;">Database Loaded. Select a category from the sidebar to begin.</p>
        </div>
    `);
}

function renderCategory(cat, title, push = true) {
    if (push) history.pushState({ view: 'cat', cat, title }, '', `#cat-${cat}`);
    let html = `<h1>${title}</h1><div class="wiki-grid">`;
    DB[cat].forEach((item, idx) => {
        html += `<div class="grid-item" onclick="renderPage('${cat}', ${idx})">
            <div class="grid-item-id">ID: ${item.ID || item.wikiNumber}</div>
            <div class="grid-item-title">${extractName(item)}</div></div>`;
    });
    setHTML(html + `</div>`);
}

function renderPage(cat, idx, push = true) {
    const entry = DB[cat][idx];
    if (push) history.pushState({ view: 'page', cat, idx }, '', `#${cat}-${idx}`);
    let html = `<h1>ID ${entry.ID || '#' + entry.wikiNumber}: ${extractName(entry)}</h1><div class="data-card">`;
    
    // We isolate the mechanics so they just print plain text
    const isEngineMechanic = ['suAbilities', 'suBuffs', 'suPassives'].includes(cat);

    // Render the Properties
    for (const [k, v] of Object.entries(entry)) {
        if (k === 'wikiNumber' || k === 'usedBy' || k === 'craftedBy' || k === 'ID') continue;
        
        let displayValue = v || '<span style="color:#666;">Null</span>';
        
        // APPLY THE STRICT LINKING LOGIC BASED ON THE COLUMN HEADER
        if (!isEngineMechanic) {
            if (['5 Abilities', '3 Abilities', '2 Abilities', '1 Ability', 'Switch Skill'].includes(k)) {
                displayValue = strictLinker(v, 'abilities'); // STRICTLY link to abilities
            } 
            else if (['Passive Skill', 'InnatePassiveId'].includes(k)) {
                displayValue = strictLinker(v, 'passives'); // STRICTLY link to passives
            }
            // For general descriptions, we leave them as plain text! No accidental linking!
        }

        html += `<div class="property-row"><div class="property-key">${k}</div><div class="property-value">${displayValue}</div></div>`;
    }
    
    // Render Reverse Relationships (Used By / Crafted By)
    if (entry.craftedBy && entry.craftedBy.length > 0) {
        html += `<h3>Crafting Requirements</h3><ul>${entry.craftedBy.map(r => `<li>${r}</li>`).join('')}</ul>`;
    }
    
    // This dynamically prints out what Jobs/Characters use this exact Ability/Passive!
    if (entry.usedBy && entry.usedBy.length > 0) {
        html += `<h3>Used By</h3><div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;">`;
        entry.usedBy.forEach(u => {
            html += `<a class="wiki-link" onclick="renderPage('${u.cat}', ${u.idx})">${u.name} (${u.type})</a>`;
        });
        html += `</div>`;
    }
    
    setHTML(html + `</div>`);
}

function setHTML(h) { document.getElementById('page-container').innerHTML = h; document.getElementById('content').scrollTop = 0; }
function toggleNav() { document.getElementById('sidebar').classList.toggle('open'); }

window.addEventListener('popstate', e => e.state?.view === 'home' ? renderHome(false) : (e.state?.view === 'cat' ? renderCategory(e.state.cat, e.state.title, false) : (e.state?.view === 'page' ? renderPage(e.state.cat, e.state.idx, false) : null)));
window.onload = initWiki;
