<?php
// config.php - Configuración para OCR gratuito
define('MOCK_MODE', false);
define('GOOGLE_VISION_API_KEY', '');

// URL base
if ($_SERVER['HTTP_HOST'] === 'localhost' || strpos($_SERVER['HTTP_HOST'], '127.0.0.1') !== false) {
    define('BASE_URL', 'http://localhost/visionvoice');
} else {
    define('BASE_URL', 'https://tudominio.com');
}

// Configuración de logs
define('LOG_ENABLED', true);
define('LOG_FILE', __DIR__ . '/logs/app.log');

// Crear directorio de logs si no existe
if (!file_exists(__DIR__ . '/logs')) {
    mkdir(__DIR__ . '/logs', 0755, true);
}

// Función para logging
function log_message($message) {
    if (LOG_ENABLED) {
        $timestamp = date('Y-m-d H:i:s');
        $log_entry = "[$timestamp] $message\n";
        file_put_contents(LOG_FILE, $log_entry, FILE_APPEND | LOCK_EX);
    }
}

log_message("=== VISIONVOICE INICIADO ===");
log_message("MODO: OCR Gratuito (Tesseract.js)");
?>