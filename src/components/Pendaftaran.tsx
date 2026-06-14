import React, { useState } from 'react';
import { useAppState } from '../context/AppContext';
import { KategoriUsia, TipePertandingan } from '../types';
import { UserPlus, Trash2, Award, Scale, HelpCircle } from 'lucide-react';

export const Pendaftaran: React.FC = () => {
  const { pesilatList, addPesilat, deletePesilat } = useAppState();

  const [nama, setNama] = useState('');
  const [kontingen, setKontingen] = useState('');
  const [kategoriUsia, setKategoriUsia] = useState<KategoriUsia>('Remaja');
  const [tipe, setTipe] = useState<TipePertandingan>('Tanding');
  const [berat, setBerat] = useState('');
  const [kelasTanding, setKelasTanding] = useState('Kelas A');
  const [kategoriSeni, setKategoriSeni] = useState<'Tunggal' | 'Ganda' | 'Regu' | 'Solo Kreatif'>('Tunggal');

  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nama.trim()) {
      setError('Nama lengkap atlet harus diisi!');
      return;
    }
    if (!kontingen.trim()) {
      setError('Kontingen / Pimpinan Daerah harus diisi!');
      return;
    }

    if (tipe === 'Tanding') {
      addPesilat({
        nama: nama.trim(),
        kontingen: kontingen.trim(),
        kategoriUsia,
        tipe,
        berat: berat ? `${berat} Kg` : undefined,
        kelasTanding,
      });
    } else {
      addPesilat({
        nama: nama.trim(),
        kontingen: kontingen.trim(),
        kategoriUsia,
        tipe,
        kategoriSeni,
      });
    }

    // Reset Form
    setNama('');
    setKontingen('');
    setBerat('');
  };

  const categories: KategoriUsia[] = ['Usia Dini', 'Pra Remaja', 'Remaja', 'Dewasa'];
  const tgrsTypes = ['Tunggal', 'Ganda', 'Regu', 'Solo Kreatif'];
  const classes = ['Kelas A', 'Kelas B', 'Kelas C', 'Kelas D', 'Kelas E', 'Kelas F', 'Kelas G', 'Kelas Bebas'];

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 px-2 text-gray-100">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#333] pb-4">
        <div>
          <h1 className="text-2xl font-mono uppercase font-black text-white tracking-tight">Registrasi Atlet Pesilat</h1>
          <p className="text-gray-400 font-sans text-xs">Pendaftaran dan manajemen atlet Tapak Suci untuk kategori Tanding & Seni.</p>
        </div>
        <div className="font-mono text-xs text-gray-400 mt-2 md:mt-0 bg-[#161616] px-3 py-1.5 rounded-lg border border-[#333]">
          Total Terdaftar: <span className="font-bold text-[#FFD700]">{pesilatList.length} Atlet</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Input Form */}
        <div className="lg:col-span-5 bg-[#161616] p-6 rounded-xl border border-[#333] shadow-md space-y-6">
          <h2 className="text-base font-mono uppercase font-bold text-white flex items-center space-x-2">
            <UserPlus className="w-4 h-4 text-red-500" />
            <span>Formulir Pendaftaran</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
            {error && (
              <div className="p-3 bg-red-950/80 border border-red-900/50 text-red-200 rounded-lg text-xs font-mono font-bold">
                ⚠️ {error}
              </div>
            )}

            {/* Nama */}
            <div className="space-y-1">
              <label className="block text-gray-450 font-mono text-[10px] uppercase tracking-wider font-semibold">Nama Lengkap Atlet</label>
              <input
                id="atlet-name"
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Ahmad Fathoni"
                className="w-full px-4 py-2.5 rounded-lg bg-[#222] border border-[#333] text-gray-100 placeholder-gray-600 focus:outline-hidden focus:border-red-500 transition-colors font-sans text-xs"
              />
            </div>

            {/* Kontingen */}
            <div className="space-y-1">
              <label className="block text-gray-455 font-mono text-[10px] uppercase tracking-wider font-semibold">Kontingen / Cabang / PIMDA</label>
              <input
                id="atlet-contingent"
                type="text"
                value={kontingen}
                onChange={(e) => setKontingen(e.target.value)}
                placeholder="Pimda 02 Bantul"
                className="w-full px-4 py-2.5 rounded-lg bg-[#222] border border-[#333] text-gray-100 placeholder-gray-600 focus:outline-hidden focus:border-red-500 transition-colors"
              />
            </div>

            {/* Grid Usia & Tipe */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-gray-455 font-mono text-[10px] uppercase tracking-wider font-semibold">Kategori Usia</label>
                <select
                  id="atlet-age-category"
                  value={kategoriUsia}
                  onChange={(e) => setKategoriUsia(e.target.value as KategoriUsia)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#222] border border-[#333] text-gray-100 focus:outline-hidden focus:border-red-500 font-sans"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-[#222] text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-gray-455 font-mono text-[10px] uppercase tracking-wider font-semibold">Tipe Kategori</label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-[#111] rounded-lg border border-[#333]">
                  <button
                    type="button"
                    onClick={() => setTipe('Tanding')}
                    className={`text-center py-1.5 rounded-md text-[10px] font-mono leading-none tracking-wider uppercase font-bold transition-all ${
                      tipe === 'Tanding' ? 'bg-[#8B0000] text-white shadow-xs' : 'text-gray-400 hover:bg-[#222]'
                    }`}
                  >
                    Tanding
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipe('Seni')}
                    className={`text-center py-1.5 rounded-md text-[10px] font-mono leading-none tracking-wider uppercase font-bold transition-all ${
                      tipe === 'Seni' ? 'bg-[#8B0000] text-white shadow-xs' : 'text-gray-400 hover:bg-[#222]'
                    }`}
                  >
                    Seni
                  </button>
                </div>
              </div>
            </div>

            {/* Conditional Input (Tanding) */}
            {tipe === 'Tanding' ? (
              <div className="space-y-4 p-4 rounded-lg bg-red-950/20 border border-red-900/30">
                <span className="text-[10px] font-mono font-bold text-red-400 flex items-center space-x-1 uppercase tracking-wider">
                  <Scale className="w-3.5 h-3.5 inline text-red-400" />
                  <span>Kelengkapan Tanding (Fighter)</span>
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">Berat Badan (Kg)</label>
                    <input
                      id="atlet-weight"
                      type="number"
                      value={berat}
                      onChange={(e) => setBerat(e.target.value)}
                      placeholder="53"
                      className="w-full px-3 py-2 rounded bg-[#222] border border-[#333] text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">Kelas Tanding</label>
                    <select
                      id="atlet-tanding-class"
                      value={kelasTanding}
                      onChange={(e) => setKelasTanding(e.target.value)}
                      className="w-full px-2 py-2 rounded bg-[#222] border border-[#333] text-white"
                    >
                      {classes.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* Conditional Input (Seni TGRS) */
              <div className="space-y-4 p-4 rounded-lg bg-amber-950/20 border border-amber-900/30">
                <span className="text-[10px] font-mono font-bold text-[#FFD700] flex items-center space-x-1 uppercase tracking-wider">
                  <Award className="w-3.5 h-3.5 inline text-yellow-400" />
                  <span>Kategori Seni TGRS</span>
                </span>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">Golongan Seni</label>
                  <select
                    id="atlet-seni-class"
                    value={kategoriSeni}
                    onChange={(e) =>
                      setKategoriSeni(e.target.value as 'Tunggal' | 'Ganda' | 'Regu' | 'Solo Kreatif')
                    }
                    className="w-full px-3 py-2 rounded bg-[#222] border border-[#333] text-white"
                  >
                    {tgrsTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button
              id="submit-atlet-btn"
              type="submit"
              className="w-full py-3 rounded-lg bg-[#8B0000] border border-[#ffd70033] hover:bg-red-800 text-white font-mono uppercase tracking-wider font-bold flex items-center justify-center space-x-2 shadow-md transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftarkan Pesilat</span>
            </button>
          </form>
        </div>

        {/* Right: Participants Roster */}
        <div className="lg:col-span-7 bg-[#161616] p-6 rounded-xl border border-[#333] shadow-md flex flex-col min-h-[450px]">
          <h2 className="text-base font-mono uppercase font-bold text-white mb-4 pb-2 border-b border-[#333] flex justify-between items-center">
            <span>Daftar Pesilat Terdaftar</span>
            <span className="text-xs bg-[#222] text-[#FFD700] px-2 py-0.5 rounded border border-[#ffd70033]">
              {pesilatList.length} Atlet
            </span>
          </h2>

          {pesilatList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500">
              <HelpCircle className="w-12 h-12 stroke-1 mb-2 text-gray-600" />
              <p className="font-mono text-xs uppercase text-gray-400">Belum ada pesilat terdaftar.</p>
              <p className="text-[11px] max-w-xs mt-1 text-gray-650">Gunakan formulir disamping untuk mendaftarkan atlet pertama kontingen Anda.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 space-y-3">
              {pesilatList.map((p) => (
                <div
                  key={p.id}
                  id={`atlet-row-${p.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-[#222]/30 border border-[#333] hover:border-yellow-500/30 transition-all shadow-xs"
                >
                  <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-sans font-bold text-white truncate">{p.nama}</span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          p.tipe === 'Tanding'
                            ? 'bg-red-950/60 text-red-400 border border-red-900/40'
                            : 'bg-amber-950/60 text-amber-400 border border-amber-900/40'
                        }`}
                      >
                        {p.tipe}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[11px] text-gray-450 font-mono">
                      <span className="font-semibold text-gray-300">{p.kontingen}</span>
                      <span className="text-gray-600">•</span>
                      <span>{p.kategoriUsia}</span>
                      <span className="text-gray-600">•</span>
                      {p.tipe === 'Tanding' ? (
                        <span className="text-red-400 bg-red-950/20 px-1.5 rounded border border-red-900/20">
                          {p.kelasTanding} ({p.berat})
                        </span>
                      ) : (
                        <span className="text-amber-400 bg-amber-950/20 px-1.5 rounded border border-amber-900/20">
                          Seni TGRS: {p.kategoriSeni}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deletePesilat(p.id)}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-black/40 border border-transparent hover:border-[#333] rounded-md transition-all cursor-pointer"
                    title="Hapus Atlet"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
