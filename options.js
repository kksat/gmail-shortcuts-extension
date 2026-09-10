/**
 * Gmail Shortcuts - Options Page Controller
 */

'use strict';

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

const form = document.getElementById('options-form');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');

const enableSearchSenderInput = document.getElementById('enableSearchSender');
const enableSearchSubjectInput = document.getElementById('enableSearchSubject');
const enableGoToUnreadInput = document.getElementById('enableGoToUnread');
const enableGoToSpamInput = document.getElementById('enableGoToSpam');
const enableListJumpInput = document.getElementById('enableListJump');
const enablePaginationInput = document.getElementById('enablePagination');
const keyUnsnoozeInput = document.getElementById('keyUnsnooze');
const keyTomorrowInput = document.getElementById('keyTomorrow');
const keyNextWeekInput = document.getElementById('keyNextWeek');
const keyLaterWeekInput = document.getElementById('keyLaterWeek');
const keyPickDateInput = document.getElementById('keyPickDate');
const showHUDInput = document.getElementById('showHUD');
const hudTimeoutSecInput = document.getElementById('hudTimeoutSec');

const keyInputs = [
  keyUnsnoozeInput,
  keyTomorrowInput,
  keyNextWeekInput,
  keyLaterWeekInput,
  keyPickDateInput
];

/**
 * Capture keypress directly when input is focused.
 */
keyInputs.forEach((input) => {
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') return;

    e.preventDefault();

    if (e.key === 'Backspace' || e.key === 'Delete') {
      input.value = '';
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      input.value = e.key.toLowerCase();
    }
  });

  input.addEventListener('focus', () => {
    input.select();
  });
});

/**
 * Load settings from storage and populate form.
 */
function restoreOptions() {
  const storage = chrome.storage?.sync || chrome.storage?.local;
  if (!storage) return;

  storage.get(DEFAULT_CONFIG, (items) => {
    enableSearchSenderInput.checked = items.enableSearchSender ?? DEFAULT_CONFIG.enableSearchSender;
    enableSearchSubjectInput.checked = items.enableSearchSubject ?? DEFAULT_CONFIG.enableSearchSubject;
    enableGoToUnreadInput.checked = items.enableGoToUnread ?? DEFAULT_CONFIG.enableGoToUnread;
    enableGoToSpamInput.checked = items.enableGoToSpam ?? DEFAULT_CONFIG.enableGoToSpam;
    enableListJumpInput.checked = items.enableListJump ?? DEFAULT_CONFIG.enableListJump;
    enablePaginationInput.checked = items.enablePagination ?? DEFAULT_CONFIG.enablePagination;
    keyUnsnoozeInput.value = items.keyUnsnooze ?? DEFAULT_CONFIG.keyUnsnooze;
    keyTomorrowInput.value = items.keyTomorrow ?? DEFAULT_CONFIG.keyTomorrow;
    keyNextWeekInput.value = items.keyNextWeek ?? DEFAULT_CONFIG.keyNextWeek;
    keyLaterWeekInput.value = items.keyLaterWeek ?? DEFAULT_CONFIG.keyLaterWeek;
    keyPickDateInput.value = items.keyPickDate ?? DEFAULT_CONFIG.keyPickDate;
    showHUDInput.checked = items.showHUD ?? DEFAULT_CONFIG.showHUD;
    hudTimeoutSecInput.value = items.hudTimeoutSec ?? DEFAULT_CONFIG.hudTimeoutSec;
  });
}

/**
 * Save settings to storage.
 */
function saveOptions(e) {
  e.preventDefault();

  const newConfig = {
    enableSearchSender: enableSearchSenderInput.checked,
    enableSearchSubject: enableSearchSubjectInput.checked,
    enableGoToUnread: enableGoToUnreadInput.checked,
    enableGoToSpam: enableGoToSpamInput.checked,
    enableListJump: enableListJumpInput.checked,
    enablePagination: enablePaginationInput.checked,
    keyUnsnooze: keyUnsnoozeInput.value.trim().toLowerCase() || DEFAULT_CONFIG.keyUnsnooze,
    keyTomorrow: keyTomorrowInput.value.trim().toLowerCase(),
    keyNextWeek: keyNextWeekInput.value.trim().toLowerCase(),
    keyLaterWeek: keyLaterWeekInput.value.trim().toLowerCase(),
    keyPickDate: keyPickDateInput.value.trim().toLowerCase(),
    showHUD: showHUDInput.checked,
    hudTimeoutSec: Math.max(2, Math.min(10, parseInt(hudTimeoutSecInput.value, 10) || 4))
  };

  const storage = chrome.storage?.sync || chrome.storage?.local;
  if (!storage) return;

  storage.set(newConfig, () => {
    statusEl.classList.add('show');
    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 2000);
  });
}

/**
 * Reset settings to default values.
 */
function resetOptions() {
  if (!confirm('Reset all settings to default?')) return;

  const storage = chrome.storage?.sync || chrome.storage?.local;
  if (!storage) return;

  storage.set(DEFAULT_CONFIG, () => {
    restoreOptions();
    statusEl.textContent = '✓ Reset to defaults';
    statusEl.classList.add('show');
    setTimeout(() => {
      statusEl.textContent = '✓ Saved!';
      statusEl.classList.remove('show');
    }, 2000);
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
form.addEventListener('submit', saveOptions);
resetBtn.addEventListener('click', resetOptions);
