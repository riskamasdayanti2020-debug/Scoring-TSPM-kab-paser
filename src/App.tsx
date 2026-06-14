import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import logoTspm from './logo_tspm.svg';
import { Beranda } from './components/Beranda';
import { Pendaftaran } from './components/Pendaftaran';
import { Admin } from './components/Admin';
import { Operator } from './components/Operator';
import { JuriLogin } from './components/JuriLogin';
import { Dewan } from './components/Dewan';
import { DisplayMonitor } from './components/DisplayMonitor';
import { Bracket } from './components/Bracket';
import { Shield, BookOpen, Users, Settings2, Laptop, UserCheck, Tv, Trophy } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'beranda' | 'pendaftaran' | 'admin' | 'operator' | 'dewan' | 'display' | 'juri' | 'bagan'>('beranda');

  const renderActiveView = () => {
    switch (currentView) {
      case 'beranda':
        return <Beranda onNavigate={setCurrentView} />;
      case 'pendaftaran':
        return <Pendaftaran />;
      case 'bagan':
        return <Bracket />;
      case 'admin':
        return <Admin />;
      case 'operator':
        return <Operator />;
      case 'juri':
        return <JuriLogin />;
      case 'dewan':
        return <Dewan />;
      case 'display':
        return <DisplayMonitor />;
      default:
        return <Beranda onNavigate={setCurrentView} />;
    }
  };

  const navItems = [
    { id: 'beranda', label: 'Beranda', icon: BookOpen },
    { id: 'bagan', label: 'Bagan Turnamen', icon: Trophy },
    { id: 'pendaftaran', label: 'Pendaftaran', icon: Users },
    { id: 'admin', label: 'Admin', icon: Settings2 },
    { id: 'operator', label: 'Operator', icon: Laptop },
    { id: 'juri', label: 'Sistem Juri', icon: UserCheck },
    { id: 'dewan', label: 'Dewan', icon: Shield },
    { id: 'display', label: 'Display TV', icon: Tv },
  ];

  return (
    <AppProvider>
      <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex flex-col justify-between selection:bg-red-900/50">
        
        {/* Navigation Bar Header */}
        <header className="sticky top-0 z-40 bg-[#8B0000] border-b border-[#ffd70044] shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Logo Brand */}
            <div
              onClick={() => setCurrentView('beranda')}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <div className="relative w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-[#FFD700] overflow-hidden select-none">
                <img 
                  src={logoTspm} 
                  alt="Tapak Suci Logo" 
                  className="w-full h-full p-0.5 object-contain transition-transform duration-300 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-0.5">
                <span className="font-sans font-black tracking-tight text-white text-sm block md:text-base group-hover:text-amber-200 transition-colors">
                  TAPAK SUCI SCORING SYSTEM
                </span>
                <span className="text-[10px] text-[#FFD700] font-mono tracking-widest block font-bold uppercase">
                  PUTERA MUHAMMADIYAH
                </span>
              </div>
            </div>

            {/* Navigation Tabs bar */}
            <nav className="flex flex-wrap items-center justify-center p-1 bg-[#5a0000]/60 border border-red-900/40 rounded-xl max-w-lg md:max-w-max">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isSelected = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-btn-${item.id}`}
                    onClick={() => setCurrentView(item.id as any)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFD700] text-[#8B0000] shadow-md border border-[#FFD700]'
                        : 'text-red-100 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

          </div>
        </header>

        {/* Content canvas field */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 md:py-8">
          <div className="animate-fade-in-up">
            {renderActiveView()}
          </div>
        </main>

        {/* Cohesive Footer */}
        <footer className="bg-[#161616] text-white mt-12 border-t-2 border-[#ffd70066]">
          <div className="max-w-6xl mx-auto px-4 py-8 space-y-4 text-center text-xs">
            <span className="text-[10px] font-mono tracking-widest font-bold text-[#FFD700] block uppercase">
              SEMB BOYANGAN TAPAK SUCI
            </span>
            <p className="max-w-md mx-auto italic text-gray-400 font-sans tracking-tight leading-relaxed">
              "Dengan Iman dan Akhlak saya menjadi kuat, tanpa Iman dan Akhlak saya menjadi lemah."
            </p>
            <div className="border-t border-[#333] pt-4 flex flex-col md:flex-row items-center justify-between text-gray-500 font-mono text-[10px]">
              <span>© {new Date().getFullYear()} Yayasan Pencak Silat Tapak Suci • Scoring Engine v1.0</span>
              <span className="mt-1 md:mt-0">Cabang Khusus Putera Muhammadiyah</span>
            </div>
          </div>
        </footer>

      </div>
    </AppProvider>
  );
}
