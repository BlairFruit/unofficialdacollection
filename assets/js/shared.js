// assets/js/shared.js
const { ipcRenderer } = require('electron');

// --- WINDOW CONTROLS ---
function minimizeApp() { ipcRenderer.send('minimize-app'); }
function maximizeApp() { ipcRenderer.send('maximize-app'); }
function closeApp() { ipcRenderer.send('close-app'); }

// Expose them to the global window so HTML buttons can click them
window.minimizeApp = minimizeApp;
window.maximizeApp = maximizeApp;
window.closeApp = closeApp;

// --- UNIVERSAL MULTI-TAB LOGIC ---
let openTabs = JSON.parse(sessionStorage.getItem('open-tabs')) || [];
if (openTabs.length > 0 && typeof openTabs[0] === 'string') { openTabs = []; } 
let activeTabIndex = parseInt(sessionStorage.getItem('active-tab-index')) || 0;

let currentPath = window.location.pathname.split('/').pop() || 'home.html';
let currentSearch = window.location.search;
let currentUrl = currentPath + currentSearch;
let currentTitle = "Main Menu"; 

if (currentPath.includes('index.html')) {
    const urlParams = new URLSearchParams(currentSearch);
    let p = urlParams.get('p') || "1";
    currentTitle = `Page ${p}`;
} else if (currentPath.includes('extras.html')) {
    currentTitle = "Extras";
} else if (currentPath.includes('achievements.html')) {
    currentTitle = "Achievements";
} else {
    currentTitle = "Main Menu";
}

if (openTabs.length === 0) {
    openTabs = [{ title: currentTitle, url: currentUrl }];
    activeTabIndex = 0;
} else {
    openTabs[activeTabIndex] = { title: currentTitle, url: currentUrl };
}

sessionStorage.setItem('open-tabs', JSON.stringify(openTabs));
sessionStorage.setItem('active-tab-index', activeTabIndex.toString());

function renderTabs() {
    const tabContainer = document.getElementById('tab-container');
    if (!tabContainer) return;
    tabContainer.innerHTML = '';
    
    openTabs.forEach((tabData, index) => {
        const isActive = index === activeTabIndex;
        const tab = document.createElement('div');
        tab.className = `retro-tab ${isActive ? 'active' : 'inactive'}`;
        
        const tabText = document.createElement('span');
        tabText.innerText = tabData.title;
        if (!isActive) {
            tabText.onclick = () => {
                sessionStorage.setItem('active-tab-index', index.toString());
                window.location.href = tabData.url;
            };
        }

        const icon = document.createElement('img');
        icon.src = "assets/media/icon.png";
        icon.className = "fake-favicon";
        
        tab.appendChild(icon);
        tab.appendChild(tabText);

        if (openTabs.length > 1) {
            const closeBtn = document.createElement('span');
            closeBtn.innerText = "x";
            closeBtn.style.marginLeft = "10px";
            closeBtn.style.cursor = "pointer";
            closeBtn.style.fontWeight = "bold";
            closeBtn.style.color = isActive ? "black" : "#444";
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                closeTab(index);
            };
            tab.appendChild(closeBtn);
        }
        tabContainer.appendChild(tab);
    });

    const newTabBtn = document.createElement('div');
    newTabBtn.className = 'retro-tab inactive';
    newTabBtn.style.padding = '5px 12px';
    newTabBtn.innerHTML = '<strong>+</strong>';
    newTabBtn.onclick = () => {
        openTabs.push({ title: currentTitle, url: currentUrl });
        sessionStorage.setItem('open-tabs', JSON.stringify(openTabs));
        sessionStorage.setItem('active-tab-index', (openTabs.length - 1).toString());
        window.location.href = currentUrl;
    };
    tabContainer.appendChild(newTabBtn);
}

function closeTab(indexToRemove) {
    openTabs.splice(indexToRemove, 1);
    if (indexToRemove === activeTabIndex) {
        activeTabIndex = Math.max(0, indexToRemove - 1);
        sessionStorage.setItem('open-tabs', JSON.stringify(openTabs));
        sessionStorage.setItem('active-tab-index', activeTabIndex.toString());
        window.location.href = openTabs[activeTabIndex].url;
    } else {
        if (indexToRemove < activeTabIndex) activeTabIndex--;
        sessionStorage.setItem('active-tab-index', activeTabIndex.toString());
        sessionStorage.setItem('open-tabs', JSON.stringify(openTabs));
        renderTabs(); 
    }
}

document.addEventListener("DOMContentLoaded", () => {
    renderTabs();
});

// --- MASTER ACHIEVEMENT SYSTEM ---
window.APP_ACHIEVEMENTS = {
    // Original Achievements
    "unlocked-track-1": { page: "12", title: "Now we're getting somewhere", desc: "This is where the comic actually starts.\nUnlocked RSIDNT theme.", icon: "assets/media/icon-ach1.png", trigger: "video-end" },
    "unlocked-track-2": { page: "21", title: "Hey wait a second..", desc: "Where have I heard this one before?\nUnlocked An Absolute Banger.", icon: "assets/media/placeholder.png", trigger: "video-time", triggerTime: 4 },
    "unlocked-track-3": { page: "28", title: "Down into The Threshold we go", desc: "You don't know what you're getting into.\nUnlocked Displacement.", icon: "assets/media/placeholder.png", trigger: "load" },
    "unlocked-green": { page: "any", title: "Green and Inbetween", desc: "He's watching. He's green and inbetween.", icon: "assets/media/greendav.png", trigger: "custom" },
    "unlocked-end": { page: "last", title: "To Be Continued", desc: "You reached the end of the currently available pages.", icon: "assets/media/icon.png", trigger: "load" },
    "unlocked-coin-secret": { page: "extras", title: "How could this be", desc: "Find the medallion.", icon: "assets/media/medallion.gif", trigger: "custom" }
};

window.unlockAchievement = function(id) {
    if (localStorage.getItem(id)) return; // Already unlocked
    
    const ach = window.APP_ACHIEVEMENTS[id];
    if (!ach) return;

    localStorage.setItem(id, "true");

    // Inject the popup HTML into the page if it doesn't exist yet
    if (!document.getElementById('achievement-toast')) {
        const toastHTML = `
            <div id="achievement-toast" class="achievement-popup">
                <img id="achievement-icon" src="" class="achievement-icon-img" style="display: none;">
                <div class="achievement-text">
                    <h4 id="achievement-title">Secret Unlocked!</h4>
                    <p id="achievement-desc">You found a new item.</p>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', toastHTML);
    }

    const toast = document.getElementById('achievement-toast');
    document.getElementById('achievement-title').innerText = ach.title;
    document.getElementById('achievement-desc').innerText = ach.desc;
    
    const iconElement = document.getElementById('achievement-icon');
    if (ach.icon) {
        iconElement.src = ach.icon;
        iconElement.style.display = 'block';
    } else {
        iconElement.style.display = 'none';
    }

    const unlockSound = new Audio('assets/media/achievement.mp3');
    unlockSound.volume = 0.5;
    unlockSound.play().catch(e => console.log(e));

    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 4000);
};