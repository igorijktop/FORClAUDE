<?php
declare(strict_types=1);

namespace Onika\Controller;

use Onika\Auth;
use Onika\Db;
use Onika\Halt;
use Onika\I18n;
use Onika\Media;
use Onika\RateLimit;
use Onika\Repo\Backups;
use Onika\Repo\Brands;
use Onika\Repo\Categories;
use Onika\Repo\Messages;
use Onika\Repo\Orders;
use Onika\Repo\Products;
use Onika\Repo\Settings;
use Onika\Repo\Stats;
use Onika\Repo\Subscribers;
use Onika\Repo\Users;
use Onika\Request;
use Onika\Response;
use Onika\Session;
use Onika\Text;
use Onika\View;

/** Admin panel. All pages require an authenticated admin who has changed the default password. */
final class Admin
{
    private static function guard(): array
    {
        return Auth::requireAdmin();
    }

    /** POST actions: authenticated + valid CSRF token. */
    private static function guardPost(): array
    {
        $a = Auth::requireAdmin();
        Session::requireCsrf();
        return $a;
    }

    private static function back(string $path, array $query = []): Response
    {
        $qs = query_string($query);
        return Response::redirect(purl($path) . ($qs !== '' ? '?' . $qs : ''));
    }

    /** Redirect to the page the user came from (same-origin only), else $fallback. */
    private static function backOr(string $fallback): Response
    {
        $ref = (string) ($_SERVER['HTTP_REFERER'] ?? '');
        $host = parse_url($ref, PHP_URL_HOST);
        if ($ref !== '' && $host === parse_url('http://' . Request::host(), PHP_URL_HOST)) {
            return Response::redirect($ref);
        }
        return Response::redirect(purl($fallback));
    }

    /** Keep what was typed + the field errors for exactly one redirect, so the form can show them again. */
    private static function keepForm(string $form, array $old, array $errors): void
    {
        Session::set('form_state', ['form' => $form, 'old' => $old, 'errors' => $errors]);
    }

    /** @return array{old:array,errors:array<string,string>} the kept state of $form (cleared after reading) */
    private static function pullForm(string $form): array
    {
        $s = Session::get('form_state');
        Session::forget('form_state');
        if (!is_array($s) || ($s['form'] ?? null) !== $form) {
            return ['old' => [], 'errors' => []];
        }
        return ['old' => (array) ($s['old'] ?? []), 'errors' => (array) ($s['errors'] ?? [])];
    }

    /** Remember the filtered list URL (search, filters, sort, page) so "back" links and redirects return to it. */
    private static function rememberList(string $key, string $path, array $query): void
    {
        $qs = query_string($query);
        Session::set('list_' . $key, purl($path) . ($qs !== '' ? '?' . $qs : ''));
    }

    public static function listUrl(string $key, string $path): string
    {
        $u = Session::get('list_' . $key);
        return is_string($u) && $u !== '' ? $u : purl($path);
    }

    /* ===================================================================== auth */
    public static function loginForm(array $p): Response
    {
        if (Auth::admin()) {
            return Response::redirect(purl('/admin'));
        }
        return Response::html(View::partial('admin/login', ['flash' => Session::pullFlash()]))->noCache();
    }

    public static function login(array $p): Response
    {
        Session::requireCsrf();
        $r = Auth::loginAdmin(Request::str('user'), (string) Request::input('password', ''));
        if ($r !== true) {
            Session::flash('err', t($r === 'locked' ? 'admin.locked' : 'admin.wrongPass'));
            return Response::redirect(purl('/admin/login'));
        }
        return Response::redirect(purl('/admin'));
    }

    public static function logout(array $p): Response
    {
        Session::requireCsrf();
        Auth::logoutAdmin();
        return Response::redirect(purl('/admin/login'));
    }

    public static function passwordForm(array $p): Response
    {
        $a = Auth::requireAdmin(true);
        return View::admin('password', ['forced' => $a['must_change']], ['title' => t('admin.changePass'), 'active' => 'settings']);
    }

