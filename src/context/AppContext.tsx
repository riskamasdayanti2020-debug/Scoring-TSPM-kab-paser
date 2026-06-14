import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Pesilat, MatchTandingState, MatchSeniState, KategoriUsia, Ronde, JurusTandingPoint, DewanPenalti, JuriSeniScore, JuriTandingScore, TipePertandingan } from '../types';
import { INITIAL_PESILAT, INITIAL_MATCHES_TANDING, INITIAL_MATCHES_SENI, DURASI_RONDE } from '../data';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, getDocFromServer, getDocs } from 'firebase/firestore';

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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pesilatList, setPesilatList] = useState<Pesilat[]>([]);
  const [matchesTanding, setMatchesTanding] = useState<MatchTandingState[]>([]);
  const [matchesSeni, setMatchesSeni] = useState<MatchSeniState[]>([]);
  const [activeTandingId, setActiveTandingIdState] = useState<string | null>(null);
  const [activeSeniId, setActiveSeniIdState] = useState<string | null>(null);
  const [autoActivateBySchedule, setAutoActivateByScheduleState] = useState<boolean>(true);
  
  // Juri login info is local to the tab
  const [juriId, setJuriId] = useState<number | null>(() => {
    const saved = localStorage.getItem('tapak_suci_juri_id');
    return saved ? parseInt(saved, 10) : null;
  });
  const [isJuriSeni, setIsJuriSeni] = useState<boolean>(() => {
    return localStorage.getItem('tapak_suci_juri_seni') === 'true';
  });

  // Verify/test Firestore connection once on initial boot as required by the skill
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'metadata', 'global'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Real-time Cloud Firestore synchronization of all collections
  useEffect(() => {
    let unsubPesilat: any = null;
    let unsubMatchesTanding: any = null;
    let unsubMatchesSeni: any = null;
    let unsubMetadata: any = null;

    try {
      // 1. Pesilat list listener & seeder
      unsubPesilat = onSnapshot(collection(db, 'pesilat'), (snapshot) => {
        const list: Pesilat[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Pesilat);
        });
        
        if (list.length > 0) {
          setPesilatList(list);
        } else if (!snapshot.metadata.fromCache) {
          // Empty on server - Seed initial mock data
          INITIAL_PESILAT.forEach(async (p) => {
            try {
              await setDoc(doc(db, 'pesilat', p.id), p);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `pesilat/${p.id}`);
            }
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'pesilat');
      });

      // 2. Matches Tanding list listener & seeder
      unsubMatchesTanding = onSnapshot(collection(db, 'matchesTanding'), (snapshot) => {
        const list: MatchTandingState[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as MatchTandingState);
        });
        
        if (list.length > 0) {
          setMatchesTanding(list);
        } else if (!snapshot.metadata.fromCache) {
          // Empty on server - Seed initial mock data
          INITIAL_MATCHES_TANDING.forEach(async (m) => {
            try {
              await setDoc(doc(db, 'matchesTanding', m.id), m);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `matchesTanding/${m.id}`);
            }
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'matchesTanding');
      });

      // 3. Matches Seni list listener & seeder
      unsubMatchesSeni = onSnapshot(collection(db, 'matchesSeni'), (snapshot) => {
        const list: MatchSeniState[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as MatchSeniState);
        });
        
        if (list.length > 0) {
          setMatchesSeni(list);
        } else if (!snapshot.metadata.fromCache) {
          // Empty on server - Seed initial mock data
          INITIAL_MATCHES_SENI.forEach(async (m) => {
            try {
              await setDoc(doc(db, 'matchesSeni', m.id), m);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `matchesSeni/${m.id}`);
            }
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'matchesSeni');
      });

      // 4. Metadata values (active match tracking & configuration)
      unsubMetadata = onSnapshot(doc(db, 'metadata', 'global'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.activeTandingId !== undefined) setActiveTandingIdState(data.activeTandingId);
          if (data.activeSeniId !== undefined) setActiveSeniIdState(data.activeSeniId);
          if (data.autoActivateBySchedule !== undefined) setAutoActivateByScheduleState(data.autoActivateBySchedule);
        } else {
          // Seed the metadata document
          const firstTanding = INITIAL_MATCHES_TANDING[0]?.id || null;
          const firstSeni = INITIAL_MATCHES_SENI[0]?.id || null;
          setDoc(doc(db, 'metadata', 'global'), {
            id: 'global',
            activeTandingId: firstTanding,
            activeSeniId: firstSeni,
            autoActivateBySchedule: true
          }).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, 'metadata/global');
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'metadata/global');
      });

    } catch (e) {
      console.error("Failed to connect or subscribe to Firestore", e);
    }

    return () => {
      if (unsubPesilat) unsubPesilat();
      if (unsubMatchesTanding) unsubMatchesTanding();
      if (unsubMatchesSeni) unsubMatchesSeni();
      if (unsubMetadata) unsubMetadata();
    };
  }, []);

  // Standard granular Firestore write operations used in mutations
  const updateMatchTandingFirestore = async (match: MatchTandingState) => {
    try {
      await setDoc(doc(db, 'matchesTanding', match.id), match);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `matchesTanding/${match.id}`);
    }
  };

  const updateMatchSeniFirestore = async (match: MatchSeniState) => {
    try {
      await setDoc(doc(db, 'matchesSeni', match.id), match);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `matchesSeni/${match.id}`);
    }
  };

  const updateGlobalMetadata = async (fields: Partial<{ activeTandingId: string | null, activeSeniId: string | null, autoActivateBySchedule: boolean }>) => {
    try {
      await setDoc(doc(db, 'metadata', 'global'), fields, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'metadata/global');
    }
  };

  // Action: Add Pesilat
  const addPesilat = async (p: Omit<Pesilat, 'id'>) => {
    const newPesilat: Pesilat = {
      ...p,
      id: 'p_' + Date.now().toString(36),
    };
    const newList = [...pesilatList, newPesilat];
    setPesilatList(newList);
    try {
      await setDoc(doc(db, 'pesilat', newPesilat.id), newPesilat);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `pesilat/${newPesilat.id}`);
    }
  };

  // Action: Delete Pesilat
  const deletePesilat = async (id: string) => {
    const newList = pesilatList.filter(item => item.id !== id);
    setPesilatList(newList);
    try {
      await deleteDoc(doc(db, 'pesilat', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `pesilat/${id}`);
    }
  };

  // Action: Create Match Tanding
  const createMatchTanding = async (
    merahId: string, 
    kuningId: string, 
    kelas: string, 
    kategoriUsia: KategoriUsia, 
    babak: 'Penyisihan' | 'Semi Final' | 'Final' = 'Penyisihan'
  ) => {
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
    const nextActive = activeTandingId || newMatch.id;
    if (!activeTandingId) {
      setActiveTandingIdState(nextActive);
      updateGlobalMetadata({ activeTandingId: nextActive });
    }
    try {
      await setDoc(doc(db, 'matchesTanding', newMatch.id), newMatch);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `matchesTanding/${newMatch.id}`);
    }
  };

  // Action: Create Match Seni
  const createMatchSeni = async (pesilatId: string, kategoriSeni: 'Tunggal' | 'Ganda' | 'Regu' | 'Solo Kreatif') => {
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
    if (!activeSeniId) {
      setActiveSeniIdState(nextActive);
      updateGlobalMetadata({ activeSeniId: nextActive });
    }
    try {
      await setDoc(doc(db, 'matchesSeni', newMatch.id), newMatch);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `matchesSeni/${newMatch.id}`);
    }
  };

  const setActiveTandingId = (id: string | null) => {
    setActiveTandingIdState(id);
    updateGlobalMetadata({ activeTandingId: id });
  };

  const setActiveSeniId = (id: string | null) => {
    setActiveSeniIdState(id);
    updateGlobalMetadata({ activeSeniId: id });
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
    const m = matchesTanding.find(match => match.id === id);
    if (!m) return;

    const updatedMatch: MatchTandingState = {
      ...m,
      timerBerjalan: isRunning,
      waktuSisa: secondsRemaining,
      status: isRunning ? ('Sedang Tanding' as const) : m.status,
    };

    const updatedList = matchesTanding.map(item => item.id === id ? updatedMatch : item);
    setMatchesTanding(updatedList);
    updateMatchTandingFirestore(updatedMatch);
  };

  // Timer: Set Seni Timer state
  const setSeniTimerState = (id: string, isRunning: boolean, secondsElapsed: number) => {
    const m = matchesSeni.find(match => match.id === id);
    if (!m) return;

    const updatedMatch: MatchSeniState = {
      ...m,
      timerBerjalan: isRunning,
      waktuBerjalan: secondsElapsed,
      status: isRunning ? ('Sedang Penilaian' as const) : m.status,
    };

    const updatedList = matchesSeni.map(item => item.id === id ? updatedMatch : item);
    setMatchesSeni(updatedList);
    updateMatchSeniFirestore(updatedMatch);
  };

  // Timer: Change Ronde Tanding
  const changeRondeTanding = (id: string, ronde: Ronde) => {
    const m = matchesTanding.find(match => match.id === id);
    if (!m) return;

    const updatedMatch: MatchTandingState = {
      ...m,
      rondeAktif: ronde,
      waktuSisa: DURASI_RONDE[m.kategoriUsia],
      timerBerjalan: false,
    };

    const updatedList = matchesTanding.map(item => item.id === id ? updatedMatch : item);
    setMatchesTanding(updatedList);
    updateMatchTandingFirestore(updatedMatch);
  };

  // Scoring: Add Point Tanding
  const addTandingPoint = (
    matchId: string,
    juriId: number,
    sudut: 'Merah' | 'Kuning',
    tipe: 'Katak' | 'Ikan Terbang' | 'Terkaman' | 'Mawar Lepas Terkaman',
    nilaiX: number = 0
  ) => {
    const m = matchesTanding.find(match => match.id === matchId);
    if (!m) return;

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

    const updatedMatch: MatchTandingState = {
      ...m,
      skorJuri: currentSkor,
    };

    const updatedList = matchesTanding.map(item => item.id === matchId ? updatedMatch : item);
    setMatchesTanding(updatedList);
    updateMatchTandingFirestore(updatedMatch);
  };

  // Scoring: Undo Point Tanding
  const undoTandingPoint = (matchId: string, juriId: number, sudut: 'Merah' | 'Kuning') => {
    const m = matchesTanding.find(match => match.id === matchId);
    if (!m) return;

    const currentSkor = { ...m.skorJuri };
    const juriScore = currentSkor[juriId];
    if (!juriScore) return;

    if (sudut === 'Merah' && juriScore.poinMerah.length > 0) {
      juriScore.poinMerah = juriScore.poinMerah.slice(0, -1);
    } else if (sudut === 'Kuning' && juriScore.poinKuning.length > 0) {
      juriScore.poinKuning = juriScore.poinKuning.slice(0, -1);
    }

    currentSkor[juriId] = juriScore;

    const updatedMatch: MatchTandingState = {
      ...m,
      skorJuri: currentSkor,
    };

    const updatedList = matchesTanding.map(item => item.id === matchId ? updatedMatch : item);
    setMatchesTanding(updatedList);
    updateMatchTandingFirestore(updatedMatch);
  };

  // Scoring: Add Dewan Penalti
  const addDewanPenalti = (
    matchId: string,
    sudut: 'Merah' | 'Kuning',
    jenis: 'Teguran' | 'Peringatan' | 'Pelanggaran' | 'Jatuhan' | 'Mawar Lepas Terkaman',
    customPoin?: number
  ) => {
    const m = matchesTanding.find(match => match.id === matchId);
    if (!m) return;

    let poin = 0;
    let countSameType = 0;

    if (sudut === 'Merah') {
      countSameType = m.penaltiMerah.filter(p => p.jenis === jenis).length + 1;
    } else {
      countSameType = m.penaltiKuning.filter(p => p.jenis === jenis).length + 1;
    }

    switch (jenis) {
      case 'Teguran':
        poin = countSameType === 1 ? -1 : -2;
        break;
      case 'Peringatan':
        poin = countSameType === 1 ? -5 : -10;
        break;
      case 'Pelanggaran':
        poin = countSameType === 1 ? -10 : -20;
        break;
      case 'Jatuhan':
        poin = 3;
        break;
      case 'Mawar Lepas Terkaman':
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

    const updatedMatch: MatchTandingState = {
      ...m,
      penaltiMerah: sudut === 'Merah' ? [...m.penaltiMerah, penalti] : m.penaltiMerah,
      penaltiKuning: sudut === 'Kuning' ? [...m.penaltiKuning, penalti] : m.penaltiKuning,
    };

    const updatedList = matchesTanding.map(item => item.id === matchId ? updatedMatch : item);
    setMatchesTanding(updatedList);
    updateMatchTandingFirestore(updatedMatch);
  };

  // Scoring: Undo Dewan Penalti
  const undoDewanPenalti = (matchId: string, sudut: 'Merah' | 'Kuning') => {
    const m = matchesTanding.find(match => match.id === matchId);
    if (!m) return;

    const updatedMatch: MatchTandingState = {
      ...m,
      penaltiMerah: (sudut === 'Merah' && m.penaltiMerah.length > 0) ? m.penaltiMerah.slice(0, -1) : m.penaltiMerah,
      penaltiKuning: (sudut === 'Kuning' && m.penaltiKuning.length > 0) ? m.penaltiKuning.slice(0, -1) : m.penaltiKuning,
    };

    const updatedList = matchesTanding.map(item => item.id === matchId ? updatedMatch : item);
    setMatchesTanding(updatedList);
    updateMatchTandingFirestore(updatedMatch);
  };

  // Finish Match Tanding
  const finishMatchTanding = (matchId: string, pemenang: 'Merah' | 'Kuning', alasan: string) => {
    const m = matchesTanding.find(match => match.id === matchId);
    if (!m) return;

    const updatedMatch: MatchTandingState = {
      ...m,
      status: 'Selesai' as const,
      timerBerjalan: false,
      pemenang,
      alasanPemenang: alasan,
    };

    const updatedList = matchesTanding.map(item => item.id === matchId ? updatedMatch : item);
    setMatchesTanding(updatedList);
    updateMatchTandingFirestore(updatedMatch);
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
    const m = matchesSeni.find(match => match.id === matchId);
    if (!m) return;

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
        skorJurus: nA,
        skorKemantapan: nB,
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
        skorJurus: nTeknik,
        skorKemantapan: nKetegasan,
        totalSkor: calculatedTotal,
      };
    }

    currentSkor[juriId] = finalScoreObj;

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

    const updatedMatch: MatchSeniState = {
      ...m,
      skorJuri: currentSkor,
      totalSkorAkhir,
    };

    const updatedList = matchesSeni.map(item => item.id === matchId ? updatedMatch : item);
    setMatchesSeni(updatedList);
    updateMatchSeniFirestore(updatedMatch);
  };

  // Finish Match Seni
  const finishMatchSeni = (matchId: string) => {
    const m = matchesSeni.find(match => match.id === matchId);
    if (!m) return;

    const updatedMatch: MatchSeniState = {
      ...m,
      status: 'Selesai' as const,
      timerBerjalan: false,
    };

    const updatedList = matchesSeni.map(item => item.id === matchId ? updatedMatch : item);
    setMatchesSeni(updatedList);
    updateMatchSeniFirestore(updatedMatch);
  };

  // Update match schedule
  const updateMatchSchedule = (matchId: string, isSeni: boolean, scheduledDate: string, scheduledTime: string) => {
    if (isSeni) {
      const m = matchesSeni.find(match => match.id === matchId);
      if (!m) return;
      const updatedMatch = { ...m, scheduledDate, scheduledTime };
      const updatedList = matchesSeni.map(item => item.id === matchId ? updatedMatch : item);
      setMatchesSeni(updatedList);
      updateMatchSeniFirestore(updatedMatch);
    } else {
      const m = matchesTanding.find(match => match.id === matchId);
      if (!m) return;
      const updatedMatch = { ...m, scheduledDate, scheduledTime };
      const updatedList = matchesTanding.map(item => item.id === matchId ? updatedMatch : item);
      setMatchesTanding(updatedList);
      updateMatchTandingFirestore(updatedMatch);
    }
  };

  const updateMatchBabak = (matchId: string, babak: 'Penyisihan' | 'Semi Final' | 'Final') => {
    const m = matchesTanding.find(match => match.id === matchId);
    if (!m) return;

    const updatedMatch: MatchTandingState = { ...m, babak };
    const updatedList = matchesTanding.map(item => item.id === matchId ? updatedMatch : item);
    setMatchesTanding(updatedList);
    updateMatchTandingFirestore(updatedMatch);
  };

  // Automatic activation pool based on schedules
  useEffect(() => {
    if (!autoActivateBySchedule) return;

    // 1. Auto Tanding Match Activation
    const liveTanding = matchesTanding.find(m => m.status === 'Sedang Tanding');
    if (liveTanding) {
      if (activeTandingId !== liveTanding.id) {
        setActiveTandingIdState(liveTanding.id);
        updateGlobalMetadata({ activeTandingId: liveTanding.id });
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
          updateGlobalMetadata({ activeTandingId: pendingTanding[0].id });
        }
      }
    }

    // 2. Auto Seni Match Activation
    const liveSeni = matchesSeni.find(m => m.status === 'Sedang Penilaian');
    if (liveSeni) {
      if (activeSeniId !== liveSeni.id) {
        setActiveSeniIdState(liveSeni.id);
        updateGlobalMetadata({ activeSeniId: liveSeni.id });
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
          updateGlobalMetadata({ activeSeniId: pendingSeni[0].id });
        }
      }
    }
  }, [matchesTanding, matchesSeni, activeTandingId, activeSeniId, autoActivateBySchedule]);

  const setAutoActivateBySchedule = (val: boolean) => {
    setAutoActivateByScheduleState(val);
    updateGlobalMetadata({ autoActivateBySchedule: val });
  };

  // Reset database to initial seeding states
  const resetDatabase = async () => {
    try {
      const pesilatSnap = await getDocs(collection(db, 'pesilat'));
      for (const ds of pesilatSnap.docs) {
        await deleteDoc(doc(db, 'pesilat', ds.id));
      }

      const tandingSnap = await getDocs(collection(db, 'matchesTanding'));
      for (const ds of tandingSnap.docs) {
        await deleteDoc(doc(db, 'matchesTanding', ds.id));
      }

      const seniSnap = await getDocs(collection(db, 'matchesSeni'));
      for (const ds of seniSnap.docs) {
        await deleteDoc(doc(db, 'matchesSeni', ds.id));
      }

      await setDoc(doc(db, 'metadata', 'global'), {
        id: 'global',
        activeTandingId: INITIAL_MATCHES_TANDING[0]?.id || null,
        activeSeniId: INITIAL_MATCHES_SENI[0]?.id || null,
        autoActivateBySchedule: true
      });

      for (const p of INITIAL_PESILAT) {
        await setDoc(doc(db, 'pesilat', p.id), p);
      }
      for (const m of INITIAL_MATCHES_TANDING) {
        await setDoc(doc(db, 'matchesTanding', m.id), m);
      }
      for (const m of INITIAL_MATCHES_SENI) {
        await setDoc(doc(db, 'matchesSeni', m.id), m);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'resetDatabase');
    }
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
