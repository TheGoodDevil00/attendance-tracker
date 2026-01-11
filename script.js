const app = {
    // DATA STORE
    state: {
        schedule: {}, // { "Monday": ["Math", "Physics"], ... }
        stats: {},    // { "Math": { attended: 10, total: 12 } }
        history: {},  // { "2023-10-24": { "Math": "present" } } preventing double entry
        isHoliday: false
    },

    init() {
        // Load data
        const saved = localStorage.getItem('att_smart_v1');
        if (saved) this.state = JSON.parse(saved);

        // Set Date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date-display').innerText = new Date().toLocaleDateString('en-US', options);

        // Check if today is already marked as holiday in UI
        this.checkHolidayReset();
        this.renderToday();
    },

    save() {
        localStorage.setItem('att_smart_v1', JSON.stringify(this.state));
    },

    // --- SCHEDULE LOGIC ---
    addToSchedule() {
        const day = document.getElementById('sched-day').value;
        const subInput = document.getElementById('sched-subject');
        const subject = subInput.value.trim();

        if (!subject) return;

        // Initialize arrays if they don't exist
        if (!this.state.schedule[day]) this.state.schedule[day] = [];
        if (!this.state.stats[subject]) this.state.stats[subject] = { attended: 0, total: 0 };

        this.state.schedule[day].push(subject);
        subInput.value = '';
        
        this.save();
        this.renderScheduleList();
        alert(`Added ${subject} to ${day}s`);
    },

    deleteFromSchedule(day, index) {
        this.state.schedule[day].splice(index, 1);
        this.save();
        this.renderScheduleList();
    },

    // --- DAILY ACTIONS ---
    getTodayKey() {
        return new Date().toISOString().split('T')[0]; // "2023-10-25"
    },

    getCurrentDayName() {
        return new Date().toLocaleDateString('en-US', { weekday: 'long' });
    },

    toggleHoliday() {
        const isHoliday = document.getElementById('holiday-toggle').checked;
        const todayKey = this.getTodayKey();
        const container = document.getElementById('today-container');
        const banner = document.getElementById('holiday-banner');

        if (isHoliday) {
            container.classList.add('hidden');
            banner.classList.remove('hidden');
            // If we previously marked attendance today, we should probably warn user, 
            // but for simplicity we just hide the interface.
        } else {
            container.classList.remove('hidden');
            banner.classList.add('hidden');
        }
    },

    mark(subject, status) {
        const todayKey = this.getTodayKey();
        
        // Initialize history for today if not exists
        if (!this.state.history[todayKey]) this.state.history[todayKey] = {};

        // Check if already marked today to prevent double counting
        if (this.state.history[todayKey][subject]) {
            alert("You already marked this class for today!");
            return;
        }

        // Update Stats
        this.state.stats[subject].total++;
        if (status === 'present') this.state.stats[subject].attended++;

        // Log History
        this.state.history[todayKey][subject] = status;

        this.save();
        this.renderToday();
    },

    // --- RENDERING ---
    renderToday() {
        const container = document.getElementById('today-container');
        const dayName = this.getCurrentDayName();
        const classes = this.state.schedule[dayName] || [];
        const todayKey = this.getTodayKey();
        const history = this.state.history[todayKey] || {};

        if (classes.length === 0) {
            container.innerHTML = `<div class="text-center p-8 text-gray-500">No classes scheduled for ${dayName}. Enjoy!</div>`;
            return;
        }

        let html = `<h2 class="font-bold text-lg mb-4">Classes for ${dayName}</h2><div class="space-y-3">`;

        classes.forEach(sub => {
            const isDone = history[sub]; // 'present', 'absent', or undefined
            
            let actionButtons = '';
            if (isDone) {
                const color = isDone === 'present' ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200';
                actionButtons = `
                    <div class="px-4 py-2 rounded-lg border ${color} font-bold text-sm w-full text-center">
                        Marked ${isDone.toUpperCase()}
                    </div>
                `;
            } else {
                actionButtons = `
                    <div class="flex gap-2 w-full">
                        <button onclick="app.mark('${sub}', 'present')" class="att-btn flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold shadow-sm hover:bg-indigo-700">Present</button>
                        <button onclick="app.mark('${sub}', 'absent')" class="att-btn flex-1 bg-white text-red-500 border border-red-200 py-2 rounded-lg font-bold hover:bg-red-50">Absent</button>
                    </div>
                `;
            }

            html += `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-gray-700">${sub}</span>
                        <span class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Today</span>
                    </div>
                    ${actionButtons}
                </div>
            `;
        });
        
        html += `</div>`;
        container.innerHTML = html;
    },

    renderStats() {
        const list = document.getElementById('stats-list');
        list.innerHTML = '';
        
        let totalAtt = 0, totalClasses = 0, totalSafe = 0;

        Object.keys(this.state.stats).forEach(subName => {
            const s = this.state.stats[subName];
            const percent = s.total === 0 ? 100 : (s.attended / s.total) * 100;
            const safeSkips = Math.floor((s.attended / 0.75) - s.total);
            const required = Math.ceil(((0.75 * s.total) - s.attended) / 0.25);

            totalAtt += s.attended;
            totalClasses += s.total;
            if (safeSkips > 0) totalSafe += safeSkips;

            const isSafe = percent >= 75;

            list.innerHTML += `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div class="flex justify-between mb-2">
                        <span class="font-bold">${subName}</span>
                        <span class="${isSafe ? 'text-green-600' : 'text-red-600'} font-bold">${percent.toFixed(0)}%</span>
                    </div>
                    <div class="text-xs text-gray-500 mb-2">
                        ${s.attended} / ${s.total} attended
                    </div>
                    <div class="text-sm ${isSafe ? 'text-green-600' : 'text-red-500'}">
                        ${isSafe ? `Safe to bunk <b>${safeSkips}</b>` : `Attend next <b>${required}</b>`}
                    </div>
                </div>
            `;
        });

        const globalPercent = totalClasses === 0 ? 100 : (totalAtt / totalClasses) * 100;
        document.getElementById('stat-total-percent').innerText = globalPercent.toFixed(0) + '%';
        document.getElementById('stat-safe-bunks').innerText = totalSafe;
    },

    renderScheduleList() {
        const list = document.getElementById('schedule-list');
        list.innerHTML = '';
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        days.forEach(day => {
            if (this.state.schedule[day] && this.state.schedule[day].length > 0) {
                let items = '';
                this.state.schedule[day].forEach((sub, index) => {
                    items += `<span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-sm">${sub} <button onclick="app.deleteFromSchedule('${day}', ${index})" class="text-red-400 hover:text-red-600 ml-1">×</button></span>`;
                });
                
                list.innerHTML += `
                    <div class="mb-3">
                        <h4 class="font-bold text-xs uppercase text-gray-400 mb-1">${day}</h4>
                        <div class="flex flex-wrap gap-2">${items}</div>
                    </div>
                `;
            }
        });
    },

    checkHolidayReset() {
        // Simple logic: if user opens app on a new day, ensure holiday toggle is off
        // (Unless we want to store holiday status in history, which is cleaner but more code)
        // For now, toggle resets on reload to avoid accidental holidays
        document.getElementById('holiday-toggle').checked = false;
    },

    resetAll() {
        if(confirm("Factory Reset?")) {
            localStorage.removeItem('att_smart_v1');
            location.reload();
        }
    },

    view(v) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${v}`).classList.remove('hidden');
        
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(`btn-${v}`).classList.add('active');

        if (v === 'today') this.renderToday();
        if (v === 'stats') this.renderStats();
        if (v === 'schedule') this.renderScheduleList();
    }
};

app.init();