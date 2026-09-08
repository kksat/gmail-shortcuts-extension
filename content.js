/**
 * Gmail Shortcuts
 * Fast, lightweight, and configurable keyboard shortcuts for Gmail.
 *
 * Features:
 *   - Auto-activates in Snooze menu (1, 2, 3 dynamic slots, u unsnooze, t, w, m, d)
 *   - Email list navigation: ]] for Next Page, [[ for Previous Page (only in list view)
 */

(function () {
  'use strict';

  // Prevent duplicate injections
  if (window.__gmail_shortcuts_installed) return;
  window.__gmail_shortcuts_installed = true;

  const DEFAULT_CONFIG = {
    keyOpt1: '1',
    keyOpt2: '2',
    keyOpt3: '3',
    keyUnsnooze: 'u',
    keyTomorrow: 't',
    keyNextWeek: 'w',
    keyLaterWeek: 'm',
    keyPickDate: 'd',
    enablePagination: true,
    showHUD: true,
    hudTimeoutSec: 4
  };

  let currentConfig = { ...DEFAULT_CONFIG };
  let isMenuOpen = false;

  // State for ]] and [[ bracket sequence detection
  let lastBracketKey = null;
  let lastBracketTimer = null;
  const BRACKET_TIMEOUT_MS = 500;

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
   * Determine if the user is in the email list view (Inbox, Sent, Search, etc.)
   * and NOT currently viewing an individual email message thread.
   */
  function isEmailListView() {
    // 1. If Snooze menu is open, prioritize snooze actions
    if (getVisibleSnoozeMenu() !== null) return false;

    // 2. If 'Back to...' button is visible, an individual email thread is open
    const backBtn = document.querySelector(
      'div[act="19"], div[aria-label*="Back to"], div[data-tooltip*="Back to"], div[aria-label*="Назад"], div[data-tooltip*="Назад"]'
    );
    if (backBtn && backBtn.offsetParent !== null) {
      return false;
    }

    // 3. Thread list container gh="tl" must be visible
    const threadList = document.querySelector('div[gh="tl"]');
    if (threadList && threadList.offsetParent !== null) {
      return true;
    }

    // 4. Fallback: Table with role="grid" inside role="main"
    const grid = document.querySelector('div[role="main"] table[role="grid"]');
    return !!(grid && grid.offsetParent !== null);
  }

  /**
   * Find Gmail's pagination buttons for Next Page (Older) and Prev Page (Newer).
   */
  function findPaginationButtons() {
    const nextSelectors = [
      'div[data-tooltip*="Older"]',
      'div[aria-label*="Older"]',
      'div[data-tooltip*="Next page"]',
      'div[aria-label*="Next page"]',
      'div[data-tooltip*="Next"]',
      'div[aria-label*="Next"]',
      'div[data-tooltip*="Раньше"]',
      'div[aria-label*="Раньше"]',
      'div[data-tooltip*="Ältere"]',
      'div[data-tooltip*="Plus anciens"]',
      'div[data-tooltip*="Más antiguos"]'
    ];

    const prevSelectors = [
      'div[data-tooltip*="Newer"]',
      'div[aria-label*="Newer"]',
      'div[data-tooltip*="Previous page"]',
      'div[aria-label*="Previous page"]',
      'div[data-tooltip*="Previous"]',
      'div[aria-label*="Previous"]',
      'div[data-tooltip*="Позже"]',
      'div[aria-label*="Позже"]',
      'div[data-tooltip*="Neuere"]',
      'div[data-tooltip*="Plus récents"]',
      'div[data-tooltip*="Más recientes"]'
    ];

    let nextBtn = null;
    let prevBtn = null;

    for (const sel of nextSelectors) {
      const el = Array.from(document.querySelectorAll(sel)).find(e => e.offsetParent !== null);
      if (el) {
        nextBtn = el;
        break;
      }
    }

    for (const sel of prevSelectors) {
      const el = Array.from(document.querySelectorAll(sel)).find(e => e.offsetParent !== null);
      if (el) {
        prevBtn = el;
        break;
      }
    }

    return { nextBtn, prevBtn };
  }

  function isBtnDisabled(btn) {
    if (!btn) return true;
    if (btn.getAttribute('aria-disabled') === 'true') return true;
    if (btn.classList.contains('J-J5-Ji-I-dis')) return true;
    if (btn.hasAttribute('disabled')) return true;
    return false;
  }

  function goToNextPage() {
    const { nextBtn } = findPaginationButtons();
    if (!nextBtn) {
      showHUD('⚠️ Next page button not found');
      return;
    }
    if (isBtnDisabled(nextBtn)) {
      showHUD('Already on the last page');
      return;
    }
    triggerClick(nextBtn);
    showHUD('Next page →', true);
  }

  function goToPrevPage() {
    const { prevBtn } = findPaginationButtons();
    if (!prevBtn) {
      showHUD('⚠️ Previous page button not found');
      return;
    }
    if (isBtnDisabled(prevBtn)) {
      showHUD('Already on the first page');
      return;
    }
    triggerClick(prevBtn);
    showHUD('← Previous page', true);
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
          text.includes('unsnooze') ||
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
   * Categorize items in the Snooze menu into:
   * - unsnoozeItem (if email is already snoozed)
   * - pickDateItem (custom date & time picker)
   * - dynamicItems (suggested time presets: Tomorrow, Next week, etc.)
   */
  function parseSnoozeMenuItems(items) {
    let unsnoozeItem = null;
    let pickDateItem = null;
    const dynamicItems = [];

    for (const item of items) {
      const text = (item.innerText + ' ' + (item.getAttribute('aria-label') || '')).toLowerCase();

      if (text.includes('unsnooze') || text.includes('un-snooze') || text.includes('вернуть во входящие') || text.includes('desposponer')) {
        unsnoozeItem = item;
      } else if (text.includes('select date') || text.includes('pick date') || text.includes('choose date') || text.includes('выбрать дату')) {
        pickDateItem = item;
      } else {
        dynamicItems.push(item);
      }
    }

    return { unsnoozeItem, pickDateItem, dynamicItems };
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

  function clickMenuItem(el, label) {
    if (!el) return;
    triggerClick(el);
    showHUD(`✓ Snoozed: ${label}`, true);
    isMenuOpen = false;
  }

  /**
   * Build the floating HUD message dynamically from the currently visible menu options.
   */
  function getHUDMessage(parsed) {
    const parts = [];

    if (parsed.unsnoozeItem) {
      const uKey = (currentConfig.keyUnsnooze || 'u').toUpperCase();
      parts.push(`<b>[${uKey}]</b> Unsnooze`);
    }

    const optKeys = [
      (currentConfig.keyOpt1 || '1').toUpperCase(),
      (currentConfig.keyOpt2 || '2').toUpperCase(),
      (currentConfig.keyOpt3 || '3').toUpperCase()
    ];

    parsed.dynamicItems.forEach((item, idx) => {
      const keyLabel = optKeys[idx] || `${idx + 1}`;
      const title = (item.innerText || '').split('\n')[0].trim();
      parts.push(`<b>[${keyLabel}]</b> ${title}`);
    });

    if (parsed.pickDateItem) {
      const dKey = (currentConfig.keyPickDate || 'd').toUpperCase();
      parts.push(`<b>[${dKey}]</b> Pick date`);
    }

    parts.push('<b>[Esc]</b> Cancel');
    return `Snooze: ${parts.join(' &nbsp;|&nbsp; ')}`;
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
    if (isTyping(event) || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const key = event.key.toLowerCase();
    const menuData = getVisibleSnoozeMenu();

    // =======================================================================
    // Context 1: Email List View Navigation (]] Next Page, [[ Previous Page)
    // Only active when listing emails and NOT in an open email thread
    // =======================================================================
    if (!menuData && currentConfig.enablePagination && isEmailListView()) {
      if (key === ']') {
        if (lastBracketKey === ']') {
          // Second ']' -> Next Page!
          clearTimeout(lastBracketTimer);
          lastBracketKey = null;
          event.preventDefault();
          event.stopPropagation();
          goToNextPage();
        } else {
          // First ']' -> Start timer
          lastBracketKey = ']';
          event.preventDefault();
          event.stopPropagation();
          clearTimeout(lastBracketTimer);
          lastBracketTimer = setTimeout(() => {
            lastBracketKey = null;
          }, BRACKET_TIMEOUT_MS);
        }
        return;
      }

      if (key === '[') {
        if (lastBracketKey === '[') {
          // Second '[' -> Previous Page!
          clearTimeout(lastBracketTimer);
          lastBracketKey = null;
          event.preventDefault();
          event.stopPropagation();
          goToPrevPage();
        } else {
          // First '[' -> Start timer
          lastBracketKey = '[';
          event.preventDefault();
          event.stopPropagation();
          clearTimeout(lastBracketTimer);
          lastBracketTimer = setTimeout(() => {
            lastBracketKey = null;
          }, BRACKET_TIMEOUT_MS);
        }
        return;
      }

      // Any other key clears bracket sequence
      lastBracketKey = null;
      clearTimeout(lastBracketTimer);
    }

    // =======================================================================
    // Context 2: Snooze Menu Open (Dynamic 1, 2, 3, Unsnooze u, Named t, w, m, d)
    // =======================================================================
    if (!menuData) return;

    const parsed = parseSnoozeMenuItems(menuData.items);

    // 1. Unsnooze shortcut (default 'u')
    if (key === (currentConfig.keyUnsnooze || 'u').toLowerCase()) {
      event.preventDefault();
      event.stopPropagation();
      if (parsed.unsnoozeItem) {
        clickMenuItem(parsed.unsnoozeItem, 'Unsnooze');
      } else {
        showHUD('⚠️ Unsnooze is not available for this email');
      }
      return;
    }

    // 2. Dynamic options 1, 2, 3 (configurable)
    const optMap = {
      [(currentConfig.keyOpt1 || '1').toLowerCase()]: 0,
      [(currentConfig.keyOpt2 || '2').toLowerCase()]: 1,
      [(currentConfig.keyOpt3 || '3').toLowerCase()]: 2
    };

    if (optMap[key] !== undefined && parsed.dynamicItems[optMap[key]]) {
      event.preventDefault();
      event.stopPropagation();
      const target = parsed.dynamicItems[optMap[key]];
      clickMenuItem(target, target.innerText.split('\n')[0].trim());
      return;
    }

    // Direct digits 1-9 fallback for dynamic items
    const digitIndex = parseInt(key, 10) - 1;
    if (!isNaN(digitIndex) && digitIndex >= 0 && parsed.dynamicItems[digitIndex]) {
      event.preventDefault();
      event.stopPropagation();
      const target = parsed.dynamicItems[digitIndex];
      clickMenuItem(target, target.innerText.split('\n')[0].trim());
      return;
    }

    // 3. Named shortcuts: Tomorrow ('t'), Next week ('w'), Later this week ('m'), Pick date ('d')
    if (key === (currentConfig.keyTomorrow || 't').toLowerCase()) {
      const target = menuData.items.find(it => /tomorrow/i.test(it.innerText));
      if (target) {
        event.preventDefault();
        event.stopPropagation();
        clickMenuItem(target, 'Tomorrow');
        return;
      }
    }

    if (key === (currentConfig.keyNextWeek || 'w').toLowerCase()) {
      const target = menuData.items.find(it => /next week/i.test(it.innerText));
      if (target) {
        event.preventDefault();
        event.stopPropagation();
        clickMenuItem(target, 'Next week');
        return;
      }
    }

    if (key === (currentConfig.keyLaterWeek || 'm').toLowerCase()) {
      const target = menuData.items.find(it => /later this week|this weekend|middle/i.test(it.innerText));
      if (target) {
        event.preventDefault();
        event.stopPropagation();
        clickMenuItem(target, target.innerText.split('\n')[0].trim());
        return;
      }
    }

    if (key === (currentConfig.keyPickDate || 'd').toLowerCase()) {
      if (parsed.pickDateItem) {
        event.preventDefault();
        event.stopPropagation();
        clickMenuItem(parsed.pickDateItem, 'Select date & time');
        return;
      }
    }

    if (key === 'escape') {
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
        const parsed = parseSnoozeMenuItems(menuData.items);
        showHUD(getHUDMessage(parsed));
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
