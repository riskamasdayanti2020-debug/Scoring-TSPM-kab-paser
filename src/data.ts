import { Pesilat, MatchTandingState, MatchSeniState, KategoriUsia } from './types';

// Durasi ronde berdasarkan kategori usia dalam detik
export const DURASI_RONDE: Record<KategoriUsia, number> = {
  'Usia Dini': 90,    // 1.5 menit (90 detik)
  'Pra Remaja': 90,   // 1.5 menit (90 detik)
  'Remaja': 120,      // 2 menit (120 detik)
  'Dewasa': 120,      // 2 menit (120 detik)
};

export const INITIAL_PESILAT: Pesilat[] = [
  // Fighter / Tanding
  {
    id: 'p1',
    nama: 'Ahmad Fathoni',
    kontingen: 'Pimda 02 Bantul',
    kategoriUsia: 'Remaja',
    tipe: 'Tanding',
    berat: '52 Kg',
    kelasTanding: 'Kelas C',
  },
  {
    id: 'p2',
    nama: 'Bagus Priyambodo',
    kontingen: 'Pimda 01 Yogyakarta',
    kategoriUsia: 'Remaja',
    tipe: 'Tanding',
    berat: '54 Kg',
    kelasTanding: 'Kelas C',
  },
  {
    id: 'p3',
    nama: 'Zulham Mubarak',
    kontingen: 'Pimda 04 Sleman',
    kategoriUsia: 'Dewasa',
    tipe: 'Tanding',
    berat: '67 Kg',
    kelasTanding: 'Kelas E',
  },
  {
    id: 'p4',
    nama: 'Khairul Anwar',
    kontingen: 'Pimda 12 Surabaya',
    kategoriUsia: 'Dewasa',
    tipe: 'Tanding',
    berat: '68 Kg',
    kelasTanding: 'Kelas E',
  },
  {
    id: 'p5',
    nama: 'Rizki Adi',
    kontingen: 'Pimda 03 Kulon Progo',
    kategoriUsia: 'Usia Dini',
    tipe: 'Tanding',
    berat: '28 Kg',
    kelasTanding: 'Kelas A',
  },
  {
    id: 'p6',
    nama: 'Dafa Ramadan',
    kontingen: 'Pimda 05 Gunungkidul',
    kategoriUsia: 'Usia Dini',
    tipe: 'Tanding',
    berat: '29 Kg',
    kelasTanding: 'Kelas A',
  },
  {
    id: 'p7',
    nama: 'Aisyah Humairah',
    kontingen: 'Pimda 02 Bantul',
    kategoriUsia: 'Pra Remaja',
    tipe: 'Tanding',
    berat: '39 Kg',
    kelasTanding: 'Kelas B',
  },
  {
    id: 'p8',
    nama: 'Fatma Wardhani',
    kontingen: 'Pimda 01 Yogyakarta',
    kategoriUsia: 'Pra Remaja',
    tipe: 'Tanding',
    berat: '41 Kg',
    kelasTanding: 'Kelas B',
  },
  {
    id: 'p9',
    nama: 'Zacky Al-Fatih',
    kontingen: 'Pimda 04 Sleman',
    kategoriUsia: 'Remaja',
    tipe: 'Tanding',
    berat: '53 Kg',
    kelasTanding: 'Kelas C',
  },
  {
    id: 'p10',
    nama: 'Hanif Wijaya',
    kontingen: 'Pimda 12 Surabaya',
    kategoriUsia: 'Remaja',
    tipe: 'Tanding',
    berat: '51 Kg',
    kelasTanding: 'Kelas C',
  },

  // Tunggal, Ganda, Regu, Solo Kreatif (Seni TGRS)
  {
    id: 's1',
    nama: 'Hadi Wijaya',
    kontingen: 'Pimda 01 Yogyakarta',
    kategoriUsia: 'Dewasa',
    tipe: 'Seni',
    kategoriSeni: 'Tunggal',
  },
  {
    id: 's2',
    nama: 'Syuhada & Rahman',
    kontingen: 'Pimda 02 Bantul',
    kategoriUsia: 'Dewasa',
    tipe: 'Seni',
    kategoriSeni: 'Ganda',
  },
  {
    id: 's3',
    nama: 'Regu Pimda Sleman',
    kontingen: 'Pimda 04 Sleman',
    kategoriUsia: 'Remaja',
    tipe: 'Seni',
    kategoriSeni: 'Regu',
  },
  {
    id: 's4',
    nama: 'Aris Setiawan',
    kontingen: 'Pimda 08 Surakarta',
    kategoriUsia: 'Remaja',
    tipe: 'Seni',
    kategoriSeni: 'Solo Kreatif',
  }
];

