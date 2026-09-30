<?php
declare(strict_types=1);

namespace Onika;

/**
 * Product images: on-demand resized copies (cached as real files under /media so
 * Apache serves them statically afterwards) and safe upload handling (GD re-encode).
 */
final class Media
{
    public const WIDTHS = [120, 200, 300, 450, 600, 800, 1000, 1400];

    public static function ext(): string
    {
        return function_exists('imagewebp') ? 'webp' : 'jpg';
    }

    public static function placeholder(): string
    {
        return purl('/assets/img/placeholder.svg');
    }

    public static function isExternal(string $s): bool
    {
        return (bool) preg_match('#^(https?:)?//#i', $s);
    }

    /** Normalise a stored path into ["images"|"uploads", "file.jpg"] or null. */
    private static function parse(string $src): ?array
    {
        $src = ltrim(str_replace('\\', '/', $src), '/');
        if (preg_match('#^(images|uploads)/([A-Za-z0-9._-]+)$#', $src, $m) && !str_contains($m[2], '..')) {
            return [$m[1], $m[2]];
        }
        return null;
    }

    private static function snap(int $w): int
    {
        foreach (self::WIDTHS as $allowed) {
            if ($w <= $allowed) {
                return $allowed;
            }
        }
        return end(self::WIDTHS);
    }

    public static function url(?string $src, int $width = 600): string
    {
        if ($src === null || $src === '') {
            return self::placeholder();
        }
        if (self::isExternal($src)) {
            return $src;
        }
        $p = self::parse($src);
        if (!$p) {
            return self::placeholder();
        }
        return purl('/media/' . self::snap($width) . '/' . $p[0] . '/' . $p[1] . '.' . self::ext());
    }

    /** srcset string for the given widths ("… 300w, … 600w"). */
    public static function srcset(?string $src, array $widths): string
    {
        if (!$src || self::isExternal($src) || !self::parse($src)) {
            return '';
        }
        $parts = [];
        foreach ($widths as $w) {
            $parts[] = self::url($src, (int) $w) . ' ' . self::snap((int) $w) . 'w';
        }
        return implode(', ', array_unique($parts));
    }

    /** Whether the original file exists on disk. */
    public static function exists(string $src): bool
    {
        $p = self::parse($src);
        return $p !== null && is_file(ROOT . '/' . $p[0] . '/' . $p[1]);
    }

    /* ---------------------------------------------------------- resize on demand */
    public static function serve(int $width, string $dir, string $file): Response
    {
        $ext = strtolower((string) pathinfo($file, PATHINFO_EXTENSION));
        $orig = substr($file, 0, -(strlen($ext) + 1));
        if (!in_array($dir, ['images', 'uploads'], true) || !in_array($ext, ['webp', 'jpg'], true)
            || !in_array($width, self::WIDTHS, true) || !preg_match('/^[A-Za-z0-9._-]+$/', $orig) || str_contains($orig, '..')) {
            return Response::text('Not found', 'text/plain', 404);
        }
        $src = ROOT . "/$dir/$orig";
        if (!is_file($src)) {
            return Response::text('Not found', 'text/plain', 404);
        }
        $dest = MEDIA_DIR . "/$width/$dir/$file";
        if (!is_file($dest)) {
            if (!self::resize($src, $dest, $width, $ext)) {
                // Could not resize (no GD support for this type…) → serve original.
                $mime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file($src);
                return Response::file($src, $mime ?: 'application/octet-stream')->cache(86400);
            }
        }
        return Response::file($dest, $ext === 'webp' ? 'image/webp' : 'image/jpeg')
            ->header('Cache-Control', 'public, max-age=31536000, immutable');
    }

