/**
 * Gmail Shortcuts
 * Fast, lightweight keyboard shortcuts for Gmail.
 *
 * Shortcuts:
 *   [b] -> Open Snooze menu + HUD
 *   [t] -> Snooze until Tomorrow
 *   [w] -> Snooze until Next week
 *   [m] -> Snooze until Later this week (or This weekend)
 *   [Escape] -> Cancel
 */

(function () {
  'use strict';

  // Prevent duplicate injections
  if (window.__gmail_shortcuts_installed) return;
  window.__gmail_shortcuts_installed = true;

  let snoozeWaiting = false;
  let snoozeTimeout = null;

  const SNOOZE_OPTIONS = {
    t: {
      name: 'Tomorrow',
      patterns: [/tomorrow/i],
      fallbackIndex: 0
    },
    m: {
      name: 'Later this week',
      patterns: [/later this week/i, /this weekend/i, /middle/i],
      fallbackIndex: 1
    },
    w: {
      name: 'Next week',
      patterns: [/next week/i],
      fallbackIndex: 2
    }
  };

  /**
   * Determine if the user is currently typing in an input field, search box, or email draft.
   */
  function isTyping(event) {
    const el = event.target;
    if (!el) return false;
    return (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' ||
      el.isContentEditable ||
      el.closest('[contenteditable="true"]') !== null ||
      el.getAttribute('role') === 'textbox' ||
      el.closest('[role="textbox"]') !== null
    );
  }

  /**
   * Find any currently visible Snooze popup menu in Gmail's DOM.
   */
  function getVisibleSnoozeMenu() {
    const menus = Array.from(
      document.querySelectorAll('div[role="menu"], div[class*="J-M"]')
    ).filter(m => m.offsetParent !== null);

    for (const menu of menus) {
      const items = Array.from(
        menu.querySelectorAll('div[role="menuitem"], div[role="menuitemradio"], div[class*="J-N"]')
      ).filter(item => item.offsetParent !== null);

      if (items.length >= 2) {
        const text = menu.innerText.toLowerCase();
        if (
          text.includes('tomorrow') ||
          text.includes('next week') ||
          text.includes('later this week') ||
          text.includes('select date') ||
          text.includes('pick date')
        ) {
          return { menu, items };
        }
      }
    }
    return null;
  }

  /**
   * Find the visible Snooze button in the Gmail toolbar or message header.
   */
  function findSnoozeButton() {
    const candidates = Array.from(
      document.querySelectorAll(
        'div[aria-label*="Snooze"], div[data-tooltip*="Snooze"], button[aria-label*="Snooze"]'
      )
    );
    return candidates.find(el => el.offsetParent !== null);
  }

  /**
   * Simulate mouse events to properly activate Google Closure UI elements.
   */
  function triggerClick(el) {
    if (!el) return;
    ['mouseenter', 'mousedown', 'mouseup', 'click'].forEach(evtType => {
      el.dispatchEvent(
        new MouseEvent(evtType, {
          bubbles: true,
          cancelable: true,
          view: window
        })
      );
    });
  }

  /**
   * Select a snooze option by key ('t', 'w', 'm') once the menu appears.
   */
  function selectOption(key) {
    const config = SNOOZE_OPTIONS[key];
    if (!config) return;

    const start = Date.now();
    const interval = setInterval(() => {
      const menuData = getVisibleSnoozeMenu();
      if (menuData && menuData.items.length > 0) {
        clearInterval(interval);

        let target = menuData.items.find(item =>
          config.patterns.some(p => p.test(item.innerText))
        );

        if (!target && menuData.items[config.fallbackIndex]) {
          target = menuData.items[config.fallbackIndex];
        }

        if (target) {
          triggerClick(target);
          showHUD(`✓ Snoozed: ${config.name}`, true);
        }
      } else if (Date.now() - start > 2000) {
        clearInterval(interval);
      }
    }, 25);
  }

  /**
   * Display a non-intrusive floating HUD at the bottom of the screen.
   */
  function showHUD(text, isSuccess = false) {
    let hud = document.getElementById('__gmail_snooze_hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = '__gmail_snooze_hud';
      Object.assign(hud.style, {
        position: 'fixed',
        bottom: '28px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '999999',
        padding: '10px 18px',
        borderRadius: '8px',
        fontFamily: 'Google Sans, Roboto, Helvetica, Arial, sans-serif',
        fontSize: '13px',
        fontWeight: '500',
        color: '#ffffff',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
        transition: 'opacity 0.2s ease',
        pointerEvents: 'none',
        lineHeight: '1.4'
      });
      document.body.appendChild(hud);
    }

    hud.style.background = isSuccess ? '#137333' : '#202124';
    hud.innerHTML = text;
    hud.style.opacity = '1';
    hud.style.display = 'block';

    clearTimeout(window.__gmail_hud_timer);
    window.__gmail_hud_timer = setTimeout(() => {
      hud.style.opacity = '0';
      setTimeout(() => {
        hud.style.display = 'none';
      }, 200);
    }, isSuccess ? 2200 : 4500);
  }

  function hideHUD() {
    const hud = document.getElementById('__gmail_snooze_hud');
    if (hud) {
      hud.style.opacity = '0';
      setTimeout(() => {
        hud.style.display = 'none';
      }, 200);
    }
  }

  /**
   * Main keyboard event listener.
   */
  function handleKeyDown(event) {
    // Never intercept when typing or using browser/system shortcuts (Cmd/Ctrl/Alt)
    if (isTyping(event) || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const key = event.key.toLowerCase();
    const menuOpen = getVisibleSnoozeMenu() !== null;

    // 1. User presses 'b' to snooze
    if (key === 'b' && !snoozeWaiting && !menuOpen) {
      snoozeWaiting = true;
      showHUD(
        'Snooze: <b>[T]</b> Tomorrow &nbsp;|&nbsp; <b>[W]</b> Next Week &nbsp;|&nbsp; <b>[M]</b> Later this week &nbsp;|&nbsp; <b>[Esc]</b> Cancel'
      );

      // If Gmail's native keyboard shortcuts are disabled, click the Snooze button automatically
      setTimeout(() => {
        if (!getVisibleSnoozeMenu()) {
          const btn = findSnoozeButton();
          if (btn) triggerClick(btn);
        }
      }, 80);

      clearTimeout(snoozeTimeout);
      snoozeTimeout = setTimeout(() => {
        snoozeWaiting = false;
      }, 4500);
      return;
    }

    // 2. User presses t, w, m or Escape while snooze is active or menu is visible
    if (snoozeWaiting || menuOpen) {
      if (['t', 'w', 'm'].includes(key)) {
        event.preventDefault();
        event.stopPropagation();
        snoozeWaiting = false;
        selectOption(key);
      } else if (key === 'escape') {
        snoozeWaiting = false;
        hideHUD();
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown, true);
})();
