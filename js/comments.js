/**
 * SIKATIN Comment System — Frontend
 * ---------------------------------
 * Renders the comment UI inside any <div class="sikatin-comments" data-article="slug">.
 * Self-contained, defer-safe, no framework.
 *
 * Contract with api/comments.php:
 *  GET  ?article=SLUG       → { comments: [...], total }
 *  POST (JSON body)         → { article, name, content, hp, ts } → 201 | 400 | 429
 */
(function() {
  'use strict';
  const ENDPOINT = '/api/comments.php';
  const MAX_NAME = 40;
  const MAX_CONTENT = 1500;

  function el(tag, attrs, ...children) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    for (const c of children) {
      if (c == null) continue;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return n;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffSec = Math.round((now - d) / 1000);
      if (diffSec < 60) return 'baru saja';
      if (diffSec < 3600) return Math.floor(diffSec / 60) + ' menit lalu';
      if (diffSec < 86400) return Math.floor(diffSec / 3600) + ' jam lalu';
      if (diffSec < 604800) return Math.floor(diffSec / 86400) + ' hari lalu';
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return iso; }
  }

  function avatarColor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return `hsl(${hue}, 60%, 45%)`;
  }

  function renderComment(c) {
    const initial = (c.name || '?').trim().charAt(0).toUpperCase();
    const item = el('div', { class: 'comment-item' });
    const avatar = el('div', { class: 'comment-avatar' }, initial);
    avatar.style.background = avatarColor(c.name || '?');
    const body = el('div', { class: 'comment-body' });
    const header = el('div', { class: 'comment-header' },
      el('span', { class: 'comment-name' }, c.name),
      el('span', { class: 'comment-time' }, formatDate(c.created_at))
    );
    const content = el('div', { class: 'comment-content' });
    content.innerHTML = escapeHTML(c.content).replace(/\n/g, '<br>');
    body.appendChild(header);
    body.appendChild(content);
    item.appendChild(avatar);
    item.appendChild(body);
    return item;
  }

  function renderList(container, comments) {
    const list = container.querySelector('.comment-list');
    list.innerHTML = '';
    if (comments.length === 0) {
      list.appendChild(el('div', { class: 'comment-empty' },
        'Belum ada komentar. Jadilah yang pertama berkomentar!'));
      return;
    }
    comments.forEach(c => list.appendChild(renderComment(c)));
  }

  function setCount(container, n) {
    const counter = container.querySelector('.comment-count');
    if (counter) counter.textContent = n;
  }

  function loadComments(container, slug) {
    fetch(`${ENDPOINT}?article=${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        const comments = (data && data.comments) || [];
        renderList(container, comments);
        setCount(container, data.total || comments.length);
      })
      .catch(() => {
        renderList(container, []);
        setCount(container, 0);
      });
  }

  function buildForm(container, slug) {
    const openedAt = Math.floor(Date.now() / 1000);
    const form = el('form', { class: 'comment-form', novalidate: '' });
    form.innerHTML = `
      <div class="comment-form-row">
        <input type="text" name="name" placeholder="Nama kamu" maxlength="${MAX_NAME}" required>
      </div>
      <div class="comment-form-row">
        <textarea name="content" placeholder="Tulis komentar kamu..." rows="4" maxlength="${MAX_CONTENT}" required></textarea>
      </div>
      <div class="comment-form-row comment-form-footer">
        <div class="comment-hp"><label>Jangan diisi <input type="text" name="hp" tabindex="-1" autocomplete="off"></label></div>
        <button type="submit" class="comment-submit">Kirim Komentar</button>
      </div>
      <div class="comment-status" role="status" aria-live="polite"></div>
    `;
    const status = form.querySelector('.comment-status');
    const button = form.querySelector('.comment-submit');

    form.addEventListener('submit', e => {
      e.preventDefault();
      status.textContent = '';
      status.className = 'comment-status';
      const fd = new FormData(form);
      const payload = {
        article: slug,
        name: (fd.get('name') || '').toString().trim(),
        content: (fd.get('content') || '').toString().trim(),
        hp: fd.get('hp') || '',
        ts: openedAt
      };
      if (payload.name.length < 2 || payload.content.length < 5) {
        status.textContent = 'Nama min 2 huruf, komentar min 5 huruf.';
        status.classList.add('error');
        return;
      }
      button.disabled = true;
      button.textContent = 'Mengirim...';
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(r => r.json().then(data => ({ ok: r.ok, status: r.status, data })))
        .then(res => {
          if (res.ok && res.data && res.data.comment) {
            // append new comment
            const list = container.querySelector('.comment-list');
            const empty = list.querySelector('.comment-empty');
            if (empty) list.removeChild(empty);
            list.appendChild(renderComment(res.data.comment));
            const counter = container.querySelector('.comment-count');
            counter.textContent = (parseInt(counter.textContent, 10) || 0) + 1;
            form.reset();
            status.textContent = 'Komentar terkirim. Terima kasih!';
            status.classList.add('success');
          } else if (res.ok && res.data && res.data.status === 'pending_review') {
            form.reset();
            status.textContent = 'Komentar kamu menunggu moderasi.';
            status.classList.add('success');
          } else {
            status.textContent = (res.data && res.data.error) || 'Gagal mengirim komentar.';
            status.classList.add('error');
          }
        })
        .catch(() => {
          status.textContent = 'Koneksi gagal. Coba lagi.';
          status.classList.add('error');
        })
        .finally(() => {
          button.disabled = false;
          button.textContent = 'Kirim Komentar';
        });
    });
    return form;
  }

  function mount(container) {
    const slug = container.getAttribute('data-article');
    if (!slug) return;
    container.innerHTML = `
      <div class="comment-header-main">
        <h3 class="comment-title"><span class="comment-count">0</span> Komentar</h3>
        <p class="comment-subtitle">Bagikan pendapatmu tentang artikel ini.</p>
      </div>
      <div class="comment-list" aria-live="polite"></div>
      <div class="comment-form-wrap"></div>
    `;
    container.querySelector('.comment-form-wrap').appendChild(buildForm(container, slug));
    loadComments(container, slug);
  }

  function init() {
    document.querySelectorAll('.sikatin-comments[data-article]').forEach(mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
