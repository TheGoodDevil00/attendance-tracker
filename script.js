// === CALCULATOR LOGIC (NEW) ===
// === CALCULATOR LOGIC (UPDATED) ===
const calc = {
    update() {
        const total = parseInt(document.getElementById('calc-total').value) || 0;
        const attended = parseInt(document.getElementById('calc-attended').value) || 0;
        const target = parseInt(document.getElementById('calc-target').value) || 75;

        // Prevent illogical inputs
        if (attended > total) document.getElementById('calc-attended').value = total;

        // 1. Calculate Percentage
        const percent = total === 0 ? 100 : ((attended / total) * 100);
        document.getElementById('calc-percent').innerText = percent.toFixed(0) + '%';
        document.getElementById('target-display').innerText = target + '%';

        // 2. Update Circle (NEW MATH)
        const circle = document.getElementById('circle-progress');
        // Radius is now 40 (inside a 100x100 box). Circumference = 2 * PI * 40 ≈ 251.2
        const circumference = 251.2;
        const offset = circumference - (circumference * percent) / 100;
        
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = offset;
        
        // Color Change based on safety
        const isSafe = percent >= target;
        circle.classList.remove('text-green-500', 'text-red-500', 'text-yellow-500');
        circle.classList.add(isSafe ? 'text-green-500' : 'text-red-500');

        // 3. Status Text
        const title = document.getElementById('calc-status-title');
        const desc = document.getElementById('calc-status-desc');
        
        // 4. Safe Bunks Logic
        const safeSkips = Math.floor((attended / (target/100)) - total);
        
        // 5. Recovery Logic
        const required = Math.ceil(((target/100 * total) - attended) / (1 - target/100));

        // UI Updates
        const bunkEl = document.getElementById('calc-bunks');
        const recoverEl = document.getElementById('calc-recover');

        if (percent >= target) {
            title.innerText = "You're Safe!";
            title.className = "text-3xl md:text-4xl font-extrabold text-green-600 mb-2";
            desc.innerText = `Buffer available. Take a break if you need!`;
            bunkEl.innerText = safeSkips > 0 ? safeSkips : 0;
            recoverEl.innerText = 0;
        } else {
            title.innerText = "Warning!";
            title.className = "text-3xl md:text-4xl font-extrabold text-red-600 mb-2";
            desc.innerText = `Attendance is low. Don't miss any more!`;
            bunkEl.innerText = 0;
            recoverEl.innerText = required > 0 ? required : 0;
        }

        this.renderForecast(attended, total, target);
    },

    adjust(type, amount) {
        const input = document.getElementById(`calc-${type}`);
        let val = parseInt(input.value) || 0;
        val += amount;
        if (val < 0) val = 0;
        input.value = val;
        this.update();
    },

    reset() {
        document.getElementById('calc-total').value = 40;
        document.getElementById('calc-attended').value = 32;
        this.update();
    },

    renderForecast(attended, total, target) {
        const container = document.getElementById('forecast-container');
        container.innerHTML = '';
        
        for(let i = 0; i <= 10; i++) {
            const projectedTotal = total + i;
            const projectedAttended = attended + i; 
            const pct = projectedTotal === 0 ? 0 : (projectedAttended / projectedTotal) * 100;
            
            const isTargetMet = pct >= target;
            const colorClass = isTargetMet ? 'bg-green-400' : 'bg-gray-300';
            const height = Math.max(pct, 10); 

            const bar = document.createElement('div');
            bar.className = `flex-1 rounded-t-sm mx-0.5 relative group ${colorClass} hover:bg-indigo-500 transition-colors`;
            bar.style.height = `${height}%`;
            
            bar.innerHTML = `
                <div class="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                    +${i} classes: ${pct.toFixed(1)}%
                </div>
            `;
            container.appendChild(bar);
        }
        
        const line = document.createElement('div');
        line.className = "absolute w-full border-t border-dashed border-gray-400 opacity-50";
        line.style.bottom = `${target}%`;
        line.style.left = 0;
        container.appendChild(line);
    }
};

