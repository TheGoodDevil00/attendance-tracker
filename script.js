/** BUNKRR / STUDENT OS (v10 - With Calc Persistence) */

const CONFIG = {
    storageKeys: { 
        attendance: 'att_smart_v2', 
        gpa: 'gpa_v1', 
        theme: 'theme', 
        gradingScale: 'gpa_scale_v1', 
        tasks: 'tasks_v1', 
        wallet: 'wallet_v1',
        calc: 'calc_v1' // NEW: Storage key for Quick Calc
    },
    defaultGradingScale: [{min:90,points:10},{min:85,points:9},{min:75,points:8},{min:65,points:7},{min:55,points:6},{min:43,points:5},{min:40,points:4},{min:0,points:0}],
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
// 1. CALCULATOR MODULE (Now with Memory!)
// ============================================
const calc = {
    init() {
        // Load saved values if they exist
        const saved = Utils.load(CONFIG.storageKeys.calc);
        if (saved) {
            Utils.id('calc-total').value = saved.total;
            Utils.id('calc-attended').value = saved.attended;
            Utils.id('calc-target').value = saved.target || 75;
        }
        this.update(); // Update UI with loaded values
    },
    
    save() {
        // Save current inputs to storage
        const data = {
            total: Utils.id('calc-total').value,
            attended: Utils.id('calc-attended').value,
            target: Utils.id('calc-target').value
        };
        Utils.save(CONFIG.storageKeys.calc, data);
    },

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
        
        this.save(); // Save on every update
    },

    adjust(type, amount) { 
        const input = Utils.id(`calc-${type}`); 
        input.value = Math.max(0, (parseInt(input.value)||0) + amount); 
        this.update(); 
    },

    attendToday() { 
        const t = Utils.id('calc-total'); 
        const a = Utils.id('calc-attended'); 
        t.value = (parseInt(t.value)||0)+1; 
        a.value = (parseInt(a.value)||0)+1; 
        this.update(); 
        
        // Button Feedback
        const btn = document.activeElement;
        if(btn && btn.tagName === 'BUTTON') {
            const originalText = btn.innerText;
            btn.innerText = "✅ Saved!";
            setTimeout(() => btn.innerText = originalText, 1000);
        }
    },

    reset() { 
        Utils.id('calc-total').value = 40; 
        Utils.id('calc-attended').value = 32; 
        this.update(); 
    },

    renderCircle(percent, target) {
        const c = Utils.id('circle-progress'); const off = 251.2 - (251.2 * percent) / 100; c.style.strokeDasharray = 251.2; c.style.strokeDashoffset = off;
        c.classList.remove(CONFIG.colors.safe, CONFIG.colors.danger); c.classList.add(percent >= target ? 'text-green-500' : 'text-red-500');
    },
    renderStatus(attended, total, target, percent) {
        const safeSkips = Math.floor((attended / (target / 100)) - total); const required = Math.ceil(((target / 100 * total) - attended) / (1 - target / 100));
        const safe = percent >= target;
        Utils.id('calc-status-title').innerText = safe ? "Safe!" : "Warning!";
        Utils.id('calc-status-title').className = `text-3xl md:text-4xl font-extrabold ${safe ? 'text-green-600' : 'text-red-600'} mb-2`;
        Utils.id('calc-status-desc').innerText = safe ? "Buffer available." : `Below ${target}%.`;
        Utils.id('calc-bunks').innerText = safe ? Math.max(0, safeSkips) : 0;
        Utils.id('calc-recover').innerText = safe ? 0 : Math.max(0, required);
    },
    renderForecast(attended, total, target) {
        const c = Utils.id('forecast-container'); c.innerHTML = '';
        for (let i=0; i<=10; i++) {
            const pct = (total+i)===0 ? 0 : ((attended+i)/(total+i))*100;
            const bar = document.createElement('div');
            bar.className = `flex-1 rounded-t-sm mx-0.5 relative group ${pct>=target ? 'bg-green-400' : 'bg-gray-300'} hover:bg-indigo-500 transition-colors`;
            bar.style.height = `${Math.max(pct, 15)}%`;
            bar.innerHTML = `<div class="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-800 text-white text-[10px] rounded px-2 py-1 z-20 whitespace-nowrap">+${i}: ${pct.toFixed(1)}%</div>`;
            c.appendChild(bar);
        }
        const l = document.createElement('div'); l.className = "absolute w-full border-t border-dashed border-gray-400 opacity-50 z-10 pointer-events-none"; l.style.bottom = `${target}%`; c.appendChild(l);
    }
};

