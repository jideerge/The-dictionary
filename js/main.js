/* === 大词典 - Main JavaScript === */

// ========== Data Loading ==========
let entriesData = [];
let entryElements = [];

function loadEntries() {
    // Use embedded data from js/data.js
    if (typeof ENTRIES_DATA !== 'undefined' && ENTRIES_DATA.entries) {
        entriesData = ENTRIES_DATA.entries;
        return Promise.resolve(ENTRIES_DATA);
    }
    // Fallback: try fetch for server environments
    return fetch('data/entries.json')
        .then(r => r.json())
        .then(data => {
            entriesData = data.entries;
            return data;
        })
        .catch(() => {
            console.error('Failed to load entries data');
            return null;
        });
}

// ========== Content Formatting ==========
function formatEntryContent(entry) {
    // entry.content_html already contains <p> tags with formatting
    // Just need to post-process field labels and links
    let html = entry.content_html || '';

    // Highlight field labels like "名称：", "提出人：" etc.
    html = html.replace(/<p>(名称|应用|提出人|提出时间|提出者|意义|证明|举例|说明|现况|本质|内容|当事人|导火索|结果|性别|职业|信仰|嗜好|代表|核心|时间|实质|发明者|测量人|人物|事件|卒因|贡献|职位|称号|作者|优点|症状|首次应用|理论基础|领域|密码|特征|爱好|口癖|名言|影响|思想|教主|宗旨|教|内核|科学家|测量人|首次应用|丑大王|发明者|导火索|当事人|代表)(：)/g,
        '<p><span class="field-label">$1$2</span>');

    // Fix: if field-label is the entire paragraph, style the rest too
    html = html.replace(/<p><span class="field-label">([^<]+)<\/span>(.+?)<\/p>/g,
        '<p class="field-line"><span class="field-label">$1</span><span class="field-value">$2</span></p>');

    // Handle HYPERLINK references
    html = html.replace(/HYPERLINK\s+&quot;(https?:\/\/[^&]+)&quot;\s*([^&]*)/g,
        '<a href="$1" target="_blank" rel="noopener">$2</a>');

    // Handle 《 》 book/article titles
    html = html.replace(/《([^》]+)》/g, '<cite>$1</cite>');

    // Handle ★ markers
    html = html.replace(/★([^★<]+)★?/g, '<span class="highlight-text">$1</span>');

    return html;
}

// ========== Entry Rendering ==========
function renderEntry(entry, index) {
    const card = document.createElement('article');
    card.className = 'entry-card';
    card.id = `entry-${entry.id}`;
    card.setAttribute('data-entry-id', entry.id);

    const number = document.createElement('div');
    number.className = 'entry-number';
    number.textContent = index + 1;

    const header = document.createElement('div');
    header.className = 'entry-header';

    const title = document.createElement('h3');
    title.className = 'entry-title';
    // Use title_html from docx (preserves formatting and English name)
    title.innerHTML = entry.title_html || entry.title;
    header.appendChild(title);

    const body = document.createElement('div');
    body.className = 'entry-body';
    body.innerHTML = formatEntryContent(entry);

    card.appendChild(number);
    card.appendChild(header);
    card.appendChild(body);

    return card;
}

function renderAllEntries() {
    const container = document.getElementById('entries-container');
    if (!container) return;

    container.innerHTML = '';
    entryElements = [];

    entriesData.forEach((entry, index) => {
        const card = renderEntry(entry, index);
        container.appendChild(card);
        entryElements.push({
            id: entry.id,
            title: entry.title,
            english: entry.english,
            element: card
        });
    });
}

// ========== Sidebar Navigation ==========
function buildSidebar() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    nav.innerHTML = '';

    entriesData.forEach((entry) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#entry-${entry.id}`;
        a.setAttribute('data-entry-id', entry.id);

        const titleSpan = document.createElement('span');
        titleSpan.textContent = entry.title;
        a.appendChild(titleSpan);

        if (entry.english) {
            const engSpan = document.createElement('span');
            engSpan.className = 'eng';
            engSpan.textContent = entry.english;
            a.appendChild(engSpan);
        }

        a.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById(`entry-${entry.id}`);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Close sidebar on mobile
                document.getElementById('sidebar').classList.remove('open');
            }
            // Update active state
            document.querySelectorAll('.sidebar-nav a').forEach(el => el.classList.remove('active'));
            a.classList.add('active');
        });

        li.appendChild(a);
        nav.appendChild(li);
    });
}

// Highlight active sidebar item on scroll
function updateActiveSidebarItem() {
    const entries = document.querySelectorAll('.entry-card');
    const navLinks = document.querySelectorAll('.sidebar-nav a');

    let currentId = null;
    entries.forEach((entry) => {
        const rect = entry.getBoundingClientRect();
        if (rect.top <= 100) {
            currentId = entry.getAttribute('data-entry-id');
        }
    });

    navLinks.forEach((link) => {
        link.classList.remove('active');
        if (link.getAttribute('data-entry-id') === currentId) {
            link.classList.add('active');
        }
    });

    // Update comments for the visible entry
    if (currentId && typeof showCommentsForEntry === 'function') {
        const entryId = parseInt(currentId);
        if (entryId !== window._lastCommentEntry) {
            window._lastCommentEntry = entryId;
            showCommentsForEntry(entryId);
        }
    }
}

