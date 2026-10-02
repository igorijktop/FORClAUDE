<?php
declare(strict_types=1);

namespace Onika\Repo;

use Onika\Db;
use Onika\Text;

final class Orders
{
    public const STATUSES = ['new', 'confirmed', 'shipped', 'done', 'cancelled'];
    public const SHIPPING = ['np_branch', 'np_courier', 'kyiv_courier', 'pickup'];
    public const PAYMENT = ['cod', 'card'];

    public static function hydrate(array $r): array
    {
        return [
            'id' => (string) $r['id'],
            'token' => (string) $r['token'],
            'userId' => $r['user_id'] !== null ? (string) $r['user_id'] : null,
            'createdAt' => (string) $r['created_at'],
            'status' => (string) $r['status'],
            'customer' => (array) Text::jsonDecode($r['customer'] ?? '{}', []),
            'payment' => (string) $r['payment'],
            'items' => (array) Text::jsonDecode($r['items'] ?? '[]', []),
            'subtotal' => (float) $r['subtotal'],
            'shipping' => $r['shipping'] !== null ? (float) $r['shipping'] : null,
            'total' => (float) $r['total'],
            'history' => (array) Text::jsonDecode($r['history'] ?? '[]', []),
        ];
    }

    /**
     * Validate the checkout payload and create the order. Prices always come from the database.
     * @return array{ok:bool,order?:array,errors?:array<string,string>,unavailable?:list<string>}
     */
    public static function create(array $p, ?string $userId): array
    {
        $errors = [];
        $name = Text::truncate((string) ($p['name'] ?? ''), 100);
        if (mb_strlen($name) < 2) {
            $errors['name'] = 'required';
        }
        $phone = trim((string) ($p['phone'] ?? ''));
        $digits = Text::phoneDigits($phone);
        if (strlen($digits) < 10 || strlen($digits) > 15) {
            $errors['phone'] = 'invalid';
        }
        $email = trim((string) ($p['email'] ?? ''));
        if ($email !== '' && !Text::isEmail($email)) {
            $errors['email'] = 'invalid';
        }
        $ship = (string) ($p['shippingMethod'] ?? 'np_branch');
        if (!in_array($ship, self::SHIPPING, true)) {
            $ship = 'np_branch';
        }
        $pay = (string) ($p['payment'] ?? 'cod');
        if (!in_array($pay, self::PAYMENT, true)) {
            $pay = 'cod';
        }
        $city = Text::truncate((string) ($p['city'] ?? ''), 100);
        $warehouse = Text::truncate((string) ($p['warehouse'] ?? ''), 160);
        if ($ship !== 'pickup') {
            if (mb_strlen($city) < 2) {
                $errors['city'] = 'required';
            }
            if ($warehouse === '' && $ship !== 'kyiv_courier') {
                $errors['warehouse'] = 'required';
            }
        }
        $comment = mb_substr(Text::clean((string) ($p['comment'] ?? '')), 0, 1000);

        $rawItems = $p['items'] ?? [];
        if (!is_array($rawItems) || !$rawItems || count($rawItems) > 50) {
            $errors['items'] = 'empty';
        }

        $items = [];
        $unavailable = [];
        $limits = [];   // product id => pieces actually left, for items that asked for too many
        if (!isset($errors['items'])) {
            $merged = [];
            foreach ($rawItems as $it) {
                if (!is_array($it)) {
                    continue;
                }
                $id = (string) ($it['id'] ?? '');
                $size = trim((string) ($it['size'] ?? ''));
                $qty = max(1, min(99, (int) ($it['qty'] ?? 1)));
                $key = $id . '|' . $size;
                $merged[$key] = ['id' => $id, 'size' => $size, 'qty' => min(99, ($merged[$key]['qty'] ?? 0) + $qty)];
            }
            // Stock is kept per product (sizes share it), so add up the pieces asked for across sizes.
            $resolved = [];
            $want = [];
            foreach ($merged as $it) {
                $prod = Products::findVisible($it['id']);
                $resolved[] = [$it, $prod];
                if ($prod) {
                    $want[$prod['id']] = ($want[$prod['id']] ?? 0) + $it['qty'];
                }
            }
            foreach ($resolved as [$it, $prod]) {
                if (!$prod || !$prod['inStock']) {
                    $unavailable[] = $it['id'];
                    continue;
                }
                if ($want[$prod['id']] > $prod['stock']) {
                    $unavailable[] = $it['id'];
                    $limits[$prod['id']] = $prod['stock'];
                    continue;
                }
                $size = null;
                if ($prod['sizes']) {
                    if (!in_array($it['size'], $prod['sizes'], true)) {
                        $unavailable[] = $it['id'];
                        continue;
                    }
                    $size = $it['size'];
                }
                $items[] = [
                    'id' => $prod['id'],
                    'slug' => $prod['slug'],
                    'name' => $prod['name'],
                    'price' => $prod['price'],
                    'qty' => $it['qty'],
                    'image' => $prod['images'][0] ?? null,
                    'size' => $size,
                ];
            }
            if ($unavailable) {
                $errors['items'] = 'unavailable';
            } elseif (!$items) {
                $errors['items'] = 'empty';
            }
        }
        if ($errors) {
            return ['ok' => false, 'errors' => $errors, 'unavailable' => $unavailable, 'limits' => $limits];
        }

        $subtotal = 0.0;
        foreach ($items as $it) {
            $subtotal += $it['price'] * $it['qty'];
        }
        $free = (float) Settings::get('freeShippingFrom', 0);
        // Carrier tariffs are unknown to the shop: shipping is 0 (free) or null ("by carrier tariff").
        $shipping = ($ship === 'pickup' || ($free > 0 && $subtotal >= $free)) ? 0.0 : null;
        $total = $subtotal + ($shipping ?? 0.0);

        $id = self::newId();
        $token = bin2hex(random_bytes(12));
        $now = Text::now();
        $customer = ['name' => $name, 'phone' => $phone, 'email' => $email, 'city' => $ship === 'pickup' ? '' : $city, 'shipping' => $ship, 'warehouse' => $ship === 'pickup' ? '' : $warehouse, 'comment' => $comment];
        $history = [['at' => $now, 'status' => 'new', 'note' => '']];

        // Take the pieces and save the order in one transaction. Each UPDATE only succeeds while enough pieces
        // are left, so two customers can never buy the last one at the same time.
        $totals = [];
        foreach ($items as $it) {
            $totals[$it['id']] = ($totals[$it['id']] ?? 0) + $it['qty'];
        }
        try {
            Db::tx(function () use ($totals, $id, $token, $now, $customer, $pay, $items, $subtotal, $shipping, $total, $history, $userId): void {
                foreach ($totals as $pid => $n) {
                    if (!Products::takeStock((string) $pid, $n)) {
                        throw new \DomainException((string) $pid);
                    }
                }
                Db::exec(
                    'INSERT INTO orders (id,token,created_at,status,customer,payment,items,subtotal,shipping,total,history,user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                    [$id, $token, $now, 'new', Text::jsonEncode($customer), $pay, Text::jsonEncode($items), $subtotal, $shipping, $total, Text::jsonEncode($history), $userId]
                );
            });
        } catch (\DomainException $e) {
            $pid = $e->getMessage();
            $left = Products::find($pid)['stock'] ?? 0;
            return ['ok' => false, 'errors' => ['items' => 'unavailable'], 'unavailable' => [$pid], 'limits' => [$pid => $left]];
        }
        return ['ok' => true, 'order' => self::find($id)];
    }

