

function pad(n){
    return String(n).padStart(2,"0");
}

// "2026-11-12"  ->  "12/11/2026"   (d/m/y)
function formatDate(iso){
    if(!iso) return "—";
    const [y,m,d] = iso.split("-");
    return `${d}/${m}/${y}`;
}

function todayISO(){
    const n = new Date();
    return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}`;
}

// stops user text from being treated as HTML
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

function loadList(key){
    try{
        const data = JSON.parse(localStorage.getItem(key));
        return Array.isArray(data) ? data : [];
    }
    catch{
        return [];
    }
}


/* =========================================================
   TASKS  (text + date + time range)
   ========================================================= */

// old saved tasks (without date/time/id) still work
let tasks = loadList("tasks").map(t => ({
    id:    t.id || newId(),
    text:  t.text,
    date:  t.date  || "",
    start: t.start || "",
    end:   t.end   || "",
    done:  !!t.done
}));

function saveTasks(){
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// the moment a task is "due": end time, else start time, else end of that day
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

function updateStats(){

    const total     = tasks.length;
    const completed = tasks.filter(t => t.done).length;
    const overdue   = tasks.filter(isOverdue).length;
    const pending   = total - completed - overdue;

    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("overdueTasks").textContent   = overdue;
    document.getElementById("pendingTasks").textContent   = pending;

    // progress bar + message
    const percent = total === 0 ? 0 : Math.round(completed / total * 100);

    document.getElementById("progressPct").textContent = percent + "%";
    document.getElementById("progressFill").style.width = percent + "%";

    let message = "Keep going";

    if(total === 0)        message = "Add a task to begin";
    else if(percent === 100) message = "All done! 🎉";
    else if(percent >= 75)   message = "Almost there!";

    document.getElementById("progressMsg").textContent = message;
}

function renderTasks(){

    const list = document.getElementById("taskList");

    list.innerHTML = "";

    tasks.forEach(task => {

        const li = document.createElement("li");

        if(task.done) li.classList.add("completed");

        const overdue = isOverdue(task);
        if(overdue) li.classList.add("overdue");

        li.innerHTML = `
            <span class="taskName">${escapeHTML(task.text)}</span>

            <span class="taskMeta">date: ${formatDate(task.date)}</span>

            <span class="taskMeta">time: ${timeLabel(task)}</span>

            ${overdue ? '<span class="tag">Overdue</span>' : ""}

            <div class="taskBtns">
                <button class="complete" onclick="toggleTask(${task.id})">✓</button>
                <button class="delete" onclick="deleteTask(${task.id})">X</button>
            </div>
        `;

        list.appendChild(li);
    });

    updateStats();
}

function addTask(){

    const input = document.getElementById("taskInput");
    const error = document.getElementById("taskError");

    const text  = input.value.trim();
    const date  = document.getElementById("taskDate").value || todayISO();
    const start = document.getElementById("taskStart").value;
    const end   = document.getElementById("taskEnd").value;

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
        done: false
    });

    input.value = "";
    document.getElementById("taskDate").value  = todayISO();
    document.getElementById("taskStart").value = "";
    document.getElementById("taskEnd").value   = "";

    saveTasks();
    renderTasks();
}

function toggleTask(id){

    const task = tasks.find(t => t.id === id);
    if(!task) return;

    task.done = !task.done;

    saveTasks();
    renderTasks();
}

function deleteTask(id){

    tasks = tasks.filter(t => t.id !== id);

    saveTasks();
    renderTasks();
}

document.getElementById("addTaskBtn").addEventListener("click", addTask);

document.getElementById("taskInput").addEventListener("keydown", e => {
    if(e.key === "Enter") addTask();
});

document.getElementById("taskDate").value = todayISO();


/* =========================================================
   EVENT PLANNER
   ========================================================= */

let events = loadList("events").map(e => ({
    id:   e.id || newId(),
    date: e.date,
    text: e.text
}));

function saveEvents(){
    localStorage.setItem("events", JSON.stringify(events));
}

function addEvent(){

    const dateInput = document.getElementById("eventDate");
    const textInput = document.getElementById("eventText");

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
}

function deleteEvent(id){

    events = events.filter(e => e.id !== id);

    saveEvents();
    renderEvents();
}

function renderEvents(){

    events.sort((a,b) => new Date(a.date) - new Date(b.date));

    const list = document.getElementById("eventList");

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

document.getElementById("addEventBtn").addEventListener("click", addEvent);

document.getElementById("eventText").addEventListener("keydown", e => {
    if(e.key === "Enter") addEvent();
});


/* =========================================================
   FLIP CLOCK  +  DATE
   ========================================================= */

const digitEls = document.querySelectorAll(".digit");
const ampmEl   = document.getElementById("ampm");
const formatBtn = document.getElementById("formatBtn");

let is24h = localStorage.getItem("clock24") !== "false";   // default 24h

// build the 4 layers inside every digit card
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

    const upper  = el.querySelector(".upper span");
    const lower  = el.querySelector(".lower span");
    const fTop   = el.querySelector(".flapTop span");
    const fBot   = el.querySelector(".flapBottom span");

    el.dataset.value = value;
    clearTimeout(el.flipTimer);
    el.classList.remove("flipping");

    // first draw, or format switch: no animation
    if(!animate || old === ""){
        upper.textContent = lower.textContent = value;
        fTop.textContent  = fBot.textContent  = value;
        return;
    }

    upper.textContent = value;   // new number (top, shown as flap lifts)
    fTop.textContent  = old;     // old number (top flap falling)
    fBot.textContent  = value;   // new number (bottom flap landing)
    lower.textContent = old;     // old number (bottom, covered at the end)

    void el.offsetWidth;         // restart the CSS animation
    el.classList.add("flipping");

    el.flipTimer = setTimeout(() => {
        lower.textContent = value;
        el.classList.remove("flipping");
    }, 620);
}

let lastMinute = -1;

function updateClock(animate = true){

    const now = new Date();

    let h = now.getHours();
    const suffix = h >= 12 ? "PM" : "AM";

    if(!is24h) h = h % 12 || 12;

    const str = pad(h) + pad(now.getMinutes()) + pad(now.getSeconds());

    digitEls.forEach((el,i) => setDigit(el, str[i], animate));

    ampmEl.textContent   = is24h ? "" : suffix;
    formatBtn.textContent = is24h ? "24h" : "12h";

    // date in d/m/y
    document.getElementById("dateText").textContent =
        `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}`;

    document.getElementById("dayText").textContent =
        now.toLocaleDateString("en-GB",{ weekday:"long" });

    // once a minute, re-check which tasks became overdue
    if(now.getMinutes() !== lastMinute){
        lastMinute = now.getMinutes();
        renderTasks();
    }
}

formatBtn.addEventListener("click", () => {
    is24h = !is24h;
    localStorage.setItem("clock24", is24h);
    updateClock(false);
});

setInterval(updateClock, 250);


/* =========================================================
   THEME
   ========================================================= */

const themeSelect = document.getElementById("themeSelect");
const themes = ["dark","light","ocean","sunset"];

function applyTheme(name){
    document.body.dataset.theme = name;
    themeSelect.value = name;
    localStorage.setItem("theme", name);
}

let savedTheme = localStorage.getItem("theme");
if(!themes.includes(savedTheme)) savedTheme = "dark";

applyTheme(savedTheme);

themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));


/* =========================================================
   MUSIC
   Paste a YouTube link or a direct audio link (.mp3, .wav ...)
   into the box, then press the play button (or Enter).
   ========================================================= */

const audio       = document.getElementById("audio");
const musicInput  = document.getElementById("musicInput");
const musicBtn    = document.getElementById("musicBtn");
const musicStatus = document.getElementById("musicStatus");

const AUDIO_ERROR =
    "Couldn't play that link. Use a YouTube link or a direct .mp3 link.";

const FILE_MESSAGE =
    "YouTube won't play when index.html is opened by double-clicking it. " +
    "Open the folder in VS Code, right-click index.html > Open with Live Server. " +
    ".mp3 links work either way.";

let currentUrl = "";     // the link that is loaded right now
let mode = null;         // "audio" | "youtube" | null

// ---- work out if a link is YouTube ----

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

    const list = u.searchParams.get("list");

    if(!id && !list) return null;

    return { id: id || "", list: list || "" };
}

// ---- YouTube player (loaded only when needed) ----

let ytPlayer = null;
let ytApiRequested = false;
let ytWaiting = [];

function withYouTubeAPI(callback){

    if(window.YT && YT.Player){
        callback();
        return;
    }

    ytWaiting.push(callback);

    if(ytApiRequested) return;
    ytApiRequested = true;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.onerror = () => {
        ytApiRequested = false;
        ytWaiting = [];
        musicStatus.textContent = "Couldn't load YouTube. Check your internet.";
    };
    document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = () => {
    ytWaiting.forEach(fn => fn());
    ytWaiting = [];
};

function setIcon(playing){
    musicBtn.textContent = playing ? "⏸" : "▶";
}

function youTubeError(code){

    if(code === 101 || code === 150){
        musicStatus.textContent = "The owner doesn't allow this video to play outside YouTube.";
    }
    else if(code === 100){
        musicStatus.textContent = "Video not found (it may be private or deleted).";
    }
    else if(code === 153 || code === 152){
        musicStatus.textContent = location.protocol === "file:"
            ? FILE_MESSAGE
            : "YouTube blocked this video from playing here. Try a different video or an .mp3 link.";
    }
    else{
        musicStatus.textContent = `YouTube error ${code}. Try a different link.`;
    }

    currentUrl = "";
    setIcon(false);
}

function playYouTube(info){

    withYouTubeAPI(() => {

        // player already exists -> just load the new link into it
        if(ytPlayer && ytPlayer.loadVideoById){
            if(info.id) ytPlayer.loadVideoById(info.id);
            else ytPlayer.loadPlaylist({ list: info.list, listType: "playlist" });
            return;
        }

        const vars = { autoplay: 1, playsinline: 1 };

        if(location.protocol.startsWith("http")){
            vars.origin = location.origin;
        }

        if(info.list && !info.id){          // playlist-only link
            vars.list = info.list;
            vars.listType = "playlist";
        }

        ytPlayer = new YT.Player("ytPlayer", {
            width:  "200",
            height: "200",
            videoId: info.id || undefined,
            playerVars: vars,
            events: {
                onReady: e => e.target.playVideo(),

                onStateChange: e => {
                    if(e.data === 1) setIcon(true);    // playing
                    if(e.data === 2) setIcon(false);   // paused
                    if(e.data === 0){                  // ended -> loop
                        if(info.list && !info.id) ytPlayer.playVideoAt(0);
                        else{
                            ytPlayer.seekTo(0);
                            ytPlayer.playVideo();
                        }
                    }
                },

                onError: e => youTubeError(e.data)
            }
        });
    });
}

// ---- start / stop / toggle ----

function stopAll(){

    audio.pause();

    if(audio.getAttribute("src")){
        audio.removeAttribute("src");
        audio.load();
    }

    if(ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();

    mode = null;
    currentUrl = "";
    setIcon(false);
}

function startLink(raw){

    let url = raw.trim();

    if(!/^https?:\/\//i.test(url)) url = "https://" + url;

    stopAll();
    musicStatus.textContent = "";

    let u;
    try{ u = new URL(url); }
    catch{
        musicStatus.textContent = "That doesn't look like a link.";
        return;
    }

    if(/(spotify|soundcloud|deezer)\.com$|music\.apple\.com$/.test(u.hostname)){
        musicStatus.textContent =
            "Spotify / SoundCloud links can't be played here. Use YouTube or a direct .mp3 link.";
        return;
    }

    const yt = getYouTubeInfo(url);

    if(yt && location.protocol === "file:"){
        musicStatus.textContent = FILE_MESSAGE;
        return;
    }

    currentUrl = raw.trim();
    localStorage.setItem("musicLink", currentUrl);

    if(yt){
        mode = "youtube";
        musicStatus.textContent = "Loading...";
        playYouTube(yt);
        // clear "Loading..." once it starts
        const wait = setInterval(() => {
            if(ytPlayer && ytPlayer.getPlayerState &&
               ytPlayer.getPlayerState() === 1){
                if(musicStatus.textContent === "Loading...") musicStatus.textContent = "";
                clearInterval(wait);
            }
        }, 500);
        setTimeout(() => clearInterval(wait), 15000);
    }
    else{
        mode = "audio";
        audio.src = url;
        audio.play().catch(() => {
            if(audio.getAttribute("src")) musicStatus.textContent = AUDIO_ERROR;
        });
    }
}

function handleMusic(){

    const raw = musicInput.value.trim();

    if(raw === ""){
        musicStatus.textContent = "Paste a link first.";
        return;
    }

    // new link -> start it
    if(raw !== currentUrl){
        startLink(raw);
        return;
    }

    // same link -> play / pause
    if(mode === "audio"){
        if(audio.paused) audio.play().catch(() => musicStatus.textContent = AUDIO_ERROR);
        else audio.pause();
    }
    else if(mode === "youtube" && ytPlayer && ytPlayer.getPlayerState){
        const state = ytPlayer.getPlayerState();
        if(state === 1 || state === 3) ytPlayer.pauseVideo();
        else ytPlayer.playVideo();
    }
}

musicBtn.addEventListener("click", handleMusic);

musicInput.addEventListener("keydown", e => {
    if(e.key === "Enter") handleMusic();
});

audio.addEventListener("play",  () => setIcon(true));
audio.addEventListener("pause", () => setIcon(false));

audio.addEventListener("error", () => {
    if(audio.getAttribute("src")){
        musicStatus.textContent = AUDIO_ERROR;
        currentUrl = "";
        setIcon(false);
    }
});

// remember the last link (does not auto-play)
const savedLink = localStorage.getItem("musicLink");
if(savedLink) musicInput.value = savedLink;


/* =========================================================
   CHANGE THE GIF
   Click the ✎ button on the GIF box, then paste a link or
   upload a file. It is remembered in this browser.
   ========================================================= */

const DEFAULT_GIF = "images/profile.gif";

const gifImg       = document.getElementById("gifImg");
const gifPanel     = document.getElementById("gifPanel");
const gifInput     = document.getElementById("gifInput");
const gifFile      = document.getElementById("gifFile");
const gifStatus    = document.getElementById("gifStatus");
const gifEditBtn   = document.getElementById("gifEditBtn");

function setGifPanel(open){
    gifPanel.hidden = !open;
    gifEditBtn.textContent = open ? "✕" : "✎";
}

// turn a link into one that works as an <img>
function normalizeGifLink(raw){

    let url = raw.trim();

    if(!/^https?:\/\//i.test(url)) url = "https://" + url;

    // https pages can't show http images
    if(location.protocol === "https:") url = url.replace(/^http:\/\//i, "https://");

    // a giphy PAGE link  ->  the real gif file
    const m = url.match(/^https?:\/\/(?:www\.)?giphy\.com\/(?:gifs|stickers|embed)\/(?:[^\/?#]*-)?([A-Za-z0-9]+)/i);

    if(m) url = `https://media.giphy.com/media/${m[1]}/giphy.gif`;

    return url;
}