    public static function password(array $p): Response
    {
        $a = Auth::requireAdmin(true);
        Session::requireCsrf();
        $next = (string) Request::input('next', '');
        if ($next !== (string) Request::input('next2', $next)) {
            Session::flash('err', t('admin.passMismatch'));
            return self::back('/admin/password');
        }
        $r = Auth::changeAdminPassword($a['id'], (string) Request::input('current', ''), $next);
        if ($r !== true) {
            $map = ['wrong' => 'admin.wrongCurrent', 'short' => 'admin.passShort', 'same' => 'admin.passSame'];
            Session::flash('err', t($map[$r] ?? 'admin.wrongCurrent'));
            return self::back('/admin/password');
        }
        Session::flash('ok', t('admin.passChanged'));
        return self::back('/admin');
    }

    /* ================================================================ dashboard */
    public static function dashboard(array $p): Response
    {
        self::guard();
        return View::admin('dashboard', ['s' => Stats::dashboard()], ['title' => t('admin.dashboard'), 'active' => 'dashboard']);
    }

    /* ================================================================== products */
    public static function products(array $p): Response
    {
        self::guard();
        $q = Request::queryAll();
        $f = [
            'q' => trim((string) ($q['q'] ?? '')),
            'category' => isset($q['category']) && $q['category'] !== '' ? [(string) $q['category']] : [],
            'brand' => isset($q['brand']) && $q['brand'] !== '' ? [(string) $q['brand']] : [],
            'status' => (string) ($q['status'] ?? ''),
            'sort' => (string) ($q['sort'] ?? 'new'),
            'page' => (int) ($q['page'] ?? 1),
            'per_page' => (int) cfg('admin_per_page', 30),
            'include_inactive' => 1,
        ];
        $result = Products::search($f);
        $query = ['q' => $f['q'], 'category' => (string) ($q['category'] ?? ''), 'brand' => (string) ($q['brand'] ?? ''), 'status' => $f['status'], 'sort' => $f['sort'] !== 'new' ? $f['sort'] : ''];
        self::rememberList('products', '/admin/products', $query + ['page' => $result['page'] > 1 ? $result['page'] : '']);
        return View::admin('products', [
            'f' => $f, 'result' => $result, 'categories' => Categories::all(), 'brands' => Brands::all(), 'query' => $query,
        ], ['title' => t('admin.products'), 'active' => 'products']);
    }

    public static function productNew(array $p): Response
    {
        self::guard();
        $st = self::pullForm('product:');
        return View::admin('product_form', ['product' => null, 'categories' => Categories::all(), 'brands' => Brands::all(), 'old' => $st['old'], 'errors' => $st['errors'], 'back' => self::listUrl('products', '/admin/products')], ['title' => t('admin.newProduct'), 'active' => 'products']);
    }

    public static function productEdit(array $p): Response
    {
        self::guard();
        $prod = Products::find($p['id']);
        if (!$prod) {
            Session::flash('err', t('admin.notFoundItems'));
            return self::back('/admin/products');
        }
        $st = self::pullForm('product:' . $prod['id']);
        return View::admin('product_form', ['product' => $prod, 'categories' => Categories::all(), 'brands' => Brands::all(), 'old' => $st['old'], 'errors' => $st['errors'], 'back' => self::listUrl('products', '/admin/products')], ['title' => t('admin.editProduct'), 'active' => 'products']);
    }

