<?php
declare(strict_types=1);

namespace Onika;

/** An HTTP response. Controllers return these; nothing is sent until send(). */
final class Response
{
    /** @var array<string,string> */
    private array $headers = [];
    /** @var list<string> */
    private array $cookies = [];

    public function __construct(
        public string $body = '',
        public int $status = 200,
        string $contentType = 'text/html; charset=utf-8'
    ) {
        $this->headers['Content-Type'] = $contentType;
    }

    /* ----------------------------------------------------------- factories */
    public static function html(string $html, int $status = 200): self
    {
        return new self($html, $status);
    }

    public static function text(string $text, string $type = 'text/plain; charset=utf-8', int $status = 200): self
    {
        return new self($text, $status, $type);
    }

    public static function json(mixed $data, int $status = 200): self
    {
        return new self(
            (string) json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE),
            $status,
            'application/json; charset=utf-8'
        );
    }

    /** $to may be an absolute URL or an app URL produced by url(). */
    public static function redirect(string $to, int $status = 302): self
    {
        $r = new self('', $status);
        $r->headers['Location'] = $to;
        return $r;
    }

    public static function file(string $path, string $type, ?string $downloadName = null): self
    {
        $r = new self((string) file_get_contents($path), 200, $type);
        if ($downloadName !== null) {
            $safe = preg_replace('/[^A-Za-z0-9._-]+/', '_', $downloadName);
            $r->headers['Content-Disposition'] = 'attachment; filename="' . $safe . '"';
        }
        return $r;
    }

    public static function notFound(): self
    {
        if (Request::isAjax() && str_starts_with(Request::path(), '/api/')) {
            return self::json(['ok' => false, 'error' => 'not_found'], 404);
        }
        return \Onika\View::notFoundPage();
    }

    public static function forbidden(string $msg = 'Forbidden'): self
    {
        return self::text($msg, 'text/plain; charset=utf-8', 403);
    }

    public static function serverError(\Throwable $e): self
    {
        if (str_starts_with(Request::path(), '/api/') || Request::isAjax()) {
            return self::json(['ok' => false, 'error' => 'server_error', 'message' => cfg('debug') ? $e->getMessage() : null], 500);
        }
        $detail = cfg('debug')
            ? '<pre style="white-space:pre-wrap;background:#f6f8fc;padding:16px;border-radius:12px;overflow:auto">'
              . htmlspecialchars($e->getMessage() . "\n" . $e->getFile() . ':' . $e->getLine() . "\n\n" . $e->getTraceAsString(), ENT_QUOTES, 'UTF-8') . '</pre>'
            : '';
        $html = '<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>500 — ONIKA</title>'
            . '<body style="font:16px/1.6 system-ui,sans-serif;max-width:640px;margin:12vh auto;padding:0 20px;color:#0a1633;text-align:center">'
            . '<div style="font-size:72px;font-weight:800;background:linear-gradient(135deg,#00c2ff,#1454ff);-webkit-background-clip:text;background-clip:text;color:transparent">500</div>'
            . '<h1 style="margin:8px 0">Щось пішло не так</h1><p style="color:#5b6785">Something went wrong. Please try again in a moment.</p>'
            . '<p><a href="' . htmlspecialchars(url('/'), ENT_QUOTES, 'UTF-8') . '" style="color:#1454ff">ONIKA</a></p>' . $detail . '</body></html>';
        return new self($html, 500);
    }

    /* ------------------------------------------------------------- mutators */
    public function header(string $name, string $value): self
    {
        $this->headers[$name] = $value;
        return $this;
    }

    public function withStatus(int $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function noCache(): self
    {
        $this->headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0';
        $this->headers['Pragma'] = 'no-cache';
        return $this;
    }

    public function cache(int $seconds): self
    {
        $this->headers['Cache-Control'] = 'public, max-age=' . $seconds;
        return $this;
    }

    /* ----------------------------------------------------------------- send */
    public function send(): void
    {
        if (!headers_sent()) {
            http_response_code($this->status);
            foreach (self::securityHeaders() as $k => $v) {
                header("$k: $v");
            }
            foreach ($this->headers as $k => $v) {
                header("$k: $v");
            }
        }
        if ($this->status !== 204 && $this->status !== 304 && Request::method() !== 'HEAD') {
            echo $this->body;
        }
    }

    /** @return array<string,string> */
    private static function securityHeaders(): array
    {
        $nonce = nonce();
        return [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'SAMEORIGIN',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'Permissions-Policy' => 'camera=(), microphone=(), geolocation=()',
            'Content-Security-Policy' => "default-src 'self'; script-src 'self' 'nonce-{$nonce}'; style-src 'self' 'unsafe-inline'; "
                . "img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; object-src 'none'; "
                . "base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
        ];
    }
}
