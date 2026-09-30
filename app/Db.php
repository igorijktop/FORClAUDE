<?php
declare(strict_types=1);

namespace Onika;

use PDO;
use PDOStatement;

/** SQLite access (PDO) + tiny query helpers. */
final class Db
{
    private static ?PDO $pdo = null;

    public static function file(): string
    {
        return DATA_DIR . '/onika.db';
    }

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $fresh = !is_file(self::file());
            $pdo = new PDO('sqlite:' . self::file(), null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 8,
            ]);
            $pdo->exec('PRAGMA busy_timeout = 8000');
            $pdo->exec('PRAGMA foreign_keys = ON');
            $pdo->exec('PRAGMA journal_mode = WAL');
            $pdo->exec('PRAGMA synchronous = NORMAL');
            self::$pdo = $pdo;
            Schema::migrate($fresh);
        }
        return self::$pdo;
    }

    /** Close the connection (before replacing the DB file when restoring a backup). */
    public static function close(): void
    {
        self::$pdo = null;
    }

    public static function run(string $sql, array $params = []): PDOStatement
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        return $st;
    }

    /** @return list<array<string,mixed>> */
    public static function all(string $sql, array $params = []): array
    {
        return self::run($sql, $params)->fetchAll();
    }

    /** @return array<string,mixed>|null */
    public static function one(string $sql, array $params = []): ?array
    {
        $row = self::run($sql, $params)->fetch();
        return $row === false ? null : $row;
    }

    public static function val(string $sql, array $params = []): mixed
    {
        $v = self::run($sql, $params)->fetchColumn();
        return $v === false ? null : $v;
    }

    public static function exec(string $sql, array $params = []): int
    {
        return self::run($sql, $params)->rowCount();
    }

    public static function lastId(): string
    {
        return self::pdo()->lastInsertId();
    }

    /** Run $fn inside a transaction (re-entrant: nested calls join the outer one). */
    public static function tx(callable $fn): mixed
    {
        $pdo = self::pdo();
        if ($pdo->inTransaction()) {
            return $fn();
        }
        $pdo->beginTransaction();
        try {
            $r = $fn();
            $pdo->commit();
            return $r;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /** "?, ?, ?" placeholder list for IN (...) clauses. */
    public static function in(array $values): string
    {
        return implode(',', array_fill(0, count($values), '?'));
    }

    /** Escape a user string for use inside LIKE ... ESCAPE '\'. */
    public static function like(string $s): string
    {
        return '%' . addcslashes($s, '%_\\') . '%';
    }
}
