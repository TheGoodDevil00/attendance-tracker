/**
 * ATTENDANCE & GPA MANAGER (FINAL v4)
 */

const CONFIG = {
    storageKeys: { attendance: 'att_smart_v2', gpa: 'gpa_v1', theme: 'theme', gradingScale: 'gpa_scale_v1' },
    // Default Scale (University Specific)
    defaultGradingScale: [
        { min: 90, points: 10 }, { min: 85, points: 9 }, { min: 75, points: 8 }, 
        { min: 65, points: 7 }, { min: 55, points: 6 }, { min: 43, points: 5 }, 
        { min: 40, points: 4 }, { min: 0,  points: 0 }
    ],
    colors: { safe: 'text-green-500', danger: 'text-red-500' }
};

const Utils = {
    id: (id) => document.getElementById(id),
    save: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    load: (key) => JSON.parse(localStorage.getItem(key)) || null,
    getTodayKey: () => new Date().toISOString().split('T')[0],
    formatDate: () => new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    parseInput: (id, fallback = 0) => { const el = Utils.id(id); const val = parseInt(el.value); return isNaN(val) ? fallback : val; }
};

// ============================================
// 1. CALCULATOR MODULE
// ============================================
const calc = {
    update() {
        const total = Utils.parseInput('calc-total');
        let attended = Utils.parseInput('calc-attended');
        const target = Utils.parseInput('calc-target', 75);

        if (attended > total) { attended = total; Utils.id('calc-attended').value = total; }

        const percent = total === 0 ? 100 : ((attended / total) * 100);
        Utils.id('calc-percent').innerText = percent.toFixed(0) + '%';
        Utils.id('target-display').innerText = target + '%';

        this.renderCircle(percent, target);
        this.renderStatus(attended, total, target, percent);
        this.renderForecast(attended, total, target);
    },

    adjust(type, amount) {
        const input = Utils.id(`calc-${type}`);
        let val = parseInt(input.value) || 0;
        val = Math.max(0, val + amount);
        input.value = val;
        this.update();
    },

    attendToday() {
        const t = Utils.id('calc-total');
        const a = Utils.id('calc-attended');
        t.value = (parseInt(t.value) || 0) + 1;
        a.value = (parseInt(a.value) || 0) + 1;
        this.update();
        const btn = document.activeElement;
        if(btn && btn.tagName === 'BUTTON') {
            const txt = btn.innerHTML;
            btn.innerHTML = "<span>✅ Updated!</span>";
            setTimeout(() => btn.innerHTML = txt, 1000);
        }
    },

    reset() { Utils.id('calc-total').value = 40; Utils.id('calc-attended').value = 32; this.update(); },

    renderCircle(percent, target) {
        const circle = Utils.id('circle-progress');
        const offset = 251.2 - (251.2 * percent) / 100;
        circle.style.strokeDasharray = 251.2;
        circle.style.strokeDashoffset = offset;
        const isSafe = percent >= target;
        circle.classList.remove(CONFIG.colors.safe, CONFIG.colors.danger);
        circle.classList.add(isSafe ? 'text-green-500' : 'text-red-500');
    },

    renderStatus(attended, total, target, percent) {
        const title = Utils.id('calc-status-title');
        const desc = Utils.id('calc-status-desc');
        const safeSkips = Math.floor((attended / (target / 100)) - total);
        const required = Math.ceil(((target / 100 * total) - attended) / (1 - target / 100));

        if (percent >= target) {
            title.innerText = "Safe!";
            title.className = "text-3xl md:text-4xl font-extrabold text-green-600 mb-2";
            desc.innerText = "Buffer available. Chill.";
            Utils.id('calc-bunks').innerText = Math.max(0, safeSkips);
            Utils.id('calc-recover').innerText = 0;
        } else {
            title.innerText = "Warning!";
            title.className = "text-3xl md:text-4xl font-extrabold text-red-600 mb-2";
            desc.innerText = `Below ${target}%. Don't miss!`;
            Utils.id('calc-bunks').innerText = 0;
            Utils.id('calc-recover').innerText = Math.max(0, required);
        }
    },

    renderForecast(attended, total, target) {
        const container = Utils.id('forecast-container');
        container.innerHTML = '';
        for (let i = 0; i <= 10; i++) {
            const pTot = total + i;
            const pAtt = attended + i;
            const pct = pTot === 0 ? 0 : (pAtt / pTot) * 100;
            const isMet = pct >= target;
            const bar = document.createElement('div');
            bar.className = `flex-1 rounded-t-sm mx-0.5 relative group ${isMet ? 'bg-green-400' : 'bg-gray-300'} hover:bg-indigo-500 transition-colors`;
            bar.style.height = `${Math.max(pct, 15)}%`;
            bar.innerHTML = `<div class="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-gray-800 text-white text-[10px] rounded py-1 px-2 whitespace-nowrap z-20 shadow-lg font-bold">+${i}: ${pct.toFixed(1)}%</div>`;
            container.appendChild(bar);
        }
        const line = document.createElement('div');
        line.className = "absolute w-full border-t border-dashed border-gray-400 opacity-50 z-10 pointer-events-none";
        line.style.bottom = `${target}%`;
        container.appendChild(line);
    }
};

