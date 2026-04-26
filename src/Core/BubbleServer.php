<?php

namespace Composphere\Core;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class BubbleServer implements MessageComponentInterface
{
    private \SplObjectStorage $clients;
    public array $cpuCache = [];
    public array $netCache = [];
    public array $ramCache = [];

    // Store the last state to deliver to new clients immediately without delay
    public array $lastState = [];

    /**
     * @var callable|null
     */
    public $onDockerCommand = null;

    /**
     * @var callable|null
     */
    public $onCloseConnection = null;

    public function __construct()
    {
        $this->clients = new \SplObjectStorage();
        echo "✅ WebSocket Component initialized\n";
    }

    public function onOpen(ConnectionInterface $conn)
    {
        $this->clients->attach($conn);
        /** @var \Ratchet\ConnectionInterface&object{resourceId: int} $conn */
        // Send full state immediately to new client
        if (!empty($this->lastState)) {
            $conn->send(json_encode([
                'type' => 'full',
                'data' => $this->lastState
            ]));
            $this->clients->offsetSet($conn, $this->lastState);
        }
    }

    public function onMessage(ConnectionInterface $from, $msg)
    {
        $data = json_decode($msg, true);
        if (!$data || !isset($data['action']) || !isset($data['id'])) {
            return;
        }

        $action = $data['action'];
        $id = $data['id'];
        $cmd = $data['cmd'] ?? ($data['data'] ?? null); // cmd for exec, data for terminal

        if (!in_array($action, ['start', 'stop', 'rm', 'logs', 'exec', 'restart', 'rebuild', 'terminal'])) {
            return;
        }

        echo "🕹 UI Command: $action container $id\n";

        // Dispatch signal outwards (to Bootstrap) for Docker logic isolation
        if (is_callable($this->onDockerCommand)) {
            ($this->onDockerCommand)($action, $id, $from, $cmd);
        }
    }

    public function onClose(ConnectionInterface $conn)
    {
        $this->clients->detach($conn);
        if (is_callable($this->onCloseConnection)) {
            ($this->onCloseConnection)($conn);
        }
    }

    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        $conn->close();
    }

    public function broadcast(array $data)
    {
        $this->lastState = $data;

        foreach ($this->clients as $client) {
            if (!$this->clients->offsetExists($client)) {
                $this->clients->offsetSet($client, []);
            }

            $lastClientState = $this->clients->offsetGet($client);

            if (empty($lastClientState)) {
                $client->send(json_encode([
                    'type' => 'full',
                    'data' => $data
                ]));
            } else {
                $delta = $this->calculateDelta($lastClientState, $data);
                if (!empty($delta)) {
                    $client->send(json_encode([
                        'type' => 'delta',
                        'data' => $delta
                    ]));
                }
            }

            $this->clients->offsetSet($client, $data);
        }
    }

    private function calculateDelta(array $oldState, array $newState): array
    {
        $delta = [];
        $oldMap = [];
        foreach ($oldState as $c) {
            $oldMap[$c['Id']] = $c;
        }

        $newIds = [];
        foreach ($newState as $c) {
            $id = $c['Id'];
            $newIds[] = $id;

            if (!isset($oldMap[$id])) {
                $delta[] = ['action' => 'add', 'data' => $c];
                continue;
            }

            $oldContainer = $oldMap[$id];
            $changes = [];

            foreach (['State', 'cpu_usage', 'net_speed', 'ram_stats'] as $field) {
                if ($c[$field] !== $oldContainer[$field]) {
                    $changes[$field] = $c[$field];
                }
            }

            if (!empty($changes)) {
                $changes['Id'] = $id;
                $delta[] = ['action' => 'update', 'data' => $changes];
            }
        }

        foreach ($oldMap as $id => $c) {
            if (!in_array($id, $newIds)) {
                $delta[] = ['action' => 'remove', 'id' => $id];
            }
        }

        return $delta;
    }
}
