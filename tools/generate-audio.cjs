// 自行合成轻提示音，无远程素材或第三方音频。重新生成：node tools/generate-audio.cjs
const fs = require('fs');
const path = require('path');
const output = path.resolve(__dirname, '../miniprogram/assets/audio');
fs.mkdirSync(output, { recursive: true });
function tone(name, frequency, seconds) {
  const sampleRate = 22050;
  const count = Math.round(sampleRate * seconds);
  const data = Buffer.alloc(44 + count * 2);
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(sampleRate, 24); data.writeUInt32LE(sampleRate * 2, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36);
  data.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const time = i / sampleRate;
    const fade = Math.min(1, time / 0.008, (seconds - time) / 0.025);
    const wave = Math.sin(2 * Math.PI * frequency * time) * 0.85 + Math.sin(2 * Math.PI * frequency * 2 * time) * 0.1;
    data.writeInt16LE(Math.round(wave * fade * 16000), 44 + i * 2);
  }
  fs.writeFileSync(path.join(output, name + '.wav'), data);
}
tone('tick', 560, 0.065);
tone('urgent', 880, 0.11);
console.log('已生成两款本地 WAV 倒计时提示音。');
