/**
 * Gmail Shortcuts
 * Fast, lightweight, and configurable keyboard shortcuts for Gmail.
 *
 * Features:
 *   - Auto-activates in Snooze menu (dynamic slots 1, 2, 3..., unsnooze u, named t, w, m, d)
 *   - Multi-line HUD with dynamic options on a separate line
 *   - Hover-protected hint panel (never disappears while mouse is on it; clickable items)
 *   - Native Gmail shortcut equivalents (work even when Gmail's own keyboard
 *     shortcuts are disabled in Gmail settings):
 *       - gi, gs, gb, gt, gd, ga: Go to Inbox, Starred, Snoozed, Sent, Drafts, All Mail
 *       - gp, gn: Go to previous / next page
 *       - c: Compose; d: Compose in tab (best effort)
 *       - /: Focus search; z: Undo; ?: Shortcut help
 *       - j, k: Move cursor down / up; x: Select; s: Toggle star
 *       - e, y: Archive; #: Delete; !: Report spam
 *       - I, U: Mark as read / unread
 *       - u: Back to threadlist
 *       - b: Open Snooze menu; m: Mute; T: Add to Tasks
 *       - .: More actions menu; v: Move to menu; l: Label menu
 *       - *a, *n, *r, *u, *s, *t: Select all / none / read / unread / starred / unstarred
 *       - r, a, f: Reply / Reply all / Forward (in open thread)
 *       - ; (expand all) and : (collapse all) in open threads — ';' only when
 *         the "search by sender" shortcut is disabled in options
 *       - o: Open conversation (best effort — Gmail may require a real click)
 *       - ,: Move focus to toolbar; gc: Open Contacts
 *     Not implemented (require trusted events or Gmail-internal dialogs):
 *       q, R, A, F, N, p, n, _, +/-, `, ~, gl, gk, ], [, }, {
 *
 *   - Navigation:
 *       - gj: Go to Junk / Spam folder (complements native gi, gt, gd, ga)
 *       - gu: Go to Unread emails (is:unread)
 *       - gi, gs, gt, gd, ga: Go to Inbox, Starred, Sent, Drafts, All Mail
 *         (native equivalents — work even when Gmail's own keyboard
 *         shortcuts are disabled in Gmail settings)
 *       - ; : Find all emails from sender (from:...)
 *       - ' : Find all emails with this subject (subject:"...")
 *       - gg: Go to Top email (actual Gmail selection shifts to first email)
 *       - G: Go to Bottom email (actual Gmail selection shifts to last email)
 *       - ]]: Next page (Older emails)
 *       - [[: Previous page (Newer emails)
 */

