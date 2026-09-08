/**
 * Gmail Shortcuts
 * Fast, lightweight, and configurable keyboard shortcuts for Gmail.
 *
 * Configurable via Chrome Extension Options page:
 *   chrome://extensions -> Details -> Extension options
 */

(function () {
  'use strict';

  // Prevent duplicate injections
  if (window.__gmail_shortcuts_installed) return;
  window.__gmail_shortcuts_installed = true;

  const DEFAULT_CONFIG = {
    triggerKey: 'b',
    keyTomorrow: 't',
    keyNextWeek: 'w',
    keyLaterWeek: 'm',
    keyPickDate: 'd',
    showHUD: true,
    hudTimeoutSec: 4
  };

  let currentConfig = { ...DEFAULT_CONFIG };
  let snoozeWaiting = false;
  let snoozeTimeout = null;

  // Load configuration from storage
  const storage = chrome.storage?.sync || chrome.storage?.local;
  if (storage) {
    storage.get(DEFAULT_CONFIG, (items) => {
      if (items) {
        currentConfig = { ...DEFAULT_CONFIG, ...items };
      }
    });

    // Listen for live updates from the Options page
    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes) => {
        for (const [key, change] of Object.entries(changes)) {
          currentConfig[key] = change.newValue;
        }
      });
    }
  }

  const SNOOZE_ACTIONS = {
    tomorrow: {
      name: 'Tomorrow',
      patterns: [/tomorrow/i],
      fallbackIndex: 0
    },
    later_this_week: {
      name: 'Later this week',
      patterns: [/later this week/i, /this weekend/i, /middle/i],
      fallbackIndex: 1
    },
    next_week: {
      name: 'Next week',
      patterns: [/next week/i],
      fallbackIndex: 2
    },
    pick_date: {
      name: 'Select date & time',
      patterns: [/select date/i, /pick date/i, /choose date/i],
      fallbackIndex: 3
    }
  };

  function getKeyActionMap() {
    const map = {};
    if (currentConfig.keyTomorrow) map[currentConfig.keyTomorrow.toLowerCase()] = 'tomorrow';
    if (currentConfig.keyNextWeek) map[currentConfig.keyNextWeek.toLowerCase()] = 'next_week';
    if (currentConfig.keyLaterWeek) map[currentConfig.keyLaterWeek.toLowerCase()] = 'later_this_week';
    if (currentConfig.keyPickDate) map[currentConfig.keyPickDate.toLowerCase()] = 'pick_date';
    return map;
  }

  function getHUDMessage() {
    const parts = [];
    if (currentConfig.keyTomorrow) parts.push(`<b>[${currentConfig.keyTomorrow.toUpperCase()}]</b> Tomorrow`);
    if (currentConfig.keyNextWeek) parts.push(`<b>[${currentConfig.keyNextWeek.toUpperCase()}]</b> Next Week`);
    if (currentConfig.keyLaterWeek) parts.push(`<b>[${currentConfig.keyLaterWeek.toUpperCase()}]</b> Later this week`);
    if (currentConfig.keyPickDate) parts.push(`<b>[${currentConfig.keyPickDate.toUpperCase()}]</b> Pick date`);
    parts.push('<b>[Esc]</b> Cancel');
    return `Snooze: ${parts.join(' &nbsp;|&nbsp; ')}`;
  }

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
   * Select a snooze option by action name ('tomorrow', 'next_week', etc.)
   */
  function selectOption(actionName) {
    const config = SNOOZE_ACTIONS[actionName];
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
    if (!currentConfig.showHUD && !isSuccess) return;

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

    const timeoutDuration = isSuccess ? 2200 : (currentConfig.hudTimeoutSec || 4) * 1000;

    clearTimeout(window.__gmail_hud_timer);
    window.__gmail_hud_timer = setTimeout(() => {
      hud.style.opacity = '0';
      setTimeout(() => {
        hud.style.display = 'none';
      }, 200);
    }, timeoutDuration);
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
    const triggerKey = (currentConfig.triggerKey || 'b').toLowerCase();
    const menuOpen = getVisibleSnoozeMenu() !== null;
    const actionMap = getKeyActionMap();

    // 1. User presses trigger key (default 'b')
    if (key === triggerKey && !snoozeWaiting && !menuOpen) {
      snoozeWaiting = true;
      showHUD(getHUDMessage());

      // If Gmail's native keyboard shortcuts are disabled, click the Snooze button automatically
      setTimeout(() => {
        if (!getVisibleSnoozeMenu()) {
          const btn = findSnoozeButton();
          if (btn) triggerClick(btn);
        }
      }, 80);

      const waitDuration = (currentConfig.hudTimeoutSec || 4) * 1000;
      clearTimeout(snoozeTimeout);
      snoozeTimeout = setTimeout(() => {
        snoozeWaiting = false;
      }, waitDuration);
      return;
    }

    // 2. User presses an action key or Escape while snooze is active or menu is visible
    if (snoozeWaiting || menuOpen) {
      const action = actionMap[key];
      if (action) {
        event.preventDefault();
        event.stopPropagation();
        snoozeWaiting = false;
        selectOption(action);
      } else if (key === 'escape') {
        snoozeWaiting = false;
        hideHUD();
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown, true);
})();
