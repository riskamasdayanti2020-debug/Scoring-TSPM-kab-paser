import React, { useState, useEffect } from 'react';
import { Shield, Users, Laptop, Award, Tv, UserCheck, Settings, BookOpen, Calendar, Clock, MapPin, AlertCircle, Trash2, ChevronLeft, ChevronRight, Check, PlusCircle, RotateCcw } from 'lucide-react';
import { useAppState } from '../context/AppContext';

export interface MatchSchedule {
  id: string;
  matchId: string;
  matchType: 'Tanding' | 'Seni';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  gelanggang: string; // "Gelanggang I" | "Gelanggang II" | "Gelanggang III"
  catatan?: string;
}

const DEFAULT_SCHEDULES: MatchSchedule[] = [
  {
    id: 's_1',
    matchId: 'mt1',
    matchType: 'Tanding',
    date: '2026-06-11',
    startTime: '09:00',
    endTime: '09:40',
    gelanggang: 'Gelanggang I',
    catatan: 'Remaja C - Penyisihan'
  },
  {
    id: 's_2',
    matchId: 'mt2',
    matchType: 'Tanding',
    date: '2026-06-12',
    startTime: '10:00',
    endTime: '10:45',
    gelanggang: 'Gelanggang II',
    catatan: 'Dewasa E - Penyisihan'
  },
  {
    id: 's_3',
    matchId: 'ms1',
    matchType: 'Seni',
    date: '2026-06-12',
    startTime: '14:00',
    endTime: '14:30',
    gelanggang: 'Gelanggang I',
    catatan: 'Tunggal Dewasa Putra'
  },
  {
    id: 's_4',
    matchId: 'mt3',
    matchType: 'Tanding',
    date: '2026-06-13',
    startTime: '08:30',
    endTime: '09:10',
    gelanggang: 'Gelanggang I',
    catatan: 'Usia Dini A - Final'
  },
  {
    id: 's_5',
    matchId: 'ms2',
    matchType: 'Seni',
    date: '2026-06-13',
    startTime: '15:00',
    endTime: '15:30',
    gelanggang: 'Gelanggang III',
    catatan: 'Solo Kreatif Remaja'
  }
];

interface BerandaProps {
  onNavigate: (view: 'beranda' | 'pendaftaran' | 'admin' | 'operator' | 'dewan' | 'display' | 'juri') => void;
}

