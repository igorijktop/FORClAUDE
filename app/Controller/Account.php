<?php
declare(strict_types=1);

namespace Onika\Controller;

use Onika\Auth;
use Onika\Halt;
use Onika\RateLimit;
use Onika\Repo\Orders;
use Onika\Repo\Users;
use Onika\Request;
use Onika\Response;
use Onika\Session;
use Onika\Text;
use Onika\View;

final class Account
{
    private static function requireUser(): array
    {
        $u = Auth::user();
        if (!$u) {
            Halt::redirect(url('/account/login'));
        }
        return $u;
    }

    private static function meta(string $title): array
    {
        return ['title' => $title, 'active' => 'account', 'page' => 'account', 'noindex' => true, 'bodyClass' => 'is-account'];
    }

    public static function dashboard(array $p): Response
    {
        $u = self::requireUser();
        return View::shop('shop/account', ['user' => $u, 'orders' => Orders::forUser($u['id']), 'flash' => Session::pullFlash()], self::meta(t('account.title')));
    }

    public static function loginForm(array $p): Response
    {
        if (Auth::user()) {
            return Response::redirect(url('/account'));
        }
        return View::shop('shop/account_login', ['flash' => Session::pullFlash(), 'email' => (string) Session::get('login_email', '')], self::meta(t('account.loginTitle')));
    }

    public static function login(array $p): Response
    {
        Session::requireCsrf();
        $email = mb_substr(Request::str('email'), 0, 190);
        Session::set('login_email', $email);
        if (RateLimit::blocked('user-login', 10)) {
            Session::flash('err', t('account.errLocked'));
            return Response::redirect(url('/account/login'));
        }
        $user = Users::check($email, Request::text('password'));
        if (!$user) {
            RateLimit::fail('user-login', 15 * 60);
            Session::flash('err', t('account.errWrong'));
            return Response::redirect(url('/account/login'));
        }
        RateLimit::clear('user-login');
        Session::forget('login_email');
        Auth::loginUser($user['id']);
        return Response::redirect(url('/account'));
    }

    public static function registerForm(array $p): Response
    {
        if (Auth::user()) {
            return Response::redirect(url('/account'));
        }
        $old = (array) Session::get('register_old', []);
        Session::forget('register_old');
        return View::shop('shop/account_register', ['flash' => Session::pullFlash(), 'old' => $old], self::meta(t('account.registerTitle')));
    }

    public static function register(array $p): Response
    {
        Session::requireCsrf();
        if (!RateLimit::hit('register', 10, 3600)) {
            Session::flash('err', t('account.errLocked'));
            return Response::redirect(url('/account/register'));
        }
        $email = mb_substr(Request::str('email'), 0, 190);
        $name = Text::line(Request::str('name'), 100);
        $phone = Text::line(Request::str('phone'), 40);
        Session::set('register_old', ['email' => $email, 'name' => $name, 'phone' => $phone]);
        $pass = Request::text('password');
        if ($email === '' || $pass === '') {
            Session::flash('err', t('account.errFields'));
            return Response::redirect(url('/account/register'));
        }
        if ($phone !== '') {
            $norm = Text::phone($phone);
            if ($norm === null) {
                Session::flash('err', t('checkout.errPhone'));
                return Response::redirect(url('/account/register'));
            }
            $phone = $norm;
        }
        if ($pass !== Request::text('password2')) {
            Session::flash('err', t('account.errPassword2'));
            return Response::redirect(url('/account/register'));
        }
        $r = Users::create($email, $pass, $name, $phone);
        if (!$r['ok']) {
            $map = ['email' => 'account.errEmail', 'password' => 'account.errPassword', 'exists' => 'account.errExists'];
            Session::flash('err', t($map[$r['error']] ?? 'account.errFields'));
            return Response::redirect(url('/account/register'));
        }
        Session::forget('register_old');
        Auth::loginUser($r['user']['id']);
        Session::flash('ok', t('account.registered'));
        return Response::redirect(url('/account'));
    }

    public static function logout(array $p): Response
    {
        Session::requireCsrf();
        Auth::logoutUser();
        Session::flash('ok', t('account.loggedOut'));
        return Response::redirect(url('/account/login'));
    }

    /** Old bookmarks / links to /account/logout: show the login page rather than an error. */
    public static function logoutGet(array $p): Response
    {
        return Response::redirect(url(Auth::user() ? '/account' : '/account/login'));
    }

    public static function profile(array $p): Response
    {
        $u = self::requireUser();
        Session::requireCsrf();
        $phone = Text::line(Request::str('phone'), 40);
        if ($phone !== '') {
            $norm = Text::phone($phone);
            if ($norm === null) {
                Session::flash('err', t('checkout.errPhone'));
                return Response::redirect(url('/account'));
            }
            $phone = $norm;
        }
        Users::updateProfile($u['id'], Text::line(Request::str('name'), 100), $phone, Text::line(Request::str('address'), 200));
        Session::flash('ok', t('account.saved'));
        return Response::redirect(url('/account'));
    }

    public static function password(array $p): Response
    {
        $u = self::requireUser();
        Session::requireCsrf();
        // Same brute-force protection as the login form (the current password is a secret too).
        if (RateLimit::blocked('user-password', 10)) {
            Session::flash('err', t('account.errLocked'));
            return Response::redirect(url('/account'));
        }
        $r = Users::changePassword($u['id'], Request::text('current'), Request::text('next'));
        if ($r === 'wrong') {
            RateLimit::fail('user-password', 15 * 60);
        }
        if ($r === true) {
            Session::regenerate();
            Session::flash('ok', t('account.passChanged'));
        } else {
            Session::flash('err', t($r === 'wrong' ? 'account.errWrongPass' : 'account.errPassword'));
        }
        return Response::redirect(url('/account'));
    }
}
