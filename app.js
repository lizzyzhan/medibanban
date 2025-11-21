let currentQuote = null;
let currentTrackName = "";
let statsCurrentDate = new Date();

// --- 初始化 ---
function init() {
    updateClock();
    setInterval(updateClock, 1000);
    loadRandomBackground();
    displayNewQuote();
    checkFavState(); 
    loadRandomMusic(); 
}

// --- 模块：时间 ---
function updateClock() {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString('zh-CN', {hour12: false});
    document.getElementById('date').innerText = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

// --- 模块：背景 ---
function loadRandomBackground() {
    // bgImages 来自 data.js
    const imgUrl = bgImages[Math.floor(Math.random() * bgImages.length)];
    const img = new Image();
    img.src = imgUrl;
    img.onload = () => document.body.style.backgroundImage = `url('${imgUrl}')`;
    // 兜底
    setTimeout(() => {
        if (document.body.style.backgroundImage === '') document.body.style.backgroundImage = `url('${bgImages[0]}')`;
    }, 3000);
}

// --- 模块：语录 ---
function displayNewQuote() {
    const container = document.getElementById('quote-content');
    container.classList.add('hidden');
    setTimeout(() => {
        // quotesDB 来自 data.js
        currentQuote = quotesDB[Math.floor(Math.random() * quotesDB.length)];
        document.getElementById('quote-text').innerText = currentQuote.text;
        document.getElementById('quote-author').innerText = `—— ${currentQuote.author}`;
        checkFavState(); 
        container.classList.remove('hidden');
    }, 500);
}
function changeQuote() { displayNewQuote(); }

// --- 模块：收藏 (红色爱心) ---
function toggleFavorite() {
    if(!currentQuote) return;
    let favs = JSON.parse(localStorage.getItem('meditation_favs') || '[]');
    const index = favs.findIndex(f => f.text === currentQuote.text);
    if (index >= 0) {
        favs.splice(index, 1);
        showToast("已取消收藏");
    } else {
        favs.unshift(currentQuote);
        showToast("❤️ 已加入灵感集");
    }
    localStorage.setItem('meditation_favs', JSON.stringify(favs));
    checkFavState();
}

function checkFavState() {
    if(!currentQuote) return;
    let favs = JSON.parse(localStorage.getItem('meditation_favs') || '[]');
    const isFav = favs.some(f => f.text === currentQuote.text);
    const btn = document.getElementById('fav-btn');
    if(btn) {
        if(isFav) {
            btn.classList.add('active');
            btn.querySelector('svg').style.fill = "currentColor";
        } else {
            btn.classList.remove('active');
            btn.querySelector('svg').style.fill = "none";
        }
    }
}

function openFavList() {
    const list = document.getElementById('fav-list-container');
    list.innerHTML = '';
    let favs = JSON.parse(localStorage.getItem('meditation_favs') || '[]');
    if(favs.length === 0) {
        list.innerHTML = "<div style='text-align:center; color:#666; padding:20px;'>暂无收藏</div>";
    } else {
        favs.forEach((f, idx) => {
            const div = document.createElement('div');
            div.className = 'fav-item';
            div.innerHTML = `<div class="fav-text">${f.text}</div><div class="fav-author">— ${f.author}</div><div class="delete-fav" onclick="removeFav(${idx})">&times;</div>`;
            list.appendChild(div);
        });
    }
    document.getElementById('fav-list-modal').classList.add('open');
}

function removeFav(index) {
    let favs = JSON.parse(localStorage.getItem('meditation_favs') || '[]');
    favs.splice(index, 1);
    localStorage.setItem('meditation_favs', JSON.stringify(favs));
    openFavList();
    checkFavState();
}
function closeFavList() { document.getElementById('fav-list-modal').classList.remove('open'); }

// --- 模块：打卡 (每日限一次) ---
function handleCheckIn() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let logs = JSON.parse(localStorage.getItem('meditation_logs') || '[]');
    const hasCheckedIn = logs.some(log => (log.dateStr || new Date(log.timestamp).toISOString().split('T')[0]) === todayStr);

    if (hasCheckedIn) {
        showToast("📅 今天已完成");
        return;
    }

    logs.push({ timestamp: now.getTime(), dateStr: todayStr });
    localStorage.setItem('meditation_logs', JSON.stringify(logs));
    
    triggerSuccessAnimation();
    if(navigator.vibrate) navigator.vibrate([50, 50, 50]);
    if(document.getElementById('stats-modal').style.display === 'flex') renderStats();
}

