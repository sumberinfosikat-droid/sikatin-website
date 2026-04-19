/**
 * SIKATIN Monitoring & Alerting
 * - JS error tracking (window.onerror + unhandledrejection)
 * - Web Vitals (LCP, FID, CLS, FCP, TTFB)
 * - Page performance (load time, DOM ready)
 * - Client info logging (anonymous)
 * - Sends beacon to /api/monitoring endpoint OR logs to console if endpoint missing
 * - Deduplicates errors in same session (localStorage)
 */
(function() {
    'use strict';

    const VERSION = '1.0.0';
    const ENDPOINT = '/api/monitoring.php'; // server-side receiver (sikatin api)
    const LOG_TO_CONSOLE = true; // dev mode fallback
    const SAMPLE_RATE = 1.0; // 100% for now, reduce if traffic high
    const sessionKey = 'sikatin_monitoring_session';
    const errorCacheKey = 'sikatin_error_cache';
    const maxErrorsPerSession = 20;

    // Skip if not sampled
    if (Math.random() > SAMPLE_RATE) return;

    // Session ID (per tab)
    let sessionId = sessionStorage.getItem(sessionKey);
    if (!sessionId) {
        sessionId = 'ss_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
        sessionStorage.setItem(sessionKey, sessionId);
    }

    // Error dedup cache
    function getErrorCache() {
        try { return JSON.parse(sessionStorage.getItem(errorCacheKey) || '{}'); }
        catch(e) { return {}; }
    }
    function setErrorCache(cache) {
        try { sessionStorage.setItem(errorCacheKey, JSON.stringify(cache)); } catch(e) {}
    }

    // Send beacon
    function report(type, data) {
        const payload = {
            type: type,
            session: sessionId,
            url: location.pathname,
            href: location.href,
            referrer: document.referrer || null,
            ua: navigator.userAgent.substring(0, 200),
            lang: navigator.language,
            screen: `${screen.width}x${screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            conn: (navigator.connection && navigator.connection.effectiveType) || 'unknown',
            timestamp: Date.now(),
            version: VERSION,
            data: data
        };

        if (LOG_TO_CONSOLE) {
            console.log(`[SIKATIN Monitor] ${type}`, payload.data);
        }

        // Use sendBeacon for reliability (survives page unload)
        if (navigator.sendBeacon) {
            try {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(ENDPOINT, blob);
            } catch(e) { /* silent fail */ }
        }
    }

    // === ERROR TRACKING ===
    let errorCount = 0;
    window.addEventListener('error', function(e) {
        if (errorCount >= maxErrorsPerSession) return;
        const cache = getErrorCache();
        const key = `${e.message}|${e.filename}|${e.lineno}`;
        if (cache[key]) return; // dedup
        cache[key] = true;
        setErrorCache(cache);
        errorCount++;
        report('error', {
            message: e.message,
            filename: (e.filename || '').replace(location.origin, ''),
            line: e.lineno,
            col: e.colno,
            stack: e.error && e.error.stack ? e.error.stack.substring(0, 500) : null
        });
    }, true);

    window.addEventListener('unhandledrejection', function(e) {
        if (errorCount >= maxErrorsPerSession) return;
        errorCount++;
        report('promise_rejection', {
            reason: String(e.reason).substring(0, 500)
        });
    });

    // === WEB VITALS (lightweight impl, no external lib) ===
    const vitals = {};

    // LCP - Largest Contentful Paint
    if ('PerformanceObserver' in window) {
        try {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                vitals.lcp = Math.round(lastEntry.startTime);
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch(e) {}

        // FID / INP - interaction
        try {
            const fidObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    vitals.fid = Math.round(entry.processingStart - entry.startTime);
                });
            });
            fidObserver.observe({ type: 'first-input', buffered: true });
        } catch(e) {}

        // CLS - Cumulative Layout Shift
        try {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                        vitals.cls = Math.round(clsValue * 1000) / 1000;
                    }
                });
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch(e) {}
    }

    // FCP + TTFB from navigation timing
    function collectNavTiming() {
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav) {
            vitals.ttfb = Math.round(nav.responseStart);
            vitals.dcl = Math.round(nav.domContentLoadedEventEnd);
            vitals.load = Math.round(nav.loadEventEnd);
            vitals.dom = Math.round(nav.domComplete);
        }
        const paint = performance.getEntriesByType('paint');
        const fcp = paint.find(p => p.name === 'first-contentful-paint');
        if (fcp) vitals.fcp = Math.round(fcp.startTime);
    }

    // Report vitals on page visibility change (survives back/forward cache)
    let vitalsReported = false;
    function reportVitals() {
        if (vitalsReported) return;
        vitalsReported = true;
        collectNavTiming();
        report('vitals', vitals);
    }

    // Report on visibility hidden (more reliable than unload)
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') reportVitals();
    });
    // Fallback: report 3s after load
    window.addEventListener('load', function() {
        setTimeout(reportVitals, 3000);
    });

    // === PAGE VIEW ===
    report('pageview', { title: document.title.substring(0, 120) });

    // === HEALTH CHECK helper (for status page) ===
    window.SIKATIN_MONITOR = {
        version: VERSION,
        sessionId: sessionId,
        vitals: vitals,
        reportCustom: function(name, data) { report('custom:' + name, data); }
    };
})();