(function () {
  'use strict';

  // Prevent duplicate injections
  if (window.__gmail_shortcuts_installed) return;
  window.__gmail_shortcuts_installed = true;

  const DEFAULT_CONFIG = {
    keyUnsnooze: 'u',
    keyTomorrow: 't',
    keyNextWeek: 'w',
    keyLaterWeek: 'm',
    keyPickDate: 'd',
    enablePagination: true,
    enableListJump: true,
    enableGoToSpam: true,
    enableGoToUnread: true,
    enableGoToNav: true,
    enableNativeShortcuts: true,
    enableSearchSender: true,
    enableSearchSubject: true,
    showHUD: true,
    hudTimeoutSec: 4
  };

  let currentConfig = { ...DEFAULT_CONFIG };
  let isMenuOpen = false;
  let isHudHovered = false;

  // Track the most recently hovered email list row
  let lastHoveredRow = null;
  document.addEventListener(
    'mouseover',
    (e) => {
      const row = e.target.closest('tr.zA, tr[role="row"]');
      if (row && row.offsetParent !== null) {
        lastHoveredRow = row;
      }
    },
    true
  );

  // State for ]] and [[ bracket sequence detection
  let lastBracketKey = null;
  let lastBracketTimer = null;
  const BRACKET_TIMEOUT_MS = 500;

  // State for g sequences (gg -> top, gj -> spam)
  let lastGTime = 0;
  const G_TIMEOUT_MS = 500;

  // State for the native '*' select sequences (*a, *n, *r, *u, *s, *t)
  let lastStarTime = 0;
  const STAR_SEQ_TIMEOUT_MS = 500;

  // Extension-managed list cursor for native j / k navigation
  let cursorRow = null;

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
   * Native go-to equivalents, implemented via hash navigation so they work
   * even when Gmail's own keyboard shortcuts are disabled in Gmail settings.
   */
  const GO_TO_NAV_TARGETS = {
    i: { hash: '#inbox', label: 'Inbox' },
    s: { hash: '#starred', label: 'Starred' },
    b: { hash: '#snoozed', label: 'Snoozed' },
    t: { hash: '#sent', label: 'Sent' },
    d: { hash: '#drafts', label: 'Drafts' },
    a: { hash: '#all', label: 'All Mail' },
    c: { hash: null, label: 'Contacts', url: 'https://contacts.google.com/' }
  };

  function goToMailbox(target, labelOverride) {
    const label = labelOverride || target.label;
    if (target.url) {
      showHUD(`📂 Go to ${label}...`, true);
      window.open(target.url, '_blank');
      return;
    }
    showHUD(`📂 Go to ${label}...`, true);
    if (window.location.hash !== target.hash) {
      window.location.hash = target.hash;
    }
  }

  // =======================================================================
  // Native Gmail shortcut equivalents
  // (implemented via DOM interaction so they work even when Gmail's own
  //  keyboard shortcuts are disabled in Gmail settings)
  // =======================================================================

  /**
   * Brief visual pulse so the user sees which row the cursor is on.
   */
  function pulseRow(row) {
    if (!row) return;
    const origOutline = row.style.outline;
    const origTransition = row.style.transition;
    row.style.transition = 'outline 0.15s ease';
    row.style.outline = '2px solid #1a73e8';
    row.style.outlineOffset = '-2px';
    setTimeout(() => {
      row.style.outline = origOutline;
      row.style.transition = origTransition;
    }, 700);
  }

  /**
   * Current extension-managed cursor row (falls back to Gmail's own cursor
   * or the first row when the extension cursor is stale).
   */
  function getCursorRow() {
    if (cursorRow && cursorRow.isConnected && cursorRow.offsetParent !== null) {
      return cursorRow;
    }
    const gmailCursor = getSelectionCursorRow();
    if (gmailCursor) {
      cursorRow = gmailCursor;
      return cursorRow;
    }
    const rows = getEmailListRows();
    cursorRow = rows.length > 0 ? rows[0] : null;
    return cursorRow;
  }

  /**
   * Native j / k: move the cursor one row down / up.
   */
  function moveCursor(delta) {
    const rows = getEmailListRows();
    if (rows.length === 0) {
      showHUD('⚠️ No conversations in this list');
      return;
    }
    let idx = rows.indexOf(cursorRow);
    if (idx === -1) idx = 0;
    idx = Math.max(0, Math.min(rows.length - 1, idx + delta));
    cursorRow = rows[idx];
    cursorRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    cursorRow.setAttribute('tabindex', '0');
    cursorRow.focus({ preventScroll: true });
    pulseRow(cursorRow);
  }

  /**
   * Find a button in Gmail's main toolbar by its language-independent act code.
   */
  function findToolbarButton(actCode) {
    return (
      Array.from(document.querySelectorAll(`div[gh="tm"] div[act="${actCode}"]`)).find(
        (b) => b.offsetParent !== null
      ) || null
    );
  }

  /**
   * Run a toolbar action (archive, delete, spam, mark read/unread...).
   * If no conversation is checked, the cursor row is selected first,
   * mirroring how native Gmail shortcuts act on the cursor conversation.
   */
  function runToolbarAction(actCode, label, autoSelect = true) {
    const btn = findToolbarButton(actCode);
    if (!btn) {
      showHUD(`⚠️ ${label} is not available here`);
      return;
    }

    let autoChecked = null;
    const anyChecked = document.querySelector(
      'tr.zA div[role="checkbox"][aria-checked="true"]'
    );
    if (autoSelect && !anyChecked) {
      const row = getCursorRow();
      if (!row) {
        showHUD('⚠️ No conversation selected');
        return;
      }
      const cb = row.querySelector('div[role="checkbox"]');
      if (cb) {
        triggerClick(cb);
        autoChecked = cb;
      }
    }

    const doAction = () => {
      const b = findToolbarButton(actCode) || btn;
      if (b) {
        triggerClick(b);
        showHUD(`✓ ${label}`, true);
      }
      // Restore the selection state we introduced (for actions that keep
      // the row in the list, e.g. mark as read/unread).
      if (autoChecked) {
        setTimeout(() => {
          if (autoChecked.isConnected && autoChecked.getAttribute('aria-checked') === 'true') {
            triggerClick(autoChecked);
          }
        }, 450);
      }
    };

    if (autoChecked) {
      setTimeout(doAction, 100);
    } else {
      doAction();
    }
  }

  /**
   * Open one of Gmail's toolbar menus (More actions, Move to, Labels...)
   * and optionally activate a menu item identified by localized text.
   */
  function openToolbarMenu(buttonRegex, itemRegex, label) {
    const btn = Array.from(document.querySelectorAll('div[gh="tm"] [aria-label]')).find(
      (e) => e.offsetParent !== null && buttonRegex.test(e.getAttribute('aria-label') || '')
    );
    if (!btn) {
      showHUD(`⚠️ ${label} is not available here`);
      return;
    }
    // Deferred so the menu is not immediately closed by Gmail's own
    // keydown handling while our keydown event is still propagating.
    setTimeout(() => triggerClick(btn), 30);

    if (!itemRegex) return;

    setTimeout(() => {
      const item = Array.from(
        document.querySelectorAll('div[role="menu"] [role="menuitem"]')
      ).find((m) => m.offsetParent !== null && itemRegex.test((m.innerText || '').trim()));
      if (item) {
        clickClosureMenuItem(item);
        showHUD(`✓ ${label}`, true);
      } else {
        showHUD(`⚠️ ${label} option not found`);
      }
    }, 300);
  }

  /**
   * Activate a Google Closure menu item (Gmail dropdown menus). These items
   * only respond to clicks on their inner content div (.J-N-Jz) that carry
   * real coordinates and a click count.
   */
  function clickClosureMenuItem(item) {
    const inner = item.querySelector('.J-N-Jz') || item;
    const rect = inner.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.x + rect.width / 2,
      clientY: rect.y + rect.height / 2,
      button: 0,
      detail: 1
    };
    ['mouseover', 'mouseenter', 'mousemove', 'mousedown', 'mouseup', 'click'].forEach((t) =>
      inner.dispatchEvent(new MouseEvent(t, opts))
    );
  }

  /**
   * Native * sequences: *a, *n, *r, *u, *s, *t — select conversations
   * via Gmail's select dropdown menu.
   */
  function selectByCriterion(criterionRegex, label) {
    const btn = Array.from(
      document.querySelectorAll('div[gh="tm"] [aria-haspopup="true"]')
    ).find(
      (e) =>
        e.offsetParent !== null && /Выбрать|^Select/i.test(e.getAttribute('aria-label') || '')
    );
    if (!btn) {
      showHUD('⚠️ Select menu is not available here');
      return;
    }
    // The dropdown opens from the caret next to the select-all checkbox,
    // not from the main button (which toggles select-all). Deferred so the
    // menu is not immediately closed by Gmail's own keydown handling.
    const caret = btn.querySelector('div.G-asx') || btn;
    setTimeout(() => plainClick(caret), 30);
    setTimeout(() => {
      const items = Array.from(
        document.querySelectorAll('div[role="menu"] [role="menuitem"]')
      ).filter((m) => m.offsetParent !== null);
      const item = items.find((m) =>
        criterionRegex.test((m.innerText || '').split('\n')[0].trim())
      );
      if (item) {
        clickClosureMenuItem(item);
        showHUD(`✓ Selected: ${label}`, true);
      } else {
        showHUD(`⚠️ Select option "${label}" not found`);
      }
    }, 300);
  }

  /**
   * Native z: undo the last action via Gmail's undo toast link.
   */
  function undoLastAction() {
    const link = Array.from(
      document.querySelectorAll('span, a, div[role="button"]')
    ).find(
      (e) =>
        e.offsetParent !== null &&
        e.children.length === 0 &&
        /^(Отменить|Undo)$/i.test((e.textContent || '').trim())
    );
    if (link) {
      triggerClick(link);
      showHUD('↩ Undo', true);
    } else {
      showHUD('⚠️ Nothing to undo');
    }
  }

  /**
   * Native /: focus the search box.
   */
  function focusSearchBox() {
    const input = document.querySelector(
      'input[name="q"], input[aria-label*="Поиск"], input[aria-label*="Search"]'
    );
    if (input) {
      input.focus();
      input.select?.();
    }
  }

  /**
   * Native c: compose a new message.
   * The compose button ignores synthetic clicks on hardened Gmail builds,
   * so compose is opened via Gmail's compose URL (requires a reload).
   */
  function composeNew() {
    showHUD('✉️ Compose...', true);
    const base = window.location.href.split('#')[0];
    window.location.href = base + '#inbox?compose=new';
    window.location.reload();
  }

  /**
   * Native d: compose in a new tab via Gmail's compose URL.
   */
  function composeInTab() {
    showHUD('✉️ Compose in new tab...', true);
    const base = window.location.href.split('#')[0];
    window.open(base + '#inbox?compose=new', '_blank');
  }

  /**
   * Native u: back to the thread list (from an open thread or search view).
   */
  function backToThreadList() {
    const back = Array.from(
      document.querySelectorAll(
        'div[act="19"], [aria-label*="Назад"], [aria-label*="Back to"], [data-tooltip*="Назад"]'
      )
    ).find((e) => e.offsetParent !== null);
    if (back) {
      triggerClick(back);
      return;
    }
    // In a list view: leave search results / labels and return to the inbox
    if (/^#(search|label)/.test(window.location.hash)) {
      window.location.hash = '#inbox';
    }
  }

  /**
   * Native x: toggle selection of the cursor row.
   */
  function toggleSelectCursorRow() {
    const row = getCursorRow();
    if (!row) return;
    const cb = row.querySelector('div[role="checkbox"]');
    if (cb) {
      triggerClick(cb);
    }
  }

  /**
   * Native s: toggle star on the cursor row.
   */
  function toggleStarCursorRow() {
    const row = getCursorRow();
    if (!row) return;
    const star = Array.from(row.querySelectorAll('span[role="button"]')).find((e) =>
      /помечен|starred/i.test(e.getAttribute('aria-label') || '')
    );
    if (star) {
      triggerClick(star);
    }
  }

  /**
   * Native o: open the conversation under the cursor (best effort —
   * some Gmail builds ignore synthetic clicks on list rows).
   */
  function openCursorRow() {
    const row = getCursorRow();
    if (!row) return;
    const link = row.querySelector('div[role="link"]');
    const target = link || row;
    const rect = target.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.x + 40,
      clientY: rect.y + rect.height / 2,
      button: 0,
      detail: 1
    };
    ['mouseover', 'mousedown', 'mouseup', 'click'].forEach((t) =>
      target.dispatchEvent(new MouseEvent(t, opts))
    );
  }

  /**
   * Native b: open the Snooze menu for the cursor row (the extension's
   * snooze HUD then takes over). Best effort: reveal the row's hover
   * actions and click the snooze button.
   */
  function openSnoozeOnCursorRow() {
    const row = getCursorRow();
    if (!row) return;
    const rect = row.getBoundingClientRect();
    row.dispatchEvent(
      new MouseEvent('mouseover', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.x + rect.width / 2,
        clientY: rect.y + 10
      })
    );
    setTimeout(() => {
      const btn = Array.from(row.querySelectorAll('[aria-label], [data-tooltip]')).find(
        (e) =>
          e.offsetParent !== null &&
          /Отложить|Snooze/i.test(
            (e.getAttribute('aria-label') || '') + (e.getAttribute('data-tooltip') || '')
          )
      );
      if (btn) {
        triggerClick(btn);
      } else {
        // Fall back to the snooze item in the More actions menu
        openToolbarMenu(/Другие действия|^More/i, /Отложить|^Snooze/i, 'Snooze');
      }
    }, 400);
  }

  /**
   * Native r / a / f: click the Reply / Reply all / Forward button of the
   * last message in an open thread.
   */
  function clickThreadActionButton(regex, label) {
    const btns = Array.from(
      document.querySelectorAll('div[role="main"] [aria-label], div[role="main"] [data-tooltip]')
    ).filter((e) =>
      e.offsetParent !== null &&
      regex.test(e.getAttribute('aria-label') || e.getAttribute('data-tooltip') || '')
    );
    if (btns.length === 0) {
      showHUD(`⚠️ ${label} is not available here`);
      return;
    }
    triggerClick(btns[btns.length - 1]);
  }

  /**
   * Native ; / : in an open thread: expand / collapse all messages.
   */
  function expandCollapseAll(expand) {
    const regex = expand ? /Развернуть все|Expand all/i : /Свернуть все|Collapse all/i;
    const btn = Array.from(document.querySelectorAll('[aria-label], [data-tooltip]')).find(
      (e) => e.offsetParent !== null && regex.test(e.getAttribute('aria-label') || e.getAttribute('data-tooltip') || '')
    );
    if (btn) {
      triggerClick(btn);
    } else {
      showHUD('⚠️ Not available here');
    }
  }

  /**
   * Native ,: move keyboard focus to the toolbar.
   */
  function focusToolbar() {
    const btn = document.querySelector('div[gh="tm"] div[act], div[gh="tm"] [role="button"]');
    if (btn) {
      btn.setAttribute('tabindex', '0');
      btn.focus({ preventScroll: true });
    }
  }

  /**
   * Native ?: show a HUD listing the available shortcuts.
   */
  function showShortcutHelp() {
    const line = (keys, text) =>
      `<div style="text-align:left;"><b>${keys}</b> &nbsp;${text}</div>`;
    const help = `
      <div style="display:flex; flex-direction:column; gap:2px; max-height:300px; overflow:auto;">
        ${line('gj / gu / gi / gs / gb / gt / gd / ga', 'Go to Spam / Unread / Inbox / Starred / Snoozed / Sent / Drafts / All Mail')}
        ${line('gg / G', 'Top / bottom email')}
        ${line(']] / [[', 'Next / previous page')}
        ${line('gp / gn', 'Previous / next page')}
        ${line('j / k', 'Move cursor down / up')}
        ${line('o', 'Open conversation')}
        ${line('x', 'Select conversation')}
        ${line('s', 'Toggle star')}
        ${line('e / y', 'Archive')}
        ${line('#', 'Delete')}
        ${line('!', 'Report spam')}
        ${line('I / U', 'Mark read / unread')}
        ${line('m', 'Mute')}
        ${line('T', 'Add to Tasks')}
        ${line('b', 'Snooze')}
        ${line('.', 'More actions')}
        ${line('v / l', 'Move to / Label menu')}
        ${line('*a *n *r *u *s *t', 'Select all / none / read / unread / starred / unstarred')}
        ${line('r / a / f', 'Reply / Reply all / Forward')}
        ${line('; / :', 'Expand / collapse all (in thread)')}
        ${line('u', 'Back to thread list')}
        ${line('c / d', 'Compose / Compose in tab')}
        ${line('/', 'Search')}
        ${line('z', 'Undo')}
        ${line(',', 'Focus toolbar')}
        ${line('; / \'', 'Find all from sender / subject (extension)')}
        ${line('Esc', 'Close menus')}
      </div>`;
    showHUD(help);
    const hud = document.getElementById('__gmail_snooze_hud');
    if (hud) {
      clearTimeout(window.__gmail_hud_timer);
      scheduleHudDismiss(Math.max(15000, (currentConfig.hudTimeoutSec || 4) * 3000));
    }
  }

  /**
   * Navigate directly to the Spam / Junk folder.
   */
  function goToSpamFolder() {
    showHUD('📂 Go to Spam (Junk)...', true);

    const spamLink = Array.from(
      document.querySelectorAll(
        'a[href*="#spam"], a[title*="Spam"], a[aria-label*="Spam"], a[title*="Спам"], a[aria-label*="Спам"]'
      )
    ).find(el => el.offsetParent !== null);

    if (spamLink) {
      triggerClick(spamLink);
    }

    if (window.location.hash !== '#spam') {
      window.location.hash = '#spam';
    }
  }

  /**
   * Navigate directly to Unread emails (is:unread).
   */
  function goToUnreadEmails() {
    showHUD('🔍 Go to Unread emails...', true);

    const searchInput = document.querySelector(
      'input[aria-label*="Search"], input[name="q"], input[placeholder*="Search"]'
    );
    if (searchInput) {
      searchInput.value = 'is:unread';
    }

    if (window.location.hash !== '#search/is:unread' && window.location.hash !== '#search/is%3Aunread') {
      window.location.hash = '#search/is:unread';
    } else {
      window.location.hash = '#inbox';
      setTimeout(() => {
        window.location.hash = '#search/is:unread';
      }, 50);
    }
  }

  /**
   * Clean leading prefixes (Re:, Fwd:, etc.) from subject line.
   */
  function cleanSubject(subject) {
    if (!subject) return '';
    const trimmed = subject.trim();
    const cleaned = trimmed.replace(/^((re|fwd|fw|aw|wg|antw)(\[\d+\])?:\s*)+/gi, '').trim();
    return cleaned || trimmed;
  }

  /**
   * Find the row that holds Gmail's active keyboard cursor or selection.
   */
  function getSelectionCursorRow() {
    // 1. Element with keyboard focus inside an email row
    const focusedRow = document.activeElement?.closest('tr.zA, tr[role="row"]');
    if (focusedRow && focusedRow.offsetParent !== null) {
      return focusedRow;
    }

    // 2. Gmail's native active cursor row (PE for unread, PF for read)
    const peRow = Array.from(document.querySelectorAll('tr.zA.PE, tr.zA.PF'))
      .find(r => r.offsetParent !== null);
    if (peRow) return peRow;

    // 3. Checked checkbox (selected email)
    const checkedBox = Array.from(
      document.querySelectorAll(
        'div[gh="tl"] tr.zA div[role="checkbox"][aria-checked="true"], table[role="grid"] tr.zA div[role="checkbox"][aria-checked="true"], tr.zA div[role="checkbox"][aria-checked="true"]'
      )
    ).find(cb => cb.offsetParent !== null);
    if (checkedBox) {
      const r = checkedBox.closest('tr.zA, tr[role="row"]');
      if (r && r.offsetParent !== null) return r;
    }

    // 4. Gmail roving tabindex or aria-selected
    const rovingRow = Array.from(
      document.querySelectorAll('tr.zA[tabindex="0"], tr.zA[aria-selected="true"]')
    ).find(r => r.offsetParent !== null);
    if (rovingRow) return rovingRow;

    return null;
  }

  /**
   * Find the active email list row.
   * Priority:
   *   1. Keyboard cursor / checked selection (where the user navigated)
   *   2. Mouse-hovered row (only if no active cursor exists)
   *   3. First visible email in list
   */
  function getActiveEmailListRow() {
    // Priority 1: Selection / cursor row where the user is focused
    const selectionRow = getSelectionCursorRow();
    if (selectionRow) {
      return selectionRow;
    }

    // Priority 2: Fallback to mouse-hovered row only if no keyboard selection exists
    if (lastHoveredRow && lastHoveredRow.offsetParent !== null && lastHoveredRow.matches(':hover')) {
      return lastHoveredRow;
    }

    // Priority 3: Fallback to first visible email in list
    const rows = getEmailListRows();
    return rows.length > 0 ? rows[0] : null;
  }

  function getSenderFromOpenEmail() {
    const senderEl = document.querySelector(
      'div[role="main"] span[email], div[role="main"] [data-hovercard-id], span.gD[email]'
    );
    if (senderEl) {
      const email = senderEl.getAttribute('email') || senderEl.getAttribute('data-hovercard-id');
      if (email) return email;
      const name = senderEl.innerText.trim();
      if (name) return name;
    }
    return null;
  }

  function getSenderFromListRow(row) {
    if (!row) return null;

    const emailEl = row.querySelector('[email], [data-hovercard-id]');
    if (emailEl) {
      const email = emailEl.getAttribute('email') || emailEl.getAttribute('data-hovercard-id');
      if (email && email.includes('@')) return email;
    }

    const senderSelectors = [
      'div.yW span[name]',
      'div.yW span',
      'span.bA4 span',
      'td.yX span[name]',
      'td.yX span',
      'td.yX'
    ];

    for (const sel of senderSelectors) {
      const el = row.querySelector(sel);
      if (el) {
        const name = (el.getAttribute('name') || el.innerText || '').trim();
        if (name && name.length > 0) return name;
      }
    }

    return null;
  }

  function getSubjectFromOpenEmail() {
    const selectors = [
      'div[role="main"] h2.hP',
      'h2.hP',
      'div[role="main"] h2[data-thread-perm-id]',
      'div[role="main"] h2',
      'h2[data-legacy-thread-id]'
    ];

    for (const sel of selectors) {
      const h2 = document.querySelector(sel);
      if (h2) {
        const text = (h2.innerText || '').trim();
        if (text) {
          return cleanSubject(text);
        }
      }
    }
    return null;
  }

  function getSubjectFromListRow(row) {
    if (!row) return null;

    // Strategy 1: Targeted subject class selectors in Gmail
    const subjectSelectors = [
      'span.bog',
      'span.bqe',
      'span.bqf',
      'div.y6 span.bog',
      'div.y6 > span:not(.y2):not(.av):not(.ar)',
      'td.xY span.bog',
      'td.xY span.bqe',
      'td.xY span.bqf'
    ];

    for (const sel of subjectSelectors) {
      const el = row.querySelector(sel);
      if (el) {
        const text = el.innerText.trim();
        if (text && text !== '-' && text.length > 0) {
          const cleaned = cleanSubject(text);
          if (cleaned) return cleaned;
        }
      }
    }

    // Strategy 2: Extract from div.y6 by stripping snippets (.y2) and label badges
    const y6 = row.querySelector('div.y6');
    if (y6) {
      const clone = y6.cloneNode(true);
      clone.querySelectorAll('span.y2, div.ar, span.av, div.as, span.at').forEach(s => s.remove());
      const text = clone.innerText.trim();
      if (text) {
        const cleaned = cleanSubject(text);
        if (cleaned) return cleaned;
      }
    }

    // Strategy 3: Extract from td.xY (subject cell) by removing snippet and label badges
    const xyCell = row.querySelector('td.xY');
    if (xyCell) {
      const clone = xyCell.cloneNode(true);
      clone.querySelectorAll('span.y2, div.ar, span.av, span.at, div.as').forEach(s => s.remove());
      const text = clone.innerText.trim();
      if (text) {
        const subjectPart = text.split(/\s+-\s+/)[0].trim();
        const cleaned = cleanSubject(subjectPart);
        if (cleaned) return cleaned;
      }
    }

    return null;
  }

  function getCurrentSender() {
    if (isEmailListView()) {
      const row = getActiveEmailListRow();
      return getSenderFromListRow(row);
    } else {
      return getSenderFromOpenEmail();
    }
  }

  function getCurrentSubject() {
    if (isEmailListView()) {
      const row = getActiveEmailListRow();
      return getSubjectFromListRow(row);
    } else {
      return getSubjectFromOpenEmail();
    }
  }

  function executeGmailSearch(query, label) {
    showHUD(`🔍 Search: ${label || query}`, true);

    const searchInput = document.querySelector(
      'input[aria-label*="Search"], input[name="q"], input[placeholder*="Search"]'
    );
    if (searchInput) {
      searchInput.value = query;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const targetHash = '#search/' + encodeURIComponent(query);
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    } else {
      window.location.hash = '#inbox';
      setTimeout(() => {
        window.location.hash = targetHash;
      }, 50);
    }
  }

  function searchBySender() {
    const sender = getCurrentSender();
    if (!sender) {
      showHUD('⚠️ Could not detect sender for this email');
      return;
    }

    const query = sender.includes('@') ? `from:(${sender})` : `from:"${sender}"`;
    executeGmailSearch(query, `from: ${sender}`);
  }

  function searchBySubject() {
    const subject = getCurrentSubject();
    if (!subject) {
      showHUD('⚠️ Could not detect subject for this email');
      return;
    }

    const sanitized = subject.replace(/"/g, "'");
    const query = `subject:"${sanitized}"`;
    executeGmailSearch(query, `subject: "${sanitized}"`);
  }

  /**
   * Get all visible email rows in the current list view.
   */
  function getEmailListRows() {
    const rows = Array.from(
      document.querySelectorAll('div[gh="tl"] tr.zA, table[role="grid"] tr.zA, tr.zA')
    ).filter(r => r.offsetParent !== null);

    if (rows.length > 0) return rows;

    return Array.from(
      document.querySelectorAll('div[role="main"] table[role="grid"] tbody tr[role="row"]')
    ).filter(r => r.offsetParent !== null && r.querySelector('[role="checkbox"]'));
  }

  /**
   * Moves Gmail's active selection cursor to an email row by temporarily
   * engaging the native checkbox, shifting Gmail's internal cursor, and then
   * unselecting it at the end so the email is left unselected with the cursor active.
   */
  function selectEmailRow(row, deselectOthers = true) {
    if (!row) return;

    // 1. Scroll into view
    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    // 2. Uncheck any other rows that are currently checked
    if (deselectOthers) {
      const otherChecked = Array.from(
        document.querySelectorAll(
          'div[gh="tl"] tr.zA div[role="checkbox"][aria-checked="true"], table[role="grid"] tr.zA div[role="checkbox"][aria-checked="true"], tr.zA div[role="checkbox"][aria-checked="true"]'
        )
      ).filter(cb => !row.contains(cb));

      otherChecked.forEach(cb => {
        triggerClick(cb);
      });
    }

    // 3. Shift Gmail's cursor via checkbox, then unselect at the end
    const targetCheckbox = row.querySelector('div[role="checkbox"]');
    if (targetCheckbox) {
      const wasChecked = targetCheckbox.getAttribute('aria-checked') === 'true';
      if (!wasChecked) {
        // Check to move Gmail's cursor to this row
        triggerClick(targetCheckbox);

        // Unselect it so the email is not left checked
        setTimeout(() => {
          if (targetCheckbox.getAttribute('aria-checked') === 'true') {
            triggerClick(targetCheckbox);
          }
        }, 50);
      } else {
        // If already checked, uncheck it
        setTimeout(() => {
          if (targetCheckbox.getAttribute('aria-checked') === 'true') {
            triggerClick(targetCheckbox);
          }
        }, 50);
      }
    }

    // 4. Update roving tabindex & focus
    row.setAttribute('tabindex', '0');
    row.focus({ preventScroll: true });
    row.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    const cell = row.querySelector('td');
    if (cell) {
      if (!cell.hasAttribute('tabindex')) {
        cell.setAttribute('tabindex', '-1');
      }
      cell.focus?.({ preventScroll: true });
      cell.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    }

    // 5. Brief visual pulse so the user clearly sees which row became active
    const origOutline = row.style.outline;
    const origTransition = row.style.transition;
    row.style.transition = 'outline 0.15s ease';
    row.style.outline = '2px solid #1a73e8';
    row.style.outlineOffset = '-2px';
    setTimeout(() => {
      row.style.outline = origOutline;
      row.style.transition = origTransition;
    }, 1000);
  }

  function goToTopEmail() {
    const rows = getEmailListRows();
    if (rows.length === 0) {
      showHUD('⚠️ No emails found in list');
      return;
    }

    selectEmailRow(rows[0], true);
    showHUD(`⬆ Top email (1 of ${rows.length})`, true);
  }

  function goToBottomEmail() {
    const rows = getEmailListRows();
    if (rows.length === 0) {
      showHUD('⚠️ No emails found in list');
      return;
    }

    const lastRow = rows[rows.length - 1];
    selectEmailRow(lastRow, true);
    showHUD(`⬇ Bottom email (${rows.length} of ${rows.length})`, true);
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
      'div[data-tooltip*="Más antiguos"]',
      'div[data-tooltip*="Следующие результаты"]',
      'div[aria-label*="Следующие результаты"]',
      'div[data-tooltip*="След."]',
      'div[aria-label*="След."]'
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
      'div[data-tooltip*="Más recientes"]',
      'div[data-tooltip*="Предыдущие результаты"]',
      'div[aria-label*="Предыдущие результаты"]',
      'div[data-tooltip*="Пред."]',
      'div[aria-label*="Пред."]'
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
   * Extract unique, top-level menu items from a Gmail menu.
   * Strips any nested child elements (e.g. goog-menuitem-content / J-N-Jz)
   * and de-duplicates by text content to prevent duplicate entries.
   */
  function getTopLevelMenuItems(menu) {
    const rawItems = Array.from(
      menu.querySelectorAll('[role="menuitem"], [role="menuitemradio"]')
    ).filter(el => el.offsetParent !== null);

    // 1. Only keep top-level items (filter out elements contained inside another item)
    const topLevel = rawItems.filter(item => {
      return !rawItems.some(other => other !== item && other.contains(item));
    });

    // 2. De-duplicate by normalized text content
    const seenTexts = new Set();
    const uniqueItems = [];

    for (const item of topLevel) {
      const fullText = (item.innerText || '').trim();
      if (!fullText) continue;

      const normText = fullText.replace(/\s+/g, ' ').toLowerCase();
      if (seenTexts.has(normText)) {
        continue;
      }
      seenTexts.add(normText);
      uniqueItems.push(item);
    }

    return uniqueItems;
  }

  /**
   * Find any currently visible Snooze popup menu in Gmail's DOM.
   */
  function getVisibleSnoozeMenu() {
    const rawMenus = Array.from(
      document.querySelectorAll('div[role="menu"]')
    ).filter(m => m.offsetParent !== null);

    // Filter out parent menus if nested
    const menus = rawMenus.filter(
      m => !rawMenus.some(other => other !== m && m.contains(other))
    );

    for (const menu of menus) {
      const items = getTopLevelMenuItems(menu);

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
   * Categorize unique items in the Snooze menu into:
   * - unsnoozeItem (if email is already snoozed)
   * - pickDateItem (custom date & time picker)
   * - dynamicItems (suggested time presets: Tomorrow, Later today, Next week, etc.)
   */
  function parseSnoozeMenuItems(items) {
    let unsnoozeItem = null;
    let pickDateItem = null;
    const dynamicItems = [];

    for (const item of items) {
      const text = (item.innerText + ' ' + (item.getAttribute('aria-label') || '')).toLowerCase();

      if (
        text.includes('unsnooze') ||
        text.includes('un-snooze') ||
        text.includes('вернуть во входящие') ||
        text.includes('desposponer') ||
        text.includes('zurückstellen aufheben')
      ) {
        unsnoozeItem = item;
      } else if (
        text.includes('select date') ||
        text.includes('pick date') ||
        text.includes('choose date') ||
        text.includes('выбрать дату') ||
        text.includes('datum und uhrzeit')
      ) {
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

  /**
   * Minimal click without the mouseenter hover event — needed for Gmail's
   * dropdown carets (select menu, compose menu), which misbehave when a
   * synthetic mouseenter precedes the click.
   */
  function plainClick(el) {
    if (!el) return;
    ['mousedown', 'mouseup', 'click'].forEach(evtType => {
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
   * Build the floating HUD message with:
   *   Line 1: All static options ([U] Unsnooze, [T] Tomorrow, [W] Next week, [M] Later this week, [D] Pick date, [Esc] Cancel)
   *   Line 2: Dynamic slot options ([1] ..., [2] ..., [3] ...)
   */
  function getHUDMessage(parsed) {
    // 1. Static options line
    const staticParts = [];

    if (parsed.unsnoozeItem && currentConfig.keyUnsnooze) {
      const uKey = currentConfig.keyUnsnooze.toUpperCase();
      staticParts.push(
        `<span data-shortcut-action="unsnooze" style="cursor: pointer; padding: 2px 5px; border-radius: 4px; transition: background 0.15s;"><b>[${uKey}]</b> Unsnooze</span>`
      );
    }

    if (currentConfig.keyTomorrow) {
      const tKey = currentConfig.keyTomorrow.toUpperCase();
      staticParts.push(
        `<span data-shortcut-action="named-tomorrow" style="cursor: pointer; padding: 2px 5px; border-radius: 4px; transition: background 0.15s;"><b>[${tKey}]</b> Tomorrow</span>`
      );
    }

    if (currentConfig.keyNextWeek) {
      const wKey = currentConfig.keyNextWeek.toUpperCase();
      staticParts.push(
        `<span data-shortcut-action="named-next-week" style="cursor: pointer; padding: 2px 5px; border-radius: 4px; transition: background 0.15s;"><b>[${wKey}]</b> Next week</span>`
      );
    }

    if (currentConfig.keyLaterWeek) {
      const mKey = currentConfig.keyLaterWeek.toUpperCase();
      staticParts.push(
        `<span data-shortcut-action="named-later-week" style="cursor: pointer; padding: 2px 5px; border-radius: 4px; transition: background 0.15s;"><b>[${mKey}]</b> Later this week</span>`
      );
    }

    if (currentConfig.keyPickDate && parsed.pickDateItem) {
      const dKey = currentConfig.keyPickDate.toUpperCase();
      staticParts.push(
        `<span data-shortcut-action="pick-date" style="cursor: pointer; padding: 2px 5px; border-radius: 4px; transition: background 0.15s;"><b>[${dKey}]</b> Pick date</span>`
      );
    }

    staticParts.push(
      `<span data-shortcut-action="cancel" style="cursor: pointer; padding: 2px 5px; border-radius: 4px; transition: background 0.15s;"><b>[Esc]</b> Cancel</span>`
    );

    // 2. Dynamic options line
    const dynamicParts = [];
    parsed.dynamicItems.forEach((item, idx) => {
      const num = idx + 1;
      const title = (item.innerText || '').split('\n')[0].trim();
      dynamicParts.push(
        `<span data-shortcut-action="dynamic-${idx}" style="cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: background 0.15s;"><b>[${num}]</b> ${title}</span>`
      );
    });

    const dynamicLine = dynamicParts.length > 0
      ? `<div style="font-size: 12px; color: #a8c7fa; font-weight: 500; margin-top: 3px;">${dynamicParts.join(' &nbsp;&bull;&nbsp; ')}</div>`
      : '';

    return `
      <div style="display: flex; flex-direction: column; gap: 4px; text-align: center; line-height: 1.4;">
        <div style="font-weight: 500; font-size: 13px;">
          Snooze: ${staticParts.join(' &nbsp;|&nbsp; ')}
        </div>
        ${dynamicLine}
      </div>
    `;
  }

  function scheduleHudDismiss(durationMs) {
    clearTimeout(window.__gmail_hud_timer);
    window.__gmail_hud_timer = setTimeout(() => {
      if (isHudHovered) return;
      const hud = document.getElementById('__gmail_snooze_hud');
      if (hud) {
        hud.style.opacity = '0';
        setTimeout(() => {
          if (!isHudHovered) hud.style.display = 'none';
        }, 200);
      }
    }, durationMs);
  }

  /**
   * Display a non-intrusive floating HUD at the bottom of the screen.
   * Remains open indefinitely while the mouse is hovered over it.
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
        padding: '10px 22px',
        borderRadius: '8px',
        fontFamily: 'Google Sans, Roboto, Helvetica, Arial, sans-serif',
        fontSize: '13px',
        fontWeight: '500',
        color: '#ffffff',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.45)',
        transition: 'opacity 0.2s ease',
        pointerEvents: 'auto',
        cursor: 'default',
        userSelect: 'none',
        lineHeight: '1.4'
      });

      // Style hover highlight on shortcut buttons inside HUD
      const style = document.createElement('style');
      style.textContent = `
        #__gmail_snooze_hud [data-shortcut-action]:hover {
          background-color: rgba(255, 255, 255, 0.2) !important;
        }
      `;
      document.head.appendChild(style);

      // Keep HUD open while mouse is focused on it
      hud.addEventListener('mouseenter', () => {
        isHudHovered = true;
        clearTimeout(window.__gmail_hud_timer);
      });

      // Resume dismiss timer when mouse leaves
      hud.addEventListener('mouseleave', () => {
        isHudHovered = false;
        const timeoutDuration = (currentConfig.hudTimeoutSec || 4) * 1000;
        scheduleHudDismiss(isMenuOpen ? timeoutDuration : 1500);
      });

      // Clicking any shortcut inside the HUD activates it directly
      hud.addEventListener('click', (e) => {
        const target = e.target.closest('[data-shortcut-action]');
        if (!target) return;

        const actionType = target.getAttribute('data-shortcut-action');
        const menuData = getVisibleSnoozeMenu();
        if (!menuData) return;

        const parsed = parseSnoozeMenuItems(menuData.items);

        if (actionType === 'unsnooze' && parsed.unsnoozeItem) {
          clickMenuItem(parsed.unsnoozeItem, 'Unsnooze');
        } else if (actionType.startsWith('dynamic-')) {
          const idx = parseInt(actionType.replace('dynamic-', ''), 10);
          if (parsed.dynamicItems[idx]) {
            const item = parsed.dynamicItems[idx];
            const title = (item.innerText || '').split('\n')[0].trim();
            clickMenuItem(item, title);
          }
        } else if (actionType === 'named-tomorrow') {
          const target = menuData.items.find(it => /tomorrow/i.test(it.innerText));
          if (target) clickMenuItem(target, 'Tomorrow');
        } else if (actionType === 'named-next-week') {
          const target = menuData.items.find(it => /next week/i.test(it.innerText));
          if (target) clickMenuItem(target, 'Next week');
        } else if (actionType === 'named-later-week') {
          const target = menuData.items.find(it => /later this week|this weekend|middle/i.test(it.innerText));
          if (target) clickMenuItem(target, target.innerText.split('\n')[0].trim());
        } else if (actionType === 'pick-date' && parsed.pickDateItem) {
          clickMenuItem(parsed.pickDateItem, 'Select date & time');
        } else if (actionType === 'cancel') {
          hideHUD(true);
          isMenuOpen = false;
        }
      });

      document.body.appendChild(hud);
    }

    hud.style.background = isSuccess ? '#137333' : '#202124';
    try {
      hud.innerHTML = text;
    } catch (err) {
      // Trusted Types fallback: if the page enforces
      // "require-trusted-types-for 'script'", render plain text instead
      // of failing the whole shortcut.
      hud.textContent = text
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&bull;/g, '•');
    }
    hud.style.opacity = '1';
    hud.style.display = 'block';

    if (!isHudHovered) {
      const timeoutDuration = isSuccess ? 2200 : (currentConfig.hudTimeoutSec || 4) * 1000;
      scheduleHudDismiss(timeoutDuration);
    }
  }

  function hideHUD(force = false) {
    if (isHudHovered && !force) {
      return;
    }
    const hud = document.getElementById('__gmail_snooze_hud');
    if (hud) {
      hud.style.opacity = '0';
      setTimeout(() => {
        if (!isHudHovered || force) hud.style.display = 'none';
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
    // Context: Global Navigation (g + j -> Spam / Junk, g + u -> Unread)
    // Works anywhere in Gmail (list view or open email)
    // =======================================================================
    if (!menuData) {
      if (currentConfig.enableGoToSpam && key === 'j' && !event.shiftKey) {
        const now = Date.now();
        if (lastGTime > 0 && now - lastGTime < G_TIMEOUT_MS) {
          // 'g' then 'j' detected -> Jump to Spam / Junk folder!
          lastGTime = 0;
          event.preventDefault();
          event.stopPropagation();
          goToSpamFolder();
          return;
        }
      }

      if (currentConfig.enableGoToUnread && key === 'u' && !event.shiftKey) {
        const now = Date.now();
        if (lastGTime > 0 && now - lastGTime < G_TIMEOUT_MS) {
          // 'g' then 'u' detected -> Jump to Unread emails!
          lastGTime = 0;
          event.preventDefault();
          event.stopPropagation();
          goToUnreadEmails();
          return;
        }
      }

      // Native go-to equivalents: gi (Inbox), gs (Starred), gb (Snoozed),
      // gt (Sent), gd (Drafts), ga (All Mail), gc (Contacts).
      // Implemented by the extension so they keep working when Gmail
      // keyboard shortcuts are disabled in settings.
      if (currentConfig.enableGoToNav && !event.shiftKey) {
        const navTarget = GO_TO_NAV_TARGETS[key];
        if (navTarget) {
          const now = Date.now();
          if (lastGTime > 0 && now - lastGTime < G_TIMEOUT_MS) {
            lastGTime = 0;
            event.preventDefault();
            event.stopPropagation();
            goToMailbox(navTarget);
            return;
          }
        }
      }

      // gp / gn: previous / next page (native equivalents)
      if (currentConfig.enableNativeShortcuts && !event.shiftKey && (key === 'p' || key === 'n')) {
        const now = Date.now();
        if (lastGTime > 0 && now - lastGTime < G_TIMEOUT_MS) {
          lastGTime = 0;
          event.preventDefault();
          event.stopPropagation();
          if (key === 'n') {
            goToNextPage();
          } else {
            goToPrevPage();
          }
          return;
        }
      }
    }

    // =======================================================================
    // Context: Search by Sender (;) and Search by Subject (')
    // Available in email list view and when an email is open
    // =======================================================================
    if (!menuData) {
      if (currentConfig.enableSearchSender && event.key === ';') {
        event.preventDefault();
        event.stopPropagation();
        searchBySender();
        return;
      }

      if (currentConfig.enableSearchSubject && event.key === "'") {
        event.preventDefault();
        event.stopPropagation();
        searchBySubject();
        return;
      }
    }

    // =======================================================================
    // Context 1: Email List View Navigation (gg, G, ]], [[)
    // Only active when listing emails and NOT in an open email thread
    // =======================================================================
    if (!menuData && isEmailListView()) {
      // 1. Pagination shortcuts: ]] and [[
      if (currentConfig.enablePagination) {
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

      // 2. Email list jumping: gg (top) and G (bottom)
      if (currentConfig.enableListJump) {
        // 'G' (Shift + g): Go to bottom email
        if (event.key === 'G' || (event.shiftKey && key === 'g')) {
          event.preventDefault();
          event.stopPropagation();
          lastGTime = 0;
          goToBottomEmail();
          return;
        }

        // 'gg' (g pressed twice within 500ms): Go to top email
        if (event.key === 'g' && !event.shiftKey) {
          const now = Date.now();
          if (lastGTime > 0 && now - lastGTime < G_TIMEOUT_MS) {
            // Second 'g' pressed in sequence!
            lastGTime = 0;
            event.preventDefault();
            event.stopPropagation();
            goToTopEmail();
            return;
          } else {
            // First 'g' pressed -> record timestamp, but do NOT preventDefault
            // so native Gmail 'g' combos (gi, gt, gd, ga) still work
            lastGTime = now;
          }
        } else if (lastGTime > 0 && event.key !== 'Shift') {
          // Any non-g, non-j, non-u key clears the 'g' timer
          lastGTime = 0;
        }
      }
    } else if (!menuData) {
      // Outside email list view: still track first 'g' for 'gj' and 'gu' navigation
      if (event.key === 'g' && !event.shiftKey) {
        lastGTime = Date.now();
      } else if (lastGTime > 0 && event.key !== 'Shift') {
        lastGTime = 0;
      }
    }

    // =======================================================================
    // Context 1.5: Native Gmail shortcut equivalents
    // (implemented via DOM interaction so they work even when Gmail's own
    //  keyboard shortcuts are disabled in Gmail settings)
    // =======================================================================
    if (!menuData && currentConfig.enableNativeShortcuts) {
      const now = Date.now();
      const rawKey = event.key;
      const consume = () => {
        event.preventDefault();
        event.stopPropagation();
      };

      // --- '*' prefix sequences: *a, *n, *r, *u, *s, *t (list view) ---
      if (rawKey === '*') {
        lastStarTime = now;
        consume();
        return;
      }
      if (
        isEmailListView() &&
        !event.shiftKey &&
        key.length === 1 &&
        'anrust'.includes(key) &&
        lastStarTime > 0 &&
        now - lastStarTime < STAR_SEQ_TIMEOUT_MS
      ) {
        lastStarTime = 0;
        const criteria = {
          a: [/^(Все|All)$/i, 'All'],
          n: [/^(Ни одного|Ни одно|Ничего|None)$/i, 'None'],
          r: [/^(Прочитанные|Read)$/i, 'Read'],
          u: [/^(Непрочитанные|Unread)$/i, 'Unread'],
          s: [/^(Помеченные|Starred)$/i, 'Starred'],
          t: [/^(Без пометок|Без пометки|Unstarred)$/i, 'Unstarred']
        }[key];
        if (criteria) {
          consume();
          selectByCriterion(criteria[0], criteria[1]);
          return;
        }
      }
      if (lastStarTime > 0 && rawKey !== '*') {
        lastStarTime = 0;
      }

      // --- Global shortcuts (any context) ---
      if (rawKey === '?') {
        consume();
        showShortcutHelp();
        return;
      }
      if (key === 'c' && !event.shiftKey) {
        consume();
        composeNew();
        return;
      }
      if (key === 'd' && !event.shiftKey) {
        consume();
        composeInTab();
        return;
      }
      if (rawKey === '/') {
        consume();
        focusSearchBox();
        return;
      }
      if (key === 'z' && !event.shiftKey) {
        consume();
        undoLastAction();
        return;
      }
      if (rawKey === ',') {
        consume();
        focusToolbar();
        return;
      }
      if (key === 'u' && !event.shiftKey) {
        consume();
        backToThreadList();
        return;
      }
      if (key === 'e' && !event.shiftKey) {
        consume();
        if (isEmailListView()) {
          runToolbarAction('7', 'Archive');
        } else {
          runToolbarAction('7', 'Archive', false);
        }
        return;
      }
      if (rawKey === '#') {
        consume();
        if (isEmailListView()) {
          runToolbarAction('10', 'Delete');
        } else {
          runToolbarAction('10', 'Delete', false);
        }
        return;
      }
      if (rawKey === '!') {
        consume();
        if (isEmailListView()) {
          runToolbarAction('9', 'Report spam');
        } else {
          runToolbarAction('9', 'Report spam', false);
        }
        return;
      }

      // --- List view shortcuts ---
      if (isEmailListView()) {
        if (key === 'j' && !event.shiftKey) {
          consume();
          moveCursor(1);
          return;
        }
        if (key === 'k' && !event.shiftKey) {
          consume();
          moveCursor(-1);
          return;
        }
        if (key === 'o' && !event.shiftKey) {
          consume();
          openCursorRow();
          return;
        }
        if (key === 'x' && !event.shiftKey) {
          consume();
          toggleSelectCursorRow();
          return;
        }
        if (key === 's' && !event.shiftKey) {
          consume();
          toggleStarCursorRow();
          return;
        }
        if (key === 'y' && !event.shiftKey) {
          consume();
          runToolbarAction('7', 'Archive');
          return;
        }
        if (rawKey === 'I') {
          consume();
          runToolbarAction('1', 'Mark as read');
          return;
        }
        if (rawKey === 'U') {
          consume();
          runToolbarAction('2', 'Mark as unread');
          return;
        }
        if (key === 'm' && !event.shiftKey) {
          consume();
          openToolbarMenu(/Другие действия|^More/i, /Игнорировать|^Mute/i, 'Mute');
          return;
        }
        if (rawKey === 'T') {
          consume();
          openToolbarMenu(/Другие действия|^More/i, /Задачи|Tasks/i, 'Add to Tasks');
          return;
        }
        if (key === 'b' && !event.shiftKey) {
          consume();
          openSnoozeOnCursorRow();
          return;
        }
        if (rawKey === '.') {
          consume();
          openToolbarMenu(/Другие действия|^More/i, null, 'More actions');
          return;
        }
        if (key === 'v' && !event.shiftKey) {
          consume();
          openToolbarMenu(/Переместить в|^Move to/i, null, 'Move to');
          return;
        }
        if (key === 'l' && !event.shiftKey) {
          consume();
          openToolbarMenu(/Другие действия|^More/i, /Присвоить ярлык|^Label/i, 'Labels');
          return;
        }
      } else {
        // --- Open thread shortcuts ---
        if (key === 'r' && !event.shiftKey) {
          consume();
          clickThreadActionButton(/^(Ответить|Reply)$/i, 'Reply');
          return;
        }
        if (key === 'a' && !event.shiftKey) {
          consume();
          clickThreadActionButton(/^(Ответить всем|Reply all)$/i, 'Reply all');
          return;
        }
        if (key === 'f' && !event.shiftKey) {
          consume();
          clickThreadActionButton(/^(Переслать|Forward)$/i, 'Forward');
          return;
        }
        // ';' only reaches here when the search-by-sender shortcut is disabled
        if (rawKey === ';') {
          consume();
          expandCollapseAll(true);
          return;
        }
        if (rawKey === ':') {
          consume();
          expandCollapseAll(false);
          return;
        }
      }
    }

    // =======================================================================
    // Context 2: Snooze Menu Open (Dynamic 1, 2, 3..., Unsnooze u, Named t, w, m, d)
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

    // 2. Dynamic options: exactly maps digit key (1, 2, 3...) to parsed.dynamicItems
    const digitIndex = parseInt(key, 10) - 1;
    if (!isNaN(digitIndex) && digitIndex >= 0 && digitIndex < parsed.dynamicItems.length) {
      event.preventDefault();
      event.stopPropagation();
      const target = parsed.dynamicItems[digitIndex];
      const title = (target.innerText || '').split('\n')[0].trim();
      clickMenuItem(target, title);
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
      hideHUD(true);
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
