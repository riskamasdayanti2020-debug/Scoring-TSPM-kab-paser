import React, { useState } from 'react';
import { useAppState } from '../context/AppContext';
import { JuriTanding } from './JuriTanding';
import { JuriSeni } from './JuriSeni';
import { UserCheck, Shield, Award, Tv, Eye } from 'lucide-react';

export const JuriLogin: React.FC = () => {
  const {
    matchesTanding,
    matchesSeni,
    activeTandingId,
    activeSeniId,
    juriId,
    isJuriSeni,
    loginAsJuri,
  } = useAppState();

  const [selectedJuriId, setSelectedJuriId] = useState<number | null>(null);
  const [selectedIsSeni, setSelectedIsSeni] = useState(false);
  const [juriPassword, setJuriPassword] = useState('');
  const [juriError, setJuriError] = useState('');
  const [showJuriPassword, setShowJuriPassword] = useState(false);

  // Active matches
  const activeTanding = matchesTanding.find((m) => m.id === activeTandingId);
  const activeSeni = matchesSeni.find((m) => m.id === activeSeniId);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedJuriId === null) return;
    
    const isValid = 
      (selectedJuriId === 1 && (juriPassword === 'juri1' || juriPassword === 'juri123')) ||
      (selectedJuriId === 2 && (juriPassword === 'juri2' || juriPassword === 'juri123')) ||
      (selectedJuriId === 3 && (juriPassword === 'juri3' || juriPassword === 'juri123')) ||
      (selectedJuriId === 4 && (juriPassword === 'juri4' || juriPassword === 'juri123'));
      
    if (isValid) {
      loginAsJuri(selectedJuriId, selectedIsSeni);
      setJuriError('');
      setJuriPassword('');
    } else {
      setJuriError(`Kata sandi salah atau tidak diisi untuk Juri ${selectedJuriId}!`);
    }
  };

  const handleLogout = () => {
    loginAsJuri(null, false);
    setSelectedJuriId(null);
    setJuriPassword('');
    setJuriError('');
  };

  // If already logged in, route to correct judging pad
  if (juriId !== null) {
    if (isJuriSeni) {
      if (!activeSeni) {
        return (
          <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4 font-mono text-gray-100">
            <div className="bg-[#181612] p-8 rounded-xl border border-yellow-950/40 flex flex-col items-center">
              <Award className="w-12 h-12 text-yellow-500 mb-4 animate-bounce" />
              <h3 className="font-mono uppercase font-black text-[#FFD700] text-sm tracking-wider">Menunggu Partai Seni</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed font-sans">
                Anda login sebagai <span className="font-bold font-mono text-yellow-400 text-xs">Juri {juriId} (Seni)</span>. Operator belum meluncurkan partai seni aktif. Harap tunggu wasit meluncurkan partai.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-red-400 font-mono font-bold hover:text-red-300 hover:underline cursor-pointer"
            >
              ← GANTI AKUN JURI
            </button>
          </div>
        );
      }
      return <JuriSeni activeMatch={activeSeni} juriId={juriId} onLogout={handleLogout} />;
    } else {
      if (!activeTanding) {
        return (
          <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4 font-mono text-gray-100">
            <div className="bg-[#1f1111] p-8 rounded-xl border border-red-950/40 flex flex-col items-center">
              <Shield className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
              <h3 className="font-mono uppercase font-black text-red-400 text-sm tracking-wider">Menunggu Partai Tanding</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed font-sans">
                Anda login sebagai <span className="font-bold font-mono text-red-400 text-xs">Juri {juriId} (Tanding)</span>. Operator belum menunjuk partai tanding aktif.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-red-500 font-mono font-bold hover:text-red-400 hover:underline cursor-pointer"
            >
              ← GANTI AKUN JURI
            </button>
          </div>
        );
      }
      return <JuriTanding activeMatch={activeTanding} juriId={juriId} onLogout={handleLogout} />;
    }
  }

  // Otherwise, render logging input
  return (
    <div className="max-w-md mx-auto py-4 px-2 font-mono text-gray-100">
      <div className="bg-[#161616] p-6 rounded-xl border border-[#333] space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 bg-[#222] border border-[#444] text-[#FFD700] rounded-lg mx-auto flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-mono uppercase font-black text-white tracking-wider">LOGIN WASIT JURI</h2>
          <p className="text-gray-400 text-[11px] font-sans">Silakan pilih kursi Wasit Juri Anda dan disiplin kategori untuk masuk ke panel penilaian real-time.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 text-sm">
          {/* Select Juri Seat */}
          <div className="space-y-2">
            <label className="block text-gray-400 font-bold text-[10px] tracking-wider uppercase">KURSI WASIT JURI</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedJuriId(id)}
                  className={`py-3.5 rounded border font-mono font-bold text-sm transition-all cursor-pointer uppercase ${
                    selectedJuriId === id
                      ? 'bg-[#222] text-[#FFD700] border-[#FFD700]/70 shadow-md'
                      : 'bg-[#0f0f0f] border-[#2c2c2c] text-gray-400 hover:bg-[#141414] hover:text-white'
                  }`}
                >
                  JURI {id}
                </button>
              ))}
            </div>
          </div>

          {/* Select Discipline */}
          <div className="space-y-2">
            <label className="block text-gray-400 font-bold text-[10px] tracking-wider uppercase">DISIPLIN PERTANDINGAN</label>
            <div className="grid grid-cols-2 p-1 bg-[#0f0f0f] rounded border border-[#2c2c2c] text-xs">
              <button
                type="button"
                onClick={() => setSelectedIsSeni(false)}
                className={`text-center py-2 rounded transition-all cursor-pointer font-bold ${
                  !selectedIsSeni ? 'bg-[#222] text-red-400 border border-red-900/30' : 'text-gray-500 hover:text-white'
                }`}
              >
                FIGHTER
              </button>
              <button
                type="button"
                onClick={() => setSelectedIsSeni(true)}
                className={`text-center py-2 rounded transition-all cursor-pointer font-bold ${
                  selectedIsSeni ? 'bg-[#222] text-yellow-400 border border-yellow-905/30' : 'text-gray-500 hover:text-white'
                }`}
              >
                SENI TGRS
              </button>
            </div>
          </div>

          {/* Kata Sandi Juri */}
          {selectedJuriId !== null && (
            <div className="space-y-1.5 animate-grow-in">
              <label className="block font-bold text-[10px] tracking-wider uppercase font-mono text-[#FFD700]">
                PIN / SANDI WASIT JURI {selectedJuriId}
              </label>
              <div className="relative">
                <input
                  type={showJuriPassword ? 'text' : 'password'}
                  id="juri-password-input"
                  value={juriPassword}
                  onChange={(e) => {
                    setJuriPassword(e.target.value);
                    if (juriError) setJuriError('');
                  }}
                  placeholder={`Masukkan sandi Juri ${selectedJuriId}`}
                  className="w-full bg-[#0f0f0f] border border-[#2c2c2c] text-gray-100 rounded-lg px-3.5 py-3 pr-10 focus:ring-1 focus:ring-yellow-500 focus:outline-[#FFD700] font-sans text-xs text-center"
                />
                <button
                  type="button"
                  onClick={() => setShowJuriPassword(!showJuriPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[9px] text-gray-500 font-sans text-center">
                Sandi bawaan: <code className="text-yellow-500 font-mono font-bold">juri{selectedJuriId}</code> atau <code className="text-yellow-500 font-mono font-bold">juri123</code>
              </p>
            </div>
          )}

          {juriError && (
            <div className="bg-red-950/40 border border-red-900/60 p-2.5 rounded-lg text-red-500 text-xs text-center font-mono">
              ⚠️ {juriError}
            </div>
          )}

          <button
            type="submit"
            disabled={selectedJuriId === null || !juriPassword}
            className="w-full py-3 bg-[#8B0000] text-white uppercase font-black text-xs tracking-wider rounded border border-red-700 hover:bg-red-800 disabled:opacity-30 cursor-pointer block text-center"
          >
            Mulai Penilaian →
          </button>
        </form>
      </div>
    </div>
  );
};
