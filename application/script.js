// ========================================
// State Management
// ========================================
// Globale Variablen für den Anwendungszustand
let frames = [];                    // Array aller erfassten Frames
let currentFrameIndex = -1;         // Index des aktuell ausgewählten Frames
let isPlaying = false;              // Status der Wiedergabe
let fps = 12;                       // Frames pro Sekunde für die Animation
let showOnionSkin = true;           // Onion Skinning aktiviert/deaktiviert
let onionSkinOpacity = 0.3;         // Transparenz des Onion Skin Overlays
let selectedTool = 'camera';        // Aktuell ausgewähltes Werkzeug (camera/upload/demo)
let playbackInterval = null;        // Intervall für die Wiedergabe-Animation
let stream = null;                  // MediaStream für Kamera-Video

// ========================================
// DOM Elements
// ========================================
// Referenzen zu wichtigen DOM-Elementen
const cameraVideo = document.getElementById('cameraVideo');
const captureCanvas = document.getElementById('captureCanvas');
const captureBtn = document.getElementById('captureBtn');
const fileInput = document.getElementById('fileInput');
const timelineTrack = document.getElementById('timelineTrack');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const onionSkinImg = document.getElementById('onionSkin');
const playbackImage = document.getElementById('playbackImage');

// ========================================
// Camera Functions
// ========================================

/**
 * Initialisiert die Kamera und zeigt den Video-Stream an
 * Fordert Benutzererlaubnis für Kamera-Zugriff an
 */
async function initCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1920, height: 1080 }
        });
        cameraVideo.srcObject = stream;
        cameraVideo.style.display = 'block';
        document.getElementById('placeholderCamera').style.display = 'none';
        captureBtn.style.display = 'flex';
    } catch (error) {
        console.error('Camera error:', error);
        document.getElementById('placeholderCamera').innerHTML = `
                <div class="placeholder-icon">📷❌</div>
                <div class="placeholder-title">Kamera nicht verfügbar</div>
                <div class="placeholder-subtitle">Bitte erlaube den Kamera-Zugriff</div>
            `;
    }
}

/**
 * Stoppt den Kamera-Stream und gibt Ressourcen frei
 */
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    cameraVideo.style.display = 'none';
}

// ========================================
// Tool Selection
// ========================================

// Event Listener für Werkzeug-Buttons (Kamera, Upload, Demo)
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedTool = this.dataset.tool;
        updateViewport();
    });
});

/**
 * Aktualisiert den Viewport basierend auf dem ausgewählten Werkzeug
 * Zeigt entsprechenden Placeholder und Buttons an
 */
function updateViewport() {
    stopCamera();
    document.querySelectorAll('.placeholder').forEach(p => p.style.display = 'none');
    captureBtn.style.display = 'none';

    if (isPlaying) return;

    const modeText = document.getElementById('modeText');
    const captureBtnIcon = document.getElementById('captureBtnIcon');
    const captureBtnText = document.getElementById('captureBtnText');

    if (selectedTool === 'camera') {
        modeText.textContent = 'Kamera';
        initCamera();
        captureBtnIcon.style.display = '';
        captureBtnIcon.textContent = '📷';
        captureBtnText.textContent = 'Aufnehmen';
    } else if (selectedTool === 'upload') {
        modeText.textContent = 'Upload';
        document.getElementById('placeholderUpload').style.display = 'flex';
    } else if (selectedTool === 'demo') {
        modeText.textContent = 'Demo';
        document.getElementById('placeholderDemo').style.display = 'flex';
        captureBtn.style.display = 'flex';
        captureBtnIcon.style.display = 'none';
        captureBtnText.textContent = 'Demo-Frame';
    }
}

// ========================================
// Capture Functions
// ========================================

// Event Listener für Capture-Button
// Verhält sich unterschiedlich je nach aktivem Werkzeug
captureBtn.addEventListener('click', function() {
    if (isPlaying) {
        stopPlayback();
    } else if (selectedTool === 'upload') {
        fileInput.click();
    } else if (selectedTool === 'camera') {
        captureFrame();
    } else if (selectedTool === 'demo') {
        captureDemoFrame();
    }
});

/**
 * Erfasst ein Frame vom Kamera-Video
 * Zeichnet das aktuelle Video-Bild auf Canvas und speichert es als PNG
 */
