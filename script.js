const $ = id => document.getElementById(id);

function pad(n){
    return String(n).padStart(2,"0");
}


function formatDate(iso){
    if(!iso) return "—";
    const [y,m,d] = iso.split("-");
    return `${d}/${m}/${y}`;
}

function todayISO(){
    const n = new Date();
    return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}`;
}

function escapeHTML(str){
    return String(str).replace(/[&<>"']/g, c => ({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#39;"
    }[c]));
}

let idCounter = 0;
function newId(){
    idCounter++;
    return Date.now() * 1000 + (idCounter % 1000);
}

function pick(list){
    return list[Math.floor(Math.random() * list.length)];
}

function loadList(key){
    try{
        const data = JSON.parse(localStorage.getItem(key));
        return Array.isArray(data) ? data : [];
    }
    catch{
        return [];
    }
}

function loadObj(key, fallback){
    try{
        const data = JSON.parse(localStorage.getItem(key));
        if(data && typeof data === "object" && !Array.isArray(data)){
            return fallback ? { ...fallback, ...data } : data;
        }
    }
    catch{}
    return fallback;
}

function saveJSON(key, value){
    try{
        localStorage.setItem(key, JSON.stringify(value));
    }
    catch{}
}

const ICONS = {
    play:  '<path d="M8 5v14l11-7z"/>',
    pause: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
    prev:  '<path d="M6 6h2v12H6zM20 6v12L9.5 12z"/>',
    next:  '<path d="M16 6h2v12h-2zM4 6l10.5 6L4 18z"/>',
    vol:   '<path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    mute:  '<path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
};

function icon(name){
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}

document.querySelectorAll("[data-icon]").forEach(el => {
    el.innerHTML = icon(el.dataset.icon);
});


const themeSelect = $("themeSelect");
const themeDialog = $("themeDialog");

const THEME_KEYS   = ["bg","card","item","input","text","muted","accent","green"];
const PRESET_NAMES = ["dark","light","ocean","sunset"];

let customTheme = loadObj("customTheme", null);    

function luminance(hex){
    const n = parseInt(hex.slice(1), 16);

    const [r,g,b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function clearThemeVars(){
    const s = document.body.style;

    THEME_KEYS.forEach(k => s.removeProperty("--" + k));
    ["--radius","--on-accent","color-scheme"].forEach(p => s.removeProperty(p));
}

function paintCustom(t){
    const s = document.body.style;

    THEME_KEYS.forEach(k => s.setProperty("--" + k, t[k]));

    s.setProperty("--radius", (t.radius ?? 25) + "px");
    s.setProperty("--on-accent", luminance(t.accent) > 0.5 ? "#111827" : "#ffffff");
    s.setProperty("color-scheme", luminance(t.bg) > 0.5 ? "light" : "dark");
}

function applyTheme(name){

    clearThemeVars();

    if(name === "custom" && customTheme){
        paintCustom(customTheme);
    }
    else if(!PRESET_NAMES.includes(name)){
        name = "dark";
    }

    document.body.dataset.theme = name;
    themeSelect.value = name;

    localStorage.setItem("theme", name);
}

function readPreset(name){

    const b = document.body;
    const prevTheme = b.dataset.theme;
    const prevStyle = b.getAttribute("style");

    b.removeAttribute("style");
    b.dataset.theme = name;

    const cs = getComputedStyle(b);
    const colors = {};

    THEME_KEYS.forEach(k => colors[k] = cs.getPropertyValue("--" + k).trim());

    b.dataset.theme = prevTheme;
    if(prevStyle) b.setAttribute("style", prevStyle);

    return colors;
}


const colorInputs = [...themeDialog.querySelectorAll("input[type=color]")];
const radiusInput = $("themeRadius");
const radiusOut   = $("themeRadiusOut");
const themeBase   = $("themeBase");

let themeBefore = "dark";     
let themeSaved  = false;

function fillEditor(t){
    colorInputs.forEach(i => i.value = t[i.dataset.key]);
    radiusInput.value = t.radius ?? 25;
    radiusOut.textContent = radiusInput.value + "px";
}

function readEditor(){
    const t = {};

    colorInputs.forEach(i => t[i.dataset.key] = i.value);
    t.radius = Number(radiusInput.value);

    return t;
}

function openThemeEditor(){

    themeBefore = document.body.dataset.theme;
    themeSaved  = false;

    const start = customTheme
        ? customTheme
        : { ...readPreset(PRESET_NAMES.includes(themeBefore) ? themeBefore : "dark"), radius:25 };

    fillEditor(start);

    paintCustom(readEditor());
    document.body.dataset.theme = "custom";
    themeSelect.value = "custom";

    themeDialog.showModal();
}

colorInputs.forEach(i => i.addEventListener("input", () => paintCustom(readEditor())));

radiusInput.addEventListener("input", () => {
    radiusOut.textContent = radiusInput.value + "px";
    paintCustom(readEditor());
});

themeBase.addEventListener("change", () => {

    if(!themeBase.value) return;

    const t = { ...readPreset(themeBase.value), radius:Number(radiusInput.value) };

    fillEditor(t);
    paintCustom(t);

    themeBase.value = "";
});

$("themeSaveBtn").addEventListener("click", () => {
    customTheme = readEditor();
    saveJSON("customTheme", customTheme);

    themeSaved = true;
    applyTheme("custom");
    themeDialog.close();
});

$("themeCancelBtn").addEventListener("click", () => themeDialog.close());
$("themeCloseBtn").addEventListener("click",  () => themeDialog.close());

themeDialog.addEventListener("close", () => {
    if(!themeSaved) applyTheme(themeBefore);
});

themeSelect.addEventListener("change", () => {

    if(themeSelect.value === "custom"){
        if(customTheme) applyTheme("custom");
        else openThemeEditor();
    }
    else{
        applyTheme(themeSelect.value);
    }
});

$("themeEditBtn").addEventListener("click", openThemeEditor);

(function initTheme(){
    let saved = localStorage.getItem("theme");

    if(saved === "custom" && !customTheme) saved = "dark";
    if(saved !== "custom" && !PRESET_NAMES.includes(saved)) saved = "dark";

    applyTheme(saved);
})();

const nameInput = $("nameInput");

let userName = localStorage.getItem("userName") || "Tenzy";

function fitNameWidth(){
    nameInput.style.width = Math.max(3, nameInput.value.length + 1) + "ch";
}

nameInput.value = userName;
fitNameWidth();

nameInput.addEventListener("input", fitNameWidth);

nameInput.addEventListener("keydown", e => {
    if(e.key === "Enter") nameInput.blur();
});

nameInput.addEventListener("change", () => {

    const value = nameInput.value.trim();

    userName = value === "" ? "Tenzy" : value;

    nameInput.value = userName;
    fitNameWidth();

    localStorage.setItem("userName", userName);

    catSay("greet", "Nice to meet you, {name}!");
});

const catImg    = $("catImg");
const quoteText = $("quoteText");

const MOODS = {

    chill:{
        sprites:[5, 11, 6],
        quotes:[
            "Drink some water. Your brain needs it!",
            "Roll your shoulders back. Better already!",
            "Breathe in... breathe out.",
            "A tiny stretch goes a long way.",
            "Look away from the screen for 20 seconds."
        ]
    },

    friend:{
        sprites:[8, 6, 2],
        quotes:[
            "I'm right here with you.",
            "We make a good team!",
            "You don't have to do it all at once.",
            "Need a break? I'll keep watch."
        ]
    },

    study:{
        sprites:[1, 12],
        quotes:[
            "One thing at a time. You've got this!",
            "Small steps still count.",
            "Start with the easiest task!",
            "Focus mode: on."
        ]
    },

    sleepy:{
        sprites:[7],
        quotes:[
            "Zzz... oh, I'm awake! Are you resting enough?",
            "A short nap could do wonders.",
            "Yawn... remember to sleep on time."
        ]
    },

    play:{
        sprites:[3, 11],
        quotes:[
            "Psst... you're doing great.",
            "Click me again. I dare you.",
            "I'd high-five you if I had fingers.",
            "Did somebody say snacks?"
        ]
    },

    greet:{
        sprites:[4, 2, 10],
        quotes:[ "Hi {name}!" ]
    },

    praise:{
        sprites:[10, 12, 11, 4],
        quotes:[
            "Nice work, {name}!",
            "Another one done!",
            "Look at you go!",
            "Crushed it!"
        ]
    },

    celebrate:{
        sprites:[12, 10],
        quotes:[
            "Everything is done! Time to relax.",
            "All tasks complete! You're amazing!",
            "Done and dusted, {name}!"
        ]
    },

    added:{
        sprites:[4, 11, 2],
        quotes:[
            "New task added. Let's go!",
            "Added! One step closer.",
            "Got it, I'll remember that."
        ]
    },

    urgent:{
        sprites:[9, 12],
        quotes:[
            "That one's urgent! Let's tackle it first.",
            "Urgent noted. Deep breath, you can do it."
        ]
    },

    alert:{
        sprites:[9],
        quotes:[
            "Heads up! Something is overdue.",
            "Psst, a task ran past its time!"
        ]
    },

    sessionStart:{
        sprites:[1, 12],
        quotes:[
            "Session started. You've got this!",
            "Let's focus. I'll be quiet... mostly."
        ]
    },

    sessionDone:{
        sprites:[12, 10],
        quotes:[
            "Session complete! Take a short break.",
            "Great session, {name}!"
        ]
    },

    timesup:{
        sprites:[9],
        quotes:[
            "Time's up!",
            "Ding ding! Time's up!"
        ]
    }
};

function timeGreeting(){

    const h = new Date().getHours();

    if(h >= 5  && h < 12) return pick(["Good morning, {name}! Let's make today count.", "Rise and shine, {name}!"]);
    if(h >= 12 && h < 18) return pick(["Good afternoon, {name}! Keep it going.", "Afternoon, {name}! How's it going?"]);
    if(h >= 18 && h < 23) return pick(["Good evening, {name}! Almost there.", "Evening, {name}. Proud of today's effort?"]);

    return pick(["It's late, {name}. Don't forget to rest!", "Night owl mode? Don't forget to sleep!"]);
}

let lastCatAt    = 0;
let lastQuote    = "";
let catReady     = false;       


for(let i = 1; i <= 12; i++){
    const img = new Image();
    img.src = `images/cat/cat${i}.png`;
}


function catSay(mood, forcedText){

    const m = MOODS[mood] || MOODS.chill;

    let text = forcedText;

    if(!text){
        const options = m.quotes.filter(q => q !== lastQuote);
        text = pick(options.length ? options : m.quotes);
    }

    lastQuote = text;
    lastCatAt = Date.now();

    quoteText.textContent = text.replace("{name}", userName);
    catImg.src = `images/cat/cat${pick(m.sprites)}.png`;


    catImg.classList.remove("pop");
    quoteText.classList.remove("swap");
    void catImg.offsetWidth;
    catImg.classList.add("pop");
    quoteText.classList.add("swap");
}


$("catBtn").addEventListener("click", () => {
    catSay(pick(["play","play","chill","friend","study","sleepy"]));
});


setInterval(() => {

    if(Date.now() - lastCatAt < 20000) return;

    const h = new Date().getHours();
    const late = h >= 23 || h < 5;

    catSay(late ? "sleepy" : pick(["chill","friend","study","play","sleepy"]));

}, 5000);



let tasks = loadList("tasks").map(t => ({
    id:     t.id || newId(),
    text:   t.text,
    date:   t.date  || "",
    start:  t.start || "",
    end:    t.end   || "",
    urgent: !!t.urgent,
    done:   !!t.done
}));

function saveTasks(){
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function getDeadline(task){
    if(!task.date) return null;

    const time = task.end || task.start;
    const d = new Date(`${task.date}T${time || "23:59"}`);

    if(!time) d.setSeconds(59);

    return d;
}

function isOverdue(task){
    if(task.done) return false;

    const deadline = getDeadline(task);
    return deadline !== null && deadline < new Date();
}

function timeLabel(task){
    if(task.start && task.end) return `${task.start}-${task.end}`;
    if(task.start)             return task.start;
    if(task.end)               return `until ${task.end}`;
    return "all day";
}

let knownOverdue = new Set();

function checkNewOverdue(){

    const now = new Set(tasks.filter(isOverdue).map(t => t.id));

    let fresh = false;
    now.forEach(id => { if(!knownOverdue.has(id)) fresh = true; });

    knownOverdue = now;

    if(fresh && catReady) catSay("alert");
}

function updateStats(){

    const total     = tasks.length;
    const completed = tasks.filter(t => t.done).length;
    const overdue   = tasks.filter(isOverdue).length;
    const pending   = total - completed - overdue;

    $("completedTasks").textContent = completed;
    $("overdueTasks").textContent   = overdue;
    $("pendingTasks").textContent   = pending;

    const percent = total === 0 ? 0 : Math.round(completed / total * 100);

    $("progressPct").textContent = percent + "%";
    $("progressFill").style.width = percent + "%";

    let message = "Keep going";

    if(total === 0)          message = "Add a task to begin";
    else if(percent === 100) message = "All done! 🎉";
    else if(percent >= 75)   message = "Almost there!";

    $("progressMsg").textContent = message;

    checkNewOverdue();
}

function renderTasks(){

    const list = $("taskList");

    list.innerHTML = "";

    const ordered = [...tasks].sort((a,b) =>
        (b.urgent && !b.done) - (a.urgent && !a.done)
    );

    ordered.forEach(task => {

        const li = document.createElement("li");

        if(task.done) li.classList.add("completed");
        if(task.urgent && !task.done) li.classList.add("urgent");

        const overdue = isOverdue(task);
        if(overdue) li.classList.add("overdue");

        li.innerHTML = `
            <span class="taskName">${escapeHTML(task.text)}</span>

            <span class="taskMeta">date: ${formatDate(task.date)}</span>

            <span class="taskMeta">time: ${timeLabel(task)}</span>

            ${task.urgent && !task.done ? '<span class="tag urgentTag">Urgent</span>' : ""}

            ${overdue ? '<span class="tag">Overdue</span>' : ""}

            <div class="taskBtns">
                <button class="flagBtn ${task.urgent ? "on" : ""}" title="Urgent or not"
                        onclick="toggleUrgent(${task.id})">!</button>
                <button class="complete" onclick="toggleTask(${task.id})">✓</button>
                <button class="delete" onclick="deleteTask(${task.id})">X</button>
            </div>
        `;

        list.appendChild(li);
    });

    updateStats();
}

function addTask(){

    const input = $("taskInput");
    const error = $("taskError");

    const text   = input.value.trim();
    const date   = $("taskDate").value || todayISO();
    const start  = $("taskStart").value;
    const end    = $("taskEnd").value;
    const urgent = $("taskUrgent").checked;

    error.textContent = "";

    if(text === "") return;

    if(start && end && end <= start){
        error.textContent = "End time must be after the start time.";
        return;
    }

    tasks.push({
        id: newId(),
        text,
        date,
        start,
        end,
        urgent,
        done: false
    });

    input.value = "";
    $("taskDate").value  = todayISO();
    $("taskStart").value = "";
    $("taskEnd").value   = "";
    $("taskUrgent").checked = false;

    saveTasks();
    renderTasks();

    taskDialog.close();

    catSay(urgent ? "urgent" : "added");
}

function toggleTask(id){

    const task = tasks.find(t => t.id === id);
    if(!task) return;

    task.done = !task.done;

    saveTasks();
    renderTasks();

    if(task.done){
        const allDone = tasks.every(t => t.done);
        catSay(allDone ? "celebrate" : "praise");
    }
}

function toggleUrgent(id){

    const task = tasks.find(t => t.id === id);
    if(!task) return;

    task.urgent = !task.urgent;

    saveTasks();
    renderTasks();

    if(task.urgent) catSay("urgent");
}

function deleteTask(id){

    tasks = tasks.filter(t => t.id !== id);

    saveTasks();
    renderTasks();
}

$("addTaskBtn").addEventListener("click", addTask);



let events = loadList("events").map(e => ({
    id:   e.id || newId(),
    date: e.date,
    text: e.text
}));

function saveEvents(){
    localStorage.setItem("events", JSON.stringify(events));
}

function addEvent(){

    const dateInput = $("eventDate");
    const textInput = $("eventText");

    const date = dateInput.value;
    const text = textInput.value.trim();

    if(!date || !text) return;

    events.push({
        id: newId(),
        date,
        text
    });

    saveEvents();
    renderEvents();

    dateInput.value = "";
    textInput.value = "";

    eventDialog.close();
}

function deleteEvent(id){

    events = events.filter(e => e.id !== id);

    saveEvents();
    renderEvents();
}

function renderEvents(){

    events.sort((a,b) => new Date(a.date) - new Date(b.date));

    const list = $("eventList");

    list.innerHTML = "";

    events.forEach(event => {

        const li = document.createElement("li");

        li.innerHTML = `
            <span>
                ${formatDate(event.date)}<br>
                ${escapeHTML(event.text)}
            </span>

            <button class="delete" onclick="deleteEvent(${event.id})">X</button>
        `;

        list.appendChild(li);
    });
}

$("addEventBtn").addEventListener("click", addEvent);


const taskDialog  = $("taskDialog");
const eventDialog = $("eventDialog");
const clockDialog = $("clockDialog");

$("openTaskBtn").addEventListener("click", () => {
    $("taskError").textContent = "";
    if(!$("taskDate").value) $("taskDate").value = todayISO();
    taskDialog.showModal();
    $("taskInput").focus();
});

$("openEventBtn").addEventListener("click", () => {
    if(!$("eventDate").value) $("eventDate").value = todayISO();
    eventDialog.showModal();
    $("eventText").focus();
});

document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => $(btn.dataset.close).close());
});

[taskDialog, eventDialog, clockDialog, themeDialog].forEach(d => {
    d.addEventListener("click", e => {
        if(e.target !== d) return;

        const r = d.getBoundingClientRect();
        const outside = e.clientX < r.left || e.clientX > r.right ||
                        e.clientY < r.top  || e.clientY > r.bottom;

        if(outside) d.close();
    });
});


taskDialog.addEventListener("keydown", e => {
    if(e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox"){
        e.preventDefault();
        addTask();
    }
});

eventDialog.addEventListener("keydown", e => {
    if(e.key === "Enter" && e.target.tagName === "INPUT"){
        e.preventDefault();
        addEvent();
    }
});


const digitEls = document.querySelectorAll(".digit");


digitEls.forEach(el => {
    el.innerHTML = `
        <div class="half upper"><span>0</span></div>
        <div class="half lower"><span>0</span></div>
        <div class="half flap flapTop"><span>0</span></div>
        <div class="half flap flapBottom"><span>0</span></div>
    `;
    el.dataset.value = "";
});

function setDigit(el, value, animate){

    const old = el.dataset.value;

    if(old === value) return;

    const upper = el.querySelector(".upper span");
    const lower = el.querySelector(".lower span");
    const fTop  = el.querySelector(".flapTop span");
    const fBot  = el.querySelector(".flapBottom span");

    el.dataset.value = value;
    clearTimeout(el.flipTimer);
    el.classList.remove("flipping");

    if(!animate || old === ""){
        upper.textContent = lower.textContent = value;
        fTop.textContent  = fBot.textContent  = value;
        return;
    }

    upper.textContent = value;   
    fTop.textContent  = old;     
    fBot.textContent  = value;   
    lower.textContent = old;     

    void el.offsetWidth;         
    el.classList.add("flipping");

    el.flipTimer = setTimeout(() => {
        lower.textContent = value;
        el.classList.remove("flipping");
    }, 620);
}

function setDigits(str, animate){
    digitEls.forEach((el,i) => setDigit(el, str[i], animate));
}


const clockSettings = loadObj("clockSettings", {
    timerSec:    300,        
    sessionName: "Study",
    sessionMin:  25        
});

let sessionsToday = loadObj("sessionsToday", { date: todayISO(), count: 0 });

function ensureToday(){
    if(sessionsToday.date !== todayISO()){
        sessionsToday = { date: todayISO(), count: 0 };
        saveJSON("sessionsToday", sessionsToday);
    }
}

const MODES = ["clock","stopwatch","timer","session"];

let clockMode = localStorage.getItem("clockMode");
if(!MODES.includes(clockMode)) clockMode = "clock";

let is24h = localStorage.getItem("clock24") !== "false";     

function newCounter(){
    return { running:false, acc:0, start:0, active:false };
}

const ctr = {
    stopwatch: newCounter(),
    timer:     newCounter(),
    session:   newCounter()
};

function elapsed(c){
    return c.acc + (c.running ? Date.now() - c.start : 0);
}

function resetCounter(c){
    c.running = false;
    c.acc     = 0;
    c.start   = 0;
    c.active  = false;
}


function durationMs(mode){
    if(mode === "timer")   return clockSettings.timerSec * 1000;
    if(mode === "session") return clockSettings.sessionMin * 60000;
    return 0;
}

let audioCtx = null;

function unlockAudio(){

    if(!audioCtx){
        try{
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        catch{}
    }

    if(audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}

function beep(times = 3){

    if(!audioCtx) return;

    for(let i = 0; i < times; i++){

        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        const t = audioCtx.currentTime + i * 0.35;

        osc.type = "sine";
        osc.frequency.value = 880;

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(t);
        osc.stop(t + 0.3);
    }
}


function currentDisplay(){

    const now = new Date();

    if(clockMode === "clock"){

        let h = now.getHours();
        const suffix = h >= 12 ? "PM" : "AM";

        if(!is24h) h = h % 12 || 12;

        return {
            str: pad(h) + pad(now.getMinutes()) + pad(now.getSeconds()),
            suffix: is24h ? "" : suffix
        };
    }

    let secs;

    if(clockMode === "stopwatch"){
        secs = Math.floor(elapsed(ctr.stopwatch) / 1000);
    }
    else{
        const left = Math.max(0, durationMs(clockMode) - elapsed(ctr[clockMode]));
        secs = Math.ceil(left / 1000);
    }

    secs = Math.min(secs, 99 * 3600 + 59 * 60 + 59);

    const h = Math.floor(secs / 3600);
    const m = Math.floor(secs % 3600 / 60);
    const s = secs % 60;

    return { str: pad(h) + pad(m) + pad(s), suffix: "" };
}

function clockLabelText(suffix){

    if(clockMode === "clock")     return suffix;
    if(clockMode === "stopwatch") return "Stopwatch";

    if(clockMode === "timer"){
        const s = clockSettings.timerSec;
        return `Timer · ${pad(Math.floor(s/3600))}:${pad(Math.floor(s%3600/60))}:${pad(s%60)}`;
    }

    ensureToday();

    const name = clockSettings.sessionName || "Session";
    const min  = clockSettings.sessionMin;

    return ctr.session.active
        ? `${name} · Session ${sessionsToday.count + 1} · ${min} min`
        : `${name} · ${min} min · ${sessionsToday.count} done today`;
}

function refreshClockUI(){

    const c = ctr[clockMode];
    const isClock = clockMode === "clock";

    $("clockStartBtn").hidden = isClock;
    $("clockResetBtn").hidden = isClock;
    $("clockEditBtn").hidden  = !(clockMode === "timer" || clockMode === "session");
    $("formatBtn").hidden     = !isClock;

    if(c){
        let text = "Start";

        if(c.running)                        text = "Pause";
        else if(c.active && c.acc > 0)       text = "Resume";
        else if(clockMode === "session")     text = "Start session";

        $("clockStartBtn").textContent = text;
    }

    $("formatBtn").textContent = is24h ? "24h" : "12h";

    $("modeSelect").value = clockMode;

    updateSessionBar();
}

function updateSessionBar(){

    const row = $("sessionRow");
    const inSession = clockMode === "session" && ctr.session.active;

    row.classList.toggle("invisible", !inSession);

    if(!inSession) return;

    const pct = Math.min(100, elapsed(ctr.session) / durationMs("session") * 100);

    $("sessionFill").style.width = pct + "%";
    $("sessionPct").textContent  = Math.floor(pct) + "%";
}


function finishCountdown(mode){

    resetCounter(ctr[mode]);

    if(mode === "session"){
        ensureToday();
        sessionsToday.count++;
        saveJSON("sessionsToday", sessionsToday);
    }

    const box = $("flipClock");
    box.classList.remove("done");
    void box.offsetWidth;
    box.classList.add("done");
    setTimeout(() => box.classList.remove("done"), 6500);

    beep();

    catSay(mode === "session" ? "sessionDone" : "timesup");

    refreshClockUI();
}

/* ---------- buttons ---------- */

let instantNext = false;      // true = switch digits without the flip animation

$("modeSelect").addEventListener("change", () => {
    clockMode = $("modeSelect").value;
    localStorage.setItem("clockMode", clockMode);

    instantNext = true;
    refreshClockUI();
    tick();
});

$("clockStartBtn").addEventListener("click", () => {

    unlockAudio();

    const c = ctr[clockMode];
    if(!c) return;

    if(c.running){                                   
        c.acc = elapsed(c);
        c.running = false;
    }
    else{                                            
        const startingFresh = c.acc === 0;

        c.running = true;
        c.start   = Date.now();
        c.active  = true;

        if(clockMode === "session" && startingFresh) catSay("sessionStart");
    }

    refreshClockUI();
    tick();
});

$("clockResetBtn").addEventListener("click", () => {

    const c = ctr[clockMode];
    if(!c) return;

    resetCounter(c);

    refreshClockUI();
    tick();
});

$("formatBtn").addEventListener("click", () => {
    is24h = !is24h;
    localStorage.setItem("clock24", is24h);

    instantNext = true;
    refreshClockUI();
    tick();
});


$("clockEditBtn").addEventListener("click", () => {

    $("clockError").textContent = "";

    const isTimer = clockMode === "timer";

    $("clockDialogTitle").textContent = isTimer ? "Edit timer" : "Edit session";
    $("timerFields").hidden   = !isTimer;
    $("sessionFields").hidden = isTimer;
    $("resetCountBtn").hidden = isTimer;

    if(isTimer){
        const s = clockSettings.timerSec;
        $("timerH").value = Math.floor(s / 3600);
        $("timerM").value = Math.floor(s % 3600 / 60);
        $("timerS").value = s % 60;
    }
    else{
        $("sessionName").value = clockSettings.sessionName;
        $("sessionMin").value  = clockSettings.sessionMin;
    }

    clockDialog.showModal();
    (isTimer ? $("timerM") : $("sessionName")).focus();
});

$("saveClockBtn").addEventListener("click", () => {

    const error = $("clockError");
    error.textContent = "";

    if(clockMode === "timer"){

        const h = Math.max(0, parseInt($("timerH").value) || 0);
        const m = Math.max(0, parseInt($("timerM").value) || 0);
        const s = Math.max(0, parseInt($("timerS").value) || 0);

        const total = h * 3600 + m * 60 + s;

        if(total < 1){
            error.textContent = "The timer needs at least 1 second.";
            return;
        }

        clockSettings.timerSec = Math.min(total, 99 * 3600 + 59 * 60 + 59);
        resetCounter(ctr.timer);
    }
    else{

        const name = $("sessionName").value.trim() || "Study";
        const min  = parseInt($("sessionMin").value);

        if(!(min >= 1 && min <= 600)){
            error.textContent = "Minutes per session must be between 1 and 600.";
            return;
        }

        clockSettings.sessionName = name;
        clockSettings.sessionMin  = min;
        resetCounter(ctr.session);
    }

    saveJSON("clockSettings", clockSettings);

    clockDialog.close();

    refreshClockUI();
    tick();
});

$("resetCountBtn").addEventListener("click", () => {
    sessionsToday = { date: todayISO(), count: 0 };
    saveJSON("sessionsToday", sessionsToday);

    clockDialog.close();
    refreshClockUI();
    tick();
});

clockDialog.addEventListener("keydown", e => {
    if(e.key === "Enter" && e.target.tagName === "INPUT"){
        e.preventDefault();
        $("saveClockBtn").click();
    }
});


let lastMinute = -1;

function tick(){

    const now = new Date();

    $("dateText").textContent =
        `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}`;

    $("dayText").textContent =
        now.toLocaleDateString("en-GB", { weekday:"long" });

    ["timer","session"].forEach(mode => {
        const c = ctr[mode];
        if(c.running && elapsed(c) >= durationMs(mode)) finishCountdown(mode);
    });

    const d = currentDisplay();

    setDigits(d.str, !instantNext);
    instantNext = false;

    $("clockLabel").textContent = clockLabelText(d.suffix);

    updateSessionBar();

    if(now.getMinutes() !== lastMinute){
        lastMinute = now.getMinutes();
        renderTasks();
    }
}

setInterval(tick, 250);

/* =========================================================
   YOUTUBE  (shared by the music player and the video box)
   ========================================================= */

const FILE_MESSAGE =
    "YouTube won't play when index.html is opened by double-clicking it. " +
    "Open the folder in VS Code, right-click index.html > Open with Live Server.";

let ytApiRequested = false;
let ytWaiting = [];
let ytFailed  = [];

function withYouTubeAPI(onReady, onFail){

    if(window.YT && YT.Player){
        onReady();
        return;
    }

    ytWaiting.push(onReady);
    if(onFail) ytFailed.push(onFail);

    if(ytApiRequested) return;
    ytApiRequested = true;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";

    tag.onerror = () => {
        const failed = ytFailed;

        ytApiRequested = false;
        ytWaiting = [];
        ytFailed  = [];

        failed.forEach(fn => fn());
    };

    document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = () => {
    const waiting = ytWaiting;

    ytWaiting = [];
    ytFailed  = [];

    waiting.forEach(fn => fn());
};

// works out what a YouTube link is: a video, a playlist, or both
function getYouTubeInfo(url){

    let u;
    try{ u = new URL(url); }
    catch{ return null; }

    const host = u.hostname.replace(/^(www|m|music)\./, "");
    let id = null;

    if(host === "youtu.be"){
        id = u.pathname.slice(1).split("/")[0];
    }
    else if(host === "youtube.com"){
        if(u.pathname === "/watch"){
            id = u.searchParams.get("v");
        }
        else{
            const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/);
            if(m) id = m[2];
        }
    }
    else{
        return null;
    }

    const list = u.searchParams.get("list") || "";

    if(!id && !list) return null;

    // YouTube's automatic "Mix" playlists (RD...) can't be embedded
    const isMix = /^RD/.test(list);

    return {
        id:         id || "",
        list:       isMix ? "" : list,
        mixIgnored: isMix && !!id,
        mixOnly:    isMix && !id,
        index:      Math.max(0, (parseInt(u.searchParams.get("index"), 10) || 1) - 1)
    };
}


/* =========================================================
   MUSIC PLAYER
   Paste a YouTube video, a YouTube PLAYLIST, or a direct audio
   link (.mp3 ...), then press play (or Enter).
   ========================================================= */

const audio      = $("audio");
const musicInput = $("musicInput");
const musicBtn   = $("musicBtn");
const prevBtn    = $("prevBtn");
const nextBtn    = $("nextBtn");
const muteBtn    = $("muteBtn");
const volInput   = $("vol");
const seekInput  = $("seek");
const musicTitle = $("musicTitle");
const musicSub   = $("musicSub");
const artImg     = $("musicArtImg");

const AUDIO_ERROR = "Couldn't play that link. Use a YouTube link or a direct .mp3 link.";

const music = {
    mode:        null,       
    url:         "",        
    isPlaylist:  false,
    ready:       false,     
    loopSet:     false,
    baseSub:     "",
    msgActive:   false,
    muted:       localStorage.getItem("musicMuted") === "true"
};

let ytPlayer = null;
let seeking  = false;

function fmtTime(sec){

    sec = Math.max(0, Math.floor(sec || 0));

    const h = Math.floor(sec / 3600);
    const m = Math.floor(sec % 3600 / 60);
    const s = sec % 60;

    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function setPlayIcon(playing){
    musicBtn.innerHTML = icon(playing ? "pause" : "play");
}

function musicMsg(text, isError = false){
    music.msgActive = !!text;
    musicSub.textContent = text || music.baseSub;
    musicSub.classList.toggle("error", isError);
}

function clearMusicMsg(){
    if(!music.msgActive) return;

    music.msgActive = false;
    musicSub.textContent = music.baseSub;
    musicSub.classList.remove("error");
}

function setArt(url){
    if(url){
        artImg.src = url;
        artImg.hidden = false;
    }
    else{
        artImg.hidden = true;
        artImg.removeAttribute("src");
    }
}

artImg.addEventListener("error", () => { artImg.hidden = true; });

function setNowPlaying(title, sub, artUrl){
    musicTitle.textContent = title || "Nothing playing";
    music.baseSub = sub || "";

    if(!music.msgActive) musicSub.textContent = music.baseSub;

    if(artUrl !== undefined) setArt(artUrl);
}

function updateTransport(){
    prevBtn.disabled = !music.mode;
    nextBtn.disabled = !(music.mode === "youtube" && music.isPlaylist);
}


function applyVolume(){

    const v = Number(volInput.value);

    audio.volume = v / 100;
    audio.muted  = music.muted;

    if(ytPlayer && music.ready && ytPlayer.setVolume){
        ytPlayer.setVolume(v);
        if(music.muted) ytPlayer.mute();
        else ytPlayer.unMute();
    }

    const silent = music.muted || v === 0;

    muteBtn.innerHTML = icon(silent ? "mute" : "vol");
    muteBtn.title = silent ? "Unmute" : "Mute";
}

volInput.addEventListener("input", () => {

    if(Number(volInput.value) > 0) music.muted = false;

    localStorage.setItem("musicVol", volInput.value);
    localStorage.setItem("musicMuted", music.muted);

    applyVolume();
});

muteBtn.addEventListener("click", () => {

    music.muted = !music.muted;

    if(!music.muted && Number(volInput.value) === 0) volInput.value = 50;

    localStorage.setItem("musicVol", volInput.value);
    localStorage.setItem("musicMuted", music.muted);

    applyVolume();
});


function makeYtPlaceholder(){
    document.querySelector(".ytHolder").innerHTML = '<div id="ytPlayer"></div>';
}

function youTubeError(code){

    if(music.isPlaylist && (code === 101 || code === 150) && ytPlayer && ytPlayer.nextVideo){
        musicMsg("Skipped a video that can't be played here.");
        ytPlayer.nextVideo();
        return;
    }

    if(musicTitle.textContent === "Loading...") setNowPlaying("Nothing playing", "", "");

    if(code === 101 || code === 150){
        musicMsg("The owner doesn't allow this video to play outside YouTube.", true);
    }
    else if(code === 100){
        musicMsg("Video not found (it may be private or deleted).", true);
    }
    else if(code === 152 || code === 153){
        musicMsg(
            location.protocol === "file:"
                ? FILE_MESSAGE
                : "YouTube blocked this video from playing here. Try a different video or an .mp3 link.",
            true
        );
    }
    else{
        musicMsg(`YouTube error ${code}. Try a different link.`, true);
    }

    music.url = "";
    setPlayIcon(false);
}

function playYouTube(info){

    withYouTubeAPI(() => {

        music.isPlaylist = !!info.list;
        music.loopSet    = false;
        updateTransport();

        if(ytPlayer && music.ready){

            if(info.list){
                ytPlayer.loadPlaylist({ list:info.list, listType:"playlist", index:info.index });
            }
            else{
                ytPlayer.loadVideoById(info.id);
            }

            return;
        }

        if(ytPlayer){
            try{ ytPlayer.destroy(); }
            catch{}

            ytPlayer = null;
            music.ready = false;
            makeYtPlaceholder();
        }

        const vars = { autoplay:1, playsinline:1 };

        if(location.protocol.startsWith("http")) vars.origin = location.origin;

        if(info.list){
            vars.list     = info.list;
            vars.listType = "playlist";
            vars.index    = info.index;
        }

        ytPlayer = new YT.Player("ytPlayer", {
            width:  "200",
            height: "200",
            videoId: info.list ? undefined : info.id,
            playerVars: vars,

            events: {

                onReady: e => {
                    music.ready = true;
                    applyVolume();
                    e.target.playVideo();
                },

                onStateChange: e => {

                    if(e.data === 1){                        
                        setPlayIcon(true);
                        clearMusicMsg();

                      
                        if(music.isPlaylist && !music.loopSet && ytPlayer.setLoop){
                            music.loopSet = true;
                            ytPlayer.setLoop(true);
                        }

                        updateMusicUI();
                    }

                    if(e.data === 2) setPlayIcon(false);     

                    if(e.data === 0 && !music.isPlaylist){   
                        ytPlayer.seekTo(0);
                        ytPlayer.playVideo();
                    }
                },

                onError: e => youTubeError(e.data)
            }
        });

    }, () => {
        stopMusic();
        setNowPlaying("Nothing playing", "", "");
        musicMsg("Couldn't load YouTube. Check your internet or turn off your ad blocker for this page.", true);
    });
}


function watchYouTubeStart(){

    let tries = 0;

    const timer = setInterval(() => {

        tries++;

        if(music.mode !== "youtube"){                
            clearInterval(timer);
            return;
        }

        const ready = music.ready && ytPlayer && ytPlayer.getPlayerState;
        const state = ready ? ytPlayer.getPlayerState() : null;

        if(state === 1){                             
            clearInterval(timer);
            return;
        }

        if(tries === 8 && state !== 3){              
            musicMsg(
                ready
                    ? "Press play again to start (your browser blocked autoplay)."
                    : "YouTube is slow to load. Check your internet or turn off your ad blocker for this page.",
                true
            );
        }

        if(tries >= 40) clearInterval(timer);

    }, 500);
}


function stopMusic(){

    audio.pause();

    if(audio.getAttribute("src")){
        audio.removeAttribute("src");
        audio.load();
    }

    if(ytPlayer && music.ready && ytPlayer.pauseVideo) ytPlayer.pauseVideo();

    music.mode = null;
    music.url  = "";
    music.isPlaylist = false;

    setPlayIcon(false);
    updateTransport();
}

function startMusicLink(raw){

    let url = raw.trim();

    if(!/^https?:\/\//i.test(url)) url = "https://" + url;

    stopMusic();
    musicMsg("");
    setNowPlaying("Nothing playing", "", "");

    let u;
    try{ u = new URL(url); }
    catch{
        musicMsg("That doesn't look like a link.", true);
        return;
    }

    if(/(^|\.)(spotify|soundcloud|deezer)\.com$/.test(u.hostname) || u.hostname === "music.apple.com"){
        musicMsg("Spotify / SoundCloud links can't be played here. Use YouTube or a direct .mp3 link.", true);
        return;
    }

    const yt = getYouTubeInfo(url);

    if(yt && yt.mixOnly){
        musicMsg("YouTube auto-mixes can't be played. Use a normal playlist or a video link.", true);
        return;
    }

    if(yt && location.protocol === "file:"){
        musicMsg(FILE_MESSAGE, true);
        return;
    }

    music.url = raw.trim();
    localStorage.setItem("musicLink", music.url);

    if(yt){

        music.mode = "youtube";
        music.isPlaylist = !!yt.list;

        setNowPlaying(
            "Loading...",
            yt.list ? "Playlist" : "",
            yt.id ? `https://i.ytimg.com/vi/${yt.id}/mqdefault.jpg` : ""
        );

        musicMsg(yt.mixIgnored ? "Mix playlists can't be played, so only this video will play." : "Loading...");

        playYouTube(yt);
        watchYouTubeStart();
    }
    else{

        music.mode = "audio";

        let name = "Audio";
        try{ name = decodeURIComponent(u.pathname.split("/").pop()) || "Audio"; }
        catch{}

        setNowPlaying(name.replace(/\.[a-z0-9]+$/i, ""), "Audio file", "");

        audio.src = url;
        audio.play().catch(() => {
            if(audio.getAttribute("src")) musicMsg(AUDIO_ERROR, true);
        });
    }

    updateTransport();
}

