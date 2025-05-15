<?php
// Set headers for JSON response
header('Content-Type: application/json');

// Check if the request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Check if content was provided
if (!isset($_POST['content']) || empty($_POST['content'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No content provided']);
    exit;
}

// Get the content from the request
$content = $_POST['content'];

function summarizeWithAI($text) {
    // Cohere Chat API endpoint
    $api_url = 'https://api.cohere.ai/v1/chat';
    
    // Cohere API key
    $api_key = 'f0Py94I20dBPSVPyNzYrqYaIp5y7TmYA4Nw9Q3IA';
    
    // Prepare the API request
    $ch = curl_init($api_url);
    
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $api_key
    ];
    
    $data = [
        'message' => "Please summarize the following text in a clear and concise way, maintaining the key points and main ideas:\n\n" . $text,
        'model' => 'command',
        'temperature' => 0.3,
        'preamble' => "You are a helpful AI assistant that specializes in creating clear and concise summaries. Your summaries should capture the main points and key ideas while being easy to read and understand."
    ];
    
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    if ($curl_error) {
        throw new Exception('CURL Error: ' . $curl_error);
    }
    
    if ($http_code !== 200) {
        $error_message = 'HTTP Error: ' . $http_code;
        if ($response) {
            $error_message .= ' - Response: ' . $response;
        }
        throw new Exception($error_message);
    }
    
    $result = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON Decode Error: ' . json_last_error_msg());
    }
    
    if (!isset($result['text']) && !isset($result['message']) && isset($result['generations'][0]['text'])) {
        return $result['generations'][0]['text'];
    } else if (isset($result['text'])) {
        return $result['text'];
    } else if (isset($result['message'])) {
        return $result['message'];
    } else {
        throw new Exception('Invalid response format from API: ' . json_encode($result));
    }
}

try {
    $summary = summarizeWithAI($content);
    
    echo json_encode([
        'summary' => $summary,
        'status' => 'success'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Error generating summary: ' . $e->getMessage()
    ]);
}