export const INITIAL_MATCHES_TANDING: MatchTandingState[] = [
  {
    id: 'mt1',
    pesilatMerah: INITIAL_PESILAT[0], // Ahmad Fathoni (Bantul)
    pesilatKuning: INITIAL_PESILAT[1], // Bagus Priyambodo (YK)
    kelas: 'Kelas C',
    kategoriUsia: 'Remaja',
    status: 'Belum Dimulai',
    rondeAktif: '1',
    waktuSisa: DURASI_RONDE['Remaja'],
    timerBerjalan: false,
    skorJuri: {
      1: { juriId: 1, poinMerah: [], poinKuning: [] },
      2: { juriId: 2, poinMerah: [], poinKuning: [] },
      3: { juriId: 3, poinMerah: [], poinKuning: [] },
      4: { juriId: 4, poinMerah: [], poinKuning: [] },
    },
    penaltiMerah: [],
    penaltiKuning: [],
    babak: 'Semi Final',
    scheduledDate: '2026-06-12',
    scheduledTime: '09:00',
  },
  {
    id: 'mt4',
    pesilatMerah: INITIAL_PESILAT[8], // Zacky Al-Fatih
    pesilatKuning: INITIAL_PESILAT[9], // Hanif Wijaya
    kelas: 'Kelas C',
    kategoriUsia: 'Remaja',
    status: 'Belum Dimulai',
    rondeAktif: '1',
    waktuSisa: DURASI_RONDE['Remaja'],
    timerBerjalan: false,
    skorJuri: {
      1: { juriId: 1, poinMerah: [], poinKuning: [] },
      2: { juriId: 2, poinMerah: [], poinKuning: [] },
      3: { juriId: 3, poinMerah: [], poinKuning: [] },
      4: { juriId: 4, poinMerah: [], poinKuning: [] },
    },
    penaltiMerah: [],
    penaltiKuning: [],
    babak: 'Semi Final',
    scheduledDate: '2026-06-12',
    scheduledTime: '10:00',
  },
  {
    id: 'mt5',
    pesilatMerah: INITIAL_PESILAT[0], // Ahmad Fathoni
    pesilatKuning: INITIAL_PESILAT[8], // Zacky Al-Fatih
    kelas: 'Kelas C',
    kategoriUsia: 'Remaja',
    status: 'Belum Dimulai',
    rondeAktif: '1',
    waktuSisa: DURASI_RONDE['Remaja'],
    timerBerjalan: false,
    skorJuri: {
      1: { juriId: 1, poinMerah: [], poinKuning: [] },
      2: { juriId: 2, poinMerah: [], poinKuning: [] },
      3: { juriId: 3, poinMerah: [], poinKuning: [] },
      4: { juriId: 4, poinMerah: [], poinKuning: [] },
    },
    penaltiMerah: [],
    penaltiKuning: [],
    babak: 'Final',
    scheduledDate: '2026-06-13',
    scheduledTime: '14:00',
  },
  {
    id: 'mt2',
    pesilatMerah: INITIAL_PESILAT[2], // Zulham (Sleman)
    pesilatKuning: INITIAL_PESILAT[3], // Khairul (Sby)
    kelas: 'Kelas E',
    kategoriUsia: 'Dewasa',
    status: 'Belum Dimulai',
    rondeAktif: '1',
    waktuSisa: DURASI_RONDE['Dewasa'],
    timerBerjalan: false,
    skorJuri: {
      1: { juriId: 1, poinMerah: [], poinKuning: [] },
      2: { juriId: 2, poinMerah: [], poinKuning: [] },
      3: { juriId: 3, poinMerah: [], poinKuning: [] },
      4: { juriId: 4, poinMerah: [], poinKuning: [] },
    },
    penaltiMerah: [],
    penaltiKuning: [],
    babak: 'Final',
    scheduledDate: '2026-06-12',
    scheduledTime: '11:15',
  },
  {
    id: 'mt6',
    pesilatMerah: INITIAL_PESILAT[6], // Aisyah Humairah
    pesilatKuning: INITIAL_PESILAT[7], // Fatma Wardhani
    kelas: 'Kelas B',
    kategoriUsia: 'Pra Remaja',
    status: 'Belum Dimulai',
    rondeAktif: '1',
    waktuSisa: DURASI_RONDE['Pra Remaja'],
    timerBerjalan: false,
    skorJuri: {
      1: { juriId: 1, poinMerah: [], poinKuning: [] },
      2: { juriId: 2, poinMerah: [], poinKuning: [] },
      3: { juriId: 3, poinMerah: [], poinKuning: [] },
      4: { juriId: 4, poinMerah: [], poinKuning: [] },
    },
    penaltiMerah: [],
    penaltiKuning: [],
    babak: 'Final',
    scheduledDate: '2026-06-12',
    scheduledTime: '13:00',
  },
  {
    id: 'mt3',
    pesilatMerah: INITIAL_PESILAT[4], // Rizki Adi
    pesilatKuning: INITIAL_PESILAT[5], // Dafa Ramadan
    kelas: 'Kelas A',
    kategoriUsia: 'Usia Dini',
    status: 'Belum Dimulai',
    rondeAktif: '1',
    waktuSisa: DURASI_RONDE['Usia Dini'],
    timerBerjalan: false,
    skorJuri: {
      1: { juriId: 1, poinMerah: [], poinKuning: [] },
      2: { juriId: 2, poinMerah: [], poinKuning: [] },
      3: { juriId: 3, poinMerah: [], poinKuning: [] },
      4: { juriId: 4, poinMerah: [], poinKuning: [] },
    },
    penaltiMerah: [],
    penaltiKuning: [],
    babak: 'Final',
    scheduledDate: '2026-06-13',
    scheduledTime: '10:00',
  }
];

