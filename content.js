/**
 * Gmail Shortcuts
 * Fast, lightweight, and configurable keyboard shortcuts for Gmail.
 *
 * Features:
 *   - Auto-activates in Snooze menu (dynamic slots 1, 2, 3..., unsnooze u, named t, w, m, d)
 *   - Multi-line HUD with dynamic options on a separate line
 *   - Hover-protected hint panel (never disappears while mouse is on it; clickable items)
 *   - Navigation:
 *       - gj: Go to Junk / Spam folder (complements native gi, gt, gd, ga)
 *       - gu: Go to Unread emails (is:unread)
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
    hud.innerHTML = text;
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
