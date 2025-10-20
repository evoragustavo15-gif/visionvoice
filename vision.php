<?php
// api/vision.php - Para descripción de entorno
require_once '../config.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

log_message("👁️ VISION.PHP - Solicitud recibida");

if (!isset($_POST['image'])) {
    echo json_encode(['success' => false, 'error' => 'No se recibió ninguna imagen']);
    exit;
}

$imageData = $_POST['image'];
$type = $_POST['type'] ?? 'TEXT_DETECTION';

// 🧩 MODO SIMULACIÓN
if (MOCK_MODE) {
    log_message("🎭 VISION.PHP - Modo simulación");
    switch ($type) {
        case 'TEXT_DETECTION':
            $mockTexts = [
                'Texto de ejemplo: Bienvenido a VisionVoice.',
                'Menú: Café $2, Té $1.5, Postre $4.',
                'Documento: Contrato de servicios tecnológicos.'
            ];
            $mock = $mockTexts[array_rand($mockTexts)];
            break;
        case 'LABEL_DETECTION':
            $mock = 'Objetos detectados: persona, silla, mesa, computadora.';
            break;
        default:
            $mock = 'Tipo de análisis no soportado.';
    }
    echo json_encode(['success' => true, 'data' => $mock, 'mode' => 'simulation']);
    exit;
}

// 🧠 MODO PRODUCCIÓN
try {
    $imageBase64 = preg_replace('#^data:image/\w+;base64,#i', '', $imageData);
    $imageBinary = base64_decode($imageBase64);

    $url = 'https://vision.googleapis.com/v1/images:annotate?key=' . GOOGLE_VISION_API_KEY;

    $payload = [
        'requests' => [[
            'image' => ['content' => base64_encode($imageBinary)],
            'features' => [['type' => $type, 'maxResults' => 10]]
        ]]
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    
    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        throw new Exception('Error de conexión: ' . curl_error($ch));
    }

    curl_close($ch);
    $result = json_decode($response, true);

    if (isset($result['error'])) {
        throw new Exception($result['error']['message']);
    }

    $annotation = $result['responses'][0] ?? [];
    $output = '';

    switch ($type) {
        case 'TEXT_DETECTION':
            if (!empty($annotation['textAnnotations'])) {
                $output = $annotation['textAnnotations'][0]['description'];
                $output = preg_replace('/\s+/', ' ', $output);
                $output = trim($output);
            } else {
                $output = 'No se detectó texto.';
            }
            break;

        case 'LABEL_DETECTION':
            if (!empty($annotation['labelAnnotations'])) {
                $labels = array_column($annotation['labelAnnotations'], 'description');
                $output = 'Objetos detectados: ' . implode(', ', $labels) . '.';
            } else {
                $output = 'No se detectaron objetos.';
            }
            break;

        default:
            $output = 'Tipo de análisis no soportado.';
    }

    echo json_encode(['success' => true, 'data' => $output, 'mode' => 'production']);
    
} catch (Exception $e) {
    log_message("💥 VISION.PHP Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>