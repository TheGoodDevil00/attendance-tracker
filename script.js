/**
 * ATTENDANCE & GPA MANAGER
 * ========================
 * A clean, refactored logic file for managing student data.
 */

// --- CONFIGURATION & CONSTANTS ---
const CONFIG = {
    storageKeys: {
        attendance: 'att_smart_v2',
        gpa: 'gpa_v1',
        theme: 'theme'
    },
    gradingScale: [
        { min: 90, points: 10 },
        { min: 85, points: 9 },
        { min: 75, points: 8 },
        { min: 65, points: 7 },
        { min: 55, points: 6 },
        { min: 43, points: 5 },
        { min: 40, points: 4 },
        { min: 0,  points: 0 }
    ],
    colors: {
        safe: 'text-green-500',
        danger: 'text-red-500',
        barSafe: 'bg-green-400',
        barDanger: 'bg-gray-300'
    }
};

// --- UTILITY HELPERS ---
const Utils = {
    id: (id) => document.getElementById(id),
    
    save: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    
    load: (key) => JSON.parse(localStorage.getItem(key)) || null,
    
    getTodayKey: () => new Date().toISOString().split('T')[0],
    
    formatDate: () => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date().toLocaleDateString('en-US', options);
    },

    parseInput: (id, fallback = 0) => {
        const el = Utils.id(id);
        const val = parseInt(el.value);
        return isNaN(val) ? fallback : val;
    }
};


// ============================================
// 1. QUICK CALCULATOR MODULE
// ============================================
const calc = {
    /**
     * Updates the UI based on inputs. 
     * Handles the Circle Progress and Forecast Chart.
     */
    update() {
        // Get Inputs
        const total = Utils.parseInput('calc-total');
        let attended = Utils.parseInput('calc-attended');
        const target = Utils.parseInput('calc-target', 75);

        // Input Validation: Attended cannot exceed Total
        if (attended > total) {
            attended = total;
            Utils.id('calc-attended').value = total;
        }

        // 1. Calculate Percentage
        const percent = total === 0 ? 100 : ((attended / total) * 100);
        Utils.id('calc-percent').innerText = percent.toFixed(0) + '%';
        Utils.id('target-display').innerText = target + '%';

        // 2. Draw Circular Progress
        this.renderCircle(percent, target);

        // 3. Status Text & Logic
        this.renderStatus(attended, total, target, percent);

        // 4. Forecast Chart
        this.renderForecast(attended, total, target);
    },

    adjust(type, amount) {
        const input = Utils.id(`calc-${type}`);
        let val = parseInt(input.value) || 0;
        val = Math.max(0, val + amount); // Prevent negative numbers
        input.value = val;
        this.update();
    },

    reset() {
        Utils.id('calc-total').value = 40;
        Utils.id('calc-attended').value = 32;
        this.update();
    },

    // --- Internal Render Helpers ---

    renderCircle(percent, target) {
        const circle = Utils.id('circle-progress');
        // SVG Logic: Radius=40, Circumference = 2 * PI * 40 ≈ 251.2
        const circumference = 251.2; 
        const offset = circumference - (circumference * percent) / 100;

        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = offset;

        const isSafe = percent >= target;
        circle.classList.remove(CONFIG.colors.safe, CONFIG.colors.danger);
        circle.classList.add(isSafe ? 'text-green-500' : 'text-red-500');
    },

    renderStatus(attended, total, target, percent) {
        const title = Utils.id('calc-status-title');
        const desc = Utils.id('calc-status-desc');
        const bunkEl = Utils.id('calc-bunks');
        const recoverEl = Utils.id('calc-recover');

        // Math Formulas
        const safeSkips = Math.floor((attended / (target / 100)) - total);
        const required = Math.ceil(((target / 100 * total) - attended) / (1 - target / 100));

        if (percent >= target) {
            title.innerText = "You're Safe!";
            title.className = "text-3xl md:text-4xl font-extrabold text-green-600 mb-2";
            desc.innerText = "Buffer available. You can chill a bit.";
            bunkEl.innerText = Math.max(0, safeSkips);
            recoverEl.innerText = 0;
        } else {
            title.innerText = "Warning!";
            title.className = "text-3xl md:text-4xl font-extrabold text-red-600 mb-2";
            desc.innerText = `Below ${target}%. Don't miss any more classes!`;
            bunkEl.innerText = 0;
            recoverEl.innerText = Math.max(0, required);
        }
    },

    renderForecast(attended, total, target) {
        const container = Utils.id('forecast-container');
        container.innerHTML = '';
        
        for (let i = 0; i <= 10; i++) {
            const projTotal = total + i;
            const projAttended = attended + i; // Assume perfect attendance next
            const pct = projTotal === 0 ? 0 : (projAttended / projTotal) * 100;
            
            const isMet = pct >= target;
            const height = Math.max(pct, 15); // Min height for visibility

            const bar = document.createElement('div');
            bar.className = `flex-1 rounded-t-sm mx-0.5 relative group ${isMet ? 'bg-green-400' : 'bg-gray-300'} hover:bg-indigo-500 transition-colors`;
            bar.style.height = `${height}%`;
            
            // Tooltip
            bar.innerHTML = `
                <div class="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-gray-800 text-white text-[10px] rounded py-1 px-2 whitespace-nowrap z-20 shadow-lg font-bold">
                    +${i}: ${pct.toFixed(1)}%
                </div>
            `;
            container.appendChild(bar);
        }
        
        // Target Line
        const line = document.createElement('div');
        line.className = "absolute w-full border-t border-dashed border-gray-400 opacity-50 z-10 pointer-events-none";
        line.style.bottom = `${target}%`;
        container.appendChild(line);
    }
};


