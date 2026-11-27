import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// An original, deterministic 120 BPM instrumental; no sampled music.
const rate = 48000;
const duration = 40;
const count = rate * duration;
const samples = new Float64Array(count);
const sine = (phase) => Math.sin(2 * Math.PI * phase);
const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);
let seed = 1729;
const noise = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};
const add = (start, length, generator) => {
  const from = Math.round(start * rate);
  const total = Math.floor(length * rate);
  for (let i = 0; i < total && from + i < count; i++) {
    samples[from + i] += generator(i / rate, i);
  }
};

const chords = [
  [62, 65, 69, 72],
  [58, 62, 65, 69],
  [60, 65, 69, 72],
  [60, 64, 67, 74],
];
for (let bar = 0; bar < 20; bar++) {
  const chord = chords[bar % chords.length];
  const start = bar * 2;
  for (const note of chord) {
    const hz = frequency(note);
    add(
      start,
      2.5,
      (t) =>
        0.013 *
        Math.min(t / 0.18, 1) *
        Math.min((2.5 - t) / 0.7, 1) *
        (sine(hz * t) + 0.16 * sine(hz * 2.005 * t)),
    );
  }
  for (let beat = 0; beat < 4; beat++) {
    const at = start + beat * 0.5;
    add(
      at,
      0.29,
      (t) =>
        0.2 * Math.exp(-t * 20) * sine(49 * t + 1.7 * (1 - Math.exp(-t * 35))),
    );
    const bass = frequency(chord[0] - 24);
    add(
      at,
      0.4,
      (t) =>
        0.09 *
        Math.min(t / 0.009, 1) *
        Math.exp(-t * 7) *
        (sine(bass * t) + 0.16 * sine(2 * bass * t)),
    );
    if (beat % 2 === 1)
      add(at, 0.13, (t) => 0.027 * Math.exp(-t * 36) * noise());
  }
  for (let step = 0; step < 8; step++) {
    const at = start + step * 0.25;
    const hz = frequency(chord[[0, 2, 1, 3, 2, 1, 3, 2][step]] + 12);
    add(
      at,
      0.65,
      (t) =>
        0.035 *
        Math.min(t / 0.005, 1) *
        Math.exp(-t * 9) *
        (sine(hz * t) + 0.2 * sine(hz * 2 * t)),
    );
    add(at, 0.055, (t) => 0.016 * Math.exp(-t * 90) * noise());
  }
}

// Soft keyboard clicks coincide with the highlighted shortcut actions.
for (const at of [7.74, 13.07, 17.07, 20.73, 22.8, 24.87, 28.67, 30.67]) {
  add(
    at,
    0.055,
    (t) => (0.15 * noise() + 0.06 * sine(1350 * t)) * Math.exp(-t * 105),
  );
}
for (const at of [4.6, 12.2, 19.8, 26.4, 33]) {
  add(at, 0.32, (t) => 0.016 * noise() * Math.sin((Math.PI * t) / 0.32) ** 2);
}

let peak = 0;
for (let i = 0; i < count; i++) {
  const t = i / rate;
  samples[i] *= Math.min(t / 0.6, 1, (duration - t) / 1.5);
  peak = Math.max(peak, Math.abs(samples[i]));
}
const pcm = Buffer.alloc(44 + count * 4);
pcm.write("RIFF", 0);
pcm.writeUInt32LE(pcm.length - 8, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(rate, 24);
pcm.writeUInt32LE(rate * 4, 28);
pcm.writeUInt16LE(4, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(count * 4, 40);
for (let i = 0; i < count; i++) {
  const value = Math.round((samples[i] / peak) * 0.7 * 32767);
  pcm.writeInt16LE(value, 44 + i * 4);
  pcm.writeInt16LE(value, 46 + i * 4);
}
const output = fileURLToPath(
  new URL("../public/soundtrack.wav", import.meta.url),
);
mkdirSync(fileURLToPath(new URL("../public/", import.meta.url)), {
  recursive: true,
});
writeFileSync(output, pcm);
console.log(`Generated original ${duration}s soundtrack: ${output}`);
