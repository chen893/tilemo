// @tilemo/mobile — generate the two metronome beeps.
//
// Matches web's WebAudio feedback() in apps/web/src/Metronome.tsx:
//   contract = 880 Hz (high), relax = 660 Hz (low).
// Soft sine with a short attack/decay envelope so it's a beep, not a click.
//
//   node apps/mobile/scripts/gen-beeps.mjs
//
// Output: apps/mobile/assets/audio/{beep_high,beep_low}.wav (mono 44.1kHz).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "assets", "audio");
mkdirSync(outDir, { recursive: true });

const SAMPLE_RATE = 44100;
const DURATION_MS = 90;
const PEAK = 0.35; // ~-9 dBFS — audible but soft

function sineWav(freq) {
  const n = Math.floor((SAMPLE_RATE * DURATION_MS) / 1000);
  const samples = new Int16Array(n);
  const attackN = SAMPLE_RATE * 0.005; // 5ms attack
  const releaseN = SAMPLE_RATE * 0.04; // 40ms release
  for (let i = 0; i < n; i++) {
    const attack = Math.min(1, i / attackN);
    const release = Math.min(1, (n - i) / releaseN);
    const env = Math.min(attack, release);
    const t = i / SAMPLE_RATE;
    samples[i] = Math.round(PEAK * env * 32767 * Math.sin(2 * Math.PI * freq * t));
  }
  return samples;
}

function writeWav(path, samples) {
  const byteLength = 44 + samples.byteLength;
  const buf = Buffer.alloc(byteLength);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(byteLength - 8, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write("data", 36);
  buf.writeUInt32LE(samples.byteLength, 40);
  Buffer.from(samples.buffer).copy(buf, 44);
  writeFileSync(path, buf);
}

writeWav(join(outDir, "beep_high.wav"), sineWav(880));
writeWav(join(outDir, "beep_low.wav"), sineWav(660));
console.log("wrote beep_high.wav (880Hz) + beep_low.wav (660Hz) →", outDir);