function captureFrame() {
    const ctx = captureCanvas.getContext('2d');
    captureCanvas.width = cameraVideo.videoWidth;
    captureCanvas.height = cameraVideo.videoHeight;
    ctx.drawImage(cameraVideo, 0, 0);
    const imageData = captureCanvas.toDataURL('image/png');
    addFrame(imageData);
}

/**
 * Erstellt ein Demo-Frame mit zufälliger Farbe und Zeitstempel
 * Nützlich zum Testen der Animation ohne Kamera
 */
function captureDemoFrame() {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillStyle = randomColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Demo Frame', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = '40px sans-serif';
    ctx.fillText(new Date().toLocaleTimeString('de-DE'), canvas.width / 2, canvas.height / 2 + 40);

    const imageData = canvas.toDataURL('image/png');
    addFrame(imageData);
}

// Event Listener für Datei-Upload
// Verarbeitet hochgeladene Bilder und fügt sie als Frames hinzu
fileInput.addEventListener('change', function(e) {
    Array.from(e.target.files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => addFrame(ev.target.result);
            reader.readAsDataURL(file);
        }
    });
    fileInput.value = '';
});

// ========================================
// Frame Management
// ========================================

/**
 * Fügt ein neues Frame zur Timeline hinzu
 * @param {string} imageData - Base64-kodiertes Bild
 */
function addFrame(imageData) {
    const frame = {
        id: Date.now().toString(),
        imageData: imageData,
        timestamp: Date.now()
    };
    frames.push(frame);
    currentFrameIndex = frames.length - 1;
    updateTimeline();
    updateProperties();
    updateOnionSkin();
}

/**
 * Löscht ein Frame aus der Timeline
 * @param {string} id - Eindeutige ID des zu löschenden Frames
 */
function deleteFrame(id) {
    const index = frames.findIndex(f => f.id === id);
    frames = frames.filter(f => f.id !== id);
    if (currentFrameIndex >= frames.length) {
        currentFrameIndex = frames.length - 1;
    }
    updateTimeline();
    updateProperties();
    updateOnionSkin();
}

/**
 * Dupliziert ein Frame und fügt es direkt nach dem Original ein
 * @param {string} id - Eindeutige ID des zu duplizierenden Frames
 */
function duplicateFrame(id) {
    const frame = frames.find(f => f.id === id);
    if (frame) {
        const newFrame = {
            id: Date.now().toString(),
            imageData: frame.imageData,
            timestamp: Date.now()
        };
        const index = frames.findIndex(f => f.id === id);
        frames.splice(index + 1, 0, newFrame);
        updateTimeline();
        updateProperties();
    }
}

// ========================================
// UI Update Functions
// ========================================

/**
 * Aktualisiert die Timeline-Anzeige mit allen Frames
 * Zeigt Thumbnails, Frame-Nummern und aktiviert/deaktiviert Buttons
 */
function updateTimeline() {
    if (frames.length === 0) {
        timelineTrack.innerHTML = '<div class="timeline-empty">Keine Frames vorhanden - Erstelle dein erstes Frame</div>';
        playBtn.disabled = true;
        stopBtn.disabled = true;
        document.getElementById('exportBtn').disabled = true;
        document.getElementById('clearBtn').disabled = true;
        return;
    }

    playBtn.disabled = false;
    stopBtn.disabled = false;
    document.getElementById('exportBtn').disabled = false;
    document.getElementById('clearBtn').disabled = false;

    timelineTrack.innerHTML = frames.map((frame, index) => `
            <div class="frame-item ${currentFrameIndex === index ? 'active' : ''}" data-index="${index}">
                <div class="frame-thumbnail">
                    <img src="${frame.imageData}" alt="Frame ${index + 1}">
                </div>
                <div class="frame-number">#${index + 1}</div>
                ${currentFrameIndex === index ? '<div class="playhead"></div>' : ''}
                <div class="frame-actions">
                    <button class="frame-action-btn duplicate" onclick="duplicateFrame('${frame.id}')">📋</button>
                    <button class="frame-action-btn delete" onclick="deleteFrame('${frame.id}')">❌</button>
                </div>
            </div>
        `).join('');

    // Click-Listener für Frame-Auswahl
    document.querySelectorAll('.frame-item').forEach(item => {
        item.addEventListener('click', function() {
            if (!isPlaying) {
                currentFrameIndex = parseInt(this.dataset.index);
                updateTimeline();
                updateOnionSkin();
                updateProperties();
            }
        });
    });

    // Frame-Zähler aktualisieren
    document.getElementById('currentFrameNum').textContent = currentFrameIndex + 1;
    document.getElementById('totalFrames').textContent = frames.length;
    document.getElementById('frameInfo').textContent = `Frame ${currentFrameIndex + 1} / ${frames.length}`;
}