function handleMusic(){

    const raw = musicInput.value.trim();

    if(raw === ""){
        musicMsg("Paste a link first.", true);
        return;
    }

    if(raw !== music.url){
        startMusicLink(raw);
        return;
    }

    if(music.mode === "audio"){
        if(audio.paused) audio.play().catch(() => musicMsg(AUDIO_ERROR, true));
        else audio.pause();
    }
    else if(music.mode === "youtube"){

        if(!music.ready || !ytPlayer || !ytPlayer.getPlayerState){
            musicMsg("Still loading YouTube, one moment...");
            return;
        }

        const state = ytPlayer.getPlayerState();

        if(state === 1 || state === 3) ytPlayer.pauseVideo();
        else ytPlayer.playVideo();
    }
}

musicBtn.addEventListener("click", handleMusic);

musicInput.addEventListener("keydown", e => {
    if(e.key === "Enter") handleMusic();
});

prevBtn.addEventListener("click", () => {

    if(music.mode === "audio"){
        audio.currentTime = 0;
    }
    else if(music.mode === "youtube" && music.ready){

        if(music.isPlaylist && ytPlayer.getCurrentTime() < 3) ytPlayer.previousVideo();
        else ytPlayer.seekTo(0, true);
    }
});

nextBtn.addEventListener("click", () => {
    if(music.mode === "youtube" && music.isPlaylist && music.ready) ytPlayer.nextVideo();
});

