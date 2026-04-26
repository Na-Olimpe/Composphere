<?php

namespace Composphere\Core;

class DockerService
{
    private DockerClient $docker;
    private BubbleServer $app;
    private array $terminalStreams = []; // Stores raw socket streams per connection

    public function __construct(DockerClient $docker, BubbleServer $app)
    {
        $this->docker = $docker;
        $this->app = $app;
    }

    public function handleCommand($action, $id, $from = null, $cmd = null)
    {
        if ($action === 'terminal' && $from && isset($cmd)) {
            $connId = spl_object_hash($from);
            $streamKey = $connId . '_' . $id;

            // If we have an active stream, just write data to it
            if (isset($this->terminalStreams[$streamKey])) {
                $this->terminalStreams[$streamKey]->write($cmd);
                return;
            }

            // Otherwise, start a new session
            $payload = json_encode([
                "AttachStdin" => true,
                "AttachStdout" => true,
                "AttachStderr" => true,
                "Tty" => true,
                "Cmd" => ["sh", "-c", "command -v bash >/dev/null 2>&1 && exec bash || exec sh"] // Fallback mechanism: bash then sh
            ]);

            $this->docker->request('POST', "/containers/$id/exec", $payload)->then(
                function ($response) use ($id, $from, $streamKey) {
                    $execData = json_decode($response, true);
                    $execId = $execData['Id'] ?? null;
                    if (!$execId) return;

                    $this->docker->connectRaw()->then(function ($socket) use ($execId, $from, $streamKey) {
                        $payloadStart = json_encode(["Detach" => false, "Tty" => true]);
                        $length = strlen($payloadStart);

                        // Manually trigger the start of the exec stream
                        $request = "POST /exec/{$execId}/start HTTP/1.1\r\n" .
                                   "Host: localhost\r\n" .
                                   "Content-Type: application/json\r\n" .
                                   "Connection: Upgrade\r\n" .
                                   "Upgrade: tcp\r\n" .
                                   "Content-Length: {$length}\r\n" .
                                   "\r\n" .
                                   $payloadStart;
                                   
                        $socket->write($request);

                        // Every byte from Docker -> to Browser
                        $socket->on('data', function ($chunk) use ($from, $id) {
                            // Filter out HTTP response headers if visible at the start of stream
                            if (strpos($chunk, 'HTTP/1.1') === 0 || strpos($chunk, 'HTTP/1.0') === 0) {
                                $parts = explode("\r\n\r\n", $chunk, 2);
                                $chunk = $parts[1] ?? '';
                            }
                            if ($chunk === '') return;

                            $from->send(json_encode([
                                'type' => 'terminal',
                                'id' => $id,
                                'data' => $chunk
                            ]));
                        });

                        $socket->on('close', function () use ($streamKey) {
                            unset($this->terminalStreams[$streamKey]);
                        });

                        $this->terminalStreams[$streamKey] = $socket;
                    });
                }
            );
            return;
        }

        if ($action === 'exec' && $from && $cmd) {
            // This is now mostly fallback for simple commands if needed
            return;
        }

        if ($action === 'logs' && $from) {
            $this->docker->request('GET', "/containers/$id/logs?stdout=true&stderr=true&tail=50")->then(
                function ($response) use ($id, $from) {
                    $cleanLogs = preg_replace('/[\x00-\x08\x0B-\x1F\x7F]/', '', $response);
                    $cleanLogs = mb_convert_encoding($cleanLogs, 'UTF-8', 'UTF-8');

                    $from->send(json_encode([
                        'type' => 'logs',
                        'id' => $id,
                        'logs' => trim($cleanLogs)
                    ]));
                },
                function ($e) {
                    echo "❌ Failed to fetch logs: " . $e->getMessage() . "\n";
                }
            );
            return;
        }

        if ($action === 'rebuild') {
            echo "🛠️ REBUILD requested for $id. (Log: Full build logic not implemented yet, using Restart as fallback)\n";
            $action = 'restart';
        }

        $method = ($action === 'rm') ? 'DELETE' : 'POST';
        $endpoint = ($action === 'rm') ? "/containers/$id?force=true" : "/containers/$id/$action";

        $this->docker->request($method, $endpoint)->then(
            function ($response) use ($action) {
                echo "✅ Docker replied to $action: " . trim($response) . "\n";
            },
            function ($e) {
                echo "❌ Docker command failed: " . $e->getMessage() . "\n";
            }
        );
    }

