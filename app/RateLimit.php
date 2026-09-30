<?php
declare(strict_types=1);

namespace Onika;

/** Fixed-window rate limiting stored in SQLite (per bucket + client IP). */
final class RateLimit
{
    private static function key(string $bucket): string
    {
        return $bucket . '|' . Request::ip();
    }

    /** Count a hit; returns false when the limit for the current window is exceeded. */
    public static function hit(string $bucket, int $max, int $windowSeconds): bool
    {
        $k = self::key($bucket);
        $now = time();
        self::gc($now);
        $row = Db::one('SELECT hits, reset_at FROM rate_limits WHERE k = ?', [$k]);
        if (!$row || (int) $row['reset_at'] <= $now) {
            Db::exec('INSERT OR REPLACE INTO rate_limits (k, hits, reset_at) VALUES (?,?,?)', [$k, 1, $now + $windowSeconds]);
            return true;
        }
        Db::exec('UPDATE rate_limits SET hits = hits + 1 WHERE k = ?', [$k]);
        return ((int) $row['hits'] + 1) <= $max;
    }

    /** Is the bucket already over the limit (without counting)? */
    public static function blocked(string $bucket, int $max): bool
    {
        $row = Db::one('SELECT hits, reset_at FROM rate_limits WHERE k = ?', [self::key($bucket)]);
        return $row && (int) $row['reset_at'] > time() && (int) $row['hits'] >= $max;
    }

    public static function fail(string $bucket, int $windowSeconds): void
    {
        self::hit($bucket, PHP_INT_MAX, $windowSeconds);
    }

    public static function clear(string $bucket): void
    {
        Db::exec('DELETE FROM rate_limits WHERE k = ?', [self::key($bucket)]);
    }

    /** Guard for JSON endpoints: halts with HTTP 429 when exceeded. */
    public static function guard(string $bucket, int $max, int $windowSeconds): void
    {
        if (!self::hit($bucket, $max, $windowSeconds)) {
            Halt::with(Response::json(['ok' => false, 'error' => 'rate_limited'], 429)->header('Retry-After', (string) $windowSeconds));
        }
    }

    private static function gc(int $now): void
    {
        if (random_int(1, 50) === 1) {
            Db::exec('DELETE FROM rate_limits WHERE reset_at < ?', [$now]);
        }
    }
}
