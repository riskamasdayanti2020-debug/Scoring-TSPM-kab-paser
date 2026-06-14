import React, { useState, useEffect } from 'react';
import { useAppState } from '../context/AppContext';
import { MatchSeniState } from '../types';
import { Plus, Minus, CheckCircle, Award, Maximize2, Minimize2 } from 'lucide-react';

interface JuriSeniProps {
  activeMatch: MatchSeniState;
  juriId: number;
  onLogout: () => void;
}

export const JuriSeni: React.FC<JuriSeniProps> = ({ activeMatch, juriId, onLogout }) => {
  const { submitSeniScore } = useAppState();

  const currentScore = activeMatch.skorJuri[juriId];
  const isTunggalRegu = activeMatch.kategoriSeni === 'Tunggal' || activeMatch.kategoriSeni === 'Regu';

  // local states for inputs, initializing with existing value if available
  const [jumlahKesalahan, setJumlahKesalahan] = useState(0);
  const [nilaiB, setNilaiB] = useState(0.08); // for Tunggal/Regu (0.01 - 0.10)
  const [isCustomFullscreen, setIsCustomFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCustomFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // for Ganda/Solo Kreatif (0.01 - 0.30)
  const [nilaiTeknik, setNilaiTeknik] = useState(0.25);
  const [nilaiKetegasan, setNilaiKetegasan] = useState(0.25);
  const [nilaiPenjiwaan, setNilaiPenjiwaan] = useState(0.25);

  const [penguranganHukuman, setPenguranganHukuman] = useState(0);
  const [catatan, setCatatan] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Load existing score if present, OR load from draft key in localStorage
  useEffect(() => {
    if (currentScore) {
      setJumlahKesalahan(currentScore.jumlahKesalahan || 0);
      setNilaiB(currentScore.nilaiB !== undefined ? currentScore.nilaiB : (currentScore.skorKemantapan || 0.08));
      
      setNilaiTeknik(currentScore.nilaiTeknik !== undefined ? currentScore.nilaiTeknik : 0.25);
      setNilaiKetegasan(currentScore.nilaiKetegasan !== undefined ? currentScore.nilaiKetegasan : 0.25);
      setNilaiPenjiwaan(currentScore.nilaiPenjiwaan !== undefined ? currentScore.nilaiPenjiwaan : 0.25);

      setPenguranganHukuman(currentScore.penguranganHukuman || 0);
      setCatatan(currentScore.catatan || '');
    } else {
      const draftKey = `tapak_suci_draft_seni_${activeMatch.id}_juri_${juriId}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setJumlahKesalahan(parsed.jumlahKesalahan ?? 0);
          setNilaiB(parsed.nilaiB ?? 0.08);
          setNilaiTeknik(parsed.nilaiTeknik ?? 0.25);
          setNilaiKetegasan(parsed.nilaiKetegasan ?? 0.25);
          setNilaiPenjiwaan(parsed.nilaiPenjiwaan ?? 0.25);
          setPenguranganHukuman(parsed.penguranganHukuman ?? 0);
          setCatatan(parsed.catatan ?? '');
        } catch (e) {
          console.error('Failed to parse draft score', e);
        }
      } else {
        setJumlahKesalahan(0);
        setNilaiB(0.08);
        setNilaiTeknik(0.25);
        setNilaiKetegasan(0.25);
        setNilaiPenjiwaan(0.25);
        setPenguranganHukuman(0);
        setCatatan('');
      }
    }
  }, [currentScore, activeMatch.id, juriId]);

  // Save draft whenever inputs change, but ONLY if they are not yet submitted to the global state
  useEffect(() => {
    if (!currentScore) {
      const draftKey = `tapak_suci_draft_seni_${activeMatch.id}_juri_${juriId}`;
      const draftData = {
        jumlahKesalahan,
        nilaiB,
        nilaiTeknik,
        nilaiKetegasan,
        nilaiPenjiwaan,
        penguranganHukuman,
        catatan,
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    }
  }, [jumlahKesalahan, nilaiB, nilaiTeknik, nilaiKetegasan, nilaiPenjiwaan, penguranganHukuman, catatan, activeMatch.id, juriId, currentScore]);

  // Mistakes deductions handler for Tunggal/Regu (Each mistake subtracts 0.01 point from 9.90)
  const handleMistakeChange = (action: 'inc' | 'dec') => {
    let nextCount = jumlahKesalahan;
    if (action === 'inc') {
      nextCount++;
    } else {
      nextCount = Math.max(0, nextCount - 1);
    }
    setJumlahKesalahan(nextCount);
  };

  const handlePenaltyTick = (amount: number) => {
    // Round to 2 decimal places
    setPenguranganHukuman(prev => parseFloat(Math.max(0, prev + amount).toFixed(2)));
  };

  const handlePenaltyReset = () => {
    setPenguranganHukuman(0);
  };

  // Compute live scores based on category
  const nilaiA = isTunggalRegu ? parseFloat((9.90 - jumlahKesalahan * 0.01).toFixed(2)) : 0;
  
  const calculatedTotal = isTunggalRegu
    ? parseFloat((nilaiA + nilaiB - penguranganHukuman).toFixed(2))
    : parseFloat((9.10 + nilaiTeknik + nilaiKetegasan + nilaiPenjiwaan - penguranganHukuman).toFixed(2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSeniScore(activeMatch.id, juriId, {
      skorJurus: isTunggalRegu ? nilaiA : nilaiTeknik,
      jumlahKesalahan,
      skorKemantapan: isTunggalRegu ? nilaiB : nilaiKetegasan,
      penguranganHukuman,
      catatan,
      nilaiA: isTunggalRegu ? nilaiA : undefined,
      nilaiB: isTunggalRegu ? nilaiB : undefined,
      nilaiTeknik: !isTunggalRegu ? nilaiTeknik : undefined,
      nilaiKetegasan: !isTunggalRegu ? nilaiKetegasan : undefined,
      nilaiPenjiwaan: !isTunggalRegu ? nilaiPenjiwaan : undefined,
    });
    
    // Clean up draft on successful submit
    const draftKey = `tapak_suci_draft_seni_${activeMatch.id}_juri_${juriId}`;
    localStorage.removeItem(draftKey);

    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  // Static target milestones of movements per jurus subdivision from the sheets
  const tunggalMilestones = [
    { jurus: 1, gerak: 7 }, { jurus: 2, gerak: 13 }, { jurus: 3, gerak: 18 }, { jurus: 4, gerak: 25 }, { jurus: 5, gerak: 31 }, { jurus: 6, gerak: 39 }, { jurus: 7, gerak: 50 },
    { jurus: 8, gerak: 57 }, { jurus: 9, gerak: 63 }, { jurus: 10, gerak: 75 }, { jurus: 11, gerak: 81 }, { jurus: 12, gerak: 86 }, { jurus: 13, gerak: 91 }, { jurus: 14, gerak: 100 }
  ];

  const reguMilestones = [
    { jurus: 1, gerak: 9 }, { jurus: 2, gerak: 18 }, { jurus: 3, gerak: 28 }, { jurus: 4, gerak: 37 }, { jurus: 5, gerak: 44 }, { jurus: 6, gerak: 52 },
    { jurus: 7, gerak: 61 }, { jurus: 8, gerak: 72 }, { jurus: 9, gerak: 81 }, { jurus: 10, gerak: 85 }, { jurus: 11, gerak: 93 }, { jurus: 12, gerak: 100 }
  ];

  return (
    <div className={`space-y-6 font-mono text-gray-105 transition-all duration-350 ${
      isCustomFullscreen ? 'fixed inset-0 z-50 bg-[#070707] p-8 md:p-12 overflow-y-auto flex flex-col justify-start' : ''
    }`}>
      {/* Juri Header */}
      <div className="flex items-center justify-between bg-[#161616] border border-[#333] p-4 rounded-xl shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#222] border border-[#444] rounded-lg flex items-center justify-center font-mono font-bold text-lg text-yellow-500">
            J{juriId}
          </div>
          <div>
            <h2 className="text-sm font-mono uppercase font-black text-white">WASIT JURI {juriId} • PENILAIAN SENI TGRS</h2>
            <p className="text-[10px] text-gray-400 font-sans mt-0.5">Partai Seni: t{activeMatch.id} | {activeMatch.kategoriSeni}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsCustomFullscreen(!isCustomFullscreen)}
            className="text-[10px] bg-[#222] hover:bg-[#333] text-yellow-505 font-bold px-3 py-1.5 rounded border border-yellow-905/30 cursor-pointer transition-all uppercase flex items-center space-x-1"
          >
            {isCustomFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Kecilkan</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Layar Penuh</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="text-[10px] bg-[#222] hover:bg-[#333] text-red-100 font-bold px-3 py-1.5 rounded border border-red-900/30 cursor-pointer transition-all uppercase"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Participant profile */}
      <div className="bg-[#211a12] border border-amber-950/45 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-mono font-bold text-amber-500 tracking-wider">PESILAT / REGU SENI</span>
          <p className="text-base font-black text-gray-100">{activeMatch.pesilat.nama}</p>
          <p className="text-xs text-gray-400 font-sans">{activeMatch.pesilat.kontingen}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono font-bold text-amber-500 tracking-wider block">KATEGORI PERTANDINGAN</span>
          <span className="inline-block bg-[#0f0f0f] border border-amber-500/20 px-3 py-1 rounded text-xs font-bold text-yellow-500 mt-1 uppercase">
            ✨ Seni {activeMatch.kategoriSeni}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Form controls */}
        <div className="md:col-span-8 bg-[#161616] p-6 rounded-xl border border-[#333] space-y-6">
          
          {isTunggalRegu ? (
            /* ================= TUNGGAL & REGU FORM ================= */
            <div className="space-y-6">
              {/* Section 1: Kebenaran Jurus (Nilai A) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[#2d2d2d] pb-2">
                  <h3 className="font-bold text-white flex items-center space-x-1.5 text-xs uppercase">
                    <span className="w-5 h-5 bg-red-950 text-red-400 border border-red-900/40 rounded text-xs flex items-center justify-center">A</span>
                    <span>Nilai A: Kebenaran Gerak & Urutan</span>
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono">Nilai Awal Dasar: 9.90</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg border border-[#2d2d2d]">
                  <div>
                    <span className="text-xs font-bold text-gray-300 block uppercase">Jumlah Kesalahan Gerak</span>
                    <span className="text-[10px] text-gray-500 font-sans">Setiap kesalahan/gerakan terlewat mengurangi -0.01 poin.</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => handleMistakeChange('dec')}
                      className="w-10 h-10 bg-[#222] hover:bg-[#2c2c2c] text-white rounded border border-[#3a3a3a] flex items-center justify-center cursor-pointer font-bold transition-all"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-lg font-mono font-black text-white min-w-[32px] text-center">
                      {jumlahKesalahan}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMistakeChange('inc')}
                      className="w-10 h-10 bg-[#222] hover:bg-[#2c2c2c] text-white rounded border border-[#3a3a3a] flex items-center justify-center cursor-pointer font-bold transition-all"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-[#1e1111] p-3 rounded border border-red-950/40 text-xs text-red-300">
                  <span className="font-sans text-gray-400">Hasil Akhir Nilai A:</span>
                  <span className="font-mono font-bold text-red-400">
                    9.90 - ({jumlahKesalahan} x 0.01) = {nilaiA.toFixed(2)} Poin
                  </span>
                </div>

                {/* Milestones / Jurus details grid visually representation */}
                <div className="space-y-2 mt-4 bg-[#0a0a0a] p-3.5 rounded-lg border border-[#222]">
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Rujukan Rincian Jurus & Akumulasi Gerakan (IPSI)</span>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 text-center">
                    {(activeMatch.kategoriSeni === 'Tunggal' ? tunggalMilestones : reguMilestones).map((milestone) => (
                      <div key={milestone.jurus} className="bg-[#111] p-1.5 rounded border border-[#2d2d2d] flex flex-col justify-center">
                        <span className="text-[8px] text-gray-500 uppercase font-sans">Jurus {milestone.jurus}</span>
                        <span className="text-[10px] font-black text-yellow-500 mt-0.5">{milestone.gerak}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 2: Kemantapan (Nilai B) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[#2d2d2d] pb-2">
                  <h3 className="font-bold text-white flex items-center space-x-1.5 text-xs uppercase">
                    <span className="w-5 h-5 bg-amber-950 text-amber-500 border border-amber-900/40 rounded text-xs flex items-center justify-center">B</span>
                    <span>Nilai B: Kemantapan, Irama, Penghayatan, Kekompakan</span>
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono">Rentang Nilai: 0.01 s/d 0.10</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg border border-[#2d2d2d]">
                    <div>
                      <span className="text-xs font-bold text-gray-300 block uppercase">Input Nilai B</span>
                      <ul className="text-[9px] text-gray-500 font-sans list-disc list-inside space-y-0.5 mt-1 leading-relaxed">
                        <li>Ritme & Irama Gerakan</li>
                        <li>{activeMatch.kategoriSeni === 'Regu' ? 'Kekompakan Sinkronisasi' : 'Penghayatan Ekspresi'}</li>
                        <li>Tenaga & Stamina Prima</li>
                      </ul>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setNilaiB(prev => parseFloat(Math.max(0.01, prev - 0.01).toFixed(2)))}
                        className="w-10 h-10 bg-[#222] hover:bg-[#2c2c2c] text-white rounded border border-[#3a3a3a] flex items-center justify-center cursor-pointer font-bold transition-all"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-base font-mono font-black text-[#FFD700] min-w-[50px] text-center">
                        {nilaiB.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setNilaiB(prev => parseFloat(Math.min(0.10, prev + 0.01).toFixed(2)))}
                        className="w-10 h-10 bg-[#222] hover:bg-[#2c2c2c] text-white rounded border border-[#3a3a3a] flex items-center justify-center cursor-pointer font-bold transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 bg-[#121212] p-3 rounded-lg border border-[#222]">
                    <div className="flex justify-between text-[9px] text-gray-500 font-bold">
                      <span>MIN (0.01)</span>
                      <span>MAX (0.10)</span>
                    </div>
                    <input
                      id="range-kemantapan"
                      type="range"
                      min="0.01"
                      max="0.10"
                      step="0.01"
                      value={nilaiB}
                      onChange={(e) => setNilaiB(parseFloat(e.target.value))}
                      className="w-full select-none cursor-pointer accent-amber-600 block my-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= GANDA & SOLO KREATIF FORM ================= */
            <div className="space-y-6">
              <div className="bg-[#121212] p-4 rounded-lg border border-[#2d2d2d] text-xs space-y-1.5 text-gray-400">
                <span className="font-extrabold text-[#FFD700] uppercase block text-[10px]">Aturan Borang Ganda & Solo Kreativitas (Dewan & IPSI)</span>
                <p className="font-sans leading-relaxed">
                  Penilaian didasarkan pada skor dasar statis senilai <strong className="text-gray-150 font-mono text-xs">9.10</strong> ditambah dengan akumulasi tiga unsur borang penilaian yang bernilai maksimal masing-masing <strong className="text-gray-150 font-mono text-xs">0.30</strong> poin.
                </p>
              </div>

              {/* component 1: Teknik */}
              <div className="p-4 bg-[#0f0f0f] rounded-lg border border-[#2d2d2d] space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                  <div>
                    <span className="text-xs font-bold text-gray-300 block uppercase">1. Teknik Serangan Pertahanan</span>
                    <span className="text-[9px] text-gray-500 font-sans">Kualitas, Kekayaan Teknik, Keterampilan, Kreativitas, Logika Gerakan.</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setNilaiTeknik(prev => parseFloat(Math.max(0.01, prev - 0.01).toFixed(2)))}
                      className="w-8 h-8 bg-[#222] hover:bg-[#2c2c2c] text-white rounded border border-[#333] flex items-center justify-center cursor-pointer text-xs transition-all"
                    >
                      -
                    </button>
                    <span className="text-sm font-mono font-black text-[#FFD700] min-w-[40px] text-center">
                      {nilaiTeknik.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNilaiTeknik(prev => parseFloat(Math.min(0.30, prev + 0.01).toFixed(2)))}
                      className="w-8 h-8 bg-[#222] hover:bg-[#2c2c2c] text-white rounded border border-[#333] flex items-center justify-center cursor-pointer text-xs transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.30"
                  step="0.01"
                  value={nilaiTeknik}
                  onChange={(e) => setNilaiTeknik(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-amber-600 block"
                />
              </div>

              {/* component 2: Ketegasan */}
              <div className="p-4 bg-[#0f0f0f] rounded-lg border border-[#2d2d2d] space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                  <div>
                    <span className="text-xs font-bold text-gray-300 block uppercase">2. Ketegasan & Harmoni</span>
                    <span className="text-[9px] text-gray-500 font-sans">Harmoni Atlet, Keterampilan Senjata, Tenaga dan Stamina Prima.</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setNilaiKetegasan(prev => parseFloat(Math.max(0.01, prev - 0.01).toFixed(2)))}
                      className="w-8 h-8 bg-[#222] hover:bg-[#2c2c2c] text-white rounded border border-[#333] flex items-center justify-center cursor-pointer text-xs transition-all"
                    >
                      -
                    </button>
                    <span className="text-sm font-mono font-black text-[#FFD700] min-w-[40px] text-center">
                      {nilaiKetegasan.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNilaiKetegasan(prev => parseFloat(Math.min(0.30, prev + 0.01).toFixed(2)))}
                      className="w-8 h-8 bg-[#222] hover:bg-[#2c2c2c] text-white rounded border border-[#333] flex items-center justify-center cursor-pointer text-xs transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.30"
                  step="0.01"
                  value={nilaiKetegasan}
                  onChange={(e) => setNilaiKetegasan(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-amber-600 block"
                />
              </div>

              {/* component 3: Penjiwaan */}
              <div className="p-4 bg-[#0f0f0f] rounded-lg border border-[#2d2d2d] space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                  <div>
                    <span className="text-xs font-bold text-gray-300 block uppercase">3. Penjiwaan / Penghayatan</span>
                    <span className="text-[9px] text-gray-500 font-sans">Karakteristik Ekspresi Gerakan Jurus / Skenario Penampilan.</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setNilaiPenjiwaan(prev => parseFloat(Math.max(0.01, prev - 0.01).toFixed(2)))}
                      className="w-8 h-8 bg-[#222] hover:bg-[#2c2c2c] text-white rounded border border-[#333] flex items-center justify-center cursor-pointer text-xs transition-all"
                    >
                      -
                    </button>
                    <span className="text-sm font-mono font-black text-[#FFD700] min-w-[40px] text-center">
                      {nilaiPenjiwaan.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNilaiPenjiwaan(prev => parseFloat(Math.min(0.30, prev + 0.01).toFixed(2)))}
                      className="w-8 h-8 bg-[#222] hover:bg-[#2c2c2c] text-white rounded border border-[#333] flex items-center justify-center cursor-pointer text-xs transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.30"
                  step="0.01"
                  value={nilaiPenjiwaan}
                  onChange={(e) => setNilaiPenjiwaan(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-amber-600 block"
                />
              </div>
            </div>
          )}

          {/* Section 3: Hukuman */}
          <div className="space-y-4 pt-4 border-t border-[#2d2d2d]/60">
            <h3 className="font-bold text-white flex items-center space-x-1.5 text-xs uppercase border-b border-[#2d2d2d] pb-2">
              <span className="w-5 h-5 bg-[#222] text-gray-300 border border-[#333] rounded text-xs flex items-center justify-center">⚠</span>
              <span>Input Pengurangan Hukuman Wasit Juri</span>
            </h3>

            <div className="space-y-2 text-xs">
              <span className="text-gray-500 font-bold uppercase font-mono text-[9px] block">Tombol Pintasan Pinalti Aturan Seni</span>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handlePenaltyTick(0.05)}
                  className="px-3 py-2 bg-[#0f0f0f] border border-[#2c2c2c] hover:bg-[#151515] rounded text-left text-gray-300 font-sans flex flex-col justify-between cursor-pointer"
                >
                  <span className="block font-bold font-mono uppercase text-[10px]">Senjata Jatuh / Keluar</span>
                  <span className="text-[10px] text-red-400 font-mono font-bold mt-1">+0.05 Hukuman</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePenaltyTick(0.05)}
                  className="px-3 py-2 bg-[#0f0f0f] border border-[#2c2c2c] hover:bg-[#151515] rounded text-left text-gray-300 font-sans flex flex-col justify-between cursor-pointer"
                >
                  <span className="block font-bold font-mono uppercase text-[10px]">Keluar Gelanggang</span>
                  <span className="text-[10px] text-red-400 font-mono font-bold mt-1">+0.05 Hukuman</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePenaltyTick(0.01)}
                  className="px-3 py-2 bg-[#0f0f0f] border border-[#2c2c2c] hover:bg-[#151515] rounded text-left text-gray-300 font-sans flex flex-col justify-between cursor-pointer"
                >
                  <span className="block font-bold font-mono uppercase text-[10px]">Deviasi Waktu (Detik)</span>
                  <span className="text-[10px] text-red-400 font-mono font-bold mt-1">+0.01 Hukuman</span>
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-[#0d0d0d] rounded text-xs border border-[#2d2d2d]">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-400">Total Pengurangan Hukuman:</span>
                <span className="font-mono font-bold text-red-400">-{penguranganHukuman.toFixed(2)} Poin</span>
              </div>
              <button
                type="button"
                onClick={handlePenaltyReset}
                className="text-[9px] font-mono bg-[#222] hover:bg-[#2d2d2d] text-red-400 px-2 py-1 rounded border border-red-900/30 font-bold cursor-pointer"
              >
                RESET PINALTI
              </button>
            </div>
          </div>

          {/* Catatan Tambahan */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 block uppercase">Catatan Wasit Juri (Opsional)</label>
            <textarea
              id="catatan-juri-text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Sebutkan catatan kesalahan penting disini jika perlu..."
              className="w-full text-xs p-3 bg-[#0f0f0f] rounded border border-[#333] focus:outline-none focus:border-amber-500 font-sans"
              rows={2}
            />
          </div>
        </div>

        {/* Right Score summary */}
        <div className="md:col-span-4 flex flex-col space-y-6">
          <div className="bg-[#161616] border border-[#333] text-gray-100 p-6 rounded-xl shadow-md text-center space-y-4 flex-1 flex flex-col justify-between py-8">
            <div className="space-y-2 font-mono">
              <Award className="w-10 h-10 text-yellow-500 mx-auto" />
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">REKAPITULASI BORANG NILAI</h3>
              <p className="text-gray-400 text-[10px] leading-relaxed font-sans">
                {isTunggalRegu ? (
                  `Skor akhir dihitung berdasarkan penjumlahan dari Nilai A Kebenaran (${nilaiA.toFixed(2)}) dan Nilai B Kemantapan (${nilaiB.toFixed(2)}), dikurangi Nilai Pinalti (${penguranganHukuman.toFixed(2)}).`
                ) : (
                  `Skor akhir dihitung berdasarkan konstanta 9.10 + Nilai Teknik (${nilaiTeknik.toFixed(2)}) + Nilai Ketegasan (${nilaiKetegasan.toFixed(2)}) + Nilai Penjiwaan (${nilaiPenjiwaan.toFixed(2)}), dikurangi Nilai Pinalti (${penguranganHukuman.toFixed(2)}).`
                )}
              </p>
            </div>

            <div className="bg-[#0f0f0f] rounded-lg p-5 border border-[#2d2d2d] space-y-1">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">TOTAL SKOR WASIT JURI</span>
              <div className="text-4xl font-mono font-black text-[#FFD700]">
                {calculatedTotal.toFixed(2)}
              </div>
              <span className="text-[9px] text-gray-500 font-mono">
                {isTunggalRegu ? (
                  `(${nilaiA.toFixed(2)} + ${nilaiB.toFixed(2)} - ${penguranganHukuman.toFixed(2)})`
                ) : (
                  `(9.10 + ${nilaiTeknik.toFixed(2)} + ${nilaiKetegasan.toFixed(2)} + ${nilaiPenjiwaan.toFixed(2)} - ${penguranganHukuman.toFixed(2)})`
                )}
              </span>
            </div>

            <div className="space-y-2">
              {isSubmitted && (
                <div className="p-2.5 bg-[#122416] text-green-400 font-bold border border-green-900/30 rounded text-[10px] flex items-center justify-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>BORANG NILAI BERHASIL DISERAHKAN!</span>
                </div>
              )}

              <button
                id="submit-score-seni-btn"
                type="submit"
                className="w-full py-3 rounded bg-amber-600 hover:bg-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md"
              >
                <span>Serahkan Nilai</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
