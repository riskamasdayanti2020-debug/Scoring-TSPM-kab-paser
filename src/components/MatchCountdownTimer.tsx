import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, Plus, Minus, Settings2, Shield, Award, HelpCircle, Volume2, Timer } from 'lucide-react';
import { useAppState } from '../context/AppContext';
import { DURASI_RONDE } from '../data';
import { playBuzzer, playWarningBeep, playClick } from '../utils/audio';

interface MatchCountdownTimerProps {
  matchType: 'Tanding' | 'Seni';
}

export const MatchCountdownTimer: React.FC<MatchCountdownTimerProps> = ({ matchType }) => {
  const {
    matchesTanding,
    matchesSeni,
    activeTandingId,
    activeSeniId,
    setTandingTimerState,
    setSeniTimerState,
  } = useAppState();

  const activeTanding = matchesTanding.find((m) => m.id === activeTandingId);
  const activeSeni = matchesSeni.find((m) => m.id === activeSeniId);

  // Manual duration inputs state
  const [customMinutes, setCustomMinutes] = useState('2');
  const [customSeconds, setCustomSeconds] = useState('00');
  const [showConfig, setShowConfig] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Settle time display formatting
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Sound and action wrappers
  const handleTriggerTick = () => {
    try {
      playClick();
    } catch (e) {}
  };

  const handleManualBuzzer = () => {
    try {
      playBuzzer();
    } catch (e) {}
  };

  // --- Tanding Control Handlers ---
  const handleTandingToggle = () => {
    if (!activeTanding) return;
    handleTriggerTick();
    const nextState = !activeTanding.timerBerjalan;
    setTandingTimerState(activeTanding.id, nextState, activeTanding.waktuSisa);
  };

  const handleTandingReset = () => {
    if (!activeTanding) return;
    handleTriggerTick();
    const baseDuration = DURASI_RONDE[activeTanding.kategoriUsia] || 120;
    setTandingTimerState(activeTanding.id, false, baseDuration);
  };

  const adjustTandingSeconds = (amount: number) => {
    if (!activeTanding) return;
    handleTriggerTick();
    const newSeconds = Math.max(0, activeTanding.waktuSisa + amount);
    setTandingTimerState(activeTanding.id, activeTanding.timerBerjalan, newSeconds);
  };

  const setTandingPreset = (seconds: number) => {
    if (!activeTanding) return;
    handleTriggerTick();
    setTandingTimerState(activeTanding.id, false, seconds);
  };

  const applyCustomTandingDuration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTanding) return;
    handleTriggerTick();

    const parsedMin = parseInt(customMinutes, 10);
    const parsedSec = parseInt(customSeconds, 10);

    if (isNaN(parsedMin) || isNaN(parsedSec) || parsedMin < 0 || parsedSec < 0 || parsedSec >= 60) {
      setErrorMessage('Input durasi tidak valid! Menit >= 0, Detik 0-59.');
      return;
    }

    const totalSeconds = parsedMin * 60 + parsedSec;
    setTandingTimerState(activeTanding.id, false, totalSeconds);
    setErrorMessage('');
    setShowConfig(false);
  };


  // --- Seni Control Handlers ---
  const handleSeniToggle = () => {
    if (!activeSeni) return;
    handleTriggerTick();
    const nextState = !activeSeni.timerBerjalan;
    setSeniTimerState(activeSeni.id, nextState, activeSeni.waktuBerjalan);
  };

  const handleSeniReset = () => {
    if (!activeSeni) return;
    handleTriggerTick();
    setSeniTimerState(activeSeni.id, false, 0);
  };

  const adjustSeniSeconds = (amount: number) => {
    if (!activeSeni) return;
    handleTriggerTick();
    const newSeconds = Math.max(0, activeSeni.waktuBerjalan + amount);
    setSeniTimerState(activeSeni.id, activeSeni.timerBerjalan, newSeconds);
  };

  const applyCustomSeniDuration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeni) return;
    handleTriggerTick();

    const parsedMin = parseInt(customMinutes, 10);
    const parsedSec = parseInt(customSeconds, 10);

    if (isNaN(parsedMin) || isNaN(parsedSec) || parsedMin < 0 || parsedSec < 0 || parsedSec >= 60) {
      setErrorMessage('Input tidak valid! Menit >= 0, Detik 0-59.');
      return;
    }

    const totalSeconds = parsedMin * 60 + parsedSec;
    setSeniTimerState(activeSeni.id, false, totalSeconds);
    setErrorMessage('');
    setShowConfig(false);
  };


  // Render for Tanding
  if (matchType === 'Tanding') {
    if (!activeTanding) {
      return (
        <div className="bg-[#1a1111] p-5 rounded-xl border border-red-950/40 text-center text-red-400 font-mono text-xs">
          ⚠️ TIDAK ADA PARTAI TANDING AKTIF UNTUK TIMER
        </div>
      );
    }

    const isLast10Seconds = activeTanding.waktuSisa <= 10 && activeTanding.waktuSisa > 0 && activeTanding.timerBerjalan;

    return (
      <div className="bg-[#0f0f0f] text-white rounded-xl p-5 md:p-6 shadow-2xl border border-[#2d2d2d] space-y-5 relative overflow-hidden" id="countdown-timer-tanding">
        {/* Subtle Background Ambiance Glow */}
        {activeTanding.timerBerjalan && (
          <div className="absolute inset-0 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors pointer-events-none" />
        )}
        {isLast10Seconds && (
          <div className="absolute inset-0 bg-red-600/5 animate-pulse pointer-events-none" />
        )}

        {/* Title and Top Header bar */}
        <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-2.5">
          <div className="flex items-center space-x-2">
            <Timer className={`w-4 h-4 ${activeTanding.timerBerjalan ? 'text-emerald-400 animate-pulse' : 'text-yellow-500'}`} />
            <span className="text-[10px] font-mono font-bold tracking-widest text-gray-400 uppercase">
              COUNTDOWN TIMER ADVANCED
            </span>
          </div>
          <button
            onClick={() => {
              handleTriggerTick();
              setShowConfig(!showConfig);
            }}
            className="flex items-center space-x-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md transition-colors"
            title="Konfigurasi Waktu Ronde"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Kustomisasi</span>
          </button>
        </div>

        {/* Big Digit Watch Face */}
        <div className="space-y-1.5 text-center">
          <div className={`text-6xl md:text-7xl font-mono font-black tracking-widest transition-colors select-none duration-150 ${
            isLast10Seconds ? 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse' : activeTanding.timerBerjalan ? 'text-[#39FF14] drop-shadow-[0_0_12px_rgba(57,255,20,0.3)]' : 'text-amber-500'
          }`}>
            {formatTime(activeTanding.waktuSisa)}
          </div>
          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            Ronde Aktif: <strong className="text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded font-mono">RONDE {activeTanding.rondeAktif}</strong>
          </div>
        </div>

        {/* Adjuster and Precision Control Row */}
        <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold font-mono">
          <button
            onClick={() => adjustTandingSeconds(-10)}
            className="bg-black/60 border border-zinc-800 hover:border-red-900/50 hover:bg-red-950/20 py-2 rounded text-red-400 transition-all flex items-center justify-center space-x-0.5 cursor-pointer"
            title="Kurangi 10 Detik"
          >
            <Minus className="w-3 h-3" />
            <span>10s</span>
          </button>
          <button
            onClick={() => adjustTandingSeconds(-30)}
            className="bg-black/60 border border-zinc-800 hover:border-red-900/50 hover:bg-red-950/20 py-2 rounded text-red-500 transition-all flex items-center justify-center space-x-0.5 cursor-pointer"
            title="Kurangi 30 Detik"
          >
            <Minus className="w-3 h-3" />
            <span>30s</span>
          </button>
          <button
            onClick={() => adjustTandingSeconds(30)}
            className="bg-black/60 border border-zinc-800 hover:border-emerald-900/50 hover:bg-[#002810]/30 py-2 rounded text-emerald-400 transition-all flex items-center justify-center space-x-0.5 cursor-pointer"
            title="Tambah 30 Detik"
          >
            <Plus className="w-3 h-3" />
            <span>30s</span>
          </button>
          <button
            onClick={() => adjustTandingSeconds(10)}
            className="bg-black/60 border border-zinc-800 hover:border-emerald-900/50 hover:bg-[#002810]/30 py-2 rounded text-[#39FF14] transition-all flex items-center justify-center space-x-0.5 cursor-pointer"
            title="Tambah 10 Detik"
          >
            <Plus className="w-3 h-3" />
            <span>10s</span>
          </button>
        </div>

        {/* Core Control Button Triggers (Start, Pause, Reset, Buzzer) */}
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Restart/Reset Button */}
          <button
            onClick={handleTandingReset}
            className="col-span-3 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:text-white text-gray-400 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5"
            title="Reset ke Durasi Ronde Bawaan"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-[8px] font-black uppercase tracking-wider">RESET</span>
          </button>

          {/* MAIN START / PAUSE BLOCK TRIGGER */}
          <button
            onClick={handleTandingToggle}
            disabled={activeTanding.waktuSisa === 0}
            className={`col-span-6 py-3 rounded-xl font-extrabold text-[#0B0B0C] tracking-widest text-xs uppercase cursor-pointer flex items-center justify-center space-x-2 transition-all disabled:opacity-40 shadow-lg ${
              activeTanding.timerBerjalan 
                ? 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-black border border-amber-400' 
                : 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black border border-emerald-400'
            }`}
          >
            {activeTanding.timerBerjalan ? (
              <>
                <Pause className="w-4 h-4 fill-current stroke-none" />
                <span>PAUSE TIME</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current stroke-none" />
                <span>START TIME</span>
              </>
            )}
          </button>

          {/* Manual Buzzer Bell Trigger */}
          <button
            onClick={() => { handleManualBuzzer(); handleTriggerTick(); }}
            className="col-span-3 py-3 bg-red-950/80 hover:bg-red-900 border border-red-900/40 hover:text-white text-red-400 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5"
            title="Bunyikan Sirine / Buzzer Manual"
          >
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-wider">BUZZER</span>
          </button>
        </div>

        {/* Quick Presets Configuration drawer */}
        {showConfig && (
          <div className="bg-[#141414] border border-[#2d2d2d] p-3 rounded-lg space-y-3.5 animate-grow-in text-xs font-mono">
            <div>
              <span className="text-[9px] text-[#FFD700] uppercase font-black tracking-wider block mb-1.5">Preset Cepat Ronde:</span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => setTandingPreset(60)}
                  className="bg-black/65 border border-zinc-800 text-gray-300 hover:text-white py-1 rounded hover:border-amber-500/45 text-[9px] font-extrabold"
                >
                  1:00 (A)
                </button>
                <button
                  onClick={() => setTandingPreset(90)}
                  className="bg-black/65 border border-zinc-800 text-gray-300 hover:text-white py-1 rounded hover:border-amber-500/45 text-[9px] font-extrabold"
                >
                  1:30 (B)
                </button>
                <button
                  onClick={() => setTandingPreset(120)}
                  className="bg-black/65 border border-zinc-800 text-gray-300 hover:text-white py-1 rounded hover:border-amber-500/45 text-[9px] font-extrabold"
                >
                  2:00 (C)
                </button>
                <button
                  onClick={() => setTandingPreset(180)}
                  className="bg-black/65 border border-zinc-800 text-gray-300 hover:text-white py-1 rounded hover:border-amber-500/45 text-[9px] font-extrabold"
                >
                  3:00 (D)
                </button>
              </div>
            </div>

            {/* Custom Input form for customized time duration */}
            <form onSubmit={applyCustomTandingDuration} className="space-y-2 border-t border-zinc-800 pb-1.5 pt-2">
              <span className="text-[9px] text-[#FFD700] uppercase font-black tracking-wider block">Set Manual Ronde Baru:</span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 flex-1">
                  <input
                    type="number"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    min="0"
                    placeholder="M"
                    className="w-full bg-[#0a0a0a] border border-zinc-800 text-center py-1 rounded text-white"
                  />
                  <span className="text-gray-500 font-bold">:</span>
                  <input
                    type="number"
                    value={customSeconds}
                    onChange={(e) => setCustomSeconds(e.target.value)}
                    min="0"
                    max="59"
                    placeholder="D"
                    className="w-full bg-[#0a0a0a] border border-zinc-800 text-center py-1 rounded text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="py-1 px-3 bg-[#8B0000] text-white rounded hover:bg-red-800 transition-colors cursor-pointer text-[9px] font-bold"
                >
                  SET TIME
                </button>
              </div>
              {errorMessage && (
                <p className="text-[9px] text-red-400 font-serif font-black">{errorMessage}</p>
              )}
            </form>
          </div>
        )}

        {/* Micro HUD status check */}
        <div className="flex items-center justify-between text-[9px] text-gray-500 font-sans px-0.5">
          <span>Otoritas: Operator Arena Gelanggang</span>
          <span className="flex items-center space-x-1">
            <span className={`w-1.5 h-1.5 rounded-full ${activeTanding.timerBerjalan ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="font-mono uppercase font-black text-[8px]">
              {activeTanding.timerBerjalan ? 'SYNC ACTIVE' : 'SYNC DOCKED'}
            </span>
          </span>
        </div>
      </div>
    );
  }

  // Render for Seni TGRS 
  if (matchType === 'Seni') {
    if (!activeSeni) {
      return (
        <div className="bg-[#111] p-5 rounded-xl border border-amber-950/40 text-center text-amber-500 font-mono text-xs">
          ⚠️ TIDAK ADA PARTAI SENI (TGRS) AKTIF UNTUK TIMER
        </div>
      );
    }

    return (
      <div className="bg-[#0f0f0f] text-white rounded-xl p-5 md:p-6 shadow-2xl border border-[#2d2d2d] space-y-5 relative overflow-hidden" id="countdown-timer-seni">
        {activeSeni.timerBerjalan && (
          <div className="absolute inset-0 bg-amber-500/5 hover:bg-amber-500/10 transition-colors pointer-events-none" />
        )}

        {/* Title and Top Header bar */}
        <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-2.5">
          <div className="flex items-center space-x-2">
            <Timer className={`w-4 h-4 ${activeSeni.timerBerjalan ? 'text-amber-500 animate-pulse' : 'text-gray-500'}`} />
            <span className="text-[10px] font-mono font-bold tracking-widest text-gray-400 uppercase">
              STOPWATCH SENI INDEPENDEN
            </span>
          </div>
          <button
            onClick={() => {
              handleTriggerTick();
              setShowConfig(!showConfig);
            }}
            className="flex items-center space-x-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md transition-colors"
            title="Konfigurasi Waktu Seni"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Kustomisasi</span>
          </button>
        </div>

        {/* Stopwatch digits display */}
        <div className="space-y-1 text-center">
          <div className={`text-6xl md:text-7xl font-mono font-black tracking-widest transition-colors select-none duration-150 ${
            activeSeni.timerBerjalan ? 'text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.25)]' : 'text-zinc-500'
          }`}>
            {formatTime(activeSeni.waktuBerjalan)}
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-sans">
            Waktu Acuan Seni: <span className="font-bold text-gray-300">03:00 (180 Detik)</span>
          </div>
        </div>

        {/* Adjuster and Precision Control Row */}
        <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold font-mono">
          <button
            onClick={() => adjustSeniSeconds(-10)}
            className="bg-black/60 border border-zinc-800 hover:border-amber-900/50 hover:bg-amber-950/20 py-2 rounded text-amber-500/80 transition-all flex items-center justify-center space-x-0.5 cursor-pointer"
            title="Kurangi 10 Detik"
          >
            <Minus className="w-3 h-3" />
            <span>10s</span>
          </button>
          <button
            onClick={() => adjustSeniSeconds(-30)}
            className="bg-black/60 border border-zinc-800 hover:border-amber-900/50 hover:bg-amber-950/20 py-2 rounded text-red-400 transition-all flex items-center justify-center space-x-0.5 cursor-pointer"
            title="Kurangi 30 Detik"
          >
            <Minus className="w-3 h-3" />
            <span>30s</span>
          </button>
          <button
            onClick={() => adjustSeniSeconds(30)}
            className="bg-black/60 border border-zinc-800 hover:border-emerald-900/50 hover:bg-[#002810]/30 py-2 rounded text-emerald-400 transition-all flex items-center justify-center space-x-0.5 cursor-pointer"
            title="Tambah 30 Detik"
          >
            <Plus className="w-3 h-3" />
            <span>30s</span>
          </button>
          <button
            onClick={() => adjustSeniSeconds(10)}
            className="bg-black/60 border border-zinc-800 hover:border-[#10b981]/50 hover:bg-[#002810]/30 py-2 rounded text-[#39FF14] transition-all flex items-center justify-center space-x-0.5 cursor-pointer"
            title="Tambah 10 Detik"
          >
            <Plus className="w-3 h-3" />
            <span>10s</span>
          </button>
        </div>

        {/* Buttons UI Grid */}
        <div className="grid grid-cols-12 gap-3 items-center">
          <button
            onClick={handleSeniReset}
            className="col-span-3 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:text-white text-gray-400 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5"
            title="Reset ke Nol"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-[8px] font-black uppercase tracking-wider">RESET</span>
          </button>

          <button
            onClick={handleSeniToggle}
            className={`col-span-6 py-3 rounded-xl font-extrabold text-[#0B0B0C] tracking-widest text-xs uppercase cursor-pointer flex items-center justify-center space-x-2 transition-all shadow-lg ${
              activeSeni.timerBerjalan 
                ? 'bg-amber-600 hover:bg-amber-500 active:scale-95 text-black border border-amber-400' 
                : 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black border border-emerald-450'
            }`}
          >
            {activeSeni.timerBerjalan ? (
              <>
                <Pause className="w-4 h-4 fill-current stroke-none" />
                <span>PAUSE TIME</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current stroke-none text-blackml-0.5" />
                <span>START TIME</span>
              </>
            )}
          </button>

          <button
            onClick={() => { handleManualBuzzer(); handleTriggerTick(); }}
            className="col-span-3 py-3 bg-red-950/80 hover:bg-red-900 border border-red-900/40 hover:text-white text-red-400 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5"
            title="Bunyikan Buzzer manual"
          >
            <Volume2 className="w-4 h-4" />
            <span className="text-[8px] font-black uppercase tracking-wider">BUZZER</span>
          </button>
        </div>

        {/* Custom Edit time Form drawer */}
        {showConfig && (
          <div className="bg-[#141414] border border-[#2d2d2d] p-3 rounded-lg animate-grow-in text-xs font-mono">
            <form onSubmit={applyCustomSeniDuration} className="space-y-2">
              <span className="text-[9px] text-[#FFD700] uppercase font-black tracking-wider block">Atur Stopwatch Berjalan (Mulai Dari):</span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 flex-1">
                  <input
                    type="number"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    min="0"
                    placeholder="M"
                    className="w-full bg-[#0a0a0a] border border-zinc-800 text-center py-1 rounded text-white"
                  />
                  <span className="text-gray-500 font-bold">:</span>
                  <input
                    type="number"
                    value={customSeconds}
                    onChange={(e) => setCustomSeconds(e.target.value)}
                    min="0"
                    max="59"
                    placeholder="D"
                    className="w-full bg-[#0a0a0a] border border-zinc-800 text-center py-1 rounded text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="py-1 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors cursor-pointer text-[9px] font-bold"
                >
                  SET TIME
                </button>
              </div>
              {errorMessage && (
                <p className="text-[9px] text-red-400 font-serif font-black">{errorMessage}</p>
              )}
            </form>
          </div>
        )}

        <div className="flex items-center justify-between text-[9px] text-gray-500 font-sans px-0.5">
          <span>Otoritas: Operator Arena Seni TGRS</span>
          <span className="flex items-center space-x-1">
            <span className={`w-1.5 h-1.5 rounded-full ${activeSeni.timerBerjalan ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="font-mono uppercase font-black text-[8px]">
              {activeSeni.timerBerjalan ? 'STOPWATCH RUNNING' : 'STOPWATCH PAUSED'}
            </span>
          </span>
        </div>
      </div>
    );
  }

  return null;
};
