/**
 * Gmail Shortcuts
 * Fast, lightweight, and configurable keyboard shortcuts for Gmail.
 *
 * Automatically activates whenever Gmail's Snooze menu is opened
 * (via Gmail's native shortcut, button click, or context menu).
 */

(function () {
  'use strict';

  // Prevent duplicate injections
  if (window.__gmail_shortcuts_installed) return;
  window.__gmail_shortcuts_installed = true;

  const DEFAULT_CONFIG = {
    keyTomorrow: 't',
    keyNextWeek: 'w',
    keyLaterWeek: 'm',
    keyPickDate: 'd',
    showHUD: true,
    hudTimeoutSec: 4
  };

  let currentConfig = { ...DEFAULT_CONFIG };
  let isMenuOpen = false;

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
          text.includes('this weekend') ||
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
  function selectOption(actionName, existingMenuData) {
    const config = SNOOZE_ACTIONS[actionName];
    if (!config) return;

    const menuData = existingMenuData || getVisibleSnoozeMenu();
    if (menuData && menuData.items.length > 0) {
      let target = menuData.items.find(item =>
        config.patterns.some(p => p.test(item.innerText))
      );

      if (!target && menuData.items[config.fallbackIndex]) {
        target = menuData.items[config.fallbackIndex];
      }

      if (target) {
        triggerClick(target);
        showHUD(`✓ Snoozed: ${config.name}`, true);
        isMenuOpen = false;
        return;
      }
    }

    // Fallback: brief polling if menu is still mounting
    const start = Date.now();
    const interval = setInterval(() => {
      const m = getVisibleSnoozeMenu();
      if (m && m.items.length > 0) {
        clearInterval(interval);
        let target = m.items.find(item =>
          config.patterns.some(p => p.test(item.innerText))
        );
        if (!target && m.items[config.fallbackIndex]) {
          target = m.items[config.fallbackIndex];
        }
        if (target) {
          triggerClick(target);
          showHUD(`✓ Snoozed: ${config.name}`, true);
          isMenuOpen = false;
        }
      } else if (Date.now() - start > 1500) {
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
   * Only intercepts keys when Gmail's Snooze menu is actually open on screen.
   */
  function handleKeyDown(event) {
    if (isTyping(event) || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const menuData = getVisibleSnoozeMenu();
    if (!menuData) return;

    const key = event.key.toLowerCase();
    const actionMap = getKeyActionMap();
    const action = actionMap[key];

    if (action) {
      event.preventDefault();
      event.stopPropagation();
      selectOption(action, menuData);
    } else if (key === 'escape') {
      hideHUD();
      isMenuOpen = false;
    }
  }

  document.addEventListener('keydown', handleKeyDown, true);

  /**
   * Automatically detect when Gmail's Snooze menu appears or disappears.
   */
  function checkSnoozeMenu() {
    const menuData = getVisibleSnoozeMenu();
    if (menuData) {
      if (!isMenuOpen) {
        isMenuOpen = true;
        showHUD(getHUDMessage());
      }
    } else {
      if (isMenuOpen) {
        isMenuOpen = false;
        hideHUD();
      }
    }
  }

  let checkScheduled = false;
  const observer = new MutationObserver(() => {
    if (checkScheduled) return;
    checkScheduled = true;
    requestAnimationFrame(() => {
      checkScheduled = false;
      checkSnoozeMenu();
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
