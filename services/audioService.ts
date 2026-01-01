
// Simple audio synthesizer to avoid loading external assets
class AudioService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    } catch (e) {
      console.warn("Web Audio API not supported");
    }
  }

  // Resume context if suspended (browser policy)
  private async resume() {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  playShoot(type: 'LASER' | 'HEAVY' | 'NORMAL', era: number = 0) {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // --- ERA 0: STONE AGE (Swish, Thud, Wood) ---
    if (era === 0) {
        // Noise buffer for "Whoosh" of throwing
        if (type === 'NORMAL') {
            osc.frequency.value = 0; // Not used for noise really, but keeping structure simpler
            // Use noise for whoosh
            const bufferSize = this.ctx.sampleRate * 0.1;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i/bufferSize); // Decay
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseGain = this.ctx.createGain();
            noise.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noiseGain.gain.setValueAtTime(0.05, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            noise.start(now);
        } else {
             // Thud
             osc.type = 'sine';
             osc.frequency.setValueAtTime(150, now);
             osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
             gain.gain.setValueAtTime(0.2, now);
             gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
             osc.start(now);
             osc.stop(now + 0.1);
        }
    } 
    // --- ERA 1: CASTLE AGE (Bow Twang, Mechanical Clank) ---
    else if (era === 1) {
        if (type === 'NORMAL') {
            // Bow Twang
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else {
            // Catapult / Heavy
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    }
    // --- ERA 2: IMPERIAL AGE (Gunshot, Blast) ---
    else {
        if (type === 'NORMAL') {
            // Gunshot (Sawtooth with fast decay)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else {
            // Cannon/Heavy
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    }
  }

  playImpact() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.05);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);
    
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playBuild() {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Anvil / Hammer sound
    const now = this.ctx.currentTime;
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now); // A4
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playExplosion() {
    if (!this.enabled || !this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    
    // Low pass filter for "Thud" explosion
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    noise.start(now);
  }
  
  // START WAVE SOUND (Context Aware)
  playWaveStart(era: number = 0) {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    // --- ERA 0: TRIBAL DRUMS (Bongo/Tom) ---
    if (era === 0) {
        const drumTimes = [0, 0.15, 0.3, 0.6]; // Rhythm: Bum-bum-BUM... BUM!
        const drumFreqs = [180, 200, 160, 120];

        drumTimes.forEach((t, i) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            // Pitch Drop for Drum Effect
            const startTime = now + t;
            osc.frequency.setValueAtTime(drumFreqs[i], startTime);
            osc.frequency.exponentialRampToValueAtTime(50, startTime + 0.1);
            
            gain.gain.setValueAtTime(0.5, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
            
            osc.start(startTime);
            osc.stop(startTime + 0.2);
        });
        return;
    }

    // --- LATER ERAS: WAR HORN ---
    const masterGain = this.ctx.createGain();
    masterGain.connect(this.ctx.destination);
    masterGain.gain.setValueAtTime(0.4, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 3.0);

    // Create 3 oscillators for a "Brass Section" chord/thickness
    const freqs = [150, 151, 225]; // Fundamental + Detune + 5th
    
    freqs.forEach(f => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        // Swell effect (Horn blow dynamics)
        osc.frequency.linearRampToValueAtTime(f + 2, now + 2.5); // Slight pitch drift up
        
        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(0.2, now + 0.1); // Attack
        oscGain.gain.linearRampToValueAtTime(0.15, now + 2.0); // Sustain
        oscGain.gain.linearRampToValueAtTime(0, now + 3.0); // Release

        // Lowpass filter to muffle the harsh sawtooth (simulates brass bell)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.linearRampToValueAtTime(800, now + 0.5); // "Opening" the horn
        filter.frequency.linearRampToValueAtTime(400, now + 2.5);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(masterGain);
        
        osc.start(now);
        osc.stop(now + 3.0);
    });
  }

  playDamage() {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Low crunch / Error sound
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.2);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playAlarm() {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // War Horn / Siren
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 1.0);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 1.0);

    osc.start(now);
    osc.stop(now + 1.0);
  }

  playTick() {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Woodblock tick
    const now = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.start(now);
    osc.stop(now + 0.03);
  }
}

export const audioService = new AudioService();