// ============================================
// 2. GPA MODULE
// ============================================
const gpaApp = {
    courses: [], currentScale: [], tempScaleSettings: [],
    init() { this.courses = Utils.load(CONFIG.storageKeys.gpa) || []; if(this.courses.length===0) this.addRow(); this.currentScale = Utils.load(CONFIG.storageKeys.gradingScale) || JSON.parse(JSON.stringify(CONFIG.defaultGradingScale)); this.render(); this.renderScaleBadges(); },
    save() { Utils.save(CONFIG.storageKeys.gpa, this.courses); },
    addRow() { this.courses.push({ id: Date.now(), credits: 4, max: 100, obtained: 0 }); this.save(); this.render(); },
    removeRow(id) { this.courses = this.courses.filter(c => c.id !== id); this.save(); this.calculate(); this.render(); },
    updateRow(id, f, v) { const c = this.courses.find(c => c.id === id); if(c) { c[f] = parseFloat(v)||0; this.save(); this.calculate(); } },
    calculate() {
        let pts = 0, creds = 0;
        this.courses.forEach(c => {
            if (c.max === 0 || c.credits === 0) return;
            const pct = (c.obtained / c.max) * 100;
            const grade = this.currentScale.find(s => pct >= s.min);
            pts += ((grade ? grade.points : 0) * c.credits); creds += c.credits;
        });
        Utils.id('gpa-result').innerText = creds === 0 ? "0.00" : (pts / creds).toFixed(2); Utils.id('gpa-credits').innerText = creds;
    },
    render() {
        const l = Utils.id('gpa-list'); l.innerHTML = '';
        this.courses.forEach((c, idx) => {
            l.innerHTML += `<div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 relative group">
                <button onclick="gpaApp.removeRow(${c.id})" class="absolute top-2 right-2 text-gray-300 hover:text-red-500 font-bold p-1">×</button>
                <div class="flex items-center gap-2"><span class="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded uppercase">Subject ${idx + 1}</span></div>
                <div class="grid grid-cols-3 gap-3">
                    <div><label class="text-[10px] font-bold text-gray-400 uppercase">Credits</label><input type="number" value="${c.credits}" oninput="gpaApp.updateRow(${c.id},'credits',this.value)" class="w-full h-8 bg-gray-50 border border-gray-200 rounded text-center font-bold text-sm outline-none"></div>
                    <div><label class="text-[10px] font-bold text-gray-400 uppercase">Max</label><input type="number" value="${c.max}" oninput="gpaApp.updateRow(${c.id},'max',this.value)" class="w-full h-8 bg-gray-50 border border-gray-200 rounded text-center font-bold text-sm outline-none"></div>
                    <div><label class="text-[10px] font-bold text-gray-400 uppercase">Got</label><input type="number" value="${c.obtained}" oninput="gpaApp.updateRow(${c.id},'obtained',this.value)" class="w-full h-8 bg-white border border-indigo-200 rounded text-center font-bold text-sm text-indigo-700 outline-none"></div>
                </div></div>`;
        });
        this.calculate();
    },
    renderScaleBadges() { Utils.id('grading-scale-display').innerHTML = this.currentScale.map(s => `<span class="text-[10px] bg-white border px-2 py-1 rounded text-gray-500 shadow-sm">${s.min}+ = <b>${s.points}</b></span>`).join(''); },
    openSettings() { Utils.id('gpa-settings-modal').classList.remove('hidden'); this.tempScaleSettings = JSON.parse(JSON.stringify(this.currentScale)); this.renderSettingsList(); },
    closeSettings() { Utils.id('gpa-settings-modal').classList.add('hidden'); },
    renderSettingsList() {
        Utils.id('settings-scale-list').innerHTML = this.tempScaleSettings.map((s, i) => `<div class="grid grid-cols-3 gap-2 items-center"><input type="number" value="${s.min}" onchange="gpaApp.tempScaleSettings[${i}].min=parseFloat(this.value)" class="w-full p-2 bg-gray-50 border border-gray-200 rounded text-center font-bold text-sm"><input type="number" step="0.1" value="${s.points}" onchange="gpaApp.tempScaleSettings[${i}].points=parseFloat(this.value)" class="w-full p-2 bg-gray-50 border border-gray-200 rounded text-center font-bold text-sm text-indigo-600"><button onclick="gpaApp.removeScaleRow(${i})" class="text-red-400 hover:text-red-600 font-bold px-2">Delete</button></div>`).join('');
    },
    addScaleRow() { this.tempScaleSettings.push({ min: 0, points: 0 }); this.renderSettingsList(); },
    removeScaleRow(i) { this.tempScaleSettings.splice(i, 1); this.renderSettingsList(); },
    saveSettings() { this.tempScaleSettings.sort((a, b) => b.min - a.min); this.currentScale = this.tempScaleSettings; Utils.save(CONFIG.storageKeys.gradingScale, this.currentScale); this.renderScaleBadges(); this.calculate(); this.closeSettings(); },
    restoreDefaults() { if(confirm("Reset?")) { this.tempScaleSettings = JSON.parse(JSON.stringify(CONFIG.defaultGradingScale)); this.renderSettingsList(); } },
    reset() { if(confirm("Clear GPA?")) { this.courses=[]; this.addRow(); this.render(); } }
};

