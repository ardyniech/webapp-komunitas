// js/astrologi.js - Kalkulasi Zodiak & Shio Anggota Komunitas
window.AppModules = window.AppModules || {};

window.AppModules.Astrologi = {
  hitungAstrologi(tglStr) {
    if (!tglStr) return null;
    const tgl = new Date(tglStr);
    if (isNaN(tgl.getTime())) return null;

    const m = tgl.getMonth() + 1;
    const d = tgl.getDate();
    const y = tgl.getFullYear();

    const today = new Date();
    let age = today.getFullYear() - y;
    const mDiff = today.getMonth() - (m - 1);
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) age--;

    const zodiakData = [
      { m: 1, d: 19, nama: "Capricorn", icon: "♑", desc: "Pekerja keras, disiplin & tertib" },
      { m: 2, d: 18, nama: "Aquarius", icon: "♒", desc: "Visioner, mandiri & setia kawan" },
      { m: 3, d: 20, nama: "Pisces", icon: "♓", desc: "Empati tinggi & suka menolong" },
      { m: 4, d: 19, nama: "Aries", icon: "♈", desc: "Pemberani & pantang menyerah" },
      { m: 5, d: 20, nama: "Taurus", icon: "♉", desc: "Gigih, sabar & setia pada rekan" },
      { m: 6, d: 20, nama: "Gemini", icon: "♊", desc: "Cepat tanggap, lincah & komunikatif" },
      { m: 7, d: 22, nama: "Cancer", icon: "♋", desc: "Perhatian & pelindung kawan aspal" },
      { m: 8, d: 22, nama: "Leo", icon: "♌", desc: "Percaya diri, berjiwa ksatria" },
      { m: 9, d: 22, nama: "Virgo", icon: "♍", desc: "Teliti, rapi & dapat diandalkan" },
      { m: 10, d: 22, nama: "Libra", icon: "♎", desc: "Adil, bijak & pembawa damai" },
      { m: 11, d: 21, nama: "Scorpio", icon: "♏", desc: "Fokus tajam & tangguh hadapi badai" },
      { m: 12, d: 21, nama: "Sagittarius", icon: "♐", desc: "Jiwa petualang & selalu optimis" },
      { m: 12, d: 31, nama: "Capricorn", icon: "♑", desc: "Pekerja keras, disiplin & tertib" }
    ];

    let z = zodiakData[0];
    for (const item of zodiakData) {
      if (m < item.m || (m === item.m && d <= item.d)) {
        z = item;
        break;
      }
    }

    const shioNames = [
      { nama: "Shio Tikus", icon: "🐀", desc: "Cerdik, hemat & gesit baca peluang" },
      { nama: "Shio Kerbau", icon: "🐂", desc: "Ulet, jujur & kuat tahan banting" },
      { nama: "Shio Macan", icon: "🐅", desc: "Berani, kharismatik & pelindung kawan" },
      { nama: "Shio Kelinci", icon: "🐇", desc: "Lembut, waspada & cinta damai" },
      { nama: "Shio Naga", icon: "🐉", desc: "Penuh energi & berjiwa besar" },
      { nama: "Shio Ular", icon: "🐍", desc: "Bijaksana & pemikir tenang" },
      { nama: "Shio Kuda", icon: "🐎", desc: "Lincah, antusias & pantang kalah" },
      { nama: "Shio Kambing", icon: "🐐", desc: "Rendah hati, dermawan & penyabar" },
      { nama: "Shio Monyet", icon: "🐒", desc: "Cerdas, fleksibel & banyak akal" },
      { nama: "Shio Ayam", icon: "🐓", desc: "Disiplin waktu & selalu siaga" },
      { nama: "Shio Anjing", icon: "🐕", desc: "Sangat setia, jujur & penjaga kawan" },
      { nama: "Shio Babi", icon: "🐖", desc: "Tulus, ramah & pembawa rezeki" }
    ];
    const shioIdx = (y - 4) % 12;
    const s = shioNames[shioIdx >= 0 ? shioIdx : (shioIdx + 12)];

    return { zodiak: z, shio: s, age, d, m, y };
  },

  renderKarakterAstrologi(tglStr) {
    const card = document.getElementById("profil-astrologi-card");
    if (!card) return;
    const res = this.hitungAstrologi(tglStr);
    if (!res) {
      card.style.display = "none";
      return;
    }

    const umurEl = document.getElementById("astro-umur-text");
    if (umurEl) umurEl.innerText = `${res.age} Tahun • Lahir ${res.d}/${res.m}/${res.y}`;

    document.getElementById("astro-zodiak-icon").innerText = res.zodiak.icon;
    document.getElementById("astro-zodiak-nama").innerText = res.zodiak.nama;
    document.getElementById("astro-zodiak-desc").innerText = res.zodiak.desc;

    document.getElementById("astro-shio-icon").innerText = res.shio.icon;
    document.getElementById("astro-shio-nama").innerText = res.shio.nama;
    document.getElementById("astro-shio-desc").innerText = res.shio.desc;

    card.style.display = "block";
  }
};
