import React, { useEffect, useState, useRef } from 'react';
import { useAppState } from '../context/AppContext';
import { Play, Pause, RefreshCw, ChevronLeft, ChevronRight, Award, Trophy, Timer, Circle, PlayCircle, Volume2, Mic, MicOff, LogOut, Eye, Settings2, Wifi, WifiOff } from 'lucide-react';
import { DURASI_RONDE } from '../data';
import { Ronde } from '../types';
import { playBuzzer, playWarningBeep, playClick } from '../utils/audio';
import { MatchCountdownTimer } from './MatchCountdownTimer';

export const Operator: React.FC = () => {
  const [isOpLoggedIn, setIsOpLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('tapak_suci_op_logged_in') === 'true';
  });
  const [opPassword, setOpPassword] = useState('');
  const [opError, setOpError] = useState('');
  const [showOpPassword, setShowOpPassword] = useState(false);

  const handleOpLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (opPassword === 'operator123') {
      setIsOpLoggedIn(true);
      localStorage.setItem('tapak_suci_op_logged_in', 'true');
      setOpError('');
      setOpPassword('');
    } else {
      setOpError('Kata sandi salah! Silakan coba lagi.');
    }
  };

  const handleOpLogout = () => {
    setIsOpLoggedIn(false);
    localStorage.removeItem('tapak_suci_op_logged_in');
  };
  const {
    matchesTanding,
    matchesSeni,
    activeTandingId,
    activeSeniId,
    setTandingTimerState,
    setSeniTimerState,
    changeRondeTanding,
    finishMatchTanding,
    finishMatchSeni,
    juriStatus,
    updateDisplayType,
  } = useAppState();

  const [activeTab, setActiveTabState] = useState<'Tanding' | 'Seni'>('Tanding');
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [speechError, setSpeechError] = useState<string>('');

  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const setActiveTab = (tab: 'Tanding' | 'Seni') => {
    setActiveTabState(tab);
    updateDisplayType(tab);
  };

  // Active Match Tanding
  const activeTanding = matchesTanding.find((m) => m.id === activeTandingId);
  // Active Match Seni
  const activeSeni = matchesSeni.find((m) => m.id === activeSeniId);

  // Sync references to avoid stale closures in Web Speech event handler
  const latestStateRef = useRef({
    activeTab,
    activeTanding,
    activeSeni,
    setTandingTimerState,
    setSeniTimerState,
  });

  useEffect(() => {
    latestStateRef.current = {
      activeTab,
      activeTanding,
      activeSeni,
      setTandingTimerState,
      setSeniTimerState,
    };
  }, [activeTab, activeTanding, activeSeni, setTandingTimerState, setSeniTimerState]);

  // Speech Recognition engine
  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass || !isListening) {
      if (!isListening) {
        setSpeechError('');
      }
      return;
    }

    let recognition: any;
    try {
      recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'id-ID';

      recognition.onstart = () => {
        setSpeechError('');
      };

      recognition.onresult = (event: any) => {
        const resultIndex = event.resultIndex;
        const transcript = event.results[resultIndex][0].transcript.trim().toLowerCase();
        setLastCommand(transcript);

        const { 
          activeTab: curTab, 
          activeTanding: curTanding, 
          activeSeni: curSeni, 
          setTandingTimerState: updaterTanding, 
          setSeniTimerState: updaterSeni 
        } = latestStateRef.current;

        // Command detection phrases (Indonesian/English)
        const isStart = transcript.includes('mulai') || transcript.includes('start') || transcript.includes('jalan') || transcript.includes('play');
        const isStop = transcript.includes('berhenti') || transcript.includes('stop') || transcript.includes('pause') || transcript.includes('hiatus');
        const isReset = transcript.includes('reset') || transcript.includes('ulang') || transcript.includes('atur ulang');
        const isBuzz = transcript.includes('buzzer') || transcript.includes('bel') || transcript.includes('bunyi');

        if (curTab === 'Tanding' && curTanding) {
          if (isStart) {
            if (!curTanding.timerBerjalan && curTanding.waktuSisa > 0) {
              updaterTanding(curTanding.id, true, curTanding.waktuSisa);
              playClick();
            }
          } else if (isStop) {
            if (curTanding.timerBerjalan) {
              updaterTanding(curTanding.id, false, curTanding.waktuSisa);
              playClick();
            }
          } else if (isReset) {
            const baseDuration = DURASI_RONDE[curTanding.kategoriUsia];
            updaterTanding(curTanding.id, false, baseDuration);
            playClick();
          } else if (isBuzz) {
            playBuzzer();
          }
        } else if (curTab === 'Seni' && curSeni) {
          if (isStart) {
            if (!curSeni.timerBerjalan) {
              updaterSeni(curSeni.id, true, curSeni.waktuBerjalan);
              playClick();
            }
          } else if (isStop) {
            if (curSeni.timerBerjalan) {
              updaterSeni(curSeni.id, false, curSeni.waktuBerjalan);
              playClick();
            }
          } else if (isReset) {
            updaterSeni(curSeni.id, false, 0);
            playClick();
          } else if (isBuzz) {
            playBuzzer();
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Akses mikrofon ditolak / tidak diizinkan.');
          setIsListening(false);
        } else if (event.error === 'network') {
          setSpeechError('Gangguan jaringan pada pengenalan suara.');
        } else if (event.error === 'no-speech') {
          // Normal silence, can ignore or continue
        }
      };

      recognition.onend = () => {
        // Keep listening unless the user explicitly deactivated it
        if (isListening) {
          try {
            recognition.start();
          } catch (e) {
            // Already started or busy
          }
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error(err);
      setSpeechError('Browser ini tidak mendukung Web Speech API.');
      setIsListening(false);
    }

    return () => {
      if (recognition) {
        recognition.onend = null;
        try {
          recognition.stop();
        } catch (e) {}
      }
    };
  }, [isListening]);

  // local interval trackers
  useEffect(() => {
    let tandingInterval: NodeJS.Timeout;
    if (activeTanding && activeTanding.timerBerjalan && activeTanding.waktuSisa > 0) {
      tandingInterval = setInterval(() => {
        const nextTime = Math.max(0, activeTanding.waktuSisa - 1);
        const nextRunning = nextTime > 0;
        setTandingTimerState(activeTanding.id, nextRunning, nextTime);
        
        if (nextTime === 0) {
          playBuzzer();
        } else if (nextTime === 10) {
          playWarningBeep();
        }
      }, 1000);
    }
    return () => clearInterval(tandingInterval);
  }, [activeTanding?.timerBerjalan, activeTanding?.waktuSisa, activeTanding?.id]);

  useEffect(() => {
    let seniInterval: NodeJS.Timeout;
    if (activeSeni && activeSeni.timerBerjalan) {
      seniInterval = setInterval(() => {
        const nextTime = activeSeni.waktuBerjalan + 1;
        setSeniTimerState(activeSeni.id, true, nextTime);
      }, 1000);
    }
    return () => clearInterval(seniInterval);
  }, [activeSeni?.timerBerjalan, activeSeni?.waktuBerjalan, activeSeni?.id]);

  // Handle Play/Pause
  const toggleTandingTimer = () => {
    if (!activeTanding) return;
    const isNowRunning = !activeTanding.timerBerjalan;
    setTandingTimerState(activeTanding.id, isNowRunning, activeTanding.waktuSisa);
  };

  const toggleSeniTimer = () => {
    if (!activeSeni) return;
    const isNowRunning = !activeSeni.timerBerjalan;
    setSeniTimerState(activeSeni.id, isNowRunning, activeSeni.waktuBerjalan);
  };

  // Reset clock
  const resetTandingTimer = () => {
    if (!activeTanding) return;
    const baseDuration = DURASI_RONDE[activeTanding.kategoriUsia];
    setTandingTimerState(activeTanding.id, false, baseDuration);
  };

  const resetSeniTimer = () => {
    if (!activeSeni) return;
    setSeniTimerState(activeSeni.id, false, 0);
  };

  // Format mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const [tandingWinner, setTandingWinner] = useState<'Merah' | 'Kuning'>('Merah');
  const [tandingAlasan, setTandingAlasan] = useState('Kemenangan Angka');

  const handleFinishTanding = () => {
    if (!activeTanding) return;
    finishMatchTanding(activeTanding.id, tandingWinner, tandingAlasan);
  };

  const handleFinishSeni = () => {
    if (!activeSeni) return;
    finishMatchSeni(activeSeni.id);
  };

  if (!isOpLoggedIn) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 font-mono text-gray-100">
        <div className="bg-[#0e0e0e] p-8 rounded-2xl border-2 border-yellow-600/40 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Decorative accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/5 rounded-full blur-2xl -z-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-650/5 rounded-full blur-2xl -z-10" />
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-[#161616] border-2 border-amber-500 text-amber-500 rounded-full mx-auto flex items-center justify-center shadow-lg">
              <Timer className="w-8 h-8 animate-pulse text-amber-500" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-sans font-black uppercase text-white tracking-wider flex items-center justify-center gap-1.5">
                <span>PANEL OPERATOR</span>
              </h2>
              <p className="text-amber-500 text-[10px] tracking-widest font-bold uppercase font-mono">
                TAPAK SUCI SCORING SYSTEM
              </p>
            </div>
            <p className="text-gray-400 text-xs font-sans leading-relaxed">
              Otorisasi diperlukan untuk menjalankan timer, mengendalikan jalannya ronde pertandingan, buzzer, dan mengelola perintah suara (Voice Assistant).
            </p>
          </div>

          <form onSubmit={handleOpLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-gray-400 font-bold text-[10px] tracking-wider uppercase">
                PIN / PASSWORD OPERATOR
              </label>
              <div className="relative">
                <input
                  type={showOpPassword ? 'text' : 'password'}
                  id="operator-password-input"
                  value={opPassword}
                  onChange={(e) => {
                    setOpPassword(e.target.value);
                    if (opError) setOpError('');
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[#161616] border border-[#2c2c2c] text-gray-100 rounded-xl px-4 py-3 pr-10 focus:ring-1 focus:ring-amber-500 focus:outline-[#D2691e] font-sans text-sm tracking-widest text-center"
                />
                <button
                  type="button"
                  onClick={() => setShowOpPassword(!showOpPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {opError && (
              <div className="bg-red-950/40 border border-red-900/60 p-3 rounded-lg text-red-500 text-xs text-center font-mono">
                ⚠️ {opError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-amber-800 to-amber-950 hover:from-amber-700 hover:to-amber-900 text-white rounded-xl font-bold font-sans text-xs tracking-wider border border-yellow-800/40 hover:border-yellow-500/50 shadow-md flex items-center justify-center space-x-1.5 transition-all text-center cursor-pointer"
            >
              <span>MASUK PANEL OPERATOR →</span>
            </button>
          </form>

          {/* Help hint badge */}
          <div className="border-t border-[#222] pt-4 text-center">
            <div className="inline-block bg-[#161616] border border-[#2c2c2c] rounded-lg px-3 py-1.5">
              <p className="text-[10px] text-gray-500 font-sans">
                Gunakan sandi bawaan sistem: <code className="text-yellow-500 font-mono font-bold">operator123</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 px-2 font-mono text-sm text-gray-100">
      {/* Role Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#333] pb-3 gap-3">
        <div>
          <h1 className="text-2xl uppercase font-black text-white tracking-tight flex items-center space-x-2">
            <Timer className="w-5 h-5 text-red-500 animate-pulse" />
            <span>Sistem Kontrol Operator</span>
          </h1>
          <p className="text-gray-400 text-xs font-sans">Pusat kendali jalannya pertandingan, timer, perpindahan ronde, dan waktu sisa.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 mt-2 md:mt-0 font-bold font-mono self-start text-xs">
          {/* Tab Toggle */}
          <div className="flex bg-[#161616] p-1 rounded-lg border border-[#333]">
            <button
              onClick={() => setActiveTab('Tanding')}
              className={`px-4 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'Tanding' ? 'bg-[#8B0000] text-white border border-red-900/40 shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Kontrol Tanding Filter
            </button>
            <button
              onClick={() => setActiveTab('Seni')}
              className={`px-4 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'Seni' ? 'bg-[#D2691e] text-white border border-yellow-900/40 shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Kontrol Seni TGRS
            </button>
          </div>

          <button
            onClick={handleOpLogout}
            className="px-4 py-2 bg-[#222] text-gray-300 hover:bg-[#333] hover:text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 border border-[#333] transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-amber-500" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </div>

      {/* Real-time Juri Connection Monitor */}
      <div className="bg-[#121212] p-4 rounded-xl border border-[#2a2a2a] space-y-3 font-mono shadow-md">
        <div className="flex items-center justify-between border-b border-[#222] pb-2">
          <h3 className="text-xs font-bold uppercase text-white flex items-center space-x-2">
            <Wifi className="w-4 h-4 text-green-400" />
            <span>Pantauan Real-time Koneksi Perangkat Juri</span>
          </h3>
          <span className="text-[9px] text-gray-500 font-sans">Siklus Deteksi Sinyal: 1.5 detik</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((id) => {
            const status = juriStatus[id.toString()] || { online: false, type: null };
            return (
              <div 
                key={id}
                className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                  status.online 
                    ? 'bg-green-950/10 border-green-500/20 shadow-[0_0_5px_rgba(34,197,94,0.05)]' 
                    : 'bg-red-950/5 border-red-950/20'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className="relative">
                    <span className="relative flex h-3 w-3">
                      {status.online && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${status.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-white block uppercase leading-none">JURI {id}</span>
                    <span className="text-[10px] block mt-1">
                      {status.online ? (
                        <span className="text-green-400 font-sans font-bold flex items-center gap-1">
                          Online {status.type ? `• ${status.type}` : ''}
                        </span>
                      ) : (
                        <span className="text-red-400 font-sans">Offline</span>
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  {status.online ? (
                    <span className="text-[9px] px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-400 font-bold uppercase">
                      {status.type === 'Seni' ? '✨ Seni' : '🥊 Tanding'}
                    </span>
                  ) : (
                    <span className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 border border-red-550/20 text-red-450 uppercase font-bold">
                      Offline
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Speech Interaction Control Panel */}
      <div className="bg-[#121212] p-4 rounded-xl border border-[#2a2a2a] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-full ${isListening ? 'bg-red-950/40 border border-red-500/50 animate-pulse text-red-500' : 'bg-gray-900 border border-gray-800 text-gray-500'}`}>
            {isListening ? <Mic className="w-5 h-5 animate-bounce text-red-400" /> : <MicOff className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Asisten Perintah Suara Operator</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase ${isListening ? 'bg-red-800/80 text-white animate-pulse' : 'bg-[#222] text-gray-500'}`}>
                {isListening ? 'Mendengarkan' : 'Nonaktif'}
              </span>
            </h4>
            <p className="text-gray-400 text-xs font-sans mt-0.5">
              Kontrol jalannya durasi pertandingan & buzzer secara hands-free menggunakan Web Speech API.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Action button */}
          <button
            onClick={() => {
              const nextState = !isListening;
              if (nextState) {
                setSpeechError('');
              }
              setIsListening(nextState);
              playClick();
            }}
            className={`w-full md:w-auto px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 border ${
              isListening
                ? 'bg-red-800 hover:bg-red-750 text-white border-red-900/60 shadow-[0_0_10px_rgba(239,68,68,0.25)]'
                : 'bg-[#222] hover:bg-[#2e2e2e] text-gray-300 border-[#3d3d3d]'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Matikan Suara</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>Aktifkan Suara</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Persistent friendly Speech Permission/Activation error box */}
      {speechError && (
        <div className="bg-[#1a0f0f] p-4 rounded-xl border border-red-950/65 text-xs text-red-200 font-mono space-y-2 animate-fade-in shadow-md">
          <div className="flex items-center space-x-2 text-red-400 font-bold uppercase tracking-wider text-[11px]">
            <span>⚠️ KENDALA AKSES SUARA (SPEECH RECOGNITION ERROR)</span>
          </div>
          <p className="font-sans text-gray-300">
            Penjelasan: <strong className="text-red-300">{speechError}</strong>
          </p>
          <div className="space-y-1 bg-[#0c0505] p-3 rounded border border-red-950/40 text-[11px] font-sans text-gray-400">
            <span className="font-mono font-bold text-gray-300 uppercase block mb-1 text-[10px] tracking-wider text-amber-500">LANGKAH PENANGANAN MANDIRI:</span>
            <div>1. <strong className="text-gray-300">Keluar dari iFrame (Buka di Tab Baru)</strong>: Browser sering memblokir mikrofon di dalam iFrame pratinjau. Klik tombol <span className="font-mono text-gray-250 bg-[#1e1e1e] px-1 py-0.5 rounded border border-[#333]">Buka di Tab Baru (Open in New Tab)</span> di sebelah kanan atas layar.</div>
            <div className="mt-1">2. <strong className="text-gray-300">Izinkan di Browser</strong>: Klik ikon Gembok / Setelan Situs di samping kolom alamat URL browser Anda, ubah status izin <span className="text-red-400">Mikrofon</span> menjadi <strong className="text-[#39FF14]">Izinkan (Allow)</strong>.</div>
            <div className="mt-1">3. <strong className="text-gray-300">Coba Ulang</strong>: Setelah izin diberikan atau aplikasi dibuka di tab baru, klik kembali tombol <span className="text-white hover:underline bg-[#222] px-1 rounded">Aktifkan Suara</span> di atas.</div>
          </div>
        </div>
      )}

      {/* Commands Guidelines & Feedback */}
      {isListening && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0a0a0a] p-4 rounded-xl border border-[#222] text-[11px] font-mono leading-relaxed">
          <div className="space-y-1.5">
            <span className="text-gray-500 font-bold uppercase tracking-wider block text-[10px]">DAFTAR PERINTAH SUARA:</span>
            <div className="space-y-1 text-gray-300">
              <div>🔊 <code className="text-amber-400 font-black">"mulai"</code> / <code className="text-amber-400 font-black">"start"</code> - Menjalankan timer</div>
              <div>⏸️ <code className="text-amber-400 font-black">"berhenti"</code> / <code className="text-amber-400 font-black">"stop"</code> - Menghentikan timer</div>
              <div>🔄 <code className="text-amber-400 font-black">"reset"</code> / <code className="text-amber-400 font-black">"ulang"</code> - Mengatur ulang timer ronde</div>
              <div>⚡ <code className="text-red-400 font-black">"buzzer"</code> / <code className="text-red-400 font-black">"bel"</code> - Membunyikan buzzer digital</div>
            </div>
          </div>
          
          <div className="flex flex-col justify-between p-3 bg-[#111] rounded-lg border border-[#2d2d2d]">
            <div>
              <span className="text-gray-500 font-bold uppercase tracking-wider block text-[10px] mb-1">TRANSKRIP SUARA TERAKHIR:</span>
              <p className={`font-mono text-xs uppercase min-h-[1.5rem] flex items-center ${lastCommand ? 'text-green-400 font-bold' : 'text-gray-500 italic'}`}>
                {lastCommand ? `"${lastCommand}"` : 'Menunggu ucapan...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Tanding' ? (
        /* ================= TANDING CONTROL PANEL ================= */
        <div className="space-y-6">
          {!activeTanding ? (
            <div className="bg-[#1a1414] text-red-400 p-6 rounded-xl border border-red-950/50 text-center">
              <p className="font-mono font-bold text-base uppercase">⚠️ Tidak Ada Partai Tanding Aktif!</p>
              <p className="text-xs font-sans text-gray-400 mt-1">Harap pilih partai tanding aktif di menu Backend Admin terlebih dahulu.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Match Details or Timer */}
              <div className="md:col-span-8 bg-[#161616] p-6 rounded-xl border border-[#333] shadow-md space-y-6">
                {/* Match Header info */}
                <div className="flex items-center justify-between border-b border-[#282828] pb-4">
                  <div>
                    <span className="font-mono text-xs text-red-500 font-bold uppercase tracking-wider">
                      Partai Aktif: {activeTanding.id}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {activeTanding.kelas} ({activeTanding.kategoriUsia})
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 font-mono uppercase mr-1">Status:</span>
                    <span className="text-xs font-mono font-bold text-green-400 animate-pulse uppercase bg-[#142a1d] border border-green-900/30 px-2 py-0.5 rounded-sm">
                      {activeTanding.status}
                    </span>
                  </div>
                </div>

                {/* Fighters Display */}
                <div className="grid grid-cols-2 gap-4 text-center font-mono">
                  <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30">
                    <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">SUDUT MERAH</span>
                    <p className="text-base font-bold text-white truncate mt-1">{activeTanding.pesilatMerah.nama}</p>
                    <p className="text-xs text-gray-400">{activeTanding.pesilatMerah.kontingen}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-yellow-950/20 border border-yellow-905/30">
                    <span className="text-[10px] uppercase font-bold text-yellow-500 tracking-wider">SUDUT KUNING</span>
                    <p className="text-base font-bold text-white truncate mt-1">{activeTanding.pesilatKuning.nama}</p>
                    <p className="text-xs text-gray-400">{activeTanding.pesilatKuning.kontingen}</p>
                  </div>
                </div>

                {/* TIMER DISPLAY CONTROL */}
                <MatchCountdownTimer matchType="Tanding" />
              </div>

              {/* Right Column: Match Actions */}
              <div className="md:col-span-4 bg-[#161616] p-6 rounded-xl border border-[#333] shadow-md flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="font-mono text-xs uppercase font-black text-white border-b border-[#282828] pb-2 mb-3">
                    Manajemen Pertandingan
                  </h3>

                  {/* Rounds Trigger */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider block">GANTI RONDE AKTIF</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['1', '2', 'Tambahan'] as Ronde[]).map((r) => {
                        const isCurrent = activeTanding.rondeAktif === r;
                        return (
                          <button
                            key={r}
                            onClick={() => changeRondeTanding(activeTanding.id, r)}
                            className={`py-2 rounded-lg text-[10px] uppercase font-bold tracking-tight transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-[#8B0000] border border-red-900/60 text-white shadow-xs'
                                : 'bg-[#222] border border-[#333] text-gray-300 hover:bg-[#2e2e2e] hover:text-white'
                            }`}
                          >
                            Ronde {r}
                          </button>
                        );
                      })}
                    </div>
                    <span className="block text-[9px] text-gray-500 font-sans mt-1 leading-snug">
                      * Mengubah ronde akan mengatur ulang durasi waktu ronde bawaan ({DURASI_RONDE[activeTanding.kategoriUsia] / 60} menit).
                    </span>
                  </div>
                </div>

                {/* Final Decision Gate */}
                {activeTanding.status !== 'Selesai' && (
                  <div className="p-4 bg-[#111] rounded-xl border border-[#2d2d2d] space-y-3">
                    <span className="text-[10px] font-mono font-bold text-yellow-500 block uppercase tracking-wider"> KETUK KELUARAN PARTAI</span>

                    <div className="space-y-2 text-xs">
                      <div className="space-y-1">
                        <label className="text-gray-400 text-[10px]">Pemenang</label>
                        <select
                          id="select-pemenang"
                          value={tandingWinner}
                          onChange={(e) => setTandingWinner(e.target.value as 'Merah' | 'Kuning')}
                          className="w-full text-xs p-1.5 rounded-md border border-[#333] bg-[#222] text-white"
                        >
                          <option value="Merah" className="bg-[#161616]">Merah ({activeTanding.pesilatMerah.nama})</option>
                          <option value="Kuning" className="bg-[#161616]">Kuning ({activeTanding.pesilatKuning.nama})</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-gray-400 text-[10px]">Alasan Kemenangan</label>
                        <select
                          id="select-alasan"
                          value={tandingAlasan}
                          onChange={(e) => setTandingAlasan(e.target.value)}
                          className="w-full text-xs p-1.5 rounded-md border border-[#333] bg-[#222] text-white"
                        >
                          <option value="Kemenangan Angka" className="bg-[#161616]">Kemenangan Angka</option>
                          <option value="Kemenangan Teknik" className="bg-[#161616]">Kemenangan Teknik</option>
                          <option value="Kemenangan Mutlak" className="bg-[#161616]">Kemenangan Mutlak</option>
                          <option value="Kemenangan WMP (Wasit Menghentikan Pertandingan)" className="bg-[#161616]">Kemenangan WMP</option>
                          <option value="Kemenangan Diskualifikasi" className="bg-[#161616]">Kemenangan Diskualifikasi</option>
                        </select>
                      </div>

                      <button
                        onClick={handleFinishTanding}
                        className="w-full mt-1 py-2 bg-[#8B0000] hover:bg-red-800 text-white font-bold rounded-lg text-xs font-mono uppercase tracking-wider border border-red-900/60 cursor-pointer"
                      >
                        Sahkan Pemenang & Selesai
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================= SENI CONTROL PANEL ================= */
        <div className="space-y-6">
          {!activeSeni ? (
            <div className="bg-[#1a1614] text-amber-500 p-6 rounded-xl border border-yellow-950/50 text-center">
              <p className="font-mono font-bold text-base uppercase">⚠️ Tidak Ada Partai Seni Aktif!</p>
              <p className="text-xs font-sans text-gray-400 mt-1">Harap pilih partai seni aktif di menu Backend Admin terlebih dahulu.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Inside details */}
              <div className="md:col-span-8 bg-[#161616] p-6 rounded-xl border border-[#333] shadow-md space-y-6">
                <div className="flex items-center justify-between border-b border-[#282828] pb-4">
                  <div>
                    <span className="font-mono text-xs text-amber-500 font-bold uppercase tracking-wider">
                      Partai Seni Aktif: {activeSeni.id}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      Seni {activeSeni.kategoriSeni}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 font-mono uppercase mr-1">Status:</span>
                    <span className="text-xs font-mono font-bold text-amber-500 animate-pulse uppercase bg-[#282218] border border-amber-900/30 px-2 py-0.5 rounded-sm">
                      {activeSeni.status}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/30 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                    NAMA PESILAT / REGU SENI
                  </span>
                  <p className="text-base font-bold text-white mt-1">{activeSeni.pesilat.nama}</p>
                  <p className="text-xs text-gray-400">{activeSeni.pesilat.kontingen}</p>
                </div>

                {/* STOPWATCH TIMER FOR SENI */}
                <MatchCountdownTimer matchType="Seni" />
              </div>

              {/* Right Column: Finish seni */}
              <div className="md:col-span-4 bg-[#161616] p-6 rounded-xl border border-[#333] shadow-md flex flex-col justify-between">
                <div>
                  <h3 className="font-mono text-xs uppercase font-black text-white border-b border-[#282828] pb-2 mb-3">
                    Borang Pertandingan Seni
                  </h3>
                  <div className="text-xs space-y-2 text-gray-400 font-sans">
                    <p>Sistem ini mencatatkan perolehan skor dari Juri 1, Juri 2, dan Juri 3.</p>
                    <p>Operator menutup pertandingan seni setelah seluruh juri menyerahkan borang rekap secara manual maupun tersinkronisasi.</p>
                  </div>
                </div>

                {activeSeni.status !== 'Selesai' && (
                  <div className="p-4 bg-[#111] rounded-xl border border-amber-900/40 space-y-2 mt-4">
                    <span className="text-xs font-mono font-bold text-amber-500 block">Keluaran Partai Seni</span>
                    <button
                      onClick={handleFinishSeni}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs font-mono uppercase tracking-wider border border-amber-700/50 cursor-pointer"
                    >
                      Tutup & Sahkan Nilai Seni
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