// ============================================
// 3. TASK MODULE
// ============================================
const taskApp = {
    tasks: [],
    init() { this.tasks = Utils.load(CONFIG.storageKeys.tasks) || []; this.render(); },
    save() { Utils.save(CONFIG.storageKeys.tasks, this.tasks); },
    renderDropdown() {
        const s = Utils.id('task-subject'); s.innerHTML = '';
        const subs = Object.keys(app.state.stats);
        if(subs.length===0) return s.innerHTML = '<option value="">No Subjects</option>';
        subs.forEach(sub => s.innerHTML += `<option value="${sub}">${sub}</option>`);
    },
    add() {
        const sub = Utils.id('task-subject').value; const date = Utils.id('task-date').value; const desc = Utils.id('task-desc').value.trim();
        if(!sub || !date || !desc) return alert("Fill all fields");
        this.tasks.push({ id: Date.now(), subject: sub, dueDate: date, title: desc, completed: false });
        this.tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        Utils.id('task-desc').value = ''; this.save(); this.render();
    },
    toggle(id) { const t = this.tasks.find(x => x.id === id); if(t) { t.completed = !t.completed; this.save(); this.render(); } },
    remove(id) { if(confirm("Delete?")) { this.tasks = this.tasks.filter(x => x.id !== id); this.save(); this.render(); } },
    render() {
        const l = Utils.id('task-list'); l.innerHTML = '';
        if(this.tasks.length === 0) return l.innerHTML = `<div class="text-center text-gray-400 text-sm py-8">No tasks. Relax!</div>`;
        const today = new Date(); today.setHours(0,0,0,0);
        this.tasks.forEach(t => {
            const diff = Math.ceil((new Date(t.dueDate) - today) / (1000*60*60*24));
            let cls = "border-l-4 border-green-500", txt = `${diff} days left`;
            if (t.completed) { cls = "border-l-4 border-gray-300 opacity-60"; txt = "Done"; }
            else if (diff < 0) { cls = "border-l-4 border-red-500 bg-red-50"; txt = `Overdue ${Math.abs(diff)}d`; }
            else if (diff === 0) { cls = "border-l-4 border-red-600 bg-red-50 animate-pulse"; txt = "DUE TODAY"; }
            else if (diff === 1) { cls = "border-l-4 border-orange-500"; txt = "Tomorrow"; }
            l.innerHTML += `<div class="bg-white p-4 rounded-xl shadow-sm ${cls} flex justify-between items-center group"><div><div class="flex items-center gap-2 mb-1"><span class="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 px-2 py-0.5 rounded">${t.subject}</span><span class="text-[10px] font-bold ${diff<=1&&!t.completed?'text-red-600':'text-gray-400'}">${txt}</span></div><h4 class="font-bold text-gray-800 ${t.completed?'line-through text-gray-400':''}">${t.title}</h4></div><div class="flex gap-3"><input type="checkbox" ${t.completed?'checked':''} onchange="taskApp.toggle(${t.id})" class="w-5 h-5 accent-indigo-600"><button onclick="taskApp.remove(${t.id})" class="text-gray-300 hover:text-red-500 font-bold">×</button></div></div>`;
        });
    }
};

