<?php

namespace Composphere\Core;

use React\Socket\UnixConnector;
use React\Socket\FixedUriConnector;
use React\Http\Browser;
use Evenement\EventEmitter;
use React\EventLoop\Loop;
use Psr\Http\Message\ResponseInterface;

class EventManager extends EventEmitter
{
    private Browser $browser;

    public function __construct(UnixConnector $connector, string $socketPath = '/var/run/docker.sock')
    {
        $fixedConnector = new FixedUriConnector("unix://$socketPath", $connector);
        // Disable timeout for long-lived streams
        $this->browser = (new Browser($fixedConnector))->withTimeout(false);
    }

    /**
     * Establishes a persistent connection with Docker Events API
     */
    public function listen(): void
    {
        $filters = urlencode(json_encode([
            'type' => ['container'],
            'event' => ['start', 'die', 'destroy', 'pause', 'unpause']
        ]));

        $url = "http://localhost/events?filters=$filters";

        // requestStreaming keeps the connection open and handles chunked transfer encoding automatically
        $this->browser->requestStreaming('GET', $url)->then(
            function (ResponseInterface $response) {
                echo "📡 Connected to Docker Events Stream...\n";

                $stream = $response->getBody();

                $buffer = '';

                $stream->on('data', function ($chunk) use (&$buffer) {
                    $buffer .= $chunk;

                    // Docker Events arrive in JSON Lines format (each line is a valid JSON)
                    $lines = explode("\n", $buffer);

                    // Last line might be incomplete, return it to the buffer
                    $buffer = array_pop($lines);

                    foreach ($lines as $line) {
                        $line = trim($line);
                        if (empty($line)) {
                            continue;
                        }

                        // Browser handles decoding the chunked data, so we can directly decode JSON
                        $eventData = json_decode($line, true);
                        if ($eventData && isset($eventData['status'])) {
                            // ⚡ Flash! Trigger event in our PHP application
                            $this->emit('container_event', [$eventData]);
                        }
                    }
                });

                $stream->on('close', function () {
                    echo "⚠️ Docker Event stream disconnected. Reconnecting...\n";
                    Loop::addTimer(2.0, [$this, 'listen']);
                });

                $stream->on('error', function (\Exception $e) {
                    echo "❌ Stream Error: " . $e->getMessage() . "\n";
                    Loop::addTimer(2.0, [$this, 'listen']);
                });
            },
            function (\Exception $e) {
                echo "❌ Event Monitor Connection Error: " . $e->getMessage() . "\n";
                Loop::addTimer(5.0, [$this, 'listen']);
            }
        );
    }
}
