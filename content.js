/**
 * Gmail Shortcuts
 * Fast, lightweight keyboard shortcuts for Gmail with in-app toolbar help.
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

  // =========================================================================
  // In-App Toolbar Help Widget (Placed right next to the Selection buttons)
  // =========================================================================

  function isDarkTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function createHelpPopover() {
    const popover = document.createElement('div');
    popover.id = '__gmail_shortcuts_help_popover';
    const dark = isDarkTheme();

    Object.assign(popover.style, {
      position: 'fixed',
      zIndex: '999999',
      display: 'none',
      width: '320px',
      backgroundColor: dark ? '#28292a' : '#ffffff',
      color: dark ? '#e8eaed' : '#202124',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.28), 0 0 1px rgba(0, 0, 0, 0.2)',
      border: `1px solid ${dark ? '#3c4043' : '#dadce0'}`,
      padding: '16px',
      fontFamily: 'Google Sans, Roboto, Helvetica, Arial, sans-serif',
      fontSize: '13px',
      lineHeight: '1.5'
    });

    popover.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid ${dark ? '#3c4043' : '#f1f3f4'}; padding-bottom: 8px;">
        <span style="font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px;">
          <span>⌨</span> Gmail Shortcuts
        </span>
        <button id="__gmail_shortcuts_close_btn" style="background: none; border: none; font-size: 16px; cursor: pointer; color: inherit; padding: 2px 6px; border-radius: 4px;">✕</button>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${dark ? '#9aa0a6' : '#5f6368'}; margin-bottom: 6px;">
          Snooze Email
        </div>
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; align-items: center;">
          <span style="display: inline-flex; gap: 4px;">
            <kbd style="padding: 2px 6px; border-radius: 4px; background: ${dark ? '#3c4043' : '#f1f3f4'}; border: 1px solid ${dark ? '#5f6368' : '#dadce0'}; font-family: monospace; font-size: 12px; font-weight: bold;">b</kbd>
            <span style="opacity: 0.6;">then</span>
            <kbd style="padding: 2px 6px; border-radius: 4px; background: ${dark ? '#3c4043' : '#f1f3f4'}; border: 1px solid ${dark ? '#5f6368' : '#dadce0'}; font-family: monospace; font-size: 12px; font-weight: bold;">t</kbd>
          </span>
          <span>Tomorrow</span>

          <span style="display: inline-flex; gap: 4px;">
            <kbd style="padding: 2px 6px; border-radius: 4px; background: ${dark ? '#3c4043' : '#f1f3f4'}; border: 1px solid ${dark ? '#5f6368' : '#dadce0'}; font-family: monospace; font-size: 12px; font-weight: bold;">b</kbd>
            <span style="opacity: 0.6;">then</span>
            <kbd style="padding: 2px 6px; border-radius: 4px; background: ${dark ? '#3c4043' : '#f1f3f4'}; border: 1px solid ${dark ? '#5f6368' : '#dadce0'}; font-family: monospace; font-size: 12px; font-weight: bold;">w</kbd>
          </span>
          <span>Next week</span>

          <span style="display: inline-flex; gap: 4px;">
            <kbd style="padding: 2px 6px; border-radius: 4px; background: ${dark ? '#3c4043' : '#f1f3f4'}; border: 1px solid ${dark ? '#5f6368' : '#dadce0'}; font-family: monospace; font-size: 12px; font-weight: bold;">b</kbd>
            <span style="opacity: 0.6;">then</span>
            <kbd style="padding: 2px 6px; border-radius: 4px; background: ${dark ? '#3c4043' : '#f1f3f4'}; border: 1px solid ${dark ? '#5f6368' : '#dadce0'}; font-family: monospace; font-size: 12px; font-weight: bold;">m</kbd>
          </span>
          <span>Later this week / Weekend</span>

          <span style="display: inline-flex;">
            <kbd style="padding: 2px 6px; border-radius: 4px; background: ${dark ? '#3c4043' : '#f1f3f4'}; border: 1px solid ${dark ? '#5f6368' : '#dadce0'}; font-family: monospace; font-size: 12px; font-weight: bold;">Esc</kbd>
          </span>
          <span>Cancel Snooze</span>
        </div>
      </div>
      <div style="font-size: 11px; color: ${dark ? '#9aa0a6' : '#5f6368'}; background: ${dark ? '#303134' : '#f8f9fa'}; padding: 8px; border-radius: 6px; line-height: 1.4;">
        💡 <b>Tip:</b> Works when an email is open or selected. Never triggers while typing a draft or search query.
      </div>
    `;

    popover.querySelector('#__gmail_shortcuts_close_btn').addEventListener('click', (e) => {
      e.stopPropagation();
      popover.style.display = 'none';
    });

    return popover;
  }

  function togglePopover(btn) {
    let popover = document.getElementById('__gmail_shortcuts_help_popover');
    if (popover && popover.style.display !== 'none') {
      popover.style.display = 'none';
      return;
    }

    if (!popover) {
      popover = createHelpPopover();
      document.body.appendChild(popover);
    }

    const rect = btn.getBoundingClientRect();
    popover.style.top = `${rect.bottom + 8}px`;
    popover.style.left = `${Math.max(12, rect.left)}px`;
    popover.style.display = 'block';
  }

  // Dismiss popover on clicks outside
  document.addEventListener('click', (e) => {
    const popover = document.getElementById('__gmail_shortcuts_help_popover');
    const btn = document.getElementById('__gmail_shortcuts_help_btn');
    if (!popover || popover.style.display === 'none') return;
    if (btn && btn.contains(e.target)) return;
    if (!popover.contains(e.target)) {
      popover.style.display = 'none';
    }
  });

  /**
   * Inject the help button next to the selection buttons in the toolbar.
   */
  function injectHelpWidget() {
    if (document.getElementById('__gmail_shortcuts_help_btn')) return;

    // 1. In list view: right next to selection buttons (div[gh="s"])
    const selectContainer = document.querySelector('div[gh="s"]');
    // 2. In open email view: near the Back button in the top action bar
    const backBtn = document.querySelector('div[aria-label*="Back"], div[data-tooltip*="Back"]');
    // 3. Fallback: top toolbar container
    const toolbar = document.querySelector('div[gh="tm"], div[role="toolbar"]');

    let target = null;
    let insertMethod = 'after';

    if (selectContainer && selectContainer.offsetParent !== null) {
      target = selectContainer;
    } else if (backBtn && backBtn.offsetParent !== null) {
      target = backBtn;
    } else if (toolbar && toolbar.offsetParent !== null) {
      target = toolbar.firstElementChild || toolbar;
    }

    if (!target) return;

    const dark = isDarkTheme();
    const btn = document.createElement('div');
    btn.id = '__gmail_shortcuts_help_btn';
    btn.title = 'Click to view Gmail Shortcuts cheat sheet';

    Object.assign(btn.style, {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      height: '26px',
      padding: '0 10px',
      marginLeft: '8px',
      marginRight: '8px',
      borderRadius: '13px',
      backgroundColor: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(60, 64, 67, 0.08)',
      border: `1px solid ${dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(60, 64, 67, 0.16)'}`,
      color: dark ? '#e8eaed' : '#3c4043',
      fontFamily: 'Google Sans, Roboto, Helvetica, Arial, sans-serif',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      userSelect: 'none',
      verticalAlign: 'middle',
      transition: 'background-color 0.15s ease, border-color 0.15s ease'
    });

    btn.innerHTML = `
      <span style="font-size: 13px;">⌨</span>
      <span>Shortcuts: <b>b</b> → <b>t</b>, <b>w</b>, <b>m</b></span>
      <span style="font-size: 9px; opacity: 0.7; margin-left: 2px;">▾</span>
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(60, 64, 67, 0.15)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(60, 64, 67, 0.08)';
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePopover(btn);
    });

    target.insertAdjacentElement('afterend', btn);
  }

  // Continuously ensure the help widget is attached across Gmail SPA view transitions
  let injectTimeout = null;
  const observer = new MutationObserver(() => {
    if (injectTimeout) return;
    injectTimeout = setTimeout(() => {
      injectTimeout = null;
      if (!document.getElementById('__gmail_shortcuts_help_btn')) {
        injectHelpWidget();
      }
    }, 250);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial attempt
  injectHelpWidget();
})();
