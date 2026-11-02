// Dijital Sınav Saati - Uygulama Mantığı
(function () {
  'use strict';

  // Durum Yönetimi
  const state = {
    status: 'idle', // 'idle' | 'running' | 'paused' | 'finished'
    startHours: 10,
    startMinutes: 15,
    durationMinutes: 135,
    elapsedSeconds: 0,
    timerId: null,
    lastTickTime: null,
    soundEnabled: true,
    wakeLock: null,
    alarmAudioTimer: null,
    clockColor: '#38bdf8',
  };

  // DOM Elemanları
  const elements = {
    displayTime: document.getElementById('display-time'),
    statusBadge: document.getElementById('status-badge'),
    valStart: document.getElementById('val-start'),
    valEnd: document.getElementById('val-end'),
    valRemaining: document.getElementById('val-remaining'),
    remainingContainer: document.getElementById('remaining-container'),
    progressBar: document.getElementById('progress-bar'),
    progressWrapper: document.getElementById('progress-wrapper'),
    
    // Butonlar
    btnStart: document.getElementById('btn-start'),
    btnPause: document.getElementById('btn-pause'),
    btnReset: document.getElementById('btn-reset'),
    btnCurrentTime: document.getElementById('btn-current-time'),
    btnTheme: document.getElementById('btn-theme'),
    btnSoundToggle: document.getElementById('btn-sound-toggle'),
    iconSound: document.getElementById('icon-sound'),
    btnFullscreen: document.getElementById('btn-fullscreen'),
    
    // Renk Ayarları
    colorSwatches: document.querySelectorAll('.color-swatch'),
    inputClockColor: document.getElementById('input-clock-color'),

    // Girdiler
    inputStartTime: document.getElementById('input-start-time'),
    inputDuration: document.getElementById('input-duration'),
    calculatedEndTime: document.getElementById('calculated-end-time'),
    presetButtons: document.querySelectorAll('.preset-btn'),
    chkShowRemaining: document.getElementById('chk-show-remaining'),
    chkPreventSleep: document.getElementById('chk-prevent-sleep'),

    // Modal
    modal: document.getElementById('time-up-modal'),
    modalDuration: document.getElementById('modal-total-duration'),
    btnModalStopSound: document.getElementById('btn-modal-stop-sound'),
    btnModalRestart: document.getElementById('btn-modal-restart'),
  };

  // Web Audio API için ses sentezleyici (Harici dosya gerektirmez)
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Sınav Bitiş Zili (Çift tonlu melodik zil)
  function playExamBell() {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.35, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      // Ding-Dong-Ding melodisi (659Hz E5, 523Hz C5, 784Hz G5)
      playTone(659.25, now + 0.0, 0.8);
      playTone(523.25, now + 0.4, 0.8);
      playTone(783.99, now + 0.8, 1.2);
    } catch (e) {
      console.warn('Audio playback not allowed or failed:', e);
    }
  }

  function startContinuousAlarm() {
    playExamBell();
    if (state.alarmAudioTimer) clearInterval(state.alarmAudioTimer);
    state.alarmAudioTimer = setInterval(() => {
      playExamBell();
    }, 2500);
  }

  function stopAlarmSound() {
    if (state.alarmAudioTimer) {
      clearInterval(state.alarmAudioTimer);
      state.alarmAudioTimer = null;
    }
  }

  // Zaman Formatlama Yardımcıları
  function padZero(num) {
    return String(Math.floor(num)).padStart(2, '0');
  }

  function formatTime(hours, minutes, seconds) {
    const h = ((hours % 24) + 24) % 24;
    return `${padZero(h)}:${padZero(minutes)}:${padZero(seconds)}`;
  }

  function formatDuration(totalSec) {
    const safeSec = Math.max(0, Math.floor(totalSec));
    const h = Math.floor(safeSec / 3600);
    const m = Math.floor((safeSec % 3600) / 60);
    const s = safeSec % 60;
    return `${padZero(h)}:${padZero(m)}:${padZero(s)}`;
  }

  // Hesaplamalar
  function getStartTotalSeconds() {
    return state.startHours * 3600 + state.startMinutes * 60;
  }

  function getTotalDurationSeconds() {
    return state.durationMinutes * 60;
  }

  function calculateTargetEndTime() {
    const startSec = getStartTotalSeconds();
    const durationSec = getTotalDurationSeconds();
    const endSec = (startSec + durationSec) % (24 * 3600);

    const h = Math.floor(endSec / 3600);
    const m = Math.floor((endSec % 3600) / 60);
    return `${padZero(h)}:${padZero(m)}`;
  }

  // Arayüzü Güncelleme
  function updateUI() {
    const startTotalSec = getStartTotalSeconds();
    const totalDurationSec = getTotalDurationSeconds();

    // Mevcut dijital saat zamanı
    const currentClockSec = (startTotalSec + state.elapsedSeconds) % (24 * 3600);
    const curH = Math.floor(currentClockSec / 3600);
    const curM = Math.floor((currentClockSec % 3600) / 60);
    const curS = Math.floor(currentClockSec % 60);

    elements.displayTime.textContent = formatTime(curH, curM, curS);

    // Kalan süre & ilerleme
    const remainingSec = Math.max(0, totalDurationSec - state.elapsedSeconds);
    elements.valRemaining.textContent = formatDuration(remainingSec);

    const progressPercent = Math.min(100, (state.elapsedSeconds / totalDurationSec) * 100);
    elements.progressBar.style.width = `${progressPercent}%`;

    // Bilgi etiketleri
    elements.valStart.textContent = `${padZero(state.startHours)}:${padZero(state.startMinutes)}`;
    const endTimeStr = calculateTargetEndTime();
    elements.valEnd.textContent = endTimeStr;
    elements.calculatedEndTime.textContent = endTimeStr;

    // Durum rozeti
    updateStatusBadge();
  }

  function updateStatusBadge() {
    elements.statusBadge.className = 'exam-status-badge';
    switch (state.status) {
      case 'running':
        elements.statusBadge.classList.add('running');
        elements.statusBadge.textContent = 'SINAV DEVAM EDİYOR';
        elements.btnStart.disabled = true;
        elements.btnPause.disabled = false;
        break;
      case 'paused':
        elements.statusBadge.classList.add('paused');
        elements.statusBadge.textContent = 'DURAKLATILDI';
        elements.btnStart.disabled = false;
        elements.btnStart.querySelector('.btn-text').textContent = 'Devam Et';
        elements.btnPause.disabled = true;
        break;
      case 'finished':
        elements.statusBadge.classList.add('finished');
        elements.statusBadge.textContent = 'SÜRE BİTTİ';
        elements.btnStart.disabled = true;
        elements.btnPause.disabled = true;
        break;
      default:
        elements.statusBadge.textContent = 'HAZIR / AYARLANIYOR';
        elements.btnStart.disabled = false;
        elements.btnStart.querySelector('.btn-text').textContent = 'Başlat';
        elements.btnPause.disabled = true;
        break;
    }
  }

  // Timer Döngüsü (Arka planda sekme dondurulduğunda bile milisaniyelik kaymaları önler)
  function tick() {
    if (state.status !== 'running') return;

    const now = performance.now();
    if (state.lastTickTime !== null) {
      const deltaSec = (now - state.lastTickTime) / 1000;
      state.elapsedSeconds += deltaSec;
    }
    state.lastTickTime = now;

    const totalDurationSec = getTotalDurationSeconds();

    if (state.elapsedSeconds >= totalDurationSec) {
      state.elapsedSeconds = totalDurationSec;
      finishExam();
      return;
    }

    updateUI();
  }

  // Kontrol Eylemleri
  function startExam() {
    if (state.status === 'running') return;

    // Web Audio kilidini kullanıcı eylemiyle aç
    getAudioContext();

    state.status = 'running';
    state.lastTickTime = performance.now();

    if (state.timerId) clearInterval(state.timerId);
    state.timerId = setInterval(tick, 200); // 200ms hassas yenileme

    requestWakeLock();
    updateUI();
  }

  function pauseExam() {
    if (state.status !== 'running') return;

    state.status = 'paused';
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    state.lastTickTime = null;
    releaseWakeLock();
    updateUI();
  }

  function togglePlayPause() {
    if (state.status === 'running') {
      pauseExam();
    } else if (state.status === 'paused' || state.status === 'idle') {
      startExam();
    }
  }

  function resetExam() {
    stopAlarmSound();
    elements.modal.classList.remove('active');

    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }

    state.status = 'idle';
    state.elapsedSeconds = 0;
    state.lastTickTime = null;
    releaseWakeLock();

    updateUI();
  }

  function finishExam() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    state.status = 'finished';
    releaseWakeLock();
    updateUI();

    // Modal ve Alarm tetikle
    elements.modalDuration.textContent = state.durationMinutes;
    elements.modal.classList.add('active');
    startContinuousAlarm();
  }

  // WakeLock (Ekranın kararmasını / kapanmasını engelleme)
  async function requestWakeLock() {
    if (!elements.chkPreventSleep.checked) return;
    try {
      if ('wakeLock' in navigator && !state.wakeLock) {
        state.wakeLock = await navigator.wakeLock.request('screen');
        state.wakeLock.addEventListener('release', () => {
          state.wakeLock = null;
        });
      }
    } catch (err) {
      console.warn('WakeLock not active:', err);
    }
  }

  function releaseWakeLock() {
    if (state.wakeLock) {
      state.wakeLock.release().catch(() => {});
      state.wakeLock = null;
    }
  }

  // Girdi Değerlerini Ayrıştırma & Eşleme
  function readInputs() {
    const timeVal = elements.inputStartTime.value || '10:15';
    const [h, m] = timeVal.split(':').map(Number);
    state.startHours = isNaN(h) ? 10 : h;
    state.startMinutes = isNaN(m) ? 15 : m;

    const durVal = parseInt(elements.inputDuration.value, 10);
    state.durationMinutes = isNaN(durVal) || durVal <= 0 ? 135 : durVal;

    savePreferences();
    if (state.status === 'idle') {
      updateUI();
    }
  }

  function setCurrentTimeToStart() {
    const now = new Date();
    const h = padZero(now.getHours());
    const m = padZero(now.getMinutes());
    elements.inputStartTime.value = `${h}:${m}`;
    readInputs();
  }

  // Renk Dönüşüm ve Saat Rengi Ayarlama
  function hexToRgb(hex) {
    if (!hex) return null;
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return { r, g, b };
    }
    return null;
  }

  function setClockColor(color) {
    if (!color) return;
    state.clockColor = color;
    document.documentElement.style.setProperty('--clock-color', color);

    const rgb = hexToRgb(color);
    if (rgb) {
      document.documentElement.style.setProperty(
        '--clock-glow',
        `0 0 25px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`
      );
    }

    if (elements.inputClockColor) {
      elements.inputClockColor.value = color;
    }

    elements.colorSwatches.forEach((swatch) => {
      if (swatch.dataset.color && swatch.dataset.color.toLowerCase() === color.toLowerCase()) {
        swatch.classList.add('active');
      } else {
        swatch.classList.remove('active');
      }
    });

    savePreferences();
  }

  // Tercihleri Kaydetme & Yükleme
  function savePreferences() {
    try {
      const prefs = {
        startTime: elements.inputStartTime.value,
        duration: elements.inputDuration.value,
        showRemaining: elements.chkShowRemaining.checked,
        preventSleep: elements.chkPreventSleep.checked,
        theme: document.documentElement.getAttribute('data-theme') || 'dark',
        sound: state.soundEnabled,
        clockColor: state.clockColor,
      };
      localStorage.setItem('sinav_timer_prefs', JSON.stringify(prefs));
    } catch (e) {
      // ignore
    }
  }

  function loadPreferences() {
    try {
      const saved = localStorage.getItem('sinav_timer_prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.startTime) elements.inputStartTime.value = prefs.startTime;
        if (prefs.duration) elements.inputDuration.value = prefs.duration;
        if (typeof prefs.showRemaining === 'boolean') {
          elements.chkShowRemaining.checked = prefs.showRemaining;
        }
        if (typeof prefs.preventSleep === 'boolean') {
          elements.chkPreventSleep.checked = prefs.preventSleep;
        }
        if (prefs.theme) {
          document.documentElement.setAttribute('data-theme', prefs.theme);
        }
        if (typeof prefs.sound === 'boolean') {
          state.soundEnabled = prefs.sound;
          updateSoundIcon();
        }
        if (prefs.clockColor) {
          setClockColor(prefs.clockColor);
        }
      }
    } catch (e) {
      // ignore
    }
    readInputs();
  }

  function updateSoundIcon() {
    if (state.soundEnabled) {
      elements.btnSoundToggle.classList.remove('muted');
      elements.iconSound.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      `;
    } else {
      elements.btnSoundToggle.classList.add('muted');
      elements.iconSound.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      `;
    }
  }

  // Olay Dinleyicileri
  function setupEventListeners() {
    // Butonlar
    elements.btnStart.addEventListener('click', startExam);
    elements.btnPause.addEventListener('click', pauseExam);
    elements.btnReset.addEventListener('click', resetExam);
    elements.btnCurrentTime.addEventListener('click', setCurrentTimeToStart);

    // Modal Butonları
    elements.btnModalStopSound.addEventListener('click', () => {
      stopAlarmSound();
    });
    elements.btnModalRestart.addEventListener('click', () => {
      resetExam();
      startExam();
    });

    // Space Kısayolu ve Tam Ekran (F)
    window.addEventListener('keydown', (e) => {
      // Aktif olarak bir input alanında yazılıyorsa kısayolları tetikleme
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey) {
          toggleFullscreen();
        }
      } else if (e.code === 'Escape') {
        if (elements.modal.classList.contains('active')) {
          stopAlarmSound();
          elements.modal.classList.remove('active');
        }
      }
    });

    // Hazır Sınav Butonları
    elements.presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const time = btn.dataset.time;
        const duration = btn.dataset.duration;

        if (time) elements.inputStartTime.value = time;
        if (duration) elements.inputDuration.value = duration;

        elements.presetButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        readInputs();
      });
    });

    // Değişiklik Dinleyicileri
    elements.inputStartTime.addEventListener('change', readInputs);
    elements.inputDuration.addEventListener('input', readInputs);

    // Kalan Süre Görünürlüğü
    elements.chkShowRemaining.addEventListener('change', () => {
      const show = elements.chkShowRemaining.checked;
      elements.remainingContainer.style.display = show ? 'flex' : 'none';
      elements.progressWrapper.style.display = show ? 'block' : 'none';
      savePreferences();
    });

    // Tema Değiştirici
    elements.btnTheme.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      savePreferences();
    });

    // Ses Aç/Kapat
    elements.btnSoundToggle.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      updateSoundIcon();
      savePreferences();
    });

    // Renk Seçiciler
    elements.colorSwatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        if (swatch.dataset.color) {
          setClockColor(swatch.dataset.color);
        }
      });
    });

    if (elements.inputClockColor) {
      elements.inputClockColor.addEventListener('input', (e) => {
        setClockColor(e.target.value);
      });
    }

    // Tam Ekran
    elements.btnFullscreen.addEventListener('click', toggleFullscreen);

    // Yanlışlıkla Sekmeyi Kapatmayı Engelleme
    window.addEventListener('beforeunload', (e) => {
      if (state.status === 'running') {
        e.preventDefault();
        e.returnValue = 'Sınav devam ediyor. Sayfadan ayrılmak istediğinizden emin misiniz?';
      }
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  // Başlatıcı
  function init() {
    loadPreferences();
    setupEventListeners();

    // Başlangıç görünürlük ayarları
    if (!elements.chkShowRemaining.checked) {
      elements.remainingContainer.style.display = 'none';
      elements.progressWrapper.style.display = 'none';
    }

    updateUI();
  }

  // DOM Yüklendiğinde çalıştır
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