    private static function newId(): string
    {
        do {
            $id = 'ON' . strtoupper(bin2hex(random_bytes(3)));
        } while (Db::val('SELECT 1 FROM orders WHERE id = ?', [$id]));
        return $id;
    }

    public static function find(string $id): ?array
    {
        $r = Db::one('SELECT * FROM orders WHERE id = ?', [$id]);
        return $r ? self::hydrate($r) : null;
    }

    /**
     * Admin list. Filters: status, q, account (yes|no), user, sort, page, per_page.
     * @return array{items:list<array>,total:int,page:int,pages:int}
     */
    public static function search(array $f = []): array
    {
        $where = [];
        $params = [];
        if (!empty($f['status']) && in_array($f['status'], self::STATUSES, true)) {
            $where[] = 'status = ?';
            $params[] = $f['status'];
        }
        if (!empty($f['user'])) {
            $where[] = 'user_id = ?';
            $params[] = (string) $f['user'];
        }
        if (($f['account'] ?? '') === 'yes') {
            $where[] = 'user_id IS NOT NULL';
        } elseif (($f['account'] ?? '') === 'no') {
            $where[] = 'user_id IS NULL';
        }
        $q = trim((string) ($f['q'] ?? ''));
        if ($q !== '') {
            $like = Db::like(Text::lower($q));
            $where[] = "(lower(id) LIKE ? ESCAPE '\\' OR lower(customer) LIKE ? ESCAPE '\\')";
            array_push($params, $like, $like);
        }
        $sql = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $order = match ((string) ($f['sort'] ?? 'new')) {
            'old' => 'created_at ASC',
            'total-desc' => 'total DESC, created_at DESC',
            'total-asc' => 'total ASC, created_at DESC',
            'status' => 'status ASC, created_at DESC',
            default => 'created_at DESC',
        };
        $total = (int) Db::val('SELECT COUNT(*) FROM orders' . $sql, $params);
        $perPage = max(1, min(100, (int) ($f['per_page'] ?? 20)));
        $pages = max(1, (int) ceil($total / $perPage));
        $page = max(1, min($pages, (int) ($f['page'] ?? 1)));
        $rows = Db::all('SELECT * FROM orders' . $sql . ' ORDER BY ' . $order . ' LIMIT ? OFFSET ?', array_merge($params, [$perPage, ($page - 1) * $perPage]));
        return ['items' => array_map([self::class, 'hydrate'], $rows), 'total' => $total, 'page' => $page, 'pages' => $pages];
    }

