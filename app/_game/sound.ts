const ACQUIRE_JINGLES = [
  "/sounds/music-jingle-nes-2.ogg",
  "/sounds/music-jingle-nes-3.ogg",
  "/sounds/music-jingle-hit-2.ogg",
];

/**
 * 헬기 로터음. 저음 노이즈를 날개가 지나가는 주기로 끊어 "두두두" 소리를 합성한다.
 * 속도가 빠를수록 주기가 빨라지고 커진다.
 */
function createRotor() {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let chop: OscillatorNode | null = null;
  let level = 0;

  const ensure = () => {
    if (context) return context;
    context = new AudioContext();
    const length = context.sampleRate * 2;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    // 갈색 노이즈(저음 위주)
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 420;

    // 날개 통과 주기로 음량을 크게 흔든다.
    const pulse = context.createGain();
    pulse.gain.value = 0.55;
    chop = context.createOscillator();
    chop.type = "square";
    chop.frequency.value = 9;
    const depth = context.createGain();
    depth.gain.value = 0.45;
    chop.connect(depth).connect(pulse.gain);

    master = context.createGain();
    master.gain.value = 0;
    noise.connect(lowpass).connect(pulse).connect(master).connect(context.destination);
    noise.start();
    chop.start();
    return context;
  };

  return {
    start() {
      void ensure().resume();
    },
    stop() {
      if (context && master) master.gain.setTargetAtTime(0, context.currentTime, 0.1);
      level = 0;
    },
    /** ratio: 0(정지)~1(최고 속도). muted면 소리를 내지 않는다. */
    set(ratio: number, muted: boolean) {
      if (!context || !master || !chop) return;
      const target = muted ? 0 : 0.18 + 0.22 * ratio;
      if (Math.abs(target - level) < 0.01) return;
      level = target;
      master.gain.setTargetAtTime(target, context.currentTime, 0.15);
      chop.frequency.setTargetAtTime(9 + 5 * ratio, context.currentTime, 0.2);
    },
  };
}

/** 배경음악과 효과음. 브라우저 자동재생 정책 때문에 사용자 클릭 이후에 시작한다. */
export function createSound() {
  const music = new Audio("/sounds/music-insistent-loop.ogg");
  music.loop = true;
  music.volume = 0.45;
  const rotor = createRotor();
  let muted = false;

  const play = (src: string, volume = 0.8) => {
    if (muted) return;
    const effect = new Audio(src);
    effect.volume = volume;
    void effect.play().catch(() => {});
  };

  return {
    startMusic() {
      music.currentTime = 0;
      if (!muted) void music.play().catch(() => {});
      rotor.start();
    },
    stopMusic() {
      music.pause();
      rotor.stop();
    },
    /** 헬기 속도(0~1)에 맞춰 로터음을 바꾼다. 매 프레임 불려도 된다. */
    rotorSpeed(ratio: number) {
      rotor.set(ratio, muted);
    },
    setMuted(next: boolean) {
      muted = next;
      music.muted = next;
      if (next) rotor.set(0, true);
      if (!next && music.paused && music.currentTime > 0) void music.play().catch(() => {});
    },
    shot() {
      play("/sounds/scifi-laser-retro-1.ogg", 0.5);
    },
    acquire() {
      play(ACQUIRE_JINGLES[Math.floor(Math.random() * ACQUIRE_JINGLES.length)]);
    },
    clear() {
      play("/sounds/music-jingle-nes-1.ogg", 0.9);
    },
  };
}

export type Sound = ReturnType<typeof createSound>;