/**
 * Aktualisiert die Eigenschaften-Anzeige (Frame-Anzahl, Dauer)
 */
function updateProperties() {
    document.getElementById('propFrameCount').textContent = frames.length;
    document.getElementById('propDuration').textContent = frames.length > 0
        ? `${(frames.length / fps).toFixed(2)}s`
        : '0s';
}

/**
 * Aktualisiert die Onion-Skin-Anzeige
 * Zeigt das vorherige Frame transparent über dem aktuellen
 */
function updateOnionSkin() {
    if (showOnionSkin && currentFrameIndex > 0 && !isPlaying) {
        const prevFrame = frames[currentFrameIndex - 1];
        onionSkinImg.src = prevFrame.imageData;
        onionSkinImg.style.opacity = onionSkinOpacity;
        onionSkinImg.style.display = 'block';
    } else {
        onionSkinImg.style.display = 'none';
    }
}

// ========================================
// Playback Functions
// ========================================

// Event Listener für Play/Pause-Button
playBtn.addEventListener('click', function() {
    if (isPlaying) {
        pausePlayback();
    } else {
        startPlayback();
    }
});

// Event Listener für Stop-Button
stopBtn.addEventListener('click', stopPlayback);

/**
 * Startet die Wiedergabe der Animation
 * Zeigt alle Frames in einer Schleife mit der eingestellten FPS-Rate
 */
function startPlayback() {
    if (frames.length === 0) return;
    isPlaying = true;
    currentFrameIndex = 0;
    playBtn.textContent = '⏸️';

    // Kamera und Placeholders ausblenden
    stopCamera();
    document.querySelectorAll('.placeholder').forEach(p => p.style.display = 'none');
    onionSkinImg.style.display = 'none';
    playbackImage.style.display = 'block';

    // "Fertig"-Button während Wiedergabe anzeigen
    captureBtn.style.display = 'flex';
    captureBtn.classList.add('small');
    captureBtnIcon.style.display = 'none';
    captureBtnText.textContent = 'Fertig';

    updatePlaybackFrame();
    playbackInterval = setInterval(() => {
        currentFrameIndex++;
        if (currentFrameIndex >= frames.length) {
            currentFrameIndex = 0;
        }
        updatePlaybackFrame();
    }, 1000 / fps);
}

/**
 * Pausiert die Wiedergabe
 * Stoppt das Intervall, behält aber den aktuellen Frame-Index
 */
function pausePlayback() {
    isPlaying = false;
    clearInterval(playbackInterval);
    playBtn.textContent = '▶️';
}

/**
 * Stoppt die Wiedergabe komplett
 * Setzt den Frame-Index zurück und kehrt zum Viewport zurück
 */
function stopPlayback() {
    pausePlayback();
    currentFrameIndex = -1;
    playbackImage.style.display = 'none';
    captureBtn.classList.remove('small');
    updateViewport();
    updateTimeline();
    document.getElementById('frameInfo').textContent = 'Kein Frame';
}

/**
 * Aktualisiert das aktuell angezeigte Frame während der Wiedergabe
 */
function updatePlaybackFrame() {
    if (currentFrameIndex >= 0 && currentFrameIndex < frames.length) {
        playbackImage.src = frames[currentFrameIndex].imageData;
        updateTimeline();
    }
}

// ========================================
// FPS Control
// ========================================

// Event Listener für FPS-Slider
document.getElementById('fpsSlider').addEventListener('input', function() {
    fps = parseInt(this.value);
    document.getElementById('fpsValue').textContent = fps;
    updateFpsPresets();
    updateProperties();
});

// Event Listener für FPS-Preset-Buttons
document.querySelectorAll('.fps-preset').forEach(btn => {
    btn.addEventListener('click', function() {
        fps = parseInt(this.dataset.fps);
        document.getElementById('fpsSlider').value = fps;
        document.getElementById('fpsValue').textContent = fps;
        updateFpsPresets();
        updateProperties();
    });
});

/**
 * Aktualisiert die aktive Markierung der FPS-Preset-Buttons
 */
function updateFpsPresets() {
    document.querySelectorAll('.fps-preset').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.fps) === fps);
    });
}