    private static function resize(string $src, string $dest, int $width, string $ext): bool
    {
        $im = self::load($src);
        if (!$im) {
            return false;
        }
        $w = imagesx($im);
        $h = imagesy($im);
        if ($w > $width) {
            $nh = max(1, (int) round($h * ($width / $w)));
            $dst = imagecreatetruecolor($width, $nh);
            self::fillBackground($dst, $ext !== 'jpg');
            imagecopyresampled($dst, $im, 0, 0, 0, 0, $width, $nh, $w, $h);
            imagedestroy($im);
            $im = $dst;
        } elseif ($ext === 'jpg') {
            $flat = imagecreatetruecolor($w, $h);
            self::fillBackground($flat, false);
            imagecopy($flat, $im, 0, 0, 0, 0, $w, $h);
            imagedestroy($im);
            $im = $flat;
        }
        $dir = dirname($dest);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            imagedestroy($im);
            return false;
        }
        $tmp = $dest . '.' . bin2hex(random_bytes(3)) . '.tmp';
        $ok = $ext === 'webp' ? imagewebp($im, $tmp, 80) : imagejpeg($im, $tmp, 82);
        imagedestroy($im);
        if (!$ok) {
            @unlink($tmp);
            return false;
        }
        return @rename($tmp, $dest) || is_file($dest);
    }

    private static function fillBackground(\GdImage $im, bool $transparent): void
    {
        if ($transparent) {
            imagealphablending($im, false);
            imagesavealpha($im, true);
            imagefill($im, 0, 0, imagecolorallocatealpha($im, 255, 255, 255, 127));
        } else {
            imagefill($im, 0, 0, imagecolorallocate($im, 255, 255, 255));
        }
    }

    /** Decode any GD-supported image and apply EXIF orientation. */
    private static function load(string $path): ?\GdImage
    {
        $info = @getimagesize($path);
        if (!$info || $info[0] < 1 || $info[1] < 1 || $info[0] * $info[1] > 60_000_000) {
            return null;
        }
        $data = @file_get_contents($path);
        $im = $data === false ? false : @imagecreatefromstring($data);
        if (!$im) {
            return null;
        }
        if ($info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
            $exif = @exif_read_data($path);
            $o = (int) ($exif['Orientation'] ?? 1);
            $rot = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
            if ($rot !== 0) {
                $r = imagerotate($im, $rot, 0);
                if ($r) {
                    imagedestroy($im);
                    $im = $r;
                }
            }
        }
        return $im;
    }

    /* ------------------------------------------------------------------ uploads */
    /**
     * Validate + re-encode one uploaded file. Returns the stored path ("uploads/…") or null.
     * @param array{name:string,type:string,tmp_name:string,error:int,size:int} $f
     */
    public static function saveUpload(array $f): ?string
    {
        if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file((string) $f['tmp_name'])) {
            return null;
        }
        if ((int) $f['size'] > (int) cfg('upload_max_bytes', 8 * 1024 * 1024)) {
            return null;
        }
        $mime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
        $map = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'png'];
        if (!isset($map[$mime])) {
            return null;
        }
        $im = self::load($f['tmp_name']);
        if (!$im) {
            return null;
        }
        $max = (int) cfg('upload_max_side', 2000);
        $w = imagesx($im);
        $h = imagesy($im);
        if (max($w, $h) > $max) {
            $scale = $max / max($w, $h);
            $nw = max(1, (int) round($w * $scale));
            $nh = max(1, (int) round($h * $scale));
            $dst = imagecreatetruecolor($nw, $nh);
            self::fillBackground($dst, $map[$mime] !== 'jpg');
            imagecopyresampled($dst, $im, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($im);
            $im = $dst;
        }
        $ext = $map[$mime];
        if ($ext === 'webp' && !function_exists('imagewebp')) {
            $ext = 'jpg';
        }
        $name = 'up_' . gmdate('Ymd') . '_' . bin2hex(random_bytes(5)) . '.' . $ext;
        if (!is_dir(UPLOAD_DIR)) {
            @mkdir(UPLOAD_DIR, 0775, true);
        }
        $target = UPLOAD_DIR . '/' . $name;
        if ($ext === 'jpg') {
            $flat = imagecreatetruecolor(imagesx($im), imagesy($im));
            self::fillBackground($flat, false);
            imagecopy($flat, $im, 0, 0, 0, 0, imagesx($im), imagesy($im));
            imageinterlace($flat, true);
            $ok = imagejpeg($flat, $target, 86);
            imagedestroy($flat);
        } elseif ($ext === 'png') {
            imagesavealpha($im, true);
            $ok = imagepng($im, $target, 6);
        } else {
            imagesavealpha($im, true);
            $ok = imagewebp($im, $target, 86);
        }
        imagedestroy($im);
        return $ok ? 'uploads/' . $name : null;
    }
}
