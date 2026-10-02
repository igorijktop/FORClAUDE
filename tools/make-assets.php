<?php
/**
 * Generates the small, web-optimised brand images in assets/img from the
 * original logo.png / favicon.png (run once: `php tools/make-assets.php`).
 * The originals are blue; every generated image is re-coloured to the pink brand palette.
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
/**
 * Re-colour blue/cyan pixels to pink (hue 185°→336°, 235°→318°), keeping lightness, saturation and alpha.
 * White, grey and transparent pixels are left alone, so the white "N" stays white.
 */
function pinkify(GdImage $im): GdImage
{
    $w = imagesx($im);
    $h = imagesy($im);
    imagealphablending($im, false);
    imagesavealpha($im, true);
    for ($y = 0; $y < $h; $y++) {
        for ($x = 0; $x < $w; $x++) {
            $c = imagecolorat($im, $x, $y);
            $a = ($c >> 24) & 0x7F;
            if ($a === 127) {
                continue;
            }
            $r = (($c >> 16) & 0xFF) / 255;
            $g = (($c >> 8) & 0xFF) / 255;
            $b = ($c & 0xFF) / 255;
            $max = max($r, $g, $b);
            $min = min($r, $g, $b);
            $l = ($max + $min) / 2;
            $d = $max - $min;
            if ($d < 0.001) {
                continue;
            }
            $s = $d / (1 - abs(2 * $l - 1));
            if ($s < 0.12) {
                continue;
            }
            if ($max === $r) {
                $hue = 60 * fmod((($g - $b) / $d), 6);
            } elseif ($max === $g) {
                $hue = 60 * (($b - $r) / $d + 2);
            } else {
                $hue = 60 * (($r - $g) / $d + 4);
            }
            if ($hue < 0) {
                $hue += 360;
            }
            if ($hue < 170 || $hue > 255) {
                continue;
            }
            $nh = 336 - (min(235, max(185, $hue)) - 185) * 0.36;
            // HSL -> RGB
            $cc = (1 - abs(2 * $l - 1)) * $s;
            $hp = $nh / 60;
            $xx = $cc * (1 - abs(fmod($hp, 2) - 1));
            [$r1, $g1, $b1] = match (true) {
                $hp < 1 => [$cc, $xx, 0],
                $hp < 2 => [$xx, $cc, 0],
                $hp < 3 => [0, $cc, $xx],
                $hp < 4 => [0, $xx, $cc],
                $hp < 5 => [$xx, 0, $cc],
                default => [$cc, 0, $xx],
            };
            $m = $l - $cc / 2;
            $nr = (int) round(($r1 + $m) * 255);
            $ng = (int) round(($g1 + $m) * 255);
            $nb = (int) round(($b1 + $m) * 255);
            imagesetpixel($im, $x, $y, ($a << 24) | ($nr << 16) | ($ng << 8) | $nb);
        }
    }
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
$logo = pinkify(load($root . '/logo.png'));
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
$fav = pinkify(load($root . '/favicon.png'));
save(scaled($fav, 64, 64), $out . '/favicon-64.png');
save(scaled($fav, 192, 192), $out . '/icon-192.png');
$apple = blank(180, 180, [255, 255, 255]);
imagealphablending($apple, true);
$inner = scaled($fav, 148, 148);
imagecopy($apple, $inner, 16, 16, 0, 0, 148, 148);
imagesavealpha($apple, false);
imagepng($apple, $out . '/apple-touch-icon.png', 9);
printf("%-34s %6d bytes\n", 'apple-touch-icon.png', filesize($out . '/apple-touch-icon.png'));
