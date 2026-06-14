import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Pesilat, MatchTandingState, MatchSeniState, KategoriUsia, Ronde, JurusTandingPoint, DewanPenalti, JuriSeniScore, JuriTandingScore, TipePertandingan } from '../types';
import { INITIAL_PESILAT, INITIAL_MATCHES_TANDING, INITIAL_MATCHES_SENI, DURASI_RONDE } from '../data';

interface AppContextType {
  pesilatList: Pesilat[];
  matchesTanding: MatchTandingState[];
  matchesSeni: MatchSeniState[];
  activeTandingId: string | null;
  activeSeniId: string | null;
  juriId: number | null;
  isJuriSeni: boolean;
  autoActivateBySchedule: boolean;
  setAutoActivateBySchedule: (val: boolean) => void;
  
  // Actions
  addPesilat: (p: Omit<Pesilat, 'id'>) => void;
  deletePesilat: (id: string) => void;
  createMatchTanding: (merahId: string, kuningId: string, kelas: string, kategoriUsia: KategoriUsia, babak?: 'Penyisihan' | 'Semi Final' | 'Final') => void;
  createMatchSeni: (pesilatId: string, kategoriSeni: 'Tunggal' | 'Ganda' | 'Regu' | 'Solo Kreatif') => void;
  setActiveTandingId: (id: string | null) => void;
  setActiveSeniId: (id: string | null) => void;
  loginAsJuri: (juriId: number | null, isSeni: boolean) => void;
  updateMatchBabak: (matchId: string, babak: 'Penyisihan' | 'Semi Final' | 'Final') => void;
  
  // Timer Actions
  setTandingTimerState: (id: string, isRunning: boolean, secondsRemaining: number) => void;
  setSeniTimerState: (id: string, isRunning: boolean, secondsElapsed: number) => void;
  changeRondeTanding: (id: string, ronde: Ronde) => void;
  
  // Tanding Scoring
  addTandingPoint: (
    matchId: string,
    juriId: number,
    sudut: 'Merah' | 'Kuning',
    tipe: 'Katak' | 'Ikan Terbang' | 'Terkaman' | 'Mawar Lepas Terkaman',
    nilaiX?: number
  ) => void;
  undoTandingPoint: (matchId: string, juriId: number, sudut: 'Merah' | 'Kuning') => void;
  
  // Dewan Penalties & Deciders
  addDewanPenalti: (
    matchId: string,
    sudut: 'Merah' | 'Kuning',
    jenis: 'Teguran' | 'Peringatan' | 'Pelanggaran' | 'Jatuhan' | 'Mawar Lepas Terkaman',
    customPoin?: number
  ) => void;
  undoDewanPenalti: (matchId: string, sudut: 'Merah' | 'Kuning') => void;
  finishMatchTanding: (matchId: string, pemenang: 'Merah' | 'Kuning', alasan: string) => void;
  
  // Seni Scoring & Administration
  submitSeniScore: (
    matchId: string,
    juriId: number,
    inputs: {
      skorJurus: number;
      jumlahKesalahan: number;
      skorKemantapan: number;
      penguranganHukuman: number;
      catatan?: string;
      nilaiA?: number;
      nilaiB?: number;
      nilaiTeknik?: number;
      nilaiKetegasan?: number;
      nilaiPenjiwaan?: number;
    }
  ) => void;
  finishMatchSeni: (matchId: string) => void;
  updateMatchSchedule: (matchId: string, isSeni: boolean, scheduledDate: string, scheduledTime: string) => void;
  
  // Reset
  resetDatabase: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'tapak_suci_scoring_v1';

interface StorageState {
  pesilatList: Pesilat[];
  matchesTanding: MatchTandingState[];
  matchesSeni: MatchSeniState[];
  activeTandingId: string | null;
  activeSeniId: string | null;
  autoActivateBySchedule?: boolean;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pesilatList, setPesilatList] = useState<Pesilat[]>([]);
  const [matchesTanding, setMatchesTanding] = useState<MatchTandingState[]>([]);
  const [matchesSeni, setMatchesSeni] = useState<MatchSeniState[]>([]);
  const [activeTandingId, setActiveTandingIdState] = useState<string | null>(null);
  const [activeSeniId, setActiveSeniIdState] = useState<string | null>(null);
  const [autoActivateBySchedule, setAutoActivateByScheduleState] = useState<boolean>(true);
  
