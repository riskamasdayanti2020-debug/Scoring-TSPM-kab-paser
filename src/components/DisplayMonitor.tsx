import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useAppState } from '../context/AppContext';
import { Shield, Award, MapPin, Tv, Compass, Coins, Play, Pause, BarChart3, TrendingUp, Swords, Activity, Volume2, Maximize2, Minimize2, Palette, ShieldAlert, Zap, AlertOctagon } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { playBuzzer, playWarningBeep, playClick } from '../utils/audio';

export const DisplayMonitor: React.FC = () => {
  const {
    matchesTanding,
    matchesSeni,
    activeTandingId,
    activeSeniId,
    displayType,
    updateDisplayType,
  } = useAppState();

  const setDisplayType = (type: 'TV' | 'Tanding' | 'Seni') => {
    updateDisplayType(type);
  };
  const [cornerColorTheme, setCornerColorTheme] = useState<'MerahKuning' | 'MerahBiru'>('MerahKuning');
  const [tandingSubView, setTandingSubView] = useState<'ronde' | 'progres' | 'teknik' | 'juri'>('ronde');
  const [seniSubView, setSeniSubView] = useState<'borang' | 'analisis'>('borang');
  const [isTvFullscreen, setIsTvFullscreen] = useState(false);
  const [isCustomFullscreen, setIsCustomFullscreen] = useState(false);
  const [selectedTvMatchId, setSelectedTvMatchId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCustomFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeTanding = matchesTanding.find((m) => m.id === activeTandingId);
  const activeSeni = matchesSeni.find((m) => m.id === activeSeniId);
  const isTunggalRegu = !!(activeSeni && (activeSeni.kategoriSeni === 'Tunggal' || activeSeni.kategoriSeni === 'Regu'));

  const isTandingLast10Seconds = !!(activeTanding && activeTanding.waktuSisa <= 10 && activeTanding.waktuSisa > 0 && activeTanding.timerBerjalan);
  const isSeniLast10Seconds = !!(activeSeni && activeSeni.waktuBerjalan >= 170 && activeSeni.waktuBerjalan <= 180 && activeSeni.timerBerjalan);

  // Automated Audio buzzer synchronization triggers for spectators listening
  const prevTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeTanding) {
      if (prevTimeRef.current !== null) {
        if (prevTimeRef.current > 0 && activeTanding.waktuSisa === 0) {
          playBuzzer();
        } else if (prevTimeRef.current !== 10 && activeTanding.waktuSisa === 10) {
          playWarningBeep();
        }
      }
      prevTimeRef.current = activeTanding.waktuSisa;
    } else {
      prevTimeRef.current = null;
    }
  }, [activeTanding?.waktuSisa, activeTanding?.id]);

  // Format mm:ss clock
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Score auditors for Tanding
  const getJuriPoints = (juriId: number, sudut: 'Merah' | 'Kuning') => {
    if (!activeTanding) return 0;
    const scores = activeTanding.skorJuri[juriId];
    if (!scores) return 0;
    const list = sudut === 'Merah' ? scores.poinMerah : scores.poinKuning;
    return list.reduce((sum, pt) => sum + pt.poin, 0);
  };

  const getPenalties = (sudut: 'Merah' | 'Kuning') => {
    if (!activeTanding) return 0;
    const list = sudut === 'Merah' ? activeTanding.penaltiMerah : activeTanding.penaltiKuning;
    return list.reduce((sum, p) => sum + p.poin, 0);
  };

  const getFinalJudgeScore = (juriId: number, sudut: 'Merah' | 'Kuning') => {
    const score = getJuriPoints(juriId, sudut) + getPenalties(sudut);
    return Math.max(0, score);
  };

  // Consensus score = average of all judges
  const getConsensusScore = (sudut: 'Merah' | 'Kuning') => {
    if (!activeTanding) return 0;
    const total = [1, 2, 3, 4].reduce((sum, id) => sum + getFinalJudgeScore(id, sudut), 0);
    return parseFloat((total / 4).toFixed(1));
  };

  // Automatic automatic validation/outlier detection system for display monitor
  const getOutliersForDisplay = () => {
    if (!activeTanding) return [];
    
    const list: Array<{
      sudut: 'Merah' | 'Kuning';
      juriId: number;
      skor: number;
      rataRata: number;
      selisih: number;
    }> = [];

    const checkCorner = (sudut: 'Merah' | 'Kuning') => {
      const scores = [1, 2, 3, 4].map(id => ({
        id,
        val: getFinalJudgeScore(id, sudut)
      }));

      const avg = scores.reduce((sum, s) => sum + s.val, 0) / 4;

      scores.forEach(s => {
        const diff = Math.abs(s.val - avg);
        if (diff >= 4) { // threshold of 4 points
          list.push({
            sudut,
            juriId: s.id,
            skor: s.val,
            rataRata: parseFloat(avg.toFixed(1)),
            selisih: parseFloat(diff.toFixed(1))
          });
        }
      });
    };

    checkCorner('Merah');
    checkCorner('Kuning');
    return list;
  };

  // ================= STATISTICS COMPLILING FOR TANDING =================

  // Points calculation helper per round
  const getJuriPointsForRound = (juriId: number, sudut: 'Merah' | 'Kuning', ronde: '1' | '2' | 'Tambahan') => {
    if (!activeTanding) return 0;
    const scores = activeTanding.skorJuri[juriId];
    if (!scores) return 0;
    const list = sudut === 'Merah' ? scores.poinMerah : scores.poinKuning;
    return list.filter(pt => pt.ronde === ronde).reduce((sum, pt) => sum + pt.poin, 0);
  };

  const getPenaltiesForRound = (sudut: 'Merah' | 'Kuning', ronde: '1' | '2' | 'Tambahan') => {
    if (!activeTanding) return 0;
    const list = sudut === 'Merah' ? activeTanding.penaltiMerah : activeTanding.penaltiKuning;
    return list.filter(p => p.ronde === ronde).reduce((sum, p) => sum + p.poin, 0);
  };

  const getFinalJudgeScoreForRound = (juriId: number, sudut: 'Merah' | 'Kuning', ronde: '1' | '2' | 'Tambahan') => {
    return getJuriPointsForRound(juriId, sudut, ronde) + getPenaltiesForRound(sudut, ronde);
  };

  const getConsensusScoreForRound = (ronde: '1' | '2' | 'Tambahan', sudut: 'Merah' | 'Kuning') => {
    if (!activeTanding) return 0;
    const total = [1, 2, 3, 4].reduce((sum, id) => sum + getFinalJudgeScoreForRound(id, sudut, ronde), 0);
    return parseFloat((total / 4).toFixed(1));
  };

  const getCumulativeConsensusUpToRound = (targetRonde: '1' | '2' | 'Tambahan', sudut: 'Merah' | 'Kuning') => {
    let total = 0;
    const list: ('1' | '2' | 'Tambahan')[] = ['1', '2', 'Tambahan'];
    for (const r of list) {
      total += getConsensusScoreForRound(r, sudut);
      if (r === targetRonde) break;
    }
    return parseFloat(total.toFixed(1));
  };

  const getAttackStats = (sudut: 'Merah' | 'Kuning') => {
    const stats = {
      'Katak (Sapuan)': 0,
      'Ikan Terbang (Tendangan)': 0,
      'Terkaman (Jatuhan)': 0,
      'Mawar Lepas': 0
    };
    if (!activeTanding) return stats;
    
    [1, 2, 3, 4].forEach(id => {
      const scores = activeTanding.skorJuri[id];
      if (!scores) return;
      const list = sudut === 'Merah' ? scores.poinMerah : scores.poinKuning;
      list.forEach(pt => {
        if (pt.tipe === 'Katak') stats['Katak (Sapuan)'] += 1;
        else if (pt.tipe === 'Ikan Terbang') stats['Ikan Terbang (Tendangan)'] += 1;
        else if (pt.tipe === 'Terkaman') stats['Terkaman (Jatuhan)'] += 1;
        else if (pt.tipe === 'Mawar Lepas Terkaman') stats['Mawar Lepas'] += 1;
      });
    });

    const dewanPenaltiesList = sudut === 'Merah' ? activeTanding.penaltiMerah : activeTanding.penaltiKuning;
    dewanPenaltiesList.forEach(p => {
      if (p.jenis === 'Mawar Lepas Terkaman') {
        stats['Mawar Lepas'] += 4;
      }
    });
    
    // Average confirmed count across all 4 judges
    Object.keys(stats).forEach(key => {
      const k = key as keyof typeof stats;
      stats[k] = parseFloat((stats[k] / 4).toFixed(1));
    });
    return stats;
  };

  // Compile datasets for Recharts
  const chartRondeData = [
    { name: 'Ronde 1', 'Sudut Merah': getConsensusScoreForRound('1', 'Merah'), 'Sudut Kuning': getConsensusScoreForRound('1', 'Kuning') },
    { name: 'Ronde 2', 'Sudut Merah': getConsensusScoreForRound('2', 'Merah'), 'Sudut Kuning': getConsensusScoreForRound('2', 'Kuning') },
    { name: 'Ronde Tambahan', 'Sudut Merah': getConsensusScoreForRound('Tambahan', 'Merah'), 'Sudut Kuning': getConsensusScoreForRound('Tambahan', 'Kuning') }
  ];

  const chartProgressData = [
    { name: 'Inisiasi', 'Sudut Merah': 0, 'Sudut Kuning': 0 },
    { name: 'Ronde 1', 'Sudut Merah': getCumulativeConsensusUpToRound('1', 'Merah'), 'Sudut Kuning': getCumulativeConsensusUpToRound('1', 'Kuning') },
    { name: 'Ronde 2', 'Sudut Merah': getCumulativeConsensusUpToRound('2', 'Merah'), 'Sudut Kuning': getCumulativeConsensusUpToRound('2', 'Kuning') },
    { name: 'Ronde Tambahan', 'Sudut Merah': getCumulativeConsensusUpToRound('Tambahan', 'Merah'), 'Sudut Kuning': getCumulativeConsensusUpToRound('Tambahan', 'Kuning') }
  ];

  const attackRed = getAttackStats('Merah');
  const attackYellow = getAttackStats('Kuning');
  const chartTeknikData = [
    { name: 'Katak (Sapuan)', 'Sudut Merah': attackRed['Katak (Sapuan)'], 'Sudut Kuning': attackYellow['Katak (Sapuan)'] },
    { name: 'Ikan Terbang (Tendang)', 'Sudut Merah': attackRed['Ikan Terbang (Tendangan)'], 'Sudut Kuning': attackYellow['Ikan Terbang (Tendangan)'] },
    { name: 'Terkaman (Jatuh)', 'Sudut Merah': attackRed['Terkaman (Jatuhan)'], 'Sudut Kuning': attackYellow['Terkaman (Jatuhan)'] },
    { name: 'Mawar Lepas (Sabet)', 'Sudut Merah': attackRed['Mawar Lepas'], 'Sudut Kuning': attackYellow['Mawar Lepas'] }
  ];

  // ================= STATISTICS COMPILING FOR SENI =================

  const getSeniChartData = () => {
    return [1, 2, 3, 4].map(id => {
      const score = activeSeni?.skorJuri[id];
      return {
        name: `Juri ${id}`,
        'Kebenaran Jurus': score ? score.skorJurus : 0,
        'Kemantapan': score ? score.skorKemantapan : 0,
        'Potongan Pinalti': score ? score.penguranganHukuman : 0,
        'Total Skor': score ? score.totalSkor : 0,
      };
    });
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#121212] border border-[#333] p-3 rounded-lg shadow-xl text-[11px] font-mono leading-relaxed">
          <p className="font-bold text-[#FFD700] mb-2 uppercase tracking-wider border-b border-[#222] pb-1">{label}</p>
          <div className="space-y-1">
            {payload.map((pld: any) => (
              <div key={pld.name || pld.dataKey} className="flex items-center justify-between gap-6 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded" style={{ backgroundColor: pld.fill || pld.color || '#999' }} />
                  <span className="text-gray-400 capitalize">{pld.name}:</span>
                </div>
                <span className="font-black text-white font-mono">{parseFloat(pld.value).toFixed(1)} Poin</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Sound effects helper for on-page interactions
  const triggerTick = () => {
    try {
      playClick();
    } catch (e) {}
  };

  // Keyboard listener and browser native fullscreen synchronization handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsTvFullscreen(false);
      }
    };

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      if (!isCurrentlyFullscreen) {
        setIsTvFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const enterTvFullscreen = async () => {
    triggerTick();
    setIsTvFullscreen(true);
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request failed or print/iframe sandboxed:", err);
    }
  };

  const exitTvFullscreen = async () => {
    triggerTick();
    setIsTvFullscreen(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("Exit fullscreen failed:", err);
    }
  };

  // TV Scoreboard dynamic derivations
  const getTVJuriPoints = (match: any, juriId: number, sudut: 'Merah' | 'Kuning') => {
    const scores = match.skorJuri[juriId];
    if (!scores) return 0;
    const list = sudut === 'Merah' ? scores.poinMerah : scores.poinKuning;
    return list.reduce((sum: number, pt: any) => sum + pt.poin, 0);
  };

  const getTVPenalties = (match: any, sudut: 'Merah' | 'Kuning') => {
    const list = sudut === 'Merah' ? match.penaltiMerah : match.penaltiKuning;
    return list.reduce((sum: number, p: any) => sum + p.poin, 0);
  };

  const getTVFinalJudgeScore = (match: any, juriId: number, sudut: 'Merah' | 'Kuning') => {
    const score = getTVJuriPoints(match, juriId, sudut) + getTVPenalties(match, sudut);
    return Math.max(0, score);
  };

  const getTVConsensusScore = (match: any, sudut: 'Merah' | 'Kuning') => {
    const total = [1, 2, 3, 4].reduce((sum, id) => sum + getTVFinalJudgeScore(match, id, sudut), 0);
    return parseFloat((total / 4).toFixed(1));
  };

  // Custom visual compiler for TV scoreboard layout
  const renderScoreboardLayout = (match: any, fullscreen: boolean) => {
    const isBlueRed = false; // Forced to false so that Red and Yellow corner colors are used as requested
    const isLast10Seconds = match.waktuSisa <= 10 && match.waktuSisa > 0 && match.timerBerjalan;
    
    const scoreRed = getTVConsensusScore(match, 'Merah');
    const scoreRight = getTVConsensusScore(match, 'Kuning');
    
    const rightCornerTitle = 'SUDUT KUNING';
    const rightCornerEn = 'YELLOW CORNER';
    
    // Classes for Red (Top / First Row)
    const leftBgClass = 'bg-[#180a0a]/95 backdrop-blur-md border border-red-900/30 shadow-2xl';
    const leftBadgeClass = 'bg-red-950/70 text-red-450 border border-red-900/60 font-black tracking-wider';
    const leftScoreColorClass = 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.73)] font-black text-center';
    const leftBorderGlowClass = 'border-l-6 border-red-600 rounded-none overflow-hidden shadow-lg';

    // Classes for Yellow (Bottom / Second Row)
    const rightBgClass = 'bg-[#1d1910]/95 backdrop-blur-md border border-amber-900/30 shadow-2xl';
    const rightBadgeClass = 'bg-yellow-950/70 text-yellow-500 border border-yellow-905/30 font-black tracking-wider';
    const rightScoreColorClass = 'text-[#FFD700] drop-shadow-[0_0_20px_rgba(255,215,0,0.73)] font-black text-center';
    const rightBorderGlowClass = 'border-l-6 border-yellow-500 rounded-none overflow-hidden shadow-lg';

    // Get specific penalty records
    const getPenaltiesList = (sudut: 'Merah' | 'Kuning', jenis: 'Teguran' | 'Peringatan' | 'Pelanggaran' | 'Jatuhan') => {
      const list = sudut === 'Merah' ? match.penaltiMerah : match.penaltiKuning;
      return list.filter((p: any) => p.jenis === jenis);
    };

    return (
      <div className={`w-full text-white font-mono flex flex-col justify-between ${fullscreen ? 'h-full flex-1' : 'space-y-6'}`}>
        
        {/* Fullscreen HUD Top bar decoration */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center space-x-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${match.timerBerjalan ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${match.timerBerjalan ? 'bg-emerald-500' : 'bg-red-600'}`}></span>
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[12px] bg-gray-900 px-2 py-0.5 rounded border border-gray-800 text-gray-300 font-bold uppercase tracking-widest">
                  LIVE TV TRANSMISSION • ARENA GELANGGANG I
                </span>
                {fullscreen && (
                  <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-2 rounded border border-yellow-500/20 font-bold">
                    [FULLSCREEN MODE]
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 font-sans mt-0.5">Sistem scoring real-time terintegrasi dewan & bangku juri.</p>
            </div>
          </div>
          
          <div className="text-right">
            <span className="text-[10px] text-gray-400 block tracking-widest uppercase">KATEGORI TANDING</span>
            <span className="text-sm font-black text-amber-400 font-mono tracking-tight capitalize block">
              {match.kelas} - {match.kategoriUsia} (Partai t{match.id})
            </span>
          </div>
        </div>

        {/* Dynamic Vertical Scoreboard Stacking */}
        <div className="flex flex-col space-y-4 py-4 w-full max-w-4xl mx-auto">
          
          {/* TIMER & ROUND CONTROL HUD BANNER (Horizontal Flow) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#111111]/90 border border-gray-800 rounded-xl p-4 items-center shadow-md">
            {/* Ronde info */}
            <div className="text-center md:text-left space-y-1">
              <span className="text-[9px] text-amber-500 tracking-widest uppercase font-black">BABAK GELANGGANG</span>
              <div className="text-2xl font-black text-white font-mono">
                RONDE {match.rondeAktif}
              </div>
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-amber-400 font-bold uppercase tracking-wider inline-block">
                BABAK AKTIF
              </span>
            </div>

            {/* Countdown Clock Panel */}
            <div className={`rounded-xl p-3 text-center flex flex-col justify-center shadow-inner transition-all duration-300 border ${
              isLast10Seconds 
                ? 'animate-warning-flash' 
                : 'bg-gradient-to-b from-black to-[#0a0a0a] border-gray-850'
            }`}>
              <span className={`text-[9px] font-mono font-black tracking-widest uppercase ${
                isLast10Seconds ? 'text-red-500 animate-pulse' : 'text-gray-550'
              }`}>
                {isLast10Seconds ? '⚠️ 10 DETIK TERAKHIR ⚠️' : 'COUNTDOWN ROUND TIME'}
              </span>
              
              <div className={`text-4xl font-mono font-black tracking-widest py-1 transition-all duration-305 ${
                isLast10Seconds ? 'text-red-500 scale-105 drop-shadow-[0_0_15px_rgba(239,68,68,0.7)]' : match.timerBerjalan ? 'text-[#39FF14]' : 'text-amber-550'
              }`}>
                {formatTime(match.waktuSisa)}
              </div>

              <div className="flex items-center justify-center space-x-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${match.timerBerjalan ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-[8px] tracking-wider uppercase font-bold text-gray-400">
                  {match.timerBerjalan ? 'TIMER BERJALAN' : 'TIMER DIHENTIKAN'}
                </span>
              </div>
            </div>

            {/* Status Quick Preview Column */}
            <div className="text-center md:text-right space-y-1">
              <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black block">STATUS INSTAN</span>
              <div>
                {match.status === 'Sedang Tanding' ? (
                  <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 font-bold text-[10px] uppercase">PERTEMPURAN AKTIF</span>
                ) : match.status === 'Selesai' ? (
                  <span className="text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/20 font-bold text-[10px] uppercase">SELESAI / REKAP</span>
                ) : (
                  <span className="text-yellow-500 bg-yellow-500/10 px-2.5 py-0.5 rounded border border-yellow-500/20 font-bold text-[10px] uppercase">BELUM DIMULAI</span>
                )}
              </div>
              <p className="text-[8px] text-gray-600 font-sans">Dewan Juri Terkoneksi</p>
            </div>
          </div>

          {/* VERTICAL ROW 1: RED CORNER (SUDUT MERAH) */}
          <div className={`${leftBorderGlowClass}`}>
            <div className={`p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 ${leftBgClass}`}>
              
              {/* Athlete block */}
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-5 text-center md:text-left w-full md:w-auto">
                <div className={`px-4 py-2 rounded-none text-xs font-black uppercase tracking-widest shadow-md ${leftBadgeClass}`}>
                  🔴 SUDUT MERAH
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase line-clamp-1">
                    {match.pesilatMerah.nama}
                  </h2>
                  <span className="inline-block bg-red-950/30 text-red-300 px-3 py-0.5 rounded-none text-[10px] border border-red-950 px-2 text-center uppercase font-bold tracking-wider">
                    {match.pesilatMerah.kontingen || 'TAPAK SUCI'}
                  </span>
                </div>
              </div>

              {/* Penalty and Large score block */}
              <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-2 md:mt-0 border-t border-red-900/15 pt-3 md:border-t-0 md:pt-0">
                {/* Penalties recap list */}
                <div className="text-[10px] text-left md:text-right space-y-0.5 text-gray-400">
                  <div className="text-red-400 font-extrabold uppercase tracking-wide">PENALTI KIRI: -{getTVPenalties(match, 'Merah')}</div>
                  <div>Teguran: {getPenaltiesList('Merah', 'Teguran').length}x • Peringatan: {getPenaltiesList('Merah', 'Peringatan').length}x</div>
                </div>

                {/* Main Consensus Score Display box */}
                <div className="relative bg-black/45 border border-red-950/60 px-6 py-2.5 rounded-none text-center min-w-[120px] shadow-inner overflow-hidden">
                  <motion.div
                    key={`bg-score-flash-red-${scoreRed}`}
                    initial={{ opacity: 0.4, scale: 0.8 }}
                    animate={{ opacity: 0, scale: 1.5 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 bg-red-650/20 pointer-events-none rounded-none"
                  />
                  <span className="relative z-10 text-[8px] text-gray-550 block font-black tracking-wider uppercase mb-0.5">KONSENSUS</span>
                  <motion.div
                    key={scoreRed}
                    initial={{ scale: 0.7, opacity: 0.3, y: 10 }}
                    animate={{ scale: [1.35, 1], opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 450, damping: 11 }}
                    className={`relative z-10 text-4xl md:text-5xl font-mono font-black ${leftScoreColorClass}`}
                  >
                    {scoreRed}
                  </motion.div>
                </div>
              </div>

            </div>
          </div>

          {/* VERTICAL ROW 2: YELLOW CORNER (SUDUT KUNING) */}
          <div className={`${rightBorderGlowClass}`}>
            <div className={`p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 ${rightBgClass}`}>
              
              {/* Athlete block */}
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-5 text-center md:text-left w-full md:w-auto">
                <div className={`px-4 py-2 rounded-none text-xs font-black uppercase tracking-widest shadow-md ${rightBadgeClass}`}>
                  🟡 SUDUT KUNING
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase line-clamp-1">
                    {match.pesilatKuning.nama}
                  </h2>
                  <span className="inline-block bg-yellow-950/40 text-yellow-300 px-3 py-0.5 rounded-none text-[10px] border border-yellow-950/20 px-2 text-center uppercase font-bold tracking-wider">
                    {match.pesilatKuning.kontingen || 'TAPAK SUCI'}
                  </span>
                </div>
              </div>

              {/* Penalty and Large score block */}
              <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-2 md:mt-0 border-t border-yellow-905/15 pt-3 md:border-t-0 md:pt-0">
                {/* Penalties recap list */}
                <div className="text-[10px] text-left md:text-right space-y-0.5 text-gray-400">
                  <div className="text-yellow-400 font-extrabold uppercase tracking-wide">PENALTI KANAN: -{getTVPenalties(match, 'Kuning')}</div>
                  <div>Teguran: {getPenaltiesList('Kuning', 'Teguran').length}x • Peringatan: {getPenaltiesList('Kuning', 'Peringatan').length}x</div>
                </div>

                {/* Main Consensus Score Display box */}
                <div className="relative bg-black/45 border border-yellow-950/20 px-6 py-2.5 rounded-none text-center min-w-[120px] shadow-inner overflow-hidden">
                  <motion.div
                    key={`bg-score-flash-yellow-${scoreRight}`}
                    initial={{ opacity: 0.4, scale: 0.8 }}
                    animate={{ opacity: 0, scale: 1.5 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 bg-yellow-500/20 pointer-events-none rounded-none"
                  />
                  <span className="relative z-10 text-[8px] text-gray-550 block font-black tracking-wider uppercase mb-0.5">KONSENSUS</span>
                  <motion.div
                    key={scoreRight}
                    initial={{ scale: 0.7, opacity: 0.3, y: 10 }}
                    animate={{ scale: [1.35, 1], opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 450, damping: 11 }}
                    className={`relative z-10 text-4xl md:text-5xl font-mono font-black ${rightScoreColorClass}`}
                  >
                    {scoreRight}
                  </motion.div>
                </div>
              </div>

            </div>
          </div>

          {/* INDIVIDUAL JURY PANEL BLOCK (Consolidated footer section) */}
          <div className="bg-[#111111]/90 border border-gray-800 rounded-xl p-4 shadow-md text-xs">
            <span className="text-[9px] text-gray-500 font-black tracking-widest block uppercase mb-2.5 text-center">INPUT DETAIL SKOR PER WASIT JURI BANGLAI</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Judges Points Red */}
              <div className="bg-black/30 border border-red-950/50 p-3 rounded-lg space-y-2">
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">WASIT JURI - SUDUT MERAH</span>
                <div className="grid grid-cols-4 gap-2 text-center border-t border-red-950/20 pt-2">
                  {[1, 2, 3, 4].map((juriId) => {
                    const finalJuriRed = getTVFinalJudgeScore(match, juriId, 'Merah');
                    return (
                      <div key={juriId} className="bg-red-950/10 border border-red-950/30 p-1.5 rounded overflow-hidden">
                        <span className="text-[8px] text-gray-550 block font-sans">JURI {juriId}</span>
                        <motion.span
                          key={`${juriId}-${finalJuriRed}`}
                          initial={{ scale: 0.7, opacity: 0.5 }}
                          animate={{ scale: [1.3, 1], opacity: 1 }}
                          transition={{ duration: 0.25 }}
                          className="font-black text-red-400 block"
                        >
                          {finalJuriRed}
                        </motion.span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Judges Points Yellow */}
              <div className="bg-black/30 border border-yellow-950/20 p-3 rounded-lg space-y-2">
                <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider block">WASIT JURI - SUDUT KUNING</span>
                <div className="grid grid-cols-4 gap-2 text-center border-t border-yellow-950/10 pt-2">
                  {[1, 2, 3, 4].map((juriId) => {
                    const finalJuriRight = getTVFinalJudgeScore(match, juriId, 'Kuning');
                    return (
                      <div key={juriId} className="bg-amber-950/10 border border-amber-950/15 p-1.5 rounded overflow-hidden">
                        <span className="text-[8px] text-gray-550 block font-sans">JURI {juriId}</span>
                        <motion.span
                          key={`${juriId}-${finalJuriRight}`}
                          initial={{ scale: 0.7, opacity: 0.5 }}
                          animate={{ scale: [1.3, 1], opacity: 1 }}
                          transition={{ duration: 0.25 }}
                          className="font-black text-yellow-500 block"
                        >
                          {finalJuriRight}
                        </motion.span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footnote Log or Outcome Section */}
        {match.status === 'Selesai' && (
          <div className="bg-[#0b0c10] border border-amber-500/20 p-4 rounded-xl text-center space-y-1">
            <Award className="w-5 h-5 text-amber-500 mx-auto animate-bounce" />
            <span className="text-[9px] text-amber-500 font-bold uppercase tracking-widest block">PERTANDINGAN TELAH SELESAI</span>
            <p className="text-xs font-semibold text-white">
              PEMENANG DISEPAKATI: <strong className="text-yellow-400 underline">{match.pemenang === 'Merah' ? match.pesilatMerah.nama : match.pesilatKuning.nama}</strong> ({match.pemenang === 'Merah' ? 'SUDUT MERAH' : rightCornerTitle})
            </p>
            <p className="text-[10px] text-gray-500 italic">Format: {match.alasanPemenang || 'Skor Poin Mutlak dewan juri'}</p>
          </div>
        )}
      </div>
    );
  };

  // Outer render handler for TV tab view
  const renderTVBroadcastScoreboard = () => {
    const matchToRender = matchesTanding.find((m) => m.id === (activeTandingId || selectedTvMatchId)) || activeTanding || matchesTanding[0];

    if (!matchToRender) {
      return (
        <div className="bg-[#121212] border border-[#222] p-16 rounded-xl text-center max-w-xl mx-auto space-y-5 shadow-2xl">
          <Tv className="w-16 h-16 text-yellow-500 mx-auto animate-pulse" />
          <h3 className="text-sm font-black font-mono tracking-widest uppercase text-[#FFD700]">BELUM ADA PARTAI TANDING</h3>
          <p className="text-gray-400 text-xs font-sans leading-relaxed">
            Tidak terdeteksi adanya data pertandingan silat kategori tanding aktif. Silakan isi pendaftaran atlet tanding terlebih dahulu untuk mengaktifkan dashboard display TV ini.
          </p>
        </div>
      );
    }

    const isDemo = !activeTanding && matchesTanding.length > 0;

    return (
      <div className="space-y-6">
        
        {/* TV Header Control Bar */}
        <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
          
          {/* Match selector dropdown */}
          <div className="flex flex-col md:flex-row items-center gap-3">
            <span className="font-bold text-[#FFD700] uppercase tracking-wider text-[10px] whitespace-nowrap">
              Partai TV Aktif:
            </span>
            <div className="relative">
              <select
                value={matchToRender.id}
                onChange={(e) => {
                  triggerTick();
                  setSelectedTvMatchId(e.target.value);
                }}
                className="bg-black border border-gray-800 text-gray-100 rounded px-2.5 py-1.5 outline-none focus:border-yellow-500 cursor-pointer font-bold uppercase text-[11px]"
              >
                {matchesTanding.map((m) => (
                  <option key={m.id} value={m.id}>
                    Partai {m.id} ({m.pesilatMerah.nama} vs {m.pesilatKuning.nama}) {m.id === activeTandingId ? '• [LIVE]' : ''}
                  </option>
                ))}
              </select>
            </div>
            {isDemo && (
              <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold px-2 py-0.5 rounded uppercase">
                ⚙️ Mode Pratinjau (Demo)
              </span>
            )}
          </div>

          {/* Theme selectors & controls */}
          <div className="flex flex-wrap items-center gap-4">
            
            {/* Fullscreen Button */}
            <button
              onClick={enterTvFullscreen}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-yellow-500 text-black font-extrabold rounded hover:bg-yellow-400 cursor-pointer transition-transform duration-100 active:scale-95 text-[10px]"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </button>

          </div>

        </div>

        {/* Normal Embbed Scoreboard display */}
        <div className="bg-[#0b0b0b] border-2 border-gray-900 rounded-xl p-6 shadow-2xl relative overflow-hidden">
          {renderScoreboardLayout(matchToRender, false)}
        </div>

        {/* Fullscreen Overlay Portal (renders when isTvFullscreen is true) */}
        {isTvFullscreen && (
          <div className="fixed inset-0 z-50 bg-black p-8 md:p-12 flex flex-col justify-between overflow-y-auto" id="tv-fullscreen-overlay">
            
            {/* Floating Top Control bar */}
            <div className="flex justify-between items-center pb-4 mb-2 border-b border-gray-950">
              <span className="text-[10px] text-gray-500 tracking-widest font-bold">TELEVISION BROADCAST FEED • TAPAK SUCI SCORING SYSTEM</span>
              
              <div className="flex items-center space-x-4">
                
                <button
                  onClick={exitTvFullscreen}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-red-950 text-red-500 border border-red-900/40 rounded hover:bg-red-900 hover:text-white transition-colors cursor-pointer text-[10px] font-black"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>EXIT FULLSCREEN (ESC)</span>
                </button>
              </div>
            </div>

            {/* Embedded core scoreboard inside fullscreen layout */}
            <div className="flex-1 flex flex-col justify-center max-w-7xl w-full mx-auto">
              {renderScoreboardLayout(matchToRender, true)}
            </div>

            <div className="text-center pt-6 text-[10px] text-gray-600 border-t border-gray-950 font-mono">
              YAYASAN PENCAK SILAT • DIGITECH LIVE FEED CASTING SYSTEM • PRESSED ESC TO EXIT
            </div>

          </div>
        )}

      </div>
    );
  };

  return (
    <div 
      className={isCustomFullscreen 
        ? "fixed inset-0 z-50 bg-[#070707] p-8 md:p-12 overflow-y-auto flex flex-col justify-start space-y-8 font-mono text-gray-105 animate-fade-in text-slate-100"
        : "max-w-6xl mx-auto space-y-6 py-4 px-2 font-mono text-gray-105 animate-fade-in text-slate-100"
      }
      id="display-monitor-canvas"
    >
      <style>{`
        @keyframes warning-flash {
          0%, 100% {
            background-color: #0d0101;
            border-color: #7f1d1d;
            box-shadow: 0 0 12px rgba(220, 38, 38, 0.15) inset, 0 0 8px rgba(220, 38, 38, 0.15);
          }
          50% {
            background-color: #3b0712;
            border-color: #dc2626;
            box-shadow: 0 0 24px rgba(220, 38, 38, 0.45) inset, 0 0 20px rgba(220, 38, 38, 0.4);
          }
        }
        .animate-warning-flash {
          animation: warning-flash 1s infinite alternate;
        }
      `}</style>

      {/* Selector & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#333] pb-3">
        <div>
          <h1 className="text-2xl font-mono uppercase font-black text-white tracking-tight flex items-center space-x-2 animate-pulse">
            <Tv className="w-5 h-5 text-red-500 animate-spin-slow" />
            <span>Display Monitor Arena</span>
          </h1>
          <p className="text-gray-400 text-xs font-sans mt-0.5">Layar visualisasi pertunjukan utama di lapangan pertandingan.</p>
        </div>

        {/* Display discipline toggle */}
        <div className="flex bg-[#161616] p-1 rounded-lg border border-[#333] mt-3 md:mt-0 font-bold self-start font-mono shadow-inner items-center space-x-1">
          <button
            onClick={() => {
              triggerTick();
              setDisplayType('TV');
            }}
            className={`px-4 py-1.5 rounded text-xs transition-all cursor-pointer uppercase ${
              displayType === 'TV' ? 'bg-[#8B0000] text-white border border-red-900/40 shadow-xs font-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            📺 Layar TV Scoreboard
          </button>
          <button
            onClick={() => {
              triggerTick();
              setDisplayType('Tanding');
            }}
            className={`px-4 py-1.5 rounded text-xs transition-all cursor-pointer uppercase ${
              displayType === 'Tanding' ? 'bg-[#222] text-[#FFD700] border border-[#444] shadow-xs font-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Monitor Tanding
          </button>
          <button
            onClick={() => {
              triggerTick();
              setDisplayType('Seni');
            }}
            className={`px-4 py-1.5 rounded text-xs transition-all cursor-pointer uppercase ${
              displayType === 'Seni' ? 'bg-[#222] text-[#FFD700] border border-[#444] shadow-xs font-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Monitor Seni TGRS
          </button>
          <div className="w-[1px] h-4 bg-[#333] mx-1 hidden md:block" />
          <button
            onClick={() => {
              triggerTick();
              setIsCustomFullscreen(!isCustomFullscreen);
            }}
            className="px-3 py-1.5 rounded text-[10px] transition-all cursor-pointer uppercase text-[#FFD700] hover:text-yellow-400 hover:bg-[#222] font-black flex items-center space-x-1"
            title="Toggle Layar Fullscreen"
          >
            {isCustomFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Kecilkan</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Layar penuh</span>
              </>
            )}
          </button>
        </div>
      </div>

      {displayType === 'TV' ? (
        /* ================= TV BROADCAST SCOREBOARD VIEW ================= */
        renderTVBroadcastScoreboard()
      ) : displayType === 'Tanding' ? (
        /* ================= TANDING SCOREBOARD DISPLAY ================= */
        <div className="space-y-6">
          {!activeTanding ? (
            <div className="bg-[#161616] text-white p-12 rounded-xl border border-[#333] text-center space-y-4 shadow-2xl">
              <Compass className="w-12 h-12 text-[#FFD700] mx-auto animate-spin" />
              <h3 className="text-sm font-black font-mono tracking-widest uppercase text-amber-500">MENUNGGU INISIALISASI PERTANDINGAN</h3>
              <p className="text-gray-400 text-xs max-w-sm mx-auto font-sans leading-relaxed">
                Silakan tuju Panel Admin atau Operator terlebih dahulu guna meluncurkan partai tanding aktif di arena utama.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Match info */}
              <div className="bg-[#1e1717] border border-red-950/40 text-white rounded-xl p-4 flex justify-between items-center px-6">
                <div>
                  <span className="text-[10px] bg-red-950/40 border border-red-900/30 px-2.5 py-1 rounded font-mono font-bold tracking-widest uppercase text-red-400">
                    ARENA UTAMA • PARTAI t{activeTanding.id}
                  </span>
                  <h2 className="text-lg font-mono font-black text-[#FFD700] mt-2 capitalize">
                    {activeTanding.kelas} - {activeTanding.kategoriUsia}
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-gray-500 block uppercase font-mono tracking-widest">PERIODE RONDE</span>
                  <span className="text-sm font-bold font-mono text-white">Ronde {activeTanding.rondeAktif}</span>
                </div>
              </div>

              {/* Main Score & clock layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Red Athlete Field */}
                <div className="relative lg:col-span-4 bg-[#231515] text-white rounded-xl p-6 flex flex-col justify-between border border-red-900/40 shadow-lg text-center min-h-[220px] overflow-hidden">
                  <motion.div
                    key={`bg-flash-red-main-${getConsensusScore('Merah')}`}
                    initial={{ opacity: 0.35, scale: 0.8 }}
                    animate={{ opacity: 0, scale: 1.4 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 bg-red-655/15 pointer-events-none"
                  />
                  <div className="space-y-1.5 relative z-10">
                    <span className="text-[10px] font-mono bg-red-950/40 px-3 py-1 rounded text-red-300 border border-red-900/40 uppercase font-black tracking-wider inline-block">
                      SUDUT MERAH
                    </span>
                    <h3 className="text-xl font-bold truncate mt-2 font-mono text-red-200">{activeTanding.pesilatMerah.nama}</h3>
                    <p className="text-xs text-red-400/80 font-sans">{activeTanding.pesilatMerah.kontingen}</p>
                  </div>
                  <div className="mt-4 relative z-10">
                    <span className="text-[10px] font-mono text-gray-500 block uppercase tracking-wider">NILAI KONSENSUS</span>
                    <motion.div
                      key={getConsensusScore('Merah')}
                      initial={{ scale: 0.75, opacity: 0.4 }}
                      animate={{ scale: [1.35, 1], opacity: 1 }}
                      transition={{ type: "spring", stiffness: 450, damping: 11 }}
                      className={`font-mono font-black text-red-500 transition-all ${isCustomFullscreen ? 'text-9xl py-4' : 'text-6xl'}`}
                    >
                      {getConsensusScore('Merah')}
                    </motion.div>
                  </div>
                </div>

                {/* TIMER & MIDDLE PANEL */}
                <div className={`lg:col-span-4 rounded-xl p-6 text-center flex flex-col justify-between py-8 shadow-inner min-h-[220px] transition-all duration-300 border ${
                  isTandingLast10Seconds 
                    ? 'animate-warning-flash' 
                    : 'bg-[#0d0d0d] border-[#2d2d2d]'
                }`}>
                  <span className={`text-[9px] font-mono font-black tracking-widest uppercase transition-colors duration-300 ${
                    isTandingLast10Seconds ? 'text-red-450 animate-pulse' : 'text-gray-500'
                  }`}>
                    {isTandingLast10Seconds ? '⚠️ 10 DETIK TERAKHIR ⚠️' : 'COUNTDOWN TIME'}
                  </span>
                  
                  <div className={`font-mono font-black tracking-widest py-4 transition-all duration-300 ${isCustomFullscreen ? 'text-8xl' : 'text-5xl'} ${
                    isTandingLast10Seconds ? 'text-red-500 scale-110 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]' : 'text-[#39FF14]'
                  }`}>
                    {formatTime(activeTanding.waktuSisa)}
                  </div>

                  <div className={`space-y-2 border-t pt-4 transition-colors duration-300 ${isTandingLast10Seconds ? 'border-red-900/40' : 'border-[#222]'}`}>
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">REKAPITULASI PENALTI DEWAN</span>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-mono">
                      <div className="text-red-400">
                        HUKUMAN: <strong className="text-white">{getPenalties('Merah')}</strong>
                      </div>
                      <div className="text-yellow-500">
                        HUKUMAN: <strong className="text-white">{getPenalties('Kuning')}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Yellow Athlete Field */}
                <div className="relative lg:col-span-4 bg-[#211d15] text-white rounded-xl p-6 flex flex-col justify-between border border-yellow-905/35 shadow-lg text-center min-h-[220px] overflow-hidden">
                  <motion.div
                    key={`bg-flash-yellow-main-${getConsensusScore('Kuning')}`}
                    initial={{ opacity: 0.35, scale: 0.8 }}
                    animate={{ opacity: 0, scale: 1.4 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 bg-yellow-500/15 pointer-events-none"
                  />
                  <div className="space-y-1.5 relative z-10">
                    <span className="text-[10px] font-mono bg-yellow-950/30 px-3 py-1 rounded text-yellow-300 border border-yellow-905/20 uppercase font-black tracking-wider inline-block">
                      SUDUT KUNING
                    </span>
                    <h3 className="text-xl font-bold truncate mt-2 font-mono text-yellow-200">{activeTanding.pesilatKuning.nama}</h3>
                    <p className="text-xs text-yellow-500/80 font-sans">{activeTanding.pesilatKuning.kontingen}</p>
                  </div>
                  <div className="mt-4 relative z-10">
                    <span className="text-[10px] font-mono text-gray-500 block uppercase tracking-wider">NILAI KONSENSUS</span>
                    <motion.div
                      key={getConsensusScore('Kuning')}
                      initial={{ scale: 0.75, opacity: 0.4 }}
                      animate={{ scale: [1.35, 1], opacity: 1 }}
                      transition={{ type: "spring", stiffness: 450, damping: 11 }}
                      className={`font-mono font-black text-yellow-500 transition-all ${isCustomFullscreen ? 'text-9xl py-4' : 'text-6xl'}`}
                    >
                      {getConsensusScore('Kuning')}
                    </motion.div>
                  </div>
                </div>

              </div>

              {/* INTERACTIVE ANALYTICAL SYSTEM */}
              <div className="bg-[#161616] p-5 rounded-xl border border-[#333] space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#242424] pb-3 gap-3">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-[#FFD700]" />
                    <span className="text-[10px] font-mono text-gray-300 font-bold tracking-widest uppercase block">
                      NAVIGASI DATA MONITOR REAL-TIME
                    </span>
                  </div>
                  
                  <div className="flex bg-[#0f0f0f] border border-[#2d2d2d] p-0.5 rounded text-[10px] font-mono self-start overflow-x-auto max-w-full">
                    <button
                      onClick={() => setTandingSubView('ronde')}
                      className={`px-3 py-1.5 rounded transition-all cursor-pointer uppercase font-bold text-[9px] whitespace-nowrap ${
                        tandingSubView === 'ronde' ? 'bg-[#222] text-[#FFD700] border border-[#444]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      🏅 Skor Per Ronde
                    </button>
                    <button
                      onClick={() => setTandingSubView('progres')}
                      className={`px-3 py-1.5 rounded transition-all cursor-pointer uppercase font-bold text-[9px] whitespace-nowrap ${
                        tandingSubView === 'progres' ? 'bg-[#222] text-[#FFD700] border border-[#444]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      📈 Tren Progres Nilai
                    </button>
                    <button
                      onClick={() => setTandingSubView('teknik')}
                      className={`px-3 py-1.5 rounded transition-all cursor-pointer uppercase font-bold text-[9px] whitespace-nowrap ${
                        tandingSubView === 'teknik' ? 'bg-[#222] text-[#FFD700] border border-[#444]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      ⚔️ Analisis Serangan
                    </button>
                    <button
                      onClick={() => setTandingSubView('juri')}
                      className={`px-3 py-1.5 rounded transition-all cursor-pointer uppercase font-bold text-[9px] whitespace-nowrap ${
                        tandingSubView === 'juri' ? 'bg-[#222] text-[#FFD700] border border-[#444]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      ⚖️ Borang Wasit
                    </button>
                  </div>
                </div>

                {/* Sub-view rendering */}
                {tandingSubView === 'ronde' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <div>
                        <h3 className="text-xs font-bold text-gray-100 uppercase tracking-widest">GRAFIK PEROLAHAN POIN KONSENSUS PER RONDE</h3>
                        <p className="text-[10px] text-gray-500 font-sans">Komparasi poin rataan yang diakumulasikan khusus di setiap ronde berjalan.</p>
                      </div>
                      <div className="flex space-x-4 text-[10px] font-mono">
                        <span className="flex items-center"><span className="w-2.5 h-2.5 bg-red-600 rounded mr-1.5" />MERAH</span>
                        <span className="flex items-center"><span className="w-2.5 h-2.5 bg-yellow-500 rounded mr-1.5" />KUNING</span>
                      </div>
                    </div>

                    <div className="h-72 w-full bg-[#0d0d0d] p-3 rounded-lg border border-[#222]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartRondeData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="name" stroke="#888" fontSize={9} tickLine={false} />
                          <YAxis stroke="#888" fontSize={9} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                          <Bar dataKey="Sudut Merah" fill="#dc2626" radius={[4, 4, 0, 0]} name="Sudut Merah" />
                          <Bar dataKey="Sudut Kuning" fill="#eab308" radius={[4, 4, 0, 0]} name="Sudut Kuning" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {tandingSubView === 'progres' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <div>
                        <h3 className="text-xs font-bold text-gray-100 uppercase tracking-widest">TREN PROGRESI SKOR AKUMULATIF</h3>
                        <p className="text-[10px] text-gray-500 font-sans">Visualisasi grafik pertumbuhan skor total berjalan dari awal hingga penutup babak.</p>
                      </div>
                      <div className="flex space-x-4 text-[10px] font-mono">
                        <span className="flex items-center"><span className="w-2.5 h-2.5 bg-red-600 rounded mr-1.5" />MERAH</span>
                        <span className="flex items-center"><span className="w-2.5 h-2.5 bg-yellow-500 rounded mr-1.5" />KUNING</span>
                      </div>
                    </div>

                    <div className="h-72 w-full bg-[#0d0d0d] p-3 rounded-lg border border-[#222]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartProgressData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="name" stroke="#888" fontSize={9} tickLine={false} />
                          <YAxis stroke="#888" fontSize={9} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="Sudut Merah"
                            stroke="#dc2626"
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2, fill: '#0a0a0a' }}
                            activeDot={{ r: 6 }}
                            name="Sudut Merah"
                          />
                          <Line
                            type="monotone"
                            dataKey="Sudut Kuning"
                            stroke="#eab308"
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2, fill: '#0a0a0a' }}
                            activeDot={{ r: 6 }}
                            name="Sudut Kuning"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {tandingSubView === 'teknik' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <div>
                        <h3 className="text-xs font-bold text-gray-100 uppercase tracking-widest">DISTRIBUSI TEKNIK SERANGAN (RATAAN WASIT)</h3>
                        <p className="text-[10px] text-gray-500 font-sans">Kuantitas rata-rata teknik pukulan, tendangan, jatuhan, atau kuncian yang diakui dewan juri.</p>
                      </div>
                      <div className="flex space-x-4 text-[10px] font-mono">
                        <span className="flex items-center"><span className="w-2.5 h-2.5 bg-red-600 rounded mr-1.5" />MERAH</span>
                        <span className="flex items-center"><span className="w-2.5 h-2.5 bg-yellow-500 rounded mr-1.5" />KUNING</span>
                      </div>
                    </div>

                    <div className="h-72 w-full bg-[#0d0d0d] p-3 rounded-lg border border-[#222]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartTeknikData} layout="vertical" margin={{ top: 15, right: 15, left: 35, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis type="number" stroke="#888" fontSize={9} tickLine={false} />
                          <YAxis dataKey="name" type="category" stroke="#888" fontSize={8} tickLine={false} width={80} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                          <Bar dataKey="Sudut Merah" fill="#dc2626" radius={[0, 4, 4, 0]} name="Sudut Merah" />
                          <Bar dataKey="Sudut Kuning" fill="#eab308" radius={[0, 4, 4, 0]} name="Sudut Kuning" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {tandingSubView === 'juri' && (() => {
                  const outliers = getOutliersForDisplay();
                  return (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <h3 className="text-xs font-bold text-gray-100 uppercase tracking-widest">RINCIAN PEROLEHAN POIN SETIAP WASIT JURI</h3>
                          <p className="text-[10px] text-gray-500 font-sans">Data murni input papan penilaian elektronik dari bangku wasit juri 1, 2, 3, dan 4.</p>
                        </div>
                        {outliers.length > 0 && (
                          <div className="flex items-center space-x-1.5 px-3 py-1 bg-red-950/40 border border-red-900/30 rounded text-[9px] text-red-400 font-bold tracking-tight animate-pulse uppercase font-mono">
                            <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
                            <span>Peringatan: Selisih Poin Juri Mencolok (Outlier)</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((juriId) => {
                          const finalRed = getFinalJudgeScore(juriId, 'Merah');
                          const finalYellow = getFinalJudgeScore(juriId, 'Kuning');
                          const isRedOutlier = outliers.some(o => o.sudut === 'Merah' && o.juriId === juriId);
                          const isYellowOutlier = outliers.some(o => o.sudut === 'Kuning' && o.juriId === juriId);

                          const cardBorderClass = isRedOutlier
                            ? 'border-red-500 ring-1 ring-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                            : isYellowOutlier
                            ? 'border-yellow-500 ring-1 ring-yellow-500/80 shadow-[0_0_12px_rgba(234,179,8,0.22)]'
                            : 'border-[#2d2d2d]';

                          return (
                            <div key={juriId} className={`bg-[#0f0f0f] p-4 rounded-lg border space-y-3 transition-all duration-350 ${cardBorderClass}`}>
                              <div className="text-center font-mono font-bold text-gray-400 text-xs pb-1 border-b border-[#212121] uppercase tracking-widest flex justify-between items-center px-1">
                                <span>WASIT JURI {juriId}</span>
                                {(isRedOutlier || isYellowOutlier) && (
                                  <span className="text-[7px] text-red-400 font-black animate-pulse uppercase tracking-wider">OUTLIER</span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-center font-mono font-bold">
                                {/* Juri Red */}
                                <div className={`p-2.5 rounded border space-y-0.5 transition-all duration-350 ${
                                  isRedOutlier ? 'bg-red-950/20 border-red-500/50 text-red-500' : 'bg-red-950/10 border-red-900/20 text-red-400'
                                }`}>
                                  <span className="text-[8px] font-sans font-bold text-red-500 block">MERAH</span>
                                  <div className="text-xl font-black">{finalRed}</div>
                                </div>
                                {/* Juri Yellow */}
                                <div className={`p-2.5 rounded border space-y-0.5 transition-all duration-350 ${
                                  isYellowOutlier ? 'bg-yellow-950/20 border-yellow-500/50 text-yellow-500' : 'bg-yellow-950/10 border-yellow-905/25 text-yellow-500'
                                }`}>
                                  <span className="text-[8px] font-sans font-semibold text-yellow-400 block">KUNING</span>
                                  <div className="text-xl font-black">{finalYellow}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Concluded match outcome, if completed */}
              {activeTanding.status === 'Selesai' && (
                <div className="bg-[#0f111a] text-white rounded-xl p-6 text-center shadow-lg border border-blue-900/30 space-y-2">
                  <Award className="w-10 h-10 text-[#FFD700] mx-auto animate-bounce" />
                  <h3 className="text-sm font-mono uppercase font-black text-[#FFD700]">PERTANDINGAN BERAKHIR</h3>
                  <p className="text-sm font-sans font-medium text-gray-200">
                    Pemenang disahkan: <span className="font-mono font-bold text-white underline">{activeTanding.pemenang === 'Merah' ? activeTanding.pesilatMerah.nama : activeTanding.pesilatKuning.nama} ({activeTanding.pemenang})</span>
                  </p>
                  <p className="text-xs text-gray-400 font-sans">Alasan: {activeTanding.alasanPemenang}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ================= SENI SCOREBOARD DISPLAY ================= */
        <div className="space-y-6">
          {!activeSeni ? (
            <div className="bg-[#161616] text-white p-12 rounded-xl border border-[#333] text-center space-y-4 font-mono shadow-2xl">
              <Compass className="w-12 h-12 text-[#FFD700] mx-auto animate-spin" />
              <h3 className="text-sm font-black tracking-widest uppercase text-amber-500">MENUNGGU INISIALISASI PERTANDINGAN SENI TGRS</h3>
              <p className="text-gray-400 text-xs max-w-sm mx-auto font-sans leading-relaxed">
                Silakan tuju Panel Admin atau Operator terlebih dahulu guna meluncurkan partai seni aktif di arena utama.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Match info */}
              <div className="bg-[#211a12] border border-amber-950/45 text-white rounded-xl p-4 flex justify-between items-center px-6">
                <div>
                  <span className="text-[10px] bg-amber-950/40 border border-[#b45309]/30 px-2.5 py-1 rounded font-mono font-bold tracking-widest uppercase text-amber-500">
                    ARENA UTAMA SENI TGRS • PARTAI t{activeSeni.id}
                  </span>
                  <h2 className="text-lg font-mono font-black text-[#FFD700] mt-2">
                    Seni {activeSeni.kategoriSeni}
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-[#b45309] block uppercase font-mono tracking-widest">DISIPLIN TGRS</span>
                  <span className="text-sm font-bold font-mono text-white">Seni Kreatif</span>
                </div>
              </div>

              {/* Main Score & clock layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                
                {/* Athlete Profile & Score Box */}
                <div className="bg-[#161616] p-6 rounded-xl border border-[#333] flex flex-col justify-between py-8 space-y-6">
                  <div className="text-center space-y-2 font-mono">
                    <span className="text-[10px] bg-[#222] px-3 py-1 rounded text-amber-500 border border-amber-500/10 uppercase font-black tracking-wider inline-block">
                      PESILAT SENI AKTIF
                    </span>
                    <h3 className="text-2xl font-bold text-gray-100">{activeSeni.pesilat.nama}</h3>
                    <p className="text-xs text-gray-400 font-sans">{activeSeni.pesilat.kontingen}</p>
                  </div>

                  <div className="bg-[#0f0f0f] p-5 rounded-lg border border-amber-500/10 text-center space-y-1">
                    <span className="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-wider block text-[9px]">NILAI AKHIR REKAPITULASI JURI</span>
                    <div className={`font-mono font-black text-[#FFD700] transition-all ${isCustomFullscreen ? 'text-9xl py-4' : 'text-6xl'}`}>
                      {typeof activeSeni.totalSkorAkhir === 'number' ? activeSeni.totalSkorAkhir.toFixed(2) : '0.00'}
                    </div>
                    <span className="text-[9px] text-gray-500 font-sans">Rataan akumulasi total wasit juri yang menyerahkan borang.</span>
                  </div>
                </div>

                {/* Timer Clock */}
                <div className={`rounded-xl p-6 text-center flex flex-col justify-between py-8 shadow-inner transition-all duration-300 border ${
                  isSeniLast10Seconds 
                    ? 'animate-warning-flash' 
                    : 'bg-[#0d0d0d] border-[#2d2d2d]'
                }`}>
                  <span className={`text-[9px] font-mono font-black tracking-widest uppercase transition-colors duration-300 ${
                    isSeniLast10Seconds ? 'text-red-400 animate-pulse' : 'text-gray-500'
                  }`}>
                    {isSeniLast10Seconds ? '⚠️ 10 DETIK TERAKHIR PENAMPILAN ⚠️' : 'STOPWATCH WAKTU BERJALAN'}
                  </span>
                  
                  <div className={`font-mono font-black tracking-widest py-6 transition-all duration-300 ${isCustomFullscreen ? 'text-8xl' : 'text-6xl'} ${
                    isSeniLast10Seconds ? 'text-red-500 scale-110 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]' : 'text-amber-400'
                  }`}>
                    {formatTime(activeSeni.waktuBerjalan)}
                  </div>

                  <div className={`p-4 rounded text-[10px] max-w-xs mx-auto font-sans transition-colors duration-300 ${
                    isSeniLast10Seconds ? 'bg-red-950/20 border border-red-900/40 text-red-300' : 'bg-[#111] border border-[#222] text-gray-400'
                  }`}>
                    Seni tunggal / regu memiliki standar waktu penampilan resmi maksimal 3 menit (03:00).
                  </div>
                </div>

              </div>

              {/* INTERACTIVE SENI BREAKDOWN & JUDGING AUDITING */}
              <div className="bg-[#161616] p-5 rounded-xl border border-[#333] space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#282828] pb-3 gap-3">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-[#FFD700]" />
                    <span className="text-[10px] font-mono text-gray-300 font-bold tracking-widest uppercase block">
                      MONITOR NILAI & EVALUASI JURI TGRS
                    </span>
                  </div>
                  
                  <div className="flex bg-[#0f0f0f] border border-[#2d2d2d] p-0.5 rounded text-[10px] font-mono self-start">
                    <button
                      onClick={() => setSeniSubView('borang')}
                      className={`px-3 py-1.5 rounded transition-all cursor-pointer uppercase font-bold text-[9px] ${
                        seniSubView === 'borang' ? 'bg-[#222] text-[#FFD700] border border-[#444]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      📁 Borang Juri
                    </button>
                    <button
                      onClick={() => setSeniSubView('analisis')}
                      className={`px-3 py-1.5 rounded transition-all cursor-pointer uppercase font-bold text-[9px] ${
                        seniSubView === 'analisis' ? 'bg-[#222] text-[#FFD700] border border-[#444]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      📊 Analisis Komponen
                    </button>
                  </div>
                </div>

                {/* Borang subview rendering */}
                {seniSubView === 'borang' && (
                  <div className="space-y-4">
                    <span className="text-[10px] font-mono text-gray-500 block">BORANG PENILAIAN INDIVIDUAL MAWASIT JURI JALUR REAL-TIME</span>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {[1, 2, 3, 4].map((juriId) => {
                        const score = activeSeni.skorJuri[juriId];
                        return (
                          <div key={juriId} className="bg-[#0f0f0f] p-5 rounded-lg border border-[#2d2d2d] space-y-3">
                            <div className="text-center font-mono font-bold text-gray-400 text-[10px] pb-1 border-b border-[#222] uppercase tracking-wider">
                              WASIT JURI {juriId}
                            </div>

                            {score ? (
                              <div className="text-center space-y-2 font-mono">
                                <div className="text-3xl font-black text-white">
                                  {score.totalSkor.toFixed(2)}
                                </div>
                                {isTunggalRegu ? (
                                  <div className="grid grid-cols-3 gap-1 text-[8px] text-gray-400 leading-tight pt-1.5 border-t border-[#1a1a1a]">
                                    <div>
                                      <span className="block text-gray-500 font-bold">Kebenar (A):</span>
                                      <span className="text-gray-200 font-bold">{score.nilaiA !== undefined ? score.nilaiA.toFixed(2) : score.skorJurus.toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span className="block text-gray-500 font-bold">Mantap (B):</span>
                                      <span className="text-gray-200 font-bold">{score.nilaiB !== undefined ? score.nilaiB.toFixed(2) : score.skorKemantapan.toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span className="block text-red-500 font-bold">Hukuman:</span>
                                      <span className="text-red-400 font-bold">-{score.penguranganHukuman.toFixed(2)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1 border-t border-[#1a1a1a] pt-1.5 text-left text-[8px]">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Base / Dasar:</span>
                                      <span className="text-gray-300 font-bold">9.10</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Teknik:</span>
                                      <span className="text-amber-400 font-bold">+{score.nilaiTeknik !== undefined ? score.nilaiTeknik.toFixed(2) : score.skorJurus.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Ketegasan:</span>
                                      <span className="text-amber-400 font-bold">+{score.nilaiKetegasan !== undefined ? score.nilaiKetegasan.toFixed(2) : score.skorKemantapan.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Penjiwaan:</span>
                                      <span className="text-amber-400 font-bold">+{score.nilaiPenjiwaan !== undefined ? score.nilaiPenjiwaan.toFixed(2) : '0.25'}</span>
                                    </div>
                                    <div className="flex justify-between text-red-400">
                                      <span>Hukuman:</span>
                                      <span className="font-bold">-{score.penguranganHukuman.toFixed(2)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center p-3 text-xs text-gray-500 italic font-sans">
                                Menunggu borang...
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {seniSubView === 'analisis' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <div>
                        <h3 className="text-xs font-bold text-gray-100 uppercase tracking-widest">KORELASI KOMPONEN SKOR INDIVIDUAL</h3>
                        <p className="text-[10px] text-gray-500 font-sans">Grafik komparatif unsur penilaian (Kebenaran, Kemantapan, Sanksi) wasit juri 1, 2, 3, dan 4.</p>
                      </div>
                      <div className="flex space-x-4 text-[9px] font-mono">
                        <span className="flex items-center"><span className="w-2.5 h-2.5 bg-blue-500 rounded mr-1" />KEBENARAN</span>
                        <span className="flex items-center"><span className="w-2.5 h-2.5 bg-purple-500 rounded mr-1" />KEMANTAPAN</span>
                        <span className="flex items-center"><span className="w-2.5 h-2.5 bg-red-600 rounded mr-1" />SANKSI</span>
                      </div>
                    </div>

                    <div className="h-72 w-full bg-[#0d0d0d] p-3 rounded-lg border border-[#222]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getSeniChartData()} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="name" stroke="#888" fontSize={9} tickLine={false} />
                          <YAxis stroke="#888" fontSize={9} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                          <Bar dataKey="Kebenaran Jurus" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Kebenaran" />
                          <Bar dataKey="Kemantapan" fill="#a855f7" radius={[3, 3, 0, 0]} name="Kemantapan" />
                          <Bar dataKey="Potongan Pinalti" fill="#ef4444" radius={[3, 3, 0, 0]} name="Sanksi" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
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