// ============================================
// 2. GPA CALCULATOR MODULE
// ============================================
const gpaApp = {
    courses: [],

    init() {
        const saved = Utils.load(CONFIG.storageKeys.gpa);
        if (saved) this.courses = saved;
        if (this.courses.length === 0) this.addRow();
        this.render();
    },

    save() {
        Utils.save(CONFIG.storageKeys.gpa, this.courses);
    },

    addRow() {
        this.courses.push({ id: Date.now(), credits: 4, max: 100, obtained: 0 });
        this.save();
        this.render();
    },

    removeRow(id) {
        this.courses = this.courses.filter(c => c.id !== id);
        this.save();
        this.calculate(); // Recalc immediately
        this.render();
    },

    updateRow(id, field, value) {
        const course = this.courses.find(c => c.id === id);
        if (course) {
            course[field] = parseFloat(value) || 0;
            this.save();
            this.calculate();
        }
    },

    calculate() {
        let totalWeightedPoints = 0;
        let totalCredits = 0;

        this.courses.forEach(c => {
            if (c.max === 0 || c.credits === 0) return;

            // 1. Normalize to Percentage
            const percent = (c.obtained / c.max) * 100;

            // 2. Get Grade Point from Config Loop (Cleaner than if/else)
            const grade = CONFIG.gradingScale.find(scale => percent >= scale.min);
            const gradePoint = grade ? grade.points : 0;

            // 3. Weighting
            totalWeightedPoints += (gradePoint * c.credits);
            totalCredits += c.credits;
        });

        const gpa = totalCredits === 0 ? 0 : (totalWeightedPoints / totalCredits);
        Utils.id('gpa-result').innerText = gpa.toFixed(2);
        Utils.id('gpa-credits').innerText = totalCredits;
    },

    reset() {
        if (confirm("Clear all GPA data?")) {
            this.courses = [];
            this.addRow();
            this.render();
        }
    },

    render() {
        const list = Utils.id('gpa-list');
        list.innerHTML = '';

        this.courses.forEach((c, index) => {
            const row = document.createElement('div');
            row.className = "bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 relative group";
            
            const delBtn = `<button onclick="gpaApp.removeRow(${c.id})" class="absolute top-2 right-2 text-gray-300 hover:text-red-500 font-bold p-1 text-lg leading-none">×</button>`;
            
            row.innerHTML = `
                ${this.courses.length > 1 ? delBtn : ''}
                <div class="flex items-center gap-2">
                    <span class="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Subject ${index + 1}</span>
                </div>
                
                <div class="grid grid-cols-3 gap-3">
                    <div>
                        <label class="text-[10px] font-bold text-gray-400 uppercase">Credits</label>
                        <input type="number" value="${c.credits}" oninput="gpaApp.updateRow(${c.id}, 'credits', this.value)" class="w-full h-8 bg-gray-50 border border-gray-200 rounded text-center font-bold text-sm focus:ring-2 focus:ring-indigo-100 outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-gray-400 uppercase">Max Marks</label>
                        <input type="number" value="${c.max}" oninput="gpaApp.updateRow(${c.id}, 'max', this.value)" class="w-full h-8 bg-gray-50 border border-gray-200 rounded text-center font-bold text-sm focus:ring-2 focus:ring-indigo-100 outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-gray-400 uppercase">Received</label>
                        <input type="number" value="${c.obtained}" oninput="gpaApp.updateRow(${c.id}, 'obtained', this.value)" class="w-full h-8 bg-white border border-indigo-200 rounded text-center font-bold text-sm text-indigo-700 focus:ring-2 focus:ring-indigo-100 outline-none">
                    </div>
                </div>
            `;
            list.appendChild(row);
        });
        
        this.calculate();
    }
};


