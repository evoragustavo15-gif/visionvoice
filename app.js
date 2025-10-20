// js/app.js - VisionVoice con OCR GRATUITO - VERSIÓN 100% FUNCIONAL
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 VisionVoice iniciando...');

  // Elementos DOM
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const output = document.getElementById('output');
  const status = document.getElementById('status');
  const mapEl = document.getElementById('map');
  const listeningIndicator = document.getElementById('listening-indicator');
  const ocrProgress = document.getElementById('ocr-progress');

  // Variables globales
  let stream = null;
  let recognition = null;
  let isListening = false;
  let cocoModel = null;
  let map = null;
  let marker = null;
  let watchId = null;
  let lastResponse = '';
  let tesseractWorker = null;
  let isProcessing = false;
  let cameraActive = false;

  // 🔊 SISTEMA DE VOZ MEJORADO
  function speak(text, rate = 0.95) {
    if (!('speechSynthesis' in window)) {
      console.log('❌ SpeechSynthesis no soportado');
      return;
    }
    
    console.log('🔊 Hablando:', text);
    
    if (text && text !== '') {
      lastResponse = text;
    }
    
    // Cancelar cualquier habla anterior
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = rate;
    utterance.volume = 1.0;
    
    utterance.onstart = function() {
      console.log('🎙️ Iniciando síntesis de voz');
      stopListening();
    };
    
    utterance.onend = function() {
      console.log('🎙️ Fin de síntesis de voz');
      // Reanudar escucha después de un breve delay
      setTimeout(() => {
        if (!isProcessing) {
          startListening();
        }
      }, 800);
    };
    
    utterance.onerror = function(e) {
      console.error('❌ Error en síntesis de voz:', e);
      // Aún así intentar reanudar escucha
      setTimeout(() => {
        if (!isProcessing) {
          startListening();
        }
      }, 800);
    };
    
    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('❌ Error al hablar:', error);
    }
  }

  function setStatus(message) {
    console.log('📝 Estado:', message);
    if (status) {
      status.textContent = message;
    }
  }

  // 🧠 INICIALIZAR TESSERACT.JS (OCR GRATUITO)
  async function initializeTesseract() {
    console.log('🔧 Inicializando Tesseract.js...');
    setStatus('Cargando motor OCR...');
    
    try {
      // Inicializar Tesseract con español e inglés
      tesseractWorker = await Tesseract.createWorker('spa+eng', 1, {
        logger: progress => {
          console.log('📊 Progreso OCR:', progress.status, progress.progress);
          if (ocrProgress && progress.status === 'recognizing text') {
            const percent = Math.round(progress.progress * 100);
            ocrProgress.innerHTML = `🔍 Analizando texto: ${percent}%`;
          }
        }
      });
      
      console.log('✅ Tesseract.js inicializado correctamente');
      setStatus('Motor OCR listo');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando Tesseract:', error);
      setStatus('Error en motor OCR');
      speak('Error al cargar el sistema de lectura de texto.');
      return false;
    }
  }

  // 🧠 CARGAR MODELO DE VISIÓN
  async function preloadModel() {
    try {
      setStatus('Cargando modelo visual...');
      console.log('🧠 Cargando modelo COCO-SSD...');
      
      cocoModel = await cocoSsd.load();
      console.log('✅ Modelo COCO-SSD cargado');
      setStatus('Modelo cargado correctamente');
    } catch (err) {
      console.error('❌ Error cargando modelo:', err);
      setStatus('Error cargando modelo');
      speak('Error al cargar el modelo de visión.');
    }
  }

  // 🎥 SISTEMA DE CÁMARA MEJORADO
  async function startCamera() {
    console.log('📷 Iniciando cámara...');
    
    if (cameraActive) {
      console.log('ℹ️ Cámara ya activa');
      speak('La cámara ya está activa.');
      return;
    }
    
    try {
      setStatus('Solicitando acceso a cámara...');
      speak('Activando cámara, por favor espera.');
      
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      video.srcObject = stream;
      video.style.display = 'block';
      cameraActive = true;
      
      // Esperar a que el video esté listo
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          console.log('✅ Cámara iniciada:', video.videoWidth, 'x', video.videoHeight);
          
          // Configurar canvas con las dimensiones del video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          setStatus('Cámara activa - Apunta a texto');
          speak('Cámara activada correctamente. Ahora puedes decir "leer texto" o "describir entorno".');
          resolve(true);
        };
        
        video.onerror = (err) => {
          console.error('❌ Error en video:', err);
          setStatus('Error en cámara');
          speak('Error al iniciar la cámara.');
          resolve(false);
        };
      });
      
    } catch (err) {
      console.error('❌ Error accediendo a cámara:', err);
      setStatus('Error de permisos de cámara');
      cameraActive = false;
      
      if (err.name === 'NotAllowedError') {
        speak('Permiso de cámara denegado. Por favor permite el acceso a la cámara en la configuración de tu navegador.');
      } else if (err.name === 'NotFoundError') {
        speak('No se encontró cámara en el dispositivo.');
      } else if (err.name === 'NotSupportedError') {
        speak('Tu navegador no soporta la función de cámara.');
      } else {
        speak('Error desconocido al acceder a la cámara.');
      }
    }
  }

  function stopCamera() {
    if (stream) {
      console.log('📷 Cerrando cámara...');
      stream.getTracks().forEach(track => {
        track.stop();
      });
      stream = null;
      video.srcObject = null;
      video.style.display = 'none';
      cameraActive = false;
      setStatus('Cámara cerrada');
      speak('Cámara cerrada.');
    }
  }

  // 📖 LECTURA DE TEXTO CON TESSERACT.JS - VERSIÓN CORREGIDA
  async function readText() {
    console.log('📖 Iniciando lectura de texto con OCR...');
    
    if (!cameraActive) {
      console.log('❌ Cámara no activa');
      speak('Primero activa la cámara con el botón "Iniciar Cámara".');
      return;
    }

    if (!tesseractWorker) {
      console.log('❌ Tesseract no inicializado');
      speak('El sistema de lectura aún no está listo. Espera unos segundos.');
      return;
    }

    if (isProcessing) {
      console.log('⏳ Ya hay un proceso en curso');
      speak('Ya estoy procesando una solicitud. Espera a que termine.');
      return;
    }

    isProcessing = true;
    stopListening(); // Detener escucha durante el procesamiento

    speak('Procesando texto, por favor espera.');
    setStatus('Capturando y analizando imagen...');

    try {
      // Mostrar progreso OCR
      if (ocrProgress) {
        ocrProgress.style.display = 'block';
        ocrProgress.innerHTML = '🔄 Capturando imagen...';
      }

      // Pequeña pausa para estabilizar la cámara
      await new Promise(resolve => setTimeout(resolve, 300));

      // Configurar canvas
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Capturar imagen del video
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      console.log('🖼️ Imagen capturada para OCR:', canvas.width, 'x', canvas.height);

      if (ocrProgress) {
        ocrProgress.innerHTML = '🔍 Analizando texto con OCR...';
      }

      // ✅ EJECUTAR TESSERACT.JS (OCR GRATUITO)
      console.log('🎯 Ejecutando reconocimiento OCR...');
      const { data: { text, confidence } } = await tesseractWorker.recognize(canvas);
      
      console.log('✅ OCR completado - Confianza:', confidence);
      console.log('📝 Texto detectado:', text);

      // Ocultar progreso
      if (ocrProgress) {
        ocrProgress.style.display = 'none';
      }

      const textoLimpio = text.trim();
      
      if (!textoLimpio || textoLimpio === '') {
        output.textContent = 'No se detectó texto en la imagen.\n\nSugerencias:\n• Mejora la iluminación\n• Acerca más el texto a la cámara\n• Asegúrate de que el texto esté enfocado\n• Evita reflejos y sombras';
        setStatus('No se detectó texto');
        speak('No pude detectar texto en la imagen. Asegúrate de que el texto esté bien iluminado, enfocado y cerca de la cámara.');
        return;
      }

      // Limpiar y formatear texto
      const textoFormateado = textoLimpio
        .replace(/\n\s*\n/g, '\n')
        .replace(/([.!?])\s*/g, '$1\n')
        .trim();
      
      // Limitar texto muy largo para visualización
      const textoDisplay = textoFormateado.length > 1000 ? 
        textoFormateado.substring(0, 1000) + '\n\n... (texto truncado)' : 
        textoFormateado;

      const confianzaPorcentaje = Math.round(confidence * 100);
      
      // Mostrar resultados
      output.textContent = `📖 TEXTO DETECTADO (${confianzaPorcentaje}% confianza):\n\n${textoDisplay}`;
      setStatus(`Texto procesado - ${confianzaPorcentaje}% confianza`);
      
      // Preparar texto para voz (más corto)
      const textoParaVoz = textoFormateado.length > 300 ? 
        textoFormateado.substring(0, 300) + '... (texto continuo)' : 
        textoFormateado;
      
      speak(`He detectado texto con ${confianzaPorcentaje} por ciento de confianza. El texto dice: ${textoParaVoz}`);

    } catch (error) {
      console.error('❌ Error en OCR Tesseract:', error);
      
      if (ocrProgress) {
        ocrProgress.style.display = 'none';
      }
      
      output.textContent = '❌ Error al procesar el texto:\n' + error.message;
      setStatus('Error en OCR');
      speak('Ocurrió un error al procesar el texto. Por favor intenta nuevamente.');
    } finally {
      isProcessing = false;
    }
  }

  // 🧠 DESCRIPCIÓN DE ENTORNO - VERSIÓN CORREGIDA
  async function describeEnvironment() {
    console.log('🌍 Analizando entorno...');
    
    if (!cameraActive) {
      speak('Primero activa la cámara con el botón "Iniciar Cámara".');
      return;
    }
    
    if (!cocoModel) {
      speak('El modelo de visión aún se está cargando. Espera unos segundos.');
      return;
    }
    
    if (isProcessing) {
      speak('Ya estoy procesando una solicitud. Espera a que termine.');
      return;
    }

    isProcessing = true;
    stopListening();

    setStatus('Analizando objetos en el entorno...');
    speak('Analizando lo que ve la cámara, por favor espera.');

    try {
      // Configurar canvas
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      console.log('🔍 Detectando objetos con COCO-SSD...');
      const predictions = await cocoModel.detect(canvas);
      console.log('✅ Detecciones completadas:', predictions);

      if (!predictions.length) {
        output.textContent = 'No se detectaron objetos en la imagen.\n\nLa cámara no pudo identificar objetos. Esto puede deberse a:\n• Poca iluminación\n• Objetos muy lejanos\n• Fondos muy uniformes\n• Objetos no comunes';
        setStatus('No hay objetos detectados');
        speak('No logro identificar objetos en lo que ve la cámara. Intenta con mejor iluminación o acerca más los objetos.');
      } else {
        // Obtener objetos únicos y contar ocurrencias
        const objetoCount = {};
        predictions.forEach(pred => {
          const objeto = pred.class;
          objetoCount[objeto] = (objetoCount[objeto] || 0) + 1;
        });

        const objetosUnicos = Object.keys(objetoCount);
        let descripcion = '';
        
        if (objetosUnicos.length === 1) {
          const count = objetoCount[objetosUnicos[0]];
          descripcion = count > 1 ? 
            `Veo ${count} ${objetosUnicos[0]}s.` : 
            `Veo un ${objetosUnicos[0]}.`;
        } else if (objetosUnicos.length === 2) {
          descripcion = `Puedo ver un ${objetosUnicos[0]} y un ${objetosUnicos[1]}.`;
        } else {
          const primeros = objetosUnicos.slice(0, -1).join(', ');
          const ultimo = objetosUnicos[objetosUnicos.length - 1];
          descripcion = `Detecto ${primeros} y ${ultimo}.`;
        }

        // Añadir información sobre personas
        if (objetoCount['person']) {
          const personas = objetoCount['person'];
          descripcion += personas > 1 ? 
            ` Hay ${personas} personas visibles.` : 
            ' Hay una persona en la imagen.';
        }

        output.textContent = `🧭 OBJETOS DETECTADOS:\n\n${descripcion}\n\nObjetos identificados: ${objetosUnicos.join(', ')}`;
        setStatus('Análisis completado');
        speak(descripcion);
      }
    } catch (err) {
      console.error('❌ Error en detección de objetos:', err);
      output.textContent = '❌ Error al analizar el entorno:\n' + err.message;
      setStatus('Error en análisis');
      speak('Ocurrió un error al analizar lo que ve la cámara.');
    } finally {
      isProcessing = false;
    }
  }

  // 🗺️ SISTEMA DE NAVEGACIÓN
  function startNavigation() {
    console.log('🧭 Iniciando navegación...');
    
    if (typeof L === 'undefined') {
      speak('Error: La librería de mapas no está disponible.');
      return;
    }
    
    // Limpiar mapa existente
    if (map) { 
      map.remove(); 
      map = null; 
      marker = null; 
    }
    
    mapEl.style.display = 'block';
    
    try {
      // Crear mapa centrado en una ubicación por defecto
      map = L.map('map').setView([40.4168, -3.7038], 13); // Madrid por defecto
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
    } catch (err) {
      console.error('❌ Error creando mapa:', err);
      speak('Error al crear el mapa.');
      return;
    }

    if (!navigator.geolocation) {
      speak('Tu navegador no soporta geolocalización.');
      return;
    }

    speak('Iniciando sistema de navegación. Detectando tu ubicación actual...');
    setStatus('Obteniendo ubicación GPS...');

    // Limpiar watch anterior si existe
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
    
    // Obtener ubicación actual
    watchId = navigator.geolocation.watchPosition(
      async function(position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        console.log('📍 Ubicación obtenida:', lat, lon, 'Precisión:', accuracy + 'm');
        
        // Actualizar o crear marcador
        if (!marker) {
          marker = L.marker([lat, lon]).addTo(map)
            .bindPopup('Tu ubicación actual')
            .openPopup();
        } else {
          marker.setLatLng([lat, lon]);
        }
        
        // Centrar mapa en la ubicación
        map.setView([lat, lon], 16);

        try {
          // Obtener dirección aproximada
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
          const data = await response.json();
          const address = data.address || {};
          
          let lugar = 'una ubicación desconocida';
          if (address.road && address.city) {
            lugar = `${address.road}, ${address.city}`;
          } else if (address.road) {
            lugar = address.road;
          } else if (address.city) {
            lugar = address.city;
          } else if (address.town) {
            lugar = address.town;
          }
          
          const textoUbicacion = `Estás en ${lugar}. Precisión: ${Math.round(accuracy)} metros.`;
          
          output.textContent = `🌍 UBICACIÓN ACTUAL:\n\n${textoUbicacion}\n\nCoordenadas: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
          setStatus('Ubicación detectada');
          
          // Solo hablar la ubicación la primera vez
          if (!marker._hasSpoken) {
            speak(textoUbicacion);
            marker._hasSpoken = true;
          }
          
        } catch (err) {
          console.error('❌ Error obteniendo dirección:', err);
          const textoBasico = `Ubicación detectada. Coordenadas: ${lat.toFixed(4)}, ${lon.toFixed(4)}. Precisión: ${Math.round(accuracy)} metros.`;
          output.textContent = `🌍 UBICACIÓN ACTUAL:\n\n${textoBasico}`;
          setStatus('Ubicación GPS obtenida');
          
          if (!marker._hasSpoken) {
            speak(textoBasico);
            marker._hasSpoken = true;
          }
        }
      },
      function(error) {
        console.error('❌ Error geolocalización:', error);
        let errorMsg = 'No se pudo obtener la ubicación. ';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMsg += 'Permiso de ubicación denegado.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg += 'Información de ubicación no disponible.';
            break;
          case error.TIMEOUT:
            errorMsg += 'Tiempo de espera agotado.';
            break;
          default:
            errorMsg += 'Error desconocido.';
        }
        
        setStatus('Error de ubicación');
        speak(errorMsg);
        output.textContent = `❌ ERROR DE UBICACIÓN:\n\n${errorMsg}\n\nAsegúrate de:\n• Habilitar la ubicación en tu dispositivo\n• Conceder permisos al navegador\n• Tener conexión a internet`;
      },
      { 
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  }

  function stopNavigation() {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (map) {
      map.remove();
      map = null;
      marker = null;
    }
    mapEl.style.display = 'none';
    speak('Navegación detenida.');
    setStatus('Navegación cerrada');
  }

  // 🔁 REPETIR ÚLTIMA RESPUESTA
  function repeatLastResponse() {
    console.log('🔁 Repitiendo última respuesta...');
    if (lastResponse && lastResponse !== '') {
      speak(lastResponse);
    } else {
      speak('Aún no hay nada que repetir. Usa primero alguna función como leer texto o describir entorno.');
    }
  }

  // 🎙️ RECONOCIMIENTO DE VOZ MEJORADO
  function setupSpeechRecognition() {
    console.log('🎙️ Configurando reconocimiento de voz...');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('❌ Reconocimiento de voz no soportado');
      speak('Tu navegador no soporta comandos de voz. Usa los botones en pantalla.');
      return;
    }
    
    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function() { 
      console.log('🎙️ Reconocimiento de voz activado');
      isListening = true; 
      listeningIndicator.style.display = 'block'; 
    };
    
    recognition.onend = function() {
      console.log('🎙️ Reconocimiento de voz pausado');
      isListening = false;
      listeningIndicator.style.display = 'none';
      
      // Reiniciar escucha después de un breve delay (si no estamos procesando)
      setTimeout(function() {
        if (!isListening && !isProcessing) {
          try {
            recognition.start();
            console.log('🎙️ Reconocimiento reiniciado automáticamente');
          } catch (err) {
            console.error('❌ Error reiniciando reconocimiento:', err);
          }
        }
      }, 1000);
    };

    recognition.onresult = function(event) {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();
      console.log('🎤 Comando de voz detectado:', transcript);
      
      // No procesar comandos si ya estamos procesando algo
      if (isProcessing) {
        console.log('⏳ Ignorando comando - Procesamiento en curso');
        speak('Estoy ocupado procesando. Espera un momento.');
        return;
      }
      
      // Procesar comandos de voz
      if (transcript.includes('iniciar') && transcript.includes('cámara')) {
        console.log('→ Ejecutando: iniciar cámara');
        startCamera();
      }
      else if (transcript.includes('activar') && transcript.includes('cámara')) {
        console.log('→ Ejecutando: activar cámara');
        startCamera();
      }
      else if (transcript.includes('leer') && transcript.includes('texto')) {
        console.log('→ Ejecutando: leer texto');
        readText();
      }
      else if (transcript.includes('describir') && transcript.includes('entorno')) {
        console.log('→ Ejecutando: describir entorno');
        describeEnvironment();
      }
      else if (transcript.includes('analizar') && transcript.includes('imagen')) {
        console.log('→ Ejecutando: describir entorno (por imagen)');
        describeEnvironment();
      }
      else if (transcript.includes('navegar') || transcript.includes('mapa') || transcript.includes('ubicación')) {
        console.log('→ Ejecutando: navegar');
        startNavigation();
      }
      else if (transcript.includes('repetir') || transcript.includes('otra vez')) {
        console.log('→ Ejecutando: repetir');
        repeatLastResponse();
      }
      else if (transcript.includes('salir') || transcript.includes('cerrar') || transcript.includes('detener')) {
        console.log('→ Ejecutando: salir');
        stopCamera(); 
        stopNavigation(); 
        speak('Todas las funciones han sido detenidas.');
      }
      else if (transcript.includes('ayuda')) {
        console.log('→ Ejecutando: ayuda');
        const helpText = 'Comandos disponibles: Activar cámara, Leer texto, Describir entorno, Navegar, Repetir, Salir. También puedes usar los botones en pantalla.';
        speak(helpText);
      }
      else {
        console.log('❌ Comando no reconocido:', transcript);
        speak('Comando no reconocido. Di "Ayuda" para ver los comandos disponibles.');
      }
    };

    recognition.onerror = function(event) {
      console.error('❌ Error en reconocimiento de voz:', event.error);
      
      if (event.error === 'not-allowed') {
        speak('Permiso de micrófono denegado. Por favor permite el acceso al micrófono en la configuración de tu navegador.');
      } else if (event.error === 'audio-capture') {
        speak('No se detectó micrófono en el dispositivo.');
      } else if (event.error === 'network') {
        console.log('🌐 Error de red en reconocimiento de voz');
      } else {
        console.log('⚠️ Otro error de reconocimiento:', event.error);
      }
    };

    try {
      recognition.start();
      console.log('✅ Reconocimiento de voz iniciado correctamente');
    } catch (err) {
      console.error('❌ Error iniciando reconocimiento de voz:', err);
    }
  }

  function stopListening() {
    if (recognition && isListening) {
      recognition.stop();
    }
  }

  function startListening() {
    if (recognition && !isListening && !isProcessing) {
      try {
        recognition.start();
      } catch (err) {
        console.error('❌ Error iniciando escucha:', err);
      }
    }
  }

  // 🔧 CONFIGURACIÓN DE BOTONES
  function setupButtonEvents() {
    console.log('🔧 Configurando eventos de botones...');
    
    const startBtn = document.getElementById('start-btn');
    const captureBtn = document.getElementById('capture-btn');
    const describeBtn = document.getElementById('describe-btn');
    const navigateBtn = document.getElementById('navigate-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const exitBtn = document.getElementById('exit-btn');
    
    if (startBtn) startBtn.addEventListener('click', startCamera);
    if (captureBtn) captureBtn.addEventListener('click', readText);
    if (describeBtn) describeBtn.addEventListener('click', describeEnvironment);
    if (navigateBtn) navigateBtn.addEventListener('click', startNavigation);
    if (repeatBtn) repeatBtn.addEventListener('click', repeatLastResponse);
    if (exitBtn) exitBtn.addEventListener('click', function() {
      stopCamera();
      stopNavigation();
      speak('Todas las funciones han sido detenidas. Hasta pronto.');
      setStatus('Sistema en espera');
    });
    
    console.log('✅ Todos los botones configurados correctamente');
  }

  // 🚀 INICIALIZACIÓN DE LA APLICACIÓN
  async function initializeApp() {
    console.log('🚀 Inicializando VisionVoice con OCR gratuito...');
    setStatus('Iniciando sistema...');
    
    // 1. Configurar botones primero
    setupButtonEvents();
    
    // 2. Inicializar Tesseract.js (OCR GRATUITO)
    const ocrReady = await initializeTesseract();
    
    // 3. Precargar modelo de visión
    await preloadModel();
    
    // 4. Iniciar reconocimiento de voz después de un breve delay
    setTimeout(function() {
      setupSpeechRecognition();
    }, 2000);
    
    // 5. Mensaje de bienvenida
    setTimeout(function() {
      if (ocrReady) {
        const welcomeMsg = 'VisionVoice completamente listo con OCR gratuito. Usa los botones o comandos de voz. Di "Activar cámara" para comenzar o "Ayuda" para ver opciones.';
        speak(welcomeMsg);
        setStatus('Sistema listo - OCR y voz activos');
      } else {
        speak('VisionVoice listo, pero el OCR no está disponible. Puedes usar la descripción de entorno y navegación.');
        setStatus('Sistema listo - Sin OCR');
      }
    }, 3000);
    
    console.log('✅ VisionVoice inicializado completamente');
  }

  // Funciones globales para depuración
  window.debugApp = function() {
    console.log('🔧 DEBUG APP:');
    console.log('Cámara activa:', cameraActive);
    console.log('Stream activo:', !!stream);
    console.log('Tesseract listo:', !!tesseractWorker);
    console.log('Modelo visión:', !!cocoModel);
    console.log('Procesando:', isProcessing);
    console.log('Escuchando:', isListening);
    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
  };

  // Iniciar la aplicación
  initializeApp();
});