// ========== Search ==========
function setupSearch() {
    const searchInput = document.getElementById('sidebar-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        entriesData.forEach((entry) => {
            const card = document.getElementById(`entry-${entry.id}`);
            if (!card) return;

            if (!query) {
                card.style.display = '';
                card.style.opacity = '1';
                return;
            }

            // Search in title, english name, and content (strip HTML tags for content)
            const contentText = (entry.content_html || '').replace(/<[^>]+>/g, ' ').toLowerCase();
            const searchText = (entry.title + ' ' + (entry.english || '') + ' ' + contentText).toLowerCase();
            if (searchText.includes(query)) {
                card.style.display = '';
                card.style.opacity = '1';
            } else {
                card.style.display = 'none';
                card.style.opacity = '0';
            }
        });

        // Also filter sidebar
        const navItems = document.querySelectorAll('.sidebar-nav li');
        navItems.forEach((item) => {
            const link = item.querySelector('a');
            if (!link) return;
            const text = link.textContent.toLowerCase();
            if (!query || text.includes(query)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

// ========== Theme Toggle ==========
function setupTheme() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    // Load saved theme
    const savedTheme = localStorage.getItem('dadict-theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        toggle.textContent = '☀️';
    }

    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('dadict-theme', 'light');
            toggle.textContent = '🌙';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('dadict-theme', 'dark');
            toggle.textContent = '☀️';
        }
    });
}

// ========== BGM Player ==========
function setupBGM() {
    const player = document.getElementById('bgm-player');
    const playBtn = document.getElementById('bgm-play-btn');
    const trackName = document.getElementById('bgm-track-name');
    if (!player || !playBtn) return;

    const tracks = [
        { name: '卡农', src: '大词典备份/BGM/卡农.mp3' },
        { name: '梁祝', src: '大词典备份/BGM/小提琴 - 梁祝.mp3' }
    ];

    let currentTrack = 0;
    let audio = null;
    let isPlaying = false;

    function updateTrack() {
        trackName.textContent = tracks[currentTrack].name;
    }

    function play() {
        if (!audio) {
            audio = new Audio(tracks[currentTrack].src);
            audio.volume = 0.3;
            audio.addEventListener('ended', () => {
                currentTrack = (currentTrack + 1) % tracks.length;
                updateTrack();
                audio.src = tracks[currentTrack].src;
                audio.play();
            });
        }
        audio.play().catch(() => {
            // Autoplay blocked, ignore
        });
        isPlaying = true;
        playBtn.textContent = '⏸';
    }

    function pause() {
        if (audio) {
            audio.pause();
        }
        isPlaying = false;
        playBtn.textContent = '▶';
    }

    playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    });

    player.addEventListener('click', () => {
        currentTrack = (currentTrack + 1) % tracks.length;
        updateTrack();
        if (isPlaying) {
            audio.pause();
            audio.src = tracks[currentTrack].src;
            audio.play();
        }
    });

    updateTrack();
}

// ========== Scroll to Top ==========
function setupScrollTop() {
    const btn = document.getElementById('scroll-top');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 600) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ========== Gallery / Lightbox ==========
function setupGallery() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    if (!lightbox || !lightboxImg) return;

    document.querySelectorAll('.gallery-item img').forEach((img) => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            lightboxImg.src = img.src;
            lightbox.classList.add('active');
        });
    });

    lightbox.addEventListener('click', () => {
        lightbox.classList.remove('active');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            lightbox.classList.remove('active');
        }
    });
}

// ========== Sidebar Mobile Toggle ==========
function setupSidebarToggle() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth > 900) return;
        if (!sidebar.classList.contains('open')) return;
        if (!sidebar.contains(e.target) && e.target !== toggle) {
            sidebar.classList.remove('open');
        }
    });
}

// ========== Initialization ==========
async function init() {
    const data = await loadEntries();
    if (!data) {
        document.getElementById('entries-container').innerHTML =
            '<p style="text-align:center;padding:40px;color:var(--text-muted);">无法加载词条数据，请检查 data/entries.json 文件是否存在。</p>';
        return;
    }

    // Update meta info
    document.title = data.meta.title + ' - ' + data.meta.subtitle;
    document.getElementById('entry-count').textContent = `共 ${data.meta.total_entries} 个词条`;

    // Render header block from docx
    if (data.header_html) {
        const headerBlock = document.getElementById('header-content');
        if (headerBlock) {
            headerBlock.innerHTML = data.header_html;
        }
    }

    // Render everything
    renderAllEntries();
    buildSidebar();
    setupSearch();
    setupTheme();
    setupBGM();
    setupScrollTop();
    setupGallery();
    setupSidebarToggle();

    // Scroll event for sidebar active item
    window.addEventListener('scroll', updateActiveSidebarItem);

    console.log(`大词典加载完成: ${data.meta.total_entries} 个词条`);

    // Render appendix
    renderAppendix();

    // Init comments for first entry
    if (typeof showCommentsForEntry === 'function') {
        showCommentsForEntry(1);
        window._lastCommentEntry = 1;
    }
}

// ========== Appendix Rendering ==========
function renderAppendix() {
    const container = document.getElementById('appendix-container');
    if (!container || typeof APPENDIX_DATA === 'undefined') return;

    container.innerHTML = '';
    APPENDIX_DATA.appendix.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'appendix-card';

        const header = document.createElement('div');
        header.className = 'appendix-header';
        header.innerHTML = `<h3>${item.title}</h3>`;

        const body = document.createElement('div');
        body.className = 'appendix-body';
        body.innerHTML = item.html;

        card.appendChild(header);
        card.appendChild(body);
        container.appendChild(card);
    });
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
