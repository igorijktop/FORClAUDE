<?php
declare(strict_types=1);

namespace Onika\Repo;

use Onika\Db;
use Onika\I18n;
use Onika\Text;

/** Messages sent through the public contact form. */
final class Messages
{
    public static function add(string $name, string $contact, string $message): void
    {
        Db::exec(
            'INSERT INTO messages (name, contact, message, lang, is_read, created_at) VALUES (?,?,?,?,0,?)',
            [Text::truncate($name, 100), Text::truncate($contact, 150), mb_substr(Text::clean($message), 0, 3000), I18n::lang(), Text::now()]
        );
    }

    public static function all(): array
    {
        return Db::all('SELECT * FROM messages ORDER BY is_read ASC, created_at DESC');
    }

    public static function unread(): int
    {
        return (int) Db::val('SELECT COUNT(*) FROM messages WHERE is_read = 0');
    }

    public static function setRead(int $id, bool $read): void
    {
        Db::exec('UPDATE messages SET is_read = ? WHERE id = ?', [$read ? 1 : 0, $id]);
    }

    public static function delete(int $id): void
    {
        Db::exec('DELETE FROM messages WHERE id = ?', [$id]);
    }
}
