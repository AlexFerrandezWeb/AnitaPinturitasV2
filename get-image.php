<?php
// Script para servir imágenes en formato original - Hostinger
header('Content-Type: image/jpeg');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Obtener la ruta de la imagen
$imagePath = isset($_GET['path']) ? $_GET['path'] : '';
$format = isset($_GET['format']) ? $_GET['format'] : 'original';

// Validar la ruta de la imagen
if (empty($imagePath) || strpos($imagePath, '..') !== false) {
    http_response_code(404);
    exit('Imagen no encontrada');
}

// Construir la ruta completa
$fullPath = __DIR__ . '/' . ltrim($imagePath, '/');

// Verificar que el archivo existe
if (!file_exists($fullPath)) {
    http_response_code(404);
    exit('Imagen no encontrada');
}

// Obtener la extensión del archivo
$extension = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));

// Verificar que es una imagen válida
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
if (!in_array($extension, $allowedExtensions)) {
    http_response_code(403);
    exit('Tipo de archivo no permitido');
}

// Leer y servir la imagen
$imageData = file_get_contents($fullPath);
if ($imageData === false) {
    http_response_code(500);
    exit('Error al leer la imagen');
}

// Establecer el tipo de contenido correcto
switch ($extension) {
    case 'jpg':
    case 'jpeg':
        header('Content-Type: image/jpeg');
        break;
    case 'png':
        header('Content-Type: image/png');
        break;
    case 'gif':
        header('Content-Type: image/gif');
        break;
}

// Servir la imagen
echo $imageData;
?> 