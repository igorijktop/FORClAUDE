<?php
declare(strict_types=1);

namespace Onika;

use Onika\Repo\Users;

/** Admin and customer authentication (session based). */
final class Auth
{
    private static ?array $admin = null;
    private static bool $adminLoaded = false;
    private static ?array $user = null;
    private static bool $userLoaded = false;

    /* ================================================================ admin */
    /** @return array{id:int,username:string,must_change:bool}|null */
    public static function admin(): ?array
    {
        if (self::$adminLoaded) {
            return self::$admin;
        }
        self::$adminLoaded = true;
        $id = Session::get('admin_id');
        if (!$id) {
            return null;
        }
        $idle = max(5, (int) cfg('admin_idle_minutes', 480)) * 60;
        if (time() - (int) Session::get('admin_seen', 0) > $idle) {
            self::logoutAdmin();
            return null;
        }
        $row = Db::one('SELECT id, username, must_change FROM admins WHERE id = ?', [(int) $id]);
        if (!$row) {
            self::logoutAdmin();
            return null;
        }
        Session::set('admin_seen', time());
        return self::$admin = ['id' => (int) $row['id'], 'username' => $row['username'], 'must_change' => (bool) $row['must_change']];
    }

    /**
     * Guard for admin pages. Unauthenticated → login. Must-change-password → forced to settings
     * (unless $allowMustChange, used by the password form itself and logout).
     */
    public static function requireAdmin(bool $allowMustChange = false): array
    {
        $a = self::admin();
        if (!$a) {
            Halt::redirect(I18n::plainUrl('/admin/login'));
        }
        if ($a['must_change'] && !$allowMustChange) {
            Halt::redirect(I18n::plainUrl('/admin/password'));
        }
        return $a;
    }

    /** @return true|string true on success, otherwise an error code (wrong|locked). */
    public static function loginAdmin(string $username, string $password): bool|string
    {
        if (RateLimit::blocked('admin-login', 8)) {
            return 'locked';
        }
        $row = Db::one('SELECT * FROM admins WHERE username = ?', [$username]);
        // Always run one hash operation so timing does not reveal valid usernames.
        $hash = $row['password'] ?? password_hash('onika-dummy', PASSWORD_DEFAULT);
        $ok = $row !== null && password_verify($password, $hash);
        if (!$ok) {
            RateLimit::fail('admin-login', 15 * 60);
            return 'wrong';
        }
        RateLimit::clear('admin-login');
        if (password_needs_rehash($row['password'], PASSWORD_DEFAULT)) {
            Db::exec('UPDATE admins SET password = ? WHERE id = ?', [password_hash($password, PASSWORD_DEFAULT), $row['id']]);
        }
        Session::regenerate();
        Session::set('admin_id', (int) $row['id']);
        Session::set('admin_seen', time());
        Db::exec('UPDATE admins SET last_login = ? WHERE id = ?', [Text::now(), $row['id']]);
        self::$adminLoaded = false;
        return true;
    }

    public static function logoutAdmin(): void
    {
        Session::forget('admin_id');
        Session::forget('admin_seen');
        self::$admin = null;
        self::$adminLoaded = true;
    }

    public static function changeAdminPassword(int $id, string $current, string $next): bool|string
    {
        $row = Db::one('SELECT * FROM admins WHERE id = ?', [$id]);
        if (!$row || !password_verify($current, $row['password'])) {
            return 'wrong';
        }
        if (mb_strlen($next) < 8) {
            return 'short';
        }
        if ($next === (string) cfg('admin_default_pass', 'onika2024') || $next === $current) {
            return 'same';
        }
        Db::exec('UPDATE admins SET password = ?, must_change = 0 WHERE id = ?', [password_hash($next, PASSWORD_DEFAULT), $id]);
        self::$adminLoaded = false;
        Session::regenerate();
        return true;
    }

    /* ============================================================== customer */
    public static function user(): ?array
    {
        if (self::$userLoaded) {
            return self::$user;
        }
        self::$userLoaded = true;
        $id = Session::get('user_id');
        if ($id) {
            self::$user = Users::find((string) $id);
            if (!self::$user) {
                Session::forget('user_id');
            }
        }
        return self::$user;
    }

    public static function loginUser(string $id): void
    {
        Session::regenerate();
        Session::set('user_id', $id);
        self::$userLoaded = false;
    }

    public static function logoutUser(): void
    {
        Session::forget('user_id');
        self::$user = null;
        self::$userLoaded = true;
    }
}