    public static function forUser(string $userId): array
    {
        return array_map([self::class, 'hydrate'], Db::all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [$userId]));
    }

    public static function updateStatus(string $id, string $status, string $note = ''): bool
    {
        if (!in_array($status, self::STATUSES, true)) {
            return false;
        }
        $o = self::find($id);
        if (!$o) {
            return false;
        }
        $h = $o['history'];
        $h[] = ['at' => Text::now(), 'status' => $status, 'note' => Text::truncate($note, 300)];
        $was = (string) $o['status'];
        Db::tx(function () use ($id, $status, $h, $was, $o): void {
            Db::exec('UPDATE orders SET status = ?, history = ? WHERE id = ?', [$status, Text::jsonEncode($h), $id]);
            // A cancelled order gives its pieces back; re-opening it takes them again.
            if ($status === 'cancelled' && $was !== 'cancelled') {
                foreach ((array) $o['items'] as $it) {
                    Products::returnStock((string) ($it['id'] ?? ''), (int) ($it['qty'] ?? 0));
                }
            } elseif ($was === 'cancelled' && $status !== 'cancelled') {
                foreach ((array) $o['items'] as $it) {
                    Products::removeStock((string) ($it['id'] ?? ''), (int) ($it['qty'] ?? 0));
                }
            }
        });
        return true;
    }

    public static function delete(string $id): bool
    {
        return Db::exec('DELETE FROM orders WHERE id = ?', [$id]) > 0;
    }

    /** @return array<string,int> status => count */
    public static function countsByStatus(): array
    {
        $out = array_fill_keys(self::STATUSES, 0);
        foreach (Db::all('SELECT status, COUNT(*) AS n FROM orders GROUP BY status') as $r) {
            $out[$r['status']] = (int) $r['n'];
        }
        return $out;
    }

    public static function revenue(): float
    {
        return (float) Db::val("SELECT COALESCE(SUM(total), 0) FROM orders WHERE status <> 'cancelled'");
    }

    /**
     * Orders and revenue per calendar day for the last $days days (local time), oldest first.
     * @return list<array{date:string,orders:int,revenue:float}>
     */
    public static function series(int $days = 14): array
    {
        $out = [];
        $from = new \DateTimeImmutable('today -' . ($days - 1) . ' days');
        for ($i = 0; $i < $days; $i++) {
            $d = $from->modify("+$i days");
            $out[$d->format('Y-m-d')] = ['date' => $d->format('Y-m-d'), 'orders' => 0, 'revenue' => 0.0];
        }
        $since = gmdate('Y-m-d\TH:i:s\Z', $from->getTimestamp());
        foreach (Db::all("SELECT created_at, total, status FROM orders WHERE created_at >= ?", [$since]) as $r) {
            $day = date('Y-m-d', (int) strtotime($r['created_at']));
            if (!isset($out[$day])) {
                continue;
            }
            $out[$day]['orders']++;
            if ($r['status'] !== 'cancelled') {
                $out[$day]['revenue'] += (float) $r['total'];
            }
        }
        return array_values($out);
    }

    public static function recent(int $limit = 6): array
    {
        return array_map([self::class, 'hydrate'], Db::all('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?', [$limit]));
    }
}
