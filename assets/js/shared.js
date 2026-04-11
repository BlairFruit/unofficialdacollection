const { ipcRenderer } = require('electron');

function minimizeApp() { ipcRenderer.send('minimize-app'); }
function maximizeApp() { ipcRenderer.send('maximize-app'); }
function closeApp() { ipcRenderer.send('close-app'); }

function restartApp() { ipcRenderer.send('restart-app'); }
window.restartApp = restartApp;

window.minimizeApp = minimizeApp;
window.maximizeApp = maximizeApp;
window.closeApp = closeApp;

window.minimizeApp = minimizeApp;
window.maximizeApp = maximizeApp;
window.closeApp = closeApp;

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
            tab.onclick = () => {
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

window.APP_ACHIEVEMENTS = {
    "unlocked-track-1": { page: "12", title: "Now we're getting somewhere", desc: "This is where the comic actually starts.\nUnlocked RSIDNT theme.", icon: "assets/media/icon-ach1.png", trigger: "video-end" },
    "unlocked-track-2": { page: "21", title: "Hey wait a second..", desc: "Where have I heard this one before?\nUnlocked An Absolute Banger.", icon: "assets/media/placeholder.png", trigger: "video-time", triggerTime: 4 },
    "unlocked-track-3": { page: "28", title: "Down into The Threshold we go", desc: "You don't know what you're getting into.\nUnlocked Displacement.", icon: "assets/media/placeholder.png", trigger: "load" },
    "unlocked-green": { page: "any", title: "Green and Inbetween", desc: "He's watching. He's green and inbetween.", icon: "assets/media/greendav.png", trigger: "custom" },
    "unlocked-end": { page: "last", title: "To Be Continued", desc: "You reached the end of the currently available pages.", icon: "assets/media/icon.png", trigger: "load" },
    "unlocked-coin-secret": { page: "extras", title: "How could this be", desc: "Find the medallion.", icon: "assets/media/medallion.gif", trigger: "custom" }
};

window.unlockAchievement = function(id) {
    if (localStorage.getItem(id)) return;
    
    const ach = window.APP_ACHIEVEMENTS[id];
    if (!ach) return;

    localStorage.setItem(id, "true");

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
    unlockSound.volume = 1.0; 
    unlockSound.play().catch(e => console.log(e));

    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 4000);
};

function toggleBookmarkMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('bookmark-context-menu');
    if (!menu) return;
    if (menu.style.display === 'none' || menu.style.display === '') {
        renderBookmarkList();
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
}

function saveCurrentPage() {
    if (!window.location.pathname.includes('index.html')) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    let currentPage = urlParams.get('p') || "1";
    let bookmarks = JSON.parse(localStorage.getItem('saved-bookmarks') || "[]");
    
    if (!bookmarks.includes(currentPage)) {
        bookmarks.push(currentPage);
        bookmarks.sort((a, b) => parseInt(a) - parseInt(b)); // Keep numerical order
        localStorage.setItem('saved-bookmarks', JSON.stringify(bookmarks));
    }
    renderBookmarkList();
    updateBookmarkIcon();
}

function removeBookmark(page, e) {
    e.stopPropagation(); 
    let bookmarks = JSON.parse(localStorage.getItem('saved-bookmarks') || "[]");
    bookmarks = bookmarks.filter(b => b !== page.toString());
    localStorage.setItem('saved-bookmarks', JSON.stringify(bookmarks));
    
    renderBookmarkList();
    updateBookmarkIcon();
}

function renderBookmarkList() {
    const list = document.getElementById('bookmark-dropdown-list');
    if (!list) return;
    let bookmarks = JSON.parse(localStorage.getItem('saved-bookmarks') || "[]");
    
    const isComicPage = window.location.pathname.includes('index.html');
    const saveAction = document.getElementById('bookmark-save-action');
    const saveDivider = document.getElementById('bookmark-save-divider');
    if (saveAction) saveAction.style.display = isComicPage ? 'block' : 'none';
    if (saveDivider) saveDivider.style.display = isComicPage ? 'block' : 'none';

    if (bookmarks.length === 0) {
        list.innerHTML = "<div style='padding: 8px 10px; font-size: 12px; color: #555; text-align: center;'>No saved pages.</div>";
    } else {
        list.innerHTML = bookmarks.map(page => `
            <div class="bookmark-item-row" onclick="window.location.href = 'index.html?p=${page}'">
                <span class="page-link">Page ${page}</span>
                <span class="bookmark-remove-x" onclick="removeBookmark('${page}', event)">X</span>
            </div>
        `).join('');
    }
}

function updateBookmarkIcon() {
    const btn = document.getElementById('bookmark-icon-btn');
    if (!btn) return;
    
    const isComicPage = window.location.pathname.includes('index.html');
    let isSaved = false;
    
    if (isComicPage) {
        const urlParams = new URLSearchParams(window.location.search);
        let currentPage = urlParams.get('p') || "1";
        let bookmarks = JSON.parse(localStorage.getItem('saved-bookmarks') || "[]");
        isSaved = bookmarks.includes(currentPage);
    }
    
    btn.innerText = isSaved ? "★" : "☆";
    btn.style.color = isSaved ? "gold" : "black";
    btn.style.textShadow = isSaved ? "1px 1px 0 #000" : "none";
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('bookmark-context-menu');
    const btn = document.getElementById('bookmark-icon-btn');
    if (menu && menu.style.display === 'block' && !menu.contains(e.target) && e.target !== btn) {
        menu.style.display = 'none';
    }
});

document.addEventListener("DOMContentLoaded", () => {
    renderTabs();
    updateBookmarkIcon();
});

window.handleAddressBar = function(event) {
    if (event.key === "Enter") {
        const val = event.target.value.toLowerCase().trim();
        
        if (val === "valentine" || val === "deaxs://valentine") {
            window.location.href = 'secret.html';
            return;
        }

        const match = val.match(/(\d+)/); 
        if (match) {
            let page = parseInt(match[1]);
            if (page < 1) page = 1;

            if (window.location.pathname.includes('index.html')) {
                if (typeof totalPagesCount !== 'undefined' && page > totalPagesCount) {
                    page = totalPagesCount;
                }
                window.location.search = `?p=${page}`;
            } else {
                window.location.href = `index.html?p=${page}`;
            }
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const addressInput = document.getElementById('address-input');
    if (addressInput && !window.location.pathname.includes('index.html')) {
        let currentPath = window.location.pathname.split('/').pop() || 'home';
        currentPath = currentPath.replace('.html', '');
        addressInput.value = `deaxs://${currentPath}`;
    }
});