function triggerSuccessAnimation() {
    const overlay = document.getElementById('success-overlay');
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s';
        setTimeout(() => { overlay.style.display = 'none'; overlay.style.opacity = '1'; }, 500);
    }, 2000);
}

// --- 模块：统计 ---
function openStats() { document.getElementById('stats-modal').classList.add('open'); renderStats(); }
function closeStats() { document.getElementById('stats-modal').classList.remove('open'); }

function renderStats() {
    const logs = JSON.parse(localStorage.getItem('meditation_logs') || '[]');
    const now = new Date();
    
    const weekCount = logs.filter(l => l.timestamp > (now.getTime() - 7*24*3600000)).length;
    const monthCount = logs.filter(l => new Date(l.timestamp).getMonth() === now.getMonth()).length;
    const yearCount = logs.filter(l => new Date(l.timestamp).getFullYear() === now.getFullYear()).length;

    document.getElementById('stat-week').innerText = weekCount;
    document.getElementById('stat-month').innerText = monthCount;
    document.getElementById('stat-year').innerText = yearCount;
    renderCalendar(statsCurrentDate, logs);
}

function changeCalendarMonth(delta) {
    statsCurrentDate.setMonth(statsCurrentDate.getMonth() + delta);
    renderStats();
}

function renderCalendar(dateObj, logs) {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    document.getElementById('cal-month-label').innerText = `${year}年 ${month + 1}月`;
    
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    ['日','一','二','三','四','五','六'].forEach(d => {
        const div = document.createElement('div'); div.className = 'cal-day-name'; div.innerText = d; grid.appendChild(div);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const logSet = new Set(logs.filter(l => {
        const d = new Date(l.timestamp); return d.getFullYear() === year && d.getMonth() === month;
    }).map(l => new Date(l.timestamp).getDate()));
    const today = new Date();

    for(let i=0; i<firstDay; i++) grid.appendChild(document.createElement('div'));
    for(let d=1; d<=daysInMonth; d++) {
        const cell = document.createElement('div'); cell.className = 'cal-day'; cell.innerText = d;
        if(logSet.has(d)) cell.classList.add('has-data');
        if(today.getFullYear()===year && today.getMonth()===month && today.getDate()===d) cell.classList.add('today');
        grid.appendChild(cell);
    }
}

// --- 模块：音乐 ---
function loadRandomMusic() {
    const audio = document.getElementById('bg-music');
    // musicTracks 来自 data.js
    const track = musicTracks[Math.floor(Math.random() * musicTracks.length)];
    audio.src = track.url;
    audio.volume = 0.6;
    currentTrackName = track.name;
}

function toggleMusic() {
    const audio = document.getElementById('bg-music');
    const btn = document.getElementById('music-btn');
    if (!audio.src) loadRandomMusic();

    if (audio.paused) {
        audio.play().then(() => {
            btn.classList.add('active');
            showToast(`🎵 播放中：${currentTrackName}`);
        }).catch(e => {
            console.error(e);
            showToast("⚠️ 缓冲中，请稍候...");
        });
    } else {
        audio.pause();
        btn.classList.remove('active');
        showToast("🔇 音乐已暂停");
    }
}

// --- 工具 ---
function showToast(msg) {
    const t = document.getElementById('toast'); t.innerText = msg;
    t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2000);
}

// 启动应用
init();