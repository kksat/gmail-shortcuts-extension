/**
 * Gmail Shortcuts - Options Page Controller
 */

'use strict';

const DEFAULT_CONFIG = {
  keyTomorrow: 't',
  keyNextWeek: 'w',
  keyLaterWeek: 'm',
  keyPickDate: 'd',
  showHUD: true,
  hudTimeoutSec: 4
};

const form = document.getElementById('options-form');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');

const keyTomorrowInput = document.getElementById('keyTomorrow');
const keyNextWeekInput = document.getElementById('keyNextWeek');
const keyLaterWeekInput = document.getElementById('keyLaterWeek');
const keyPickDateInput = document.getElementById('keyPickDate');
const showHUDInput = document.getElementById('showHUD');
const hudTimeoutSecInput = document.getElementById('hudTimeoutSec');

const keyInputs = [
  keyTomorrowInput,
  keyNextWeekInput,
  keyLaterWeekInput,
  keyPickDateInput
];

/**
 * Capture keypress directly when input is focused.
 */
keyInputs.forEach((input) => {
  input.addEventListener('keydown', (e) => {
    // Allow Tab to navigate
    if (e.key === 'Tab') return;

    e.preventDefault();

    // Allow Backspace / Delete to clear optional keys
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (input !== keyTomorrowInput) {
        input.value = '';
      }
      return;
    }

    // Only accept single visible characters (a-z, 0-9, etc.)
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
    keyTomorrowInput.value = items.keyTomorrow || DEFAULT_CONFIG.keyTomorrow;
    keyNextWeekInput.value = items.keyNextWeek || DEFAULT_CONFIG.keyNextWeek;
    keyLaterWeekInput.value = items.keyLaterWeek || DEFAULT_CONFIG.keyLaterWeek;
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

  // Validate duplicate action keys
  const actionKeys = [
    keyTomorrowInput.value.trim().toLowerCase(),
    keyNextWeekInput.value.trim().toLowerCase(),
    keyLaterWeekInput.value.trim().toLowerCase(),
    keyPickDateInput.value.trim().toLowerCase()
  ].filter(Boolean);

  const uniqueKeys = new Set(actionKeys);
  if (uniqueKeys.size !== actionKeys.length) {
    alert('Please ensure snooze options (Tomorrow, Next week, etc.) have different keys assigned.');
    return;
  }

  const newConfig = {
    keyTomorrow: (keyTomorrowInput.value.trim().toLowerCase() || DEFAULT_CONFIG.keyTomorrow),
    keyNextWeek: (keyNextWeekInput.value.trim().toLowerCase() || DEFAULT_CONFIG.keyNextWeek),
    keyLaterWeek: (keyLaterWeekInput.value.trim().toLowerCase() || DEFAULT_CONFIG.keyLaterWeek),
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