// ========================================
// Onion Skin Control
// ========================================

// Event Listener für Onion-Skin-Toggle
document.getElementById('onionToggle').addEventListener('click', function() {
    showOnionSkin = !showOnionSkin;
    this.classList.toggle('active', showOnionSkin);
    document.getElementById('onionToggleText').textContent = showOnionSkin ? 'Aktiviert' : 'Deaktiviert';
    document.getElementById('onionOpacityControl').style.display = showOnionSkin ? 'block' : 'none';
    updateOnionSkin();
});

// Event Listener für Onion-Skin-Transparenz-Slider
document.getElementById('opacitySlider').addEventListener('input', function() {
    onionSkinOpacity = parseInt(this.value) / 100;
    document.getElementById('opacityValue').textContent = this.value + '%';
    updateOnionSkin();
});

// ========================================
// Export Function
// ========================================

/**
 * Exportiert die Animation als WebM-Video
 * Erstellt ein Video aus allen Frames mit der eingestellten FPS-Rate
 */
document.getElementById('exportBtn').addEventListener('click', async function() {
    if (frames.length === 0) {
        document.getElementById('errorModal').style.display = 'flex';
        return;
    }

    try {
        // Canvas für Rendering erstellen
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');

        // Video-Stream vom Canvas erstellen
        const stream = canvas.captureStream(fps);
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 5000000
        });

        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `stop-motion-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };

        mediaRecorder.start();

        // Frames rendern
        const frameDelay = 1000 / fps;
        for (let i = 0; i < frames.length; i++) {
            await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    setTimeout(resolve, frameDelay);
                };
                img.src = frames[i].imageData;
            });
        }

        // Aufnahme nach allen Frames stoppen
        setTimeout(() => {
            mediaRecorder.stop();
        }, 100);

    } catch (error) {
        console.error('Export error:', error);
        alert('Fehler beim Exportieren: ' + error.message);
    }
});

// ========================================
// Clear Function
// ========================================

/**
 * Event Listener für Löschen-Button
 * Zeigt entsprechendes Modal je nachdem ob Frames vorhanden sind
 */
document.getElementById('clearBtn').addEventListener('click', function() {
    if (frames.length === 0) {
        document.getElementById('noFramesModal').style.display = 'flex';
    } else {
        document.getElementById('confirmDeleteModal').style.display = 'flex';
    }
});

// ========================================
// Modal Functions
// ========================================

/**
 * Schließt das Fehler-Modal (Export ohne Frames)
 */
function closeErrorModal() {
    document.getElementById('errorModal').style.display = 'none';
}

/**
 * Schließt das Info-Modal (Löschen ohne Frames)
 */
function closeNoFramesModal() {
    document.getElementById('noFramesModal').style.display = 'none';
}

/**
 * Schließt das Bestätigungs-Modal für Löschen
 */
function closeConfirmDeleteModal() {
    document.getElementById('confirmDeleteModal').style.display = 'none';
}

/**
 * Bestätigt das Löschen aller Frames
 * Setzt die Anwendung in den Ausgangszustand zurück
 */
function confirmDelete() {
    frames = [];
    currentFrameIndex = -1;
    stopPlayback();
    updateTimeline();
    updateProperties();
    updateOnionSkin();
    closeConfirmDeleteModal();
}

// ========================================
// Settings Functions
// ========================================

/**
 * Event Listener für Einstellungen-Button
 * Öffnet das Einstellungs-Modal
 */
document.getElementById('settingsBtn').addEventListener('click', function() {
    document.getElementById('settingsModal').style.display = 'flex';
});

/**
 * Schließt das Einstellungs-Modal
 */
function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

/**
 * Setzt das Farbtheme der Anwendung
 * @param {string} theme - Theme-Name ('light', 'grey', oder 'dark')
 */
function setTheme(theme) {
    // Alle Theme-Klassen entfernen
    document.body.classList.remove('theme-light', 'theme-grey', 'theme-dark');

    // Neues Theme hinzufügen (light ist Standard, keine Klasse nötig)
    if (theme !== 'light') {
        document.body.classList.add('theme-' + theme);
    }

    // Aktiven Status in den Einstellungen aktualisieren
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        }
    });

    // Theme in localStorage speichern
    localStorage.setItem('theme', theme);
}

// ========================================
// Initialization
// ========================================

// Anwendung initialisieren
updateViewport();
updateProperties();

// Gespeichertes Theme laden
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);