    public static function productSave(array $p): Response
    {
        self::guardPost();
        $id = Request::str('id');
        $in = [
            'name' => Request::str('name'),
            'price' => Request::str('price'),
            'oldPrice' => Request::str('oldPrice'),
            'category' => Request::str('category'),
            'brand' => Request::str('brandNew') !== '' ? Request::str('brandNew') : Request::str('brand'),
            'description' => (string) Request::input('description', ''),
            'sku' => Request::str('sku'),
            'sizes' => Request::str('sizes'),
            'slug' => Request::str('slug'),
            'stock' => Request::str('stock'),
            'featured' => Request::input('featured') !== null,
            'active' => Request::input('active') !== null,
            'images' => array_values(array_filter(array_map('trim', array_map('strval', (array) Request::input('images', []))), 'strlen')),
            'translations' => [
                'ru' => ['name' => Request::str('nameRu'), 'description' => (string) Request::input('descRu', '')],
                'en' => ['name' => Request::str('nameEn'), 'description' => (string) Request::input('descEn', '')],
            ],
        ];
        // Extra image URLs typed into the textarea.
        foreach (preg_split('/[\r\n]+/', (string) Request::input('imageUrls', '')) ?: [] as $u) {
            $u = trim($u);
            if ($u !== '') {
                $in['images'][] = $u;
            }
        }
        // Non-JS fallback: files posted together with the form.
        foreach (self::uploadedFiles('imageFiles') as $f) {
            if (($saved = Media::saveUpload($f)) !== null) {
                $in['images'][] = $saved;
            }
        }
        $errors = [];
        if (Request::str('slug') !== '' && !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Request::str('slug'))) {
            $errors['slug'] = 'invalid';
        }
        $r = $errors ? ['ok' => false, 'errors' => $errors] : Products::save($in, $id !== '' ? $id : null);
        if (!$r['ok']) {
            if (($r['errors']['id'] ?? '') === 'not_found') {
                Session::flash('err', t('admin.notFoundItems'));
                return self::back('/admin/products');
            }
            // Keep everything that was typed (and the images already uploaded) so nothing has to be entered twice.
            self::keepForm('product:' . $id, [
                'name' => $in['name'], 'price' => $in['price'], 'oldPrice' => $in['oldPrice'], 'category' => $in['category'],
                'brand' => Request::str('brand'), 'brandNew' => Request::str('brandNew'), 'description' => $in['description'],
                'sku' => $in['sku'], 'sizes' => $in['sizes'], 'slug' => $in['slug'], 'stock' => $in['stock'],
                'featured' => $in['featured'], 'active' => $in['active'], 'images' => array_values(array_unique($in['images'])),
                'nameRu' => $in['translations']['ru']['name'], 'descRu' => $in['translations']['ru']['description'],
                'nameEn' => $in['translations']['en']['name'], 'descEn' => $in['translations']['en']['description'],
            ], array_map('strval', (array) ($r['errors'] ?? [])));
            Session::flash('err', t('admin.formInvalid'));
            return self::back($id !== '' ? '/admin/products/' . rawurlencode($id) . '/edit' : '/admin/products/new');
        }
        Session::flash('ok', t('admin.saved'));
        return self::back('/admin/products/' . rawurlencode($r['product']['id']) . '/edit');
    }

    public static function productToggle(array $p): Response
    {
        self::guardPost();
        $prod = Products::find($p['id']);
        if ($prod) {
            Products::setActive($prod['id'], !$prod['active']);
        }
        return self::backOr('/admin/products');
    }

    public static function productStock(array $p): Response
    {
        self::guardPost();
        $prod = Products::find($p['id']);
        if ($prod) {
            // Inline edit in the product list sends the exact number; a request without "qty" just flips 0 ↔ 1.
            $raw = Request::input('qty');
            $qty = is_scalar($raw) ? trim((string) $raw) : '';
            if ($raw === null) {
                Products::setStock($prod['id'], $prod['inStock'] ? 0 : 1);
            } elseif ($qty !== '' && ctype_digit($qty) && (int) $qty <= Products::MAX_STOCK) {
                Products::setStock($prod['id'], (int) $qty);
                Session::flash('ok', t('admin.stockSaved', ['name' => I18n::productName($prod), 'n' => (int) $qty]));
            } else {
                // Empty, negative, fractional or too big: never guess — keep the old number and say why.
                Session::flash('err', t('admin.stockInvalid', ['max' => Products::MAX_STOCK]));
            }
        }
        return self::backOr('/admin/products');
    }

    public static function productDelete(array $p): Response
    {
        self::guardPost();
        Products::delete($p['id']);
        Session::flash('ok', t('admin.deleted'));
        // From the list: back to the same filtered page; from the edit form: to the remembered list.
        $ref = (string) ($_SERVER['HTTP_REFERER'] ?? '');
        return str_contains($ref, '/edit') ? Response::redirect(self::listUrl('products', '/admin/products')) : self::backOr('/admin/products');
    }

    /** Normalise a multi-file $_FILES entry into a list of single-file arrays. */
    private static function uploadedFiles(string $field): array
    {
        $f = $_FILES[$field] ?? null;
        if (!$f) {
            return [];
        }
        if (!is_array($f['name'])) {
            return [$f];
        }
        $out = [];
        $max = (int) cfg('upload_max_files', 12);
        foreach ($f['name'] as $i => $name) {
            if (count($out) >= $max) {
                break;
            }
            $out[] = ['name' => $name, 'type' => $f['type'][$i], 'tmp_name' => $f['tmp_name'][$i], 'error' => $f['error'][$i], 'size' => $f['size'][$i]];
        }
        return $out;
    }

    /** POST /admin/upload (multipart, field "files[]") → JSON list of stored images. */
    public static function upload(array $p): Response
    {
        self::guardPost();
        $out = [];
        $rejected = [];
        $maxBytes = (int) cfg('upload_max_bytes', 8 * 1024 * 1024);
        $mb = (int) round($maxBytes / 1048576);
        $sent = isset($_FILES['files']['name']) ? count((array) $_FILES['files']['name']) : 0;
        foreach (self::uploadedFiles('files') as $f) {
            $name = Text::truncate(basename((string) $f['name']), 80);
            $err = (int) $f['error'];
            if (in_array($err, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || ($err === UPLOAD_ERR_OK && (int) $f['size'] > $maxBytes)) {
                $rejected[] = t('admin.uploadTooBig', ['name' => $name, 'mb' => $mb]);
                continue;
            }
            if ($err === UPLOAD_ERR_OK && is_file((string) $f['tmp_name'])) {
                $mime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file((string) $f['tmp_name']);
                if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
                    $rejected[] = t('admin.uploadBadType', ['name' => $name]);
                    continue;
                }
            }
            $path = $err === UPLOAD_ERR_OK ? Media::saveUpload($f) : null;
            if ($path !== null) {
                $out[] = ['path' => $path, 'url' => Media::url($path, 300)];
            } else {
                $rejected[] = t('admin.uploadBroken', ['name' => $name]);
            }
        }
        $max = (int) cfg('upload_max_files', 12);
        if ($sent > $max) {
            $rejected[] = t('admin.uploadTooMany', ['n' => $max]);
        }
        if (!$out) {
            return Response::json(['ok' => false, 'error' => $rejected ? implode(' ', $rejected) : t('admin.uploadFailed'), 'rejected' => $rejected], 422);
        }
        return Response::json(['ok' => true, 'files' => $out, 'rejected' => $rejected]);
    }

    /** POST /admin/api/translate — machine-translate UK → RU/EN (best effort, Google Translate web endpoint). */
    public static function translate(array $p): Response
    {
        self::guardPost();
        RateLimit::guard('translate', 60, 600);
        $name = Text::truncate((string) Request::input('name', ''), 300);
        $desc = mb_substr(trim((string) Request::input('description', '')), 0, 1500);
        if ($name === '' && $desc === '') {
            return Response::json(['ok' => false, 'error' => 'empty'], 422);
        }
        $out = [];
        foreach (['ru', 'en'] as $tl) {
            $translated = self::gtx($name . "\n" . $desc, $tl);
            if ($translated === null) {
                return Response::json(['ok' => false, 'error' => 'failed'], 502);
            }
            $nl = strpos($translated, "\n");
            $out[$tl] = [
                'name' => trim($nl === false ? $translated : substr($translated, 0, $nl)),
                'description' => trim($nl === false ? '' : substr($translated, $nl + 1)),
            ];
        }
        return Response::json(['ok' => true, 'translations' => $out]);
    }

    private static function gtx(string $text, string $tl): ?string
    {
        $url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=uk&tl=' . $tl . '&dt=t&q=' . rawurlencode($text);
        $body = null;
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; OnikaAdmin/2.0)', CURLOPT_FOLLOWLOCATION => false]);
            $res = curl_exec($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            curl_close($ch);
            $body = ($res !== false && $code === 200) ? (string) $res : null;
        } elseif (ini_get('allow_url_fopen')) {
            $ctx = stream_context_create(['http' => ['timeout' => 8, 'header' => "User-Agent: Mozilla/5.0 (compatible; OnikaAdmin/2.0)\r\n"]]);
            $res = @file_get_contents($url, false, $ctx);
            $body = $res === false ? null : $res;
        }
        if ($body === null) {
            return null;
        }
        $j = json_decode($body, true);
        if (!is_array($j) || !isset($j[0]) || !is_array($j[0])) {
            return null;
        }
        $s = '';
        foreach ($j[0] as $part) {
            $s .= (string) ($part[0] ?? '');
        }
        return $s;
    }

    /* ==================================================================== trash */
    public static function trash(array $p): Response
    {
        self::guard();
        return View::admin('trash', ['items' => Products::trash()], ['title' => t('admin.trash'), 'active' => 'trash']);
    }

    public static function trashRestore(array $p): Response
    {
        self::guardPost();
        $ok = Products::restore($p['id']);
        Session::flash($ok ? 'ok' : 'err', $ok ? t('admin.restoredMsg') : t('admin.formInvalid'));
        return self::back('/admin/trash');
    }

    public static function trashPurge(array $p): Response
    {
        self::guardPost();
        Products::purge($p['id']);
        Session::flash('ok', t('admin.purgedMsg'));
        return self::back('/admin/trash');
    }

    public static function trashEmpty(array $p): Response
    {
        self::guardPost();
        Products::emptyTrash();
        Session::flash('ok', t('admin.purgedMsg'));
        return self::back('/admin/trash');
    }

    /* ================================================================ categories */
    public static function categories(array $p): Response
    {
        self::guard();
        $st = self::pullForm('category');
        return View::admin('categories', ['items' => Categories::all(), 'old' => $st['old'], 'errors' => $st['errors']], ['title' => t('admin.categories'), 'active' => 'categories']);
    }

    public static function categorySave(array $p): Response
    {
        self::guardPost();
        $in = [
            'id' => Request::str('id'), 'name' => Request::str('name'), 'description' => (string) Request::input('description', ''),
            'color' => Request::str('color'), 'nameRu' => Request::str('nameRu'), 'nameEn' => Request::str('nameEn'),
            'descRu' => (string) Request::input('descRu', ''), 'descEn' => (string) Request::input('descEn', ''),
        ];
        $r = Categories::save([
            'id' => $in['id'], 'name' => $in['name'], 'description' => $in['description'], 'color' => $in['color'],
            'name_ru' => $in['nameRu'], 'name_en' => $in['nameEn'], 'desc_ru' => $in['descRu'], 'desc_en' => $in['descEn'],
        ]);
        if (!$r['ok']) {
            self::keepForm('category', $in, ['name' => ($r['error'] ?? '') === 'exists' ? 'exists' : 'required']);
        }
        Session::flash($r['ok'] ? 'ok' : 'err', $r['ok'] ? t('admin.saved') : t(($r['error'] ?? '') === 'exists' ? 'admin.nameExists' : 'admin.formInvalid'));
        return self::back('/admin/categories');
    }

    public static function categoryToggle(array $p): Response
    {
        self::guardPost();
        Categories::toggle($p['id']);
        return self::back('/admin/categories');
    }

    public static function categoryDelete(array $p): Response
    {
        self::guardPost();
        $ok = Categories::delete($p['id']);
        Session::flash($ok ? 'ok' : 'err', $ok ? t('admin.deleted') : t('admin.catNotEmpty'));
        return self::back('/admin/categories');
    }

    /* ===================================================================== brands */
    public static function brands(array $p): Response
    {
        self::guard();
        $st = self::pullForm('brand');
        return View::admin('brands', ['items' => Brands::all(), 'old' => $st['old'], 'errors' => $st['errors']], ['title' => t('admin.brands'), 'active' => 'brands']);
    }

    public static function brandSave(array $p): Response
    {
        self::guardPost();
        $in = [
            'id' => Request::str('id'), 'name' => Request::str('name'), 'description' => (string) Request::input('description', ''),
            'nameRu' => Request::str('nameRu'), 'nameEn' => Request::str('nameEn'),
            'descRu' => (string) Request::input('descRu', ''), 'descEn' => (string) Request::input('descEn', ''),
        ];
        $r = Brands::save([
            'id' => $in['id'], 'name' => $in['name'], 'description' => $in['description'],
            'name_ru' => $in['nameRu'], 'name_en' => $in['nameEn'], 'desc_ru' => $in['descRu'], 'desc_en' => $in['descEn'],
        ]);
        if (!$r['ok']) {
            self::keepForm('brand', $in, ['name' => ($r['error'] ?? '') === 'exists' ? 'exists' : 'required']);
        }
        Session::flash($r['ok'] ? 'ok' : 'err', $r['ok'] ? t('admin.saved') : t(($r['error'] ?? '') === 'exists' ? 'admin.nameExists' : 'admin.formInvalid'));
        return self::back('/admin/brands');
    }

    public static function brandToggle(array $p): Response
    {
        self::guardPost();
        Brands::toggle($p['id']);
        return self::back('/admin/brands');
    }

    public static function brandDelete(array $p): Response
    {
        self::guardPost();
        $ok = Brands::delete($p['id']);
        Session::flash($ok ? 'ok' : 'err', $ok ? t('admin.deleted') : t('admin.catNotEmpty'));
        return self::back('/admin/brands');
    }

    /* ==================================================================== orders */
    public static function orders(array $p): Response
    {
        self::guard();
        $q = Request::queryAll();
        $f = [
            'status' => (string) ($q['status'] ?? ''), 'q' => trim((string) ($q['q'] ?? '')), 'sort' => (string) ($q['sort'] ?? 'new'),
            'account' => (string) ($q['account'] ?? ''), 'user' => (string) ($q['user'] ?? ''), 'page' => (int) ($q['page'] ?? 1), 'per_page' => 20,
        ];
        $result = Orders::search($f);
        self::rememberList('orders', '/admin/orders', ['status' => $f['status'], 'q' => $f['q'], 'sort' => $f['sort'] !== 'new' ? $f['sort'] : '', 'account' => $f['account'], 'user' => $f['user'], 'page' => $result['page'] > 1 ? $result['page'] : '']);
        $users = [];
        foreach ($result['items'] as $o) {
            if ($o['userId'] && !isset($users[$o['userId']])) {
                $users[$o['userId']] = Users::find($o['userId']);
            }
        }
        return View::admin('orders', [
            'f' => $f, 'result' => $result, 'counts' => Orders::countsByStatus(), 'users' => $users, 'clients' => Users::clients(),
        ], ['title' => t('admin.orders'), 'active' => 'orders']);
    }

    public static function orderView(array $p): Response
    {
        self::guard();
        $o = Orders::find($p['id']);
        if (!$o) {
            return Response::notFound();
        }
        return View::admin('order', ['o' => $o, 'client' => $o['userId'] ? Users::find($o['userId']) : null, 'back' => self::listUrl('orders', '/admin/orders')], ['title' => t('account.orderNo', ['id' => $o['id']]), 'active' => 'orders']);
    }

    public static function orderStatus(array $p): Response
    {
        self::guardPost();
        $ok = Orders::updateStatus($p['id'], Request::str('status'), Request::str('note'));
        Session::flash($ok ? 'ok' : 'err', $ok ? t('admin.saved') : t('admin.formInvalid'));
        return self::backOr('/admin/orders');
    }

    public static function orderDelete(array $p): Response
    {
        self::guardPost();
        Orders::delete($p['id']);
        Session::flash('ok', t('admin.deleted'));
        return Response::redirect(self::listUrl('orders', '/admin/orders'));
    }

    /* =================================================================== clients */
    public static function clients(array $p): Response
    {
        self::guard();
        $guests = Orders::search(['account' => 'no', 'per_page' => 100]);
        return View::admin('clients', ['clients' => Users::clients(), 'guestOrders' => $guests['total'], 'newPassword' => Session::get('new_password'), 'newPasswordFor' => Session::get('new_password_for')], ['title' => t('admin.clients'), 'active' => 'clients']);
    }

    public static function clientReset(array $p): Response
    {
        self::guardPost();
        $u = Users::find($p['id']);
        $pw = $u ? Users::resetPassword($u['id']) : null;
        if ($pw) {
            Session::set('new_password', $pw);
            Session::set('new_password_for', $u['email']);
        }
        return self::back('/admin/clients');
    }

    public static function clientDelete(array $p): Response
    {
        self::guardPost();
        Users::delete($p['id']);
        Session::flash('ok', t('admin.deleted'));
        return self::back('/admin/clients');
    }

    /* ============================================================== subscribers */
    public static function subscribers(array $p): Response
    {
        self::guard();
        return View::admin('subscribers', ['items' => Subscribers::all()], ['title' => t('admin.subscribers'), 'active' => 'subscribers']);
    }

    public static function subscribersCsv(array $p): Response
    {
        self::guard();
        // Excel-friendly: UTF-8 BOM, CRLF, every field quoted, ";" (the list separator of uk/ru Excel; "," for English),
        // and cells that start like a formula (= + - @ tab CR) are prefixed with ' so they are never executed.
        $sep = I18n::lang() === 'en' ? ',' : ';';
        $cell = static function (string $v): string {
            if ($v !== '' && preg_match('/^[=+\-@\t\r]/', $v)) {
                $v = "'" . $v;
            }
            return '"' . str_replace('"', '""', $v) . '"';
        };
        $lines = [implode($sep, [$cell('email'), $cell('subscribed_at')])];
        foreach (Subscribers::all() as $s) {
            $ts = strtotime((string) ($s['at'] ?? ''));
            $lines[] = implode($sep, [$cell((string) $s['email']), $cell($ts ? date('Y-m-d H:i:s', $ts) : '')]);
        }
        $csv = "\u{FEFF}" . implode("\r\n", $lines) . "\r\n";
        return Response::text($csv, 'text/csv; charset=utf-8')->header('Content-Disposition', 'attachment; filename="onika-subscribers-' . date('Y-m-d') . '.csv"')->noCache();
    }

    public static function subscriberDelete(array $p): Response
    {
        self::guardPost();
        Subscribers::delete(Request::str('email'));
        Session::flash('ok', t('admin.deleted'));
        return self::back('/admin/subscribers');
    }

    /* ================================================================== messages */
    public static function messages(array $p): Response
    {
        self::guard();
        return View::admin('messages', ['items' => Messages::all()], ['title' => t('admin.messages'), 'active' => 'messages']);
    }

    public static function messageRead(array $p): Response
    {
        self::guardPost();
        Messages::setRead((int) $p['id'], Request::str('read', '1') === '1');
        return self::back('/admin/messages');
    }

    public static function messageDelete(array $p): Response
    {
        self::guardPost();
        Messages::delete((int) $p['id']);
        Session::flash('ok', t('admin.deleted'));
        return self::back('/admin/messages');
    }

    /* ================================================================== settings */
    public static function settings(array $p): Response
    {
        self::guard();
        $st = self::pullForm('settings');
        return View::admin('settings', ['s' => Settings::all(), 'backups' => Backups::list(), 'old' => $st['old'], 'errors' => $st['errors']], ['title' => t('admin.settings'), 'active' => 'settings']);
    }

    public static function settingsSave(array $p): Response
    {
        self::guardPost();
        $tr = [];
        foreach (['ru', 'en'] as $l) {
            foreach (['tagline', 'announcement', 'heroTitle', 'heroSubtitle'] as $k) {
                $v = trim((string) Request::input($k . '_' . $l, ''));
                if ($v !== '') {
                    $tr[$l][$k] = $v;
                }
            }
        }
        $errors = [];
        $email = Request::str('email');
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'email';
        }
        foreach (['instagram', 'telegram'] as $k) {
            $v = Request::str($k);
            if ($v !== '' && (!preg_match('#^https?://[^\s/$.?\#][^\s]*$#i', $v) || !filter_var($v, FILTER_VALIDATE_URL))) {
                $errors[$k] = 'url';
            }
        }
        $free = trim((string) Request::input('freeShippingFrom', '0'));
        if ($free !== '' && (!is_numeric($free) || (float) $free < 0 || (float) $free > 10000000)) {
            $errors['freeShippingFrom'] = 'number';
        }
        if ($errors) {
            // Nothing is saved: show the same form with what was typed and the wrong fields marked.
            self::keepForm('settings', Request::inputAll(), $errors);
            Session::flash('err', t('admin.formInvalid'));
            return self::back('/admin/settings');
        }
        $url = static function (string $v): string {
            $v = trim($v);
            return $v === '' || preg_match('#^https?://#i', $v) ? $v : '';
        };
        Settings::update([
            'siteName' => Text::truncate(Request::str('siteName') ?: 'ONIKA', 60),
            'tagline' => Text::truncate(Request::str('tagline'), 120),
            'heroTitle' => Text::truncate(Request::str('heroTitle'), 160),
            'heroSubtitle' => Text::truncate((string) Request::input('heroSubtitle', ''), 400),
            'announcement' => Text::truncate(Request::str('announcement'), 240),
            'phone' => Text::truncate(Request::str('phone'), 40),
            'email' => Text::truncate(Request::str('email'), 120),
            'address' => Text::truncate(Request::str('address'), 200),
            'instagram' => $url(Request::str('instagram')),
            'telegram' => $url(Request::str('telegram')),
            'freeShippingFrom' => max(0, (int) round((float) $free)),
            'translations' => $tr,
        ]);
        Session::flash('ok', t('admin.saved'));
        return self::back('/admin/settings');
    }

    public static function backupCreate(array $p): Response
    {
        self::guardPost();
        try {
            Backups::create('manual');
            Session::flash('ok', t('admin.backupCreated'));
        } catch (\Throwable) {
            Session::flash('err', t('admin.backupFailed'));
        }
        return self::back('/admin/settings');
    }

    public static function backupDownload(array $p): Response
    {
        self::guard();
        $path = Backups::path($p['name']);
        if (!$path) {
            Session::flash('err', t('admin.backupMissing'));
            return self::back('/admin/settings');
        }
        return Response::file($path, 'application/octet-stream', basename($path))->noCache();
    }

    public static function backupRestore(array $p): Response
    {
        self::guardPost();
        $ok = Backups::path($p['name']) !== null && Backups::restore($p['name']);
        if ($ok) {
            // The restored database may hold a different admin account: start a clean session.
            Auth::logoutAdmin();
            Session::flash('ok', t('admin.backupRestored'));
            return Response::redirect(purl('/admin/login'));
        }
        Session::flash('err', t('admin.backupFailed'));
        return self::back('/admin/settings');
    }

    public static function backupDelete(array $p): Response
    {
        self::guardPost();
        $ok = Backups::path($p['name']) !== null && Backups::delete($p['name']);
        Session::flash($ok ? 'ok' : 'err', $ok ? t('admin.deleted') : t('admin.backupMissing'));
        return self::back('/admin/settings');
    }
}
