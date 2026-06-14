// Web Audio API Synthesizer for Silat Match scoring/warning sounds.
// Uses browser standard synthesis so no external audio files are required.

export const playBuzzer = (durationMs = 1800) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    const duration = durationMs / 1000;
    
    // Create oscillator nodes for a complex, rich buzzer sound
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const oscHarmonic = audioCtx.createOscillator();
    
    const filter = audioCtx.createBiquadFilter();
    const gainNode = audioCtx.createGain();
    
    // Lower frequency with high detune creates that raspy buzzer grittiness
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(120, audioCtx.currentTime); // Low fundamental
    
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(121.5, audioCtx.currentTime); // Slight detuning for chorus effect
    
    // Square wash harmonic to add nasal/digital bite
    oscHarmonic.type = 'square';
    oscHarmonic.frequency.setValueAtTime(240, audioCtx.currentTime); // Octave up
    
    // Filter to roll off extremely harsh high-frequencies while maintaining punch
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, audioCtx.currentTime);
    filter.Q.setValueAtTime(4, audioCtx.currentTime); // slight resonance boost
    
    // Gain envelope (Adsr-ish)
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.08); // Sharp attack
    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime + duration - 0.22); // Sustain
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration); // Smooth decay
    
    // Connections
    osc1.connect(filter);
    osc2.connect(filter);
    oscHarmonic.connect(filter);
    
    // Add a small volume reduction for harmonic to not overpower
    const harmonicGain = audioCtx.createGain();
    harmonicGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    oscHarmonic.disconnect(filter);
    oscHarmonic.connect(harmonicGain);
    harmonicGain.connect(filter);
    
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // Start playback
    osc1.start();
    osc2.start();
    oscHarmonic.start();
    
    // Stop playback
    osc1.stop(audioCtx.currentTime + duration);
    osc2.stop(audioCtx.currentTime + duration);
    oscHarmonic.stop(audioCtx.currentTime + duration);
  } catch (error) {
    console.error('Failed to synthesize buzzer sound:', error);
  }
};

// Clean warning beeps for 10-second warning or general cautions
export const playWarningBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    const playBeep = (timeOffset: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + timeOffset); // A5 note
      
      gain.gain.setValueAtTime(0, audioCtx.currentTime + timeOffset);
      gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + timeOffset + 0.02);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime + timeOffset + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + timeOffset + 0.18);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(audioCtx.currentTime + timeOffset);
      osc.stop(audioCtx.currentTime + timeOffset + 0.2);
    };
    
    // Double high beep
    playBeep(0);
    playBeep(0.25);
  } catch (error) {
    console.error('Failed to play warning beep:', error);
  }
};

// Subtle click for UI feedback or scoring confirmation
export const playClick = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime); // High pitch click
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.06);
  } catch (err) {
    console.error(err);
  }
};