// === APP LOGIC (EXISTING) ===
const app = {
    state: {
        schedule: {}, 
        stats: {},    
        history: {},  
        isHoliday: false
    },

    init() {
        const saved = localStorage.getItem('att_smart_v1');
        if (saved) this.state = JSON.parse(saved);
        
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date-display').innerText = new Date().toLocaleDateString('en-US', options);

        // Run calculator init
        calc.update();
        
        // Default View
        this.view('calc');
    },

    save() {
        localStorage.setItem('att_smart_v1', JSON.stringify(this.state));
    },

    addToSchedule() {
        const day = document.getElementById('sched-day').value;
        const subInput = document.getElementById('sched-subject');
        const subject = subInput.value.trim();

        if (!subject) return;
        if (!this.state.schedule[day]) this.state.schedule[day] = [];
        if (!this.state.stats[subject]) this.state.stats[subject] = { attended: 0, total: 0 };

        this.state.schedule[day].push(subject);
        subInput.value = '';
        this.save();
        this.renderScheduleList();
    },

    mark(subject, status) {
        const todayKey = new Date().toISOString().split('T')[0];
        if (!this.state.history[todayKey]) this.state.history[todayKey] = {};
        if (this.state.history[todayKey][subject]) return alert("Already marked!");

        this.state.stats[subject].total++;
        if (status === 'present') this.state.stats[subject].attended++;
        this.state.history[todayKey][subject] = status;

        this.save();
        this.renderToday();
    },

    renderToday() {
        const container = document.getElementById('today-container');
        const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const classes = this.state.schedule[dayName] || [];
        const todayKey = new Date().toISOString().split('T')[0];
        const history = this.state.history[todayKey] || {};

        if (classes.length === 0) {
            container.innerHTML = `<div class="text-center p-8 text-gray-500">No classes scheduled for ${dayName}.</div>`;
            return;
        }

        let html = `<h2 class="font-bold text-lg mb-4">Classes for ${dayName}</h2><div class="space-y-3">`;
        classes.forEach(sub => {
            const isDone = history[sub];
            let actionButtons = '';
            
            if (isDone) {
                const color = isDone === 'present' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
                actionButtons = `<div class="px-4 py-2 rounded-lg border ${color} font-bold text-sm w-full text-center">Marked ${isDone.toUpperCase()}</div>`;
            } else {
                actionButtons = `
                    <div class="flex gap-2 w-full">
                        <button onclick="app.mark('${sub}', 'present')" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700">Present</button>
                        <button onclick="app.mark('${sub}', 'absent')" class="flex-1 bg-white text-red-500 border border-red-200 py-2 rounded-lg font-bold hover:bg-red-50">Absent</button>
                    </div>`;
            }

            html += `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                    <div class="flex justify-between items-center"><span class="font-bold text-gray-700">${sub}</span></div>
                    ${actionButtons}
                </div>`;
        });
        container.innerHTML = html + `</div>`;
    },

    renderStats() {
        const list = document.getElementById('stats-list');
        list.innerHTML = '';
        let totalAtt = 0, totalClasses = 0;

        Object.keys(this.state.stats).forEach(subName => {
            const s = this.state.stats[subName];
            const percent = s.total === 0 ? 100 : (s.attended / s.total) * 100;
            const safeSkips = Math.floor((s.attended / 0.75) - s.total);
            const isSafe = percent >= 75;
            
            totalAtt += s.attended;
            totalClasses += s.total;

            list.innerHTML += `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-2">
                    <div class="flex justify-between mb-1">
                        <span class="font-bold">${subName}</span>
                        <span class="${isSafe ? 'text-green-600' : 'text-red-600'} font-bold">${percent.toFixed(0)}%</span>
                    </div>
                    <div class="text-xs text-gray-500">${s.attended}/${s.total} attended • ${isSafe ? `Safe to bunk ${safeSkips}` : 'Catch up needed'}</div>
                </div>`;
        });
        
        const global = totalClasses === 0 ? 0 : (totalAtt / totalClasses) * 100;
        document.getElementById('stat-total-percent').innerText = global.toFixed(0) + '%';
    },

    renderScheduleList() {
        const list = document.getElementById('schedule-list');
        list.innerHTML = '';
        Object.keys(this.state.schedule).forEach(day => {
            const subs = this.state.schedule[day];
            if(subs.length) list.innerHTML += `<div class="bg-indigo-50 p-3 rounded mb-2"><h4 class="font-bold text-xs uppercase text-gray-500">${day}</h4><div class="text-sm font-semibold">${subs.join(', ')}</div></div>`;
        });
    },

    toggleHoliday() {
        const isHoliday = document.getElementById('holiday-toggle').checked;
        document.getElementById('today-container').classList.toggle('hidden', isHoliday);
        document.getElementById('holiday-banner').classList.toggle('hidden', !isHoliday);
    },

    resetAll() {
        if(confirm("Reset Everything?")) { localStorage.removeItem('att_smart_v1'); location.reload(); }
    },

    view(v) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${v}`).classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(`btn-${v}`).classList.add('active');
        
        // Show/Hide Holiday toggle only on Today view
        const holidayWrapper = document.getElementById('holiday-wrapper');
        if (v === 'today') holidayWrapper.classList.remove('hidden');
        else holidayWrapper.classList.add('hidden');

        if (v === 'today') this.renderToday();
        if (v === 'stats') this.renderStats();
        if (v === 'schedule') this.renderScheduleList();
    }
};

app.init();