export const INITIAL_MATCHES_SENI: MatchSeniState[] = [
  {
    id: 'ms1',
    pesilat: INITIAL_PESILAT[10], // Hadi Wijaya (Tunggal) - shifted
    kategoriSeni: 'Tunggal',
    status: 'Belum Dimulai',
    timerBerjalan: false,
    waktuBerjalan: 0,
    skorJuri: {
      1: { juriId: 1, skorJurus: 9.89, jumlahKesalahan: 1, skorKemantapan: 0.08, penguranganHukuman: 0, totalSkor: 9.97, nilaiA: 9.89, nilaiB: 0.08 },
      2: { juriId: 2, skorJurus: 9.87, jumlahKesalahan: 3, skorKemantapan: 0.07, penguranganHukuman: 0, totalSkor: 9.94, nilaiA: 9.87, nilaiB: 0.07 },
      3: { juriId: 3, skorJurus: 9.90, jumlahKesalahan: 0, skorKemantapan: 0.09, penguranganHukuman: 0, totalSkor: 9.99, nilaiA: 9.90, nilaiB: 0.09 },
      4: { juriId: 4, skorJurus: 9.89, jumlahKesalahan: 1, skorKemantapan: 0.08, penguranganHukuman: 0, totalSkor: 9.97, nilaiA: 9.89, nilaiB: 0.08 },
    },
    totalSkorAkhir: 9.97,
    scheduledDate: '2026-06-12',
    scheduledTime: '14:30',
  },
  {
    id: 'ms2',
    pesilat: INITIAL_PESILAT[13], // Aris Setiawan (Solo Kreatif) - shifted
    kategoriSeni: 'Solo Kreatif',
    status: 'Belum Dimulai',
    timerBerjalan: false,
    waktuBerjalan: 0,
    skorJuri: {
      1: { juriId: 1, skorJurus: 0.28, jumlahKesalahan: 0, skorKemantapan: 0.27, penguranganHukuman: 0, totalSkor: 9.93, nilaiTeknik: 0.28, nilaiKetegasan: 0.27, nilaiPenjiwaan: 0.28 },
      2: { juriId: 2, skorJurus: 0.25, jumlahKesalahan: 0, skorKemantapan: 0.26, penguranganHukuman: 0, totalSkor: 9.87, nilaiTeknik: 0.25, nilaiKetegasan: 0.26, nilaiPenjiwaan: 0.26 },
      3: { juriId: 3, skorJurus: 0.29, jumlahKesalahan: 0, skorKemantapan: 0.28, penguranganHukuman: 0, totalSkor: 9.96, nilaiTeknik: 0.29, nilaiKetegasan: 0.28, nilaiPenjiwaan: 0.29 },
      4: { juriId: 4, skorJurus: 0.28, jumlahKesalahan: 0, skorKemantapan: 0.27, penguranganHukuman: 0, totalSkor: 9.93, nilaiTeknik: 0.28, nilaiKetegasan: 0.27, nilaiPenjiwaan: 0.28 },
    },
    totalSkorAkhir: 9.92,
    scheduledDate: '2026-06-13',
    scheduledTime: '15:20',
  }
];