// ============================================
// 2. GPA MODULE (Dynamic Scale)
// ============================================
const gpaApp = {
    courses: [],
    currentScale: [],
    tempScaleSettings: [],

    init() {
        const savedCourses = Utils.load(CONFIG.storageKeys.gpa);
        if (savedCourses) this.courses = savedCourses;
        if (this.courses.length === 0) this.addRow();

        const savedScale = Utils.load(CONFIG.storageKeys.gradingScale);
        this.currentScale = savedScale || JSON.parse(JSON.stringify(CONFIG.defaultGradingScale));

        this.render();
        this.renderScaleBadges();
    },

    save() { Utils.save(CONFIG.storageKeys.gpa, this.courses); },

    addRow() { this.courses.push({ id: Date.now(), credits: 4, max: 100, obtained: 0 }); this.save(); this.render(); },
    removeRow(id) { this.courses = this.courses.filter(c => c.id !== id); this.save(); this.calculate(); this.render(); },
    updateRow(id, field, value) { const c = this.courses.find(c => c.id === id); if(c) { c[field] = parseFloat(value)||0; this.save(); this.calculate(); } },

    calculate() {
        let pts = 0, creds = 0;
        this.courses.forEach(c => {
            if (c.max === 0 || c.credits === 0) return;
            const pct = (c.obtained / c.max) * 100;
            const grade = this.currentScale.find(s => pct >= s.min);
            pts += ((grade ? grade.points : 0) * c.credits);
            creds += c.credits;
        });
        Utils.id('gpa-result').innerText = creds === 0 ? "0.00" : (pts / creds).toFixed(2);
        Utils.id('gpa-credits').innerText = creds;
    },

    render() {
        const list = Utils.id('gpa-list');
        list.innerHTML = '';
        this.courses.forEach((c, idx) => {
            const row = document.createElement('div');
            row.className = "bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 relative group";
            const del = `<button onclick="gpaApp.removeRow(${c.id})" class="absolute top-2 right-2 text-gray-300 hover:text-red-500 font-bold p-1">×</button>`;
            row.innerHTML = `${this.courses.length > 1 ? del : ''}
                <div class="flex items-center gap-2"><span class="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded uppercase">Subject ${idx + 1}</span></div>
                <div class="grid grid-cols-3 gap-3">
                    <div><label class="text-[10px] font-bold text-gray-400 uppercase">Credits</label><input type="number" value="${c.credits}" oninput="gpaApp.updateRow(${c.id}, 'credits', this.value)" class="w-full h-8 bg-gray-50 border border-gray-200 rounded text-center font-bold text-sm focus:ring-2 focus:ring-indigo-100 outline-none"></div>
                    <div><label class="text-[10px] font-bold text-gray-400 uppercase">Max</label><input type="number" value="${c.max}" oninput="gpaApp.updateRow(${c.id}, 'max', this.value)" class="w-full h-8 bg-gray-50 border border-gray-200 rounded text-center font-bold text-sm focus:ring-2 focus:ring-indigo-100 outline-none"></div>
                    <div><label class="text-[10px] font-bold text-gray-400 uppercase">Got</label><input type="number" value="${c.obtained}" oninput="gpaApp.updateRow(${c.id}, 'obtained', this.value)" class="w-full h-8 bg-white border border-indigo-200 rounded text-center font-bold text-sm text-indigo-700 focus:ring-2 focus:ring-indigo-100 outline-none"></div>
                </div>`;
            list.appendChild(row);
        });
        this.calculate();
    },

    renderScaleBadges() {
        Utils.id('grading-scale-display').innerHTML = this.currentScale.map(s => `<span class="text-[10px] bg-white border px-2 py-1 rounded text-gray-500 shadow-sm">${s.min}+ = <b>${s.points}</b></span>`).join('');
    },
    openSettings() { Utils.id('gpa-settings-modal').classList.remove('hidden'); this.tempScaleSettings = JSON.parse(JSON.stringify(this.currentScale)); this.renderSettingsList(); },
    closeSettings() { Utils.id('gpa-settings-modal').classList.add('hidden'); },
    renderSettingsList() {
        const list = Utils.id('settings-scale-list');
        list.innerHTML = '';
        this.tempScaleSettings.forEach((s, idx) => {
            list.innerHTML += `<div class="grid grid-cols-3 gap-2 items-center">
                <div class="relative"><input type="number" value="${s.min}" onchange="gpaApp.tempScaleSettings[${idx}].min=parseFloat(this.value)" class="w-full p-2 bg-gray-50 border border-gray-200 rounded text-center font-bold text-sm"><span class="absolute right-2 top-2 text-gray-400 text-xs">%</span></div>
                <div class="relative"><input type="number" step="0.1" value="${s.points}" onchange="gpaApp.tempScaleSettings[${idx}].points=parseFloat(this.value)" class="w-full p-2 bg-gray-50 border border-gray-200 rounded text-center font-bold text-sm text-indigo-600"><span class="absolute right-2 top-2 text-gray-400 text-xs">GP</span></div>
                <button onclick="gpaApp.removeScaleRow(${idx})" class="text-red-400 hover:text-red-600 font-bold px-2">Delete</button></div>`;
        });
    },
    addScaleRow() { this.tempScaleSettings.push({ min: 0, points: 0 }); this.renderSettingsList(); },
    removeScaleRow(idx) { this.tempScaleSettings.splice(idx, 1); this.renderSettingsList(); },
    saveSettings() {
        this.tempScaleSettings.sort((a, b) => b.min - a.min);
        this.currentScale = this.tempScaleSettings;
        Utils.save(CONFIG.storageKeys.gradingScale, this.currentScale);
        this.renderScaleBadges(); this.calculate(); this.closeSettings();
    },
    restoreDefaults() { if(confirm("Reset scale?")) { this.tempScaleSettings = JSON.parse(JSON.stringify(CONFIG.defaultGradingScale)); this.renderSettingsList(); } },
    reset() { if(confirm("Clear GPA?")) { this.courses=[]; this.addRow(); this.render(); } }
};

