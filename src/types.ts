export type KategoriUsia = 'Usia Dini' | 'Pra Remaja' | 'Remaja' | 'Dewasa';
export type TipePertandingan = 'Tanding' | 'Seni';

export interface Pesilat {
  id: string;
  nama: string;
  kontingen: string;
  kategoriUsia: KategoriUsia;
  tipe: TipePertandingan;
  berat?: string; // Untuk Tanding
  kelasTanding?: string; // Misal Kelas A, B, dll
  kategoriSeni?: 'Tunggal' | 'Ganda' | 'Regu' | 'Solo Kreatif'; // Untuk Seni
}

export type Ronde = '1' | '2' | 'Tambahan';

export interface JurusTandingPoint {
  id: string;
  timestamp: string; // ISO string
  ronde: Ronde;
  tipe: 'Katak' | 'Ikan Terbang' | 'Terkaman' | 'Mawar Lepas Terkaman';
  poin: number;
  juriId: number; // 1, 2, atau 3
  nilaiX?: number; // Tambahan untuk Mawar Lepas Terkaman
}

export interface JuriTandingScore {
  juriId: number;
  poinMerah: JurusTandingPoint[];
  poinKuning: JurusTandingPoint[];
}

export interface DewanPenalti {
  id: string;
  timestamp: string;
  ronde: Ronde;
  jenis: 'Teguran' | 'Peringatan' | 'Pelanggaran' | 'Jatuhan' | 'Mawar Lepas Terkaman';
  tingkat?: number; // Teguran 1, Peringatan 1, dll
  poin: number; // Negatif untuk hukuman, positif untuk jatuhan
}

export interface MatchTandingState {
  id: string;
  pesilatMerah: Pesilat;
  pesilatKuning: Pesilat;
  kelas: string;
  kategoriUsia: KategoriUsia;
  status: 'Belum Dimulai' | 'Sedang Tanding' | 'Selesai';
  rondeAktif: Ronde;
  waktuSisa: number; // dalam detik
  timerBerjalan: boolean;
  skorJuri: { [juriId: number]: JuriTandingScore };
  penaltiMerah: DewanPenalti[];
  penaltiKuning: DewanPenalti[];
  pemenang?: 'Merah' | 'Kuning';
  alasanPemenang?: string;
  catatan?: string;
  babak?: 'Penyisihan' | 'Semi Final' | 'Final';
  scheduledDate?: string; // Format: YYYY-MM-DD
  scheduledTime?: string; // Format: HH:MM
}

export interface JuriSeniScore {
  juriId: number;
  skorJurus: number; // Nilai kebenaran jurus (skor dasar 100 - pengurangan kesalahan) or Nilai A
  jumlahKesalahan: number; // Jumlah kesalahan gerak/urutan
  skorKemantapan: number; // Nilai kemantapan / Nilai B / Ketegasan
  penguranganHukuman: number; // Pengurangan hukuman khusus (pakaian, senjata jatuh, keluar batas dll)
  totalSkor: number; // (skorJurus + skorKemantapan) - penguranganHukuman
  catatan?: string;
  // New TGRS IPSI standard properties matching the document sheets
  nilaiA?: number; // Tunggal/Regu: Kebenaran (9.90 - kesalahan * 0.01)
  nilaiB?: number; // Tunggal/Regu: Kemantapan (0.01 - 0.10)
  nilaiTeknik?: number; // Ganda/Solo Kreatif: Teknik Serangan Pertahanan (0.01 - 0.30)
  nilaiKetegasan?: number; // Ganda/Solo Kreatif: Ketegasan (0.01 - 0.30)
  nilaiPenjiwaan?: number; // Ganda/Solo Kreatif: Penjiwaan (0.01 - 0.30)
}

export interface MatchSeniState {
  id: string;
  pesilat: Pesilat;
  kategoriSeni: 'Tunggal' | 'Ganda' | 'Regu' | 'Solo Kreatif';
  status: 'Belum Dimulai' | 'Sedang Penilaian' | 'Selesai';
  timerBerjalan: boolean;
  waktuBerjalan: number; // dalam detik (menghitung ke atas / elapsed time)
  skorJuri: { [juriId: number]: JuriSeniScore };
  totalSkorAkhir: number; // rata-rata atau kombinasi skor juri setelah dikurangi penalti
  pemenangSeni?: boolean; // penanda di admin
  scheduledDate?: string; // Format: YYYY-MM-DD
  scheduledTime?: string; // Format: HH:MM
}

export interface AppState {
  pesilatList: Pesilat[];
  matchesTanding: MatchTandingState[];
  matchesSeni: MatchSeniState[];
  activeTandingId: string | null;
  activeSeniId: string | null;
  juriLogin: {
    juriId: number | null;
    tipeSeni: boolean; // true if judging seni, false if tanding
  };
}
