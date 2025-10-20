<?php
// api/leer.php - Endpoint para lectura de texto
require_once '../config.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Log de solicitud
log_message("📖 LEER.PHP - Solicitud recibida");

// Verificar método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    log_message("❌ Método no permitido: " . $_SERVER['REQUEST_METHOD']);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

// Verificar si se recibió una imagen
if (!isset($_POST['image'])) {
    log_message("❌ No se recibió imagen en POST");
    echo json_encode(['success' => false, 'error' => 'No se recibió ninguna imagen']);
    exit;
}

$imageData = $_POST['image'];
log_message("✅ Imagen recibida, longitud: " . strlen($imageData));

// 🧩 MODO SIMULACIÓN (para desarrollo)
if (MOCK_MODE) {
    log_message("🎭 MODO SIMULACIÓN activado");
    $mockTexts = [
        'Menú del día: Sopa de verduras, Pollo asado con patatas, Flan de postre. Precio: 12 euros.',
        'Periódico: Titulares - Avances en tecnología asistiva para personas con discapacidad visual.',
        'Etiqueta: Leche entera, 1 litro. Caducidad: 15/10/2023. Ingredientes: Leche de vaca.',
        'Señal: Salida de emergencia. Mantenga despejado el acceso.',
        'Receta médica: Tomar una cápsula cada 8 horas con alimentos. Dr. García.',
        'Libro: Capítulo 3 - El futuro de la accesibilidad digital. Página 45.',
        'Factura: Servicio de internet - Total: $45.00 - Vence: 30/11/2023.',
        'Cartel: Bienvenidos a la conferencia de tecnología inclusiva 2024.'
    ];
    $mock = $mockTexts[array_rand($mockTexts)];
    log_message("📄 Texto simulado: " . substr($mock, 0, 50) . "...");
    echo json_encode(['success' => true, 'data' => $mock, 'mode' => 'simulation']);
    exit;
}

// 🧠 MODO PRODUCCIÓN (Google Vision API)
try {
    log_message("🌐 Conectando con Google Vision API...");
    
    // Limpiar y decodificar imagen
    $imageBase64 = preg_replace('#^data:image/\w+;base64,#i', '', $imageData);
    $imageBinary = base64_decode($imageBase64);
    
    if (!$imageBinary) {
        throw new Exception('Error al decodificar la imagen base64');
    }
    
    log_message("📸 Imagen decodificada, tamaño: " . strlen($imageBinary) . " bytes");

    // Preparar solicitud para Google Vision
    $url = 'https://vision.googleapis.com/v1/images:annotate?key=' . GOOGLE_VISION_API_KEY;

    $payload = [
        'requests' => [[
            'image' => ['content' => base64_encode($imageBinary)],
            'features' => [
                ['type' => 'TEXT_DETECTION', 'maxResults' => 10],
                ['type' => 'DOCUMENT_TEXT_DETECTION', 'maxResults' => 10]
            ]
        ]]
    ];

    // Enviar con cURL
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true // true en producción
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    log_message("📡 Respuesta Google Vision: HTTP $httpCode");

    if (curl_errno($ch)) {
        throw new Exception('Error de conexión: ' . curl_error($ch));
    }

    curl_close($ch);
    $result = json_decode($response, true);

    // Manejar errores de API
    if (isset($result['error'])) {
        throw new Exception('Google Vision: ' . $result['error']['message']);
    }

    $annotation = $result['responses'][0] ?? [];
    $output = '';

    // Procesar texto detectado
    if (!empty($annotation['textAnnotations'])) {
        $output = $annotation['textAnnotations'][0]['description'];
        $output = preg_replace('/\s+/', ' ', $output);
        $output = trim($output);
        
        if (empty($output)) {
            $output = 'No se detectó texto legible en la imagen.';
        }
        
        log_message("✅ Texto detectado: " . substr($output, 0, 100) . "...");
    } else {
        $output = 'No se detectó texto en la imagen.';
        log_message("ℹ️ No se detectó texto");
    }

    echo json_encode(['success' => true, 'data' => $output, 'mode' => 'production']);
    
} catch (Exception $e) {
    log_message("💥 Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

log_message("📖 LEER.PHP - Proceso completado");
?>