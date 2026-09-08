/**
 * Gmail Shortcuts - Options Page Controller
 */

'use strict';

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

const form = document.getElementById('options-form');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');

const enablePaginationInput = document.getElementById('enablePagination');
const keyOpt1Input = document.getElementById('keyOpt1');
const keyOpt2Input = document.getElementById('keyOpt2');
const keyOpt3Input = document.getElementById('keyOpt3');
const keyUnsnoozeInput = document.getElementById('keyUnsnooze');
const keyTomorrowInput = document.getElementById('keyTomorrow');
const keyNextWeekInput = document.getElementById('keyNextWeek');
const keyLaterWeekInput = document.getElementById('keyLaterWeek');
const keyPickDateInput = document.getElementById('keyPickDate');
const showHUDInput = document.getElementById('showHUD');
const hudTimeoutSecInput = document.getElementById('hudTimeoutSec');

const keyInputs = [
  keyOpt1Input,
  keyOpt2Input,
  keyOpt3Input,
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
    enablePaginationInput.checked = items.enablePagination ?? DEFAULT_CONFIG.enablePagination;
    keyOpt1Input.value = items.keyOpt1 ?? DEFAULT_CONFIG.keyOpt1;
    keyOpt2Input.value = items.keyOpt2 ?? DEFAULT_CONFIG.keyOpt2;
    keyOpt3Input.value = items.keyOpt3 ?? DEFAULT_CONFIG.keyOpt3;
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
    enablePagination: enablePaginationInput.checked,
    keyOpt1: keyOpt1Input.value.trim().toLowerCase() || DEFAULT_CONFIG.keyOpt1,
    keyOpt2: keyOpt2Input.value.trim().toLowerCase() || DEFAULT_CONFIG.keyOpt2,
    keyOpt3: keyOpt3Input.value.trim().toLowerCase() || DEFAULT_CONFIG.keyOpt3,
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
