# Stop Motion Studio

Eine moderne Web-Anwendung zur Erstellung von Stop-Motion-Animationen direkt im Browser.

## Features

- 📷 **Kamera-Aufnahme**: Nutze deine Webcam für Live-Aufnahmen
- 📤 **Datei-Upload**: Importiere Bilder von deinem Computer
- ✨ **Demo-Modus**: Teste die App mit generierten Demo-Frames
- 👁️ **Onion Skinning**: Sieh das vorherige Frame transparent überlagert
- 🎬 **Echtzeit-Wiedergabe**: Spiele deine Animation mit einstellbarer FPS ab
- 💾 **Video-Export**: Exportiere als WebM-Video
- 🎨 **Themes**: Hell, Grau und Dunkel
- ⌨️ **Keyboard Shortcuts**: Schnellere Bedienung per Tastatur
- 🖱️ **Drag & Drop**: Ziehe Bilder direkt in die App

## Keyboard Shortcuts

- **Space**: Play/Pause
- **←/→**: Zwischen Frames navigieren
- **Delete**: Aktuelles Frame löschen
- **C**: Frame aufnehmen
- **O**: Onion Skinning ein/aus

## Installation & Start

Die Anwendung benötigt einen lokalen Webserver. Direktes Öffnen der HTML-Datei funktioniert nicht wegen Browser-Sicherheitsbeschränkungen.

### Option 1: Python HTTP Server

```bash
# Im Projektverzeichnis ausführen
python -m http.server 8000

# Dann im Browser öffnen:
# http://localhost:8000/templates/index.html
```

### Option 2: Node.js HTTP Server

```bash
# Installation (einmalig)
npm install -g http-server

# Server starten
http-server -p 8000

# Dann im Browser öffnen:
# http://localhost:8000/templates/index.html
```

### Option 3: VS Code Live Server

1. Installiere die "Live Server" Extension in VS Code
2. Rechtsklick auf `index.html` → "Open with Live Server"

## Browser-Kompatibilität

- Chrome 90+ (empfohlen)
- Firefox 88+
- Edge 90+
- Safari 14+ (eingeschränkt)

**Hinweis**: MediaRecorder API wird benötigt für Video-Export.

## Technische Details

- **Maximale Frames**: 500 (zum Schutz vor Speicherproblemen)
- **Export-Format**: WebM (VP9 oder VP8 Codec)
- **Video-Auflösung**: 1280x720
- **FPS-Bereich**: 6-30

## Projektstruktur

```
StopMotion/
├── templates/
│   └── index.html          # Hauptseite
├── application/
│   └── script.js           # JavaScript-Logik
├── static/
│   └── style.css           # Styling
└── README.md               # Diese Datei
```

## Bekannte Einschränkungen

- Kamera-Zugriff erfordert HTTPS oder localhost
- Private/Incognito-Modus kann Theme-Speicherung blockieren
- Große Anzahl hochauflösender Bilder kann Browser verlangsamen

## Lizenz

Dieses Projekt wurde für Bildungszwecke erstellt.