// ============================================
// 4. WALLET MODULE
// ============================================
const walletApp = {
    data: [], budget: 0, currentType: 'expense', currentFilter: 'all', chartInstance: null,
    init() { const d = Utils.load(CONFIG.storageKeys.wallet) || {data:[], budget: 5000}; this.data = d.data; this.budget = d.budget; this.render(); },
    save() { Utils.save(CONFIG.storageKeys.wallet, {data: this.data, budget: this.budget}); },
    openModal(type) {
        this.currentType = type; Utils.id('wallet-modal').classList.remove('hidden'); Utils.id('w-amount').value = ''; Utils.id('w-desc').value = '';
        Utils.id('wallet-modal-title').innerText = type === 'expense' ? 'Add Expense' : 'Add Debt/Loan';
        Utils.id('w-type-selector').classList.toggle('hidden', type === 'expense');
        if(type === 'debt') this.setType('lent');
        setTimeout(() => Utils.id('w-amount').focus(), 100);
    },
    quickAdd(desc) {
        const amt = prompt(`Enter amount for ${desc}:`);
        if(amt && !isNaN(amt)) {
            this.currentType = 'expense';
            this.data.unshift({ id: Date.now(), type: 'expense', amount: parseFloat(amt), desc: desc, date: new Date().toISOString(), settled: false });
            this.save(); this.render();
        }
    },
    closeModal() { Utils.id('wallet-modal').classList.add('hidden'); },
    setType(t) { 
        this.currentType = t; 
        Utils.id('btn-lent').className = t==='lent' ? "py-2 rounded-lg border border-green-200 bg-green-50 text-green-700 font-bold text-xs" : "py-2 rounded-lg border border-gray-200 text-gray-500 font-bold text-xs";
        Utils.id('btn-borrowed').className = t==='borrowed' ? "py-2 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 font-bold text-xs" : "py-2 rounded-lg border border-gray-200 text-gray-500 font-bold text-xs";
    },
    saveTransaction() {
        const amt = parseFloat(Utils.id('w-amount').value); const desc = Utils.id('w-desc').value.trim();
        if(!amt || !desc) return alert("Enter amount and description");
        this.data.unshift({ id: Date.now(), type: this.currentType, amount: amt, desc: desc, date: new Date().toISOString(), settled: false });
        this.save(); this.closeModal(); this.render();
    },
    setBudget() { const b = prompt("Set Monthly Budget (₹):", this.budget); if(b) { this.budget = parseFloat(b); this.save(); this.render(); } },
    filter(f) { this.currentFilter = f; 
        ['all','month','debt'].forEach(k => Utils.id(`w-filter-${k}`).className = k===f ? "px-4 py-1.5 rounded-full text-[10px] font-bold bg-gray-800 text-white shadow-sm" : "px-4 py-1.5 rounded-full text-[10px] font-bold bg-white border border-gray-200 text-gray-500 hover:bg-gray-50");
        this.renderList();
    },
    settle(id) { const t = this.data.find(x => x.id === id); if(t && confirm("Mark settled?")) { t.settled = true; this.save(); this.render(); } },
    deleteItem(id) { if(confirm("Delete?")) { this.data = this.data.filter(x => x.id !== id); this.save(); this.render(); } },
    render() {
        const now = new Date(); const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const spent = this.data.filter(t => t.type === 'expense' && new Date(t.date) >= monthStart).reduce((s, t) => s + t.amount, 0);
        Utils.id('wallet-total').innerText = spent; Utils.id('wallet-limit').innerText = this.budget;
        const pct = Math.min((spent / (this.budget||1))*100, 100);
        Utils.id('wallet-progress').style.width = `${pct}%`;
        Utils.id('wallet-progress').className = `h-2 rounded-full transition-all duration-500 ${pct > 90 ? 'bg-red-400' : 'bg-emerald-400'}`;
        this.renderList();
        this.renderChart();
    },
    renderChart() {
        if(typeof Chart === 'undefined') return;
        const ctx = document.getElementById('expense-chart');
        if(!ctx) return;
        
        const expenses = this.data.filter(t => t.type === 'expense');
        const agg = {};
        expenses.forEach(t => {
            const k = t.desc.toLowerCase().trim();
            agg[k] = (agg[k] || 0) + t.amount;
        });

        const labels = Object.keys(agg).map(k => k.charAt(0).toUpperCase() + k.slice(1));
        const values = Object.values(agg);

        if(this.chartInstance) this.chartInstance.destroy();
        if(values.length === 0) return; 

        this.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [ '#34d399', '#60a5fa', '#fcd34d', '#a78bfa', '#f87171', '#9ca3af' ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: {size: 10} } } }
            }
        });
    },
    renderList() {
        const l = Utils.id('wallet-list'); l.innerHTML = '';
        let list = this.data;
        if(this.currentFilter === 'month') { const start = new Date(); start.setDate(1); list = list.filter(t => new Date(t.date) >= start); }
        if(this.currentFilter === 'debt') list = list.filter(t => t.type !== 'expense');
        if(list.length === 0) return l.innerHTML = `<div class="text-center text-gray-400 text-sm py-4">No transactions found.</div>`;

        list.forEach(t => {
            let icon = '💸', color = 'text-red-500 bg-red-50', sign = '-';
            if(t.type === 'lent') { icon = '↗️'; color = 'text-green-600 bg-green-50'; sign = ''; }
            if(t.type === 'borrowed') { icon = '↙️'; color = 'text-orange-600 bg-orange-50'; sign = '+'; }
            const isDebt = t.type !== 'expense';
            const actionBtn = (isDebt && !t.settled) ? `<button onclick="walletApp.settle(${t.id})" class="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded hover:bg-green-100 hover:text-green-700">Settle</button>` : '';

            l.innerHTML += `<div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between ${t.settled ? 'opacity-50 grayscale' : ''}">
                <div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full ${color} flex items-center justify-center text-xs">${icon}</div><div><h4 class="font-bold text-gray-800 text-sm ${t.settled ? 'line-through' : ''}">${t.desc}</h4><p class="text-[10px] text-gray-400">${new Date(t.date).toLocaleDateString()}</p></div></div>
                <div class="flex flex-col items-end gap-1"><span class="font-bold ${t.type==='expense' ? 'text-gray-800' : (t.type==='lent'?'text-green-600':'text-orange-600')}">${sign}₹${t.amount}</span><div class="flex gap-2">${actionBtn} <button onclick="walletApp.deleteItem(${t.id})" class="text-gray-300 hover:text-red-500 font-bold text-xs">×</button></div></div></div>`;
        });
    }
};

