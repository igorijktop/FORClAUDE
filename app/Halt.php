<?php
declare(strict_types=1);

namespace Onika;

/** Thrown to abort request handling with a ready-made response (guards, redirects deep in code). */
final class Halt extends \RuntimeException
{
    public function __construct(public readonly Response $response)
    {
        parent::__construct('halt');
    }

    public static function redirect(string $to, int $status = 302): never
    {
        throw new self(Response::redirect($to, $status));
    }

    public static function with(Response $r): never
    {
        throw new self($r);
    }
}
