// pb_hooks/kuesioner.pb.js - Penilaian Uji Anggota di Sisi Server (Plan §6.5 & §5.3)

onRecordBeforeCreateRequest((e) => {
  const authRecord = e.httpContext.get("authRecord");
  if (!authRecord) {
    throw new BadRequestError("Wajib login untuk mengirim hasil kuesioner.");
  }
  // Paksa agar hasil tercatat atas nama anggota yang login
  e.record.set("anggota", authRecord.id);

  const kuesionerId = e.record.get("kuesioner");
  if (!kuesionerId) {
    throw new BadRequestError("Kuesioner wajib dipilih.");
  }

  const dao = $app.dao();
  const kuesioner = dao.findRecordById("kuesioner", kuesionerId);
  const jenis = kuesioner.get("jenis");

  // Parse jawaban yang dikirim klien
  let jawabanRaw = e.record.get("jawaban");
  let userAnswers = {};
  if (typeof jawabanRaw === "string") {
    try { jawabanRaw = JSON.parse(jawabanRaw); } catch (_) {}
  }
  if (Array.isArray(jawabanRaw)) {
    jawabanRaw.forEach(item => {
      if (item && item.pertanyaan) userAnswers[item.pertanyaan] = item.jawaban;
    });
  } else if (typeof jawabanRaw === "object" && jawabanRaw !== null) {
    userAnswers = jawabanRaw;
  }

  if (jenis === "uji_pengetahuan") {
    const questions = dao.findRecordsByFilter("pertanyaan", "kuesioner = {:kuesionerId}", "-urutan", 100, 0, { kuesionerId: kuesionerId });
    let totalBobot = 0;
    let totalScore = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = q.id;
      const bobot = q.getInt("bobot") || 1;
      totalBobot += bobot;

      try {
        const kunci = dao.findFirstRecordByData("kunci_jawaban", "pertanyaan", qId);
        if (kunci) {
          let expected = kunci.get("jawaban");
          if (typeof expected === "string") {
            try { expected = JSON.parse(expected); } catch (_) {}
          }
          const actual = userAnswers[qId];
          if (JSON.stringify(actual) === JSON.stringify(expected) || String(actual).trim().toLowerCase() === String(expected).trim().toLowerCase()) {
            totalScore += bobot;
          }
        }
      } catch (err) {
        // Abaikan jika tidak ada kunci
      }
    }

    const nilaiPersen = totalBobot > 0 ? Math.round((totalScore / totalBobot) * 100) : 100;
    const passingGrade = kuesioner.getInt("nilai_lulus") || 70;
    const isLulus = nilaiPersen >= passingGrade;

    e.record.set("nilai", nilaiPersen);
    e.record.set("lulus", isLulus);
    e.record.set("selesai", new Date().toISOString());

    if (!isLulus) {
      try {
        const pembinaanCol = dao.findCollectionByNameOrId("pembinaan");
        const pRecord = new Record(pembinaanCol);
        pRecord.set("anggota", authRecord.id);
        pRecord.set("hasil", e.record.id);
        pRecord.set("catatan", "Perlu pembinaan setelah uji kuesioner: " + kuesioner.get("judul") + " (Nilai: " + nilaiPersen + "%, KKM: " + passingGrade + "%)");
        pRecord.set("status", "perlu_dibina");
        dao.saveRecord(pRecord);
      } catch (err) {
        // pembinaan opsional
      }
    }
  } else {
    // Survei / Evaluasi (tanpa nilai gagal)
    e.record.set("nilai", 100);
    e.record.set("lulus", true);
    e.record.set("selesai", new Date().toISOString());
  }
}, "hasil");
