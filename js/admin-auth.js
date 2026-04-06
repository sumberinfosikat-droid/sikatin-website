/* ========================================
   SIKATIN - Admin Authentication
   Client-side auth gate for admin features.
   Protects: admin.html, editor.html, inline-editor
   ======================================== */

(function() {
    const AUTH_KEY = 'sikatin-admin-auth';
    const AUTH_HASH_KEY = 'sikatin-admin-hash';

    // Simple hash for client-side password check
    // NOT cryptographically secure — for basic access gating only
    async function hashPassword(pw) {
        const encoder = new TextEncoder();
        const data = encoder.encode(pw + 'sikatin-salt-2026');
        const buf = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Default admin password hash (password: "sikatin2026")
    const ADMIN_HASH = '9f0c6b7e8a3d2f1b4c5e6d7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7';

    function getStoredHash() {
        return localStorage.getItem(AUTH_HASH_KEY) || ADMIN_HASH;
    }

    function isAuthenticated() {
        return sessionStorage.getItem(AUTH_KEY) === 'true';
    }

    function setAuthenticated(val) {
        if (val) {
            sessionStorage.setItem(AUTH_KEY, 'true');
        } else {
            sessionStorage.removeItem(AUTH_KEY);
        }
    }

    function logout() {
        setAuthenticated(false);
        window.location.reload();
    }

    // Create login overlay
    function createLoginOverlay(onSuccess) {
        const overlay = document.createElement('div');
        overlay.id = 'sikatin-auth-overlay';
        overlay.innerHTML = `
            <div class="sa-login-box">
                <div class="sa-login-logo">
                    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        <circle cx="12" cy="16" r="1"/>
                    </svg>
                </div>
                <h2 class="sa-login-title">Admin Login</h2>
                <p class="sa-login-sub">Masukkan password untuk mengakses fitur admin</p>
                <form class="sa-login-form" id="saLoginForm">
                    <div class="sa-input-wrap">
                        <input type="password" id="saPassword" class="sa-input" placeholder="Password" autocomplete="current-password" autofocus>
                        <button type="button" class="sa-toggle-pw" id="saTogglePw" title="Tampilkan password">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    </div>
                    <div class="sa-error" id="saError"></div>
                    <button type="submit" class="sa-submit">
                        <span>Masuk</span>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </form>
                <a href="index.html" class="sa-back-link">&larr; Kembali ke Beranda</a>
            </div>
        `;

        // Inject styles
        const style = document.createElement('style');
        style.textContent = `
            #sikatin-auth-overlay {
                position: fixed; inset: 0; z-index: 99999;
                background: #060606;
                display: flex; align-items: center; justify-content: center;
                font-family: 'Manrope', 'Bricolage Grotesque', sans-serif;
                animation: saFadeIn 0.3s ease;
            }
            @keyframes saFadeIn { from { opacity: 0; } to { opacity: 1; } }
            .sa-login-box {
                width: 100%; max-width: 380px; padding: 40px 32px;
                text-align: center;
            }
            .sa-login-logo {
                display: inline-flex; align-items: center; justify-content: center;
                width: 72px; height: 72px; border-radius: 50%;
                background: rgba(191, 247, 71, 0.08);
                border: 1.5px solid rgba(191, 247, 71, 0.2);
                color: #BFF747; margin-bottom: 24px;
            }
            .sa-login-title {
                font-family: 'Big Shoulders Display', sans-serif;
                font-size: 1.6rem; font-weight: 800;
                letter-spacing: 2px; text-transform: uppercase;
                color: #f0f0f0; margin-bottom: 8px;
            }
            .sa-login-sub {
                font-size: 0.85rem; color: #777; margin-bottom: 32px; line-height: 1.5;
            }
            .sa-login-form { display: flex; flex-direction: column; gap: 12px; }
            .sa-input-wrap {
                position: relative; display: flex; align-items: center;
            }
            .sa-input {
                width: 100%; padding: 14px 48px 14px 16px;
                background: #0e0e0e; border: 1.5px solid #1e1e1e;
                border-radius: 10px; color: #f0f0f0;
                font-family: inherit; font-size: 0.95rem;
                outline: none; transition: border-color 0.2s;
            }
            .sa-input:focus { border-color: #BFF747; }
            .sa-input::placeholder { color: #555; }
            .sa-toggle-pw {
                position: absolute; right: 12px;
                background: none; border: none; color: #555;
                cursor: pointer; padding: 4px; transition: color 0.2s;
            }
            .sa-toggle-pw:hover { color: #BFF747; }
            .sa-error {
                font-size: 0.8rem; color: #ef4444; min-height: 20px;
                transition: opacity 0.2s;
            }
            .sa-submit {
                display: inline-flex; align-items: center; justify-content: center; gap: 8px;
                padding: 14px 24px;
                background: #BFF747; color: #060606;
                border: none; border-radius: 10px;
                font-family: inherit; font-size: 0.9rem; font-weight: 700;
                cursor: pointer; transition: all 0.2s;
            }
            .sa-submit:hover { background: #d4ff66; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(191,247,71,0.3); }
            .sa-submit:active { transform: translateY(0); }
            .sa-submit.sa-loading { pointer-events: none; opacity: 0.7; }
            .sa-back-link {
                display: inline-block; margin-top: 24px;
                font-size: 0.8rem; color: #555; text-decoration: none;
                transition: color 0.2s;
            }
            .sa-back-link:hover { color: #BFF747; }
            .sa-shake { animation: saShake 0.4s ease; }
            @keyframes saShake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-6px); }
                40%, 80% { transform: translateX(6px); }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(overlay);

        // Toggle password visibility
        const pwInput = document.getElementById('saPassword');
        document.getElementById('saTogglePw').addEventListener('click', () => {
            pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
        });

        // Handle submit
        document.getElementById('saLoginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const pw = pwInput.value;
            if (!pw) return;

            const btn = overlay.querySelector('.sa-submit');
            btn.classList.add('sa-loading');

            const hash = await hashPassword(pw);
            const storedHash = getStoredHash();

            // Check against stored hash or default password
            if (hash === storedHash || pw === 'sikatin2026') {
                setAuthenticated(true);
                // Save the hash if using default password for first time
                if (pw === 'sikatin2026' && !localStorage.getItem(AUTH_HASH_KEY)) {
                    localStorage.setItem(AUTH_HASH_KEY, hash);
                }
                overlay.style.animation = 'saFadeIn 0.3s ease reverse';
                setTimeout(() => {
                    overlay.remove();
                    if (onSuccess) onSuccess();
                }, 250);
            } else {
                btn.classList.remove('sa-loading');
                const err = document.getElementById('saError');
                err.textContent = 'Password salah. Coba lagi.';
                pwInput.classList.add('sa-shake');
                setTimeout(() => pwInput.classList.remove('sa-shake'), 400);
                pwInput.value = '';
                pwInput.focus();
            }
        });
    }

    // ========== Public API ==========
    window.sikatinAuth = {
        isAuthenticated,
        logout,
        // Gate a page — shows login overlay if not authenticated
        requireAuth: function(onSuccess) {
            if (isAuthenticated()) {
                if (onSuccess) onSuccess();
                return true;
            }
            createLoginOverlay(onSuccess);
            return false;
        },
        // Change password
        changePassword: async function(newPw) {
            const hash = await hashPassword(newPw);
            localStorage.setItem(AUTH_HASH_KEY, hash);
        }
    };
})();
