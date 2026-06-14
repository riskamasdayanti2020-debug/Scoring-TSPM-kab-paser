import { jsPDF } from 'jspdf';
import { MatchTandingState, MatchSeniState, Ronde } from '../types';

// ==========================================
// SCORING HELPERS (consistent with app logic)
// ==========================================

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

// ==========================================
// CORE DRAWING HELPERS FOR OFFICIAL STYLING
// ==========================================

const drawOfficialKop = (doc: jsPDF) => {
  // Top thick colored banner representing Tapak Suci putera Muhammadiyah (Merah & Kuning)
  doc.setFillColor(139, 0, 0); // Dark red #8B0000
  doc.rect(10, 10, 190, 24, 'F');
  
  // Yellow accent line underneath #FFD700
  doc.setFillColor(255, 215, 0);
  doc.rect(10, 34, 190, 1.5, 'F');

  // Badge outline on left
  doc.setFillColor(27, 77, 62); // Green #1b4d3e
  doc.rect(14, 12, 12, 20, 'F');
  doc.setDrawColor(255, 215, 0);
  doc.setLineWidth(0.5);
  doc.rect(14, 12, 12, 20, 'D');

  // Text inside green badge
  doc.setTextColor(255, 215, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TSPM', 20, 24, { align: 'center' });

  // Right Aligned Header Texts (Official Kop)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PIMPINAN DAERAH KABUPATEN YAYASAN PENCAK SILAT', 30, 17);
  doc.setFontSize(15);
  doc.text('TAPAK SUCI PUTERA MUHAMMADIYAH', 30, 24);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(230, 230, 230);
  doc.text('DEWAN REFEREE JURI & PANITIA PELAKSANA PERTANDINGAN RESMI', 30, 30);
};

const drawSignatures = (doc: jsPDF, y: number, roles: string[]) => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);

  const xCoords = [25, 105, 185];
  const colCount = roles.length;
  
  let startX = 15;
  const spacing = 180 / colCount;

  roles.forEach((role, i) => {
    const centerPos = startX + (spacing / 2) + (i * spacing);
    doc.text(role + ',', centerPos, y, { align: 'center' });
    doc.text('...................................................', centerPos, y + 20, { align: 'center' });
    doc.text('( Tanda Tangan & NBM )', centerPos, y + 24, { align: 'center' });
  });
};

const formatIndonesianDate = (dateStr: string = '2026-06-12') => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

// ==========================================
// EXPORT TANDING (COMBAT) PDF
// ==========================================

