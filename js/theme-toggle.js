/**
 * SIKATIN — Theme Toggle (Dark ↔ Light)
 * --------------------------------------
 * - Site default: dark. Respects saved preference.
 * - Toggle button auto-injected into navbar (looks for .nav-menu or nav).
 * - Stores choice in localStorage('sikatin_theme').
 * - Applies <html data-theme="light|dark"> so CSS can override variables.
 * - Zero flash: applies saved theme BEFORE DOMContentLoaded via inline init.
 */
(function () {
  'use strict';
  var KEY = 'sikatin_theme';
  var root = document.documentElement;

  function getSaved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setSaved(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }
  function apply(theme) {
    root.setAttribute('data-theme', theme);
  }

  // Apply saved theme immediately to avoid flash
  var saved = getSaved();
  if (saved === 'light' || saved === 'dark') {
    apply(saved);
  } else {
    apply('dark'); // default
  }

  function current() { return root.getAttribute('data-theme') || 'dark'; }
  function toggle() {
    var next = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    setSaved(next);
    updateButton();
  }

  var SUN = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  var MOON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  var btn;
  function updateButton() {
    if (!btn) return;
    btn.innerHTML = current() === 'dark' ? SUN : MOON;
    btn.setAttribute('aria-label', current() === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
    btn.setAttribute('title', btn.getAttribute('aria-label'));
  }

  function findHost() {
    return (
      document.querySelector('#navLinks') ||
      document.querySelector('.nav-links') ||
      document.querySelector('.nav-menu')
    );
  }

  function createBtn() {
    var b = document.createElement('button');
    b.id = 'sikatin-theme-toggle';
    b.type = 'button';
    b.className = 'theme-toggle-btn';
    b.addEventListener('click', toggle);
    return b;
  }

  function tryInject() {
    // Only inject when the real host (#navLinks) exists. No floating fallback:
    // we'd rather the toggle wait than appear on top-right corner on mobile.
    var host = findHost();
    if (!host) return false;
    // Remove any stray instances (including fixed-position leftovers).
    var existing = document.querySelectorAll('#sikatin-theme-toggle');
    existing.forEach(function (el) { el.parentNode && el.parentNode.removeChild(el); });
    btn = createBtn();
    host.appendChild(btn);
    updateButton();
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInject);
  } else {
    tryInject();
  }

  // Observe for navbar injected late by main.js
  var mo = new MutationObserver(function () {
    var host = findHost();
    if (!host) return;
    // If no button in host OR stray button outside host, re-inject.
    var inHost = host.querySelector('#sikatin-theme-toggle');
    if (!inHost) tryInject();
  });
  mo.observe(document.body, { childList: true, subtree: true });
  setTimeout(function () { mo.disconnect(); }, 8000);
})();
