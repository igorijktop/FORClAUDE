<?php
declare(strict_types=1);

namespace Onika\Repo;

use Onika\Db;
use Onika\Text;

final class Subscribers
{
    public static function add(string $email): bool
    {
        $e = Text::lower(trim($email));
        if (!Text::isEmail($e)) {
            return false;
        }
        Db::exec('INSERT OR IGNORE INTO subscribers (email, at) VALUES (?, ?)', [$e, Text::now()]);
        return true;
    }

    public static function all(): array
    {
        return Db::all('SELECT email, at FROM subscribers ORDER BY at DESC');
    }

    public static function delete(string $email): void
    {
        Db::exec('DELETE FROM subscribers WHERE email = ?', [Text::lower(trim($email))]);
    }

    public static function csv(): string
    {
        $lines = ["email,subscribed_at"];
        foreach (self::all() as $s) {
            $email = (string) $s['email'];
            // Neutralise spreadsheet formula injection.
            if (preg_match('/^[=+\-@]/', $email)) {
                $email = "'" . $email;
            }
            $lines[] = '"' . str_replace('"', '""', $email) . '",' . ($s['at'] ?? '');
        }
        return "\u{FEFF}" . implode("\n", $lines) . "\n";
    }
}
