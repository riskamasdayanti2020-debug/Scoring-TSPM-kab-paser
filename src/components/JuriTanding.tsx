import React, { useState, useEffect } from 'react';
import { useAppState } from '../context/AppContext';
import { Undo2, Award, Shield, Maximize2, Minimize2 } from 'lucide-react';
import { MatchTandingState } from '../types';
import { motion } from 'motion/react';

interface JuriTandingProps {
  activeMatch: MatchTandingState;
  juriId: number;
  onLogout: () => void;
}

export const JuriTanding: React.FC<JuriTandingProps> = ({ activeMatch, juriId, onLogout }) => {
  const { addTandingPoint, undoTandingPoint, addDewanPenalti, undoDewanPenalti } = useAppState();

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

  const juriScores = activeMatch.skorJuri[juriId] || { juriId, poinMerah: [], poinKuning: [] };

  const handleAddPoint = (sudut: 'Merah' | 'Kuning', tipe: 'Katak' | 'Ikan Terbang' | 'Terkaman') => {
    addTandingPoint(activeMatch.id, juriId, sudut, tipe);
  };

  const handleUndo = (sudut: 'Merah' | 'Kuning') => {
    undoTandingPoint(activeMatch.id, juriId, sudut);
  };

  // Get total points registered by THIS judge for Merah & Kuning
  const calculateTotalMerah = () => {
    return juriScores.poinMerah.reduce((sum, pt) => sum + pt.poin, 0);
  };

  const calculateTotalKuning = () => {
    return juriScores.poinKuning.reduce((sum, pt) => sum + pt.poin, 0);
  };

  const juriBtnMerahClass = `w-full text-left transition-all flex justify-between items-center group cursor-pointer active:scale-98 border ${
    isCustomFullscreen 
      ? 'p-6 rounded-2xl bg-[#230f0f] border-red-900 shadow-xl' 
      : 'p-4 rounded-xl bg-[#1e1111] border-red-950/40 hover:border-red-500/55'
  }`;

  const juriBtnKuningClass = `w-full text-left transition-all flex justify-between items-center group cursor-pointer active:scale-98 border ${
    isCustomFullscreen 
      ? 'p-6 rounded-2xl bg-[#241d0e] border-yellow-905/30 shadow-xl' 
      : 'p-4 rounded-xl bg-[#211d13] border-yellow-905/20 hover:border-yellow-500/55'
  }`;

  return (
    <div className={`space-y-6 font-mono text-gray-105 transition-all duration-350 ${
      isCustomFullscreen ? 'fixed inset-0 z-50 bg-[#070707] p-8 md:p-12 overflow-y-auto flex flex-col justify-start' : ''
    }`}>
      {/* Judge Header */}
      <div className="flex items-center justify-between bg-[#161616] border border-[#333] p-4 rounded-xl shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#222] border border-[#444] rounded-lg flex items-center justify-center font-mono font-bold text-lg text-red-500">
            J{juriId}
          </div>
          <div>
            <h2 className="text-sm font-mono uppercase font-black text-white">WASIT JURI {juriId} • TANDING</h2>
            <p className="text-[10px] text-gray-400 font-sans mt-0.5">Partai: t{activeMatch.id} | {activeMatch.kelas} ({activeMatch.kategoriUsia})</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCustomFullscreen(!isCustomFullscreen)}
            className="text-[10px] bg-[#222] hover:bg-[#333] text-yellow-500 font-bold px-3 py-1.5 rounded border border-yellow-905/30 cursor-pointer transition-all uppercase flex items-center space-x-1"
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
            onClick={onLogout}
            className="text-[10px] bg-[#222] hover:bg-[#333] text-red-400 font-bold px-3 py-1.5 rounded border border-red-900/30 cursor-pointer transition-all uppercase"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Duel Headline card */}
      <div className="bg-[#111] p-4 rounded-xl border border-[#262626] flex items-center justify-between text-xs font-semibold text-gray-400 font-mono">
        <div className="w-5/12 text-center text-red-400 font-bold">
          🔴 MERAH: {activeMatch.pesilatMerah.nama}
        </div>
        <div className="w-2/12 text-center text-yellow-500 font-black uppercase text-[10px] tracking-widest">
          RONDE {activeMatch.rondeAktif}
        </div>
        <div className="w-5/12 text-center text-yellow-400 font-bold">
          🟡 KUNING: {activeMatch.pesilatKuning.nama}
        </div>
      </div>

      {/* Combined Panels for MERAH and KUNING inside a parallel grid */}
      <div className="grid grid-cols-2 gap-4 lg:gap-6">
        
        {/* SUDUT MERAH COMBINED BOX */}
        <div id="juri-merah-combined-box" className="bg-[#181111] border border-red-900/40 p-5 rounded-xl shadow-xl flex flex-col justify-between space-y-4">
          <div>
            {/* Header / Actions bar */}
            <div className="flex justify-between items-center border-b border-red-950/40 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 bg-red-600 rounded-full animate-pulse"></span>
                <span className="text-[12px] uppercase font-bold tracking-wider text-red-400">🔴 MERAH</span>
              </div>
              <div className="flex space-x-2">
                <button
                  id="undo-merah-btn"
                  onClick={() => handleUndo('Merah')}
                  disabled={juriScores.poinMerah.length === 0}
                  className="px-2 py-1 text-[8px] font-mono font-black bg-[#2d1212] hover:bg-red-950 text-red-350 border border-red-900/30 rounded disabled:opacity-20 cursor-pointer transition-all uppercase"
                >
                  BATAL JURUS
                </button>
                <button
                  id="juri-undo-sanksi-merah"
                  onClick={() => undoDewanPenalti(activeMatch.id, 'Merah')}
                  disabled={activeMatch.penaltiMerah.length === 0}
                  className="px-2 py-1 text-[8px] font-mono font-black bg-[#2d1212] hover:bg-red-950 text-red-350 border border-red-900/30 rounded disabled:opacity-20 cursor-pointer transition-all uppercase"
                >
                  BATAL SANKSI
                </button>
              </div>
            </div>

            {/* Athlete Profile & Score Display */}
            <div className="mt-2 mb-3 flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-red-950/20 relative overflow-hidden">
              <motion.div
                key={`bg-score-flash-red-${calculateTotalMerah()}`}
                initial={{ opacity: 0.3, scale: 0.8 }}
                animate={{ opacity: 0, scale: 1.4 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-red-600/20 pointer-events-none"
              />
              <div>
                <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold">PESILAT</span>
                <div className="text-xs font-black text-white font-mono truncate max-w-[110px] sm:max-w-none">{activeMatch.pesilatMerah.nama}</div>
              </div>
              <div className="text-right border-l border-red-950/30 pl-3">
                <span className="text-[8px] text-red-400 uppercase tracking-widest block font-bold">SKOR JURI</span>
                <motion.div
                  key={calculateTotalMerah()}
                  initial={{ scale: 0.7, opacity: 0.5 }}
                  animate={{ scale: [1.35, 1], opacity: 1 }}
                  transition={{ type: "spring", stiffness: 450, damping: 11 }}
                  className="text-lg font-black text-red-500 font-mono drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                >
                  {calculateTotalMerah()}
                </motion.div>
              </div>
            </div>

            {/* Action Grid (6 Buttons) */}
            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Column 1: Jurus */}
              <motion.button
                id="merah-katak-btn"
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => handleAddPoint('Merah', 'Katak')}
                className="p-3 bg-[#221010] hover:bg-red-900/30 border border-red-900/25 rounded-lg flex flex-col items-center justify-center space-y-1.5 cursor-pointer active:scale-95 transition-all h-20 text-center"
              >
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">JURUS KATAK</span>
                <span className="text-[10px] text-gray-200 block leading-tight font-sans">Pukulan</span>
                <span className="text-xs font-black text-red-400 font-mono">+10</span>
              </motion.button>

              {/* Column 2: Teguran Sanksi */}
              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => addDewanPenalti(activeMatch.id, 'Merah', 'Teguran')}
                className="p-3 bg-[#1e1414] hover:bg-red-950/40 border border-red-950/25 rounded-lg flex flex-col items-center justify-center space-y-1.5 cursor-pointer active:scale-95 transition-all h-20 text-center"
              >
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">TEGURAN</span>
                <span className="text-[10px] text-gray-400 block leading-tight font-sans">Binaan / Tindakan</span>
                <span className="text-xs font-black text-red-400 font-mono">-1 / -2</span>
              </motion.button>

              <motion.button
                id="merah-ikan-btn"
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => handleAddPoint('Merah', 'Ikan Terbang')}
                className="p-3 bg-[#221010] hover:bg-red-900/30 border border-red-900/25 rounded-lg flex flex-col items-center justify-center space-y-1.5 cursor-pointer active:scale-95 transition-all h-20 text-center"
              >
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">JURUS IKAN TERBANG</span>
                <span className="text-[10px] text-gray-200 block leading-tight font-sans">Tendangan</span>
                <span className="text-xs font-black text-red-400 font-mono">+20</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => addDewanPenalti(activeMatch.id, 'Merah', 'Peringatan')}
                className="p-3 bg-[#1e1414] hover:bg-red-950/40 border border-red-950/25 rounded-lg flex flex-col items-center justify-center space-y-1.5 cursor-pointer active:scale-95 transition-all h-20 text-center"
              >
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">PERINGATAN</span>
                <span className="text-[10px] text-gray-400 block leading-tight font-sans">Hukuman Berat</span>
                <span className="text-xs font-black text-red-400 font-mono">-5 / -10</span>
              </motion.button>

              <motion.button
                id="merah-terkaman-btn"
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => handleAddPoint('Merah', 'Terkaman')}
                className="p-3 bg-[#221010] hover:bg-red-900/30 border border-red-900/25 rounded-lg flex flex-col items-center justify-center space-y-1.5 cursor-pointer active:scale-95 transition-all h-20 text-center"
              >
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">JURUS TERKAMAN</span>
                <span className="text-[10px] text-gray-200 block leading-tight font-sans">Jatuhan</span>
                <span className="text-xs font-black text-red-400 font-mono">+30</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => addDewanPenalti(activeMatch.id, 'Merah', 'Pelanggaran')}
                className="p-3 bg-[#1e1414] hover:bg-red-950/40 border border-red-950/25 rounded-lg flex flex-col items-center justify-center space-y-1.5 cursor-pointer active:scale-95 transition-all h-20 text-center"
              >
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">PELANGGARAN</span>
                <span className="text-[10px] text-gray-400 block leading-tight font-sans">Fatality / Kerugian</span>
                <span className="text-xs font-black text-red-400 font-mono">-10 / -20</span>
              </motion.button>

            </div>
          </div>

          {/* Activity / Registered Lists */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-red-950/40 mt-3 text-[9px] font-mono">
            {/* Registered Jurus History list */}
            <div>
              <span className="uppercase tracking-wider font-bold text-gray-500 block mb-1">Jurus Terdaftar</span>
              {juriScores.poinMerah.length === 0 ? (
                <span className="text-gray-605 block italic">Belum ada</span>
              ) : (
                <div className="max-h-[80px] overflow-y-auto space-y-1 font-bold">
                  {juriScores.poinMerah.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ scale: 0.8, x: -10, opacity: 0 }}
                      animate={{ scale: 1, x: 0, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="flex justify-between items-center bg-black/40 p-1.5 rounded border border-red-950/20 w-full"
                    >
                      <span className="text-gray-400 font-sans font-normal truncate max-w-[80px]">{p.tipe} (Rd {p.ronde})</span>
                      <span className="text-red-400 font-black font-mono">+{p.poin}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Registered Dewan Sanctions list */}
            <div>
              <span className="uppercase tracking-wider font-bold text-red-400 block mb-1">Sanksi Terdaftar</span>
              {activeMatch.penaltiMerah.length === 0 ? (
                <span className="text-gray-650 block italic">Nihil</span>
              ) : (
                <div className="max-h-[80px] overflow-y-auto space-y-1 font-bold">
                  {activeMatch.penaltiMerah.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="flex justify-between items-center bg-black/40 p-1.5 rounded border border-red-950/20 w-full"
                    >
                      <span className="text-gray-400 font-sans font-normal truncate max-w-[85px]">{p.jenis} (Rd {p.ronde})</span>
                      <span className="text-red-400 font-black font-mono">-{Math.abs(p.poin)}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* SUDUT KUNING COMBINED BOX */}
        <div id="juri-kuning-combined-box" className="bg-[#181611] border border-yellow-905/20 p-5 rounded-xl shadow-xl flex flex-col justify-between space-y-4">
          <div>
            {/* Header / Actions bar */}
            <div className="flex justify-between items-center border-b border-yellow-950/40 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 bg-yellow-500 rounded-full animate-pulse"></span>
                <span className="text-[12px] uppercase font-bold tracking-wider text-yellow-500">🟡 KUNING</span>
              </div>
              <div className="flex space-x-2">
                <button
                  id="undo-kuning-btn"
                  onClick={() => handleUndo('Kuning')}
                  disabled={juriScores.poinKuning.length === 0}
                  className="px-2 py-1 text-[8px] font-mono font-black bg-[#2d2512] hover:bg-yellow-950 text-yellow-350 border border-yellow-905/20 rounded disabled:opacity-20 cursor-pointer transition-all uppercase"
                >
                  BATAL JURUS
                </button>
                <button
                  id="juri-undo-sanksi-kuning"
                  onClick={() => undoDewanPenalti(activeMatch.id, 'Kuning')}
                  disabled={activeMatch.penaltiKuning.length === 0}
                  className="px-2 py-1 text-[8px] font-mono font-black bg-[#2d2512] hover:bg-yellow-950 text-yellow-350 border border-yellow-905/20 rounded disabled:opacity-20 cursor-pointer transition-all uppercase"
                >
                  BATAL SANKSI
                </button>
              </div>
            </div>

            {/* Athlete Profile & Score Display */}
            <div className="mt-2 mb-3 flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-yellow-950/20 relative overflow-hidden">
              <motion.div
                key={`bg-score-flash-yellow-${calculateTotalKuning()}`}
                initial={{ opacity: 0.3, scale: 0.8 }}
                animate={{ opacity: 0, scale: 1.4 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-yellow-500/20 pointer-events-none"
              />
              <div>
                <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold">PESILAT</span>
                <div className="text-xs font-black text-white font-mono truncate max-w-[110px] sm:max-w-none">{activeMatch.pesilatKuning.nama}</div>
              </div>
              <div className="text-right border-l border-yellow-950/30 pl-3">
                <span className="text-[8px] text-yellow-550 uppercase tracking-widest block font-bold">SKOR JURI</span>
                <motion.div
                  key={calculateTotalKuning()}
                  initial={{ scale: 0.7, opacity: 0.5 }}
                  animate={{ scale: [1.35, 1], opacity: 1 }}
                  transition={{ type: "spring", stiffness: 450, damping: 11 }}
                  className="text-lg font-black text-yellow-500 font-mono drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]"
                >
                  {calculateTotalKuning()}
                </motion.div>
              </div>
            </div>

            {/* Action Grid (6 Buttons) */}
            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Column 1: Jurus */}
              <motion.button
                id="kuning-katak-btn"
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => handleAddPoint('Kuning', 'Katak')}
                className="p-3 bg-[#241f12] hover:bg-yellow-900/20 border border-yellow-905/15 rounded-lg flex flex-col items-center justify-center space-y-1.5 cursor-pointer active:scale-95 transition-all h-20 text-center"
              >
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">JURUS KATAK</span>
                <span className="text-[10px] text-gray-200 block leading-tight font-sans">Pukulan</span>
                <span className="text-xs font-black text-yellow-500 font-mono">+10</span>
              </motion.button>

              {/* Column 2: Teguran Sanksi */}
              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => addDewanPenalti(activeMatch.id, 'Kuning', 'Teguran')}
                className="p-3 bg-[#1d1b15] hover:bg-yellow-950/30 border border-yellow-950/15 rounded-lg flex flex-col items-center justify-center space-y-1.5 cursor-pointer active:scale-95 transition-all h-20 text-center"
              >
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">TEGURAN</span>
                <span className="text-[10px] text-gray-400 block leading-tight font-sans">Binaan / Tindakan</span>
                <span className="text-xs font-black text-yellow-500 font-mono">-1 / -2</span>
              </motion.button>

              <motion.button
                id="kuning-ikan-btn"
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => handleAddPoint('Kuning', 'Ikan Terbang')}
                className="p-3 bg-[#241f12] hover:bg-yellow-900/20 border border-yellow-905/15 rounded-lg flex flex-col items-center justify-center space-y-1.5 cursor-pointer active:scale-95 transition-all h-20 text-center"
              >
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">JURUS IKAN TERBANG</span>
                <span className="text-[10px] text-gray-200 block leading-tight font-sans">Tendangan</span>
                <span className="text-xs font-black text-yellow-500 font-mono">+20</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => addDewanPenalti(activeMatch.id, 'Kuning', 'Peringatan')}
                className="p-3 bg-[#1d1b15] hover:bg-yellow-950/30 border border-yellow-950/15 rounded-lg flex flex-col items-center justify-center space-y-1.5 cursor-pointer active:scale-95 transition-all h-20 text-center"
              >
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">PERINGATAN</span>
                <span className="text-[10px] text-gray-400 block leading-tight font-sans">Hukuman Berat</span>
                <span className="text-xs font-black text-yellow-500 font-mono">-5 / -10</span>
              </motion.button>

              <motion.button
                id="kuning-terkaman-btn"
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => handleAddPoint('Kuning', 'Terkaman')}
                className="p-3 bg-[#241f12] hover:bg-yellow-900/20 border border-yellow-905/15 rounded-lg flex flex-col items-center justify-center space-y-1.5 cursor-pointer active:scale-95 transition-all h-20 text-center"
              >
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">JURUS TERKAMAN</span>
                <span className="text-[10px] text-gray-200 block leading-tight font-sans">Jatuhan</span>
                <span className="text-xs font-black text-yellow-500 font-mono">+30</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => addDewanPenalti(activeMatch.id, 'Kuning', 'Pelanggaran')}
                className="p-3 bg-[#1d1b15] hover:bg-yellow-950/30 border border-yellow-950/15 rounded-lg flex flex-col items-center justify-center space-y-1.5 cursor-pointer active:scale-95 transition-all h-20 text-center"
              >
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">PELANGGARAN</span>
                <span className="text-[10px] text-gray-400 block leading-tight font-sans">Fatality / Kerugian</span>
                <span className="text-xs font-black text-yellow-500 font-mono">-10 / -20</span>
              </motion.button>

            </div>
          </div>

          {/* Activity / Registered Lists */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-yellow-950/40 mt-3 text-[9px] font-mono">
            {/* Registered Jurus History list */}
            <div>
              <span className="uppercase tracking-wider font-bold text-gray-500 block mb-1">Jurus Terdaftar</span>
              {juriScores.poinKuning.length === 0 ? (
                <span className="text-gray-655 block italic">Belum ada</span>
              ) : (
                <div className="max-h-[80px] overflow-y-auto space-y-1 font-bold">
                  {juriScores.poinKuning.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ scale: 0.8, x: 10, opacity: 0 }}
                      animate={{ scale: 1, x: 0, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="flex justify-between items-center bg-black/40 p-1.5 rounded border border-yellow-950/20 w-full"
                    >
                      <span className="text-gray-400 font-sans font-normal truncate max-w-[80px]">{p.tipe} (Rd {p.ronde})</span>
                      <span className="text-yellow-500 font-black font-mono">+{p.poin}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Registered Dewan Sanctions list */}
            <div>
              <span className="uppercase tracking-wider font-bold text-yellow-500 block mb-1">Sanksi Terdaftar</span>
              {activeMatch.penaltiKuning.length === 0 ? (
                <span className="text-gray-650 block italic">Nihil</span>
              ) : (
                <div className="max-h-[80px] overflow-y-auto space-y-1 font-bold">
                  {activeMatch.penaltiKuning.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="flex justify-between items-center bg-black/40 p-1.5 rounded border border-yellow-950/20 w-full"
                    >
                      <span className="text-gray-400 font-sans font-normal truncate max-w-[85px]">{p.jenis} (Rd {p.ronde})</span>
                      <span className="text-yellow-500 font-black font-mono">-{Math.abs(p.poin)}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
