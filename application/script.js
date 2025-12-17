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
const MAX_FRAMES = 500;             // Maximale Anzahl von Frames (Memory Protection)
let autoCaptureInterval = null;     // Intervall für Auto-Capture
let autoCaptureTimeoutId = null;    // Timeout für Auto-Capture-Ende
let isAutoCapturing = false;        // Status: Auto-Capture läuft
let autoCaptureStartFrames = 0;     // Anzahl Frames beim Start des Auto-Capture
let draggedFrameIndex = null;       // Index des aktuell gedraggten Frames
let dropTargetIndex = null;         // Index des Drop-Ziels

// ========================================
// DOM Elements
// ========================================
// Referenzen zu wichtigen DOM-Elementen
const cameraVideo = document.getElementById('cameraVideo');
const captureCanvas = document.getElementById('captureCanvas');
const captureBtn = document.getElementById('captureBtn');
const captureBtnIcon = document.getElementById('captureBtnIcon');
const captureBtnText = document.getElementById('captureBtnText');
const autoCaptureBtn = document.getElementById('autoCaptureBtn');
const autoCaptureStatus = document.getElementById('autoCaptureStatus');
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
document.querySelectorAll('.tool-btn:not(.logo-btn)').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tool-btn:not(.logo-btn)').forEach(b => b.classList.remove('active'));
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
    stopAutoCapture(); // Auto-Capture beenden bei Werkzeugwechsel
    document.querySelectorAll('.placeholder').forEach(p => p.style.display = 'none');
    captureBtn.style.display = 'none';
    autoCaptureBtn.style.display = 'none';

    if (isPlaying) return;

    const modeText = document.getElementById('modeText');

    if (selectedTool === 'camera') {
        modeText.textContent = 'Kamera';
        initCamera();
        captureBtnIcon.style.display = '';
        captureBtnIcon.textContent = '📷';
        captureBtnText.textContent = 'Aufnehmen';
        autoCaptureBtn.style.display = 'flex'; // Auto-Button nur im Kamera-Modus
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
    ctx.clearRect(0, 0, captureCanvas.width, captureCanvas.height);
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
// Auto-Capture Functions
// ========================================

/**
 * Startet den Auto-Capture-Modus
 * Nimmt 30 Sekunden lang alle 0,5 Sekunden automatisch ein Frame auf
 */
function startAutoCapture() {
    if (isAutoCapturing) return;
    if (!stream || selectedTool !== 'camera') {
        alert('Bitte aktiviere zuerst die Kamera');
        return;
    }

    isAutoCapturing = true;
    autoCaptureStartFrames = frames.length;

    // Button-Status aktualisieren
    autoCaptureBtn.textContent = '⏹️ Stopp';
    autoCaptureBtn.classList.add('active');
    captureBtn.disabled = true;

    // Status-Anzeige einblenden
    autoCaptureStatus.style.display = 'block';

    let elapsedSeconds = 0;
    const totalSeconds = 30;
    const captureIntervalMs = 500; // 0,5 Sekunden

    // Sofort erstes Frame aufnehmen
    captureFrame();

    // Status aktualisieren
    function updateStatus() {
        const remainingSeconds = totalSeconds - elapsedSeconds;
        const capturedFrames = frames.length - autoCaptureStartFrames;
        autoCaptureStatus.textContent = `🔴 Auto-Aufnahme läuft: ${capturedFrames} Frames | ${remainingSeconds}s verbleibend`;
    }

    updateStatus();

    // Alle 0,5 Sekunden ein Frame aufnehmen
    autoCaptureInterval = setInterval(() => {
        if (frames.length >= MAX_FRAMES) {
            stopAutoCapture();
            alert('Maximale Frame-Anzahl erreicht. Auto-Capture gestoppt.');
            return;
        }

        captureFrame();
        elapsedSeconds += captureIntervalMs / 1000;
        updateStatus();
    }, captureIntervalMs);

    // Nach 30 Sekunden automatisch stoppen
    autoCaptureTimeoutId = setTimeout(() => {
        stopAutoCapture();
        const capturedFrames = frames.length - autoCaptureStartFrames;
        alert(`✅ Auto-Capture abgeschlossen!\n\n${capturedFrames} Frames in 30 Sekunden aufgenommen.`);
    }, totalSeconds * 1000);
}

/**
 * Stoppt den Auto-Capture-Modus
 */
function stopAutoCapture() {
    if (!isAutoCapturing) return;

    isAutoCapturing = false;

    // Intervall und Timeout cleanen
    if (autoCaptureInterval) {
        clearInterval(autoCaptureInterval);
        autoCaptureInterval = null;
    }
    if (autoCaptureTimeoutId) {
        clearTimeout(autoCaptureTimeoutId);
        autoCaptureTimeoutId = null;
    }

    // Button-Status zurücksetzen
    autoCaptureBtn.textContent = '🤖 Auto';
    autoCaptureBtn.classList.remove('active');
    captureBtn.disabled = false;

    // Status-Anzeige ausblenden
    autoCaptureStatus.style.display = 'none';
    autoCaptureStatus.textContent = '';
}

// Event Listener für Auto-Capture-Button
autoCaptureBtn.addEventListener('click', function() {
    if (isAutoCapturing) {
        const capturedFrames = frames.length - autoCaptureStartFrames;
        if (confirm(`Auto-Capture wirklich stoppen?\n\nBisher ${capturedFrames} Frames aufgenommen.`)) {
            stopAutoCapture();
        }
    } else {
        startAutoCapture();
    }
});

// ========================================
// Frame Management
// ========================================

/**
 * Fügt ein neues Frame zur Timeline hinzu
 * @param {string} imageData - Base64-kodiertes Bild
 */
function addFrame(imageData) {
    // Frame-Limit prüfen (Memory Protection)
    if (frames.length >= MAX_FRAMES) {
        alert(`Maximale Anzahl von ${MAX_FRAMES} Frames erreicht. Bitte exportiere oder lösche Frames.`);
        return;
    }

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
    const index = frames.findIndex(f => f.id === id);
    if (index === -1) {
        console.error('Frame nicht gefunden:', id);
        return;
    }

    const frame = frames[index];
    const newFrame = {
        id: Date.now().toString(),
        imageData: frame.imageData,
        timestamp: Date.now()
    };
    frames.splice(index + 1, 0, newFrame);
    currentFrameIndex = index + 1; // Neues Frame auswählen
    updateTimeline();
    updateProperties();
    updateOnionSkin();
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
            <div class="frame-item ${currentFrameIndex === index ? 'active' : ''}"
                 data-index="${index}"
                 draggable="true">
                <div class="frame-thumbnail">
                    <img src="${frame.imageData}" alt="Frame ${index + 1}" draggable="false">
                </div>
                <div class="frame-number">#${index + 1}</div>
                ${currentFrameIndex === index ? '<div class="playhead"></div>' : ''}
                <div class="frame-actions">
                    <button class="frame-action-btn duplicate" data-frame-id="${frame.id}">📋</button>
                    <button class="frame-action-btn delete" data-frame-id="${frame.id}">❌</button>
                </div>
                <div class="drag-handle">⋮⋮</div>
            </div>
        `).join('');

    // Click-Listener für Frame-Auswahl
    document.querySelectorAll('.frame-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // Ignoriere Klicks auf Action-Buttons
            if (e.target.closest('.frame-action-btn')) return;

            if (!isPlaying) {
                currentFrameIndex = parseInt(this.dataset.index);
                updateTimeline();
                updateOnionSkin();
                updateProperties();
            }
        });
    });

    // Event-Listener für Duplicate-Buttons
    document.querySelectorAll('.frame-action-btn.duplicate').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            duplicateFrame(this.dataset.frameId);
        });
    });

    // Event-Listener für Delete-Buttons
    document.querySelectorAll('.frame-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteFrame(this.dataset.frameId);
        });
    });

    // Drag & Drop Event-Listener für Frame-Umsortierung
    document.querySelectorAll('.frame-item').forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('dragend', handleDragEnd);
    });

    // Frame-Zähler aktualisieren
    document.getElementById('currentFrameNum').textContent = currentFrameIndex + 1;
    document.getElementById('totalFrames').textContent = frames.length;
    document.getElementById('frameInfo').textContent = `Frame ${currentFrameIndex + 1} / ${frames.length}`;
}

// ========================================
// Drag & Drop Functions für Frame-Reordering
// ========================================

function handleDragStart(e) {
    draggedFrameIndex = parseInt(this.dataset.index);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (draggedFrameIndex === null) return;
    const targetIndex = parseInt(this.dataset.index);
    if (targetIndex !== draggedFrameIndex) {
        this.classList.add('drag-over');
        dropTargetIndex = targetIndex;
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedFrameIndex !== null && dropTargetIndex !== null && draggedFrameIndex !== dropTargetIndex) {
        // Frame aus alter Position entfernen
        const draggedFrame = frames[draggedFrameIndex];

        // Frame-Array neu sortieren
        frames.splice(draggedFrameIndex, 1);
        frames.splice(dropTargetIndex, 0, draggedFrame);

        // CurrentFrameIndex anpassen
        if (currentFrameIndex === draggedFrameIndex) {
            currentFrameIndex = dropTargetIndex;
        } else if (draggedFrameIndex < currentFrameIndex && dropTargetIndex >= currentFrameIndex) {
            currentFrameIndex--;
        } else if (draggedFrameIndex > currentFrameIndex && dropTargetIndex <= currentFrameIndex) {
            currentFrameIndex++;
        }

        // UI aktualisieren
        updateTimeline();
        updateProperties();
        updateOnionSkin();
    }

    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.frame-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedFrameIndex = null;
    dropTargetIndex = null;
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
    if (showOnionSkin && currentFrameIndex > 0 && !isPlaying && frames.length > 0) {
        const prevFrame = frames[currentFrameIndex - 1];
        if (prevFrame && prevFrame.imageData) {
            onionSkinImg.src = prevFrame.imageData;
            onionSkinImg.style.opacity = onionSkinOpacity;
            onionSkinImg.style.display = 'block';
        } else {
            onionSkinImg.style.display = 'none';
        }
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

    // Sinnlos, nur 1 Frame abzuspielen
    if (frames.length === 1) {
        alert('Mindestens 2 Frames benötigt für Wiedergabe');
        return;
    }

    // Cleanup existierendes Intervall (Memory Leak Prevention)
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }

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
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
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
        // Nur Frame-Info aktualisieren, nicht ganze Timeline (Performance)
        document.getElementById('frameInfo').textContent = `Frame ${currentFrameIndex + 1} / ${frames.length}`;
        document.getElementById('currentFrameNum').textContent = currentFrameIndex + 1;
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

    // Wenn Wiedergabe läuft, Intervall mit neuer FPS neu starten
    if (isPlaying && playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = setInterval(() => {
            currentFrameIndex++;
            if (currentFrameIndex >= frames.length) {
                currentFrameIndex = 0;
            }
            updatePlaybackFrame();
        }, 1000 / fps);
    }
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

    // Export-Button während des Exports deaktivieren
    const exportBtn = this;
    const originalText = exportBtn.textContent;
    exportBtn.disabled = true;

    try {
        // Canvas für Rendering erstellen
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');

        // Video-Stream vom Canvas erstellen
        const canvasStream = canvas.captureStream(fps);

        // MediaRecorder-Support prüfen
        if (!window.MediaRecorder) {
            alert('Dein Browser unterstützt kein Video-Export. Bitte verwende Chrome, Firefox oder Edge.');
            exportBtn.disabled = false;
            return;
        }

        // VP9 Codec-Support prüfen, fallback auf VP8
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm;codecs=vp8';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
            }
        }

        const mediaRecorder = new MediaRecorder(canvasStream, {
            mimeType: mimeType,
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

            // Export abgeschlossen
            exportBtn.textContent = originalText;
            exportBtn.disabled = false;
        };

        mediaRecorder.start();

        // Frames rendern mit Fortschrittsanzeige
        const frameDelay = 1000 / fps;
        for (let i = 0; i < frames.length; i++) {
            // Fortschritt anzeigen
            exportBtn.textContent = `💾 ${Math.round((i / frames.length) * 100)}%`;

            await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    setTimeout(resolve, frameDelay);
                };
                img.onerror = () => {
                    reject(new Error(`Frame ${i + 1} konnte nicht geladen werden`));
                };
                img.src = frames[i].imageData;
            });
        }

        // Warte auf letztes Frame + zusätzliche Pufferzeit
        const additionalDelay = Math.max(500, frameDelay * 2);
        await new Promise(resolve => setTimeout(resolve, additionalDelay));

        mediaRecorder.stop();

    } catch (error) {
        console.error('Export error:', error);
        alert('Fehler beim Exportieren: ' + error.message);
        exportBtn.textContent = originalText;
        exportBtn.disabled = false;
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

// Event Listener für Modal-Buttons
document.getElementById('closeErrorModalBtn').addEventListener('click', closeErrorModal);
document.getElementById('closeNoFramesModalBtn').addEventListener('click', closeNoFramesModal);
document.getElementById('cancelDeleteBtn').addEventListener('click', closeConfirmDeleteModal);
document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

// Event Listener für Upload-Button im Placeholder
document.getElementById('uploadBtnPrimary').addEventListener('click', function() {
    fileInput.click();
});

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
    try {
        localStorage.setItem('theme', theme);
    } catch (error) {
        console.warn('Theme konnte nicht gespeichert werden:', error);
    }
}

// Event Listener für Theme-Options
document.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', function() {
        setTheme(this.dataset.theme);
    });
});

// Event Listener für Settings-Modal schließen
document.getElementById('closeSettingsModalBtn').addEventListener('click', closeSettingsModal);

// ========================================
// Initialization
// ========================================

// Anwendung initialisieren
updateViewport();
updateProperties();

// Gespeichertes Theme laden
let savedTheme = 'light';
try {
    savedTheme = localStorage.getItem('theme') || 'light';
} catch (error) {
    console.warn('Theme konnte nicht geladen werden:', error);
}
setTheme(savedTheme);

// ========================================
// Keyboard Shortcuts
// ========================================
document.addEventListener('keydown', function(e) {
    // Ignoriere Shortcuts wenn Modal offen ist
    if (document.querySelector('.modal[style*="display: flex"]')) return;

    // Space: Play/Pause (außer wenn in Input-Feld)
    if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        if (frames.length > 1) {
            playBtn.click();
        }
    }

    // Delete: Aktuelles Frame löschen
    if (e.code === 'Delete' && currentFrameIndex >= 0 && !isPlaying) {
        e.preventDefault();
        const frame = frames[currentFrameIndex];
        if (frame) {
            deleteFrame(frame.id);
        }
    }

    // ArrowLeft: Vorheriges Frame
    if (e.code === 'ArrowLeft' && !isPlaying && frames.length > 0) {
        e.preventDefault();
        if (currentFrameIndex > 0) {
            currentFrameIndex--;
            updateTimeline();
            updateOnionSkin();
            updateProperties();
        }
    }

    // ArrowRight: Nächstes Frame
    if (e.code === 'ArrowRight' && !isPlaying && frames.length > 0) {
        e.preventDefault();
        if (currentFrameIndex < frames.length - 1) {
            currentFrameIndex++;
            updateTimeline();
            updateOnionSkin();
            updateProperties();
        }
    }

    // C: Capture/Aufnehmen
    if (e.code === 'KeyC' && !e.ctrlKey && !isPlaying && captureBtn.style.display !== 'none') {
        e.preventDefault();
        captureBtn.click();
    }

    // O: Onion Skin Toggle
    if (e.code === 'KeyO' && !e.ctrlKey) {
        e.preventDefault();
        document.getElementById('onionToggle').click();
    }

    // A: Auto-Capture Toggle (nur im Kamera-Modus)
    if (e.code === 'KeyA' && !e.ctrlKey && selectedTool === 'camera') {
        e.preventDefault();
        autoCaptureBtn.click();
    }
});

// ========================================
// Drag & Drop Support
// ========================================
const viewport = document.querySelector('.viewport');

// Verhindere Standard-Drag-Verhalten
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    viewport.addEventListener(eventName, function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
});

// Visuelles Feedback beim Drag
['dragenter', 'dragover'].forEach(eventName => {
    viewport.addEventListener(eventName, function() {
        if (!isPlaying) {
            this.style.outline = '3px dashed #2563eb';
        }
    });
});

['dragleave', 'drop'].forEach(eventName => {
    viewport.addEventListener(eventName, function() {
        this.style.outline = '';
    });
});

// Drop-Handler
viewport.addEventListener('drop', function(e) {
    if (isPlaying) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
        alert('Bitte nur Bilddateien hochladen (PNG, JPG, etc.)');
        return;
    }

    imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => addFrame(ev.target.result);
        reader.readAsDataURL(file);
    });
});

// ========================================
// Cleanup on Page Unload
// ========================================
window.addEventListener('beforeunload', function() {
    // Kamera-Stream stoppen
    stopCamera();

    // Auto-Capture stoppen
    stopAutoCapture();

    // Playback-Intervall cleanen
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
});
