<?php

namespace Composphere;
require __DIR__ . '/../vendor/autoload.php';

use Ratchet\Http\HttpServer;
use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;
use React\EventLoop\Loop;
use React\Socket\SocketServer;
use React\Socket\UnixConnector;
use Composphere\Core\DockerClient;
use Composphere\Core\EventManager;
use Composphere\Core\BubbleServer;
use Composphere\Core\DockerService;

// --- 1. BOOTSTRAP (Initialization) ---
$loop = Loop::get();
$connector = new UnixConnector();
$docker = new DockerClient($connector);
$events = new EventManager($connector);
$app = new BubbleServer();
$dockerService = new DockerService($docker, $app);

// --- 2. WIRING (Logic linking) ---

// UI -> DOCKER Actions (Sidebar, Logs, Terminal)
$app->onDockerCommand = function ($action, $id, $from = null, $cmd = null) use ($dockerService) {
    $dockerService->handleCommand($action, $id, $from, $cmd);
};

$app->onCloseConnection = function ($conn) use ($dockerService) {
    $dockerService->closeAllSessions($conn);
};

// --- 3. DOCKER EVENTS (Live Updates) ---

// Auto-update UI when container state change detected via Docker events stream
$events->on('container_event', function ($event) use ($dockerService) {
    $status = $event['status'] ?? 'unknown';
    $name = $event['Actor']['Attributes']['name'] ?? 'container';
    echo "⚡ [STREAM EVENT] Container '$name' did '$status'. MGI trigger UI update!\n";

    // Trigger update immediately! Instant refresh magic.
    $dockerService->broadcastState();
});

// Start event listener stream
$events->listen();


// Periodic stats update (CPU/RAM/Net) - every 3 seconds
$loop->addPeriodicTimer(3.0, function () use ($dockerService) {
    $dockerService->broadcastState();
});

// --- 4. START WEB SERVER ---
$socket = new SocketServer('0.0.0.0:8081', [], $loop);
$server = new IoServer(new HttpServer(new WsServer($app)), $socket, $loop);

echo "🏁 Server started on port 8081...\n";

// --- 5. GRACEFUL SHUTDOWN (Signal Handling) ---
// Requires pcntl extension. Stops the loop immediately on SIGTERM/SIGINT.
$loop->addSignal(SIGTERM, function () use ($loop) {
    echo "👋 Caught SIGTERM. Shutting down gracefully...\n";
    $loop->stop();
});
$loop->addSignal(SIGINT, function () use ($loop) {
    echo "👋 Caught SIGINT. Shutting down gracefully...\n";
    $loop->stop();
});

$loop->run();
