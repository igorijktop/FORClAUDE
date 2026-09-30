<?php
declare(strict_types=1);

namespace Onika;

/** Human labels for codes stored in orders (shipping, payment, status). */
final class Labels
{
    private const SHIP_KEYS = [
        'np_branch' => 'checkout.ship1',
        'np_courier' => 'checkout.ship2',
        'kyiv_courier' => 'checkout.ship3',
        'pickup' => 'checkout.ship4',
    ];
    private const PAY_KEYS = ['cod' => 'checkout.pay1', 'card' => 'checkout.pay2'];

    /** Status → [i18n key, colour token]. */
    public const STATUS = [
        'new' => ['admin.status.new', 'blue'],
        'confirmed' => ['admin.status.confirmed', 'amber'],
        'shipped' => ['admin.status.shipped', 'violet'],
        'done' => ['admin.status.done', 'green'],
        'cancelled' => ['admin.status.cancelled', 'gray'],
    ];

    public static function shipping(string $code): string
    {
        return isset(self::SHIP_KEYS[$code]) ? t(self::SHIP_KEYS[$code]) : ($code !== '' ? $code : '—');
    }

    public static function payment(string $code): string
    {
        return isset(self::PAY_KEYS[$code]) ? t(self::PAY_KEYS[$code]) : ($code !== '' ? $code : '—');
    }

    public static function status(string $code): string
    {
        return t((self::STATUS[$code] ?? self::STATUS['new'])[0]);
    }

    public static function statusTone(string $code): string
    {
        return (self::STATUS[$code] ?? self::STATUS['new'])[1];
    }

    public static function isPickup(string $code): bool
    {
        return $code === 'pickup';
    }

    /** @return array<string,string> code => label */
    public static function shippingOptions(): array
    {
        $o = [];
        foreach (self::SHIP_KEYS as $code => $key) {
            $o[$code] = t($key);
        }
        return $o;
    }

    /** @return array<string,array{label:string,desc:string}> */
    public static function paymentOptions(): array
    {
        return [
            'cod' => ['label' => t('checkout.pay1'), 'desc' => t('checkout.pay1desc')],
            'card' => ['label' => t('checkout.pay2'), 'desc' => t('checkout.pay2desc')],
        ];
    }
}
