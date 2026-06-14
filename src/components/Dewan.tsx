import React, { useState, useEffect, useRef } from 'react';
import { useAppState } from '../context/AppContext';
import { 
  Shield, 
  ShieldAlert, 
  RotateCcw, 
  Award, 
  CheckCircle, 
  ChevronRight, 
  Scale, 
  AlertOctagon, 
  Volume2, 
  Printer, 
  FileDown, 
  Search, 
  Filter, 
  History,
  ListFilter,
  Calendar, 
  User, 
  Clock, 
  FileText,
  Maximize2,
  Minimize2,
  Download
} from 'lucide-react';
import { playBuzzer, playWarningBeep, playClick } from '../utils/audio';
import { Ronde, MatchTandingState, MatchSeniState } from '../types';
import { exportTandingPDF, exportSeniPDF } from '../utils/pdfExport';

export const Dewan: React.FC = () => {
  const {
    matchesTanding,
    matchesSeni,
    activeTandingId,
    activeSeniId,
    addDewanPenalti,
    undoDewanPenalti,
  } = useAppState();

  const activeTanding = matchesTanding.find((m) => m.id === activeTandingId);
  const activeSeni = matchesSeni.find((m) => m.id === activeSeniId);

  // State for Tanding Audit Log filters
  const [auditFilterJuri, setAuditFilterJuri] = useState<string>('Semua');
  const [auditFilterSudut, setAuditFilterSudut] = useState<string>('Semua');
  const [auditFilterTipe, setAuditFilterTipe] = useState<string>('Semua');

  // Archive and Tab management
  const [activeTab, setActiveTab] = useState<'live' | 'archive'>(activeTanding || activeSeni ? 'live' : 'archive');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'Semua' | 'Tanding' | 'Seni'>('Semua');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Selesai' | 'Aktif' | 'Belum Mulai'>('Semua');
  const [outlierThreshold, setOutlierThreshold] = useState<number>(4);
  const [printData, setPrintData] = useState<{ type: 'tanding_detail' | 'seni_detail'; id: string } | null>(null);
  
  // View mode for live tab: tanding (combat) or seni (artistic)
  const [liveViewMode, setLiveViewMode] = useState<'tanding' | 'seni'>('tanding');
  const [isCustomFullscreen, setIsCustomFullscreen] = useState(false);
  const [nilaiX, setNilaiX] = useState<number>(5); // default bonus value X = 5

  // Synchronize native browser fullscreen when state changes (optional but good fallback)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsCustomFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if ((activeTanding || activeSeni) && activeTab === 'archive' && searchQuery === '') {
      // Auto switch back to live if user clicked dewan when a game is active
      setActiveTab('live');
    }
  }, [activeTandingId, activeSeniId]);

  useEffect(() => {
    if (!activeTanding && activeSeni) {
      setLiveViewMode('seni');
    } else if (activeTanding && !activeSeni) {
      setLiveViewMode('tanding');
    }
  }, [activeTandingId, activeSeniId]);

  useEffect(() => {
    if (printData) {
      const timer = setTimeout(() => {
        window.print();
        setPrintData(null);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [printData]);

  // Automated Audio buzzer synchronization triggers for Dewan panel
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

  // Scoring helpers for exports & print
  const getTandingJuriPoints = (match: MatchTandingState, juriId: number, sudut: 'Merah' | 'Kuning') => {
    const scores = match.skorJuri[juriId];
    if (!scores) return 0;
    const list = sudut === 'Merah' ? scores.poinMerah : scores.poinKuning;
    return list.reduce((sum, pt) => sum + pt.poin, 0);
  };

  const getTandingPenalties = (match: MatchTandingState, sudut: 'Merah' | 'Kuning') => {
    const list = sudut === 'Merah' ? match.penaltiMerah : match.penaltiKuning;
    return list.reduce((sum, p) => sum + p.poin, 0);
  };

  const getTandingFinalJudgeScore = (match: MatchTandingState, juriId: number, sudut: 'Merah' | 'Kuning') => {
    const score = getTandingJuriPoints(match, juriId, sudut) + getTandingPenalties(match, sudut);
    return Math.max(0, score);
  };

  const getTandingConsensusScore = (match: MatchTandingState, sudut: 'Merah' | 'Kuning') => {
    const total = [1, 2, 3, 4].reduce((sum, id) => sum + getTandingFinalJudgeScore(match, id, sudut), 0);
    return parseFloat((total / 4).toFixed(1));
  };

  const getTandingJuriPointsForRound = (match: MatchTandingState, juriId: number, sudut: 'Merah' | 'Kuning', r: Ronde) => {
    const scores = match.skorJuri[juriId];
    if (!scores) return 0;
    const list = sudut === 'Merah' ? scores.poinMerah : scores.poinKuning;
    return list.filter(pt => pt.ronde === r).reduce((sum, pt) => sum + pt.poin, 0);
  };

  const getTandingPenaltiesForRound = (match: MatchTandingState, sudut: 'Merah' | 'Kuning', r: Ronde) => {
    const list = sudut === 'Merah' ? match.penaltiMerah : match.penaltiKuning;
    return list.filter(p => p.ronde === r).reduce((sum, p) => sum + p.poin, 0);
  };

  const getTandingFinalJudgeScoreForRound = (match: MatchTandingState, juriId: number, sudut: 'Merah' | 'Kuning', r: Ronde) => {
    return getTandingJuriPointsForRound(match, juriId, sudut, r) + getTandingPenaltiesForRound(match, sudut, r);
  };

  const getTandingConsensusScoreForRound = (match: MatchTandingState, r: Ronde, sudut: 'Merah' | 'Kuning') => {
    const total = [1, 2, 3, 4].reduce((sum, id) => sum + getTandingFinalJudgeScoreForRound(match, id, sudut, r), 0);
    return parseFloat((total / 4).toFixed(1));
  };

  // Live scoreboard helpers
  const getJuriPointsTotal = (juriId: number, sudut: 'Merah' | 'Kuning') => {
    if (!activeTanding) return 0;
    return getTandingJuriPoints(activeTanding, juriId, sudut);
  };

  const getPenaltiesTotal = (sudut: 'Merah' | 'Kuning') => {
    if (!activeTanding) return 0;
    return getTandingPenalties(activeTanding, sudut);
  };

  const getFinalScore = (juriId: number, sudut: 'Merah' | 'Kuning') => {
    if (!activeTanding) return 0;
    return getTandingFinalJudgeScore(activeTanding, juriId, sudut);
  };

  // Automatic automatic validation/outlier detection system
  const getOutliersForActiveTanding = () => {
    if (!activeTanding) return [];
    
    const list: Array<{
      sudut: 'Merah' | 'Kuning';
      juriId: number;
      skor: number;
      rataRata: number;
      selisih: number;
      alasan: string;
      tingkatKeparahan: 'Sedang' | 'Tinggi';
    }> = [];

    const checkCorner = (sudut: 'Merah' | 'Kuning') => {
      const scores = [1, 2, 3, 4].map(id => ({
        id,
        val: getFinalScore(id, sudut)
      }));

      const sum = scores.reduce((acc, s) => acc + s.val, 0);
      const avg = sum / 4;

      scores.forEach(s => {
        const diff = Math.abs(s.val - avg);
        if (diff >= outlierThreshold) {
          list.push({
            sudut,
            juriId: s.id,
            skor: s.val,
            rataRata: parseFloat(avg.toFixed(1)),
            selisih: parseFloat(diff.toFixed(1)),
            alasan: `Skor Juri ${s.id} (${s.val}) menyimpang ${parseFloat(diff.toFixed(1))} poin dari konsensus rata-rata (${parseFloat(avg.toFixed(1))}).`,
            tingkatKeparahan: diff >= outlierThreshold + 2 ? 'Tinggi' : 'Sedang'
          });
        }
      });
    };

    checkCorner('Merah');
    checkCorner('Kuning');

    return list;
  };

  // Automatic outlier detection system for Seni
  const getOutliersForSeni = () => {
    if (!activeSeni) return [];
    
    const list: Array<{
      juriId: number;
      skor: number;
      rataRata: number;
      selisih: number;
      alasan: string;
      tingkatKeparahan: 'Sedang' | 'Tinggi';
    }> = [];

    const scores = [1, 2, 3, 4].map(id => {
      const sc = activeSeni.skorJuri[id];
      return {
        id,
        val: sc ? sc.totalSkor : 0
      };
    }).filter(s => s.val > 0);

    if (scores.length < 2) return [];

    const sum = scores.reduce((acc, s) => acc + s.val, 0);
    const avg = sum / scores.length;

    scores.forEach(s => {
      const diff = Math.abs(s.val - avg);
      // For Seni, 0.05 deviance is substantial, 0.10 or more is severe mismatch
      if (diff >= 0.05) {
        list.push({
          juriId: s.id,
          skor: s.val,
          rataRata: parseFloat(avg.toFixed(2)),
          selisih: parseFloat(diff.toFixed(2)),
          alasan: `Skor Juri ${s.id} (${s.val.toFixed(2)}) menyimpang ${parseFloat(diff.toFixed(2))} poin dari konsensus rata-rata (${parseFloat(avg.toFixed(2))}).`,
          tingkatKeparahan: diff >= 0.10 ? 'Tinggi' : 'Sedang'
        });
      }
    });

    return list;
  };

  // Real-time Audit Log logic for Tanding
  const getAuditLogs = () => {
    if (!activeTanding) return [];

    const logs: Array<{
      id: string;
      timestamp: string;
      epoch: number;
      ronde: Ronde;
      juriId: string; // "Juri 1", "Juri 2", "Juri 3", "Juri 4", "Dewan"
      sudut: 'Merah' | 'Kuning';
      tipe: string; // Pukulan, Tendangan, Jatuhan, Teguran, etc.
      originalTipe: string;
      poin: number;
      icon: string;
    }> = [];

    // Gather points from Juri 1, 2, 3, 4
    [1, 2, 3, 4].forEach((jId) => {
      const score = activeTanding.skorJuri[jId];
      if (score) {
        score.poinMerah.forEach((pt) => {
          let mappedType = pt.tipe as string;
          if (pt.tipe === 'Katak') mappedType = 'Pukulan';
          else if (pt.tipe === 'Ikan Terbang') mappedType = 'Tendangan';
          else if (pt.tipe === 'Terkaman') mappedType = 'Jatuhan';
          
          logs.push({
            id: pt.id || `pt-m-${jId}-${pt.timestamp}-${Math.random()}`,
            timestamp: pt.timestamp,
            epoch: new Date(pt.timestamp).getTime(),
            ronde: pt.ronde,
            juriId: `Juri ${jId}`,
            sudut: 'Merah',
            tipe: mappedType,
            originalTipe: pt.tipe,
            poin: pt.poin,
            icon: pt.tipe === 'Katak' ? '🥊' : pt.tipe === 'Ikan Terbang' ? '🦶' : '💥',
          });
        });

        score.poinKuning.forEach((pt) => {
          let mappedType = pt.tipe as string;
          if (pt.tipe === 'Katak') mappedType = 'Pukulan';
          else if (pt.tipe === 'Ikan Terbang') mappedType = 'Tendangan';
          else if (pt.tipe === 'Terkaman') mappedType = 'Jatuhan';
          
          logs.push({
            id: pt.id || `pt-k-${jId}-${pt.timestamp}-${Math.random()}`,
            timestamp: pt.timestamp,
            epoch: new Date(pt.timestamp).getTime(),
            ronde: pt.ronde,
            juriId: `Juri ${jId}`,
            sudut: 'Kuning',
            tipe: mappedType,
            originalTipe: pt.tipe,
            poin: pt.poin,
            icon: pt.tipe === 'Katak' ? '🥊' : pt.tipe === 'Ikan Terbang' ? '🦶' : '💥',
          });
        });
      }
    });

    // Gather Dewan Penalties
    activeTanding.penaltiMerah.forEach((p) => {
      logs.push({
        id: p.id || `pen-m-${p.timestamp}-${Math.random()}`,
        timestamp: p.timestamp,
        epoch: new Date(p.timestamp).getTime(),
        ronde: p.ronde,
        juriId: 'Dewan',
        sudut: 'Merah',
        tipe: p.jenis,
        originalTipe: p.jenis,
        poin: p.poin,
        icon: '🛡️',
      });
    });

    activeTanding.penaltiKuning.forEach((p) => {
      logs.push({
        id: p.id || `pen-k-${p.timestamp}-${Math.random()}`,
        timestamp: p.timestamp,
        epoch: new Date(p.timestamp).getTime(),
        ronde: p.ronde,
        juriId: 'Dewan',
        sudut: 'Kuning',
        tipe: p.jenis,
        originalTipe: p.jenis,
        poin: p.poin,
        icon: '🛡️',
      });
    });

    // Sort by timestamp descending (newest first)
    return logs.sort((a, b) => b.epoch - a.epoch);
  };

  // Real-time Audit Log logic for Seni
  const getSeniAuditLogs = () => {
    if (!activeSeni) return [];
    const logs: Array<{
      id: string;
      juriId: string;
      score: number;
      kebenaran: number;
      kemantapan: number;
      kesalahan: number;
      hukuman: number;
    }> = [];

    [1, 2, 3, 4].forEach((jId) => {
      const sc = activeSeni.skorJuri[jId];
      if (sc) {
        logs.push({
          id: `seni-log-${jId}-${sc.totalSkor}`,
          juriId: `Juri ${jId}`,
          score: sc.totalSkor,
          kebenaran: sc.nilaiA ?? sc.skorJurus ?? 0,
          kemantapan: sc.nilaiB ?? sc.skorKemantapan ?? 0,
          kesalahan: sc.jumlahKesalahan || 0,
          hukuman: sc.penguranganHukuman || 0,
        });
      }
    });

    return logs;
  };

  // Penalties lists
  const handlePenaltiClick = (
    sudut: 'Merah' | 'Kuning',
    jenis: 'Teguran' | 'Peringatan' | 'Pelanggaran' | 'Jatuhan' | 'Mawar Lepas Terkaman',
    customPoin?: number
  ) => {
    if (activeTanding) {
      addDewanPenalti(activeTanding.id, sudut, jenis, customPoin);
    }
  };

  const handleUndoPenalti = (sudut: 'Merah' | 'Kuning') => {
    if (activeTanding) {
      undoDewanPenalti(activeTanding.id, sudut);
    }
  };

  // FILTER LOGIC FOR ARCHIVE
  const getFilteredMatches = () => {
    let list: Array<
      | { type: 'Tanding'; data: MatchTandingState }
      | { type: 'Seni'; data: MatchSeniState }
    > = [];

    if (filterType === 'Semua' || filterType === 'Tanding') {
      matchesTanding.forEach((m) => {
        list.push({ type: 'Tanding', data: m });
      });
    }
    if (filterType === 'Semua' || filterType === 'Seni') {
      matchesSeni.forEach((m) => {
        list.push({ type: 'Seni', data: m });
      });
    }

    // Filter by status
    if (filterStatus === 'Selesai') {
      list = list.filter((m) => m.data.status === 'Selesai');
    } else if (filterStatus === 'Aktif') {
      list = list.filter((m) => m.data.status === 'Sedang Tanding' || m.data.status === 'Sedang Penilaian');
    } else if (filterStatus === 'Belum Mulai') {
      list = list.filter((m) => m.data.status === 'Belum Dimulai');
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => {
        if (item.type === 'Tanding') {
          const m = item.data;
          return (
            m.id.toLowerCase().includes(q) ||
            m.pesilatMerah.nama.toLowerCase().includes(q) ||
            m.pesilatMerah.kontingen.toLowerCase().includes(q) ||
            m.pesilatKuning.nama.toLowerCase().includes(q) ||
            m.pesilatKuning.kontingen.toLowerCase().includes(q) ||
            m.kelas.toLowerCase().includes(q) ||
            m.kategoriUsia.toLowerCase().includes(q)
          );
        } else {
          const m = item.data;
          return (
            m.id.toLowerCase().includes(q) ||
            m.pesilat.nama.toLowerCase().includes(q) ||
            m.pesilat.kontingen.toLowerCase().includes(q) ||
            m.kategoriSeni.toLowerCase().includes(q) ||
            m.pesilat.kategoriUsia.toLowerCase().includes(q)
          );
        }
      });
    }

    // Sort: 'Selesai' priority, then alphabetically or ID
    return list.sort((a, b) => {
      if (a.data.status === 'Selesai' && b.data.status !== 'Selesai') return -1;
      if (a.data.status !== 'Selesai' && b.data.status === 'Selesai') return 1;
      return b.data.id.localeCompare(a.data.id);
    });
  };

  // PRINTING RENDER LOGIC
  const renderTandingDetailPrint = (matchId: string) => {
    const match = matchesTanding.find((m) => m.id === matchId);
    if (!match) return <div className="text-red-500 text-xs font-sans p-4">Pertandingan tidak ditemukan.</div>;

    const rM = getTandingConsensusScore(match, 'Merah');
    const rK = getTandingConsensusScore(match, 'Kuning');
    const rondeList: Ronde[] = ['1', '2', 'Tambahan'];

    return (
      <div className="space-y-6 text-black bg-white select-text font-serif p-4">
        {/* Header */}
        <div className="text-center border-b-4 border-double border-black pb-4">
          <div className="text-[10px] font-bold tracking-widest uppercase">YAYASAN PERTANDINGAN PENCAK SILAT TAPAK SUCI PUTERA MUHAMMADIYAH</div>
          <h1 className="text-lg font-black uppercase mb-0.5">LEMBAR REKAP NILAI JURI & KONSENSUS RESMI PARTAI TANDING</h1>
          <p className="text-[10px] text-gray-500 font-sans">ID Pertandingan: <strong>{match.id}</strong> • Kategori: {match.kategoriUsia} • Kelas/Tipe: {match.kelas}</p>
        </div>

        {/* Competitors Summary Grid */}
        <div className="grid grid-cols-2 gap-4 border border-black p-4 bg-gray-50 text-xs">
          <div className="border-r border-gray-300 pr-4">
            <span className="text-[9px] font-bold text-red-800 uppercase tracking-widest block font-sans">SUDUT MERAH:</span>
            <h2 className="text-sm font-bold text-black font-sans">{match.pesilatMerah.nama}</h2>
            <div className="text-[10px] text-gray-600 font-sans">Kontingen Sektor: <strong>{match.pesilatMerah.kontingen}</strong></div>
            <div className="text-[10px] text-gray-600 mt-2 font-mono">
              Rincian Penalti Dewan Hakim:
              <ul className="list-disc pl-4 text-xs text-red-800">
                {match.penaltiMerah.length === 0 ? <li className="list-none italic text-gray-400">Nihil / Tidak ada</li> : match.penaltiMerah.map((p, i) => (
                  <li key={i}>Ronde {p.ronde}: {p.jenis} ({p.poin > 0 ? `+${p.poin}` : p.poin} Poin)</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pl-4">
            <span className="text-[9px] font-bold text-amber-750 uppercase tracking-widest block font-sans">SUDUT KUNING:</span>
            <h2 className="text-sm font-bold text-black font-sans">{match.pesilatKuning.nama}</h2>
            <div className="text-[10px] text-gray-600 font-sans">Kontingen Sektor: <strong>{match.pesilatKuning.kontingen}</strong></div>
            <div className="text-[10px] text-gray-600 mt-2 font-mono">
              Rincian Penalti Dewan Hakim:
              <ul className="list-disc pl-4 text-xs text-red-800">
                {match.penaltiKuning.length === 0 ? <li className="list-none italic text-gray-400">Nihil / Tidak ada</li> : match.penaltiKuning.map((p, i) => (
                  <li key={i}>Ronde {p.ronde}: {p.jenis} ({p.poin > 0 ? `+${p.poin}` : p.poin} Poin)</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Detailed Scoring Matrix Round-by-Round */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase underline font-sans">VERIFIKASI POIN JURI SETIAP RONDE (JUDGES CONFLICT MATRIX)</h3>
          
          <table className="w-full text-[10px] border-collapse border border-black text-left">
            <thead>
              <tr className="bg-gray-100 text-black">
                <th className="border border-black px-2 py-1 text-center font-sans" rowSpan={2}>Ronde</th>
                <th className="border border-black px-2 py-1 text-center bg-red-50 text-red-950 font-sans" colSpan={5}>SUDUT MERAH</th>
                <th className="border border-black px-2 py-1 text-center bg-amber-50 text-amber-950 font-sans" colSpan={5}>SUDUT KUNING</th>
              </tr>
              <tr className="bg-gray-50 text-black font-sans">
                <th className="border border-black px-2 py-0.5 text-center">J1</th>
                <th className="border border-black px-2 py-0.5 text-center">J2</th>
                <th className="border border-black px-2 py-0.5 text-center">J3</th>
                <th className="border border-black px-2 py-0.5 text-center">J4</th>
                <th className="border border-black px-2 py-0.5 text-center bg-red-100/50 font-bold">Consensus</th>
                <th className="border border-black px-2 py-0.5 text-center">J1</th>
                <th className="border border-black px-2 py-0.5 text-center">J2</th>
                <th className="border border-black px-2 py-0.5 text-center">J3</th>
                <th className="border border-black px-2 py-0.5 text-center">J4</th>
                <th className="border border-black px-2 py-0.5 text-center bg-amber-100/50 font-bold">Consensus</th>
              </tr>
            </thead>
            <tbody>
              {rondeList.map((rondeVal) => {
                const j1M = getTandingFinalJudgeScoreForRound(match, 1, 'Merah', rondeVal);
                const j2M = getTandingFinalJudgeScoreForRound(match, 2, 'Merah', rondeVal);
                const j3M = getTandingFinalJudgeScoreForRound(match, 3, 'Merah', rondeVal);
                const j4M = getTandingFinalJudgeScoreForRound(match, 4, 'Merah', rondeVal);
                const conM = getTandingConsensusScoreForRound(match, rondeVal, 'Merah');

                const j1K = getTandingFinalJudgeScoreForRound(match, 1, 'Kuning', rondeVal);
                const j2K = getTandingFinalJudgeScoreForRound(match, 2, 'Kuning', rondeVal);
                const j3K = getTandingFinalJudgeScoreForRound(match, 3, 'Kuning', rondeVal);
                const j4K = getTandingFinalJudgeScoreForRound(match, 4, 'Kuning', rondeVal);
                const conK = getTandingConsensusScoreForRound(match, rondeVal, 'Kuning');

                return (
                  <tr key={rondeVal} className="hover:bg-gray-50 font-mono">
                    <td className="border border-black px-2 py-1.5 font-bold font-sans text-center bg-gray-50">Ronde {rondeVal}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{j1M}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{j2M}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{j3M}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{j4M}</td>
                    <td className="border border-black px-2 py-1.5 text-center bg-red-50 font-bold text-red-900">{conM}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{j1K}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{j2K}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{j3K}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{j4K}</td>
                    <td className="border border-black px-2 py-1.5 text-center bg-amber-50 font-bold text-amber-800">{conK}</td>
                  </tr>
                );
              })}
              {/* Grand Total */}
              <tr className="bg-gray-100 font-mono font-bold text-xs uppercase">
                <td className="border border-black px-2 py-2 text-center bg-gray-100 font-sans">TOTAL AKHIR</td>
                <td className="border border-black px-2 py-2 text-center">{getTandingFinalJudgeScore(match, 1, 'Merah')}</td>
                <td className="border border-black px-2 py-2 text-center">{getTandingFinalJudgeScore(match, 2, 'Merah')}</td>
                <td className="border border-black px-2 py-2 text-center">{getTandingFinalJudgeScore(match, 3, 'Merah')}</td>
                <td className="border border-black px-2 py-2 text-center">{getTandingFinalJudgeScore(match, 4, 'Merah')}</td>
                <td className="border border-black px-2 py-2 text-center bg-red-100 text-red-950 font-black text-sm">{rM}</td>
                <td className="border border-black px-2 py-2 text-center">{getTandingFinalJudgeScore(match, 1, 'Kuning')}</td>
                <td className="border border-black px-2 py-2 text-center">{getTandingFinalJudgeScore(match, 2, 'Kuning')}</td>
                <td className="border border-black px-2 py-2 text-center">{getTandingFinalJudgeScore(match, 3, 'Kuning')}</td>
                <td className="border border-black px-2 py-2 text-center">{getTandingFinalJudgeScore(match, 4, 'Kuning')}</td>
                <td className="border border-[#000] px-2 py-2 text-center bg-amber-100 text-amber-950 font-black text-sm">{rK}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Verdict Results Verification */}
        <div className="border-4 border-double border-black p-4 text-center mt-4">
          <span className="text-[9px] font-bold text-gray-500 uppercase block tracking-widest font-sans">HASIL KEPUTUSAN REF/DEWAN MAJELIS HAKIM</span>
          {match.status === 'Selesai' ? (
            <div className="space-y-1 mt-1 font-sans">
              <h1 className="text-sm md:text-base font-extrabold text-black uppercase">
                WINNER: <span className="underline">{match.pemenang === 'Merah' ? match.pesilatMerah.nama : match.pesilatKuning.nama}</span>
                <span className={`ml-2 px-2 py-0.5 text-[10px] text-white rounded-md ${match.pemenang === 'Merah' ? 'bg-red-800' : 'bg-amber-600'}`}>
                  (Sudut {match.pemenang})
                </span>
              </h1>
              <p className="text-[10px] text-gray-700 italic">"Pernyataan sah menang mutlak melalui konsensus juri pertandingan berdasar: {match.alasanPemenang}"</p>
            </div>
          ) : (
            <h1 className="text-xs font-bold text-gray-400 italic mt-1 font-sans">Status Pertandingan Saat Cetak: Belum Final ({match.status})</h1>
          )}
        </div>

        {/* Signatures */}
        <div className="pt-12">
          <div className="grid grid-cols-5 gap-4 text-center text-[9px] font-sans">
            <div className="space-y-10">
              <div>Juri Tanding I,</div>
              <div className="font-bold underline pt-10">..................................</div>
            </div>
            <div className="space-y-10">
              <div>Juri Tanding II,</div>
              <div className="font-bold underline pt-10">..................................</div>
            </div>
            <div className="space-y-10">
              <div>Juri Tanding III,</div>
              <div className="font-bold underline pt-10">..................................</div>
            </div>
            <div className="space-y-10">
              <div>Juri Tanding IV,</div>
              <div className="font-bold underline pt-10">..................................</div>
            </div>
            <div className="space-y-10">
              <div>Sekretaris Dewan Juri,</div>
              <div className="font-bold underline pt-10">..................................</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSeniDetailPrint = (matchId: string) => {
    const match = matchesSeni.find((m) => m.id === matchId);
    if (!match) return <div className="text-red-500 text-xs font-sans p-4">Partai seni tidak ditemukan.</div>;

    return (
      <div className="space-y-6 text-black bg-white select-text font-serif p-4">
        {/* Header */}
        <div className="text-center border-b-4 border-double border-black pb-4">
          <div className="text-[10px] font-bold tracking-widest uppercase">YAYASAN PERTANDINGAN PENCAK SILAT TAPAK SUCI PUTERA MUHAMMADIYAH</div>
          <h1 className="text-lg font-black uppercase mb-0.5">LEMBAR PENILAIAN & SKOR JURI RESMI - KATEGORI SENI TGRS</h1>
          <p className="text-[10px] text-gray-500 font-sans">ID Partai Seni: <strong>{match.id}</strong> • Jenis Golongan: {match.kategoriSeni}</p>
        </div>

        {/* Competitor Data */}
        <div className="border border-black p-4 bg-gray-50 grid grid-cols-2 gap-4 text-xs font-sans">
          <div>
            <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">NAMA PESILAT / TIM ARTISTIK:</span>
            <h2 className="text-sm font-black text-black">{match.pesilat.nama}</h2>
            <div className="text-[10px] text-gray-600 mt-1">Kontingen Sektor: <strong>{match.pesilat.kontingen}</strong></div>
          </div>
          <div className="text-right flex flex-col justify-center">
            <span className="text-[9px] text-gray-500 font-bold uppercase block tracking-wider">KONSENSUS SKOR DEWAN JURI (AVERAGE):</span>
            <h1 className="text-2xl font-black text-amber-700 font-mono tracking-wider">{match.totalSkorAkhir || '0.00'}</h1>
          </div>
        </div>

        {/* Detailed Scoring Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase underline font-sans">RINCIAN POIN SETIAP REF/DEWAN JURI INDIVIDU:</h3>
          {match.kategoriSeni === 'Tunggal' || match.kategoriSeni === 'Regu' ? (
            <table className="w-full text-[10px] border-collapse border border-black text-left font-sans font-normal">
              <thead>
                <tr className="bg-gray-100 text-black uppercase font-bold text-[9px]">
                  <th className="border border-black px-3 py-2 text-center">Unsur Juri</th>
                  <th className="border border-black px-3 py-2 text-center">Nilai A (Kebenaran, Maks 9.90)</th>
                  <th className="border border-black px-3 py-2 text-center">Jumlah Kesalahan</th>
                  <th className="border border-black px-3 py-2 text-center">Nilai B (Kemantapan, Maks 0.10)</th>
                  <th className="border border-black px-3 py-2 text-center text-red-900">Pengurangan Khusus (Hukuman)</th>
                  <th className="border border-black px-3 py-2 bg-amber-50 text-center text-amber-950 font-black">Skor Poin Total</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((juriId) => {
                  const s = match.skorJuri[juriId] || { skorJurus: 9.90, jumlahKesalahan: 0, skorKemantapan: 0.08, penguranganHukuman: 0, totalSkor: 9.98 };
                  const nA = (s as any).nilaiA !== undefined ? (s as any).nilaiA : s.skorJurus;
                  const nB = (s as any).nilaiB !== undefined ? (s as any).nilaiB : s.skorKemantapan;
                  return (
                    <tr key={juriId} className="hover:bg-gray-50 text-center font-mono font-medium">
                      <td className="border border-black px-3 py-2 font-bold font-sans bg-gray-50">Juri {juriId}</td>
                      <td className="border border-black px-3 py-2">{parseFloat(nA as any).toFixed(2)}</td>
                      <td className="border border-black px-3 py-2 text-red-700 font-semibold">{s.jumlahKesalahan}</td>
                      <td className="border border-black px-3 py-2">{parseFloat(nB as any).toFixed(2)}</td>
                      <td className="border border-black px-3 py-2 text-red-955">-{parseFloat(s.penguranganHukuman as any).toFixed(2)}</td>
                      <td className="border border-black px-3 py-2 font-extrabold bg-amber-50 text-amber-950 text-xs">{parseFloat(s.totalSkor as any).toFixed(2)}</td>
                    </tr>
                  );
                })}
                {/* Grand Consensus Row */}
                <tr className="bg-gray-150 font-bold uppercase text-[10px]">
                  <td className="border border-black px-3 py-2.5 text-center bg-gray-150 font-black" colSpan={5}>KONSENSUS SKOR RATA-RATA AKHIR (SCOREBOARD SENI)</td>
                  <td className="border border-black px-3 py-2.5 text-center bg-amber-100 text-amber-950 text-sm font-black font-mono">
                    {typeof match.totalSkorAkhir === 'number' ? match.totalSkorAkhir.toFixed(2) : '0.00'}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table className="w-full text-[10px] border-collapse border border-black text-left font-sans font-normal">
              <thead>
                <tr className="bg-gray-100 text-black uppercase font-bold text-[9px]">
                  <th className="border border-black px-3 py-2 text-center">Unsur Juri</th>
                  <th className="border border-black px-3 py-2 text-center">Konstanta Dasar</th>
                  <th className="border border-black px-3 py-2 text-center">Nilai Teknik (Maks 0.30)</th>
                  <th className="border border-black px-3 py-2 text-center">Ketegasan & Harmoni (Maks 0.30)</th>
                  <th className="border border-black px-3 py-2 text-center">Penjiwaan (Maks 0.30)</th>
                  <th className="border border-black px-3 py-2 text-center text-red-900">Pengurangan Khusus (Hukuman)</th>
                  <th className="border border-black px-3 py-2 bg-amber-50 text-center text-amber-950 font-black">Skor Poin Total</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((juriId) => {
                  const s = match.skorJuri[juriId] || { skorJurus: 0.25, jumlahKesalahan: 0, skorKemantapan: 0.25, penguranganHukuman: 0, totalSkor: 9.85 };
                  const nTeknik = (s as any).nilaiTeknik !== undefined ? (s as any).nilaiTeknik : s.skorJurus;
                  const nKetegasan = (s as any).nilaiKetegasan !== undefined ? (s as any).nilaiKetegasan : s.skorKemantapan;
                  const nPenjiwaan = (s as any).nilaiPenjiwaan !== undefined ? (s as any).nilaiPenjiwaan : 0.25;
                  return (
                    <tr key={juriId} className="hover:bg-gray-50 text-center font-mono font-medium">
                      <td className="border border-black px-3 py-2 font-bold font-sans bg-gray-50">Juri {juriId}</td>
                      <td className="border border-black px-3 py-2 text-gray-400">9.10</td>
                      <td className="border border-black px-3 py-2">{parseFloat(nTeknik as any).toFixed(2)}</td>
                      <td className="border border-black px-3 py-2">{parseFloat(nKetegasan as any).toFixed(2)}</td>
                      <td className="border border-black px-3 py-2">{parseFloat(nPenjiwaan as any).toFixed(2)}</td>
                      <td className="border border-black px-3 py-2 text-red-855">-{parseFloat(s.penguranganHukuman as any).toFixed(2)}</td>
                      <td className="border border-black px-3 py-2 font-extrabold bg-amber-50 text-amber-950 text-xs">{parseFloat(s.totalSkor as any).toFixed(2)}</td>
                    </tr>
                  );
                })}
                {/* Grand Consensus Row */}
                <tr className="bg-gray-150 font-bold uppercase text-[10px]">
                  <td className="border border-black px-3 py-2.5 text-center bg-gray-150 font-black" colSpan={6}>KONSENSUS SKOR RATA-RATA AKHIR (SCOREBOARD SENI)</td>
                  <td className="border border-black px-3 py-2.5 text-center bg-amber-100 text-amber-950 text-sm font-black font-mono">
                    {typeof match.totalSkorAkhir === 'number' ? match.totalSkorAkhir.toFixed(2) : '0.00'}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
          <p className="text-[9px] text-gray-500 italic mt-1 font-sans font-normal leading-relaxed">
            Keterangan: Skor Total diperoleh sesuai formulasi TGRS resmi (Seni Tunggal & Regu: Nilai A + Nilai B - Hukuman; Seni Ganda & Solo Kreatif: 9.10 + Nilai Teknik + Nilai Ketegasan + Nilai Penjiwaan - Hukuman).
          </p>
        </div>

        {/* Signatures */}
        <div className="pt-12">
          <div className="grid grid-cols-5 gap-4 text-center text-[9px] font-sans">
            <div className="space-y-12">
              <div>Juri Seni I,</div>
              <div className="font-bold underline pt-10">..................................</div>
            </div>
            <div className="space-y-12">
              <div>Juri Seni II,</div>
              <div className="font-bold underline pt-10">..................................</div>
            </div>
            <div className="space-y-12">
              <div>Juri Seni III,</div>
              <div className="font-bold underline pt-10">..................................</div>
            </div>
            <div className="space-y-12">
              <div>Juri Seni IV,</div>
              <div className="font-bold underline pt-10">..................................</div>
            </div>
            <div className="space-y-12">
              <div>Operator Pertandingan / Warden,</div>
              <div className="font-bold underline pt-10">..................................</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredMatches = getFilteredMatches();

  const containerClasses = isCustomFullscreen
    ? "fixed inset-0 z-50 bg-[#0d0d0d] overflow-y-auto p-6 md:p-10 flex flex-col space-y-6 font-mono text-gray-100 animate-fade-in"
    : "max-w-6xl mx-auto space-y-6 py-4 px-2 font-mono text-gray-100 print:hidden animate-fade-in";

  return (
    <>
      <div className={containerClasses}>
        {/* Title & Brand */}
        <div className="border-b border-[#333] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-mono uppercase font-black text-white tracking-tight flex items-center space-x-2">
              <Shield className="w-5 h-5 text-red-500" />
              <span>Sistem Dewan Pertandingan</span>
            </h1>
            <p className="text-gray-400 text-xs font-sans mt-0.5">Pengesahan sanksi pelanggaran pesilat sudut merah & kuning, serta pengawasan skor juri secara terpusat.</p>
          </div>
          
          <button
            onClick={() => setIsCustomFullscreen(!isCustomFullscreen)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#181818] hover:bg-[#282828] text-white border border-[#333] hover:border-[#444] rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md select-none"
          >
            {isCustomFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 text-amber-500" />
                <span>EXIT FULLSCREEN</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-emerald-400" />
                <span>LAYAR PENUH</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Navigation header */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b border-[#222] bg-[#111] p-1.5 rounded-lg">
          <div className="flex flex-1 sm:flex-initial gap-1.5">
            <button
              onClick={() => setActiveTab('live')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-6 py-2.5 rounded-md text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === 'live'
                  ? 'bg-red-800 text-white shadow-lg font-black border border-red-750'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-4 h-4 text-red-400" />
              <span>Pengawasan Live</span>
              {(activeTanding || activeSeni) && (
                <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-6 py-2.5 rounded-md text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === 'archive'
                  ? 'bg-[#FFD700] text-[#8B0000] shadow-lg font-black border border-[#FFD700]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileDown className="w-4 h-4" />
              <span>Arsip & Laporan PDF</span>
              <span className={`px-1.5 py-0.2 rounded-full font-sans font-extrabold text-[10px] ${activeTab === 'archive' ? 'bg-[#8B0000] text-white' : 'bg-[#222] text-[#FFD700]'}`}>
                {matchesTanding.filter(m => m.status === 'Selesai').length + matchesSeni.filter(m => m.status === 'Selesai').length}
              </span>
            </button>
          </div>

          {/* Sub-tab view selection if active tab is live */}
          {activeTab === 'live' && (activeTanding || activeSeni) && (
            <div className="flex bg-[#0a0a0a] border border-[#222] rounded p-1">
              <button
                onClick={() => setLiveViewMode('tanding')}
                className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition-all cursor-pointer ${
                  liveViewMode === 'tanding'
                    ? 'bg-red-900/30 text-red-405 border border-red-900/50 shadow font-black font-semibold'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                🥋 TANDING {activeTanding ? '🟢' : '⚪'}
              </button>
              <button
                onClick={() => setLiveViewMode('seni')}
                className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition-all cursor-pointer ${
                  liveViewMode === 'seni'
                    ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-900/50 shadow font-black font-semibold'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                ✨ SENI TGRS {activeSeni ? '🟢' : '⚪'}
              </button>
            </div>
          )}
        </div>

        {activeTab === 'live' ? (
          /* ================= LIVE MATCH TAB ================= */
          liveViewMode === 'tanding' ? (
            !activeTanding ? (
              <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4">
                <div className="bg-[#1a1614] p-8 rounded-xl border border-amber-900/40 flex flex-col items-center">
                  <ShieldAlert className="w-12 h-12 text-amber-500 mb-3 animate-bounce" />
                  <h3 className="font-bold text-white text-sm uppercase">Tidak Ada Partai Tanding Aktif</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed font-sans font-normal">
                    Dewan Pertandingan mengelola tanding (fighter) merah dan kuning. Pastikan Operator atau Admin meluncurkan partai tanding aktif saat ini.
                  </p>
                  <button
                    onClick={() => setActiveTab('archive')}
                    className="mt-5 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg text-xs font-sans font-bold flex items-center space-x-1.5 border border-amber-800/40 cursor-pointer transition-all"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Lihat Arsip Pertandingan Selesai</span>
                  </button>
                </div>
              </div>
            ) : (
            <div className="space-y-6">
               {/* Roster & Timer Status Card */}
              <div className="bg-[#161616] border border-[#333] text-white rounded-xl p-5 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono text-amber-500 font-bold uppercase tracking-wider">PANTAU PARTAI: t{activeTanding.id}</span>
                  <h2 className="text-lg font-bold text-white mt-1 capitalize">{activeTanding.kelas} / {activeTanding.kategoriUsia}</h2>
                  <span className="block text-xs text-gray-400 mt-1">Ronde Aktif: <strong className="text-white">Ronde {activeTanding.rondeAktif}</strong></span>
                </div>
                <div className="flex items-center space-x-3.5 flex-wrap gap-y-2">
                  <div className="text-center font-mono py-1 px-3 bg-[#0f0f0f] rounded-lg border border-[#2e2e2e] flex flex-col justify-center min-w-[120px]">
                    <span className="text-[8px] text-gray-500 block tracking-widest uppercase font-sans">AMBANG OUTLIER</span>
                    <select
                      value={outlierThreshold}
                      onChange={(e) => setOutlierThreshold(Number(e.target.value))}
                      className="bg-transparent text-xs text-amber-400 border-none font-bold focus:ring-0 cursor-pointer text-center outline-none"
                    >
                      <option value="2" className="bg-[#111] text-white">2 Poin</option>
                      <option value="3" className="bg-[#111] text-white">3 Poin</option>
                      <option value="4" className="bg-[#111] text-white">4 Poin (Normal)</option>
                      <option value="5" className="bg-[#111] text-white">5 Poin (Ketat)</option>
                      <option value="6" className="bg-[#111] text-white">6 Poin</option>
                    </select>
                  </div>

                  <button
                    id="manual-buzzer-dewan-btn"
                    onClick={() => { playBuzzer(); playClick(); }}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-800 hover:bg-red-750 text-white border border-red-900/60 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
                    title="Bunyikan Buzzer Manual"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>BUZZER MANDIRI</span>
                  </button>
                  
                  <div className="text-center font-mono py-2 px-5 bg-[#0f0f0f] rounded-lg border border-[#2e2e2e]">
                    <span className="text-[9px] text-gray-500 block tracking-widest uppercase font-normal font-sans">TIMER</span>
                    <span className="text-2xl font-bold tracking-wider text-green-400">
                      {Math.floor(activeTanding.waktuSisa / 60).toString().padStart(2, '0')}:
                      {(activeTanding.waktuSisa % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>

              {/* OUTLIER SCORE WARNING SYSTEM */}
              {getOutliersForActiveTanding().length > 0 && (
                <div className="bg-red-950/20 border border-red-500/40 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-red-800 rounded-lg text-white mt-1">
                      <AlertOctagon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest font-mono flex items-center space-x-1.5">
                        <span>Peringatan Sanksi / Outlier Nilai Juri</span>
                        <span className="px-1.5 py-0.5 bg-red-800 text-white rounded text-[8px] uppercase">DEV_MISMATCH</span>
                      </h3>
                      <p className="text-[11px] text-gray-300 mt-0.5 font-sans leading-relaxed">
                        Terdeteksi perbedaan skor mencolok (outlier) melebihi batas toleransi {outlierThreshold} poin pada sudut pesilat:
                      </p>
                      <ul className="list-disc pl-4 mt-1.5 space-y-1">
                        {getOutliersForActiveTanding().map((o, idx) => (
                          <li key={idx} className="text-[11px] text-red-300">
                            <strong>Sudut {o.sudut === 'Merah' ? '🔴 Merah' : '🟡 Kuning'} (Juri {o.juriId}):</strong> {o.alasan}{' '}
                            <span className={`inline-block px-1.5 py-0.2 text-[8px] font-bold rounded ml-1 ${o.tingkatKeparahan === 'Tinggi' ? 'bg-red-800 text-white animate-bounce' : 'bg-[#333] text-red-200'}`}>
                              Deviasi {o.tingkatKeparahan}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <span className="text-[9px] text-gray-400 font-sans font-normal uppercase tracking-wider">Metode Validasi:</span>
                    <span className="px-2 py-1 bg-[#1a1a1a] rounded border border-[#333] text-[9px] text-amber-500 font-mono font-bold">Deviation from Consensus (AVG)</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Sanksi/Poin Dewan Controls */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Bonus Value X Configuration of Mawar Lepas Terkaman under Dewan Control */}
                  <div className="bg-[#161616] p-4 rounded-xl border border-[#333] flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold font-mono text-gray-300 uppercase block tracking-wider">KONFIGURASI BONUS X (MAWAR LEPAS TERKAMAN)</span>
                      <span className="text-[10px] text-gray-500 font-sans">Tentukan nilai X tambahan untuk serangan mawar lepas terkaman (poin = 10 + X)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {[5, 10, 15, 20].map((val) => (
                        <button
                          key={val}
                          onClick={() => setNilaiX(val)}
                          className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-all cursor-pointer ${
                            nilaiX === val
                              ? 'bg-[#222] border border-[#555] text-white font-black animate-pulse'
                              : 'bg-[#0f0f0f] border border-[#2d2d2d] text-gray-400 hover:bg-[#151515]'
                          }`}
                        >
                          +{val}
                        </button>
                      ))}
                      <div className="flex items-center pl-2">
                        <input
                          id="dewan-bonus-x-input"
                          type="number"
                          value={nilaiX}
                          onChange={(e) => setNilaiX(parseInt(e.target.value) || 0)}
                          className="w-14 px-1.5 py-1 bg-[#0f0f0f] border border-[#333] rounded text-xs text-white font-mono text-center focus:outline-none focus:border-amber-500"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mawar Lepas Terkaman Action Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Red Mawar Lepas Terkaman */}
                    <div className="bg-[#1f1010] p-5 rounded-xl border border-red-950/40 space-y-4">
                      <div className="flex justify-between items-center border-b border-red-900/25 pb-2">
                        <span className="font-bold text-red-400 text-xs font-mono tracking-wider">🔴 DEWAN: SUDUT MERAH</span>
                        <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-900/30">BONUS</span>
                      </div>
                      <div className="text-xs text-red-200 mt-1 font-sans">
                        {activeTanding.pesilatMerah.nama}
                      </div>
                      <button
                        id="dewan-red-mawar-btn"
                        onClick={() => handlePenaltiClick('Merah', 'Mawar Lepas Terkaman', 10 + nilaiX)}
                        className="w-full py-3 bg-violet-900 text-white font-mono text-xs font-bold px-3 rounded-lg transition-all hover:bg-violet-850 flex justify-between items-center cursor-pointer border border-violet-800/80 active:scale-95 shadow-lg"
                      >
                        <span className="uppercase font-bold">Klaim Mawar Lepas Terkaman</span>
                        <span className="font-mono text-[#FFD700] font-black">+{10 + nilaiX} Poin</span>
                      </button>
                    </div>

                    {/* Yellow Mawar Lepas Terkaman */}
                    <div className="bg-[#1f1c10] p-5 rounded-xl border border-yellow-950/40 space-y-4">
                      <div className="flex justify-between items-center border-b border-yellow-905/25 pb-2">
                        <span className="font-bold text-yellow-500 text-xs font-mono tracking-wider">🟡 DEWAN: SUDUT KUNING</span>
                        <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-900/30">BONUS</span>
                      </div>
                      <div className="text-xs text-yellow-200 mt-1 font-sans">
                        {activeTanding.pesilatKuning.nama}
                      </div>
                      <button
                        id="dewan-yellow-mawar-btn"
                        onClick={() => handlePenaltiClick('Kuning', 'Mawar Lepas Terkaman', 10 + nilaiX)}
                        className="w-full py-3 bg-violet-900 text-white font-mono text-xs font-bold px-3 rounded-lg transition-all hover:bg-violet-850 flex justify-between items-center cursor-pointer border border-violet-800/80 active:scale-95 shadow-lg"
                      >
                        <span className="uppercase font-bold">Klaim Mawar Lepas Terkaman</span>
                        <span className="font-mono text-[#FFD700] font-black">+{10 + nilaiX} Poin</span>
                      </button>
                    </div>
                  </div>

                  {/* Real-time Audit Log Section */}
                  <div id="realtime-audit-log-tanding" className="bg-[#161616] p-5 rounded-xl border border-[#333] shadow-md space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#282828] pb-3 gap-2">
                      <div className="flex items-center space-x-2">
                        <History className="w-4 h-4 text-amber-500" />
                        <div>
                          <h3 className="font-mono text-xs uppercase font-black text-white">
                            Riwayat Input Poin Real-time (Audit Log)
                          </h3>
                          <p className="text-[10px] text-gray-400 font-sans">Daftar kronologis lengkap dari seluruh juri dan keputusan dewan</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 bg-[#0a0a0a] px-2.5 py-1 rounded text-[10px] font-mono border border-[#222]">
                        <span className="text-gray-500">Total Entri:</span>
                        <span className="text-amber-400 font-extrabold font-bold">{getAuditLogs().length}</span>
                      </div>
                    </div>

                    {/* Filter controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#0d0d0d] p-2.5 rounded-lg border border-[#222]">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="text-[9px] text-gray-400 font-mono flex-shrink-0">WASIT:</span>
                        <select
                          value={auditFilterJuri}
                          onChange={(e) => setAuditFilterJuri(e.target.value)}
                          className="flex-1 bg-[#161616] border border-[#2d2d2d] focus:border-amber-500 p-1 text-[10px] rounded text-white font-mono outline-none cursor-pointer"
                        >
                          <option value="Semua">Semua Wasit</option>
                          <option value="Juri 1">Juri 1</option>
                          <option value="Juri 2">Juri 2</option>
                          <option value="Juri 3">Juri 3</option>
                          <option value="Juri 4">Juri 4</option>
                          <option value="Dewan">Dewan</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="text-[9px] text-gray-400 font-mono flex-shrink-0">SUDUT:</span>
                        <select
                          value={auditFilterSudut}
                          onChange={(e) => setAuditFilterSudut(e.target.value)}
                          className="flex-1 bg-[#161616] border border-[#2d2d2d] focus:border-amber-500 p-1 text-[10px] rounded text-white font-mono outline-none cursor-pointer"
                        >
                          <option value="Semua">Semua Sudut</option>
                          <option value="Merah">Sudut Merah</option>
                          <option value="Kuning">Sudut Kuning</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="text-[9px] text-gray-400 font-mono flex-shrink-0">TIPE:</span>
                        <select
                          value={auditFilterTipe}
                          onChange={(e) => setAuditFilterTipe(e.target.value)}
                          className="flex-1 bg-[#161616] border border-[#2d2d2d] focus:border-amber-500 p-1 text-[10px] rounded text-white font-mono outline-none cursor-pointer"
                        >
                          <option value="Semua">Semua Poin</option>
                          <option value="Pukulan">Pukulan</option>
                          <option value="Tendangan">Tendangan</option>
                          <option value="Jatuhan">Jatuhan</option>
                          <option value="Sanksi">Sanksi Dewan</option>
                        </select>
                      </div>
                    </div>

                    {/* Log list */}
                    <div className="max-h-[280px] overflow-y-auto pr-1 space-y-2">
                      {(() => {
                        const logs = getAuditLogs().filter(log => {
                          if (auditFilterJuri !== 'Semua' && log.juriId !== auditFilterJuri) return false;
                          if (auditFilterSudut !== 'Semua' && log.sudut !== auditFilterSudut) return false;
                          if (auditFilterTipe !== 'Semua') {
                            if (auditFilterTipe === 'Pukulan' && log.tipe !== 'Pukulan') return false;
                            if (auditFilterTipe === 'Tendangan' && log.tipe !== 'Tendangan') return false;
                            if (auditFilterTipe === 'Jatuhan' && log.tipe !== 'Jatuhan') return false;
                            if (auditFilterTipe === 'Sanksi' && ['Pukulan', 'Tendangan', 'Jatuhan'].includes(log.tipe)) return false;
                          }
                          return true;
                        });

                        if (logs.length === 0) {
                          return (
                            <div className="py-12 text-center text-gray-500 border border-dashed border-[#2d2d2d] rounded-lg">
                              <p className="text-xs font-sans">Belum ada riwayat input juri yang cocok dengan filter atau terdaftar di partai ini.</p>
                            </div>
                          );
                        }

                        return logs.map((log) => {
                          const timeStr = new Date(log.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                          });

                          const isDewan = log.juriId === 'Dewan';
                          const isMerah = log.sudut === 'Merah';

                          return (
                            <div
                              key={log.id}
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono transition-all duration-200 hover:bg-[#1a1a1a] ${
                                isMerah ? 'border-red-950/20 bg-red-950/5' : 'border-yellow-950/15 bg-yellow-950/5'
                              }`}
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className="text-[10px] text-gray-500 flex flex-col justify-center flex-shrink-0">
                                  <span>{timeStr}</span>
                                  <span className="text-[8px] text-amber-500 uppercase font-semibold">Rnd {log.ronde}</span>
                                </div>

                                <div className="h-5 w-px bg-[#2d2d2d] flex-shrink-0" />

                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-sans font-bold flex-shrink-0 ${
                                    isDewan
                                      ? 'bg-purple-950 border border-purple-800 text-purple-300'
                                      : 'bg-[#1e1e1e] border border-[#333] text-gray-300'
                                  }`}
                                >
                                  {log.juriId}
                                </span>

                                <div className="min-w-0 flex items-center space-x-1.5">
                                  <span className="text-xs">{log.icon}</span>
                                  <span className="text-[11px] truncate text-gray-200">
                                    {log.tipe}{' '}
                                    <span className={isMerah ? 'text-red-400 font-bold' : 'text-yellow-500 font-bold'}>
                                      {isMerah ? 'Sudut Merah' : 'Sudut Kuning'}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded text-xs font-black tracking-wider ${
                                  log.poin > 0
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/55'
                                    : 'bg-red-950 text-red-500 border border-red-900/50'
                                }`}
                              >
                                {log.poin > 0 ? `+${log.poin}` : log.poin}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* Right Column: JURI SCORES MONITOR AUDITING */}
                <div className="lg:col-span-4 bg-[#161616] p-5 rounded-xl border border-[#333] shadow-md space-y-5">
                  <h3 className="font-mono text-xs uppercase font-black text-white border-b border-[#282828] pb-2 flex items-center space-x-1">
                    <Scale className="w-4 h-4 text-gray-400" />
                    <span>Audit Nilai Juri (Papan Real)</span>
                  </h3>

                  <div className="space-y-4 font-bold">
                    {[1, 2, 3, 4].map((juriId) => {
                      const meritsRed = getJuriPointsTotal(juriId, 'Merah');
                      const meritsYellow = getJuriPointsTotal(juriId, 'Kuning');
                      const finalRed = getFinalScore(juriId, 'Merah');
                      const finalYellow = getFinalScore(juriId, 'Kuning');

                      // Check outliers
                      const judgeOutliers = getOutliersForActiveTanding();
                      const isRedOutlier = judgeOutliers.some(o => o.sudut === 'Merah' && o.juriId === juriId);
                      const isYellowOutlier = judgeOutliers.some(o => o.sudut === 'Kuning' && o.juriId === juriId);

                      const cardBorderClass = isRedOutlier 
                        ? 'border-red-500 ring-1 ring-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.25)]' 
                        : isYellowOutlier 
                        ? 'border-yellow-500 ring-1 ring-yellow-500/80 shadow-[0_0_15px_rgba(234,179,8,0.22)]'
                        : 'border-[#2d2d2d]';

                      return (
                        <div key={juriId} className={`p-3 bg-[#0f0f0f] rounded-lg space-y-2 border transition-all duration-350 ${cardBorderClass}`}>
                          <div className="flex justify-between items-center border-b border-[#212121] pb-1 text-[10px]">
                            <span className="font-bold text-gray-400 font-mono">WASIT JURI {juriId}</span>
                            {(isRedOutlier || isYellowOutlier) && (
                              <span className="text-[7px] font-sans font-black bg-red-900 border border-red-700 text-red-100 rounded px-1 py-0.2 animate-pulse tracking-tight">
                                OUTLIER DETECTED
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-center font-mono">
                            {/* Red Corner Audit */}
                            <div className={`p-2 rounded border space-y-0.5 transition-all ${
                              isRedOutlier ? 'bg-red-950/40 border-red-500/50' : 'bg-red-950/20 border-red-900/30'
                            }`}>
                              <span className="text-[8px] font-mono font-bold text-red-400 block tracking-wider uppercase">RED CORNER</span>
                              <div className="text-base font-black text-red-400">{finalRed}</div>
                              <span className="text-[8px] text-gray-500 block font-light font-sans font-normal">Murni: {meritsRed} ({getPenaltiesTotal('Merah')})</span>
                            </div>

                            {/* Yellow Corner Audit */}
                            <div className={`p-2 rounded border space-y-0.5 transition-all ${
                              isYellowOutlier ? 'bg-yellow-950/40 border-yellow-500/50' : 'bg-yellow-950/20 border-yellow-905/30'
                            }`}>
                              <span className="text-[8px] font-mono font-bold text-yellow-500 block tracking-wider uppercase">YELLOW CORNER</span>
                              <div className="text-base font-black text-yellow-500">{finalYellow}</div>
                              <span className="text-[8px] text-gray-500 block font-light font-sans font-normal">Murni: {meritsYellow} ({getPenaltiesTotal('Kuning')})</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-[#111] border border-[#2c2c2c] text-gray-400 rounded-lg text-[9px] leading-relaxed space-y-1 font-sans font-normal font-normal">
                    <span className="font-bold text-amber-500 block flex items-center space-x-1 font-mono">
                      <span>⚠️ Aturan IPSI & Tapak Suci</span>
                    </span>
                    <p>Poin akhir terpampang di display penonton adalah kalkulasi real dari seluruh juri setelah dipotong sanksi dewan.</p>
                  </div>
                </div>
              </div>
            </div>
          )
          ) : (
            /* ================= LIVE SENI TGRS MONITORING VIEW ================= */
            !activeSeni ? (
              <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4">
                <div className="bg-[#10191e] p-8 rounded-xl border border-cyan-900/40 flex flex-col items-center">
                  <Award className="w-12 h-12 text-cyan-500 mb-3 animate-pulse" />
                  <h3 className="font-bold text-white text-sm uppercase">Tidak Ada Partai Seni TGRS Aktif</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed font-sans font-normal">
                    Belum ada partai penilaian Seni TGRS yang diaktifkan oleh operator. Pastikan pesilat seni telah login atau disiapkan di ring arena.
                  </p>
                  <button
                    onClick={() => setActiveTab('archive')}
                    className="mt-5 px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 rounded-lg text-xs font-sans font-bold flex items-center space-x-1.5 border border-cyan-800/40 cursor-pointer transition-all"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Lihat Arsip Pertandingan Selesai</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Roster & Time status card for Seni */}
                <div className="bg-[#161616] border border-[#333] text-white rounded-xl p-5 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in animate-duration-200">
                  <div>
                    <span className="text-xs font-mono text-cyan-405 font-bold uppercase tracking-wider">PANTAU PARTAI SENI: t{activeSeni.id}</span>
                    <h2 className="text-lg font-bold text-white mt-1 capitalize">{activeSeni.pesilat.nama}</h2>
                    <span className="block text-xs text-gray-400 mt-1">Kontingen: <strong className="text-white">{activeSeni.pesilat.kontingen}</strong></span>
                  </div>
                  <div className="flex items-center space-x-3.5 flex-wrap gap-y-2">
                    <div className="text-center font-mono py-1 px-3 bg-[#0f0f0f] rounded-lg border border-[#2e2e2e] flex flex-col justify-center min-w-[124px]">
                      <span className="text-[8px] text-gray-500 block tracking-widest uppercase font-sans">KATEGORI SENI</span>
                      <span className="text-xs text-yellow-500 font-bold uppercase">{activeSeni.kategoriSeni}</span>
                    </div>

                    <div className="text-center font-mono py-1 px-3 bg-[#0f0f0f] rounded-lg border border-[#2e2e2e] flex flex-col justify-center min-w-[124px]">
                      <span className="text-[8px] text-gray-500 block tracking-widest uppercase font-sans">AKUMULASI WAKTU</span>
                      <span className={`text-base font-black px-1 ${activeSeni.timerBerjalan ? 'text-green-405 animate-pulse' : 'text-amber-500'}`}>
                        {Math.floor(activeSeni.waktuBerjalan / 60).toString().padStart(2, '0')}:{(activeSeni.waktuBerjalan % 60).toString().padStart(2, '0')}
                      </span>
                    </div>

                    <div className="text-center font-mono py-1 px-3 bg-[#0f0f0f] rounded-lg border border-[#2e2e2e] flex flex-col justify-center min-w-[124px]">
                      <span className="text-[8px] text-gray-500 block tracking-widest uppercase font-sans">STATUS TIMER</span>
                      <span className={`text-[10px] font-bold ${activeSeni.timerBerjalan ? 'text-green-400' : 'text-gray-400'}`}>
                        {activeSeni.timerBerjalan ? '⚫ RUNNING' : '⚪ STOPPED'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AUTOMATIC SENI OUTLIERS WARNING BLOCK */}
                {(() => {
                  const outliers = getOutliersForSeni();
                  if (outliers.length === 0) return null;
                  return (
                    <div className="bg-red-950/20 border-l-4 border-red-500 p-4 rounded-r-xl shadow-md space-y-2 mt-2">
                      <div className="flex items-center space-x-2 text-red-400 font-black text-xs uppercase font-mono tracking-wide">
                        <AlertOctagon className="w-4 h-4 text-red-500 animate-pulse" />
                        <span>SISTEM PERINGATAN OTOMATIS OUTLIER SENI TGRS</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                        Terdeteksi deviasi skor seni menyimpang dari ambang statistik wajar (&ge; 0.05). Dewan Juri disarankan mengevaluasi kesesuaian borig nilai juri bersangkutan.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {outliers.map((o, idx) => (
                          <div key={idx} className="bg-[#120b0b] p-2 rounded border border-red-900/30 text-[9px] font-mono leading-relaxed text-red-300">
                            <strong>[Peringatan {o.tingkatKeparahan}] Juri {o.juriId}:</strong> {o.alasan}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Score Summary Box for Seni */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left panel: Juri Realtime Score Matrix */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="border-b border-[#2d2d2d] pb-2">
                      <h3 className="font-bold text-white text-xs uppercase flex items-center space-x-1.5 pl-1">
                        <Scale className="w-4 h-4 text-cyan-400" />
                        <span>Pengawasan Nilai Juri 1 - 4 (Seni)</span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((juriId) => {
                        const sc = activeSeni.skorJuri[juriId];
                        const sOutliers = getOutliersForSeni();
                        const isSeniOutlier = sOutliers.some(o => o.juriId === juriId);
                        
                        if (!sc) {
                          return (
                            <div key={juriId} className="p-5 bg-[#121212] border border-[#222] rounded-xl flex flex-col justify-center items-center h-48 text-center space-y-3">
                              <span className="w-8 h-8 rounded-full bg-[#1c1c1c] text-xs font-bold text-gray-500 flex items-center justify-center">J{juriId}</span>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-gray-400 font-mono">WASIT JURI {juriId}</span>
                                <span className="text-[9px] text-[#FFD700] block animate-pulse mt-1 font-semibold">STATUS: MENUNGGU SUBMIT</span>
                              </div>
                            </div>
                          );
                        }

                        const isTunggalRegu = activeSeni.kategoriSeni === 'Tunggal' || activeSeni.kategoriSeni === 'Regu';
                        
                        return (
                          <div 
                            key={juriId} 
                            className={`p-4 bg-[#0f0f0f] rounded-xl border space-y-3 transition-all duration-300 ${
                              isSeniOutlier 
                                ? 'border-red-500 ring-1 ring-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                                : 'border-[#2d2d2d] hover:border-[#383838]'
                            }`}
                          >
                            <div className="flex justify-between items-center border-b border-[#212121] pb-1.5 text-[10px]">
                              <span className="font-bold text-gray-300 font-mono">WASIT JURI {juriId}</span>
                              {isSeniOutlier && (
                                <span className="text-[7px] font-sans font-black bg-red-950 border border-red-800 text-red-300 rounded px-1.5 py-0.2 animate-pulse tracking-wide uppercase">
                                  ⚠️ OUTLIER
                                </span>
                              )}
                            </div>

                            <div className="flex justify-between items-center bg-[#151515] p-3 rounded-lg border border-[#222]">
                              <span className="text-[9px] text-gray-400 uppercase font-bold">Total Skor</span>
                              <span className="text-2xl font-mono font-black text-yellow-505">{sc.totalSkor.toFixed(2)}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono leading-relaxed text-gray-400">
                              {isTunggalRegu ? (
                                <>
                                  <div className="bg-[#161616] p-1.5 rounded border border-[#222]">
                                    <span className="text-gray-500 block uppercase font-sans text-[7px] font-bold">Nilai A (Kebenaran)</span>
                                    <span className="text-gray-200 font-bold">{(sc.nilaiA ?? sc.skorJurus ?? 0).toFixed(2)}</span>
                                  </div>
                                  <div className="bg-[#161616] p-1.5 rounded border border-[#222]">
                                    <span className="text-gray-500 block uppercase font-sans text-[7px] font-bold">Jumlah Kesalahan</span>
                                    <span className="text-red-400 font-bold">{sc.jumlahKesalahan || 0}</span>
                                  </div>
                                  <div className="bg-[#161616] p-1.5 rounded border border-[#222]">
                                    <span className="text-gray-500 block uppercase font-sans text-[7px] font-bold">Nilai B (Kemantapan)</span>
                                    <span className="text-gray-200 font-bold">{(sc.nilaiB ?? sc.skorKemantapan ?? 0).toFixed(2)}</span>
                                  </div>
                                  <div className="bg-[#161616] p-1.5 rounded border border-[#222]">
                                    <span className="text-gray-500 block uppercase font-sans text-[7px] font-bold">Potongan Pinalti</span>
                                    <span className="text-red-404 font-bold">-{sc.penguranganHukuman.toFixed(2)}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="bg-[#161616] p-1.5 rounded border border-[#222]">
                                    <span className="text-gray-500 block uppercase font-sans text-[7px] font-bold">Nilai Teknik</span>
                                    <span className="text-gray-200 font-bold font-semibold">{(sc.skorJurus ?? sc.nilaiTeknik ?? 0).toFixed(2)}</span>
                                  </div>
                                  <div className="bg-[#161616] p-1.5 rounded border border-[#222]">
                                    <span className="text-gray-500 block uppercase font-sans text-[7px] font-bold">Nilai Ketegasan</span>
                                    <span className="text-gray-200 font-bold font-semibold">{(sc.skorKemantapan ?? sc.nilaiKetegasan ?? 0).toFixed(2)}</span>
                                  </div>
                                  <div className="bg-[#161616] p-1.5 rounded border border-[#222]">
                                    <span className="text-gray-500 block uppercase font-sans text-[7px] font-bold">Nilai Penjiwaan</span>
                                    <span className="text-gray-200 font-bold font-semibold">{(sc.nilaiPenjiwaan ?? 0.25).toFixed(2)}</span>
                                  </div>
                                  <div className="bg-[#161616] p-1.5 rounded border border-[#222]">
                                    <span className="text-gray-500 block uppercase font-sans text-[7px] font-bold">Potongan Pinalti</span>
                                    <span className="text-red-404 font-bold">-{sc.penguranganHukuman.toFixed(2)}</span>
                                  </div>
                                </>
                              )}
                            </div>

                            {sc.catatan && (
                              <div className="bg-[#111] p-2 rounded text-[9px] text-gray-505 border border-[#202020] font-sans leading-relaxed">
                                <strong className="text-amber-500 font-mono text-[8px] uppercase block mb-0.5 font-bold">Catatan Juri:</strong>
                                "{sc.catatan}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Real-time Seni Scores Audit Log Section */}
                    <div id="realtime-audit-log-seni" className="bg-[#161616] p-5 rounded-xl border border-[#333] shadow-md space-y-4 mt-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#282828] pb-3 gap-2">
                        <div className="flex items-center space-x-2">
                          <History className="w-4 h-4 text-cyan-405 animate-spin-slow" />
                          <div>
                            <h3 className="font-mono text-xs uppercase font-black text-white">
                              Riwayat Submit Nilai Seni (Audit Log)
                            </h3>
                            <p className="text-[10px] text-gray-400 font-sans">Status penguncian dan rincian skor juri seni secara real-time</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 bg-[#0a0a0a] px-2.5 py-1 rounded text-[10px] font-mono border border-[#222]">
                          <span className="text-gray-500">Juri Submit:</span>
                          <span className="text-cyan-400 font-extrabold font-bold animate-pulse">
                            {getSeniAuditLogs().length} / 4
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {(() => {
                          const logs = getSeniAuditLogs();
                          if (logs.length === 0) {
                            return (
                              <div className="py-8 text-center text-gray-500 border border-dashed border-[#2d2d2d] rounded-lg">
                                <p className="text-xs font-sans">Belum ada juri seni yang melakukan submit borig nilai.</p>
                              </div>
                            );
                          }

                          return logs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-cyan-950/20 bg-cyan-950/5 text-xs font-mono"
                            >
                              <div className="flex items-center space-x-3">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-[#1e1e1e] border border-[#333] text-cyan-405 font-bold">
                                  {log.juriId}
                                </span>
                                <div className="text-[10px] text-gray-400">
                                  <span>Kebenaran: <strong className="text-white">{log.kebenaran.toFixed(2)}</strong></span>
                                  <span className="mx-1.5">•</span>
                                  <span>Kemantapan: <strong className="text-white">{log.kemantapan.toFixed(2)}</strong></span>
                                  <span className="mx-1.5">•</span>
                                  <span>Kesalahan: <strong className="text-red-400">{log.kesalahan}</strong></span>
                                  <span className="mx-1.5">•</span>
                                  <span>Hukuman: <strong className="text-red-400">-{log.hukuman.toFixed(2)}</strong></span>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded bg-[#0f0f0f] border border-[#2d2d2d] text-yellow-500 font-bold text-xs">
                                {log.score.toFixed(2)}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Right panel: Grand average consensus details for Seni */}
                  <div className="lg:col-span-4 bg-[#161616] p-5 rounded-xl border border-[#333] shadow-md space-y-5">
                    <h3 className="font-mono text-xs uppercase font-black text-white border-b border-[#282828] pb-2 flex items-center space-x-1">
                      <Award className="w-4 h-4 text-cyan-405" />
                      <span>Kalkulasi Konsensus Dewan Seni</span>
                    </h3>

                    <div className="bg-[#0f0f0f] rounded-lg p-5 border border-[#222] text-center space-y-1">
                      <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block">GRAND TOTAL AVERAGE AKHIR</span>
                      <div className="text-4xl font-mono font-black text-[#FFD700] tracking-tight">
                        {typeof activeSeni.totalSkorAkhir === 'number' ? activeSeni.totalSkorAkhir.toFixed(2) : '0.00'}
                      </div>
                      <span className="text-[9px] text-gray-500 font-mono block">Rata-rata dari nilai juri yang terkumpul</span>
                    </div>

                    <div className="space-y-3 text-[10px] text-gray-400 font-sans leading-relaxed">
                      <span className="font-bold text-amber-500 block uppercase font-mono text-[9px]">Pedoman Dewan Seni TGRS</span>
                      <p>Rata-rata didapatkan dengan menjumlahkan seluruh skor juri 1-4 yang telah terkumpul, kemudian dibagi dengan jumlah juri aktif.</p>
                      
                      <div className="bg-[#111] p-3 rounded-lg border border-[#2c2c2c] space-y-2">
                        <span className="text-[8px] font-mono text-gray-500 uppercase block tracking-wider font-semibold">Formula Perolehan Seni TGRS:</span>
                        <ul className="list-disc list-inside space-y-1 text-[9px] leading-normal font-mono">
                          <li>Seni Tunggal/Regu: Kebenaran (Nilai A) + Kemantapan (Nilai B) - Hukuman Pinalti</li>
                          <li>Ganda/Solo: 9.10 + Teknik + Ketegasan + Penjiwaan - Hukuman Pinalti</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          )
        ) : (
          /* ================= ARCHIVE & PDF REPORT TAB ================= */
          <div className="space-y-6">
            <div className="bg-[#121212] border border-[#222] p-5 rounded-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight flex items-center space-x-1.5 font-mono">
                  <FileText className="w-4 h-4 text-[#FFD700]" />
                  <span>Pusat Arsip Laporan & Scorecard Pertandingan</span>
                </h3>
                <p className="text-gray-400 text-xs font-sans font-normal mt-1">Unduh, preview, atau cetak lembar rekap nilai juri versi PDF untuk arsip resmi Majelis Dewan Pertandingan.</p>
              </div>

              {/* SEARCH & FILTERS CONTROLS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#0a0a0a] p-3.5 rounded-lg border border-[#222]">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari atlet, kontingen, kls..."
                    className="w-full bg-[#181818] border border-[#333] hover:border-[#444] focus:border-[#FFD700] pl-9 pr-3 py-2 text-xs rounded-md text-white font-sans tracking-tight focus:outline-none transition-all placeholder-gray-600"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-sans font-normal">Kategori:</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="flex-1 bg-[#181818] border border-[#333] focus:border-[#FFD700] p-2 text-xs rounded-md text-white font-sans focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="Semua">Semua Kategori</option>
                    <option value="Tanding">Tanding (Combat)</option>
                    <option value="Seni">Seni (Artistic)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-sans font-normal">Status:</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="flex-1 bg-[#181818] border border-[#333] focus:border-[#FFD700] p-2 text-xs rounded-md text-white font-sans focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="Selesai">Hanya Selesai (Arsip)</option>
                    <option value="Aktif">Live / Berlangsung</option>
                    <option value="Belum Mulai">Belum Mulai</option>
                  </select>
                </div>

                <div className="flex justify-end items-center">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterType('Semua');
                      setFilterStatus('Semua');
                    }}
                    className="px-3 py-2 bg-[#222] hover:bg-[#2e2e2e] text-gray-400 hover:text-white border border-[#333] rounded-md text-xs font-sans transition-all flex items-center space-x-1 cursor-pointer"
                    title="Reset Filter"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Filter</span>
                  </button>
                </div>
              </div>

              {/* LIST MATCH CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMatches.map((item) => {
                  if (item.type === 'Tanding') {
                    const m = item.data;
                    const finalM = getTandingConsensusScore(m, 'Merah');
                    const finalK = getTandingConsensusScore(m, 'Kuning');
                    const isCompleted = m.status === 'Selesai';

                    return (
                      <div 
                        key={m.id} 
                        className={`bg-[#181818] rounded-xl p-5 border transition-all hover:translate-y-[-2px] space-y-4 flex flex-col justify-between ${
                          isCompleted ? 'border-[#FFD700]/30 hover:border-[#FFD700]/50' : 'border-[#2d2d2d] hover:border-[#444]'
                        }`}
                      >
                        {/* Card Header metadata */}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-mono text-red-400 font-extrabold uppercase bg-red-955/30 border border-red-900/40 px-2 py-0.5 rounded-full inline-block tracking-wider">
                              Kategori Tanding (Combat)
                            </span>
                            <div className="text-white font-bold text-xs capitalize mt-1.5 font-sans">
                              ID: {m.id} • {m.kelas} / {m.kategoriUsia}
                            </div>
                          </div>

                          <div>
                            {isCompleted ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-bold bg-green-950/60 border border-green-800 text-green-400 rounded-full select-text font-sans">
                                <CheckCircle className="w-2.5 h-2.5" />
                                <span>SELESAI</span>
                              </span>
                            ) : m.status === 'Sedang Tanding' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-black bg-red-950 border border-red-900 text-red-500 rounded-full animate-pulse font-sans">
                                <span>LIVE</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold bg-[#262626] border border-[#3c3c3c] text-gray-400 rounded-full font-sans">
                                BELUM MULAI
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Athletes Vs Grid */}
                        <div className="grid grid-cols-2 gap-2 text-center py-2 relative bg-[#0f0f0f] border border-[#252525] p-3 rounded-lg">
                          <div className="space-y-1.5 pr-2 border-r border-[#222]">
                            <span className="text-[8px] font-extrabold tracking-widest text-red-400 block font-sans">SUDUT MERAH</span>
                            <div className="text-white text-xs font-bold font-sans truncate" title={m.pesilatMerah.nama}>
                              {m.pesilatMerah.nama}
                            </div>
                            <div className="text-[9px] text-gray-500 font-sans truncate">
                              {m.pesilatMerah.kontingen}
                            </div>
                            <div className="text-lg font-black text-red-400 font-mono pt-1">
                              {finalM}
                            </div>
                          </div>

                          <div className="space-y-1.5 pl-2">
                            <span className="text-[8px] font-extrabold tracking-widest text-[#FFD700] block font-sans">SUDUT KUNING</span>
                            <div className="text-white text-xs font-bold font-sans truncate" title={m.pesilatKuning.nama}>
                              {m.pesilatKuning.nama}
                            </div>
                            <div className="text-[9px] text-gray-500 font-sans truncate">
                              {m.pesilatKuning.kontingen}
                            </div>
                            <div className="text-lg font-black text-[#FFD700] font-mono pt-1">
                              {finalK}
                            </div>
                          </div>
                        </div>

                        {/* Winner/Verdict Alert Box */}
                        {isCompleted && (
                          <div className="bg-[#3e2e04]/20 border border-[#FFD700]/20 p-2.5 rounded-lg flex items-center space-x-2">
                            <Award className="w-5 h-5 text-[#FFD700] shrink-0" />
                            <div className="font-sans leading-tight">
                              <span className="text-[9px] text-gray-400 block tracking-wide">PEMENANG SAH DEWAN JURI:</span>
                              <span className="text-xs font-bold text-[#FFD700] underline">
                                {m.pemenang === 'Merah' ? m.pesilatMerah.nama : m.pesilatKuning.nama}
                              </span>
                              <span className="text-[9px] text-gray-500 block italic mt-0.5 mt-px text-gray-400">"{m.alasanPemenang}"</span>
                            </div>
                          </div>
                        )}

                        {/* CTA PDF DOWNLOAD EXPORT BUTTON */}
                        <div className="pt-2 border-t border-[#252525] flex items-center gap-2 justify-between">
                          <span className="text-[10px] text-gray-500 font-sans font-normal">Sanksi: {m.penaltiMerah.length + m.penaltiKuning.length} Terdaftar</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setPrintData({ type: 'tanding_detail', id: m.id })}
                              className={`px-2.5 py-1.5 text-[11px] font-sans font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                                isCompleted 
                                  ? 'bg-blue-950/40 text-blue-400 hover:bg-blue-900/20 border border-blue-900/40'
                                  : 'bg-[#222] hover:bg-[#2c2c2c] text-gray-400 hover:text-white border border-[#333]'
                              }`}
                              title="Cetak via Browser"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>{isCompleted ? 'Cetak' : 'Preview'}</span>
                            </button>
                            <button
                              onClick={() => exportTandingPDF(m)}
                              className={`px-2.5 py-1.5 text-[11px] font-sans font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                                isCompleted 
                                  ? 'bg-[#FFD700] hover:bg-yellow-400 text-[#8B0000] font-black shadow-md'
                                  : 'bg-[#222] hover:bg-[#2c2c2c] text-gray-400 hover:text-white border border-[#333]'
                              }`}
                              title="Unduh PDF Resmi (jsPDF)"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Arsip PDF</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const mSeni = item.data;
                    const isCompleted = mSeni.status === 'Selesai';
                    
                    return (
                      <div 
                        key={mSeni.id} 
                        className={`bg-[#181818] rounded-xl p-5 border transition-all hover:translate-y-[-2px] space-y-4 flex flex-col justify-between ${
                          isCompleted ? 'border-[#FFD700]/30 hover:border-[#FFD700]/50' : 'border-[#2d2d2d] hover:border-[#444]'
                        }`}
                      >
                        {/* Card Header metadata */}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-mono text-cyan-400 font-extrabold uppercase bg-cyan-955/30 border border-cyan-900/40 px-2 py-0.5 rounded-full inline-block tracking-wider">
                              Kategori Seni TGRS ({mSeni.kategoriSeni})
                            </span>
                            <div className="text-white font-bold text-xs capitalize mt-1.5 font-sans">
                              ID: {mSeni.id} • {mSeni.pesilat.kategoriUsia}
                            </div>
                          </div>

                          <div>
                            {isCompleted ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-bold bg-green-950/60 border border-green-800 text-green-400 rounded-full select-text font-sans">
                                <CheckCircle className="w-2.5 h-2.5" />
                                <span>SELESAI</span>
                              </span>
                            ) : mSeni.status === 'Sedang Penilaian' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[9px] font-black bg-cyan-950 border border-cyan-900 text-cyan-500 rounded-full animate-pulse font-sans">
                                <span>LIVE</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold bg-[#262626] border border-[#3c3c3c] text-gray-400 rounded-full font-sans">
                                BELUM MULAI
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Artist details */}
                        <div className="bg-[#0f0f0f] border border-[#252525] p-3 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block font-sans">NAMA PESILAT / REGIMENT:</span>
                            <span className="text-xs font-bold text-white block capitalize font-sans leading-tight mt-0.5">{mSeni.pesilat.nama}</span>
                            <span className="text-[10px] text-gray-500 block font-sans mt-0.5 font-normal">{mSeni.pesilat.kontingen}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] font-bold text-[#FFD700] uppercase tracking-wider block font-sans">AVERAGE JURI:</span>
                            <span className="text-lg font-black text-[#FFD700] font-mono block">{mSeni.totalSkorAkhir || '0.00'}</span>
                          </div>
                        </div>

                        {/* Completed Success box */}
                        {isCompleted && (
                          <div className="bg-[#1e3a1e]/15 border border-green-900/30 p-2.5 rounded-lg flex items-center space-x-2">
                            <Award className="w-5 h-5 text-green-400 shrink-0" />
                            <div className="font-sans leading-tight">
                              <span className="text-[9px] text-[#FFD700] uppercase tracking-wider block">MUTASI ARSIP FINALIS</span>
                              <span className="text-xs text-green-300 font-normal block mt-1.5">Skor dewan juri sah tersimpan untuk keperluan sertifikasi dan pemeringkatan kejuaraan.</span>
                            </div>
                          </div>
                        )}

                        {/* CTA PDF DOWNLOAD EXPORT BUTTON */}
                        <div className="pt-2 border-t border-[#252525] flex items-center gap-2 justify-between font-mono text-[10px] text-gray-500">
                          <span className="font-sans font-normal">Kejurda Tapak Suci</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setPrintData({ type: 'seni_detail', id: mSeni.id })}
                              className={`px-2.5 py-1.5 text-[11px] font-sans font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                                isCompleted 
                                  ? 'bg-blue-950/40 text-blue-400 hover:bg-blue-900/20 border border-blue-900/40'
                                  : 'bg-[#222] hover:bg-[#2c2c2c] text-gray-400 hover:text-white border border-[#333]'
                              }`}
                              title="Cetak via Browser"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>{isCompleted ? 'Cetak' : 'Preview'}</span>
                            </button>
                            <button
                              onClick={() => exportSeniPDF(mSeni)}
                              className={`px-2.5 py-1.5 text-[11px] font-sans font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                                isCompleted 
                                  ? 'bg-[#FFD700] hover:bg-yellow-400 text-[#8B0000] font-black shadow-md'
                                  : 'bg-[#222] hover:bg-[#2c2c2c] text-gray-400 hover:text-white border border-[#333]'
                              }`}
                              title="Unduh PDF Resmi (jsPDF)"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Arsip PDF</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}

                {filteredMatches.length === 0 && (
                  <div className="col-span-2 text-center py-10 border border-dashed border-[#2d2d2d] rounded-xl">
                    <p className="text-xs text-gray-500 italic font-sans font-normal">Tidak ditemukan lembar pertandingan yang sesuai dengan kriteria filter.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PRINT CONTAINER SIBLING (Only renders/displayed under print) */}
      {printData && (
        <div id="print-container" className="hidden print:block bg-white text-black p-10 font-sans min-h-screen">
          <style>{`
            @media print {
              body {
                background-color: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .print-page-break {
                page-break-before: always;
              }
            }
          `}</style>
          {printData.type === 'tanding_detail' && renderTandingDetailPrint(printData.id)}
          {printData.type === 'seni_detail' && renderSeniDetailPrint(printData.id)}
        </div>
      )}
    </>
  );
};
