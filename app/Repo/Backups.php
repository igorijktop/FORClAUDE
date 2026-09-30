<?php
declare(strict_types=1);

namespace Onika\Repo;

use Onika\Db;

/** SQLite backups (VACUUM INTO → consistent snapshot) stored in data/backups. */
final class Backups
{
    public static function dir(): string
    {
        $d = DATA_DIR . '/backups';
        if (!is_dir($d)) {
            @mkdir($d, 0775, true);
        }
        return $d;
    }

    private static function valid(string $name): bool
    {
        return (bool) preg_match('/^onika-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}[A-Za-z0-9_-]*\.db$/', $name);
    }

    /** @return list<array{name:string,size:int,at:int}> newest first */
    public static function list(): array
    {
        $out = [];
        foreach (glob(self::dir() . '/onika-*.db') ?: [] as $f) {
            $n = basename($f);
            if (self::valid($n)) {
                $out[] = ['name' => $n, 'size' => (int) filesize($f), 'at' => (int) filemtime($f)];
            }
        }
        usort($out, static fn($a, $b) => strcmp($b['name'], $a['name']));
        return $out;
    }

    public static function create(string $label = 'manual'): string
    {
        $safe = trim(preg_replace('/[^A-Za-z0-9_-]+/', '_', $label) ?? '', '_');
        $name = 'onika-' . date('Y-m-d_H-i-s') . ($safe !== '' ? '-' . substr($safe, 0, 20) : '') . '.db';
        $path = self::dir() . '/' . $name;
        Db::pdo()->exec("VACUUM INTO '" . str_replace("'", "''", $path) . "'");
        foreach (array_slice(self::list(), (int) cfg('backups_keep', 20)) as $old) {
            @unlink(self::dir() . '/' . $old['name']);
        }
        return $name;
    }

    public static function path(string $name): ?string
    {
        $name = basename($name);
        $p = self::dir() . '/' . $name;
        return self::valid($name) && is_file($p) ? $p : null;
    }

    /** Replace the live database with a backup (a safety backup of the current state is made first). */
    public static function restore(string $name): bool
    {
        $src = self::path($name);
        if (!$src) {
            return false;
        }
        // A backup must be a real SQLite file with our schema.
        $probe = new \PDO('sqlite:' . $src);
        try {
            $probe->query('SELECT COUNT(*) FROM products')->fetchColumn();
            $probe->query('SELECT COUNT(*) FROM admins')->fetchColumn();
        } catch (\Throwable) {
            return false;
        }
        $probe = null;
        self::create('pre-restore');
        Db::pdo()->exec('PRAGMA wal_checkpoint(TRUNCATE)');
        Db::close();
        $live = Db::file();
        foreach (['-wal', '-shm'] as $ext) {
            if (is_file($live . $ext)) {
                @unlink($live . $ext);
            }
        }
        return copy($src, $live);
    }

    public static function delete(string $name): bool
    {
        $p = self::path($name);
        return $p !== null && @unlink($p);
    }
}
