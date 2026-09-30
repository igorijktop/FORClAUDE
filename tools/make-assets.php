<?php
/**
 * Generates the small, web-optimised brand images in assets/img from the
 * original logo.png / favicon.png (run once: `php tools/make-assets.php`).
 */
declare(strict_types=1);

$root = dirname(__DIR__);
$out = $root . '/assets/img';
@mkdir($out, 0775, true);

function load(string $f): GdImage
{
    $im = imagecreatefrompng($f);
    imagealphablending($im, false);
    imagesavealpha($im, true);
    return $im;
}
function blank(int $w, int $h, ?array $bg = null): GdImage
{
    $im = imagecreatetruecolor($w, $h);
    imagealphablending($im, false);
    imagesavealpha($im, true);
    imagefill($im, 0, 0, $bg ? imagecolorallocate($im, ...$bg) : imagecolorallocatealpha($im, 0, 0, 0, 127));
    return $im;
}
function save(GdImage $im, string $path): void
{
    imagepng($im, $path, 9);
    printf("%-34s %6d bytes\n", basename($path), filesize($path));
}
function scaled(GdImage $src, int $w, int $h, ?array $bg = null): GdImage
{
    $dst = blank($w, $h, $bg);
    if ($bg) {
        imagealphablending($dst, true);
    }
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $w, $h, imagesx($src), imagesy($src));
    imagesavealpha($dst, true);
    return $dst;
}

// ---- logo: crop transparent margins, export 1x / 2x
$logo = load($root . '/logo.png');
$W = imagesx($logo); $H = imagesy($logo);
$minX = $W; $minY = $H; $maxX = 0; $maxY = 0;
for ($y = 0; $y < $H; $y += 2) {
    for ($x = 0; $x < $W; $x += 2) {
        if (((imagecolorat($logo, $x, $y) >> 24) & 0x7F) < 100) {
            $minX = min($minX, $x); $maxX = max($maxX, $x); $minY = min($minY, $y); $maxY = max($maxY, $y);
        }
    }
}
$pad = 6;
$crop = blank($maxX - $minX + 1 + 2 * $pad, $maxY - $minY + 1 + 2 * $pad);
imagecopy($crop, $logo, $pad, $pad, $minX, $minY, $maxX - $minX + 1, $maxY - $minY + 1);
$ratio = imagesx($crop) / imagesy($crop);
foreach ([1 => 44, 2 => 88] as $k => $h) {
    save(scaled($crop, (int) round($h * $ratio), $h), $out . '/logo' . ($k === 2 ? '@2x' : '') . '.png');
}

// ---- Open Graph card 1200x630: logo centred on white
$og = blank(1200, 630, [255, 255, 255]);
imagealphablending($og, true);
$ow = 820; $oh = (int) round($ow / $ratio);
$lg = scaled($crop, $ow, $oh);
imagecopy($og, $lg, (int) ((1200 - $ow) / 2), (int) ((630 - $oh) / 2), 0, 0, $ow, $oh);
imagesavealpha($og, false);
imagepng($og, $out . '/og-default.png', 9);
printf("%-34s %6d bytes\n", 'og-default.png', filesize($out . '/og-default.png'));

// ---- favicons
$fav = load($root . '/favicon.png');
save(scaled($fav, 64, 64), $out . '/favicon-64.png');
save(scaled($fav, 192, 192), $out . '/icon-192.png');
$apple = blank(180, 180, [255, 255, 255]);
imagealphablending($apple, true);
$inner = scaled($fav, 148, 148);
imagecopy($apple, $inner, 16, 16, 0, 0, 148, 148);
imagesavealpha($apple, false);
imagepng($apple, $out . '/apple-touch-icon.png', 9);
printf("%-34s %6d bytes\n", 'apple-touch-icon.png', filesize($out . '/apple-touch-icon.png'));