export const Beranda: React.FC<BerandaProps> = ({ onNavigate }) => {
  const { pesilatList, matchesTanding, matchesSeni } = useAppState();

  // Load and save schedules with LocalStorage
  const [schedules, setSchedules] = useState<MatchSchedule[]>(() => {
    const saved = localStorage.getItem('tapak_suci_schedules_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_SCHEDULES;
  });

  useEffect(() => {
    localStorage.setItem('tapak_suci_schedules_v1', JSON.stringify(schedules));
  }, [schedules]);

  // Calendar timeline view states
  const [currentMonth, setCurrentMonth] = useState(5); // June (0-indexed)
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDate, setSelectedDate] = useState('2026-06-12');

  // Form states
  const [formMatchId, setFormMatchId] = useState('');
  const [formGelanggang, setFormGelanggang] = useState('Gelanggang I');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('08:40');
  const [formCatatan, setFormCatatan] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const getCompetitorIds = (matchId: string): string[] => {
    const tandingMatch = matchesTanding.find(m => m.id === matchId);
    if (tandingMatch) {
      return [tandingMatch.pesilatMerah.id, tandingMatch.pesilatKuning.id];
    }
    const seniMatch = matchesSeni.find(m => m.id === matchId);
    if (seniMatch) {
      return [seniMatch.pesilat.id];
    }
    return [];
  };

  const checkConflicts = (
    date: string,
    startTime: string,
    endTime: string,
    gelanggang: string,
    matchId: string,
    currentScheduleId?: string
  ) => {
    const conflicts: string[] = [];
    
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);

    if (startMin >= endMin) {
      conflicts.push('Waktu mulai harus mendahului waktu selesai.');
      return conflicts;
    }

    const otherSchedules = schedules.filter(s => s.id !== currentScheduleId);

    for (const s of otherSchedules) {
      if (s.date !== date) continue;

      const sStart = toMinutes(s.startTime);
      const sEnd = toMinutes(s.endTime);

      const overlaps = (startMin < sEnd && sStart < endMin);

      if (overlaps) {
        if (s.gelanggang === gelanggang) {
          conflicts.push(`Bentrok Gelanggang: ${s.gelanggang} sudah dipakai oleh partai lain (${s.startTime} - ${s.endTime})`);
        }

        const match1CompIds = getCompetitorIds(matchId);
        const match2CompIds = getCompetitorIds(s.matchId);
        const commonComps = match1CompIds.filter(cid => match2CompIds.includes(cid));

        if (commonComps.length > 0) {
          conflicts.push(`Bentrok Atlet: Atlet terdaftar di partai ini memiliki partai lain yang terjadwal di jam yang sama.`);
        }
      }
    }

    return conflicts;
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMatchId) {
      setFormError('Harap pilih partai pertandingan.');
      return;
    }

    const selectedMatch = allMatches.find(m => m.id === formMatchId);
    if (!selectedMatch) {
      setFormError('Partai pertandingan tidak valid.');
      return;
    }

    const conflicts = checkConflicts(
      selectedDate,
      formStartTime,
      formEndTime,
      formGelanggang,
      formMatchId
    );

    if (conflicts.length > 0) {
      setFormError(conflicts.join(' | '));
      return;
    }

    const newSched: MatchSchedule = {
      id: 'sch_' + Date.now().toString(36),
      matchId: formMatchId,
      matchType: selectedMatch.type,
      date: selectedDate,
      startTime: formStartTime,
      endTime: formEndTime,
      gelanggang: formGelanggang,
      catatan: formCatatan,
    };

    setSchedules(prev => [...prev, newSched]);
    setFormCatatan('');
    setFormError(null);
    setFormSuccess('Jadwal pertandingan berhasil ditambahkan!');
    setTimeout(() => setFormSuccess(null), 3000);
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset jadwal pertandingan di kalender kembali ke setelan default?')) {
      setSchedules(DEFAULT_SCHEDULES);
      setSelectedDate('2026-06-12');
      setCurrentMonth(5);
      setCurrentYear(2026);
    }
  };

  const allMatches = [
    ...matchesTanding.map(m => ({
      id: m.id,
      label: `[Tanding] ${m.kelas} • ${m.pesilatMerah.nama} vs ${m.pesilatKuning.nama}`,
      type: 'Tanding' as const
    })),
    ...matchesSeni.map(m => ({
      id: m.id,
      label: `[Seni] ${m.kategoriSeni} • ${m.pesilat.nama}`,
      type: 'Seni' as const
    }))
  ];

  const activeSchedules = schedules
    .filter(s => s.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const getMatchDetails = (s: MatchSchedule) => {
    if (s.matchType === 'Tanding') {
      const match = matchesTanding.find(m => m.id === s.matchId);
      if (!match) return { found: false, title: 'Partai Tanding (Terhapus)', status: 'Unknown', sub: '' };
      return {
        found: true,
        title: `Combat (Tanding) • ${match.kelas} [${match.kategoriUsia}]`,
        sub: `${match.pesilatMerah.nama} (${match.pesilatMerah.kontingen}) vs ${match.pesilatKuning.nama} (${match.pesilatKuning.kontingen})`,
        status: match.status,
        winner: match.pemenang ? (match.pemenang === 'Merah' ? match.pesilatMerah.nama : match.pesilatKuning.nama) : null,
      };
    } else {
      const match = matchesSeni.find(m => m.id === s.matchId);
      if (!match) return { found: false, title: 'Partai Seni (Terhapus)', status: 'Unknown', sub: '' };
      return {
        found: true,
        title: `Artistic (Seni TGRS) • ${match.kategoriSeni} [${match.pesilat.kategoriUsia}]`,
        sub: `${match.pesilat.nama} (${match.pesilat.kontingen})`,
        status: match.status,
        winner: match.status === 'Selesai' ? 'Penilaian Selesai' : null,
      };
    }
  };

  const formatIndonesianDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return d.toLocaleDateString('id-ID', options);
    } catch (e) {
      return dateStr;
    }
  };

  const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const cards = [
    {
      id: 'pendaftaran',
      title: 'Pendaftaran Peserta',
      desc: 'Registrasi atlet, kelas tanding, kategori seni (TGRS), dan kontingen.',
      icon: Users,
      color: 'border-[#333] bg-[#161616] hover:border-red-500/80 hover:bg-[#1c1c1c]',
      iconColor: 'text-red-500',
      badge: `${pesilatList.length} Atlet`,
      action: () => onNavigate('pendaftaran')
    },
    {
      id: 'operator',
      title: 'Sistem Operator',
      desc: 'Kontrol jalannya pertandingan, manajemen waktu/timer ronde, dan pause/start.',
      icon: Laptop,
      color: 'border-[#333] bg-[#161616] hover:border-yellow-500/80 hover:bg-[#1c1c1c]',
      iconColor: 'text-yellow-400',
      badge: 'Timer & Ronde',
      action: () => onNavigate('operator')
    },
    {
      id: 'dewan',
      title: 'Dewan Pertandingan',
      desc: 'Sistem validasi penilaian, pengesahan jatuhan, dan pemberian kartu sanksi (Merah & Kuning).',
      icon: Shield,
      color: 'border-[#333] bg-[#161616] hover:border-[#FFD700]/80 hover:bg-[#1c1c1c]',
      iconColor: 'text-[#FFD700]',
      badge: 'Sanksi & Validasi',
      action: () => onNavigate('dewan')
    },
    {
      id: 'juri',
      title: 'Login Juri',
      desc: 'Sistem input poin jurus tanding (Katak, Ikan Terbang, Terkaman, Mawar) dan penilaian Seni TGRS.',
      icon: UserCheck,
      color: 'border-[#333] bg-[#161616] hover:border-cyan-500/80 hover:bg-[#1c1c1c]',
      iconColor: 'text-cyan-400',
      badge: 'Juri 1, 2, 3',
      action: () => onNavigate('juri')
    },
    {
      id: 'display',
      title: 'Display Monitor',
      desc: 'Layar tontonan publik, papan skor real-time merah vs kuning, visual penalti, dan countdown.',
      icon: Tv,
      color: 'border-[#333] bg-[#161616] hover:border-emerald-500/80 hover:bg-[#1c1c1c]',
      iconColor: 'text-emerald-400',
      badge: 'Layar Publik',
      action: () => onNavigate('display')
    },
    {
      id: 'admin',
      title: 'Backend Admin',
      desc: 'Manajemen bagan tanding, penugasan wasit, reset data, dan laporan rekapitulasi nilai.',
      icon: Settings,
      color: 'border-[#333] bg-[#161616] hover:border-slate-400/80 hover:bg-[#1c1c1c]',
      iconColor: 'text-slate-400',
      badge: 'Sistem Kontrol',
      action: () => onNavigate('admin')
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 px-2 text-gray-100">
      
      {/* Top Telemetry Info bar */}
      <div className="flex justify-between items-center bg-[#161616] border border-[#333] px-4 py-2.5 rounded-xl text-xs font-mono">
        <div className="flex items-center gap-2 text-green-400">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span>SYSTEM ONLINE • GALA 1 LIVE</span>
        </div>
        <div className="text-gray-500 text-[10px] hidden sm:block">
          TIMESTAMP UTC: {new Date().toISOString().split('T')[0]} | KEY: TS_G1_SCORER
        </div>
      </div>

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#4a0000] to-[#8B0000] text-white rounded-2xl p-8 shadow-2xl border border-[#ffd70044]">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-1/4 translate-x-1/6">
          <BookOpen className="w-96 h-96" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-yellow-500/20 border border-yellow-400/30 text-[#FFD700] text-xs px-3 py-1 rounded-md font-mono uppercase tracking-wider font-bold">
            <span>OFFICIAL SCORING ENGINE</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-sans font-black tracking-tight text-white">
            TAPAK SUCI PUTERA MUHAMMADIYAH
          </h1>
          <p className="text-red-100/90 text-sm md:text-base leading-relaxed font-sans">
            Aplikasi scoring pertandingan pencak silat berskala profesional. Berstandar regulasi taktis persyarikatan untuk sinkronisasi seketika antara dewan, wasit juri, dan monitor arena.
          </p>
          <div className="pt-2 flex flex-wrap gap-3 text-xs font-mono text-[#FFD700]">
            <div className="bg-black/40 px-3 py-1.5 rounded-md border border-red-900/50">
              ⚡ Tanding: Jurus Katak/Ikan/Terkaman/Mawar
            </div>
            <div className="bg-black/40 px-3 py-1.5 rounded-md border border-red-900/50">
              ✨ Seni: Borang Penilaian TGRS
            </div>
          </div>
        </div>
      </div>

      {/* Info Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#161616] p-5 rounded-xl border border-[#333] flex flex-col justify-between">
          <span className="text-gray-500 text-xs uppercase font-mono tracking-wider">Total Atlet</span>
          <span className="text-3xl font-mono font-black text-gray-100 mt-2">
            {pesilatList.length} <span className="text-xs font-sans text-gray-500 font-normal">Pesilat</span>
          </span>
        </div>
        <div className="bg-[#161616] p-5 rounded-xl border border-[#333] flex flex-col justify-between">
          <span className="text-gray-500 text-xs uppercase font-mono tracking-wider">Pertandingan Tanding</span>
          <span className="text-3xl font-mono font-black text-red-500 mt-2">
            {matchesTanding.length} <span className="text-xs font-sans text-gray-500 font-normal">Partai</span>
          </span>
        </div>
        <div className="bg-[#161616] p-5 rounded-xl border border-[#333] flex flex-col justify-between">
          <span className="text-gray-500 text-xs uppercase font-mono tracking-wider">Pertandingan Seni</span>
          <span className="text-3xl font-mono font-black text-amber-500 mt-2">
            {matchesSeni.length} <span className="text-xs font-sans text-gray-500 font-normal">Form</span>
          </span>
        </div>
        <div className="bg-[#161616] p-5 rounded-xl border border-[#333] flex flex-col justify-between">
          <span className="text-gray-500 text-xs uppercase font-mono tracking-wider font-bold text-red-500">Motto Tapak Suci</span>
          <span className="text-xs font-sans italic text-gray-300 mt-2 leading-tight">
            "Dengan Iman & Akhlak Saya Menjadi Kuat, Tanpa Iman & Akhlak Saya Menjadi Lemah"
          </span>
        </div>
      </div>

      {/* Callout Info Section for Match Calendar */}
      <div className="bg-[#121212] rounded-xl p-5 border border-[#222] shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2d2d2d] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[#FFD700]">
              <Calendar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-mono font-black uppercase text-white tracking-wider">
                Kalender Jadwal Pertandingan & Manajemen Slot Waktu
              </h2>
              <p className="text-gray-400 text-xs">
                Kelola jadwal waktu pertandingan, status arena Gelanggang, dan alokasikan slot atlet secara presisi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefaults}
              className="px-3 py-1.5 bg-red-950/40 border border-red-900/40 hover:bg-red-900/20 text-red-400 font-mono text-[10px] font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Reset ke Jadwal Bawaan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Jadwal</span>
            </button>
            <span className="text-[10px] bg-[#1a1a1a] border border-[#2d2d2d] text-gray-400 px-3 py-1.5 rounded-lg font-mono">
              Total {schedules.length} Jadwal
            </span>
          </div>
        </div>

        {/* Master Control: Calendar Grid & Daily List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (5/12): Month Calendar Picker */}
          <div className="lg:col-span-5 bg-[#161616] border border-[#2d2d2d] rounded-xl p-4 space-y-4 shadow-inner">
            <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-3">
              <span className="text-xs uppercase tracking-widest font-mono text-gray-400 font-bold">
                Pilih Tanggal
              </span>
              <div className="flex items-center space-x-1 bg-black/30 rounded-lg p-0.5 border border-[#222]">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-extrabold text-white px-2 uppercase min-w-[100px] text-center">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday labels */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-extrabold text-[#FFD700] uppercase">
              {DAY_NAMES.map(name => (
                <div key={name} className="py-1">
                  {name}
                </div>
              ))}
            </div>

            {/* Target Gregorian Calendar Month Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {(() => {
                const firstDay = new Date(currentYear, currentMonth, 1).getDay();
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const cells = [];

                for (let i = 0; i < firstDay; i++) {
                  cells.push(null);
                }
                for (let d = 1; d <= daysInMonth; d++) {
                  cells.push(d);
                }

                return cells.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="bg-[#121212]/20 rounded h-9 md:h-11"></div>;
                  }

                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const daySchedules = schedules.filter(s => s.date === dateStr);
                  const isSelected = selectedDate === dateStr;
                  const isConventionToday = currentYear === 2026 && currentMonth === 5 && day === 11; // 11 Juni 2026

                  return (
                    <button
                      key={`day-${day}`}
                      type="button"
                      onClick={() => setSelectedDate(dateStr)}
                      className={`relative h-9 md:h-11 border rounded-lg transition-all flex flex-col justify-between p-1.5 focus:outline-none cursor-pointer group ${
                        isSelected
                          ? 'bg-yellow-950/50 border-yellow-500 text-yellow-300 ring-1 ring-yellow-500/30'
                          : isConventionToday
                          ? 'bg-red-950/40 border-red-500/60 text-red-400'
                          : 'bg-[#1a1a1a] border-[#222] hover:bg-[#222] hover:border-gray-500 text-gray-300'
                      }`}
                    >
                      <span className="text-[10px] md:text-xs font-bold leading-none">{day}</span>
                      {daySchedules.length > 0 && (
                        <div className="flex gap-0.5 mt-auto">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          {daySchedules.length > 1 && (
                            <span className="text-[7px] text-gray-500 font-mono font-bold leading-none">
                              +{daySchedules.length - 1}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                });
              })()}
            </div>

            {/* Color Legend/Indication */}
            <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono mt-2 pt-2 border-t border-[#2d2d2d]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border border-red-500/60 bg-red-950/30 rounded"></span>
                <span>Hari Ini (11 Juni)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                <span>Ada Pertandingan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border border-yellow-500 bg-yellow-950/40 rounded"></span>
                <span>Tanggal Terpilih</span>
              </div>
            </div>
          </div>

          {/* Right Column (7/12): Day Timeline list & Admin Adding Form */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            
            {/* Timeline Pane */}
            <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4 flex-1 space-y-4 shadow-sm">
              <div className="border-b border-[#2d2d2d] pb-2">
                <span className="text-xs font-mono uppercase text-gray-400 tracking-wider font-bold">
                  Agenda Pertandingan Hari Terpilih
                </span>
                <h3 className="text-sm font-sans font-black text-[#FFD700] uppercase mt-0.5 select-all">
                  📅 {formatIndonesianDate(selectedDate)}
                </h3>
              </div>

              {/* Schedules Loop */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {activeSchedules.map((item) => {
                  const info = getMatchDetails(item);
                  
                  // Gelanggang color scheme
                  const gelColor = item.gelanggang === 'Gelanggang I'
                    ? 'border-red-900/60 bg-red-950/30 text-red-400'
                    : item.gelanggang === 'Gelanggang II'
                    ? 'border-yellow-900/60 bg-yellow-950/30 text-yellow-400'
                    : 'border-cyan-900/60 bg-cyan-950/30 text-cyan-400';

                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-black/40 border border-[#222] rounded-lg gap-3 hover:border-yellow-500/20 transition-all font-sans"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center justify-center bg-[#222] border border-[#333] rounded px-2 py-1 select-all shrink-0">
                          <span className="text-[10px] text-gray-500 font-mono">MULAI</span>
                          <span className="text-xs font-mono font-black text-white">{item.startTime}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${gelColor}`}>
                              {item.gelanggang}
                            </span>
                            <span className="text-xs font-bold text-white uppercase tracking-tight line-clamp-1">
                              {info.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-300 font-medium select-all leading-tight">
                            {info.sub}
                          </p>
                          {item.catatan && (
                            <p className="text-[9px] font-mono text-gray-500 bg-[#222]/30 px-1 py-0.5 inline-block rounded">
                              📝 Sesi: {item.catatan}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Rightmost state: status & controls */}
                      <div className="flex items-center gap-2.5 self-end sm:self-center">
                        <div className="text-right">
                          {info.status === 'Sedang Tanding' || info.status === 'Sedang Penilaian' ? (
                            <div className="inline-flex items-center space-x-1 px-1.5 py-0.5 text-[8.5px] font-mono font-black bg-red-950 border border-red-900 text-red-400 rounded animate-pulse">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                              <span>LIVE</span>
                            </div>
                          ) : info.status === 'Selesai' ? (
                            <div className="inline-flex items-center space-x-1 px-1.5 py-0.5 text-[8.5px] font-mono font-bold bg-green-950/50 border border-green-900/50 text-green-400 rounded select-text">
                              <span>SELESAI</span>
                            </div>
                          ) : (
                            <span className="text-[9px] font-mono text-gray-500 font-bold uppercase bg-[#1a1a1a] border border-[#2d2d2d] px-1.5 py-0.5 rounded">
                              BELUM MULAI
                            </span>
                          )}
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            Selesai {item.endTime}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(item.id)}
                          className="p-1 px-1.5 bg-[#121212] border border-[#333] hover:border-red-900/60 hover:text-red-400 text-gray-500 rounded transition-all cursor-pointer"
                          title="Hapus Penjadwalan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {activeSchedules.length === 0 && (
                  <div className="text-center py-8 border border-dashed border-[#2d2d2d] rounded-lg">
                    <p className="text-xs text-gray-500 italic">
                      Belum ada jadwal pertandingan yang direncanakan untuk tanggal ini.
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      Silakan pilih partai tanding atau seni pada form di bawah untuk merancang slot waktu.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Slot Assignment Form */}
            <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-4 shadow-sm">
              <div className="border-b border-[#2d2d2d] pb-2 mb-3">
                <h4 className="text-xs font-mono font-black uppercase text-white flex items-center gap-1">
                  <PlusCircle className="text-yellow-500 w-4 h-4 shrink-0" />
                  <span>KIRIM FORM JADWAL BARU ({selectedDate})</span>
                </h4>
              </div>

              <form onSubmit={handleAddSchedule} className="space-y-4 text-xs">
                {/* Match PickerDropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase font-mono tracking-tight block">
                    Pilih Partai Pertandingan (Tanding / Seni TGRS)
                  </label>
                  <select
                    value={formMatchId}
                    onChange={(e) => {
                      setFormMatchId(e.target.value);
                      setFormError(null);
                    }}
                    className="w-full bg-[#1e1e1e] border border-[#333] text-gray-100 rounded px-3 py-2 focus:ring-1 focus:ring-yellow-500 focus:outline-none font-mono"
                  >
                    <option value="">-- PILIH PARTAI PERTANDINGAN AKTIF --</option>
                    {allMatches.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Gelanggang index */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase font-mono tracking-tight block">
                      Ring Gelanggang
                    </label>
                    <select
                      value={formGelanggang}
                      onChange={(e) => {
                        setFormGelanggang(e.target.value);
                        setFormError(null);
                      }}
                      className="w-full bg-[#1e1e1e] border border-[#333] text-gray-100 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-yellow-500 focus:outline-none font-mono"
                    >
                      <option value="Gelanggang I">Gelanggang I</option>
                      <option value="Gelanggang II">Gelanggang II</option>
                      <option value="Gelanggang III">Gelanggang III</option>
                    </select>
                  </div>

                  {/* Start time */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase font-mono tracking-tight block">
                      Waktu Mulai (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => {
                        setFormStartTime(e.target.value);
                        setFormError(null);
                        
                        // Smart auto end time setting (+40 minutes later)
                        try {
                          const [h, m] = e.target.value.split(':').map(Number);
                          let endM = m + 40;
                          let endH = h;
                          if (endM >= 60) {
                            endH += Math.floor(endM / 60);
                            endM = endM % 60;
                          }
                          const formattedEnd = `${String(endH % 24).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                          setFormEndTime(formattedEnd);
                        } catch (err) {}
                      }}
                      className="w-full bg-[#1e1e1e] border border-[#333] text-gray-100 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-yellow-500 focus:outline-none font-mono text-center"
                    />
                  </div>

                  {/* End time */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase font-mono tracking-tight block">
                      Waktu Selesai (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => {
                        setFormEndTime(e.target.value);
                        setFormError(null);
                      }}
                      className="w-full bg-[#1e1e1e] border border-[#333] text-gray-100 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-yellow-500 focus:outline-none font-mono text-center"
                    />
                  </div>
                </div>

                {/* Session Remarks / Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase font-mono tracking-tight block">
                    Keterangan Sesi / Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formCatatan}
                    onChange={(e) => setFormCatatan(e.target.value)}
                    placeholder="Contoh: Babak Semifinal, Partai Pembuka, dll."
                    className="w-full bg-[#1e1e1e] border border-[#333] text-gray-100 rounded px-3 py-1.5 focus:ring-1 focus:ring-yellow-500 focus:outline-none font-sans"
                  />
                </div>

                {/* Live overlap validation info banner */}
                {formMatchId && (
                  <div className="mt-2 text-left">
                    {(() => {
                      const list = checkConflicts(selectedDate, formStartTime, formEndTime, formGelanggang, formMatchId);
                      if (list.length > 0) {
                        return (
                          <div className="bg-red-950/40 border border-red-900/60 rounded-lg p-3 text-red-400 font-mono text-[11px] space-y-1">
                            <div className="font-extrabold flex items-center gap-1 text-red-400">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>BENTROK JADWAL TERDETEKSI:</span>
                            </div>
                            <ul className="list-disc pl-4 space-y-0.5">
                              {list.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                          </div>
                        );
                      }
                      return (
                        <div className="bg-green-950/30 border border-green-900/40 rounded-lg p-2.5 text-green-400 font-mono text-[11px] flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>✓ Slot waktu aman. Tidak ada bentrok Gelanggang atau Atlet.</span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Status Banners */}
                {formError && (
                  <div className="bg-red-950/50 border border-red-900/50 text-red-400 p-2.5 rounded font-mono text-[11px]">
                    ⚠️ error: {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="bg-green-950/50 border border-green-800/40 text-green-400 p-2.5 rounded font-mono text-[11px] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                {/* Submit Trigger */}
                <button
                  type="submit"
                  disabled={!!(formMatchId && checkConflicts(selectedDate, formStartTime, formEndTime, formGelanggang, formMatchId).length > 0)}
                  className={`w-full py-2 rounded font-sans font-extrabold text-[#111] transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    formMatchId && checkConflicts(selectedDate, formStartTime, formEndTime, formGelanggang, formMatchId).length > 0
                      ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed border border-gray-700/30'
                      : 'bg-[#FFD700] hover:bg-[#FFD700]/90 active:scale-95'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>JADWALKAN PARTAI</span>
                </button>
              </form>
            </div>

          </div>

        </div>
      </div>

      {/* Launcher Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-mono uppercase font-bold text-white tracking-wider flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 bg-red-650 rounded-sm"></span>
          <span>Portal Fitur Sistem</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                id={`launcher-card-${card.id}`}
                onClick={card.action}
                className={`flex flex-col justify-between p-6 rounded-xl border shadow-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:border-yellow-400/50 ${card.color}`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-lg bg-[#222] border border-[#333] ${card.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-[#222] text-gray-300 border border-[#333]">
                      {card.badge}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-sans font-bold text-white">{card.title}</h3>
                    <p className="text-gray-400 text-xs leading-relaxed">{card.desc}</p>
                  </div>
                </div>
                <div className="pt-4 flex items-center justify-between text-[11px] font-mono font-bold text-[#FFD700] hover:text-white transition-colors">
                  <span>BUKA TERMINAL CONTROL</span>
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tapak Suci Jurus Reference */}
      <div className="bg-[#111] rounded-xl p-6 border border-[#333] space-y-4">
        <h3 className="text-base font-mono uppercase font-bold text-[#FFD700] flex items-center space-x-2">
          <span>📚 Ketentuan Poin Regulasi Tapak Suci</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
          <div className="bg-[#161616] p-4 rounded-lg border border-[#303030] space-y-1.5">
            <span className="font-mono text-xs text-red-500 font-bold block">1. JURUS KATAK</span>
            <p className="text-gray-300 font-medium">Nilai Poin: <span className="text-white font-mono font-bold font-mono bg-[#222] border border-[#333] px-1.5 py-0.5 rounded">+10</span></p>
            <p className="text-gray-500 text-[11px] leading-relaxed">Serangan sapuan kaki/tangan katak tangkas masuk bidang sasaran.</p>
          </div>
          <div className="bg-[#161616] p-4 rounded-lg border border-[#303030] space-y-1.5">
            <span className="font-mono text-xs text-yellow-400 font-bold block bg-transparent">2. JURUS IKAN TERBANG</span>
            <p className="text-gray-300 font-medium">Nilai Poin: <span className="text-white font-mono font-bold font-mono bg-[#222] border border-[#333] px-1.5 py-0.5 rounded">+20</span></p>
            <p className="text-gray-500 text-[11px] leading-relaxed">Serangan taktis dengan lompatan sabetan udara mematikan.</p>
          </div>
          <div className="bg-[#161616] p-4 rounded-lg border border-[#303030] space-y-1.5">
            <span className="font-mono text-xs text-cyan-400 font-bold block">3. JURUS TERKAMAN</span>
            <p className="text-gray-300 font-medium">Nilai Poin: <span className="text-white font-mono font-bold font-mono bg-[#222] border border-[#333] px-1.5 py-0.5 rounded">+30</span></p>
            <p className="text-gray-500 text-[11px] leading-relaxed">Teknik jatuhan kuku harimau menumbangkan posisi pertahanan musuh.</p>
          </div>
          <div className="bg-[#161616] p-4 rounded-lg border border-[#303030] space-y-1.5">
            <span className="font-mono text-xs text-emerald-400 font-bold block">4. MAWAR MEKAR</span>
            <p className="text-gray-300 font-medium">Nilai Poin: <span className="text-white font-mono font-bold font-mono bg-[#222] border border-[#333] px-1.5 py-0.5 rounded">10 + X</span></p>
            <p className="text-gray-500 text-[11px] leading-relaxed">Lolos dari pitingan lawan disertai pukulan serangan balik mawar mekar (+X bonus).</p>
          </div>
        </div>
      </div>
    </div>
  );
};
