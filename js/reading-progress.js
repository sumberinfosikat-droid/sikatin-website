/**
 * SIKATIN — Reading Progress Bar
 * --------------------------------
 * Thin top bar that fills as the user scrolls through an article body.
 * - Targets `.article-body` or `.article-content` as the reading region.
 * - Falls back to full-document scroll if neither present.
 * - Respects prefers-reduced-motion (no transitions).
 * - Zero dependency. Self-contained style injection.
 */
(function () {
  'use strict';
  if (document.getElementById('sikatin-reading-progress')) return;

  // Only run on article pages
  var region = document.querySelector('.article-body') || document.querySelector('.article-content');
  if (!region && !/\/artikel\//.test(location.pathname)) return;

  // Inject style once
  var style = document.createElement('style');
  style.textContent = [
    '#sikatin-reading-progress{',
    '  position:fixed;top:0;left:0;right:0;height:3px;z-index:10000;',
    '  background:transparent;pointer-events:none;',
    '}',
    '#sikatin-reading-progress > span{',
    '  display:block;height:100%;width:0%;',
    '  background:linear-gradient(90deg,#bff747 0%,#14b8a6 60%,#0891b2 100%);',
    '  box-shadow:0 0 12px rgba(191,247,71,0.45);',
    '  transition:width 0.08s linear;',
    '}',
    '@media (prefers-reduced-motion:reduce){',
    '  #sikatin-reading-progress > span{transition:none}',
    '}'
  ].join('');
  document.head.appendChild(style);

  var bar = document.createElement('div');
  bar.id = 'sikatin-reading-progress';
  bar.setAttribute('aria-hidden', 'true');
  var fill = document.createElement('span');
  bar.appendChild(fill);
  document.body.appendChild(bar);

  function compute() {
    var ratio;
    if (region) {
      var rect = region.getBoundingClientRect();
      var top = rect.top + window.scrollY;
      var bottom = top + region.offsetHeight;
      var y = window.scrollY + window.innerHeight * 0.4; // start filling earlier
      ratio = (y - top) / (bottom - top);
    } else {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      ratio = max > 0 ? window.scrollY / max : 0;
    }
    if (ratio < 0) ratio = 0;
    if (ratio > 1) ratio = 1;
    fill.style.width = (ratio * 100).toFixed(1) + '%';
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { compute(); ticking = false; });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  compute();
})();
