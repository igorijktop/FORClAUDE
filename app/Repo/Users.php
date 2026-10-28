<?php
declare(strict_types=1);

namespace Onika\Repo;

use Onika\Db;
use Onika\Text;

final class Users
{
    public const MIN_PASSWORD = 8;

    public static function hydrate(array $r): array
    {
        return [
            'id' => (string) $r['id'],
            'email' => (string) $r['email'],
            'name' => (string) ($r['name'] ?? ''),
            'phone' => (string) ($r['phone'] ?? ''),
            'address' => (string) ($r['address'] ?? ''),
            'createdAt' => $r['created_at'] ?? null,
        ];
    }

    public static function normalizeEmail(string $e): string
    {
        return Text::lower(trim($e));
    }

    public static function find(string $id): ?array
    {
        $r = Db::one('SELECT * FROM users WHERE id = ?', [$id]);
        return $r ? self::hydrate($r) : null;
    }

    public static function findByEmail(string $email): ?array
    {
        $r = Db::one('SELECT * FROM users WHERE email = ?', [self::normalizeEmail($email)]);
        return $r ? self::hydrate($r) : null;
    }

    /**
     * @param list<string> $guestOrders ids of the orders this browser placed as a guest (see linkGuestOrders())
     * @return array{ok:bool,user?:array,error?:string}
     */
    public static function create(string $email, string $password, string $name = '', string $phone = '', array $guestOrders = []): array
    {
        $email = self::normalizeEmail($email);
        if (!Text::isEmail($email)) {
            return ['ok' => false, 'error' => 'email'];
        }
        if (mb_strlen($password) < self::MIN_PASSWORD || mb_strlen($password) > 200) {
            return ['ok' => false, 'error' => 'password'];
        }
        if (Db::val('SELECT 1 FROM users WHERE email = ?', [$email])) {
            return ['ok' => false, 'error' => 'exists'];
        }
        $id = Text::uid('u');
        Db::exec(
            'INSERT INTO users (id,email,password,name,phone,address,created_at) VALUES (?,?,?,?,?,?,?)',
            [$id, $email, password_hash($password, PASSWORD_DEFAULT), Text::truncate($name, 100), Text::truncate($phone, 40), '', Text::now()]
        );
        self::linkGuestOrders($id, $email, $guestOrders, $phone);
        return ['ok' => true, 'user' => self::find($id)];
    }

    /**
     * Verify credentials; returns the user or null.
     * @param list<string> $guestOrders ids of the orders this browser placed as a guest (see linkGuestOrders())
     */
    public static function check(string $email, string $password, array $guestOrders = []): ?array
    {
        $r = Db::one('SELECT * FROM users WHERE email = ?', [self::normalizeEmail($email)]);
        $hash = $r['password'] ?? password_hash('onika-dummy', PASSWORD_DEFAULT);
        if (!$r || !password_verify($password, $hash)) {
            return null;
        }
        if (password_needs_rehash($r['password'], PASSWORD_DEFAULT)) {
            Db::exec('UPDATE users SET password = ? WHERE id = ?', [password_hash($password, PASSWORD_DEFAULT), $r['id']]);
        }
        self::linkGuestOrders((string) $r['id'], (string) $r['email'], $guestOrders, (string) ($r['phone'] ?? ''));
        return self::hydrate($r);
    }

    public static function updateProfile(string $id, string $name, string $phone, string $address = ''): void
    {
        Db::exec('UPDATE users SET name = ?, phone = ?, address = ?, updated_at = ? WHERE id = ?', [Text::truncate($name, 100), Text::truncate($phone, 40), Text::truncate($address, 200), Text::now(), $id]);
    }

    /** @return true|string true or error code (wrong|password) */
    public static function changePassword(string $id, string $current, string $next): bool|string
    {
        $r = Db::one('SELECT password FROM users WHERE id = ?', [$id]);
        if (!$r || !password_verify($current, $r['password'])) {
            return 'wrong';
        }
        if (mb_strlen($next) < self::MIN_PASSWORD || mb_strlen($next) > 200) {
            return 'password';
        }
        Db::exec('UPDATE users SET password = ?, updated_at = ? WHERE id = ?', [password_hash($next, PASSWORD_DEFAULT), Text::now(), $id]);
        return true;
    }

    /** Admin action: set a random temporary password and return it (shown once). */
    public static function resetPassword(string $id): ?string
    {
        if (!self::find($id)) {
            return null;
        }
        $alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
        $pw = '';
        for ($i = 0; $i < 10; $i++) {
            $pw .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        Db::exec('UPDATE users SET password = ?, updated_at = ? WHERE id = ?', [password_hash($pw, PASSWORD_DEFAULT), Text::now(), $id]);
        return $pw;
    }

    /**
     * Attach earlier guest orders placed with the same e-mail to this account. E-mail addresses are not
     * verified, so the e-mail alone is not enough (anyone could register "someone@…" and read that person's
     * orders: name, phone, address): the order must also have been placed from this browser ($guestOrders,
     * kept in the session), or carry the account's phone number as well.
     * @param list<string> $guestOrders
     */
    public static function linkGuestOrders(string $userId, string $email, array $guestOrders = [], string $phone = ''): void
    {
        $email = self::normalizeEmail($email);
        $ids = array_values(array_unique(array_filter($guestOrders, static fn($v) => is_string($v) && $v !== '' && strlen($v) <= 32)));
        $ids = array_slice($ids, -50);
        $phone = trim($phone);
        if ($email === '' || (!$ids && $phone === '')) {
            return;
        }
        $own = $ids ? 'id IN (' . Db::in($ids) . ')' : '0';
        try {
            Db::exec(
                "UPDATE orders SET user_id = ? WHERE user_id IS NULL AND lower(json_extract(customer, '$.email')) = ?"
                . " AND ($own OR (? <> '' AND json_extract(customer, '$.phone') = ?))",
                array_merge([$userId, $email], $ids, [$phone, $phone])
            );
        } catch (\PDOException) {
            // SQLite build without JSON functions: match in PHP instead.
            foreach (Db::all('SELECT id, customer FROM orders WHERE user_id IS NULL') as $r) {
                $c = Text::jsonDecode($r['customer'], []);
                if (self::normalizeEmail((string) ($c['email'] ?? '')) === $email
                    && (in_array((string) $r['id'], $ids, true) || ($phone !== '' && (string) ($c['phone'] ?? '') === $phone))) {
                    Db::exec('UPDATE orders SET user_id = ? WHERE id = ?', [$userId, $r['id']]);
                }
            }
        }
    }

    /**
     * Admin: all registered clients with order stats.
     * @return list<array>
     */
    public static function clients(): array
    {
        $rows = Db::all(
            "SELECT u.*,
                    (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders,
                    (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.user_id = u.id AND o.status <> 'cancelled') AS spent,
                    (SELECT MAX(created_at) FROM orders o WHERE o.user_id = u.id) AS last_at
             FROM users u ORDER BY COALESCE(last_at, u.created_at) DESC"
        );
        return array_map(static fn(array $r) => self::hydrate($r) + [
            'orders' => (int) $r['orders'], 'spent' => (float) $r['spent'], 'lastAt' => $r['last_at'],
        ], $rows);
    }

    public static function delete(string $id): bool
    {
        return Db::exec('DELETE FROM users WHERE id = ?', [$id]) > 0;
    }
}