// ============================================
// 3. MAIN APPLICATION (Schedule & Attendance)
// ============================================
const app = {
    state: {
        schedule: {}, 
        stats: {},    
        history: {}  
    },

    init() {
        // Load State
        const saved = Utils.load(CONFIG.storageKeys.attendance);
        if (saved) this.state = saved;

        // Set Date
        Utils.id('current-date-display').innerText = Utils.formatDate();

        // Initialize Components
        this.loadTheme();
        calc.update();
        gpaApp.init();

        // Reset Holiday Toggle on load for safety
        const holidayToggle = Utils.id('holiday-toggle');
        if(holidayToggle) holidayToggle.checked = false;
        
        // Start on Calculator View
        this.view('calc');
    },

    save() {
        Utils.save(CONFIG.storageKeys.attendance, this.state);
    },

    // --- VIEW MANAGEMENT ---
    view(viewName) {
        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        // Show target
        Utils.id(`view-${viewName}`).classList.remove('hidden');
        
        // Update Nav
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        Utils.id(`btn-${viewName}`).classList.add('active');
        
        // Handle specific view requirements
        const holidayWrapper = Utils.id('holiday-wrapper');
        if (viewName === 'today') {
            holidayWrapper.classList.remove('hidden');
            this.renderToday();
        } else {
            holidayWrapper.classList.add('hidden');
        }

        if (viewName === 'stats') this.renderStats();
        if (viewName === 'schedule') this.renderScheduleList();
    },

    // --- THEME MANAGEMENT ---
    toggleTheme() {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        localStorage.setItem(CONFIG.storageKeys.theme, isDark ? 'dark' : 'light');
        this.updateThemeIcons(isDark);
    },

    loadTheme() {
        const theme = localStorage.getItem(CONFIG.storageKeys.theme);
        const isDark = theme === 'dark';
        if (isDark) document.body.classList.add('dark');
        this.updateThemeIcons(isDark);
    },

    updateThemeIcons(isDark) {
        Utils.id('icon-moon').classList.toggle('hidden', isDark);
        Utils.id('icon-sun').classList.toggle('hidden', !isDark);
    },

    // --- SCHEDULE LOGIC ---
    addToSchedule() {
        const day = Utils.id('sched-day').value;
        const subInput = Utils.id('sched-subject');
        const subject = subInput.value.trim();

        if (!subject) return;

        if (!this.state.schedule[day]) this.state.schedule[day] = [];
        // Init stats if new subject
        if (!this.state.stats[subject]) this.state.stats[subject] = { attended: 0, total: 0 };

        this.state.schedule[day].push(subject);
        subInput.value = '';
        
        this.save();
        this.renderScheduleList();
    },

    removeFromSchedule(day, index) {
        if (confirm("Remove this class from schedule?")) {
            this.state.schedule[day].splice(index, 1);
            this.save();
            this.renderScheduleList();
        }
    },

    // --- ATTENDANCE ACTIONS ---
    mark(subject, status) {
        const todayKey = Utils.getTodayKey();
        
        // Ensure history object exists
        if (!this.state.history[todayKey]) this.state.history[todayKey] = {};
        
        // Prevent double marking
        if (this.state.history[todayKey][subject]) {
            alert("Already marked for today!");
            return;
        }

        // Update counts
        this.state.stats[subject].total++;
        if (status === 'present') this.state.stats[subject].attended++;
        
        // Log history
        this.state.history[todayKey][subject] = status;

        this.save();
        this.renderToday();
    },

    toggleHoliday() {
        const isHoliday = Utils.id('holiday-toggle').checked;
        Utils.id('today-container').classList.toggle('hidden', isHoliday);
        Utils.id('holiday-banner').classList.toggle('hidden', !isHoliday);
    },

    resetAll() {
        if (confirm("Factory Reset: This will wipe your Schedule, Attendance, and GPA data. Continue?")) {
            localStorage.clear();
            location.reload();
        }
    },

    // --- RENDERING ---
    renderToday() {
        const container = Utils.id('today-container');
        const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const classes = this.state.schedule[dayName] || [];
        const todayKey = Utils.getTodayKey();
        const history = this.state.history[todayKey] || {};

        if (classes.length === 0) {
            container.innerHTML = `
                <div class="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-300">
                    <p class="text-gray-400 font-bold">No classes scheduled for ${dayName}.</p>
                    <button onclick="app.view('schedule')" class="mt-2 text-indigo-600 text-sm font-bold hover:underline">Edit Schedule</button>
                </div>`;
            return;
        }

        let html = `<h2 class="font-bold text-gray-800 mb-4">Your Schedule (${dayName})</h2><div class="space-y-3">`;

        classes.forEach(sub => {
            const isDone = history[sub];
            let actionButtons;
            
            if (isDone) {
                const color = isDone === 'present' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200';
                actionButtons = `<div class="px-4 py-3 rounded-lg border ${color} font-bold text-sm w-full text-center tracking-wide">MARKED ${isDone.toUpperCase()}</div>`;
            } else {
                actionButtons = `
                    <div class="flex gap-2 w-full">
                        <button onclick="app.mark('${sub}', 'present')" class="att-btn flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-200">Present</button>
                        <button onclick="app.mark('${sub}', 'absent')" class="att-btn flex-1 bg-white text-red-500 border border-red-100 py-3 rounded-xl font-bold hover:bg-red-50">Absent</button>
                    </div>`;
            }

            html += `
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-gray-700 text-lg">${sub}</span>
                        ${!isDone ? '<span class="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">Pending</span>' : ''}
                    </div>
                    ${actionButtons}
                </div>`;
        });
        
        container.innerHTML = html + `</div>`;
    },

    renderStats() {
        const list = Utils.id('stats-list');
        list.innerHTML = '';
        
        let totalAtt = 0, totalClasses = 0, totalSafe = 0;

        Object.keys(this.state.stats).forEach(subName => {
            const s = this.state.stats[subName];
            if (s.total === 0) return;

            const percent = (s.attended / s.total) * 100;
            const safeSkips = Math.floor((s.attended / 0.75) - s.total);
            const required = Math.ceil(((0.75 * s.total) - s.attended) / 0.25);
            const isSafe = percent >= 75;

            totalAtt += s.attended;
            totalClasses += s.total;
            if (safeSkips > 0) totalSafe += safeSkips;

            list.innerHTML += `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div class="flex justify-between mb-1 items-end">
                        <span class="font-bold text-gray-800">${subName}</span>
                        <span class="${isSafe ? 'text-green-600' : 'text-red-600'} font-black text-xl">${percent.toFixed(0)}%</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-2 mb-2">
                        <div class="${isSafe ? 'bg-green-500' : 'bg-red-500'} h-2 rounded-full" style="width: ${percent}%"></div>
                    </div>
                    <div class="flex justify-between text-xs">
                        <span class="text-gray-400 font-medium">${s.attended}/${s.total} Classes</span>
                        <span class="${isSafe ? 'text-green-600' : 'text-red-600'} font-bold">
                            ${isSafe ? `Safe to bunk: ${safeSkips}` : `Attend next: ${required}`}
                        </span>
                    </div>
                </div>`;
        });

        const global = totalClasses === 0 ? 100 : (totalAtt / totalClasses) * 100;
        Utils.id('stat-total-percent').innerText = global.toFixed(0) + '%';
        Utils.id('stat-safe-bunks').innerText = totalSafe;
    },

    renderScheduleList() {
        const list = Utils.id('schedule-list');
        list.innerHTML = '';
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        let isEmpty = true;

        days.forEach(day => {
            const subs = this.state.schedule[day];
            if (subs && subs.length > 0) {
                isEmpty = false;
                let items = '';
                subs.forEach((sub, idx) => {
                    items += `
                        <span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-indigo-100">
                            ${sub} 
                            <button onclick="app.removeFromSchedule('${day}', ${idx})" class="text-indigo-300 hover:text-red-500 ml-1 text-lg leading-none">×</button>
                        </span>`;
                });
                
                list.innerHTML += `
                    <div class="mb-4">
                        <h4 class="font-bold text-[10px] uppercase text-gray-400 mb-2 tracking-wider">${day}</h4>
                        <div class="flex flex-wrap gap-2">${items}</div>
                    </div>`;
            }
        });

        if (isEmpty) {
            list.innerHTML = `<div class="text-center text-gray-400 text-sm py-4">Your schedule is empty. Add a class above!</div>`;
        }
    }
};

// --- INITIALIZATION ---
// Ensure DOM is ready before running
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