  // Juri login info is local to the tab (does not sync across display, for safety, but can be maintained)
  const [juriId, setJuriId] = useState<number | null>(() => {
    const saved = localStorage.getItem('tapak_suci_juri_id');
    return saved ? parseInt(saved, 10) : null;
  });
  const [isJuriSeni, setIsJuriSeni] = useState<boolean>(() => {
    return localStorage.getItem('tapak_suci_juri_seni') === 'true';
  });

  // Load initial state
  useEffect(() => {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState) as StorageState;
        setPesilatList(parsed.pesilatList || INITIAL_PESILAT);
        setMatchesTanding(parsed.matchesTanding || INITIAL_MATCHES_TANDING);
        setMatchesSeni(parsed.matchesSeni || INITIAL_MATCHES_SENI);
        setActiveTandingIdState(parsed.activeTandingId || null);
        setActiveSeniIdState(parsed.activeSeniId || null);
        setAutoActivateByScheduleState(parsed.autoActivateBySchedule !== undefined ? parsed.autoActivateBySchedule : true);
      } catch (e) {
        console.error('Failed to parse saved state, loading defaults', e);
        loadDefaults();
      }
    } else {
      loadDefaults();
    }
  }, []);

  const loadDefaults = () => {
    setPesilatList(INITIAL_PESILAT);
    setMatchesTanding(INITIAL_MATCHES_TANDING);
    setMatchesSeni(INITIAL_MATCHES_SENI);
    setActiveTandingIdState(INITIAL_MATCHES_TANDING[0]?.id || null);
    setActiveSeniIdState(INITIAL_MATCHES_SENI[0]?.id || null);
    setAutoActivateByScheduleState(true);
    
    const defaults: StorageState = {
      pesilatList: INITIAL_PESILAT,
      matchesTanding: INITIAL_MATCHES_TANDING,
      matchesSeni: INITIAL_MATCHES_SENI,
      activeTandingId: INITIAL_MATCHES_TANDING[0]?.id || null,
      activeSeniId: INITIAL_MATCHES_SENI[0]?.id || null,
      autoActivateBySchedule: true,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaults));
  };

  // Sync with other tabs in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as StorageState;
          if (parsed.pesilatList) setPesilatList(parsed.pesilatList);
          if (parsed.matchesTanding) setMatchesTanding(parsed.matchesTanding);
          if (parsed.matchesSeni) setMatchesSeni(parsed.matchesSeni);
          if (parsed.activeTandingId !== undefined) setActiveTandingIdState(parsed.activeTandingId);
          if (parsed.activeSeniId !== undefined) setActiveSeniIdState(parsed.activeSeniId);
          if (parsed.autoActivateBySchedule !== undefined) setAutoActivateByScheduleState(parsed.autoActivateBySchedule);
          lastStateStringRef.current = e.newValue;
        } catch (err) {
          console.error(err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Resilient High-Frequency Polling Synchronization Fallback
  const lastStateStringRef = useRef<string | null>(null);

  useEffect(() => {
    // Initial ref priming
    const currentInit = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (currentInit) {
      lastStateStringRef.current = currentInit;
    }

    const pollingLock = setInterval(() => {
      const savedStateStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedStateStr && savedStateStr !== lastStateStringRef.current) {
        lastStateStringRef.current = savedStateStr;
        try {
          const parsed = JSON.parse(savedStateStr) as StorageState;
          if (parsed.pesilatList) setPesilatList(parsed.pesilatList);
          if (parsed.matchesTanding) setMatchesTanding(parsed.matchesTanding);
          if (parsed.matchesSeni) setMatchesSeni(parsed.matchesSeni);
          if (parsed.activeTandingId !== undefined) setActiveTandingIdState(parsed.activeTandingId);
          if (parsed.activeSeniId !== undefined) setActiveSeniIdState(parsed.activeSeniId);
          if (parsed.autoActivateBySchedule !== undefined) setAutoActivateByScheduleState(parsed.autoActivateBySchedule);
        } catch (err) {
          console.error('[Polling Sync Error]:', err);
        }
      }
    }, 450); // Checks every 450ms for low-latency non-blocking sync

    return () => clearInterval(pollingLock);
  }, []);

  // Standard save helper
  const saveState = (
    updatedPesilat: Pesilat[],
    updatedTanding: MatchTandingState[],
    updatedSeni: MatchSeniState[],
    actT: string | null,
    actS: string | null,
    autoActive?: boolean
  ) => {
    const val = autoActive !== undefined ? autoActive : autoActivateBySchedule;
    const state: StorageState = {
      pesilatList: updatedPesilat,
      matchesTanding: updatedTanding,
      matchesSeni: updatedSeni,
      activeTandingId: actT,
      activeSeniId: actS,
      autoActivateBySchedule: val,
    };
    const serialized = JSON.stringify(state);
    localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
    lastStateStringRef.current = serialized;
    // Also trigger custom event for same-tab updates
    window.dispatchEvent(new Event('storage_local_update'));
  };

  // Subscribe to same-tab custom updates
  useEffect(() => {
    const onLocalUpdate = () => {
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState) as StorageState;
          setPesilatList(parsed.pesilatList);
          setMatchesTanding(parsed.matchesTanding);
          setMatchesSeni(parsed.matchesSeni);
          setActiveTandingIdState(parsed.activeTandingId);
          setActiveSeniIdState(parsed.activeSeniId);
          if (parsed.autoActivateBySchedule !== undefined) setAutoActivateByScheduleState(parsed.autoActivateBySchedule);
          lastStateStringRef.current = savedState;
        } catch (err) {
          console.error(err);
        }
      }
    };
    window.addEventListener('storage_local_update', onLocalUpdate);
    return () => window.removeEventListener('storage_local_update', onLocalUpdate);
  }, []);

  // Action: Add Pesilat
  const addPesilat = (p: Omit<Pesilat, 'id'>) => {
    const newPesilat: Pesilat = {
      ...p,
      id: 'p_' + Date.now().toString(36),
    };
    const newList = [...pesilatList, newPesilat];
    setPesilatList(newList);
    saveState(newList, matchesTanding, matchesSeni, activeTandingId, activeSeniId);
  };

  // Action: Delete Pesilat
  const deletePesilat = (id: string) => {
    const newList = pesilatList.filter(item => item.id !== id);
    setPesilatList(newList);
    saveState(newList, matchesTanding, matchesSeni, activeTandingId, activeSeniId);
  };

  // Action: Create Match Tanding
  const createMatchTanding = (merahId: string, kuningId: string, kelas: string, kategoriUsia: KategoriUsia, babak: 'Penyisihan' | 'Semi Final' | 'Final' = 'Penyisihan') => {
    const pesilatMerah = pesilatList.find(p => p.id === merahId);
    const pesilatKuning = pesilatList.find(p => p.id === kuningId);
    if (!pesilatMerah || !pesilatKuning) return;

    const newMatch: MatchTandingState = {
      id: 'mt_' + Date.now().toString(36),
      pesilatMerah,
      pesilatKuning,
      kelas,
      kategoriUsia,
      status: 'Belum Dimulai',
      rondeAktif: '1',
      waktuSisa: DURASI_RONDE[kategoriUsia],
      timerBerjalan: false,
      skorJuri: {
        1: { juriId: 1, poinMerah: [], poinKuning: [] },
        2: { juriId: 2, poinMerah: [], poinKuning: [] },
        3: { juriId: 3, poinMerah: [], poinKuning: [] },
        4: { juriId: 4, poinMerah: [], poinKuning: [] },
      },
      penaltiMerah: [],
      penaltiKuning: [],
      babak,
      scheduledDate: '2026-06-12',
      scheduledTime: `${10 + Math.floor(matchesTanding.length / 4)}:00`,
    };

    const updated = [...matchesTanding, newMatch];
    setMatchesTanding(updated);
    // Auto set active if none
    const nextActive = activeTandingId || newMatch.id;
    if (!activeTandingId) setActiveTandingIdState(nextActive);
    saveState(pesilatList, updated, matchesSeni, nextActive, activeSeniId);
  };

  // Action: Create Match Seni
  const createMatchSeni = (pesilatId: string, kategoriSeni: 'Tunggal' | 'Ganda' | 'Regu' | 'Solo Kreatif') => {
    const pesilat = pesilatList.find(p => p.id === pesilatId);
    if (!pesilat) return;

    const isTunggalRegu = kategoriSeni === 'Tunggal' || kategoriSeni === 'Regu';

    const defaultScore = isTunggalRegu ? {
      juriId: 1,
      skorJurus: 9.90, // Nilai A
      jumlahKesalahan: 0,
      skorKemantapan: 0.08, // Nilai B
      penguranganHukuman: 0,
      totalSkor: 9.98,
      nilaiA: 9.90,
      nilaiB: 0.08,
    } : {
      juriId: 1,
      skorJurus: 0.25, // Nilai Teknik
      jumlahKesalahan: 0,
      skorKemantapan: 0.25, // Nilai Ketegasan
      penguranganHukuman: 0,
      totalSkor: 9.85,
      nilaiTeknik: 0.25,
      nilaiKetegasan: 0.25,
      nilaiPenjiwaan: 0.25,
    };

    const newMatch: MatchSeniState = {
      id: 'ms_' + Date.now().toString(36),
      pesilat,
      kategoriSeni,
      status: 'Belum Dimulai',
      timerBerjalan: false,
      waktuBerjalan: 0,
      skorJuri: {
        1: { ...defaultScore, juriId: 1 },
        2: { ...defaultScore, juriId: 2 },
        3: { ...defaultScore, juriId: 3 },
        4: { ...defaultScore, juriId: 4 },
      },
      totalSkorAkhir: isTunggalRegu ? 9.98 : 9.85,
      scheduledDate: '2026-06-12',
      scheduledTime: `${13 + Math.floor(matchesSeni.length / 4)}:00`,
    };

    const updated = [...matchesSeni, newMatch];
    setMatchesSeni(updated);
    const nextActive = activeSeniId || newMatch.id;
    if (!activeSeniId) setActiveSeniIdState(nextActive);
    saveState(pesilatList, matchesTanding, updated, activeTandingId, nextActive);
  };

  const setActiveTandingId = (id: string | null) => {
    setActiveTandingIdState(id);
    saveState(pesilatList, matchesTanding, matchesSeni, id, activeSeniId);
  };

  const setActiveSeniId = (id: string | null) => {
    setActiveSeniIdState(id);
    saveState(pesilatList, matchesTanding, matchesSeni, activeTandingId, id);
  };

  const loginAsJuri = (id: number | null, isSeni: boolean) => {
    setJuriId(id);
    setIsJuriSeni(isSeni);
    if (id !== null) {
      localStorage.setItem('tapak_suci_juri_id', id.toString());
      localStorage.setItem('tapak_suci_juri_seni', isSeni ? 'true' : 'false');
    } else {
      if (juriId) {
        localStorage.removeItem(`tapak_suci_juri_heartbeat_${juriId}`);
        localStorage.removeItem(`tapak_suci_juri_type_${juriId}`);
      }
      localStorage.removeItem('tapak_suci_juri_id');
      localStorage.removeItem('tapak_suci_juri_seni');
    }
  };

  // Timer: Set Tanding Timer state
  const setTandingTimerState = (id: string, isRunning: boolean, secondsRemaining: number) => {
    const updated = matchesTanding.map(m => {
      if (m.id === id) {
        return {
          ...m,
          timerBerjalan: isRunning,
          waktuSisa: secondsRemaining,
          status: isRunning ? ('Sedang Tanding' as const) : m.status,
        };
      }
      return m;
    });
    setMatchesTanding(updated);
    saveState(pesilatList, updated, matchesSeni, activeTandingId, activeSeniId);
  };

  // Timer: Set Seni Timer state
  const setSeniTimerState = (id: string, isRunning: boolean, secondsElapsed: number) => {
    const updated = matchesSeni.map(m => {
      if (m.id === id) {
        return {
          ...m,
          timerBerjalan: isRunning,
          waktuBerjalan: secondsElapsed,
          status: isRunning ? ('Sedang Penilaian' as const) : m.status,
        };
      }
      return m;
    });
    setMatchesSeni(updated);
    saveState(pesilatList, matchesTanding, updated, activeTandingId, activeSeniId);
  };

  // Timer: Change Ronde Tanding
  const changeRondeTanding = (id: string, ronde: Ronde) => {
    const updated = matchesTanding.map(m => {
      if (m.id === id) {
        return {
          ...m,
          rondeAktif: ronde,
          waktuSisa: DURASI_RONDE[m.kategoriUsia],
          timerBerjalan: false,
        };
      }
      return m;
    });
    setMatchesTanding(updated);
    saveState(pesilatList, updated, matchesSeni, activeTandingId, activeSeniId);
  };

  // Scoring: Add Point Tanding
  const addTandingPoint = (
    matchId: string,
    juriId: number,
    sudut: 'Merah' | 'Kuning',
    tipe: 'Katak' | 'Ikan Terbang' | 'Terkaman' | 'Mawar Lepas Terkaman',
    nilaiX: number = 0
  ) => {
    const updated = matchesTanding.map(m => {
      if (m.id === matchId) {
        // Base scores
        let basePoin = 0;
        switch (tipe) {
          case 'Katak':
            basePoin = 10;
            break;
          case 'Ikan Terbang':
            basePoin = 20;
            break;
          case 'Terkaman':
            basePoin = 30;
            break;
          case 'Mawar Lepas Terkaman':
            basePoin = 10 + nilaiX;
            break;
        }

        const newPoint: JurusTandingPoint = {
          id: 'pt_' + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          ronde: m.rondeAktif,
          tipe,
          poin: basePoin,
          juriId,
          nilaiX: tipe === 'Mawar Lepas Terkaman' ? nilaiX : undefined,
        };

        const currentSkor = { ...m.skorJuri };
        const juriScore = currentSkor[juriId] || { juriId, poinMerah: [], poinKuning: [] };

        if (sudut === 'Merah') {
          juriScore.poinMerah = [...juriScore.poinMerah, newPoint];
        } else {
          juriScore.poinKuning = [...juriScore.poinKuning, newPoint];
        }

        currentSkor[juriId] = juriScore;

        return {
          ...m,
          skorJuri: currentSkor,
        };
      }
      return m;
    });

    setMatchesTanding(updated);
    saveState(pesilatList, updated, matchesSeni, activeTandingId, activeSeniId);
  };

  // Scoring: Undo Point Tanding
  const undoTandingPoint = (matchId: string, juriId: number, sudut: 'Merah' | 'Kuning') => {
    const updated = matchesTanding.map(m => {
      if (m.id === matchId) {
        const currentSkor = { ...m.skorJuri };
        const juriScore = currentSkor[juriId];
        if (!juriScore) return m;

        if (sudut === 'Merah' && juriScore.poinMerah.length > 0) {
          juriScore.poinMerah = juriScore.poinMerah.slice(0, -1);
        } else if (sudut === 'Kuning' && juriScore.poinKuning.length > 0) {
          juriScore.poinKuning = juriScore.poinKuning.slice(0, -1);
        }

        currentSkor[juriId] = juriScore;
        return { ...m, skorJuri: currentSkor };
      }
      return m;
    });

    setMatchesTanding(updated);
    saveState(pesilatList, updated, matchesSeni, activeTandingId, activeSeniId);
  };

  // Scoring: Add Dewan Penalti
  const addDewanPenalti = (
    matchId: string,
    sudut: 'Merah' | 'Kuning',
    jenis: 'Teguran' | 'Peringatan' | 'Pelanggaran' | 'Jatuhan' | 'Mawar Lepas Terkaman',
    customPoin?: number
  ) => {
    const updated = matchesTanding.map(m => {
      if (m.id === matchId) {
        let poin = 0;
        let countSameType = 0;

        if (sudut === 'Merah') {
          countSameType = m.penaltiMerah.filter(p => p.jenis === jenis).length + 1;
        } else {
          countSameType = m.penaltiKuning.filter(p => p.jenis === jenis).length + 1;
        }

        switch (jenis) {
          case 'Teguran':
            // Teguran 1: -1, Teguran 2: -2
            poin = countSameType === 1 ? -1 : -2;
            break;
          case 'Peringatan':
            // Peringatan 1: -5, Peringatan 2: -10
            poin = countSameType === 1 ? -5 : -10;
            break;
          case 'Pelanggaran':
            // Pelanggaran 1: -10, Pelanggaran 2: -20
            poin = countSameType === 1 ? -10 : -20;
            break;
          case 'Jatuhan':
            // Jatuhan: +3
            poin = 3;
            break;
          case 'Mawar Lepas Terkaman':
            // Mawar Lepas Terkaman: 10 + nilaiX
            poin = customPoin !== undefined ? customPoin : 15;
            break;
        }

        const penalti: DewanPenalti = {
          id: 'pn_' + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          ronde: m.rondeAktif,
          jenis,
          tingkat: (jenis !== 'Jatuhan' && jenis !== 'Mawar Lepas Terkaman') ? countSameType : undefined,
          poin,
        };

        if (sudut === 'Merah') {
          return {
            ...m,
            penaltiMerah: [...m.penaltiMerah, penalti],
          };
        } else {
          return {
            ...m,
            penaltiKuning: [...m.penaltiKuning, penalti],
          };
        }
      }
      return m;
    });

    setMatchesTanding(updated);
    saveState(pesilatList, updated, matchesSeni, activeTandingId, activeSeniId);
  };

  // Scoring: Undo Dewan Penalti
  const undoDewanPenalti = (matchId: string, sudut: 'Merah' | 'Kuning') => {
    const updated = matchesTanding.map(m => {
      if (m.id === matchId) {
        if (sudut === 'Merah' && m.penaltiMerah.length > 0) {
          return {
            ...m,
            penaltiMerah: m.penaltiMerah.slice(0, -1),
          };
        } else if (sudut === 'Kuning' && m.penaltiKuning.length > 0) {
          return {
            ...m,
            penaltiKuning: m.penaltiKuning.slice(0, -1),
          };
        }
      }
      return m;
    });

    setMatchesTanding(updated);
    saveState(pesilatList, updated, matchesSeni, activeTandingId, activeSeniId);
  };

  // Finish Match Tanding
  const finishMatchTanding = (matchId: string, pemenang: 'Merah' | 'Kuning', alasan: string) => {
    const updated = matchesTanding.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          status: 'Selesai' as const,
          timerBerjalan: false,
          pemenang,
          alasanPemenang: alasan,
        };
      }
      return m;
    });

    setMatchesTanding(updated);
    saveState(pesilatList, updated, matchesSeni, activeTandingId, activeSeniId);
  };

  // Submit Juri Seni Score
  const submitSeniScore = (
    matchId: string,
    juriId: number,
    inputs: {
      skorJurus: number;
      jumlahKesalahan: number;
      skorKemantapan: number;
      penguranganHukuman: number;
      catatan?: string;
      nilaiA?: number;
      nilaiB?: number;
      nilaiTeknik?: number;
      nilaiKetegasan?: number;
      nilaiPenjiwaan?: number;
    }
  ) => {
    const updated = matchesSeni.map(m => {
      if (m.id === matchId) {
        const currentSkor = { ...m.skorJuri };
        const isTunggalRegu = m.kategoriSeni === 'Tunggal' || m.kategoriSeni === 'Regu';
        
        let calculatedTotal = 0;
        let finalScoreObj: any = {
          juriId,
          jumlahKesalahan: inputs.jumlahKesalahan,
          penguranganHukuman: inputs.penguranganHukuman,
          catatan: inputs.catatan,
        };

        if (isTunggalRegu) {
          const nA = inputs.nilaiA !== undefined ? inputs.nilaiA : parseFloat((9.90 - inputs.jumlahKesalahan * 0.01).toFixed(2));
          const nB = inputs.nilaiB !== undefined ? inputs.nilaiB : inputs.skorKemantapan;
          calculatedTotal = parseFloat((nA + nB - inputs.penguranganHukuman).toFixed(2));
          
          finalScoreObj = {
            ...finalScoreObj,
            nilaiA: nA,
            nilaiB: nB,
            skorJurus: nA, // Keep updated for backward compatibility
            skorKemantapan: nB, // Keep updated for backward compatibility
            totalSkor: calculatedTotal,
          };
        } else {
          const nTeknik = inputs.nilaiTeknik !== undefined ? inputs.nilaiTeknik : inputs.skorJurus;
          const nKetegasan = inputs.nilaiKetegasan !== undefined ? inputs.nilaiKetegasan : inputs.skorKemantapan;
          const nPenjiwaan = inputs.nilaiPenjiwaan !== undefined ? inputs.nilaiPenjiwaan : 0.25;
          calculatedTotal = parseFloat((9.10 + nTeknik + nKetegasan + nPenjiwaan - inputs.penguranganHukuman).toFixed(2));

          finalScoreObj = {
            ...finalScoreObj,
            nilaiTeknik: nTeknik,
            nilaiKetegasan: nKetegasan,
            nilaiPenjiwaan: nPenjiwaan,
            skorJurus: nTeknik, // Map for backward compatibility
            skorKemantapan: nKetegasan, // Map for backward compatibility
            totalSkor: calculatedTotal,
          };
        }

        currentSkor[juriId] = finalScoreObj;

        // Rekalkulasi total skor akhir (rata-rata dari juri yang sudah mengisi)
        const juriIds = Object.keys(currentSkor).map(id => parseInt(id, 10));
        let sum = 0;
        let count = 0;
        juriIds.forEach(id => {
          if (currentSkor[id]) {
            sum += currentSkor[id].totalSkor;
            count++;
          }
        });

        const totalSkorAkhir = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;

        return {
          ...m,
          skorJuri: currentSkor,
          totalSkorAkhir,
        };
      }
      return m;
    });

    setMatchesSeni(updated);
    saveState(pesilatList, matchesTanding, updated, activeTandingId, activeSeniId);
  };

  // Finish Match Seni
  const finishMatchSeni = (matchId: string) => {
    const updated = matchesSeni.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          status: 'Selesai' as const,
          timerBerjalan: false,
        };
      }
      return m;
    });

    setMatchesSeni(updated);
    saveState(pesilatList, matchesTanding, updated, activeTandingId, activeSeniId);
  };

  // Update match schedule
  const updateMatchSchedule = (matchId: string, isSeni: boolean, scheduledDate: string, scheduledTime: string) => {
    if (isSeni) {
      const updated = matchesSeni.map(m => {
        if (m.id === matchId) {
          return { ...m, scheduledDate, scheduledTime };
        }
        return m;
      });
      setMatchesSeni(updated);
      saveState(pesilatList, matchesTanding, updated, activeTandingId, activeSeniId);
    } else {
      const updated = matchesTanding.map(m => {
        if (m.id === matchId) {
          return { ...m, scheduledDate, scheduledTime };
        }
        return m;
      });
      setMatchesTanding(updated);
      saveState(pesilatList, updated, matchesSeni, activeTandingId, activeSeniId);
    }
  };

  const updateMatchBabak = (matchId: string, babak: 'Penyisihan' | 'Semi Final' | 'Final') => {
    const updated = matchesTanding.map(m => {
      if (m.id === matchId) {
        return { ...m, babak };
      }
      return m;
    });
    setMatchesTanding(updated);
    saveState(pesilatList, updated, matchesSeni, activeTandingId, activeSeniId);
  };

  // Automatic activation pool based on schedules
  useEffect(() => {
    if (!autoActivateBySchedule) return;

    // 1. Auto Tanding Match Activation
    const liveTanding = matchesTanding.find(m => m.status === 'Sedang Tanding');
    if (liveTanding) {
      if (activeTandingId !== liveTanding.id) {
        setActiveTandingIdState(liveTanding.id);
        saveState(pesilatList, matchesTanding, matchesSeni, liveTanding.id, activeSeniId);
      }
    } else {
      const pendingTanding = [...matchesTanding]
        .filter(m => m.status !== 'Selesai')
        .sort((a, b) => {
          const dateA = a.scheduledDate || '2026-06-12';
          const dateB = b.scheduledDate || '2026-06-12';
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          
          const timeA = a.scheduledTime || '10:00';
          const timeB = b.scheduledTime || '10:00';
          return timeA.localeCompare(timeB);
        });

      if (pendingTanding.length > 0) {
        if (activeTandingId !== pendingTanding[0].id) {
          setActiveTandingIdState(pendingTanding[0].id);
          saveState(pesilatList, matchesTanding, matchesSeni, pendingTanding[0].id, activeSeniId);
        }
      }
    }

    // 2. Auto Seni Match Activation
    const liveSeni = matchesSeni.find(m => m.status === 'Sedang Penilaian');
    if (liveSeni) {
      if (activeSeniId !== liveSeni.id) {
        setActiveSeniIdState(liveSeni.id);
        saveState(pesilatList, matchesTanding, matchesSeni, activeTandingId, liveSeni.id);
      }
    } else {
      const pendingSeni = [...matchesSeni]
        .filter(m => m.status !== 'Selesai')
        .sort((a, b) => {
          const dateA = a.scheduledDate || '2026-06-12';
          const dateB = b.scheduledDate || '2026-06-12';
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          
          const timeA = a.scheduledTime || '14:00';
          const timeB = b.scheduledTime || '14:00';
          return timeA.localeCompare(timeB);
        });

      if (pendingSeni.length > 0) {
        if (activeSeniId !== pendingSeni[0].id) {
          setActiveSeniIdState(pendingSeni[0].id);
          saveState(pesilatList, matchesTanding, matchesSeni, activeTandingId, pendingSeni[0].id);
        }
      }
    }
  }, [matchesTanding, matchesSeni, activeTandingId, activeSeniId, autoActivateBySchedule]);

  const setAutoActivateBySchedule = (val: boolean) => {
    setAutoActivateByScheduleState(val);
    saveState(pesilatList, matchesTanding, matchesSeni, activeTandingId, activeSeniId, val);
  };

  // Reset database to initial
  const resetDatabase = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    loadDefaults();
  };

  // Periodic judge heartbeat update
  useEffect(() => {
    if (juriId !== null) {
      const updateHeartbeat = () => {
        try {
          localStorage.setItem(`tapak_suci_juri_heartbeat_${juriId}`, Date.now().toString());
          localStorage.setItem(`tapak_suci_juri_type_${juriId}`, isJuriSeni ? 'Seni' : 'Tanding');
        } catch (e) {
          console.error('Error writing juri heartbeat', e);
        }
      };

      updateHeartbeat();
      const heartbeatInterval = setInterval(updateHeartbeat, 2000);

      return () => {
        clearInterval(heartbeatInterval);
        try {
          localStorage.removeItem(`tapak_suci_juri_heartbeat_${juriId}`);
          localStorage.removeItem(`tapak_suci_juri_type_${juriId}`);
        } catch (e) {}
      };
    }
  }, [juriId, isJuriSeni]);

  return (
    <AppContext.Provider
      value={{
        pesilatList,
        matchesTanding,
        matchesSeni,
        activeTandingId,
        activeSeniId,
        juriId,
        isJuriSeni,
        autoActivateBySchedule,
        setAutoActivateBySchedule,
        
        addPesilat,
        deletePesilat,
        createMatchTanding,
        createMatchSeni,
        setActiveTandingId,
        setActiveSeniId,
        loginAsJuri,
        updateMatchBabak,
        
        setTandingTimerState,
        setSeniTimerState,
        changeRondeTanding,
        
        addTandingPoint,
        undoTandingPoint,
        
        addDewanPenalti,
        undoDewanPenalti,
        finishMatchTanding,
        
        submitSeniScore,
        finishMatchSeni,
        updateMatchSchedule,
        
        resetDatabase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
};