// ============================================
// 3. MAIN APP
// ============================================
const app = {
    state: { schedule: {}, stats: {}, history: {} },
    init() {
        const saved = Utils.load(CONFIG.storageKeys.attendance);
        if (saved) this.state = saved;
        Utils.id('current-date-display').innerText = Utils.formatDate();
        this.loadTheme(); calc.update(); gpaApp.init();
        const ht = Utils.id('holiday-toggle'); if(ht) ht.checked = false;
        this.view('calc');
    },
    save() { Utils.save(CONFIG.storageKeys.attendance, this.state); },
    
    view(v) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        Utils.id(`view-${v}`).classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        Utils.id(`btn-${v}`).classList.add('active');
        const hw = Utils.id('holiday-wrapper');
        if (v === 'today') { hw.classList.remove('hidden'); this.renderToday(); } else { hw.classList.add('hidden'); }
        if (v === 'stats') this.renderStats();
        if (v === 'schedule') this.renderScheduleList();
    },

    toggleTheme() { document.body.classList.toggle('dark'); const d = document.body.classList.contains('dark'); localStorage.setItem(CONFIG.storageKeys.theme, d ? 'dark' : 'light'); this.updateThemeIcons(d); },
    loadTheme() { const d = localStorage.getItem(CONFIG.storageKeys.theme) === 'dark'; if(d) document.body.classList.add('dark'); this.updateThemeIcons(d); },
    updateThemeIcons(d) { Utils.id('icon-moon').classList.toggle('hidden', d); Utils.id('icon-sun').classList.toggle('hidden', !d); },

    addToSchedule() {
        const d = Utils.id('sched-day').value; const s = Utils.id('sched-subject').value.trim();
        if (!s) return;
        if (!this.state.schedule[d]) this.state.schedule[d] = [];
        if (!this.state.stats[s]) this.state.stats[s] = { attended: 0, total: 0 };
        this.state.schedule[d].push(s); Utils.id('sched-subject').value = ''; this.save(); this.renderScheduleList();
    },
    removeFromSchedule(d, i) { if(confirm("Delete?")) { this.state.schedule[d].splice(i, 1); this.save(); this.renderScheduleList(); } },

    mark(sub, status) {
        const k = Utils.getTodayKey();
        if (!this.state.history[k]) this.state.history[k] = {};
        if (this.state.history[k][sub]) return alert("Already marked!");
        this.state.stats[sub].total++;
        if (status === 'present') this.state.stats[sub].attended++;
        this.state.history[k][sub] = status; this.save(); this.renderToday();
    },

    toggleHoliday() { const h = Utils.id('holiday-toggle').checked; Utils.id('today-container').classList.toggle('hidden', h); Utils.id('holiday-banner').classList.toggle('hidden', !h); },
    resetAll() { if(confirm("Factory Reset?")) { localStorage.clear(); location.reload(); } },

    renderToday() {
        const con = Utils.id('today-container');
        const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const classes = this.state.schedule[day] || [];
        const hist = this.state.history[Utils.getTodayKey()] || {};
        if (classes.length === 0) return con.innerHTML = `<div class="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-300"><p class="text-gray-400">No classes for ${day}.</p><button onclick="app.view('schedule')" class="mt-2 text-indigo-600 font-bold hover:underline">Edit Schedule</button></div>`;
        
        let h = `<h2 class="font-bold text-gray-800 mb-4">Schedule (${day})</h2><div class="space-y-3">`;
        classes.forEach(s => {
            const done = hist[s];
            const btns = done ? `<div class="px-4 py-3 rounded-lg border ${done==='present'?'text-green-700 bg-green-50 border-green-200':'text-red-700 bg-red-50 border-red-200'} font-bold text-sm text-center">MARKED ${done.toUpperCase()}</div>` 
            : `<div class="flex gap-2"><button onclick="app.mark('${s}','present')" class="att-btn flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-sm">Present</button><button onclick="app.mark('${s}','absent')" class="att-btn flex-1 bg-white text-red-500 border border-red-100 py-3 rounded-xl font-bold">Absent</button></div>`;
            h += `<div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3"><div class="flex justify-between items-center"><span class="font-bold text-gray-700 text-lg">${s}</span>${!done?'<span class="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">Pending</span>':''}</div>${btns}</div>`;
        });
        con.innerHTML = h + `</div>`;
    },

    renderStats() {
        const list = Utils.id('stats-list'); list.innerHTML = '';
        let totA = 0, totC = 0, totS = 0;
        Object.keys(this.state.stats).forEach(s => {
            const st = this.state.stats[s]; if (st.total === 0) return;
            const pct = (st.attended / st.total) * 100;
            const safe = Math.floor((st.attended / 0.75) - st.total);
            const req = Math.ceil(((0.75 * st.total) - st.attended) / 0.25);
            const isSafe = pct >= 75;
            totA += st.attended; totC += st.total; if (safe > 0) totS += safe;
            list.innerHTML += `<div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div class="flex justify-between mb-1 items-end"><span class="font-bold text-gray-800">${s}</span><span class="${isSafe?'text-green-600':'text-red-600'} font-black text-xl">${pct.toFixed(0)}%</span></div><div class="w-full bg-gray-100 rounded-full h-2 mb-2"><div class="${isSafe?'bg-green-500':'bg-red-500'} h-2 rounded-full" style="width: ${pct}%"></div></div><div class="flex justify-between text-xs"><span class="text-gray-400 font-medium">${st.attended}/${st.total}</span><span class="${isSafe?'text-green-600':'text-red-600'} font-bold">${isSafe?`Safe: ${safe}`:`Attend: ${req}`}</span></div></div>`;
        });
        Utils.id('stat-total-percent').innerText = (totC === 0 ? 100 : (totA / totC) * 100).toFixed(0) + '%';
        Utils.id('stat-safe-bunks').innerText = totS;
    },

    renderScheduleList() {
        const list = Utils.id('schedule-list'); list.innerHTML = '';
        ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].forEach(d => {
            const subs = this.state.schedule[d];
            if (subs && subs.length > 0) {
                const items = subs.map((s,i) => `<span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-indigo-100">${s} <button onclick="app.removeFromSchedule('${d}', ${i})" class="text-indigo-300 hover:text-red-500 ml-1">×</button></span>`).join('');
                list.innerHTML += `<div class="mb-4"><h4 class="font-bold text-[10px] uppercase text-gray-400 mb-2 tracking-wider">${d}</h4><div class="flex flex-wrap gap-2">${items}</div></div>`;
            }
        });
        if(list.innerHTML === '') list.innerHTML = `<div class="text-center text-gray-400 text-sm py-4">No classes added yet.</div>`;
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
