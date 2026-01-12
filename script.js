// ============================================
// 1. QUICK CALCULATOR LOGIC
// ============================================
const calc = {
    update() {
        const totalInput = document.getElementById('calc-total');
        const attendedInput = document.getElementById('calc-attended');
        const targetInput = document.getElementById('calc-target');

        const total = parseInt(totalInput.value) || 0;
        const attended = parseInt(attendedInput.value) || 0;
        const target = parseInt(targetInput.value) || 75;

        // Logic check: Cannot attend more than total
        if (attended > total) {
            attendedInput.value = total;
            return this.update();
        }

        // 1. Percent Calculation
        const percent = total === 0 ? 100 : ((attended / total) * 100);
        document.getElementById('calc-percent').innerText = percent.toFixed(0) + '%';
        document.getElementById('target-display').innerText = target + '%';

        // 2. Circle Progress Logic
        // Radius=40 in 100x100 viewBox. Circumference = 2 * PI * 40 = ~251.2
        const circle = document.getElementById('circle-progress');
        const circumference = 251.2; 
        const offset = circumference - (circumference * percent) / 100;

        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = offset;

        const isSafe = percent >= target;
        circle.classList.remove('text-green-500', 'text-red-500');
        circle.classList.add(isSafe ? 'text-green-500' : 'text-red-500');

        // 3. Status Text
        const title = document.getElementById('calc-status-title');
        const desc = document.getElementById('calc-status-desc');
        const bunkEl = document.getElementById('calc-bunks');
        const recoverEl = document.getElementById('calc-recover');

        // Formula: Skips = (Attended / Target%) - Total
        const safeSkips = Math.floor((attended / (target/100)) - total);
        
        // Formula: Catchup = (Target% * Total - Attended) / (1 - Target%)
        const required = Math.ceil(((target/100 * total) - attended) / (1 - target/100));

        if (percent >= target) {
            title.innerText = "You're Safe!";
            title.className = "text-3xl md:text-4xl font-extrabold text-green-600 mb-2";
            desc.innerText = `Buffer available. You can chill a bit.`;
            bunkEl.innerText = safeSkips > 0 ? safeSkips : 0;
            recoverEl.innerText = 0;
        } else {
            title.innerText = "Warning!";
            title.className = "text-3xl md:text-4xl font-extrabold text-red-600 mb-2";
            desc.innerText = `Below ${target}%. Don't miss any more classes!`;
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
        
        // Generate next 10 classes
        for(let i = 0; i <= 10; i++) {
            const projectedTotal = total + i;
            const projectedAttended = attended + i; 
            const pct = projectedTotal === 0 ? 0 : (projectedAttended / projectedTotal) * 100;
            
            const isTargetMet = pct >= target;
            const colorClass = isTargetMet ? 'bg-green-400' : 'bg-gray-300';
            const height = Math.max(pct, 15); // Min height visually

            const bar = document.createElement('div');
            bar.className = `flex-1 rounded-t-sm mx-0.5 relative group ${colorClass} hover:bg-indigo-500 transition-colors`;
            bar.style.height = `${height}%`;
            
            // Tooltip
            bar.innerHTML = `
                <div class="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-gray-800 text-white text-[10px] rounded py-1 px-2 whitespace-nowrap z-20 shadow-lg font-bold">
                    +${i} classes: ${pct.toFixed(1)}%
                </div>
            `;
            container.appendChild(bar);
        }
        
        // Target Line
        const line = document.createElement('div');
        line.className = "absolute w-full border-t border-dashed border-gray-400 opacity-50 z-10 pointer-events-none";
        line.style.bottom = `${target}%`;
        line.style.left = 0;
        container.appendChild(line);
    }
};

// ============================================
// 2. GPA CALCULATOR LOGIC
// ============================================
const gpaApp = {
    courses: [],

    init() {
        const saved = localStorage.getItem('gpa_v1');
        if (saved) {
            this.courses = JSON.parse(saved);
        }
        if (this.courses.length === 0) this.addRow();
        this.render();
    },

    save() {
        localStorage.setItem('gpa_v1', JSON.stringify(this.courses));
    },

    addRow() {
        this.courses.push({ id: Date.now(), credits: 4, max: 100, obtained: 0 });
        this.save();
        this.render();
    },

    removeRow(id) {
        this.courses = this.courses.filter(c => c.id !== id);
        this.save();
        this.calculate();
        this.render();
    },

    updateRow(id, field, value) {
        const course = this.courses.find(c => c.id === id);
        course[field] = parseFloat(value) || 0;
        this.save();
        this.calculate();
    },

    calculate() {
        let totalWeightedPoints = 0;
        let totalCredits = 0;

        this.courses.forEach(c => {
            if (c.max === 0 || c.credits === 0) return;

            // Normalize to Percentage
            const percent = (c.obtained / c.max) * 100;

            // University Specific Ladder
            let gradePoint = 0;
            if (percent >= 90)      gradePoint = 10;
            else if (percent >= 85) gradePoint = 9;
            else if (percent >= 75) gradePoint = 8;
            else if (percent >= 65) gradePoint = 7;
            else if (percent >= 55) gradePoint = 6;
            else if (percent >= 43) gradePoint = 5;
            else if (percent >= 40) gradePoint = 4;
            else                    gradePoint = 0;

            totalWeightedPoints += (gradePoint * c.credits);
            totalCredits += c.credits;
        });

        const gpa = totalCredits === 0 ? 0 : (totalWeightedPoints / totalCredits);
        document.getElementById('gpa-result').innerText = gpa.toFixed(2);
        document.getElementById('gpa-credits').innerText = totalCredits;
    },

    reset() {
        if(confirm("Clear all GPA data?")) {
            this.courses = [];
            this.addRow();
            this.render();
        }
    },

    render() {
        const list = document.getElementById('gpa-list');
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
// 3. MAIN APP LOGIC (Schedule & Attendance)
// ============================================
const app = {
    state: {
        schedule: {}, 
        stats: {},    
        history: {},  
    },

    init() {
        const saved = localStorage.getItem('att_smart_v2');
        if (saved) this.state = JSON.parse(saved);

        // Date Display
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date-display').innerText = new Date().toLocaleDateString('en-US', options);

        // Init Sub-Apps
        calc.update();
        gpaApp.init();

        // Check if holiday toggle was left on (reset on reload for safety)
        document.getElementById('holiday-toggle').checked = false;
        
        // Default View
        this.view('calc');
    },

    save() {
        localStorage.setItem('att_smart_v2', JSON.stringify(this.state));
    },

    // --- Schedule ---
    addToSchedule() {
        const day = document.getElementById('sched-day').value;
        const subInput = document.getElementById('sched-subject');
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
        if(confirm("Remove this class from schedule?")) {
            this.state.schedule[day].splice(index, 1);
            this.save();
            this.renderScheduleList();
        }
    },

    // --- Attendance Action ---
    mark(subject, status) {
        const todayKey = new Date().toISOString().split('T')[0];
        
        if (!this.state.history[todayKey]) this.state.history[todayKey] = {};
        if (this.state.history[todayKey][subject]) return alert("Already marked for today!");

        // Update counts
        this.state.stats[subject].total++;
        if (status === 'present') this.state.stats[subject].attended++;
        
        // Log history
        this.state.history[todayKey][subject] = status;

        this.save();
        this.renderToday();
    },

    toggleHoliday() {
        const isHoliday = document.getElementById('holiday-toggle').checked;
        const container = document.getElementById('today-container');
        const banner = document.getElementById('holiday-banner');

        if(isHoliday) {
            container.classList.add('hidden');
            banner.classList.remove('hidden');
        } else {
            container.classList.remove('hidden');
            banner.classList.add('hidden');
        }
    },

    // --- Renders ---
    renderToday() {
        const container = document.getElementById('today-container');
        const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const classes = this.state.schedule[dayName] || [];
        const todayKey = new Date().toISOString().split('T')[0];
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
            let actionButtons = '';
            
            if (isDone) {
                const color = isDone === 'present' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200';
                actionButtons = `<div class="px-4 py-3 rounded-lg border ${color} font-bold text-sm w-full text-center tracking-wide">MARKED ${isDone.toUpperCase()}</div>`;
            } else {
                actionButtons = `
                    <div class="flex gap-2 w-full">
                        <button onclick="app.mark('${sub}', 'present')" class="att-btn flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-200">Present</button>
                        <button onclick="app.mark('${sub}', 'absent')" class="att-btn flex-1 bg-white text-red-500 border border-red-100 py-3 rounded-xl font-bold hover:bg-red-50">Absent</button>
                    </div>
                `;
            }

            html += `
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-gray-700 text-lg">${sub}</span>
                        <span class="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">Pending</span>
                    </div>
                    ${actionButtons}
                </div>
            `;
        });
        
        container.innerHTML = html + `</div>`;
    },

    renderStats() {
        const list = document.getElementById('stats-list');
        list.innerHTML = '';
        
        let totalAtt = 0, totalClasses = 0, totalSafe = 0;

        Object.keys(this.state.stats).forEach(subName => {
            const s = this.state.stats[subName];
            if (s.total === 0) return; // Skip empty subjects

            const percent = (s.attended / s.total) * 100;
            const safeSkips = Math.floor((s.attended / 0.75) - s.total);
            const required = Math.ceil(((0.75 * s.total) - s.attended) / 0.25);
            const isSafe = percent >= 75;

            totalAtt += s.attended;
            totalClasses += s.total;
            if (safeSkips > 0) totalSafe += safeSkips;

            const barColor = isSafe ? 'bg-green-500' : 'bg-red-500';
            const textColor = isSafe ? 'text-green-600' : 'text-red-600';

            list.innerHTML += `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div class="flex justify-between mb-1 items-end">
                        <span class="font-bold text-gray-800">${subName}</span>
                        <span class="${textColor} font-black text-xl">${percent.toFixed(0)}%</span>
                    </div>
                    
                    <div class="w-full bg-gray-100 rounded-full h-2 mb-2">
                        <div class="${barColor} h-2 rounded-full" style="width: ${percent}%"></div>
                    </div>

                    <div class="flex justify-between text-xs">
                        <span class="text-gray-400 font-medium">${s.attended}/${s.total} Classes</span>
                        <span class="${textColor} font-bold">${isSafe ? `Safe to bunk: ${safeSkips}` : `Attend next: ${required}`}</span>
                    </div>
                </div>
            `;
        });

        const global = totalClasses === 0 ? 100 : (totalAtt / totalClasses) * 100;
        document.getElementById('stat-total-percent').innerText = global.toFixed(0) + '%';
        document.getElementById('stat-safe-bunks').innerText = totalSafe;
    },

    renderScheduleList() {
        const list = document.getElementById('schedule-list');
        list.innerHTML = '';
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        days.forEach(day => {
            const subs = this.state.schedule[day];
            if (subs && subs.length > 0) {
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
                    </div>
                `;
            }
        });
        
        if (list.innerHTML === '') {
            list.innerHTML = `<div class="text-center text-gray-400 text-sm py-4">Your schedule is empty. Add a class above!</div>`;
        }
    },

    resetAll() {
        if(confirm("Factory Reset: This will wipe your Schedule, Attendance, and GPA data. Continue?")) {
            localStorage.clear();
            location.reload();
        }
    },

    view(v) {
        // 1. Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        // 2. Show target view
        document.getElementById(`view-${v}`).classList.remove('hidden');
        
        // 3. Update Nav Buttons
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(`btn-${v}`).classList.add('active');
        
        // 4. Toggle Holiday Visibility
        const holidayWrapper = document.getElementById('holiday-wrapper');
        if (v === 'today') holidayWrapper.classList.remove('hidden');
        else holidayWrapper.classList.add('hidden');

        // 5. Trigger Renders
        if (v === 'today') this.renderToday();
        if (v === 'stats') this.renderStats();
        if (v === 'schedule') this.renderScheduleList();
    }
};

// Start App
app.init();