    public function broadcastState()
    {
        $this->docker->request('GET', '/containers/json?all=1')->then(
            function ($jsonStr) {
                $containers = json_decode($jsonStr, true);
                if (!$containers) {
                    return;
                }

                $runningCount = 0;
                foreach ($containers as &$c) {
                    $id = $c['Id'];
                    $c['compose_project'] = $c['Labels']['com.docker.compose.project'] ?? null;
                    $c['network_list'] = (isset($c['NetworkSettings']['Networks']) && is_array($c['NetworkSettings']['Networks']))
                        ? array_keys($c['NetworkSettings']['Networks'])
                        : [];

                    if ($c['State'] === 'running') {
                        $runningCount++;
                        $c['cpu_usage'] = $this->app->cpuCache[$id] ?? '0.0%';
                        $c['net_speed'] = isset($this->app->netCache[$id]['speed']) ? $this->app->netCache[$id]['speed'] : 0;
                        $c['ram_stats'] = $this->app->ramCache[$id] ?? ['percent' => 0, 'usage_mb' => 0, 'limit_mb' => 0];

                        $this->docker->request('GET', "/containers/$id/stats?stream=false")->then(
                            function ($statJson) use ($id) {
                                $statData = json_decode($statJson, true);
                                if ($statData) {
                                    if (isset($statData['cpu_stats']) && isset($statData['precpu_stats'])) {
                                        $this->app->cpuCache[$id] = $this->calculateCpuPercent($statData);
                                    }
                                    if (isset($statData['networks'])) {
                                        $this->app->netCache[$id] = $this->calculateNetSpeed($statData, $this->app->netCache, $id);
                                    }
                                    if (isset($statData['memory_stats'])) {
                                        $this->app->ramCache[$id] = $this->calculateRamStats($statData);
                                    }
                                }
                            }
                        );
                    } else {
                        $c['cpu_usage'] = '0.0%';
                        $c['net_speed'] = 0;
                        $c['ram_stats'] = ['percent' => 0, 'usage_mb' => 0, 'limit_mb' => 0];
                    }
                }
                unset($c);

                $this->app->broadcast($containers);
                echo "🐳 Send state: " . count($containers) . " (Running: $runningCount) | " . date('H:i:s') . "\n";
            }
        );
    }

    private function calculateCpuPercent($stat)
    {
        $cpuDelta = $stat['cpu_stats']['cpu_usage']['total_usage'] - ($stat['precpu_stats']['cpu_usage']['total_usage'] ?? 0);
        $sysDelta = $stat['cpu_stats']['system_cpu_usage'] - ($stat['precpu_stats']['system_cpu_usage'] ?? 0);
        $cpus = $stat['cpu_stats']['online_cpus'] ?? 1;

        if ($sysDelta > 0 && $cpuDelta > 0) {
            $percent = ($cpuDelta / $sysDelta) * $cpus * 100.0;
            return round($percent, 1) . '%';
        }
        return '0.0%';
    }

    private function calculateNetSpeed($stat, $cache, $id)
    {
        $currentBytes = 0;
        if (isset($stat['networks'])) {
            foreach ($stat['networks'] as $net) {
                $currentBytes += ($net['rx_bytes'] ?? 0) + ($net['tx_bytes'] ?? 0);
            }
        }
        $prevBytes = isset($cache[$id]['total']) ? $cache[$id]['total'] : $currentBytes;
        $speedKbps = max(0, ($currentBytes - $prevBytes) / 3 / 1024);
        return [ 'total' => $currentBytes, 'speed' => round($speedKbps, 2) ];
    }

    private function calculateRamStats($stat)
    {
        $usage = $stat['memory_stats']['usage'] ?? 0;
        $limit = $stat['memory_stats']['limit'] ?? 1; // avoid division by zero
        $percent = ($limit > 0) ? ($usage / $limit) * 100 : 0;

        return [
            'percent' => round($percent, 1),
            'usage_mb' => round($usage / 1024 / 1024, 1),
            'limit_mb' => round($limit / 1024 / 1024, 1)
        ];
    }
    public function closeAllSessions($from)
    {
        $connId = spl_object_hash($from);
        foreach ($this->terminalStreams as $key => $socket) {
            if (strpos($key, $connId . '_') === 0) {
                $socket->close();
                unset($this->terminalStreams[$key]);
            }
        }
    }
}