export const exportTandingPDF = (match: MatchTandingState) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // kop
  drawOfficialKop(doc);

  // Document title
  doc.setFillColor(245, 245, 245);
  doc.rect(10, 38, 190, 10, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(10, 38, 190, 10, 'D');

  doc.setTextColor(139, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('LEMBAR REKAP NILAI JURI & KONSENSUS RESMI PARTAI TANDING', 105, 44, { align: 'center' });

  // Metadata Grid
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const metaY = 54;
  doc.text(`ID Partai: ${match.id}`, 12, metaY);
  doc.text(`Kategori Usia: ${match.kategoriUsia}`, 12, metaY + 4);
  doc.text(`Kelas Tanding: ${match.kelas}`, 12, metaY + 8);
  doc.text(`Babak Penyisihan: ${match.babak || 'Penyisihan'}`, 12, metaY + 12);
  
  doc.text(`Tanggal: ${formatIndonesianDate(match.scheduledDate)}`, 110, metaY);
  doc.text(`Jam: ${match.scheduledTime || '10:00'}`, 110, metaY + 4);
  doc.text(`Status Laporan: ${match.status}`, 110, metaY + 8);
  doc.text(`Metode Scoring: TSPM Digital Scoring Standard`, 110, metaY + 12);

  // Horizontal separator
  doc.setDrawColor(200, 200, 200);
  doc.line(10, metaY + 16, 200, metaY + 16);

  // Competitor Cards
  const compY = metaY + 20;
  
  // Merah card
  doc.setFillColor(254, 242, 242);
  doc.rect(10, compY, 92, 28, 'F');
  doc.setDrawColor(239, 68, 68);
  doc.setLineWidth(0.5);
  doc.rect(10, compY, 92, 28, 'D');
  
  doc.setTextColor(185, 28, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PESILAT SUDUT MERAH', 14, compY + 5);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.text(match.pesilatMerah.nama, 14, compY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Kontingen: ${match.pesilatMerah.kontingen}`, 14, compY + 18);
  const penMerahText = match.penaltiMerah.length > 0 
    ? `Hukuman: ${match.penaltiMerah.map(p => `${p.jenis} (${p.poin})`).join(', ')}`
    : 'Hukuman: Nihil';
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(penMerahText, 14, compY + 24, { maxWidth: 84 });

  // Kuning card
  doc.setFillColor(255, 253, 240);
  doc.rect(108, compY, 92, 28, 'F');
  doc.setDrawColor(217, 119, 6);
  doc.rect(108, compY, 92, 28, 'D');

  doc.setTextColor(217, 119, 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PESILAT SUDUT KUNING', 112, compY + 5);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.text(match.pesilatKuning.nama, 112, compY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Kontingen: ${match.pesilatKuning.kontingen}`, 112, compY + 18);
  const penKuningText = match.penaltiKuning.length > 0 
    ? `Hukuman: ${match.penaltiKuning.map(p => `${p.jenis} (${p.poin})`).join(', ')}`
    : 'Hukuman: Nihil';
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(penKuningText, 112, compY + 24, { maxWidth: 84 });

  // Matrix Header Title
  const matrixY = compY + 34;
  doc.setTextColor(139, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DETIL SKORING MATRIKS REFEREE JURI SETIAP RONDE (CONFLICT MATRIX)', 12, matrixY);

  // Draw Scoring Matrix Table
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  const tableY = matrixY + 3;
  
  // Column Widths
  const colR = 25; // Ronde
  const colW = 16.5; // Width of J1, J2, J3, J4, Consensus (each corner has 5 columns)
  // Corner columns: J1, J2, J3, J4, Consensus
  const cRedStart = 10 + colR;
  const cKuningStart = cRedStart + (5 * colW);

  // Table Headers Row 1
  doc.setFillColor(240, 240, 240);
  doc.rect(10, tableY, colR, 12, 'F');
  doc.rect(10, tableY, colR, 12, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('BABAK / RONDE', 10 + (colR / 2), tableY + 7.5, { align: 'center' });

  // Sudut Merah Header Row 1
  doc.setFillColor(254, 226, 226);
  doc.rect(cRedStart, tableY, 5 * colW, 6, 'F');
  doc.rect(cRedStart, tableY, 5 * colW, 6, 'D');
  doc.setTextColor(153, 27, 27);
  doc.text('SUDUT MERAH', cRedStart + ((5 * colW) / 2), tableY + 4, { align: 'center' });

  // Sudut Kuning Header Row 1
  doc.setFillColor(254, 243, 199);
  doc.rect(cKuningStart, tableY, 5 * colW, 6, 'F');
  doc.rect(cKuningStart, tableY, 5 * colW, 6, 'D');
  doc.setTextColor(146, 64, 14);
  doc.text('SUDUT KUNING', cKuningStart + ((5 * colW) / 2), tableY + 4, { align: 'center' });

  // Table Headers Row 2
  const tableY2 = tableY + 6;
  doc.setFontSize(8);
  
  // Headers Merah Row 2
  for (let j = 1; j <= 4; j++) {
    const xPos = cRedStart + (j - 1) * colW;
    doc.setFillColor(254, 242, 242);
    doc.rect(xPos, tableY2, colW, 6, 'FD');
    doc.setTextColor(185, 28, 28);
    doc.text(`J ${j}`, xPos + (colW / 2), tableY2 + 4, { align: 'center' });
  }
  // Consensus Header Merah
  doc.setFillColor(252, 165, 165);
  doc.rect(cRedStart + 4 * colW, tableY2, colW, 6, 'FD');
  doc.setTextColor(127, 29, 29);
  doc.text('Rata', cRedStart + 4 * colW + (colW / 2), tableY2 + 4, { align: 'center' });

  // Headers Kuning Row 2
  for (let j = 1; j <= 4; j++) {
    const xPos = cKuningStart + (j - 1) * colW;
    doc.setFillColor(255, 253, 240);
    doc.rect(xPos, tableY2, colW, 6, 'FD');
    doc.setTextColor(217, 119, 6);
    doc.text(`J ${j}`, xPos + (colW / 2), tableY2 + 4, { align: 'center' });
  }
  // Consensus Header Kuning
  doc.setFillColor(253, 230, 138);
  doc.rect(cKuningStart + 4 * colW, tableY2, colW, 6, 'FD');
  doc.setTextColor(120, 53, 4);
  doc.text('Rata', cKuningStart + 4 * colW + (colW / 2), tableY2 + 4, { align: 'center' });

  // Table Body Rows (Ronde 1, Ronde 2, Tambahan, Total Akhir)
  const rondelist: Ronde[] = ['1', '2', 'Tambahan'];
  let rowY = tableY2 + 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  rondelist.forEach((rondeVal) => {
    // Label
    doc.setFillColor(250, 250, 250);
    doc.rect(10, rowY, colR, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text(`Ronde ${rondeVal}`, 10 + (colR / 2), rowY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');

    // Merah points
    for (let j = 1; j <= 4; j++) {
      const xPos = cRedStart + (j - 1) * colW;
      const score = getTandingFinalJudgeScoreForRound(match, j, 'Merah',  rondeVal);
      doc.rect(xPos, rowY, colW, 6, 'D');
      doc.text(String(score), xPos + (colW / 2), rowY + 4, { align: 'center' });
    }
    const redConsensus = getTandingConsensusScoreForRound(match, rondeVal, 'Merah');
    doc.setFillColor(254, 242, 242);
    doc.rect(cRedStart + 4 * colW, rowY, colW, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text(String(redConsensus), cRedStart + 4 * colW + (colW / 2), rowY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');

    // Kuning points
    for (let j = 1; j <= 4; j++) {
      const xPos = cKuningStart + (j - 1) * colW;
      const score = getTandingFinalJudgeScoreForRound(match, j, 'Kuning',  rondeVal);
      doc.rect(xPos, rowY, colW, 6, 'D');
      doc.text(String(score), xPos + (colW / 2), rowY + 4, { align: 'center' });
    }
    const kuningConsensus = getTandingConsensusScoreForRound(match, rondeVal, 'Kuning');
    doc.setFillColor(255, 253, 240);
    doc.rect(cKuningStart + 4 * colW, rowY, colW, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text(String(kuningConsensus), cKuningStart + 4 * colW + (colW / 2), rowY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');

    rowY += 6;
  });

  // GRAND TOTAL ROW
  doc.setFillColor(235, 235, 235);
  doc.rect(10, rowY, colR, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TOTAL AKHIR', 10 + (colR / 2), rowY + 4.5, { align: 'center' });

  // Merah Grand totals
  for (let j = 1; j <= 4; j++) {
    const xPos = cRedStart + (j - 1) * colW;
    const score = getTandingFinalJudgeScore(match, j, 'Merah');
    doc.rect(xPos, rowY, colW, 7, 'D');
    doc.text(String(score), xPos + (colW / 2), rowY + 4.5, { align: 'center' });
  }
  const redGrandAvg = getTandingConsensusScore(match, 'Merah');
  doc.setFillColor(252, 165, 165);
  doc.rect(cRedStart + 4 * colW, rowY, colW, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(153, 27, 27);
  doc.text(String(redGrandAvg), cRedStart + 4 * colW + (colW / 2), rowY + 4.8, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);

  // Kuning Grand totals
  for (let j = 1; j <= 4; j++) {
    const xPos = cKuningStart + (j - 1) * colW;
    const score = getTandingFinalJudgeScore(match, j, 'Kuning');
    doc.rect(xPos, rowY, colW, 7, 'D');
    doc.text(String(score), xPos + (colW / 2), rowY + 4.5, { align: 'center' });
  }
  const kuningGrandAvg = getTandingConsensusScore(match, 'Kuning');
  doc.setFillColor(253, 230, 138);
  doc.rect(cKuningStart + 4 * colW, rowY, colW, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(146, 64, 14);
  doc.text(String(kuningGrandAvg), cKuningStart + 4 * colW + (colW / 2), rowY + 4.8, { align: 'center' });
  
  // VERDICT BAR
  const verdictY = rowY + 12;
  doc.setLineWidth(1);
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(250, 250, 250);
  doc.rect(10, verdictY, 190, 16, 'FD');

  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('HASIL KEPUTUSAN KONSENSUS REFEREE & DEWAN MAJELIS HAKIM', 105, verdictY + 4, { align: 'center' });

  doc.setFontSize(11);
  if (match.status === 'Selesai') {
    const pemenangNama = match.pemenang === 'Merah' ? match.pesilatMerah.nama : match.pesilatKuning.nama;
    doc.setTextColor(139, 0, 0);
    doc.text(`KEMENANGAN SAH DIRAIH OLEH SUDUT ${match.pemenang?.toUpperCase()}: ${pemenangNama.toUpperCase()}`, 105, verdictY + 9, { align: 'center' });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`"Pernyataan kemenangan sah diputuskan atas dasar: ${match.alasanPemenang || 'Konsensus juri'}"`, 105, verdictY + 13, { align: 'center' });
  } else {
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.text(`Pertandingan Belum Selesai (Status: ${match.status})`, 105, verdictY + 10, { align: 'center' });
  }

  // Signatures
  const sigY = verdictY + 24;
  drawSignatures(doc, sigY, ['Referee Tanding / Hakim', 'Pimpinan Dewan Juri', 'Ketua Panitia Pelaksana']);

  // Footer stamp
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated automatically by Tapak Suci Digital Scoring System on ${new Date().toLocaleString('id-ID')}`, 10, 287);
  doc.text('Halaman 1 dari 1', 200, 287, { align: 'right' });

  // Save the PDF
  doc.save(`TSPM_Partai_Tanding_${match.id}_${match.pesilatMerah.nama}_vs_${match.pesilatKuning.nama}.pdf`);
};

// ==========================================
// EXPORT SENI (ARTISTIC) PDF
// ==========================================

export const exportSeniPDF = (match: MatchSeniState) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // kop
  drawOfficialKop(doc);

  // Document title bar
  doc.setFillColor(245, 245, 245);
  doc.rect(10, 38, 190, 10, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(10, 38, 190, 10, 'D');

  doc.setTextColor(139, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`LEMBAR PENILAIAN & MATRIKS SKOR RESMI - KATEGORI SENI ${match.kategoriSeni.toUpperCase()}`, 105, 44, { align: 'center' });

  // Competitor Data Panel
  const compY = 52;
  doc.setFillColor(254, 254, 254);
  doc.rect(10, compY, 190, 20, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(10, compY, 190, 20, 'D');

  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('NAMA PESILAT / TIM ARTISTIK:', 14, compY + 5);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(match.pesilat.nama.toUpperCase(), 14, compY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Kontingen: ${match.pesilat.kontingen}`, 14, compY + 16);

  // Big Final Score box
  doc.setFillColor(255, 253, 240);
  doc.rect(142, compY + 2, 54, 16, 'F');
  doc.setDrawColor(217, 119, 6);
  doc.rect(142, compY + 2, 54, 16, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(217, 119, 6);
  doc.text('AVERAGE KONSENSUS NILAI DEWAN:', 144, compY + 6);
  doc.setFontSize(12);
  doc.setTextColor(139, 0, 0);
  doc.text(String(match.totalSkorAkhir || '0.00'), 169, compY + 12, { align: 'center' });

  // Metadata block
  const metaY = compY + 24;
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  doc.text(`Partai ID: ${match.id}`, 12, metaY);
  doc.text(`Kategori Usia: ${match.pesilat.kategoriUsia}`, 12, metaY + 4);
  doc.text(`Event: Seni ${match.kategoriSeni}`, 12, metaY + 8);
  
  doc.text(`Sesi Tanggal: ${formatIndonesianDate(match.scheduledDate)}`, 110, metaY);
  doc.text(`Waktu Main: ${match.scheduledTime || '14:00'}`, 110, metaY + 4);
  doc.text(`Durasi Tampil: ${match.waktuBerjalan} detik`, 110, metaY + 8);

  doc.line(10, metaY + 12, 200, metaY + 12);

  // Scores Grid
  const gridY = metaY + 16;
  doc.setTextColor(139, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BERKAS MATRIKS PENILAIAN REF JURI INDIVIDU (TGRS STANDARD)', 12, gridY);

  const tableY = gridY + 3;
  const isTunggalRegu = match.kategoriSeni === 'Tunggal' || match.kategoriSeni === 'Regu';

  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.setFontSize(8);

  if (isTunggalRegu) {
    // Columns for Tunggal/Regu: Juri, Nilai A, Kesalahan, Nilai B, Hukuman, Total Skor
    const cWidths = [30, 40, 25, 40, 30, 25];
    const headers = ['UNSUR OPERASI', 'NILAI A (KEBENARAN - MAKS 9.90)', 'JMH KESALAHAN', 'NILAI B (KEMANTAPAN - MAKS 0.10)', 'HUKUMAN KHUSUS', 'TOTAL SKOR'];
    
    // Header background
    doc.setFillColor(240, 240, 240);
    doc.rect(10, tableY, 190, 8, 'F');
    doc.rect(10, tableY, 190, 8, 'D');

    let xAccumulator = 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    headers.forEach((h, idx) => {
      doc.text(h, xAccumulator + (cWidths[idx] / 2), tableY + 5.5, { align: 'center', maxWidth: cWidths[idx] - 2 });
      xAccumulator += cWidths[idx];
    });

    let currentY = tableY + 8;
    doc.setFont('helvetica', 'normal');
    
    [1, 2, 3, 4].forEach((juriId) => {
      const s: any = match.skorJuri[juriId] || { skorJurus: 9.90, jumlahKesalahan: 0, skorKemantapan: 0.08, penguranganHukuman: 0, totalSkor: 9.98 };
      const nA = s.nilaiA !== undefined ? s.nilaiA : s.skorJurus;
      const nB = s.nilaiB !== undefined ? s.nilaiB : s.skorKemantapan;

      // Draw cols
      let xAcc = 10;
      doc.rect(xAcc, currentY, cWidths[0], 7, 'D');
      doc.setFillColor(250, 250, 250);
      doc.rect(xAcc, currentY, cWidths[0], 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text(`Juri ${juriId}`, xAcc + (cWidths[0] / 2), currentY + 4.5, { align: 'center' });
      xAcc += cWidths[0];

      doc.setFont('helvetica', 'normal');
      doc.rect(xAcc, currentY, cWidths[1], 7, 'D');
      doc.text(Number(nA).toFixed(2), xAcc + (cWidths[1] / 2), currentY + 4.5, { align: 'center' });
      xAcc += cWidths[1];

      doc.rect(xAcc, currentY, cWidths[2], 7, 'D');
      doc.setTextColor(185, 28, 28);
      doc.text(String(s.jumlahKesalahan), xAcc + (cWidths[2] / 2), currentY + 4.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      xAcc += cWidths[2];

      doc.rect(xAcc, currentY, cWidths[3], 7, 'D');
      doc.text(Number(nB).toFixed(2), xAcc + (cWidths[3] / 2), currentY + 4.5, { align: 'center' });
      xAcc += cWidths[3];

      doc.rect(xAcc, currentY, cWidths[4], 7, 'D');
      doc.setTextColor(185, 28, 28);
      doc.text(`-${Number(s.penguranganHukuman).toFixed(2)}`, xAcc + (cWidths[4] / 2), currentY + 4.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      xAcc += cWidths[4];

      doc.setFillColor(255, 253, 240);
      doc.rect(xAcc, currentY, cWidths[5], 7, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.text(Number(s.totalSkor).toFixed(2), xAcc + (cWidths[5] / 2), currentY + 4.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');

      currentY += 7;
    });

    // Grand AVG footer row
    doc.setFillColor(245, 245, 245);
    doc.rect(10, currentY, 190 - cWidths[5], 8, 'F');
    doc.rect(10, currentY, 190, 8, 'D');
    doc.setFont('helvetica', 'bold');
    doc.text('KONSENSUS SKOR RATA-RATA AKHIR', 10 + (190 - cWidths[5]) / 2, currentY + 5.5, { align: 'center' });

    doc.setFillColor(255, 242, 242);
    doc.rect(200 - cWidths[5], currentY, cWidths[5], 8, 'FD');
    doc.setTextColor(139, 0, 0);
    doc.setFontSize(9);
    doc.text(Number(match.totalSkorAkhir).toFixed(2), 200 - (cWidths[5] / 2), currentY + 5.5, { align: 'center' });

  } else {
    // Columns for Ganda/Solo Kreatif: Juri, Konstanta 9.10, N. Teknik, N. Ketegasan, N. Penjiwaan, Hukuman, Total
    const cWidths = [20, 22, 33, 33, 33, 27, 22];
    const headers = ['JURI', 'KONSTANTA', 'N.TEKNIK (0.3)', 'N.KETEGASAN (0.3)', 'N.PENJIWAAN (0.3)', 'HUKUMAN', 'TOTAL'];
    
    doc.setFillColor(240, 240, 240);
    doc.rect(10, tableY, 190, 8, 'F');
    doc.rect(10, tableY, 190, 8, 'D');

    let xAccumulator = 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    headers.forEach((h, idx) => {
      doc.text(h, xAccumulator + (cWidths[idx] / 2), tableY + 5.5, { align: 'center', maxWidth: cWidths[idx] - 1 });
      xAccumulator += cWidths[idx];
    });

    let currentY = tableY + 8;
    doc.setFont('helvetica', 'normal');

    [1, 2, 3, 4].forEach((juriId) => {
      const s = match.skorJuri[juriId] || { skorJurus: 0.25, jumlahKesalahan: 0, skorKemantapan: 0.25, penguranganHukuman: 0, totalSkor: 9.85 };
      const nTeknik = (s as any).nilaiTeknik !== undefined ? (s as any).nilaiTeknik : s.skorJurus;
      const nKetegasan = (s as any).nilaiKetegasan !== undefined ? (s as any).nilaiKetegasan : s.skorKemantapan;
      const nPenjiwaan = (s as any).nilaiPenjiwaan !== undefined ? (s as any).nilaiPenjiwaan : 0.25;

      let xAcc = 10;
      doc.rect(xAcc, currentY, cWidths[0], 7, 'D');
      doc.setFillColor(250, 250, 250);
      doc.rect(xAcc, currentY, cWidths[0], 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text(`Juri ${juriId}`, xAcc + (cWidths[0] / 2), currentY + 4.5, { align: 'center' });
      xAcc += cWidths[0];

      doc.setFont('helvetica', 'normal');
      doc.rect(xAcc, currentY, cWidths[1], 7, 'D');
      doc.text('9.10', xAcc + (cWidths[1] / 2), currentY + 4.5, { align: 'center' });
      xAcc += cWidths[1];

      doc.rect(xAcc, currentY, cWidths[2], 7, 'D');
      doc.text(Number(nTeknik).toFixed(2), xAcc + (cWidths[2] / 2), currentY + 4.5, { align: 'center' });
      xAcc += cWidths[2];

      doc.rect(xAcc, currentY, cWidths[3], 7, 'D');
      doc.text(Number(nKetegasan).toFixed(2), xAcc + (cWidths[3] / 2), currentY + 4.5, { align: 'center' });
      xAcc += cWidths[3];

      doc.rect(xAcc, currentY, cWidths[4], 7, 'D');
      doc.text(Number(nPenjiwaan).toFixed(2), xAcc + (cWidths[4] / 2), currentY + 4.5, { align: 'center' });
      xAcc += cWidths[4];

      doc.rect(xAcc, currentY, cWidths[5], 7, 'D');
      doc.setTextColor(185, 28, 28);
      doc.text(`-${Number(s.penguranganHukuman).toFixed(2)}`, xAcc + (cWidths[5] / 2), currentY + 4.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      xAcc += cWidths[5];

      doc.setFillColor(255, 253, 240);
      doc.rect(xAcc, currentY, cWidths[6], 7, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.text(Number(s.totalSkor).toFixed(2), xAcc + (cWidths[6] / 2), currentY + 4.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');

      currentY += 7;
    });

    // Grand AVG footer row
    doc.setFillColor(245, 245, 245);
    doc.rect(10, currentY, 190 - cWidths[6], 8, 'F');
    doc.rect(10, currentY, 190, 8, 'D');
    doc.setFont('helvetica', 'bold');
    doc.text('KONSENSUS SKOR RATA-RATA AKHIR', 10 + (190 - cWidths[6]) / 2, currentY + 5.5, { align: 'center' });

    doc.setFillColor(255, 242, 242);
    doc.rect(200 - cWidths[6], currentY, cWidths[6], 8, 'FD');
    doc.setTextColor(139, 0, 0);
    doc.setFontSize(9);
    doc.text(Number(match.totalSkorAkhir).toFixed(2), 200 - (cWidths[6] / 2), currentY + 5.5, { align: 'center' });
  }

  // Guidelines text
  const instructY = tableY + 40;
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('Keterangan Formasi: Skor Total diperoleh sesuai dengan formulasi TGRS resmi Pimpinan Pusat Tapak Suci & IPSI.', 12, instructY);
  doc.text('Seni Tunggal & Regu = Nilai A + Nilai B - Hukuman. Seni Ganda & Solo Kreatif = Konstanta 9.10 + N.Teknik + N.Ketegasan + N.Penjiwaan - Hukuman.', 12, instructY + 3.5);

  // Signatures
  const sigY = instructY + 12;
  drawSignatures(doc, sigY, ['Juri Seni / Penilai', 'Ketua Dewan Juri Seni', 'Ketua Panitia Pelaksana']);

  // Footer stamp
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated automatically by Tapak Suci Digital Scoring System on ${new Date().toLocaleString('id-ID')}`, 10, 287);
  doc.text('Halaman 1 dari 1', 200, 287, { align: 'right' });

  // Save the PDF
  doc.save(`TSPM_Seni_TGRS_${match.id}_${match.pesilat.nama}.pdf`);
};

// ==========================================
// EXPORT SUMMARY RESULTS EVENT (PDF REPORT)
// ==========================================

export const exportSummaryPDF = (matchesTanding: MatchTandingState[], matchesSeni: MatchSeniState[]) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // kop
  drawOfficialKop(doc);

  // Document title bar
  doc.setFillColor(245, 245, 245);
  doc.rect(10, 38, 190, 10, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(10, 38, 190, 10, 'D');

  doc.setTextColor(139, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LAPORAN HASIL REKAPITULASI EVENT RESMI - TAPAK SUCI PUTERA MUHAMMADIYAH', 105, 44, { align: 'center' });

  // Event stats panel
  const statsY = 52;
  doc.setFillColor(252, 252, 252);
  doc.rect(10, statsY, 190, 18, 'FD');
  doc.setDrawColor(220, 220, 220);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('PERSENTASE REKAPITULASI KEJUARAAN:', 15, statsY + 5);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9.5);
  doc.text(`Total Partai Tanding: ${matchesTanding.length} Partai`, 15, statsY + 11);
  doc.text(`Total Peserta Seni TGRS: ${matchesSeni.length} Kontestan`, 90, statsY + 11);
  doc.text(`Dicetak Pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`, 150, statsY + 11);

  // SECTION 1: TANDING TABLE
  let currentY = statsY + 26;
  doc.setTextColor(139, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. REKAPITULASI HASIL KATEGORI TANDING (COMBAT RESULTS)', 12, currentY);

  const tableTandingY = currentY + 3;
  // Columns: No (8), ID (22), Kelas/Usia (33), Merah (45), Kuning (45), Winner (37)
  const colsT = [8, 20, 32, 47, 47, 36];
  const headersT = ['NO', 'ID PARTAI', 'KATEGORI / KELAS', 'SUDUT MERAH (SKOR CORNER)', 'SUDUT KUNING (SKOR CORNER)', 'PEMENANG (VERDICT)'];

  doc.setFillColor(240, 240, 240);
  doc.rect(10, tableTandingY, 190, 7, 'F');
  doc.rect(10, tableTandingY, 190, 7, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);

  let xAcc = 10;
  headersT.forEach((h, idx) => {
    doc.text(h, xAcc + (colsT[idx] / 2), tableTandingY + 4.5, { align: 'center', maxWidth: colsT[idx] - 1 });
    xAcc += colsT[idx];
  });

  let rowY = tableTandingY + 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  if (matchesTanding.length === 0) {
    doc.rect(10, rowY, 190, 8, 'D');
    doc.text('Belum ada data partai tanding.', 105, rowY + 5, { align: 'center' });
    rowY += 8;
  } else {
    // Limit to first 12 to fit nicely on page 1, or handle simple list
    matchesTanding.forEach((match, idx) => {
      if (rowY > 185) return; // Prevent messy page spill for copy-paste summaries

      const cM = getTandingConsensusScore(match, 'Merah');
      const cK = getTandingConsensusScore(match, 'Kuning');
      const textMerah = `${match.pesilatMerah.nama} (${cM})`;
      const textKuning = `${match.pesilatKuning.nama} (${cK})`;
      
      const winnerName = match.status === 'Selesai' 
        ? `${match.pemenang === 'Merah' ? 'MERAH' : 'KUNING'} - ${match.pemenang === 'Merah' ? match.pesilatMerah.nama : match.pesilatKuning.nama}`
        : 'BELUM SELESAI';

      let xLocal = 10;
      doc.rect(xLocal, rowY, colsT[0], 7, 'D');
      doc.text(String(idx + 1), xLocal + (colsT[0] / 2), rowY + 4.5, { align: 'center' });
      xLocal += colsT[0];

      doc.rect(xLocal, rowY, colsT[1], 7, 'D');
      doc.text(match.id, xLocal + (colsT[1] / 2), rowY + 4.5, { align: 'center' });
      xLocal += colsT[1];

      doc.rect(xLocal, rowY, colsT[2], 7, 'D');
      doc.text(`${match.kelas} (${match.kategoriUsia})`, xLocal + (colsT[2] / 2), rowY + 4.5, { align: 'center', maxWidth: colsT[2] - 1 });
      xLocal += colsT[2];

      doc.rect(xLocal, rowY, colsT[3], 7, 'D');
      doc.text(textMerah, xLocal + (colsT[3] / 2), rowY + 4.5, { align: 'center', maxWidth: colsT[3] - 1 });
      xLocal += colsT[3];

      doc.rect(xLocal, rowY, colsT[4], 7, 'D');
      doc.text(textKuning, xLocal + (colsT[4] / 2), rowY + 4.5, { align: 'center', maxWidth: colsT[4] - 1 });
      xLocal += colsT[4];

      doc.setFillColor(match.status === 'Selesai' ? (match.pemenang === 'Merah' ? 254 : 255) : 240, match.status === 'Selesai' ? (match.pemenang === 'Merah' ? 242 : 253) : 240, match.status === 'Selesai' ? (match.pemenang === 'Merah' ? 242 : 240) : 240);
      doc.rect(xLocal, rowY, colsT[5], 7, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.text(winnerName, xLocal + (colsT[5] / 2), rowY + 4.5, { align: 'center', maxWidth: colsT[5] - 1 });
      doc.setFont('helvetica', 'normal');

      rowY += 7;
    });
  }

  // SECTION 2: SENI TGRS TABLE
  currentY = rowY + 8;
  doc.setTextColor(139, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. REKAPITULASI HASIL KATEGORI SENI TGRS (ARTISTIC RESULTS)', 12, currentY);

  const tableSeniY = currentY + 3;
  // Columns: No (10), ID (25), Nama (50), Kontingen (45), Kategori (35), Skor Akhir (25)
  const colsS = [10, 22, 53, 45, 35, 25];
  const headersS = ['NO', 'PARTAI ID', 'NAMA PESILAT / TIM GOLONGAN', 'SEKTOR KONTINGEN', 'GOLONGAN SENI', 'SKOR DEWAN'];

  doc.setFillColor(240, 240, 240);
  doc.rect(10, tableSeniY, 190, 7, 'F');
  doc.rect(10, tableSeniY, 190, 7, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);

  xAcc = 10;
  headersS.forEach((h, idx) => {
    doc.text(h, xAcc + (colsS[idx] / 2), tableSeniY + 4.5, { align: 'center', maxWidth: colsS[idx] - 1 });
    xAcc += colsS[idx];
  });

  rowY = tableSeniY + 7;
  doc.setFont('helvetica', 'normal');

  if (matchesSeni.length === 0) {
    doc.rect(10, rowY, 190, 8, 'D');
    doc.text('Belum ada data partai seni.', 105, rowY + 5, { align: 'center' });
    rowY += 8;
  } else {
    matchesSeni.forEach((match, idx) => {
      if (rowY > 245) return; // Prevent sig block overlaps

      let xLocal = 10;
      doc.rect(xLocal, rowY, colsS[0], 7, 'D');
      doc.text(String(idx + 1), xLocal + (colsS[0] / 2), rowY + 4.5, { align: 'center' });
      xLocal += colsS[0];

      doc.rect(xLocal, rowY, colsS[1], 7, 'D');
      doc.text(match.id, xLocal + (colsS[1] / 2), rowY + 4.5, { align: 'center' });
      xLocal += colsS[1];

      doc.rect(xLocal, rowY, colsS[2], 7, 'D');
      doc.setFont('helvetica', 'bold');
      doc.text(match.pesilat.nama, xLocal + (colsS[2] / 2), rowY + 4.5, { align: 'center', maxWidth: colsS[2] - 1 });
      doc.setFont('helvetica', 'normal');
      xLocal += colsS[2];

      doc.rect(xLocal, rowY, colsS[3], 7, 'D');
      doc.text(match.pesilat.kontingen, xLocal + (colsS[3] / 2), rowY + 4.5, { align: 'center', maxWidth: colsS[3] - 1 });
      xLocal += colsS[3];

      doc.rect(xLocal, rowY, colsS[4], 7, 'D');
      doc.text(match.kategoriSeni, xLocal + (colsS[4] / 2), rowY + 4.5, { align: 'center' });
      xLocal += colsS[4];

      doc.setFillColor(255, 253, 240);
      doc.rect(xLocal, rowY, colsS[5], 7, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.text(Number(match.totalSkorAkhir).toFixed(2), xLocal + (colsS[5] / 2), rowY + 4.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');

      rowY += 7;
    });
  }

  // Signatures at the bottom or on next page if it exceeds
  let sigY = rowY + 12;
  if (sigY > 255) {
    // Add page
    doc.addPage();
    drawOfficialKop(doc);
    sigY = 55;
  }

  drawSignatures(doc, sigY, ['Ketua Dewan Hakim Tanding/Seni', 'Sekretaris Pertandingan', 'Ketua Panitia Pelaksana']);

  // Footer stamp
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated automatically by Tapak Suci Digital Scoring System on ${new Date().toLocaleString('id-ID')}`, 10, 287);
  doc.text('Summary Report - Official Archive', 200, 287, { align: 'right' });

  // Save the PDF
  doc.save(`TSPM_Laporan_Summary_Kejuaraan_${new Date().toISOString().split('T')[0]}.pdf`);
};
