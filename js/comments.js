/* === 大词典 - 评论区 v2 === */

const SUPABASE_URL = 'https://onmlwyiimttmeltitghj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZyGAoDv_JZpQn9VFcpzDWQ_kEFPLbdh';
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/comments/`;

const D_AVATARS = ['😀','😎','🤓','😈','🐱','🦊','🐼','🐨','🌟','🎈','🎓','💡','🔥','🍀','🌙','⚡'];
const EMOJIS = ['😀','😂','🤣','😍','😎','😢','😡','👍','👎','🎉','❤️','🔥','💯','✨','🤔','😈','💀','👻','🐱','🐶'];

let currentEntryId = null;
let selectedAvatar = '';
let commentsInited = false;

// ========== Storage Key ==========
function getDeleteToken() {
    let t = localStorage.getItem('ddel');
    if (!t) { t = 'dt_'+Math.random().toString(36).substr(2,12); localStorage.setItem('ddel',t); }
    return t;
}
function getUserId() {
    let u = localStorage.getItem('duid');
    if (!u) { u = 'u_'+Math.random().toString(36).substr(2,9); localStorage.setItem('duid',u); }
    return u;
}

// ========== API ==========
async function api(method, path, body) {
    const opts = {
        method,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': method==='POST'?'return=representation':'return=minimal'
        }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
    if (res.status === 204) return [];
    if (!res.ok) { console.error(await res.text()); return []; }
    return res.json();
}

async function fetchComments(eid) {
    return await api('GET', `comments?entry_id=eq.${eid}&order=created_at.asc`) || [];
}

async function insertComment(c) {
    const data = await api('POST', 'comments', c);
    return (data && data.length) ? data[0] : null;
}

async function updateLikes(id, likes) {
    await api('PATCH', `comments?id=eq.${id}`, { likes });
}

async function deleteComment(id) {
    await api('DELETE', `comments?id=eq.${id}`);
}

// ========== File Upload ==========
async function uploadFile(file) {
    const ext = file.name.split('.').pop();
    const fname = `c_${Date.now()}_${Math.random().toString(36).substr(2,6)}.${ext}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/comments/${fname}`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        body: file
    });
    if (!res.ok) { console.error('Upload fail:', await res.text()); return null; }
    const data = await res.json();
    return `${STORAGE_URL}${fname}`;
}

// ========== Render ==========
async function renderComments(eid) {
    if (!eid) return;
    currentEntryId = eid;
    const list = document.getElementById('comment-list');
    const count = document.getElementById('comment-count');
    if (!list || !count) return;

    const comments = await fetchComments(eid);
    const tops = comments.filter(c => !c.parent_id);
    const subs = comments.filter(c => c.parent_id);

    count.textContent = comments.length ? `${comments.length} 条评论` : '暂无评论，来说两句吧';
    if (!tops.length) { list.innerHTML = ''; return; }

    list.innerHTML = tops.map(c => renderItem(c, subs)).join('');
}

function renderItem(c, subs) {
    const kids = subs.filter(r => r.parent_id === c.id);
    const av = renderAv(c.avatar, c.nickname);
    const tm = new Date(c.created_at).toLocaleString('zh-CN', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    const lc = (c.likes||[]).length;
    const liked = isLiked(c) ? 'liked' : '';
    const lj = esc(JSON.stringify(c.likes||[]));
    const img = c.image ? `<br><img src="${esc(c.image)}" onclick="viewImg(this.src)">` : '';
    const isMine = c.delete_token === getDeleteToken();
    const delBtn = isMine ? `<button class="comment-del" onclick="delComment(${c.id})" title="删除">🗑</button>` : '';
    const rpl = kids.length ? `<div class="comment-replies">${kids.map(r => renderSub(r, c.nickname)).join('')}</div>` : '';

    return `<div class="comment-item" id="c${c.id}">
        <div class="comment-avatar">${av}</div>
        <div class="comment-body">
            <div class="comment-meta"><span class="comment-nick">${esc(c.nickname)}</span><span class="comment-time">${tm}</span>${delBtn}</div>
            <div class="comment-content">${esc(c.content)}${img}</div>
            <div class="comment-actions">
                <button class="comment-like ${liked}" data-id="${c.id}" data-likes='${lj}' onclick="toggleLike(this)">👍 ${lc||''}</button>
                <button class="comment-reply" data-id="${c.id}" data-nick="${esc(c.nickname)}" onclick="showReply(this)">💬 回复</button>
            </div>
            <div class="reply-form" id="rf-${c.id}"></div>
            ${rpl}
        </div></div>`;
}

function renderSub(r, pn) {
    const av = renderAv(r.avatar, r.nickname);
    const tm = new Date(r.created_at).toLocaleString('zh-CN', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    const lc = (r.likes||[]).length;
    const liked = isLiked(r) ? 'liked' : '';
    const lj = esc(JSON.stringify(r.likes||[]));
    const img = r.image ? `<br><img src="${esc(r.image)}" onclick="viewImg(this.src)">` : '';
    const isMine = r.delete_token === getDeleteToken();
    const delBtn = isMine ? `<button class="comment-del" onclick="delComment(${r.id})" title="删除">🗑</button>` : '';

    return `<div class="comment-item" id="c${r.id}">
        <div class="comment-avatar" style="width:30px;height:30px;font-size:1rem;">${av}</div>
        <div class="comment-body">
            <div class="comment-meta"><span class="comment-nick">${esc(r.nickname)}</span><span class="comment-time">${tm}</span>${delBtn}</div>
            <div class="comment-content"><span style="color:var(--text-muted);font-size:0.8rem;">@${esc(pn)}</span> ${esc(r.content)}${img}</div>
            <div class="comment-actions">
                <button class="comment-like ${liked}" data-id="${r.id}" data-likes='${lj}' onclick="toggleLike(this)">👍 ${lc||''}</button>
            </div>
        </div></div>`;
}

function renderAv(url, nick) {
    if (url && (url.startsWith('http')||url.startsWith('data:'))) return `<img src="${esc(url)}" onerror="this.parentElement.textContent='${(nick||'?')[0]}'">`;
    if (url && url.length <= 4) return url;
    return (nick||'?')[0];
}

// ========== Like ==========
function isLiked(c) { return c.likes && c.likes.includes(getUserId()); }
async function toggleLike(btn) {
    const id = +btn.dataset.id;
    const likes = JSON.parse(btn.dataset.likes||'[]');
    const uid = getUserId();
    const idx = likes.indexOf(uid);
    idx>=0 ? likes.splice(idx,1) : likes.push(uid);
    await updateLikes(id, likes);
    btn.dataset.likes = JSON.stringify(likes);
    btn.textContent = '👍 '+(likes.length||'');
    btn.classList.toggle('liked', idx<0);
}

// ========== Delete ==========
async function delComment(id) {
    if (!confirm('确定删除这条评论吗？')) return;
    await deleteComment(id);
    document.getElementById('c'+id)?.remove();
    await renderComments(currentEntryId); // refresh count
}

// ========== Reply ==========
function showReply(btn) {
    const id = +btn.dataset.id;
    const nick = btn.dataset.nick;
    const div = document.getElementById('rf-'+id);
    if (!div) return;
    div.classList.add('active');
    const u = 'rp'+id;
    div.innerHTML = `
        <textarea class="comment-textarea" id="${u}-ta" placeholder="回复 @${nick}…" rows="2"></textarea>
        <div class="emoji-bar">${EMOJIS.map(e=>`<button class="emoji-btn" onclick="insEmoji('${u}-ta','${e}')">${e}</button>`).join('')}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
            <input type="url" id="${u}-img" placeholder="图片URL（可选）" style="flex:1;padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--page-bg);color:var(--text);font-size:0.8rem;">
            <label style="padding:5px 8px;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:0.8rem;white-space:nowrap;background:var(--page-bg);">📁<input type="file" accept="image/*" style="display:none" onchange="upReplyImg(this,'${u}')"></label>
        </div>
        <img id="${u}-pv" class="comment-image-preview" onerror="this.style.display='none'" onclick="this.style.display='none'">
        <div style="display:flex;gap:8px;margin-top:6px;">
            <button class="comment-submit" onclick="doReply(${id},'${u}')">回复</button>
            <button class="comment-submit" style="background:var(--text-muted);" onclick="cancelReply(${id})">取消</button>
        </div>`;
    document.getElementById(u+'-ta').focus();
}

function cancelReply(id) {
    const d = document.getElementById('rf-'+id);
    if (d) { d.classList.remove('active'); d.innerHTML = ''; }
}

async function doReply(pid, u) {
    const ta = document.getElementById(u+'-ta');
    if (!ta) return;
    const txt = ta.value.trim();
    if (!txt) return;
    const img = document.getElementById(u+'-img')?.value?.trim()||'';
    const r = await insertComment({
        entry_id: currentEntryId, parent_id: pid,
        nickname: getNick(), avatar: getAv(),
        content: txt, image: img, likes: [],
        delete_token: getDeleteToken()
    });
    if (r) { cancelReply(pid); await renderComments(currentEntryId); }
}

// ========== New Comment ==========
function getNick() { return document.getElementById('comment-nickname')?.value?.trim()||'匿名同学'; }
function getAv() { return selectedAvatar||document.getElementById('comment-avatar-url')?.value?.trim()||''; }

async function doComment() {
    const ta = document.getElementById('comment-textarea');
    const btn = document.getElementById('comment-submit-btn');
    const txt = ta.value.trim();
    if (!txt) return;
    btn.disabled = true; btn.textContent = '发送中…';
    const img = document.getElementById('comment-image-url')?.value?.trim()||'';

    const r = await insertComment({
        entry_id: currentEntryId, parent_id: null,
        nickname: getNick(), avatar: getAv(),
        content: txt, image: img, likes: [],
        delete_token: getDeleteToken()
    });
    if (r) {
        ta.value = '';
        const iu = document.getElementById('comment-image-url'); if (iu) iu.value = '';
        const ip = document.getElementById('comment-image-preview'); if (ip) ip.style.display = 'none';
        await renderComments(currentEntryId);
    }
    btn.disabled = false; btn.textContent = '发表评论';
}

// ========== Emoji ==========
function insEmoji(taId, emoji) {
    const ta = document.getElementById(taId);
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.substring(0,s)+emoji+ta.value.substring(e);
    ta.focus(); ta.setSelectionRange(s+emoji.length, s+emoji.length);
}

// ========== Avatar ==========
function pickAvatar(el, avatar) {
    selectedAvatar = avatar;
    document.querySelectorAll('.avatar-preset').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
}

// ========== Image Upload ==========
function previewImg() {
    const url = document.getElementById('comment-image-url')?.value?.trim();
    const pv = document.getElementById('comment-image-preview');
    if (!pv) return;
    pv.style.display = url ? 'block' : 'none';
    if (url) pv.src = url;
}

async function upMainImg(input) {
    if (!input.files||!input.files[0]) return;
    const btn = document.getElementById('comment-submit-btn');
    btn.disabled = true; btn.textContent = '上传图片中…';
    const url = await uploadFile(input.files[0]);
    if (url) {
        const iu = document.getElementById('comment-image-url');
        if (iu) iu.value = url;
        previewImg();
    }
    btn.disabled = false; btn.textContent = '发表评论';
    input.value = '';
}

async function upReplyImg(input, u) {
    if (!input.files||!input.files[0]) return;
    const url = await uploadFile(input.files[0]);
    if (url) {
        const iu = document.getElementById(u+'-img');
        if (iu) iu.value = url;
        const pv = document.getElementById(u+'-pv');
        if (pv) { pv.src = url; pv.style.display = 'block'; }
    }
    input.value = '';
}

function viewImg(src) {
    const lb = document.getElementById('lightbox');
    const li = document.getElementById('lightbox-img');
    if (lb && li) { li.src = src; lb.classList.add('active'); }
}

// ========== Init ==========
function initComments() {
    if (commentsInited) return;
    const w = document.getElementById('comments-wrapper');
    if (!w) return;

    w.innerHTML = `
    <div class="comment-form" id="comment-form">
        <div class="comment-form-row">
            <input type="text" class="comment-nickname" id="comment-nickname" placeholder="昵称" maxlength="16">
            <span style="font-size:0.8rem;color:var(--text-muted);">头像:</span>
            <div class="avatar-presets">
                ${D_AVATARS.map(e=>`<div class="avatar-preset" onclick="pickAvatar(this,'${e}')">${e}</div>`).join('')}
                <div class="avatar-preset" id="avatar-preview"></div>
            </div>
            <input type="url" class="comment-avatar-url" id="comment-avatar-url" placeholder="或输入头像图片URL…">
        </div>
        <textarea class="comment-textarea" id="comment-textarea" placeholder="写点什么…" rows="3"></textarea>
        <div class="emoji-bar">${EMOJIS.map(e=>`<button class="emoji-btn" onclick="insEmoji('comment-textarea','${e}')">${e}</button>`).join('')}</div>
        <div class="comment-image-row">
            <input type="url" id="comment-image-url" placeholder="图片URL（可选）" style="flex:1;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--page-bg);color:var(--text);font-size:0.85rem;" oninput="previewImg()">
            <label style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:0.85rem;white-space:nowrap;background:var(--page-bg);">📁本地图片<input type="file" accept="image/*" style="display:none" onchange="upMainImg(this)"></label>
            <img id="comment-image-preview" class="comment-image-preview" onerror="this.style.display='none'" onclick="this.style.display='none'">
        </div>
        <div class="comment-submit-row">
            <button class="comment-submit" id="comment-submit-btn" onclick="doComment()">发表评论</button>
        </div>
    </div>
    <div class="comment-count" id="comment-count"></div>
    <div class="comment-list" id="comment-list"></div>`;
    commentsInited = true;
}

// ========== Public API ==========
function showCommentsForEntry(eid) {
    initComments();
    renderComments(eid);
}

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}