// check the image really loads before swapping it in
function tryGif(src, remember){

    gifStatus.textContent = "Loading...";

    const test = new Image();

    test.onload = () => {
        gifImg.src = src;

        try{
            localStorage.setItem("gifSrc", src);
            gifStatus.textContent = "";
        }
        catch{
            gifStatus.textContent = "Showing it, but the file is too big to remember after a refresh.";
            localStorage.removeItem("gifSrc");
            return;
        }

        setGifPanel(false);
    };

    test.onerror = () => {
        gifStatus.textContent =
            "Couldn't load that. Right-click the GIF > \"Copy image address\" and paste that link.";
    };

    test.src = src;
}

function useGifLink(){

    if(gifInput.value.trim() === ""){
        gifStatus.textContent = "Paste a link first.";
        return;
    }

    tryGif(normalizeGifLink(gifInput.value));
}

gifEditBtn.addEventListener("click", () => {
    setGifPanel(gifPanel.hidden);
    gifStatus.textContent = "";
    if(!gifPanel.hidden) gifInput.focus();
});

document.getElementById("gifUseBtn").addEventListener("click", useGifLink);

gifInput.addEventListener("keydown", e => {
    if(e.key === "Enter") useGifLink();
});

document.getElementById("gifUploadBtn").addEventListener("click", () => gifFile.click());

gifFile.addEventListener("change", () => {

    const file = gifFile.files[0];
    if(!file) return;

    if(!file.type.startsWith("image/")){
        gifStatus.textContent = "That file isn't an image.";
        return;
    }

    const reader = new FileReader();
    reader.onload = () => tryGif(reader.result);
    reader.readAsDataURL(file);

    gifFile.value = "";
});

document.getElementById("gifResetBtn").addEventListener("click", () => {
    localStorage.removeItem("gifSrc");
    gifImg.src = DEFAULT_GIF;
    gifInput.value = "";
    gifStatus.textContent = "";
    setGifPanel(false);
});

// if a saved gif stops working, fall back to the default one
gifImg.addEventListener("error", () => {
    if(gifImg.getAttribute("src") !== DEFAULT_GIF){
        localStorage.removeItem("gifSrc");
        gifImg.src = DEFAULT_GIF;
    }
});

// load the saved gif
const savedGif = localStorage.getItem("gifSrc");
if(savedGif) gifImg.src = savedGif;


/* =========================================================
   INIT
   ========================================================= */

updateClock(false);
renderTasks();
renderEvents();