audio.addEventListener("play",  () => setPlayIcon(true));
audio.addEventListener("pause", () => { if(music.mode === "audio") setPlayIcon(false); });

audio.addEventListener("playing", () => clearMusicMsg());

audio.addEventListener("error", () => {
    if(audio.getAttribute("src")){
        musicMsg(AUDIO_ERROR, true);
        music.url = "";
        setPlayIcon(false);
    }
});


function updateMusicUI(){

    let cur = 0;
    let dur = 0;

    if(music.mode === "audio"){
        cur = audio.currentTime || 0;
        dur = isFinite(audio.duration) ? audio.duration : 0;
    }
    else if(music.mode === "youtube" && music.ready && ytPlayer && ytPlayer.getCurrentTime){

        cur = ytPlayer.getCurrentTime() || 0;
        dur = ytPlayer.getDuration() || 0;

        const data = ytPlayer.getVideoData ? ytPlayer.getVideoData() : null;

        if(data && data.video_id){

            let sub = data.author || "";

            if(music.isPlaylist && ytPlayer.getPlaylist){
                const list = ytPlayer.getPlaylist();
                const idx  = ytPlayer.getPlaylistIndex();

                if(list && list.length) sub += ` • ${idx + 1} / ${list.length}`;
            }

            if(musicTitle.textContent !== data.title || music.baseSub !== sub){
                setNowPlaying(
                    data.title,
                    sub,
                    `https://i.ytimg.com/vi/${data.video_id}/mqdefault.jpg`
                );
            }
        }
    }

    if(!seeking){
        seekInput.value = dur ? cur / dur * 1000 : 0;
        $("timeNow").textContent = fmtTime(cur);
    }

    $("timeTotal").textContent = fmtTime(dur);
}

