import React, { useState, useEffect } from 'react';
import { useAppState } from '../context/AppContext';
import { KategoriUsia, MatchTandingState, MatchSeniState, Ronde } from '../types';
import { Settings2, PlusCircle, RotateCcw, Award, PlayCircle, Eye, Trash2, Calendar, FileSpreadsheet, Download, Printer, LogOut, ChevronLeft, ChevronRight, Clock, Edit2, X, Check } from 'lucide-react';
import { exportTandingPDF, exportSeniPDF, exportSummaryPDF } from '../utils/pdfExport';

export const Admin: React.FC = () => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('tapak_suci_admin_logged_in') === 'true';
  });
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'admin123') {
      setIsAdminLoggedIn(true);
      localStorage.setItem('tapak_suci_admin_logged_in', 'true');
      setAdminError('');
      setAdminPassword('');
    } else {
      setAdminError('Kata sandi salah! Silakan coba lagi.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('tapak_suci_admin_logged_in');
  };
  const {
    pesilatList,
    matchesTanding,
    matchesSeni,
    activeTandingId,
    activeSeniId,
    createMatchTanding,
    createMatchSeni,
    setActiveTandingId,
    setActiveSeniId,
    resetDatabase,
    updateMatchSchedule,
    autoActivateBySchedule,
    setAutoActivateBySchedule,
  } = useAppState();

  const [tandingMerahId, setTandingMerahId] = useState('');
  const [tandingKuningId, setTandingKuningId] = useState('');
  const [tandingKelas, setTandingKelas] = useState('Kelas A');
  const [tandingKategoriUsia, setTandingKategoriUsia] = useState<KategoriUsia>('Remaja');

  const [seniPesilatId, setSeniPesilatId] = useState('');
  const [seniKategori, setSeniKategori] = useState<'Tunggal' | 'Ganda' | 'Regu' | 'Solo Kreatif'>('Tunggal');

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Dynamic Calendar States
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(5); // 0-indexed: 5 = June
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-06-12'); // default to June 12, 2026

  // Scheduling Reschedule modal state
  const [reschedulingMatch, setReschedulingMatch] = useState<{
    id: string;
    isSeni: boolean;
    title: string;
    date: string;
    time: string;
  } | null>(null);

  // filter tanding athletes and seni athletes
  const tandingPesilats = pesilatList.filter((p) => p.tipe === 'Tanding');
  const seniPesilats = pesilatList.filter((p) => p.tipe === 'Seni');

  // Calendar Engine Helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const padZero = (n: number) => n.toString().padStart(2, '0');

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  const getMatchesForDate = (dateStr: string) => {
    const tanding = matchesTanding.filter((m) => (m.scheduledDate || '2026-06-12') === dateStr);
    const seni = matchesSeni.filter((m) => (m.scheduledDate || '2026-06-12') === dateStr);
    return { tanding, seni, total: tanding.length + seni.length };
  };

  const formatIndonesianDate = (dateStr: string) => {
    try {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const dayName = days[d.getDay()];
      const dayNum = d.getDate();
      const monthName = months[d.getMonth()];
      const year = d.getFullYear();
      
      return `${dayName}, ${dayNum} ${monthName} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleCreateTandingMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tandingMerahId || !tandingKuningId) return;
    if (tandingMerahId === tandingKuningId) {
      alert('Pesilat Merah dan Kuning tidak boleh orang yang sama!');
      return;
    }
    createMatchTanding(tandingMerahId, tandingKuningId, tandingKelas, tandingKategoriUsia);
    setTandingMerahId('');
    setTandingKuningId('');
  };

  const handleCreateSeniMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seniPesilatId) return;
    createMatchSeni(seniPesilatId, seniKategori);
    setSeniPesilatId('');
  };

  const executeReset = () => {
    resetDatabase();
    setIsResetConfirmOpen(false);
  };

  // ================= EXPORT & PRINT HANDLERS =================
  const [printData, setPrintData] = useState<{ type: 'summary' | 'tanding_detail' | 'seni_detail'; id?: string } | null>(null);

  useEffect(() => {
    if (printData) {
      const timer = setTimeout(() => {
        window.print();
        setPrintData(null);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [printData]);

  // Scoring helpers for exports
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

  // Round-specific scorers
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

  // CSV Generator
  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateTandingCSV = () => {
    let csvContent = 'LAPORAN REKAPITULASI HASIL PERTANDINGAN TANDING - TAPAK SUCI\r\n';
    csvContent += `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}\r\n\r\n`;
    
    const headers = [
      'No',
      'ID Partai',
      'Kelas',
      'Kategori Usia',
      'Status',
      'S.Merah (Nama)',
      'S.Merah (Kontingen)',
      'S.Merah (Juri 1)',
      'S.Merah (Juri 2)',
      'S.Merah (Juri 3)',
      'S.Merah (Juri 4)',
      'S.Merah (Poin Konsensus)',
      'S.Merah (Penalti)',
      'S.Kuning (Nama)',
      'S.Kuning (Kontingen)',
      'S.Kuning (Juri 1)',
      'S.Kuning (Juri 2)',
      'S.Kuning (Juri 3)',
      'S.Kuning (Juri 4)',
      'S.Kuning (Poin Konsensus)',
      'S.Kuning (Penalti)',
      'Sudut Pemenang',
      'Nama Pemenang',
      'Alasan Kemenangan'
    ];
    
    csvContent += headers.join(';') + '\r\n';
    
    matchesTanding.forEach((match, index) => {
      const j1M = getTandingFinalJudgeScore(match, 1, 'Merah');
      const j2M = getTandingFinalJudgeScore(match, 2, 'Merah');
      const j3M = getTandingFinalJudgeScore(match, 3, 'Merah');
      const j4M = getTandingFinalJudgeScore(match, 4, 'Merah');
      const conM = getTandingConsensusScore(match, 'Merah');
      const penM = getTandingPenalties(match, 'Merah');

      const j1K = getTandingFinalJudgeScore(match, 1, 'Kuning');
      const j2K = getTandingFinalJudgeScore(match, 2, 'Kuning');
      const j3K = getTandingFinalJudgeScore(match, 3, 'Kuning');
      const j4K = getTandingFinalJudgeScore(match, 4, 'Kuning');
      const conK = getTandingConsensusScore(match, 'Kuning');
      const penK = getTandingPenalties(match, 'Kuning');

      const winnerSudut = match.status === 'Selesai' ? (match.pemenang || '-') : '-';
      const winnerName = match.status === 'Selesai' 
        ? (match.pemenang === 'Merah' ? match.pesilatMerah.nama : match.pesilatKuning.nama) 
        : '-';

      const row = [
        index + 1,
        match.id,
        match.kelas,
        match.kategoriUsia,
        match.status,
        match.pesilatMerah.nama,
        match.pesilatMerah.kontingen,
        j1M,
        j2M,
        j3M,
        j4M,
        conM,
        penM,
        match.pesilatKuning.nama,
        match.pesilatKuning.kontingen,
        j1K,
        j2K,
        j3K,
        j4K,
        conK,
        penK,
        winnerSudut,
        winnerName,
        match.alasanPemenang || '-'
      ];
      
      const safeRow = row.map(val => {
        const str = String(val).replace(/"/g, '""');
        return str.includes(';') || str.includes('\n') || str.includes('\r') ? `"${str}"` : str;
      });
      csvContent += safeRow.join(';') + '\r\n';
    });
    
    downloadCSV('tapak_suci_rekap_tanding.csv', csvContent);
  };

  const generateSeniCSV = () => {
    let csvContent = 'LAPORAN REKAPITULASI HASIL PERTANDINGAN SENI TGRS - TAPAK SUCI\r\n';
    csvContent += `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}\r\n\r\n`;
    
    const headers = [
      'No',
      'ID Partai',
      'Nama Pesilat/Tim',
      'Kontingen',
      'Golongan Seni',
      'Status',
      'Juri 1 Total',
      'Juri 1 Jurus',
      'Juri 1 Kesalahan',
      'Juri 1 Kemantapan',
      'Juri 1 Hukuman',
      'Juri 2 Total',
      'Juri 2 Jurus',
      'Juri 2 Kesalahan',
      'Juri 2 Kemantapan',
      'Juri 2 Hukuman',
      'Juri 3 Total',
      'Juri 3 Jurus',
      'Juri 3 Kesalahan',
      'Juri 3 Kemantapan',
      'Juri 3 Hukuman',
      'Juri 4 Total',
      'Juri 4 Jurus',
      'Juri 4 Kesalahan',
      'Juri 4 Kemantapan',
      'Juri 4 Hukuman',
      'Skor Akhir Dewan'
    ];
    
    csvContent += headers.join(';') + '\r\n';
    
    matchesSeni.forEach((match, index) => {
      const s1 = match.skorJuri[1] || { totalSkor: 0, skorJurus: 0, jumlahKesalahan: 0, skorKemantapan: 0, penguranganHukuman: 0 };
      const s2 = match.skorJuri[2] || { totalSkor: 0, skorJurus: 0, jumlahKesalahan: 0, skorKemantapan: 0, penguranganHukuman: 0 };
      const s3 = match.skorJuri[3] || { totalSkor: 0, skorJurus: 0, jumlahKesalahan: 0, skorKemantapan: 0, penguranganHukuman: 0 };
      const s4 = match.skorJuri[4] || { totalSkor: 0, skorJurus: 0, jumlahKesalahan: 0, skorKemantapan: 0, penguranganHukuman: 0 };

      const row = [
        index + 1,
        match.id,
        match.pesilat.nama,
        match.pesilat.kontingen,
        match.kategoriSeni,
        match.status,
        s1.totalSkor, s1.skorJurus, s1.jumlahKesalahan, s1.skorKemantapan, s1.penguranganHukuman,
        s2.totalSkor, s2.skorJurus, s2.jumlahKesalahan, s2.skorKemantapan, s2.penguranganHukuman,
        s3.totalSkor, s3.skorJurus, s3.jumlahKesalahan, s3.skorKemantapan, s3.penguranganHukuman,
        s4.totalSkor, s4.skorJurus, s4.jumlahKesalahan, s4.skorKemantapan, s4.penguranganHukuman,
        match.totalSkorAkhir || '0'
      ];
      
      const safeRow = row.map(val => {
        const str = String(val).replace(/"/g, '""');
        return str.includes(';') || str.includes('\n') || str.includes('\r') ? `"${str}"` : str;
      });
      csvContent += safeRow.join(';') + '\r\n';
    });
    
    downloadCSV('tapak_suci_rekap_seni.csv', csvContent);
  };

  const renderSummaryPrint = () => {
    return (
      <div className="space-y-8 text-black bg-white select-text font-serif p-4">
        {/* Header */}
        <div className="text-center border-b-4 border-double border-black pb-4">
          <div className="text-[10px] font-bold tracking-widest uppercase">PIMPINAN DAERAH KABUPATEN YAYASAN PENCAK SILAT</div>
          <h1 className="text-xl font-extrabold uppercase mb-0.5">TAPAK SUCI PUTERA MUHAMMADIYAH</h1>
          <p className="text-xs uppercase tracking-wider text-gray-700 font-sans">PANITIA PELAKSANA PERTANDINGAN • REKAPITULASI DOKUMEN RESMI</p>
          <p className="text-[9px] italic text-gray-500 mt-1">Dokumen Cetak Digital Otomatis - Summary Kejuaraan: Tanding & Seni TGRS</p>
        </div>

        {/* Title */}
        <div className="space-y-1 text-center">
          <h2 className="text-sm font-bold uppercase underline">LAPORAN RINGKASAN REKAPITULASI HASIL PERTANDINGAN</h2>
          <p className="text-[10px] text-gray-600 font-sans">Dicetak pada: {new Date().toLocaleDateString('id-ID')} • Waktu: {new Date().toLocaleTimeString('id-ID')}</p>
        </div>

        {/* Section Tanding */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase border-b border-black pb-1 text-red-800 font-sans">1. HASIL PERTANDINGAN KATEGORI TANDING (COMBAT)</h3>
          <table className="w-full text-[10px] border-collapse border border-black text-left">
            <thead>
              <tr className="bg-gray-100 text-black">
                <th className="border border-black px-2 py-1.5 text-center w-8">No</th>
                <th className="border border-black px-2 py-1.5">ID / Kelas & Usia</th>
                <th className="border border-black px-2 py-1.5 text-center bg-red-50 text-red-950">Sudut Merah (Nama/Sektor)</th>
                <th className="border border-black px-2 py-1.5 text-center bg-amber-50 text-amber-950">Sudut Kuning (Nama/Sektor)</th>
                <th className="border border-black px-2 py-1.5 text-center">Poin Konsensus</th>
                <th className="border border-black px-2 py-1.5 text-center">Status / Pemenang Verdict</th>
              </tr>
            </thead>
            <tbody>
              {matchesTanding.map((match, i) => {
                const cM = getTandingConsensusScore(match, 'Merah');
                const cK = getTandingConsensusScore(match, 'Kuning');
                const winnerName = match.status === 'Selesai' 
                  ? (match.pemenang === 'Merah' ? `${match.pesilatMerah.nama} (Merah)` : `${match.pesilatKuning.nama} (Kuning)`)
                  : '-';
                return (
                  <tr key={match.id} className="hover:bg-gray-50">
                    <td className="border border-black px-2 py-1 text-center font-sans">{i + 1}</td>
                    <td className="border border-black px-2 py-1">
                      <div className="font-bold">{match.kelas}</div>
                      <div className="text-[9px] text-gray-500 font-sans">{match.kategoriUsia}</div>
                    </td>
                    <td className="border border-black px-2 py-1 bg-red-50/20">
                      <div className="font-bold text-red-800">{match.pesilatMerah.nama}</div>
                      <div className="text-[9px] text-gray-500 font-sans">{match.pesilatMerah.kontingen}</div>
                    </td>
                    <td className="border border-black px-2 py-1 bg-amber-50/20">
                      <div className="font-bold text-amber-700">{match.pesilatKuning.nama}</div>
                      <div className="text-[9px] text-gray-500 font-sans">{match.pesilatKuning.kontingen}</div>
                    </td>
                    <td className="border border-black px-2 py-1 text-center font-mono">
                      <span className="text-red-800 font-bold">{cM}</span> vs <span className="text-amber-750 font-bold">{cK}</span>
                    </td>
                    <td className="border border-black px-2 py-1 text-center font-sans font-bold text-[10px]">
                      {match.status === 'Selesai' ? (
                        <div>
                          <div className="text-green-800 font-black">🏆 {winnerName}</div>
                          <div className="text-[8px] font-normal italic text-gray-400">[{match.alasanPemenang}]</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-normal italic">{match.status}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {matchesTanding.length === 0 && (
                <tr>
                  <td colSpan={6} className="border border-black p-4 text-center text-gray-400 italic">Belum ada pertandingan tanding terdaftar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section Seni */}
        <div className="space-y-3 pt-4">
          <h3 className="text-xs font-bold uppercase border-b border-black pb-1 text-amber-800 font-sans">2. HASIL PERTANDINGAN KATEGORI SENI TGRS (ARTISTIC)</h3>
          <table className="w-full text-[10px] border-collapse border border-black text-left">
            <thead>
              <tr className="bg-gray-100 text-black">
                <th className="border border-black px-2 py-1.5 text-center w-8">No</th>
                <th className="border border-black px-2 py-1.5">Nama Pesilat / Tim Seni</th>
                <th className="border border-black px-2 py-1.5">Sektor Kontingen</th>
                <th className="border border-black px-2 py-1.5 text-center">Golongan Seni</th>
                <th className="border border-black px-2 py-1.5 text-center bg-gray-50">Skor Akhir Dewan</th>
                <th className="border border-black px-2 py-1.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {matchesSeni.map((match, i) => (
                <tr key={match.id} className="hover:bg-gray-50">
                  <td className="border border-black px-2 py-1 text-center font-sans">{i + 1}</td>
                  <td className="border border-black px-2 py-1 font-bold">{match.pesilat.nama}</td>
                  <td className="border border-black px-2 py-1">{match.pesilat.kontingen}</td>
                  <td className="border border-black px-2 py-1 text-center font-semibold">{match.kategoriSeni}</td>
                  <td className="border border-black px-2 py-1 text-center font-mono font-bold bg-gray-50 text-xs text-amber-800">{match.totalSkorAkhir || '0.00'}</td>
                  <td className="border border-black px-2 py-1 text-center font-sans font-semibold text-[9px]">
                    <span className="uppercase">{match.status}</span>
                  </td>
                </tr>
              ))}
              {matchesSeni.length === 0 && (
                <tr>
                  <td colSpan={6} className="border border-black p-4 text-center text-gray-400 italic">Belum ada pertandingan seni terdaftar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signature Blocks */}
        <div className="pt-8">
          <div className="grid grid-cols-3 gap-4 text-center text-[10px] font-sans">
            <div className="space-y-12">
              <div>Ketua Panitia Pelaksana,</div>
              <div>
                <span className="font-bold underline block">...................................................</span>
                <span className="text-gray-500 text-[9px] block">NBM/NIDN.</span>
              </div>
            </div>
            
            <div className="space-y-12">
              <div>Ketua Dewan Referee Juri,</div>
              <div>
                <span className="font-bold underline block">...................................................</span>
                <span className="text-gray-500 text-[9px] block">Pimpinan Hakim</span>
              </div>
            </div>

            <div className="space-y-12">
              <div>Sekaris Pertandingan,</div>
              <div>
                <span className="font-bold underline block">...................................................</span>
                <span className="text-gray-500 text-[9px] block">Tapak Suci Daerah</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTandingDetailPrint = () => {
    const match = matchesTanding.find(m => m.id === printData?.id);
    if (!match) return <div className="text-red-500 text-xs font-sans">Pertandingan tidak ditemukan.</div>;

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

  const renderSeniDetailPrint = () => {
    const match = matchesSeni.find(m => m.id === printData?.id);
    if (!match) return <div className="text-red-500 text-xs font-sans">Partai seni tidak ditemukan.</div>;

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
            <table className="w-full text-[10px] border-collapse border border-black text-left font-sans">
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
                    <tr key={juriId} className="hover:bg-gray-50 text-center font-mono">
                      <td className="border border-black px-3 py-2 font-bold font-sans bg-gray-50">Juri {juriId}</td>
                      <td className="border border-black px-3 py-2">{parseFloat(nA).toFixed(2)}</td>
                      <td className="border border-black px-3 py-2 text-red-700 font-semibold">{s.jumlahKesalahan}</td>
                      <td className="border border-black px-3 py-2">{parseFloat(nB).toFixed(2)}</td>
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
            <table className="w-full text-[10px] border-collapse border border-black text-left font-sans">
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
                    <tr key={juriId} className="hover:bg-gray-50 text-center font-mono">
                      <td className="border border-black px-3 py-2 font-bold font-sans bg-gray-50">Juri {juriId}</td>
                      <td className="border border-black px-3 py-2 text-gray-400">9.10</td>
                      <td className="border border-black px-3 py-2">{parseFloat(nTeknik).toFixed(2)}</td>
                      <td className="border border-black px-3 py-2">{parseFloat(nKetegasan).toFixed(2)}</td>
                      <td className="border border-black px-3 py-2">{parseFloat(nPenjiwaan).toFixed(2)}</td>
                      <td className="border border-black px-3 py-2 text-red-955">-{parseFloat(s.penguranganHukuman as any).toFixed(2)}</td>
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
  const classes = ['Kelas A', 'Kelas B', 'Kelas C', 'Kelas D', 'Kelas E', 'Kelas F', 'Kelas G', 'Kelas Bebas'];
  const categories: KategoriUsia[] = ['Usia Dini', 'Pra Remaja', 'Remaja', 'Dewasa'];

  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 font-mono text-gray-100">
        <div className="bg-[#121212] p-8 rounded-2xl border-2 border-red-900/60 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Decorative Background Accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-800/10 rounded-full blur-2xl -z-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-600/5 rounded-full blur-2xl -z-10" />
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-[#222] border-2 border-[#FFD700]/70 text-[#FFD700] rounded-full mx-auto flex items-center justify-center shadow-lg">
              <Settings2 className="w-8 h-8 animate-spin-slow" style={{ animationDuration: '6s' }} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-sans font-black uppercase text-white tracking-wider flex items-center justify-center gap-1.5">
                <span>PORTAL ADMIN</span>
              </h2>
              <p className="text-[#FFD700] text-[10px] tracking-widest font-bold uppercase font-mono">
                TAPAK SUCI SCORING SYSTEM
              </p>
            </div>
            <p className="text-gray-400 text-xs font-sans leading-relaxed">
              Silakan masukkan sandi otorisasi untuk mengakses pengaturan kejuaraan, pendaftaran partai, dan rekapitulasi nilai.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-gray-400 font-bold text-[10px] tracking-wider uppercase">
                KATA SANDI ADMINISTRATOR
              </label>
              <div className="relative">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  id="admin-password-input"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    if (adminError) setAdminError('');
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[#1a1a1a] border border-[#333] text-gray-100 rounded-xl px-4 py-3 pr-10 focus:ring-1 focus:ring-yellow-500 focus:outline-[#FFD700] font-sans text-sm tracking-widest text-center"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {adminError && (
              <div className="bg-red-950/40 border border-red-900/60 p-3 rounded-lg text-red-500 text-xs text-center font-mono">
                ⚠️ {adminError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-red-800 to-red-950 hover:from-red-700 hover:to-red-900 text-white rounded-xl font-bold font-sans text-xs tracking-wider border border-[#ffd70044] hover:border-yellow-500/50 shadow-md flex items-center justify-center space-x-1.5 transition-all text-center cursor-pointer"
            >
              <span>MASUK PANEL ADMIN →</span>
            </button>
          </form>

          {/* Help hint badge */}
          <div className="border-t border-[#222] pt-4 text-center">
            <div className="inline-block bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg px-3 py-1.5">
              <p className="text-[10px] text-gray-500 font-sans">
                Gunakan sandi bawaan sistem: <code className="text-yellow-500 font-mono font-bold">admin123</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8 py-4 px-2 text-gray-100 print:hidden">
      {/* Title & Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#333] pb-4 gap-4">
        <div className="space-y-2">
          <div>
            <h1 className="text-2xl font-mono uppercase font-black text-white tracking-tight">Sistem Backend Admin</h1>
            <p className="text-gray-400 text-xs font-sans">Gagas partai tanding, tunjuk partai aktif, dan lakukan rekapitulasi nilai juri.</p>
          </div>
          
          {/* Dynamic Schedule Auto-activation Toggle */}
          <div className="inline-flex items-center space-x-3 bg-[#111] border border-[#2d2d2d] px-3.5 py-2 rounded-xl">
            <div className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoActivateBySchedule}
                onChange={(e) => setAutoActivateBySchedule(e.target.checked)}
                className="sr-only peer"
                id="toggle-auto-active"
              />
              <div className="w-9 h-5 bg-[#252525] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500 peer-checked:after:bg-black peer-checked:after:border-black"></div>
            </div>
            <label htmlFor="toggle-auto-active" className="text-xs font-mono font-bold text-gray-300 cursor-pointer flex flex-col leading-none">
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${autoActivateBySchedule ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></span>
                <span>Auto-Aktifkan Partai Berdasarkan Jadwal</span>
              </span>
              <span className="text-[9px] text-gray-500 font-normal mt-1 leading-none">
                Partai tanding & seni otomatis aktif saat jadwal tiba / partai sebelumnya selesai
              </span>
            </label>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-4 py-2 bg-red-950/40 text-red-400 hover:bg-red-900/20 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 border border-red-900/30 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Database Sistem</span>
          </button>
          <button
            onClick={handleAdminLogout}
            className="px-4 py-2 bg-[#222] text-gray-300 hover:bg-[#333] hover:text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 border border-[#333] transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-red-500" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-[#161616] rounded-xl max-w-md w-full p-6 space-y-4 border border-[#333] shadow-2xl">
            <h3 className="text-base font-mono uppercase font-black text-white">Konfirmasi Reset</h3>
            <p className="text-gray-400 text-xs leading-relaxed">Apakah Anda yakin ingin mengatur ulang data menjadi pengaturan bawaan demo? Seluruh atlet dan partai pertandingan baru akan dihapus permanen.</p>
            <div className="flex justify-end space-x-3 text-xs font-mono">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 border border-[#333] hover:bg-[#222] text-gray-300 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={executeReset}
                className="px-4 py-2 bg-[#8B0000] text-white font-bold rounded-lg border border-red-900/55"
              >
                Ya, Reset Sistem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Panel Segment */}
      <div className="bg-[#121212] p-6 rounded-xl border border-[#222] shadow-xl space-y-4 font-mono">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#222] pb-3 gap-2">
          <div className="flex items-center space-x-2.5">
            <FileSpreadsheet className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <h2 className="text-sm md:text-base font-black text-white uppercase tracking-tight">Pusat Administrasi & Ekspor Rekap Resmi</h2>
              <p className="text-gray-400 text-xs font-sans tracking-tight">Unduh berkas Microsoft Excel (CSV) atau cetak scorecard & laporan pertandingan resmi ke format PDF.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setPrintData({ type: 'summary' })}
              className="px-4 py-2 bg-blue-950/40 text-blue-400 hover:bg-blue-900/20 rounded-lg text-xs font-mono font-bold flex items-center justify-center space-x-1.5 border border-blue-900/30 transition-all cursor-pointer shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Ringkasan Event</span>
            </button>
            <button
              onClick={() => exportSummaryPDF(matchesTanding, matchesSeni)}
              className="px-4 py-2 bg-yellow-950/40 text-[#FFD700] hover:bg-yellow-900/20 rounded-lg text-xs font-mono font-bold flex items-center justify-center space-x-1.5 border border-yellow-900/30 transition-all cursor-pointer shrink-0"
              title="Unduh seluruh rekapitulasi pertandingan ke PDF"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Arsip PDF (jsPDF)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tanding Section */}
          <div className="p-4 bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">KATEGORI COMBAT (TANDING)</span>
              <p className="text-[11px] text-gray-400 font-sans mt-1">Unduh seluruh rekapan dewan & juri partai tanding (pemenang, poin konsensus & penalti dewan) ke dalam format dokumen spreadsheet.</p>
            </div>
            
            <button
              onClick={generateTandingCSV}
              className="w-full py-2 bg-[#8B0000]/20 border border-red-900/50 hover:bg-[#8B0000]/30 text-red-400 font-bold rounded text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel Tanding (.csv)</span>
            </button>
          </div>

          {/* Seni Section */}
          <div className="p-4 bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">KATEGORI ARTISTIC (SENI TGRS)</span>
              <p className="text-[11px] text-gray-400 font-sans mt-1">Unduh detail rekapitulasi kebenaran gerak, kesalahan, kemantapan irama, & rata-rata nilai dewan juri penilaian seni.</p>
            </div>
            
            <button
              onClick={generateSeniCSV}
              className="w-full py-2 bg-amber-950/20 border border-amber-900/50 hover:bg-amber-900/30 text-amber-400 font-bold rounded text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel Seni (.csv)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Create Matches and Active Statuses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Create Tanding pairing & Seni pairing */}
        <div className="lg:col-span-4 space-y-6">
          {/* Create Tanding */}
          <div className="bg-[#161616] p-5 rounded-xl border border-[#333] shadow-md space-y-4">
            <h2 className="text-sm font-mono uppercase font-black text-white flex items-center space-x-2 border-b border-[#282828] pb-2">
              <PlusCircle className="w-4 h-4 text-red-500" />
              <span>Gagas Partai Tanding</span>
            </h2>

            <form onSubmit={handleCreateTandingMatch} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider block">Pesilat Sudut Merah</label>
                <select
                  value={tandingMerahId}
                  onChange={(e) => setTandingMerahId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#333] bg-[#222] text-white focus:border-red-500"
                >
                  <option value="" className="bg-[#161616]">-- Pilih Pesilat --</option>
                  {tandingPesilats.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#161616]">
                      {p.nama} ({p.kontingen})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider block">Pesilat Sudut Kuning</label>
                <select
                  value={tandingKuningId}
                  onChange={(e) => setTandingKuningId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#333] bg-[#222] text-white focus:border-red-500"
                >
                  <option value="" className="bg-[#161616]">-- Pilih Pesilat --</option>
                  {tandingPesilats.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#161616]">
                      {p.nama} ({p.kontingen})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider block">Kategori Usia</label>
                  <select
                    value={tandingKategoriUsia}
                    onChange={(e) => setTandingKategoriUsia(e.target.value as KategoriUsia)}
                    className="w-full p-2 rounded-lg border border-[#333] bg-[#222] text-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#161616]">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider block">Kelas</label>
                  <select
                    value={tandingKelas}
                    onChange={(e) => setTandingKelas(e.target.value)}
                    className="w-full p-2 rounded-lg border border-[#333] bg-[#222] text-white"
                  >
                    {classes.map((cls) => (
                      <option key={cls} value={cls} className="bg-[#161616]">
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={!tandingMerahId || !tandingKuningId}
                className="w-full py-2.5 bg-[#8B0000] border border-red-900/55 hover:bg-red-800 disabled:bg-[#333] disabled:border-transparent text-white font-mono uppercase font-bold tracking-wider rounded-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                Gagas Partai Tanding
              </button>
            </form>
          </div>

          {/* Create Seni */}
          <div className="bg-[#161616] p-5 rounded-xl border border-[#333] shadow-md space-y-4">
            <h2 className="text-sm font-mono uppercase font-black text-white flex items-center space-x-2 border-b border-[#282828] pb-2">
              <PlusCircle className="w-4 h-4 text-amber-500" />
              <span>Gagas Partai Seni TGRS</span>
            </h2>

            <form onSubmit={handleCreateSeniMatch} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider block">Pesilat/Tim</label>
                <select
                  value={seniPesilatId}
                  onChange={(e) => setSeniPesilatId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#333] bg-[#222] text-white"
                >
                  <option value="" className="bg-[#161616]">-- Pilih Tim Seni --</option>
                  {seniPesilats.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#161616]">
                      {p.nama} ({p.kontingen} - {p.kategoriSeni})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider block">Golongan Seni</label>
                <select
                  value={seniKategori}
                  onChange={(e) => setSeniKategori(e.target.value as 'Tunggal' | 'Ganda' | 'Regu' | 'Solo Kreatif')}
                  className="w-full p-2 rounded-lg border border-[#333] bg-[#222] text-white"
                >
                  {['Tunggal', 'Ganda', 'Regu', 'Solo Kreatif'].map((k) => (
                    <option key={k} value={k} className="bg-[#161616]">
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!seniPesilatId}
                className="w-full py-2.5 bg-amber-600 border border-amber-700/50 hover:bg-amber-550 disabled:bg-[#333] disabled:border-transparent text-white font-mono uppercase font-bold tracking-wider rounded-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                Gagas Partai Seni
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Roster of ongoing & scheduled matches using a real-time Calendar Scheduler */}
        <div className="lg:col-span-8 space-y-6">
          {/* Calendar Master Card */}
          <div className="bg-[#161616] p-6 rounded-xl border border-[#333] shadow-md space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#282828] pb-4 gap-4">
              <div>
                <h2 className="text-base font-mono uppercase font-black text-white flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-red-500" />
                  <span>KALENDER JADWAL TURNAMEN TAPAK SUCI</span>
                </h2>
                <p className="text-[11px] text-gray-400 font-sans mt-0.5">Kelola penanggalan, jam tanding, dan alokasi partai seni TGRS secara interaktif.</p>
              </div>

              {/* Month/Year Switcher */}
              <div className="flex items-center space-x-2 bg-[#1f1f1f] p-1.5 rounded-lg border border-[#333] shrink-0">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-[#282828] text-gray-300 hover:text-white rounded transition-colors"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-white font-mono min-w-[100px] text-center">
                  {monthNames[currentMonth]} {currentYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-[#282828] text-gray-300 hover:text-white rounded transition-colors"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid Rendering */}
            <div>
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                <div>Min</div>
                <div>Sen</div>
                <div>Sel</div>
                <div>Rab</div>
                <div>Kam</div>
                <div>Jum</div>
                <div>Sab</div>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {calendarCells.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="h-16 bg-[#111]/20 rounded-lg border border-transparent"></div>;
                  }

                  const dateKey = `${currentYear}-${padZero(currentMonth + 1)}-${padZero(day)}`;
                  const isSelected = selectedDateStr === dateKey;
                  const isToday = dateKey === '2026-06-12'; // today reference in local metadata
                  const dayMatches = getMatchesForDate(dateKey);

                  return (
                    <button
                      key={`day-${day}`}
                      type="button"
                      onClick={() => setSelectedDateStr(dateKey)}
                      className={`h-16 p-1.5 rounded-lg border flex flex-col justify-between items-start transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-red-950/30 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.15)] text-white'
                          : isToday
                          ? 'bg-zinc-900 border-yellow-500/50 text-yellow-400'
                          : 'bg-[#121212] border-[#2c2b2b] hover:border-gray-500 text-gray-300'
                      }`}
                    >
                      <span className="text-[11px] font-bold font-mono">{day}</span>

                      {/* Match counts inside days */}
                      {dayMatches.total > 0 && (
                        <div className="flex flex-wrap gap-0.5 w-full mt-1">
                          {dayMatches.tanding.length > 0 && (
                            <span className="px-1 py-0.5 rounded-[3px] text-[8px] leading-none bg-red-950/85 border border-red-550/50 text-red-400 font-mono font-bold font-sans">
                              {dayMatches.tanding.length}T
                            </span>
                          )}
                          {dayMatches.seni.length > 0 && (
                            <span className="px-1 py-0.5 rounded-[3px] text-[8px] leading-none bg-amber-955/85 border border-amber-550/50 text-amber-450 font-mono font-bold font-sans">
                              {dayMatches.seni.length}S
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Details & Actions Panel for Selected/All Schedules */}
          <div className="bg-[#161616] p-6 rounded-xl border border-[#333] shadow-md space-y-4">
            {/* View Filter Tab Buttons */}
            <div className="flex items-center justify-between border-b border-[#282828] pb-3 flex-wrap gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-mono uppercase font-black text-white flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>JADWAL PERTANDINGAN: {formatIndonesianDate(selectedDateStr)}</span>
                </h3>
                <span className="text-[10px] text-gray-500 font-sans block">Memperlihatkan alur partai yang dijadwalkan pada penanggalan ini.</span>
              </div>
            </div>

            {/* Schedule Section split of Tanding & Seni */}
            <div className="space-y-6">
              {/* Tanding Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-black text-red-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-[#252525] pb-1">
                  <span>🥊 Kategori Tanding (Fighter)</span>
                  <span className="text-[10px] px-1.5 py-0.1 bg-red-950/60 text-red-500 rounded font-normal font-sans">
                    {getMatchesForDate(selectedDateStr).tanding.length} Terjadwal
                  </span>
                </h4>

                <div className="space-y-2.5">
                  {getMatchesForDate(selectedDateStr).tanding.map((match) => {
                    const isActive = activeTandingId === match.id;
                    return (
                      <div
                        key={match.id}
                        className={`p-4 rounded-lg border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isActive
                            ? 'bg-red-950/20 border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                            : 'bg-[#111] border-[#292929] hover:border-[#3a3a3a]'
                        }`}
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded bg-amber-950/50 border border-amber-900/40 text-amber-400 font-mono text-[9px] font-bold">
                              ⌚ {match.scheduledTime || '10:00'} WIB
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">
                              {match.kelas} • {match.kategoriUsia}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                            <div className="bg-red-950/10 border-l-2 border-red-500 p-2 rounded">
                              <span className="text-gray-550 block text-[9px] font-mono uppercase tracking-wide">Sudut Merah</span>
                              <span className="text-red-400 font-bold block truncate">{match.pesilatMerah.nama}</span>
                              <span className="text-gray-500 text-[10px] block truncate">{match.pesilatMerah.kontingen}</span>
                            </div>
                            <div className="bg-yellow-950/10 border-l-2 border-yellow-500 p-2 rounded">
                              <span className="text-gray-550 block text-[9px] font-mono uppercase tracking-wide">Sudut Kuning</span>
                              <span className="text-yellow-400 font-bold block truncate">{match.pesilatKuning.nama}</span>
                              <span className="text-gray-500 text-[10px] block truncate">{match.pesilatKuning.kontingen}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status & Active Controllers */}
                        <div className="flex md:flex-col items-end justify-between md:justify-center gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-[#222] min-w-[150px]">
                          <div>
                            {match.status === 'Belum Dimulai' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-zinc-900 text-gray-400 border border-zinc-800 uppercase tracking-wider">
                                Pending
                              </span>
                            )}
                            {match.status === 'Sedang Tanding' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-green-950/80 text-green-400 border border-green-800/50 animate-pulse uppercase tracking-wider">
                                Live
                              </span>
                            )}
                            {match.status === 'Selesai' && (
                              <div className="text-right space-y-0.5">
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-950/80 text-indigo-400 border border-indigo-900/50 uppercase tracking-wider">
                                  Selesai
                                </span>
                                {match.pemenang && (
                                  <span className="block text-[9px] text-[#FFD700] font-black uppercase font-mono">
                                    🏆 {match.pemenang}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5 w-full md:w-auto">
                            {isActive ? (
                              <div className="inline-flex items-center justify-center space-x-1 text-[9px] text-red-400 font-bold bg-red-950/65 border border-red-900 px-2 py-1.5 rounded-lg shrink-0">
                                <PlayCircle className="w-3.5 h-3.5 animate-spin" />
                                <span>AKTIF</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveTandingId(match.id)}
                                className="px-3 py-1.5 text-[9px] font-bold border border-[#444] text-gray-300 bg-[#222] hover:bg-[#333] hover:text-white rounded-lg transition-all cursor-pointer"
                              >
                                Tunjuk Aktif
                              </button>
                            )}

                            {/* Reschedule Button */}
                            <button
                              type="button"
                              onClick={() => setReschedulingMatch({
                                id: match.id,
                                isSeni: false,
                                title: `${match.pesilatMerah.nama} vs ${match.pesilatKuning.nama} (${match.kelas})`,
                                date: match.scheduledDate || '2026-06-12',
                                time: match.scheduledTime || '10:00'
                              })}
                              className="p-1.5 border border-[#444] text-gray-400 hover:text-white bg-[#1a1a1a] hover:bg-[#282828] rounded-lg transition-all cursor-pointer shrink-0"
                              title="Reschedule / Atur Ulang Kalender"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                            </button>

                            {/* Scoreboard print */}
                            <button
                              type="button"
                              onClick={() => setPrintData({ type: 'tanding_detail', id: match.id })}
                              className="p-1.5 border border-[#444] text-gray-400 hover:text-white bg-[#1a1a1a] hover:bg-[#282828] rounded-lg transition-all cursor-pointer shrink-0"
                              title="Cetak Scorecard Resmi"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Export to PDF using jsPDF */}
                            <button
                              type="button"
                              onClick={() => exportTandingPDF(match)}
                              className="p-1.5 border border-red-900/50 text-red-400 hover:text-white bg-red-950/20 hover:bg-red-900/30 rounded-lg transition-all cursor-pointer shrink-0 shadow-sm"
                              title="Unduh Scorecard PDF Resmi (.pdf)"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {getMatchesForDate(selectedDateStr).tanding.length === 0 && (
                    <div className="py-6 text-center text-gray-500 border border-dashed border-[#282828] rounded-lg text-xs font-sans">
                      Tidak ada partai tanding dijadwalkan pada hari ini.
                    </div>
                  )}
                </div>
              </div>

              {/* Seni Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-black text-amber-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-[#252525] pb-1">
                  <span>✨ Kategori Seni (TGRS IPSI)</span>
                  <span className="text-[10px] px-1.5 py-0.1 bg-amber-950/60 text-amber-500 rounded font-normal font-sans">
                    {getMatchesForDate(selectedDateStr).seni.length} Terjadwal
                  </span>
                </h4>

                <div className="space-y-2.5">
                  {getMatchesForDate(selectedDateStr).seni.map((mSeni) => {
                    const isActive = activeSeniId === mSeni.id;
                    const filledJudges = Object.keys(mSeni.skorJuri).length;
                    return (
                      <div
                        key={mSeni.id}
                        className={`p-4 rounded-lg border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isActive
                            ? 'bg-amber-950/15 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                            : 'bg-[#111] border-[#292929] hover:border-[#3a3a3a]'
                        }`}
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded bg-amber-950/50 border border-amber-900/40 text-amber-400 font-mono text-[9px] font-bold">
                              ⌚ {mSeni.scheduledTime || '14:00'} WIB
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                              🧬 {mSeni.kategoriSeni}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">
                              {mSeni.pesilat.kategoriUsia}
                            </span>
                          </div>

                          <div className="p-2 border-l-2 border-amber-500 bg-amber-950/10 rounded font-sans">
                            <span className="text-white font-bold block truncate text-xs">{mSeni.pesilat.nama}</span>
                            <span className="text-gray-500 text-[10px] block truncate">{mSeni.pesilat.kontingen}</span>
                          </div>
                        </div>

                        {/* Status & Active controllers */}
                        <div className="flex md:flex-col items-end justify-between md:justify-center gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-[#222] min-w-[150px]">
                          <div className="text-right">
                            {mSeni.status === 'Belum Dimulai' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-zinc-900 text-gray-400 border border-zinc-800 uppercase tracking-wider">
                                Pending
                              </span>
                            )}
                            {mSeni.status === 'Sedang Penilaian' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-amber-955/80 text-amber-400 border border-amber-900/50 animate-pulse uppercase tracking-wider">
                                Live
                              </span>
                            )}
                            {mSeni.status === 'Selesai' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-zinc-900 text-gray-400 border border-zinc-800 uppercase tracking-wider">
                                Selesai
                              </span>
                            )}
                            <span className="block text-[10px] text-gray-500 font-mono mt-1">
                              Rataan: <span className="font-bold text-white">{mSeni.totalSkorAkhir.toFixed(2)}</span> ({filledJudges}/4 Juri)
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 w-full md:w-auto">
                            {isActive ? (
                              <div className="inline-flex items-center justify-center space-x-1 text-[9px] text-amber-400 font-bold bg-amber-955/20 border border-amber-900 px-2 py-1.5 rounded-lg shrink-0">
                                <PlayCircle className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                <span>AKTIF</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveSeniId(mSeni.id)}
                                className="px-3 py-1.5 text-[9px] font-bold border border-[#444] text-gray-300 bg-[#222] hover:bg-[#333] hover:text-white rounded-lg transition-all cursor-pointer"
                              >
                                Tunjuk Aktif
                              </button>
                            )}

                            {/* Reschedule Button */}
                            <button
                              type="button"
                              onClick={() => setReschedulingMatch({
                                id: mSeni.id,
                                isSeni: true,
                                title: `${mSeni.pesilat.nama} (${mSeni.kategoriSeni})`,
                                date: mSeni.scheduledDate || '2026-06-12',
                                time: mSeni.scheduledTime || '14:00'
                              })}
                              className="p-1.5 border border-[#444] text-gray-400 hover:text-white bg-[#1a1a1a] hover:bg-[#282828] rounded-lg transition-all cursor-pointer shrink-0"
                              title="Reschedule / Atur Ulang Kalender"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                            </button>

                            {/* Scoreboard print */}
                            <button
                              type="button"
                              onClick={() => setPrintData({ type: 'seni_detail', id: mSeni.id })}
                              className="p-1.5 border border-[#444] text-gray-400 hover:text-white bg-[#1a1a1a] hover:bg-[#282828] rounded-lg transition-all cursor-pointer shrink-0"
                              title="Cetak Scorecard Resmi"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Export to PDF using jsPDF */}
                            <button
                              type="button"
                              onClick={() => exportSeniPDF(mSeni)}
                              className="p-1.5 border border-amber-900/50 text-amber-400 hover:text-white bg-amber-950/20 hover:bg-amber-900/30 rounded-lg transition-all cursor-pointer shrink-0 shadow-sm"
                              title="Unduh Scorecard PDF Resmi (.pdf)"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {getMatchesForDate(selectedDateStr).seni.length === 0 && (
                    <div className="py-6 text-center text-gray-500 border border-dashed border-[#282828] rounded-lg text-xs font-sans">
                      Tidak ada partai seni dijadwalkan pada hari ini.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* RESCHEDULE INTERACTIVE DIALOG MODAL */}
    {reschedulingMatch && (
      <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
        <div className="bg-[#161616] border border-[#333] rounded-xl shadow-2xl w-full max-w-md overflow-hidden outline-none">
          {/* Header */}
          <div className="bg-[#1f1f1f] px-5 py-4 border-b border-[#333] flex items-center justify-between">
            <h3 className="text-white text-xs font-black uppercase flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>Reschedule / Atur Kalender Partai</span>
            </h3>
            <button
              type="button"
              onClick={() => setReschedulingMatch(null)}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-5 space-y-4 text-xs">
            <div className="bg-[#111] p-3 rounded border border-[#222]">
              <span className="text-[9px] text-gray-405 block uppercase tracking-wider font-bold mb-1">Keterangan Partai:</span>
              <span className="text-gray-300 font-bold leading-relaxed">{reschedulingMatch.title}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Tanggal Pertandingan</label>
                <input
                  type="date"
                  value={reschedulingMatch.date}
                  onChange={(e) => setReschedulingMatch({ ...reschedulingMatch, date: e.target.value })}
                  className="w-full bg-[#222] border border-[#333] rounded-lg p-2.5 text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Jam Tanding</label>
                <input
                  type="time"
                  value={reschedulingMatch.time}
                  onChange={(e) => setReschedulingMatch({ ...reschedulingMatch, time: e.target.value })}
                  className="w-full bg-[#222] border border-[#333] rounded-lg p-2.5 text-white focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="bg-amber-955/5 p-3 rounded border border-amber-950/20 text-[10px] text-amber-300 leading-relaxed font-sans">
              ℹ️ Mengubah jadwal tanding akan memperbaharui poin penanggalan pada kalender utama & menyinkronkan status monitor dewan juri secara instan.
            </div>
          </div>

          {/* Footer Controls */}
          <div className="bg-[#1f1f1f] px-5 py-3.5 border-t border-[#333] flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={() => setReschedulingMatch(null)}
              className="px-3.5 py-2 hover:bg-[#282828] text-gray-300 rounded font-bold cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                updateMatchSchedule(reschedulingMatch.id, reschedulingMatch.isSeni, reschedulingMatch.date, reschedulingMatch.time);
                setSelectedDateStr(reschedulingMatch.date);
                try {
                  const parts = reschedulingMatch.date.split('-');
                  if (parts.length === 3) {
                    setCurrentYear(parseInt(parts[0], 10));
                    setCurrentMonth(parseInt(parts[1], 10) - 1);
                  }
                } catch (e) {}
                setReschedulingMatch(null);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-550 border border-amber-700/50 text-white font-bold rounded cursor-pointer transition-colors flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Terapkan Jadwal</span>
            </button>
          </div>
        </div>
      </div>
    )}

      {/* PRINT CONTAINER SIBLING (Only renders/displayed under print) */}
      <div id="print-container" className="hidden print:block bg-white text-black p-10 font-sans min-h-screen">
        <style>{`
          @media print {
            body {
              background-color: white !important;
              color: black !important;
            }
            .print-page-break {
              page-break-before: always;
            }
          }
        `}</style>
        {printData?.type === 'summary' && renderSummaryPrint()}
        {printData?.type === 'tanding_detail' && renderTandingDetailPrint()}
        {printData?.type === 'seni_detail' && renderSeniDetailPrint()}
      </div>
    </>
  );
};
