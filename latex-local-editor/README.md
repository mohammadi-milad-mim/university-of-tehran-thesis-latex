# ویرایشگر محلی لاتک فارسی

رابط فارسی مبتنی بر React و CodeMirror 6 با دو حالت «نوشتاری» و «لاتک». هر دو حالت روی همان بافر و تاریخچه undo کار می‌کنند؛ تبدیل رفت‌وبرگشتی HTML وجود ندارد.

```sh
npm ci
npm run build
npm start
# توسعه:
npm run dev
```

نسخه تولیدی: http://127.0.0.1:5185؛ توسعه: http://127.0.0.1:5184.

- Ctrl/Cmd+S: ذخیره صریح. ذخیره خودکار وجود ندارد.
- Ctrl/Cmd+Enter: پیش‌نمایش PDF با تمام بافرهای باز، حتی تغییرهای ذخیره‌نشده.
- Ctrl/Cmd+F: جست‌وجو؛ undo/redo استاندارد؛ تکمیل کلیدهای منابع، اصطلاح‌ها و ارجاع‌ها.
- جدول‌ها، شکل‌ها و معادله‌ها در حالت نوشتاری کارت محافظت‌شده دارند. برای ویرایش دقیق روی کارت کلیک کنید.
- در تعارض فایل، نسخه دیسک، نسخه شما و ادغام قابل بازبینی‌اند. انتخاب ادغام به ذخیره دستی بعدی نیاز دارد.
- ویرایشگر اجازه ایجاد فایل یا تغییر class، main.tex، ابزارها و شکل‌ها را نمی‌دهد. برای این کار از مدیر فایل استفاده کنید؛ تغییر main.tex ترتیب فهرست را تازه می‌کند.
- پرونده `preliminary-acronyms.tex` تولیدی است؛ تعریف اصطلاح و مخفف را در `terms.tex` تغییر دهید.

پیش‌نمایش در `.cache/preview/work-*/thesis-latex` ساخته می‌شود. فقط پوشه لاتک و دو پوشه مشترک `figures` و `experiment_results` وارد snapshot می‌شوند؛ symlinkها دنبال نمی‌شوند. خطای ساخت، آخرین PDF موفق را حذف نمی‌کند. خروجی نهایی با دستورهای ریشه ساخته می‌شود.

## Configuration

| Variable | Default |
|---|---|
| `THESIS_LATEX_EDITOR_WORKSPACE` | sibling `thesis-latex` |
| `THESIS_LATEX_EDITOR_CACHE` | editor `.cache` |
| `THESIS_LATEX_EDITOR_API_PORT` | `5185` |
| `THESIS_LATEX_EDITOR_PORT` | Vite development port `5184` |
| `THESIS_LATEX_EDITOR_HOST` | `127.0.0.1`; container explicitly sets `0.0.0.0` |
| `THESIS_LATEX_EDITOR_ALLOWED_HOSTS` | local hostnames and configured ports |
| `THESIS_LATEX_EDITOR_POLLING` | `1` enables polling for bind mounts |

The production server serves frontend, API, and WebSockets on one port. HTTP Host/Origin and WebSocket origins are checked. No cloud services or telemetry are used. The server is intended for trusted local projects, not public deployment.

## API

- `GET /api/index`, `/api/health`
- `GET /api/file?path=...`
- `POST /api/file` with `{path, content, expectedHash}`; stale hashes receive HTTP 409 and the disk snapshot.
- `POST /api/preview` with `{buffers: [{path, content, baseHash}]}` and `X-Thesis-Latex-Editor-Action: preview-pdf`.
- `GET /api/preview/status`, `/api/pdf`, `/api/pdf-info`
- `GET /api/sync?path=...&line=...&column=...&revision=...`
- `WS /ws` for file changes and build progress.

## Tests

```sh
npm run check
npx playwright install chromium firefox webkit
npm run test:e2e
```

Tests create disposable workspaces; they never edit a personal thesis. The real preview browser test requires the native TeX toolchain. See root VERIFICATION.md for measured results and limitations. MIT license: `../LICENSE`.
