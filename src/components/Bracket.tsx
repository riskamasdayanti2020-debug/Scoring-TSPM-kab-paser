import React, { useState } from 'react';
import { useAppState } from '../context/AppContext';
import { MatchTandingState, Pesilat, KategoriUsia } from '../types';
import { Trophy, Calendar, Clock, MapPin, Play, UserPlus, Trash2, ArrowRight, Settings2, Sparkles, Check, AlertCircle, RefreshCw } from 'lucide-react';

export const Bracket: React.FC = () => {
  const {
    pesilatList,
    matchesTanding,
    createMatchTanding,
    updateMatchBabak,
    setActiveTandingId,
    setActiveSeniId,
    deletePesilat
  } = useAppState();

  // Local state for selected class grouping
  // Dynamic calculation of available classes from matches or registrants
  const availableGroups = (() => {
    const groups: { kategoriUsia: KategoriUsia; kelas: string }[] = [];
    
    // Scan matches first
    matchesTanding.forEach(m => {
      if (!groups.some(g => g.kategoriUsia === m.kategoriUsia && g.kelas === m.kelas)) {
        groups.push({ kategoriUsia: m.kategoriUsia, kelas: m.kelas });
      }
    });

    // Scan registered pesilat tanding
    pesilatList.forEach(p => {
      if (p.tipe === 'Tanding' && p.kelasTanding) {
        if (!groups.some(g => g.kategoriUsia === p.kategoriUsia && g.kelas === p.kelasTanding)) {
          groups.push({ kategoriUsia: p.kategoriUsia, kelas: p.kelasTanding });
        }
      }
    });

    // Set default if empty
    if (groups.length === 0) {
      groups.push({ kategoriUsia: 'Remaja', kelas: 'Kelas C' });
    }

    return groups;
  })();

  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);
  const activeGroup = availableGroups[selectedGroupIndex] || availableGroups[0] || { kategoriUsia: 'Remaja', kelas: 'Kelas C' };

  // Filter matches of selected Kategori + Kelas
  const groupMatches = matchesTanding.filter(
    m => m.kategoriUsia === activeGroup.kategoriUsia && m.kelas === activeGroup.kelas
  );

  // Divide into stages
  const penyisihanMatches = groupMatches.filter(m => m.babak === 'Penyisihan' || !m.babak);
  const semiFinalMatches = groupMatches.filter(m => m.babak === 'Semi Final');
  const finalMatches = groupMatches.filter(m => m.babak === 'Final');

  // Filter available tanding pesilat for seeding in this active group
  const eligiblePesilats = pesilatList.filter(
    p => p.tipe === 'Tanding' && p.kategoriUsia === activeGroup.kategoriUsia && p.kelasTanding === activeGroup.kelas
  );

  // Seeding form states
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedBabak, setSeedBabak] = useState<'Penyisihan' | 'Semi Final' | 'Final'>('Penyisihan');
  const [merahId, setMerahId] = useState('');
  const [kuningId, setKuningId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Calculate scores helper
  const calculateMatchScore = (match: MatchTandingState, sudut: 'Merah' | 'Kuning') => {
    const scores = match.skorJuri;
    const getJuriPoints = (juriId: number) => {
      const jScores = scores[juriId];
      if (!jScores) return 0;
      const list = sudut === 'Merah' ? jScores.poinMerah : jScores.poinKuning;
      return list.reduce((sum, pt) => sum + pt.poin, 0);
    };

    const penalties = (sudut === 'Merah' ? match.penaltiMerah : match.penaltiKuning)
      .reduce((sum, p) => sum + p.poin, 0);

    const total = [1, 2, 3, 4].reduce((sum, id) => {
      const score = getJuriPoints(id) + penalties;
      return sum + Math.max(0, score);
    }, 0);

    return parseFloat((total / 4).toFixed(1));
  };

  const handleSeedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merahId || !kuningId) {
      setFormError('Harap pilih kedua pesilat tanding.');
      return;
    }
    if (merahId === kuningId) {
      setFormError('Pesilat Sudut Merah dan Sudut Kuning tidak boleh sama!');
      return;
    }

    createMatchTanding(
      merahId,
      kuningId,
      activeGroup.kelas,
      activeGroup.kategoriUsia,
      seedBabak
    );

    setFormError(null);
    setFormSuccess('Partai pertandingan berhasil ditambahkan ke bracket!');
    setMerahId('');
    setKuningId('');
    setTimeout(() => {
      setFormSuccess(null);
      setShowSeedModal(false);
    }, 1500);
  };

  // Switch to match in operator screen
  const handleLaunchMatch = (matchId: string) => {
    setActiveTandingId(matchId);
    // Tell user to move to Operator tab
    const opTabBtn = document.getElementById('nav-btn-operator');
    if (opTabBtn) {
      opTabBtn.click();
    }
  };

  // Helper: auto promote winners to next stage (semi-final to finals)
  const [promotingMatchId, setPromotingMatchId] = useState<string | null>(null);
  const promoteWinnerToMatch = (sourceMatch: MatchTandingState, targetMatchId: string, targetSudut: 'Merah' | 'Kuning') => {
    if (!sourceMatch.pemenang) return;
    const winner = sourceMatch.pemenang === 'Merah' ? sourceMatch.pesilatMerah : sourceMatch.pesilatKuning;
    
    // We update targetMatch corners to point to winner pesilat
    // Direct manipulation of local storage since we want immediate state sync
    const saved = localStorage.getItem('tapak_suci_scoring_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.matchesTanding = parsed.matchesTanding.map((m: any) => {
          if (m.id === targetMatchId) {
            if (targetSudut === 'Merah') {
              m.pesilatMerah = winner;
            } else {
              m.kuningId = winner;
              m.pesilatKuning = winner;
            }
          }
          return m;
        });
        localStorage.setItem('tapak_suci_scoring_v1', JSON.stringify(parsed));
        window.dispatchEvent(new Event('storage_local_update'));
        setPromotingMatchId(targetMatchId);
        setTimeout(() => setPromotingMatchId(null), 1000);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const quickSwapCorners = (matchId: string) => {
    const saved = localStorage.getItem('tapak_suci_scoring_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.matchesTanding = parsed.matchesTanding.map((m: any) => {
          if (m.id === matchId) {
            const temp = m.pesilatMerah;
            m.pesilatMerah = m.pesilatKuning;
            m.pesilatKuning = temp;
          }
          return m;
        });
        localStorage.setItem('tapak_suci_scoring_v1', JSON.stringify(parsed));
        window.dispatchEvent(new Event('storage_local_update'));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const deleteBracketMatch = (matchId: string) => {
    if (window.confirm('Hapus partai tanding ini dari bagan kompetisi?')) {
      const saved = localStorage.getItem('tapak_suci_scoring_v1');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.matchesTanding = parsed.matchesTanding.filter((m: any) => m.id !== matchId);
          localStorage.setItem('tapak_suci_scoring_v1', JSON.stringify(parsed));
          window.dispatchEvent(new Event('storage_local_update'));
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 px-2 text-gray-100">
      {/* Header section with theme background */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#4a0000] to-[#8B0000] text-white rounded-2xl p-6 shadow-xl border border-[#ffd70044]">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-1/4 translate-x-1/6">
          <Trophy className="w-80 h-80" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center space-x-2 bg-yellow-500/20 border border-yellow-400/30 text-[#FFD700] text-[10px] px-2.5 py-0.5 rounded-md font-mono uppercase tracking-wider font-bold">
            <span>Visualisasi Bagan Dinamis</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-sans font-black tracking-tight text-white uppercase">
            Bagan Alur Turnamen Pencak Silat
          </h1>
          <p className="text-red-100/80 text-xs md:text-sm max-w-2xl leading-relaxed">
            Petakan alur kompetisi pesilat secara interaktif. Kelola persaingan langsung dari babak Penyisihan, Semi Final, hingga babak puncak perebutan gelar juara kehormatan Tapak Suci.
          </p>
        </div>
      </div>

      {/* Class Grouping Navigation Tabs */}
      <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-4 shadow-md space-y-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block">
          PANGKATAN KELAS TANDING AKTIF
        </span>
        <div className="flex flex-wrap gap-2">
          {availableGroups.map((group, idx) => {
            const isActive = idx === selectedGroupIndex;
            return (
              <button
                key={idx}
                onClick={() => setSelectedGroupIndex(idx)}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-sans font-bold transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-[#FFD700] text-[#8B0000] border-[#FFD700] shadow-md'
                    : 'bg-[#1a1a1a] text-gray-300 border-[#2b2b2b] hover:bg-[#222]'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>{group.kategoriUsia} • {group.kelas}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bracket Tree Layout Panel */}
      <div className="bg-[#121212] border border-[#222] rounded-xl p-5 shadow-xl space-y-6">
        
        {/* Top Control Bar of active category */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2d2d2d] pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-mono font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 bg-yellow-500 rounded-sm"></span>
              <span>BAGAN: {activeGroup.kategoriUsia} - {activeGroup.kelas}</span>
            </h2>
            <p className="text-gray-400 text-xs font-sans">
              Terdiri dari {groupMatches.length} partai tanding terdaftar dalam klaster berat ini.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSeedBabak('Penyisihan');
                setShowSeedModal(true);
              }}
              className="px-3.5 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-sans text-xs font-black rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Semaikan Partai (Seed)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Tree Map Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
          
          {/* STAGE 1: PENYISIHAN */}
          <div className="space-y-6">
            <div className="bg-red-950/20 border border-red-900/40 rounded-xl px-4 py-2 flex items-center justify-between shadow-sm">
              <span className="text-xs font-mono font-black text-red-400 uppercase tracking-wider">
                Babak Penyisihan
              </span>
              <span className="text-[10px] font-mono text-gray-500 font-bold">
                {penyisihanMatches.length} Partai
              </span>
            </div>

            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
              {penyisihanMatches.map((match, i) => (
                <MatchNode
                  key={match.id}
                  match={match}
                  onLaunch={handleLaunchMatch}
                  onSwap={() => quickSwapCorners(match.id)}
                  onDelete={() => deleteBracketMatch(match.id)}
                  onPromote={(targetId, targetCorner) => promoteWinnerToMatch(match, targetId, targetCorner)}
                  potentialTargets={[
                    ...semiFinalMatches.map(m => ({ id: m.id, desc: `SF - ${m.pesilatMerah.nama} vs ${m.pesilatKuning.nama}` })),
                    ...finalMatches.map(m => ({ id: m.id, desc: `Final - ${m.pesilatMerah.nama} vs ${m.pesilatKuning.nama}` }))
                  ]}
                  scoreMerah={calculateMatchScore(match, 'Merah')}
                  scoreKuning={calculateMatchScore(match, 'Kuning')}
                />
              ))}

              {penyisihanMatches.length === 0 && (
                <div className="text-center py-10 border border-dashed border-[#2d2d2d] rounded-xl bg-black/20">
                  <p className="text-xs text-gray-500 italic">Belum ada partai penyisihan.</p>
                  <button
                    onClick={() => {
                      setSeedBabak('Penyisihan');
                      setShowSeedModal(true);
                    }}
                    className="mt-2.5 text-[10px] font-mono text-yellow-500 hover:underline flex items-center justify-center mx-auto gap-1"
                  >
                    + Daftarkan Penyisihan Baru
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* STAGE 2: SEMI FINAL */}
          <div className="space-y-6">
            <div className="bg-yellow-950/20 border border-yellow-900/30 rounded-xl px-4 py-2 flex items-center justify-between shadow-sm">
              <span className="text-xs font-mono font-black text-yellow-400 uppercase tracking-wider">
                Babak Semi Final
              </span>
              <span className="text-[10px] font-mono text-gray-500 font-bold">
                {semiFinalMatches.length} Partai
              </span>
            </div>

            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
              {semiFinalMatches.map((match, i) => (
                <MatchNode
                  key={match.id}
                  match={match}
                  onLaunch={handleLaunchMatch}
                  onSwap={() => quickSwapCorners(match.id)}
                  onDelete={() => deleteBracketMatch(match.id)}
                  onPromote={(targetId, targetCorner) => promoteWinnerToMatch(match, targetId, targetCorner)}
                  potentialTargets={finalMatches.map(m => ({ id: m.id, desc: `Final - ${m.pesilatMerah.nama} vs ${m.pesilatKuning.nama}` }))}
                  scoreMerah={calculateMatchScore(match, 'Merah')}
                  scoreKuning={calculateMatchScore(match, 'Kuning')}
                />
              ))}

              {semiFinalMatches.length === 0 && (
                <div className="text-center py-10 border border-dashed border-[#2d2d2d] rounded-xl bg-black/20">
                  <p className="text-xs text-gray-500 italic">Belum ada partai semi final.</p>
                  <button
                    onClick={() => {
                      setSeedBabak('Semi Final');
                      setShowSeedModal(true);
                    }}
                    className="mt-2.5 text-[10px] font-mono text-yellow-500 hover:underline flex items-center justify-center mx-auto gap-1"
                  >
                    + Daftarkan Semi Final Baru
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* STAGE 3: FINAL */}
          <div className="space-y-6">
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl px-4 py-2 flex items-center justify-between shadow-sm">
              <span className="text-xs font-mono font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Babak Final (Puncak)</span>
              </span>
              <span className="text-[10px] font-mono text-gray-500 font-bold">
                {finalMatches.length} Perebutan
              </span>
            </div>

            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
              {finalMatches.map((match, i) => (
                <MatchNode
                  key={match.id}
                  match={match}
                  onLaunch={handleLaunchMatch}
                  onSwap={() => quickSwapCorners(match.id)}
                  onDelete={() => deleteBracketMatch(match.id)}
                  scoreMerah={calculateMatchScore(match, 'Merah')}
                  scoreKuning={calculateMatchScore(match, 'Kuning')}
                />
              ))}

              {finalMatches.length === 0 && (
                <div className="text-center py-10 border border-dashed border-[#2d2d2d] rounded-xl bg-black/20">
                  <p className="text-xs text-gray-500 italic">Belum ada partai final.</p>
                  <button
                    onClick={() => {
                      setSeedBabak('Final');
                      setShowSeedModal(true);
                    }}
                    className="mt-2.5 text-[10px] font-mono text-yellow-500 hover:underline flex items-center justify-center mx-auto gap-1"
                  >
                    + Daftarkan Final Baru
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* SEED MODAL POPUP */}
      {showSeedModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-[#333] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative animate-fade-in">
            
            <div className="border-b border-[#2d2d2d] pb-3">
              <h3 className="text-lg font-sans font-black text-[#FFD700] uppercase tracking-wide flex items-center gap-2">
                <Settings2 className="text-yellow-500 w-5 h-5 shrink-0" />
                <span>Semaikan Partai Tanding</span>
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">
                Tambahkan atlet penantang ke bracket {activeGroup.kategoriUsia} • {activeGroup.kelas} secara instan.
              </p>
            </div>

            <form onSubmit={handleSeedSubmit} className="space-y-4 text-xs font-sans">
              
              {/* Babak Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 font-mono block">STAGE/BABAK PERTANDINGAN</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Penyisihan', 'Semi Final', 'Final'] as const).map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSeedBabak(b)}
                      className={`py-2 rounded-lg font-mono font-bold border transition-colors cursor-pointer ${
                        seedBabak === b
                          ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400'
                          : 'bg-black/30 border-[#2d2d2d] text-gray-400 hover:bg-[#222]'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Angle Merah Picker */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-red-400 font-mono block">SUDUT MERAH (CHALLENGER 1)</label>
                <select
                  value={merahId}
                  onChange={(e) => setMerahId(e.target.value)}
                  className="w-full bg-[#202020] border border-[#333] text-gray-100 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                >
                  <option value="">-- PILIH ATLET SUDUT MERAH --</option>
                  {eligiblePesilats.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.kontingen})
                    </option>
                  ))}
                </select>
              </div>

              {/* Angle Kuning Picker */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-yellow-400 font-mono block">SUDUT KUNING (CHALLENGER 2)</label>
                <select
                  value={kuningId}
                  onChange={(e) => setKuningId(e.target.value)}
                  className="w-full bg-[#202020] border border-[#333] text-gray-100 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                >
                  <option value="">-- PILIH ATLET SUDUT KUNING --</option>
                  {eligiblePesilats.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.kontingen})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status & Alerts */}
              {formError && (
                <div className="bg-red-950/50 border border-red-900/50 text-red-400 p-3 rounded-lg font-mono text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="bg-green-950/50 border border-green-800/40 text-green-400 p-3 rounded-lg font-mono text-[11px] flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Modal footer / submit buttons */}
              <div className="pt-3 border-t border-[#2d2d2d] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSeedModal(false)}
                  className="px-4 py-2 bg-[#222] border border-[#333] text-gray-400 rounded-lg hover:text-white transition-colors cursor-pointer text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-sans font-black rounded-lg transition-all cursor-pointer text-xs"
                >
                  Semaikan Seeding
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

// SUBCOMPONENT: INDIVIDUAL MATCH NODE CARD
interface MatchNodeProps {
  match: MatchTandingState;
  onLaunch: (id: string) => void;
  onSwap: () => void;
  onDelete: () => void;
  onPromote?: (targetId: string, corner: 'Merah' | 'Kuning') => void;
  potentialTargets?: { id: string; desc: string }[];
  scoreMerah: number;
  scoreKuning: number;
}

const MatchNode: React.FC<MatchNodeProps> = ({
  match,
  onLaunch,
  onSwap,
  onDelete,
  onPromote,
  potentialTargets = [],
  scoreMerah,
  scoreKuning
}) => {
  const isCompleted = match.status === 'Selesai';
  const isLive = match.status === 'Sedang Tanding';

  // State for promotion toggle popup
  const [showPromoteDropdown, setShowPromoteDropdown] = useState(false);

  return (
    <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl hover:border-yellow-500/30 transition-all shadow-md relative group flex flex-col justify-between overflow-hidden">
      
      {/* Node Header details */}
      <div className="bg-black/40 border-b border-[#2d2d2d] px-3.5 py-2 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center space-x-1.5 text-gray-400">
          <Calendar className="w-3.5 h-3.5 text-yellow-500" />
          <span className="font-bold">{match.scheduledTime || '10:00'}</span>
          <span className="opacity-40">|</span>
          <span className="font-medium text-gray-500">{match.id}</span>
        </div>

        {/* Live indicator or winner crown */}
        {isLive ? (
          <span className="bg-red-950 border border-red-900/60 text-red-500 px-1.5 py-0.5 rounded text-[8px] font-extrabold animate-pulse">
            LIVE
          </span>
        ) : isCompleted ? (
          <span className="bg-green-950/40 border border-green-900/40 text-green-400 px-1.5 py-0.5 rounded text-[8px] font-bold">
            SELESAI
          </span>
        ) : (
          <span className="text-gray-600 font-bold uppercase tracking-wider text-[8px] border border-[#2d2d2d] px-1 py-0.5 rounded">
            TERJADWAL
          </span>
        )}
      </div>

      {/* Competitors Scoreboard Rows */}
      <div className="p-3.5 space-y-2.5">
        
        {/* ROW 1: SUDUT MERAH */}
        <div className={`p-2 rounded-lg flex items-center justify-between gap-3 border ${
          isCompleted && match.pemenang === 'Merah'
            ? 'bg-red-950/20 border-red-700/50 text-white font-extrabold'
            : isCompleted
            ? 'bg-black/10 border-transparent text-gray-500 opacity-60'
            : 'bg-black/20 border-[#222] text-gray-200'
        }`}>
          <div className="flex items-center space-x-2 shrink overflow-hidden">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-sm shrink-0"></span>
            <div className="truncate">
              <span className="text-xs truncate block">{match.pesilatMerah.nama}</span>
              <span className="text-[9px] text-gray-500 uppercase truncate block leading-none">{match.pesilatMerah.kontingen}</span>
            </div>
            {isCompleted && match.pemenang === 'Merah' && (
              <span className="text-[10px] text-yellow-500 shrink-0">👑</span>
            )}
          </div>
          <span className="font-mono text-xs font-black">{scoreMerah}</span>
        </div>

        {/* ROW 2: SUDUT KUNING */}
        <div className={`p-2 rounded-lg flex items-center justify-between gap-3 border ${
          isCompleted && match.pemenang === 'Kuning'
            ? 'bg-yellow-950/20 border-yellow-700/50 text-white font-extrabold'
            : isCompleted
            ? 'bg-black/10 border-transparent text-gray-500 opacity-60'
            : 'bg-black/20 border-[#222] text-gray-200'
        }`}>
          <div className="flex items-center space-x-2 shrink overflow-hidden">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm shrink-0"></span>
            <div className="truncate">
              <span className="text-xs truncate block">{match.pesilatKuning.nama}</span>
              <span className="text-[9px] text-gray-500 uppercase truncate block leading-none">{match.pesilatKuning.kontingen}</span>
            </div>
            {isCompleted && match.pemenang === 'Kuning' && (
              <span className="text-[10px] text-yellow-500 shrink-0">👑</span>
            )}
          </div>
          <span className="font-mono text-xs font-black">{scoreKuning}</span>
        </div>

      </div>

      {/* Node Controls Footer Actions */}
      <div className="bg-black/30 border-t border-[#2d2d2d] px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          
          <button
            onClick={onSwap}
            disabled={isCompleted}
            className={`p-1.5 rounded bg-[#222] border border-[#333] hover:border-yellow-500/40 text-gray-400 hover:text-white transition-all cursor-pointer ${isCompleted ? 'opacity-30 cursor-not-allowed' : ''}`}
            title="Tukar Sudut Pesilat"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onDelete}
            className="p-1.5 rounded bg-[#222] border border-[#333] hover:border-red-900/60 hover:text-red-400 text-gray-400 transition-all cursor-pointer"
            title="Hapus Partai ini"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Promote and play controls */}
        <div className="flex items-center gap-1.5 relative">
          
          {/* Promote winner button */}
          {isCompleted && match.pemenang && onPromote && potentialTargets.length > 0 && (
            <div>
              <button
                onClick={() => setShowPromoteDropdown(!showPromoteDropdown)}
                className="px-2.5 py-1 text-[9px] font-mono font-bold bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/20 rounded transition-all cursor-pointer uppercase"
              >
                Promosi →
              </button>

              {/* Promotion options dropdown */}
              {showPromoteDropdown && (
                <div className="absolute bottom-full right-0 mb-1 z-30 bg-[#202020] border border-[#333] p-1.5 rounded-lg shadow-2xl min-w-[200px] text-xs font-sans space-y-1">
                  <span className="text-[8px] font-bold text-gray-500 block uppercase px-1 pb-1 border-b border-[#2d2d2d]">PROMOSIKAN PEMENANG KE:</span>
                  {potentialTargets.map(target => (
                    <div key={target.id} className="p-1 space-y-1 hover:bg-black/20 rounded">
                      <p className="text-[10px] text-gray-400 truncate font-mono">{target.desc}</p>
                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        <button
                          type="button"
                          onClick={() => {
                            onPromote(target.id, 'Merah');
                            setShowPromoteDropdown(false);
                          }}
                          className="px-1.5 py-0.5 bg-red-950 border border-red-900 text-red-400 rounded hover:bg-red-900/20 text-center cursor-pointer"
                        >
                          Merah
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onPromote(target.id, 'Kuning');
                            setShowPromoteDropdown(false);
                          }}
                          className="px-1.5 py-0.5 bg-yellow-950/40 border border-yellow-900/60 text-yellow-400 rounded hover:bg-yellow-900/20 text-center cursor-pointer"
                        >
                          Kuning
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => onLaunch(match.id)}
            disabled={isCompleted}
            className={`px-3 py-1 bg-yellow-500 text-black font-sans text-[10px] font-black rounded-lg flex items-center space-x-1.5 hover:bg-yellow-600 active:scale-95 transition-all cursor-pointer shrink-0 border border-yellow-500 ${
              isCompleted ? 'opacity-30 cursor-not-allowed bg-transparent text-gray-500 border-gray-700/50' : ''
            }`}
          >
            <Play className="w-3 h-3 fill-current shrink-0" />
            <span>{isLive ? 'Pantau' : 'Mulai'}</span>
          </button>
        </div>
      </div>

    </div>
  );
};