function currentDuration(){
    if(music.mode === "audio")   return isFinite(audio.duration) ? audio.duration : 0;
    if(music.mode === "youtube" && music.ready && ytPlayer.getDuration) return ytPlayer.getDuration() || 0;
    return 0;
}

seekInput.addEventListener("input", () => {
    seeking = true;
    $("timeNow").textContent = fmtTime(currentDuration() * seekInput.value / 1000);
});

seekInput.addEventListener("change", () => {

    const t = currentDuration() * seekInput.value / 1000;

    if(music.mode === "audio") audio.currentTime = t;
    else if(music.mode === "youtube" && music.ready) ytPlayer.seekTo(t, true);

    seeking = false;
});

setInterval(updateMusicUI, 500);


const mediaImg      = $("mediaImg");
const mediaVideo    = $("mediaVideo");
const mediaYTWrap   = $("mediaYTWrap");
const mediaEmpty    = $("mediaEmpty");
const mediaMuteBtn  = $("mediaMuteBtn");
const mediaEditBtn  = $("mediaEditBtn");
const mediaPanel    = $("mediaPanel");
const mediaInput    = $("mediaInput");
const mediaFile     = $("mediaFile");
const mediaStatus   = $("mediaStatus");

const DEFAULT_MEDIA = { type:"image", src:"images/profile.gif" };
const VIDEO_EXT = /\.(mp4|webm|ogv|ogg|mov|m4v)(\?|#|$)/i;

let mediaYT = null;
let mediaYTReady = false;
let mediaMuted = true;
let mediaToken = 0;           
let mediaObjectUrl = "";      

function setMediaPanel(open){
    mediaPanel.hidden = !open;
    mediaEditBtn.textContent = open ? "✕" : "✎";
}

function applyMediaMute(){

    mediaVideo.muted = mediaMuted;

    if(mediaYT && mediaYTReady && mediaYT.mute){
        if(mediaMuted) mediaYT.mute();
        else mediaYT.unMute();
    }

    mediaMuteBtn.innerHTML = icon(mediaMuted ? "mute" : "vol");
    mediaMuteBtn.title = mediaMuted ? "Turn the sound on" : "Mute";
}

function stopMedia(){

    mediaToken++;

    mediaVideo.pause();

    if(mediaVideo.getAttribute("src")){
        mediaVideo.removeAttribute("src");
        mediaVideo.load();
    }

    if(mediaYT){
        try{ mediaYT.destroy(); }
        catch{}

        mediaYT = null;
        mediaYTReady = false;
        mediaYTWrap.querySelector(".ytInner").innerHTML = '<div id="mediaYTPlayer"></div>';
    }
}

function startMediaYouTube(id){

    const token = mediaToken;

    withYouTubeAPI(() => {

        if(token !== mediaToken) return;            

        const vars = {
            autoplay:1, mute:1, controls:0, loop:1, playlist:id,
            modestbranding:1, rel:0, playsinline:1, disablekb:1, fs:0, iv_load_policy:3
        };

        if(location.protocol.startsWith("http")) vars.origin = location.origin;

        mediaYT = new YT.Player("mediaYTPlayer", {
            width:"640",
            height:"360",
            videoId:id,
            playerVars:vars,

            events:{
                onReady: e => {
                    mediaYTReady = true;
                    applyMediaMute();
                    e.target.playVideo();
                },

                onError: e => {
                    const code = e.data;

                    mediaStatus.textContent =
                        (code === 101 || code === 150)
                            ? "The owner doesn't allow this video to be embedded."
                            : (code === 152 || code === 153) && location.protocol === "file:"
                                ? FILE_MESSAGE
                                : `YouTube error ${code}. Try a different video.`;

                    localStorage.removeItem("media");
                    showMedia(DEFAULT_MEDIA.type, DEFAULT_MEDIA.src);
                    setMediaPanel(true);
                }
            }
        });

    }, () => {
        mediaStatus.textContent = "Couldn't load YouTube. Check your internet or turn off your ad blocker for this page.";
        showMedia(DEFAULT_MEDIA.type, DEFAULT_MEDIA.src);
        setMediaPanel(true);
    });
}

function showMedia(type, src){

    stopMedia();

    mediaMuted = true;                             
    mediaEmpty.hidden   = true;
    mediaImg.hidden     = type !== "image";
    mediaVideo.hidden   = type !== "video";
    mediaYTWrap.hidden  = type !== "youtube";
    mediaMuteBtn.hidden = type === "image";

    if(type === "image"){
        mediaImg.src = src;
    }
    else if(type === "video"){
        mediaVideo.muted = true;
        mediaVideo.src = src;
        mediaVideo.play().catch(() => {});
    }
    else{
        startMediaYouTube(src);
    }

    applyMediaMute();
}

function commitMedia(type, src, remember = true){

    showMedia(type, src);

    if(remember){
        try{
            localStorage.setItem("media", JSON.stringify({ type, src }));
            mediaStatus.textContent = "";
        }
        catch{
            localStorage.removeItem("media");
            mediaStatus.textContent = "Showing it, but the file is too big to remember after a refresh.";
            return;
        }
    }

    setMediaPanel(false);
}

function testImage(src){
    return new Promise(resolve => {
        const img = new Image();
        img.onload  = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
    });
}

function testVideo(src){
    return new Promise(resolve => {

        const v = document.createElement("video");
        v.preload = "metadata";

        const done = ok => {
            clearTimeout(timer);
            v.removeAttribute("src");
            v.load();
            resolve(ok);
        };

        const timer = setTimeout(() => done(false), 8000);

        v.onloadedmetadata = () => done(true);
        v.onerror = () => done(false);

        v.src = src;
    });
}


function normalizeMediaLink(raw){

    let url = raw.trim();

    if(!/^https?:\/\//i.test(url)) url = "https://" + url;


    if(location.protocol === "https:") url = url.replace(/^http:\/\//i, "https://");

    const m = url.match(/^https?:\/\/(?:www\.)?giphy\.com\/(?:gifs|stickers|embed)\/(?:[^\/?#]*-)?([A-Za-z0-9]+)/i);

    if(m) url = `https://media.giphy.com/media/${m[1]}/giphy.gif`;

    return url;
}

async function useMediaLink(){

    const raw = mediaInput.value.trim();

    if(raw === ""){
        mediaStatus.textContent = "Paste a link first.";
        return;
    }

    const url = normalizeMediaLink(raw);
    const yt  = getYouTubeInfo(url);

    if(yt){

        if(!yt.id){
            mediaStatus.textContent = "Paste a link to one video (not a whole playlist).";
            return;
        }

        if(location.protocol === "file:"){
            mediaStatus.textContent = FILE_MESSAGE;
            return;
        }

        commitMedia("youtube", yt.id);
        return;
    }

    mediaStatus.textContent = "Loading...";

    if(VIDEO_EXT.test(url)){

        if(await testVideo(url)) commitMedia("video", url);
        else mediaStatus.textContent = "Couldn't load that video. Check the link (it must go straight to the file).";

        return;
    }

    if(await testImage(url))      commitMedia("image", url);
    else if(await testVideo(url)) commitMedia("video", url);
    else{
        mediaStatus.textContent =
            "Couldn't load that. Right-click the GIF > \"Copy image address\" and paste that link.";
    }
}


mediaEditBtn.addEventListener("click", () => {
    setMediaPanel(mediaPanel.hidden);
    mediaStatus.textContent = "";
    if(!mediaPanel.hidden) mediaInput.focus();
});

$("mediaUseBtn").addEventListener("click", useMediaLink);

mediaInput.addEventListener("keydown", e => {
    if(e.key === "Enter") useMediaLink();
});

$("mediaUploadBtn").addEventListener("click", () => mediaFile.click());

mediaFile.addEventListener("change", () => {

    const file = mediaFile.files[0];
    mediaFile.value = "";

    if(!file) return;

    if(file.type.startsWith("video/")){

        if(mediaObjectUrl) URL.revokeObjectURL(mediaObjectUrl);
        mediaObjectUrl = URL.createObjectURL(file);

        localStorage.removeItem("media");
        showMedia("video", mediaObjectUrl);

        mediaStatus.textContent = "Playing it now. Uploaded videos aren't remembered after a refresh. Use a link to keep it.";
        return;
    }

    if(!file.type.startsWith("image/")){
        mediaStatus.textContent = "That file isn't an image or a video.";
        return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
        if(await testImage(reader.result)) commitMedia("image", reader.result);
        else mediaStatus.textContent = "Couldn't read that image.";
    };

    reader.readAsDataURL(file);
});

$("mediaResetBtn").addEventListener("click", () => {
    localStorage.removeItem("media");
    mediaInput.value = "";
    mediaStatus.textContent = "";
    showMedia(DEFAULT_MEDIA.type, DEFAULT_MEDIA.src);
    setMediaPanel(false);
});

mediaMuteBtn.addEventListener("click", () => {
    mediaMuted = !mediaMuted;
    applyMediaMute();
});
mediaImg.addEventListener("error", () => {

    if(mediaImg.getAttribute("src") !== DEFAULT_MEDIA.src){
        localStorage.removeItem("media");
        showMedia(DEFAULT_MEDIA.type, DEFAULT_MEDIA.src);
    }
    else{
        mediaImg.hidden = true;
        mediaEmpty.hidden = false;
    }
});

(function initMedia(){

    let saved = loadObj("media", null);

    if(!saved){
        const old = localStorage.getItem("gifSrc");
        if(old) saved = { type:"image", src:old };
    }

    const usable = saved && saved.type && saved.src &&
                   !(saved.type === "youtube" && location.protocol === "file:");

    if(usable) showMedia(saved.type, saved.src);
    else       showMedia(DEFAULT_MEDIA.type, DEFAULT_MEDIA.src);
})();


(function init(){

    const savedVol = localStorage.getItem("musicVol");
    if(savedVol !== null) volInput.value = savedVol;

    applyVolume();
    setPlayIcon(false);
    updateTransport();

    const savedLink = localStorage.getItem("musicLink");
    if(savedLink) musicInput.value = savedLink;

    refreshClockUI();
    tick();
    renderTasks();
    renderEvents();

    catReady = true;
    catSay("greet", timeGreeting());
})();