// ============================================
// 5. MAIN APP (Init & Schedule)
// ============================================
const app = {
    state: { schedule: {}, stats: {}, history: {} },
    init() {
        this.state = Utils.load(CONFIG.storageKeys.attendance) || { schedule: {}, stats: {}, history: {} };
        Utils.id('current-date-display').innerText = Utils.formatDate();
        this.loadTheme();
        
        // Init all sub-modules
        calc.init();  // <--- NEW: Now has init()
        gpaApp.init(); 
        taskApp.init(); 
        walletApp.init();
        
        if(Utils.id('holiday-toggle')) Utils.id('holiday-toggle').checked = false;
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
        if (v === 'tasks') taskApp.renderDropdown();
    },
    toggleTheme() { document.body.classList.toggle('dark'); const d = document.body.classList.contains('dark'); localStorage.setItem(CONFIG.storageKeys.theme, d ? 'dark' : 'light'); this.updateIcons(d); },
    loadTheme() { const d = localStorage.getItem(CONFIG.storageKeys.theme) === 'dark'; if(d) document.body.classList.add('dark'); this.updateIcons(d); },
    updateIcons(d) { Utils.id('icon-moon').classList.toggle('hidden', d); Utils.id('icon-sun').classList.toggle('hidden', !d); },
    
    addToSchedule() {
        const d = Utils.id('sched-day').value; const s = Utils.id('sched-subject').value.trim();
        if (!s) return; if (!this.state.schedule[d]) this.state.schedule[d] = [];
        if (!this.state.stats[s]) this.state.stats[s] = { attended: 0, total: 0 };
        this.state.schedule[d].push(s); Utils.id('sched-subject').value = ''; this.save(); this.renderScheduleList();
    },
    removeFromSchedule(d, i) { if(confirm("Delete?")) { this.state.schedule[d].splice(i, 1); this.save(); this.renderScheduleList(); } },
    mark(sub, status) {
        const k = Utils.getTodayKey(); if (!this.state.history[k]) this.state.history[k] = {};
        if (this.state.history[k][sub]) return alert("Marked!");
        this.state.stats[sub].total++; if (status === 'present') this.state.stats[sub].attended++;
        this.state.history[k][sub] = status; this.save(); this.renderToday();
    },
    toggleHoliday() { const h = Utils.id('holiday-toggle').checked; Utils.id('today-container').classList.toggle('hidden', h); Utils.id('holiday-banner').classList.toggle('hidden', !h); },
    resetAll() { if(confirm("Factory Reset?")) { localStorage.clear(); location.reload(); } },
    
    // Backup & Restore
    exportData() { 
        const d = { 
            attendance: this.state, 
            gpa: gpaApp.courses, 
            scale: gpaApp.currentScale, 
            tasks: taskApp.tasks, 
            wallet: {data: walletApp.data, budget: walletApp.budget},
            calc: { // <--- NEW: Include Calc in backup
                total: Utils.id('calc-total').value,
                attended: Utils.id('calc-attended').value,
                target: Utils.id('calc-target').value
            },
            theme: localStorage.getItem(CONFIG.storageKeys.theme) 
        }; 
        const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(d)); a.download = `backup_${Utils.getTodayKey()}.json`; document.body.appendChild(a); a.click(); a.remove(); 
    },
    importData(input) {
        const f = input.files[0]; if(!f) return;
        const r = new FileReader();
        r.onload = (e) => { 
            try { 
                const d = JSON.parse(e.target.result); 
                if(confirm("Overwrite?")) { 
                    if(d.attendance) Utils.save(CONFIG.storageKeys.attendance, d.attendance); 
                    if(d.gpa) Utils.save(CONFIG.storageKeys.gpa, d.gpa); 
                    if(d.scale) Utils.save(CONFIG.storageKeys.gradingScale, d.scale); 
                    if(d.tasks) Utils.save(CONFIG.storageKeys.tasks, d.tasks); 
                    if(d.wallet) Utils.save(CONFIG.storageKeys.wallet, d.wallet);
                    if(d.calc) Utils.save(CONFIG.storageKeys.calc, d.calc); // <--- NEW: Import Calc
                    if(d.theme) localStorage.setItem(CONFIG.storageKeys.theme, d.theme); 
                    location.reload(); 
                } 
            } catch(err) { alert("Invalid file."); } 
        }; r.readAsText(f);
    },
    openBulkModal() { Utils.id('bulk-import-modal').classList.remove('hidden'); Utils.id('bulk-input').focus(); },
    closeBulkModal() { Utils.id('bulk-import-modal').classList.add('hidden'); Utils.id('bulk-input').value = ''; },
    processBulkImport() {
        const raw = Utils.id('bulk-input').value; if(!raw.trim()) return alert("Paste text first.");
        const map = { 'mon':'Monday','m':'Monday','monday':'Monday','tue':'Tuesday','t':'Tuesday','tuesday':'Tuesday','wed':'Wednesday','w':'Wednesday','wednesday':'Wednesday','thu':'Thursday','th':'Thursday','thursday':'Thursday','fri':'Friday','f':'Friday','friday':'Friday','sat':'Saturday','s':'Saturday','saturday':'Saturday','sun':'Sunday' };
        let count = 0;
        raw.split('\n').forEach(l => {
            const p = l.split(/[:\-]/); if(p.length<2) return;
            const d = map[p[0].trim().toLowerCase().replace(/[^a-z]/g,'')];
            if(d) p[1].split(',').forEach(s => {
                s=s.trim(); if(s) { if(!this.state.schedule[d]) this.state.schedule[d]=[]; this.state.schedule[d].push(s); if(!this.state.stats[s]) this.state.stats[s]={attended:0,total:0}; count++; }
            });
        });
        if(count>0) { this.save(); this.renderScheduleList(); this.closeBulkModal(); alert(`Added ${count} classes.`); } else alert("Format: Day: Subject, Subject");
    },
    renderToday() {
        const con = Utils.id('today-container'); const day = new Date().toLocaleDateString('en-US', { weekday: 'long' }); const classes = this.state.schedule[day] || []; const hist = this.state.history[Utils.getTodayKey()] || {};
        if (classes.length === 0) return con.innerHTML = `<div class="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-300"><p class="text-gray-400">No classes for ${day}.</p><button onclick="app.view('schedule')" class="mt-2 text-indigo-600 font-bold hover:underline">Edit Schedule</button></div>`;
        con.innerHTML = `<h2 class="font-bold text-gray-800 mb-4">Schedule (${day})</h2>` + classes.map(s => {
            const done = hist[s];
            return `<div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3"><div class="flex justify-between items-center"><span class="font-bold text-gray-700 text-lg">${s}</span>${!done?'<span class="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">Pending</span>':''}</div>${done?`<div class="px-4 py-3 rounded-lg border ${done==='present'?'text-green-700 bg-green-50 border-green-200':'text-red-700 bg-red-50 border-red-200'} font-bold text-sm text-center">MARKED ${done.toUpperCase()}</div>`:`<div class="flex gap-2"><button onclick="app.mark('${s}','present')" class="att-btn flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-sm">Present</button><button onclick="app.mark('${s}','absent')" class="att-btn flex-1 bg-white text-red-500 border border-red-100 py-3 rounded-xl font-bold">Absent</button></div>`}</div>`
        }).join('');
    },
    renderStats() {
        this.renderMatrix(); const l = Utils.id('stats-list'); l.innerHTML = '';
        let totA = 0, totC = 0, totS = 0;
        Object.keys(this.state.stats).forEach(s => {
            const st = this.state.stats[s]; if (st.total === 0) return;
            const pct = (st.attended / st.total) * 100; const safe = Math.floor((st.attended / 0.75) - st.total); const req = Math.ceil(((0.75 * st.total) - st.attended) / 0.25); const isSafe = pct >= 75;
            totA += st.attended; totC += st.total; if (safe > 0) totS += safe;
            l.innerHTML += `<div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><div class="flex justify-between mb-1 items-end"><span class="font-bold text-gray-800">${s}</span><span class="${isSafe?'text-green-600':'text-red-600'} font-black text-xl">${pct.toFixed(0)}%</span></div><div class="w-full bg-gray-100 rounded-full h-2 mb-2"><div class="${isSafe?'bg-green-500':'bg-red-500'} h-2 rounded-full" style="width: ${pct}%"></div></div><div class="flex justify-between text-xs"><span class="text-gray-400 font-medium">${st.attended}/${st.total}</span><span class="${isSafe?'text-green-600':'text-red-600'} font-bold">${isSafe?`Safe: ${safe}`:`Attend: ${req}`}</span></div></div>`;
        });
        Utils.id('stat-total-percent').innerText = (totC === 0 ? 100 : (totA / totC) * 100).toFixed(0) + '%'; Utils.id('stat-safe-bunks').innerText = totS;
    },
    renderMatrix() {
        const c = Utils.id('bunk-matrix'); c.innerHTML = '';
        for(let i=29; i>=0; i--) {
            const d = new Date(); d.setDate(new Date().getDate() - i); const k = d.toISOString().split('T')[0];
            const r = this.state.history[k] || {}; const vals = Object.values(r);
            let cls = 'bg-gray-100 border border-gray-200', h = 'h-4';
            if (vals.length > 0) { h = 'h-8'; if (vals.includes('present') && !vals.includes('absent')) cls = 'bg-green-400'; else if (!vals.includes('present') && vals.includes('absent')) cls = 'bg-red-400'; else cls = 'bg-orange-300'; }
            const bar = document.createElement('div'); bar.className = `flex-1 min-w-[6px] rounded-sm ${cls} ${h} relative group`;
            bar.innerHTML = `<div class="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-800 text-white text-[10px] rounded px-1.5 py-0.5 z-10 whitespace-nowrap">${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>`;
            c.appendChild(bar);
        }
    },
    renderScheduleList() {
        const l = Utils.id('schedule-list'); l.innerHTML = '';
        ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].forEach(d => {
            const subs = this.state.schedule[d];
            if (subs && subs.length > 0) l.innerHTML += `<div class="mb-4"><h4 class="font-bold text-[10px] uppercase text-gray-400 mb-2 tracking-wider">${d}</h4><div class="flex flex-wrap gap-2">` + subs.map((s,i) => `<span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-indigo-100">${s} <button onclick="app.removeFromSchedule('${d}', ${i})" class="text-indigo-300 hover:text-red-500 ml-1">×</button></span>`).join('') + `</div></div>`;
        });
        if(l.innerHTML === '') l.innerHTML = `<div class="text-center text-gray-400 text-sm py-4">No classes added yet.</div>`;
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
