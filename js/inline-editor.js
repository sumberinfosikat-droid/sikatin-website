/* ========================================
   SIKATIN - Inline Visual Editor
   Frontend content editing for admins.
   Toggle via floating button or ?edit=1
   ======================================== */

(function() {
    const STORAGE_KEY = 'sikatin-inline-editor';
    let isEditing = false;
    let editableElements = [];
    let floatingToolbar = null;
    let currentEditable = null;

    // Only init after DOM ready
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        // Only show editor features if admin-auth.js is loaded and admin is authenticated
        if (typeof sikatinAuth === 'undefined' || !sikatinAuth.isAuthenticated()) return;

        // Inject admin floating button
        createAdminFab();

        // Auto-enable if ?edit=1 in URL
        if (new URLSearchParams(window.location.search).get('edit') === '1') {
            toggleEditor(true);
        }
    }

    // ========== ADMIN FAB ==========
    function createAdminFab() {
        const fab = document.createElement('button');
        fab.id = 'sikatin-editor-fab';
        fab.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
        fab.title = 'Toggle Visual Editor';
        fab.addEventListener('click', () => toggleEditor(!isEditing));
        document.body.appendChild(fab);
    }

    // ========== TOGGLE EDITOR ==========
    function toggleEditor(enable) {
        isEditing = enable;

        const fab = document.getElementById('sikatin-editor-fab');
        if (fab) fab.classList.toggle('active', isEditing);

        if (isEditing) {
            enableEditing();
            createTopToolbar();
            createFloatingToolbar();
            showToast('Editor Mode aktif — klik teks untuk mengedit');
        } else {
            disableEditing();
            removeTopToolbar();
            removeFloatingToolbar();
        }
    }

    // ========== ENABLE EDITING ==========
    function enableEditing() {
        const articleContent = document.querySelector('.article-main') || document.querySelector('.article-content');
        if (!articleContent) return;

        // Also make the hero title editable
        const heroTitle = document.querySelector('.page-hero h1');
        if (heroTitle) {
            makeEditable(heroTitle, 'hero-title');
        }

        // Make all content elements editable
        const selectors = 'h2, h3, h4, p, blockquote p, li, figcaption';
        articleContent.querySelectorAll(selectors).forEach((el, i) => {
            // Skip elements inside ad slots or meta sections
            if (el.closest('.ad-slot') || el.closest('.share-section') || el.closest('.article-tags') ||
                el.closest('.sidebar-headline') || el.closest('.sidebar-section-title') ||
                el.closest('.sh-meta') || el.closest('.bento-meta') || el.closest('.card-meta') ||
                el.closest('.article-sidebar')) return;

            makeEditable(el, 'content-' + i);
        });

        document.body.classList.add('sikatin-editing');
    }

    function makeEditable(el, id) {
        el.contentEditable = 'true';
        el.dataset.editId = id;
        el.classList.add('sie-editable');

        el.addEventListener('focus', onEditableFocus);
        el.addEventListener('blur', onEditableBlur);
        el.addEventListener('input', onEditableInput);

        editableElements.push(el);
    }

    function disableEditing() {
        editableElements.forEach(el => {
            el.contentEditable = 'false';
            el.removeAttribute('data-edit-id');
            el.classList.remove('sie-editable', 'sie-active');
            el.removeEventListener('focus', onEditableFocus);
            el.removeEventListener('blur', onEditableBlur);
            el.removeEventListener('input', onEditableInput);
        });
        editableElements = [];
        currentEditable = null;
        document.body.classList.remove('sikatin-editing');
    }

    // ========== EDITABLE EVENTS ==========
    function onEditableFocus(e) {
        // Remove active from previous
        editableElements.forEach(el => el.classList.remove('sie-active'));
        e.target.classList.add('sie-active');
        currentEditable = e.target;
        positionFloatingToolbar(e.target);
    }

    function onEditableBlur() {
        // Delay to allow toolbar button clicks
        setTimeout(() => {
            if (!document.activeElement || !document.activeElement.closest('#sie-floating-toolbar')) {
                hideFloatingToolbar();
            }
        }, 150);
    }

    function onEditableInput(e) {
        // Mark as modified
        e.target.classList.add('sie-modified');
    }

    // ========== TOP TOOLBAR ==========
    function createTopToolbar() {
        if (document.getElementById('sie-top-toolbar')) return;

        const bar = document.createElement('div');
        bar.id = 'sie-top-toolbar';
        bar.innerHTML = `
            <div class="sie-top-left">
                <span class="sie-top-indicator"></span>
                <span class="sie-top-label">EDITOR MODE</span>
            </div>
            <div class="sie-top-actions">
                <button class="sie-top-btn" data-action="add-paragraph" title="Tambah Paragraf">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Paragraf
                </button>
                <button class="sie-top-btn" data-action="add-heading" title="Tambah Heading">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/></svg>
                    Heading
                </button>
                <button class="sie-top-btn" data-action="add-quote" title="Tambah Kutipan">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></svg>
                    Kutipan
                </button>
                <button class="sie-top-btn" data-action="add-image" title="Tambah Gambar">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    Gambar
                </button>
                <button class="sie-top-btn" data-action="add-divider" title="Tambah Pemisah">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="12" x2="22" y2="12"/></svg>
                    Pemisah
                </button>
                <div class="sie-top-sep"></div>
                <button class="sie-top-btn sie-top-btn-accent" data-action="export-html" title="Export HTML">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    Export
                </button>
                <button class="sie-top-btn sie-top-btn-accent" data-action="download" title="Download HTML">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download
                </button>
                <button class="sie-top-btn sie-top-btn-close" data-action="close" title="Tutup Editor">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `;

        document.body.appendChild(bar);

        bar.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                handleTopAction(btn.dataset.action);
            });
        });
    }

    function removeTopToolbar() {
        const bar = document.getElementById('sie-top-toolbar');
        if (bar) bar.remove();
    }

    function handleTopAction(action) {
        const articleContent = document.querySelector('.article-main .container') ||
                              document.querySelector('.article-content .container') ||
                              document.querySelector('.article-main') ||
                              document.querySelector('.article-content');
        if (!articleContent) return;

        // Find insertion point: after current active element, or at end of article content
        const insertAfter = currentEditable || articleContent.querySelector('p:last-of-type, h2:last-of-type') || articleContent.lastElementChild;

        let newEl;

        switch(action) {
            case 'add-paragraph':
                newEl = document.createElement('p');
                newEl.innerHTML = '<br>';
                insertAfterEl(insertAfter, newEl);
                makeEditable(newEl, 'new-' + Date.now());
                newEl.focus();
                break;

            case 'add-heading':
                newEl = document.createElement('h2');
                newEl.innerHTML = '<br>';
                insertAfterEl(insertAfter, newEl);
                makeEditable(newEl, 'new-' + Date.now());
                newEl.focus();
                break;

            case 'add-quote':
                const bq = document.createElement('blockquote');
                newEl = document.createElement('p');
                newEl.innerHTML = '<br>';
                bq.appendChild(newEl);
                insertAfterEl(insertAfter, bq);
                makeEditable(newEl, 'new-' + Date.now());
                newEl.focus();
                break;

            case 'add-image':
                const url = prompt('Masukkan URL gambar:');
                if (!url) return;
                const caption = prompt('Caption (opsional):') || '';
                const fig = document.createElement('figure');
                fig.style.margin = '24px 0';
                const img = document.createElement('img');
                img.src = url;
                img.alt = caption || 'Gambar artikel';
                img.style.cssText = 'max-width:100%;border-radius:8px;';
                img.onerror = function() { this.style.display = 'none'; };
                fig.appendChild(img);
                if (caption) {
                    const fc = document.createElement('figcaption');
                    fc.textContent = caption;
                    fc.style.cssText = 'text-align:center;font-size:0.85rem;color:var(--text-muted);margin-top:8px;font-style:italic;';
                    fig.appendChild(fc);
                    makeEditable(fc, 'new-' + Date.now());
                }
                insertAfterEl(insertAfter, fig);
                showToast('Gambar ditambahkan');
                break;

            case 'add-divider':
                const hr = document.createElement('hr');
                hr.style.cssText = 'border:none;border-top:1.5px solid var(--border-color);margin:32px 0;';
                insertAfterEl(insertAfter, hr);
                showToast('Pemisah ditambahkan');
                break;

            case 'export-html':
                exportHTML();
                break;

            case 'download':
                downloadHTML();
                break;

            case 'close':
                toggleEditor(false);
                break;
        }
    }

    function insertAfterEl(refEl, newEl) {
        if (refEl.nextSibling) {
            refEl.parentNode.insertBefore(newEl, refEl.nextSibling);
        } else {
            refEl.parentNode.appendChild(newEl);
        }
    }

    // ========== FLOATING TOOLBAR ==========
    function createFloatingToolbar() {
        if (document.getElementById('sie-floating-toolbar')) return;

        const tb = document.createElement('div');
        tb.id = 'sie-floating-toolbar';
        tb.innerHTML = `
            <button data-cmd="bold" title="Bold (Ctrl+B)"><b>B</b></button>
            <button data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button>
            <button data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>
            <button data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
            <span class="sie-tb-sep"></span>
            <button data-cmd="createLink" title="Link"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
            <button data-cmd="unlink" title="Hapus Link"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="4" y1="4" x2="20" y2="20" stroke-width="1.5"/></svg></button>
            <span class="sie-tb-sep"></span>
            <button data-action="to-h2" title="Ubah ke H2">H2</button>
            <button data-action="to-h3" title="Ubah ke H3">H3</button>
            <button data-action="to-p" title="Ubah ke Paragraf">P</button>
            <span class="sie-tb-sep"></span>
            <button data-action="move-up" title="Pindah Atas"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg></button>
            <button data-action="move-down" title="Pindah Bawah"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>
            <button data-action="duplicate" title="Duplikat"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
            <button data-action="delete" title="Hapus Blok" class="sie-tb-danger"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        `;

        tb.style.display = 'none';
        document.body.appendChild(tb);
        floatingToolbar = tb;

        // Command buttons
        tb.querySelectorAll('[data-cmd]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const cmd = btn.dataset.cmd;
                if (cmd === 'createLink') {
                    const url = prompt('URL:');
                    if (url) document.execCommand('createLink', false, url);
                } else {
                    document.execCommand(cmd, false, null);
                }
            });
        });

        // Action buttons
        tb.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (!currentEditable) return;
                handleFloatingAction(btn.dataset.action);
            });
        });
    }

    function handleFloatingAction(action) {
        if (!currentEditable) return;

        const el = currentEditable;
        const parent = el.parentNode;

        switch(action) {
            case 'to-h2': replaceTag(el, 'h2'); break;
            case 'to-h3': replaceTag(el, 'h3'); break;
            case 'to-p':  replaceTag(el, 'p'); break;
            case 'move-up': {
                const prev = (el.parentNode.tagName === 'BLOCKQUOTE' ? el.parentNode : el).previousElementSibling;
                if (prev) {
                    const target = el.parentNode.tagName === 'BLOCKQUOTE' ? el.parentNode : el;
                    target.parentNode.insertBefore(target, prev);
                }
                break;
            }
            case 'move-down': {
                const target = el.parentNode.tagName === 'BLOCKQUOTE' ? el.parentNode : el;
                const next = target.nextElementSibling;
                if (next) {
                    target.parentNode.insertBefore(next, target);
                }
                break;
            }
            case 'duplicate': {
                const clone = (el.parentNode.tagName === 'BLOCKQUOTE' ? el.parentNode : el).cloneNode(true);
                const target = el.parentNode.tagName === 'BLOCKQUOTE' ? el.parentNode : el;
                target.parentNode.insertBefore(clone, target.nextSibling);
                const editTarget = clone.tagName === 'BLOCKQUOTE' ? clone.querySelector('p') : clone;
                if (editTarget) {
                    makeEditable(editTarget, 'dup-' + Date.now());
                    editTarget.focus();
                }
                showToast('Blok diduplikat');
                break;
            }
            case 'delete': {
                const target = el.parentNode.tagName === 'BLOCKQUOTE' ? el.parentNode : el;
                const idx = editableElements.indexOf(el);
                if (idx > -1) editableElements.splice(idx, 1);
                target.remove();
                hideFloatingToolbar();
                currentEditable = null;
                showToast('Blok dihapus');
                break;
            }
        }
    }

    function replaceTag(el, newTag) {
        if (el.tagName.toLowerCase() === newTag) return;
        // If inside blockquote and converting to non-quote
        if (el.parentNode.tagName === 'BLOCKQUOTE' && newTag !== 'blockquote') {
            const bq = el.parentNode;
            const newEl = document.createElement(newTag);
            newEl.innerHTML = el.innerHTML;
            bq.parentNode.insertBefore(newEl, bq);
            const idx = editableElements.indexOf(el);
            if (idx > -1) editableElements.splice(idx, 1);
            bq.remove();
            makeEditable(newEl, 'conv-' + Date.now());
            newEl.focus();
        } else {
            const newEl = document.createElement(newTag);
            newEl.innerHTML = el.innerHTML;
            el.parentNode.insertBefore(newEl, el);
            const idx = editableElements.indexOf(el);
            if (idx > -1) editableElements.splice(idx, 1);
            el.remove();
            makeEditable(newEl, 'conv-' + Date.now());
            newEl.focus();
        }
    }

    function positionFloatingToolbar(el) {
        if (!floatingToolbar) return;
        floatingToolbar.style.display = 'flex';
        const rect = el.getBoundingClientRect();
        const tbRect = floatingToolbar.getBoundingClientRect();
        let top = rect.top - tbRect.height - 8 + window.scrollY;
        let left = rect.left + (rect.width / 2) - (tbRect.width / 2);

        // Keep in viewport
        if (top < window.scrollY + 60) top = rect.bottom + 8 + window.scrollY;
        if (left < 8) left = 8;
        if (left + tbRect.width > window.innerWidth - 8) left = window.innerWidth - tbRect.width - 8;

        floatingToolbar.style.top = top + 'px';
        floatingToolbar.style.left = left + 'px';
    }

    function hideFloatingToolbar() {
        if (floatingToolbar) floatingToolbar.style.display = 'none';
    }

    function removeFloatingToolbar() {
        if (floatingToolbar) { floatingToolbar.remove(); floatingToolbar = null; }
    }

    // ========== EXPORT / DOWNLOAD ==========
    function getArticleHTML() {
        // Clone the entire document and clean up editor artifacts
        const html = document.documentElement.cloneNode(true);

        // Remove editor elements
        html.querySelectorAll('#sikatin-editor-fab, #sie-top-toolbar, #sie-floating-toolbar, .sie-toast').forEach(el => el.remove());

        // Clean up contenteditable attributes
        html.querySelectorAll('[contenteditable]').forEach(el => {
            el.removeAttribute('contenteditable');
            el.removeAttribute('data-edit-id');
            el.classList.remove('sie-editable', 'sie-active', 'sie-modified');
        });

        // Remove editor body class
        html.querySelector('body').classList.remove('sikatin-editing');

        // Remove inline-editor script
        html.querySelectorAll('script').forEach(s => {
            if (s.src && s.src.includes('inline-editor')) s.remove();
        });

        return '<!DOCTYPE html>\n' + html.outerHTML;
    }

    function exportHTML() {
        const html = getArticleHTML();

        // Create modal
        const overlay = document.createElement('div');
        overlay.className = 'sie-export-overlay';
        overlay.innerHTML = `
            <div class="sie-export-modal">
                <div class="sie-export-header">
                    <h3>Export HTML</h3>
                    <button class="sie-export-close">&times;</button>
                </div>
                <div class="sie-export-body">
                    <pre class="sie-export-code"></pre>
                </div>
                <div class="sie-export-footer">
                    <button class="sie-export-btn sie-export-copy">Copy to Clipboard</button>
                    <button class="sie-export-btn sie-export-dl">Download .html</button>
                </div>
            </div>
        `;

        overlay.querySelector('.sie-export-code').textContent = html;

        overlay.querySelector('.sie-export-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        overlay.querySelector('.sie-export-copy').addEventListener('click', () => {
            navigator.clipboard.writeText(html);
            showToast('HTML disalin ke clipboard!');
        });

        overlay.querySelector('.sie-export-dl').addEventListener('click', () => {
            const filename = window.location.pathname.split('/').pop() || 'article.html';
            const blob = new Blob([html], { type: 'text/html' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
            showToast('File ' + filename + ' didownload!');
        });

        document.body.appendChild(overlay);
    }

    function downloadHTML() {
        const html = getArticleHTML();
        const filename = window.location.pathname.split('/').pop() || 'article.html';
        const blob = new Blob([html], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('File ' + filename + ' didownload!');
    }

    // ========== TOAST ==========
    function showToast(msg) {
        let t = document.querySelector('.sie-toast');
        if (!t) {
            t = document.createElement('div');
            t.className = 'sie-toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2500);
    }

})();
