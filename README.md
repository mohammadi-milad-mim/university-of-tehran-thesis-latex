# قالب پایان‌نامه دانشگاه تهران و ویرایشگر محلی

یک کیت مستقل برای نگارش پایان‌نامه فارسی با XeLaTeX، ویرایشگر محلی راست‌به‌چپ و قالب آگهی دفاع. متن فصل‌ها و داده‌ها صرفاً نمونه‌های آموزشی هستند. نام دانشگاه، دانشکدگان و دانشکده و نشان‌ها حفظ شده‌اند؛ مشخصات نویسنده و استادان جای‌نگهدار هستند.

> این قالب حاشیه یکنواخت ۲۵ میلی‌متر دارد. این انتخاب قالب است و به معنی تأیید انطباق با آخرین شیوه‌نامه دانشگاه نیست.

![ویرایشگر محلی فارسی](docs/previews/editor.png)

نمونه‌های آماده در `sample-output/` همراه مخزن نگهداری می‌شوند؛ پوشه‌های `output/` مخصوص ساخت محلی هستند و وارد گیت نمی‌شوند.

نمونه خروجی: [پایان‌نامه](sample-output/sample-thesis.pdf) · [پوستر دفاع](sample-output/sample-defense-poster.pdf)

[معرفی کوتاه و تصویری پروژه / Illustrated overview](OVERVIEW.md)

## شروع سریع با Docker

Docker Desktop را در Windows/macOS یا Docker Engine به همراه Compose را در Linux اجرا کنید:

```sh
docker compose up --build -d
```

