<?php
// index.php - VisionVoice con OCR en tiempo real
require_once 'config.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>VisionVoice - Asistente Inclusivo</title>
  <meta name="description" content="Asistente de lectura y navegación para personas ciegas">
  <meta name="theme-color" content="#111729">

  <!-- PWA -->
  <link rel="manifest" href="manifest.json">

  <!-- Estilos -->
  <link rel="stylesheet" href="css/style.css">

  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="assets/icons/icon-192x192.png">
</head>
<body>
  <div class="container">
    <header>
      <h1>👁️ VisionVoice</h1>
      <p>Asistente inclusivo con lectura, voz y navegación inteligente</p>
      <div class="debug-info">
        Modo: <?php echo MOCK_MODE ? '🔄 SIMULACIÓN' : '🚀 PRODUCCIÓN'; ?> | 
        OCR: 🆓 Tesseract.js (Gratuito)
      </div>
    </header>

    <main>
      <section class="controls" aria-label="Controles principales">
        <button id="start-btn" class="btn">🎥 Iniciar Cámara</button>
        <button id="capture-btn" class="btn">📖 Leer Texto</button>
        <button id="describe-btn" class="btn">🧭 Describir Entorno</button>
        <button id="navigate-btn" class="btn">🌍 Navegar</button>
        <button id="repeat-btn" class="btn">🔁 Repetir</button>
        <button id="exit-btn" class="btn">❌ Salir</button>
      </section>

      <section id="listening-indicator" class="listening" style="display:none;">
        🎤 Escuchando comandos de voz...
      </section>

      <section id="ocr-progress" style="display:none; background: linear-gradient(135deg, #4CAF50, #45a049); padding: 12px 20px; border-radius: 12px; margin: 10px auto; color: white; font-weight: bold;">
        🔍 Analizando texto en tiempo real...
      </section>

      <section id="camera-container" aria-label="Vista de cámara">
        <video id="video" autoplay playsinline style="display:none;"></video>
        <canvas id="canvas" style="display:none;"></canvas>
      </section>

      <section id="map-section" aria-label="Mapa de navegación">
        <div id="map" style="width:100%; height:400px; border-radius:15px; margin-top:10px; display:none;"></div>
      </section>

      <section id="results" aria-live="polite" aria-label="Resultados">
        <h2 style="font-size:1.1rem">📢 Resultados</h2>
        <div id="output">Los resultados se mostrarán aquí...</div>
      </section>

      <section id="status" aria-live="polite" aria-label="Estado del sistema">
        Iniciando VisionVoice...
      </section>
    </main>

    <footer>
      <p>🌐 <strong>VisionVoice</strong> © <?php echo date('Y'); ?> — Proyecto inclusivo</p>
      <p style="font-size: 0.8rem; color: #88ff88;">
        OCR Gratuito: Tesseract.js | Modo: <?php echo MOCK_MODE ? 'DESARROLLO' : 'PRODUCCIÓN'; ?>
      </p>
    </footer>
  </div>

  <!-- Dependencias externas -->
  <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2"></script>
  
  <!-- Tesseract.js para OCR GRATUITO -->
  <script src="https://unpkg.com/tesseract.js@4.1.2/dist/tesseract.min.js"></script>

  <!-- Script principal -->
  <script src="js/app.js"></script>
</body>
</html>