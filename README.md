# ⏱️ Dijital Sınav Saati

Deneme sınavı çözerken gerçek sınav salonu ortamını simüle eden, modern ve odaklanmayı artıran dijital sınav saati uygulaması.

🌐 **Canlı Site:** [https://efealierenkuyucu.github.io/sinavdijitalsaat/](https://efealierenkuyucu.github.io/sinavdijitalsaat/)

---

## 🌟 Özellikler

- **🕒 Gerçekçi Dijital Saat:** Büyük, net ve yüksek kontrastlı dijital LED saat gösterimi (`SS:DD:ss`).
- **⚙️ Esnek Başlangıç & Süre:** 
  - İstenen saatten başlatma (Örn: `10:15` veya o anki saat).
  - İstenen sınav süresi (Örn: `135` dakika).
  - Otomatik bitiş saati hesaplama (`12:30`).
- **⚡ Hızlı Sınav Şablonları:** TYT (165 dk), AYT (180 dk), MSÜ / DGS (135 dk), KPSS (130 dk), LGS (75 & 80 dk).
- **🎨 Özelleştirilebilir LED Rengi:** Mavi, Kırmızı, Yeşil, Sarı, Mor, Beyaz ve sınırsız Özel Renk seçici.
- **⌨️ Hızlı Kısayollar:**
  - `Space`: Başlat / Duraklat / Devam Et.
  - `F`: Dikkat dağıtmayan Tam Ekran (Focus) modu.
- **🔔 Süre Doldu Uyarısı & Bitiş Zili:** Süre dolduğunda görsel tam ekran uyarısı ve Web Audio API tabanlı melodik sınav bitiş zili.
- **🔒 Güvenlik & Konfor:** Sekme arka planda kalsa bile hassas süre takibi (`performance.now()`), ekran kararmasını önleme (`WakeLock`) ve yanlışlıkla sekmeyi kapatma koruması.

---

## 💻 Kullanım & Kurulum

Uygulama sıfır bağımlılıkla (Vanilla HTML, CSS, JavaScript) geliştirilmiştir.

```bash
# Projeyi klonlayın
git clone https://github.com/EfeAliErenKuyucu/sinavdijitalsaat.git

# Klasöre girin
cd sinavdijitalsaat

# index.html dosyasını herhangi bir modern tarayıcıda açın
```

---

## 📄 Lisans

MIT Lisansı ile korunmaktadır. Açık kaynaklı ve herkese açıktır.