ویرایشگر: [http://127.0.0.1:5185](http://127.0.0.1:5185). اولین ساخت به اینترنت نیاز دارد؛ نگارش و ساخت PDF پس از آماده شدن تصویر، محلی انجام می‌شوند.

```sh
# ساخت خروجی نهایی پایان‌نامه
docker compose exec -w /workspace/thesis-latex editor make verify
# ساخت آگهی دفاع
docker compose exec -w /workspace/thesis-latex editor make poster
# توقف؛ فایل‌های نوشته‌شده روی میزبان باقی می‌مانند
docker compose down
```

خروجی‌ها در `thesis-latex/output/thesis.pdf` و `defense-poster-template/output/defense-announcement.pdf` قرار می‌گیرند. دکمه «تازه‌سازی PDF» فقط پیش‌نمایش می‌سازد و فایل اصلی را ذخیره نمی‌کند. برای ذخیره متن، دکمه «ذخیره» یا Ctrl/Cmd+S را بزنید.

در Linux اگر شناسه کاربر شما ۱۰۰۰ نیست، برای مالکیت صحیح فایل‌ها از راهنمای [Docker](docs/docker.md) استفاده کنید. فقط پورت loopback میزبان منتشر می‌شود. این برنامه برای استفاده شخصی محلی طراحی شده است.

## ساختار

| پوشه | کاربرد |
|---|---|
| `thesis-latex` | فصل‌ها، پیوست‌ها، اطلاعات پایان‌نامه، منابع و واژه‌نامه |
| `latex-local-editor` | ویرایشگر React/CodeMirror و API محلی |
| `presentation` | خالی برای ارائه آینده |
| `experiment_results` | داده‌های ساختگی نمونه و محل داده‌های کاربر |
| `figures` | شکل‌ها و نشان‌های مشترک |
| `defense-poster-template` | پوستر با اطلاعات مشترک پایان‌نامه |

## نگارش

- مشخصات را در `thesis-latex/metadata.tex` تغییر دهید. کلیدهای `include-*` صفحات اختیاری را کنترل می‌کنند.
- هر فصل در `chapters/NN-name.tex` و هر پیوست در `appendices/A-name.tex` قرار دارد. ترتیب در `main.tex` مشخص می‌شود. برای افزودن فایل، از ویرایشگر متن یا مدیر فایل استفاده کنید؛ برنامه محلی فقط فایل‌های موجود مجاز را ذخیره می‌کند.
- منبع‌ها را در `bibliography/references.bib` تعریف و با `\cite{lamport1994}` ارجاع دهید. Biber شماره‌ها و ترتیب نخستین ارجاع را مدیریت می‌کند.
- اصطلاح‌ها را در `glossary/terms.tex` تعریف و با `\gls{dataset}` استفاده کنید. اولین کاربرد، پاورقی انگلیسی دارد. معادل انگلیسی با کلید `en-KEY` و مخفف اختیاری با کلید `acr-KEY` ثبت می‌شود.
- `glossary/preliminary-acronyms.tex` پیش از ساخت از کاربردهای مستقیم اصطلاح‌ها تولید می‌شود؛ آن را دستی ویرایش نکنید. تعریف‌های استفاده‌نشده در فهرست نمی‌آیند. کاربرد داخل ماکروهای سفارشی نیاز به گسترش اسکریپت آماده‌سازی دارد.
- `\caption[عنوان کوتاه]{توضیح بلند}` عنوان کوتاه را در فهرست و توضیح بلند را زیر شکل یا بالای جدول نمایش می‌دهد.
- `ThesisChart` شمارنده شکل را به اشتراک می‌گذارد ولی برچسب «نمودار» دارد. `ThesisLandscape` برای صفحه افقی و `ThesisTableNotes` برای یادداشت جدول است.
- شکل‌ها در `../figures` و داده‌های نمونه در `../experiment_results` هستند. کپی پیش‌نمایش همین ساختار را حفظ می‌کند.
- برای اعداد فارسی از `\thesisnum{۱۲٫۵}`، برای متن لاتین از `\lr{example}` و برای ارجاع از `\label` و `\ref` استفاده کنید.

قالب پوستر عنوان، نام‌ها، چکیده و نشان‌ها را از پایان‌نامه می‌خواند. زمان و مکان دفاع در `defense-poster-template/details.tex` است.

## نصب بومی

به Node.js 22، Python 3.10+، TeX Live با XePersian، Biber، latexmk و Poppler نیاز دارید. قلم‌های فارسی و لاتین همراه قالب‌اند و نصب سیستمی لازم نیست.

```sh
cd latex-local-editor
npm ci
npm run build
npm start
```

نشانی نسخه بومی نیز `http://127.0.0.1:5185` است. برای توسعه از `npm run dev` و پورت 5184 استفاده کنید.

```sh
make -C thesis-latex doctor
make -C thesis-latex verify
make -C thesis-latex poster
```

برای Times New Roman، آن را با مجوز مناسب روی سیستم نصب و قبل از `\documentclass` در فایل اصلی، `\def\ThesisLatinFont{Times New Roman}` اضافه کنید. همین تنظیم را برای پوستر هم اعمال کنید. پیش‌فرض قابل‌حمل TeX Gyre Termes است.

راهنمای [ویرایشگر](latex-local-editor/README.md)، [Docker](docs/docker.md)، [وابستگی‌ها](thesis-latex/DEPENDENCIES.md) و [گزارش آزمون](VERIFICATION.md).

## مجوز

ویرایشگر و ابزارهای مستقل: MIT. قالب لاتک مشتق‌شده و پوستر: GPL-3.0. قلم‌ها و نشان‌ها مطابق اطلاعیه‌های [اشخاص ثالث](THIRD_PARTY_NOTICES.md). برای پایان‌نامه‌ای که با این کیت می‌نویسید، ذکر نام یا ارجاع به سازنده کیت درخواست نمی‌شود. اطلاعیه‌های مجوز نرم‌افزار هنگام بازتوزیع باید حفظ شوند.

## English quick start

This is a Persian University of Tehran thesis kit with a local RTL editor and defense announcement template. All prose and numerical examples are newly written demonstrations. The layout retains uniform 25 mm margins; check your faculty’s current requirements.

1. Run Docker and `docker compose up --build -d`.
2. Open [the local editor](http://127.0.0.1:5185). Edit metadata and chapter files; save explicitly.
3. Use **تازه‌سازی PDF** to preview all open buffers without saving them.
4. Run `docker compose exec -w /workspace/thesis-latex editor make verify` for the final thesis, or `make poster` for the poster.

Native alternative: install the documented TeX toolchain, then `npm ci && npm run build && npm start` inside `latex-local-editor`. The browser UI is Persian. Sources, fonts, and PDFs remain on your machine. Only trusted local LaTeX projects should be opened; this is not a hosted multi-user compiler sandbox.

No acknowledgment in your thesis is requested. The editor is MIT; the derived template is GPL-3.0; third-party notices remain applicable.
