<?php

namespace Composphere\Core;

use React\Socket\ConnectionInterface;
use React\Socket\UnixConnector;
use React\Socket\FixedUriConnector;
use React\Http\Browser;
use React\Promise\PromiseInterface;

class DockerClient
{
    private Browser $browser;
    private UnixConnector $connector;
    private string $socketPath;

    public function __construct(UnixConnector $connector, string $socketPath = '/var/run/docker.sock')
    {
        $this->connector = $connector;
        $this->socketPath = $socketPath;
        $fixedConnector = new FixedUriConnector("unix://$socketPath", $connector);
        $this->browser = new Browser($fixedConnector);
    }

    /**
     * Returns a direct socket connection for streaming (exec, attach)
     */
    public function connectRaw(): PromiseInterface
    {
        return $this->connector->connect($this->socketPath);
    }

    /**
     * Performs a one-time HTTP request to Docker (e.g., fetching stats).
     * @return PromiseInterface
     */
    public function request(string $method, string $endpoint, string $body = ''): PromiseInterface
    {
        // Browser handles JSON decoding and Transfer-Encoding automatically
        $url = "http://localhost$endpoint";

        $headers = [];
        if ($body !== '') {
            $headers['Content-Type'] = 'application/json';
        }

        return $this->browser->request($method, $url, $headers, $body)->then(
            function (\Psr\Http\Message\ResponseInterface $response) {
                return (string) $response->getBody();
            }
        );
    }
}
