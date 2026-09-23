# Fileform — portable Flask converter

An animated, responsive file converter with Flask, HTML, CSS and JavaScript.
**No separate LibreOffice, Microsoft Word or Poppler installation is required.**
The required conversion engines are installed by pip. No paid API or API key is needed.
Files stay on the computer/server running Flask; they are not sent to a conversion service.

## Update your existing Windows / VS Code project

1. Stop the running Flask server in the terminal with **Ctrl+C**.
2. Copy all files from this ZIP's `file-converter` folder into your existing project,
   replacing old files. Keep your existing `.venv` folder. Copy the new
   **`portable_converters.py`** file too; it is required.
3. In your project terminal, run each command separately:

```powershell
.\.venv\Scripts\python.exe -m pip install --upgrade -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

Open **http://127.0.0.1:5000**, then press **Ctrl+F5** to refresh the interface.

## Fresh setup

Install Python 3.10 or newer; Python 3.12 is a suitable baseline. Standard Windows,
macOS and Linux installations with package wheels available are supported; this is
not a claim that Python can run in every hosting environment or on every CPU.
Initial dependency installation needs internet access. Conversion itself works offline.

Windows / PowerShell, from the project folder:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

macOS / Linux:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python app.py
```

Open http://127.0.0.1:5000. This is a server-based Flask app, not a standalone HTML
file: keep the terminal running while using it. Website visitors need only a browser;
the Python dependencies are required only on the machine hosting the app.

## What changed

- Word to PDF now uses python-docx and ReportLab, replacing the LibreOffice requirement.
- PDF to JPEG now uses pypdfium2, whose normal platform wheels include PDFium,
  replacing the separate Poppler requirement.
- Animated dark interface with gradient lighting, upload animation, hover effects,
  live conversion steps and success feedback.
- The browser is asked to download the result automatically after conversion.
  A **Download again** button remains available if automatic downloads are blocked.
- Reduced-motion preferences disable decorative animations.

## Supported conversions and fidelity

| Conversion | Output / limitation |
| --- | --- |
| PDF → JPEG | One JPEG per page. Multiple pages download as a ZIP. Long edge capped at 2400 pixels. |
| JPEG / PNG → PDF | One-page PDF. Orientation applied; transparent pixels flattened onto white. |
| DOCX → PDF | Reflows paragraphs, headings, bold/italic/underline, basic tables and embedded raster images. Does not reproduce exact Word layout. |
| PDF → DOCX | Extracts editable text and page breaks. No OCR, original layout, images or table reconstruction. |

**Word fidelity:** This portable renderer is not Word's layout engine. Fonts and
pagination can change. Headers, footers, floating objects, text boxes, charts,
footnotes, multi-section layouts, original list numbering, merged-table appearance
and other complex content may be omitted or simplified. Embedded unsupported images
are marked; linked images are not fetched. Numbered and bulleted lists use simple
bullets. The bundled Vera font has limited script coverage; a result warning appears
when unsupported characters are encountered. Inspect important documents before sharing.
For exact Word-style output, a full document engine or dedicated conversion service
would still be needed. The UI discloses the portable conversion before and after use.

## Project structure

```text
file-converter/
  app.py
  portable_converters.py
  templates/index.html
  static/css/style.css
  static/js/script.js
  uploads/.gitkeep
  converted/.gitkeep
  requirements.txt
  Dockerfile
  .dockerignore
  .gitignore
  README.md
```

## Limits, privacy and cleanup

- One file at a time; exact file limit is 10 MiB, labelled 10 MB in the UI.
- File contents are parsed during conversion. Unsupported extensions, empty,
  damaged, encrypted and oversized inputs produce readable errors.
- PDFs: 1–100 pages. Images: maximum 20 million pixels. DOCX: maximum 2,000 ZIP
  entries and 50 MiB expanded contents; macro packages are rejected.
- A random 128-bit job token replaces user-supplied filenames on disk. Anyone with
  the token can download the output until expiry; this app has no user accounts.
- Source files are removed after successful conversion. Other temporary files and
  outputs expire after one hour. A cleanup task runs every minute and at startup,
  so physical deletion can lag expiry by a minute while the app is running.
- Downloads stay available until expiry so retries and streaming can complete.
- Conversion runs in a child process with a 120-second deadline; two conversions
  are permitted concurrently per web worker. The default Docker setup has one worker.
- Progress is intentionally indeterminate; the UI distinguishes upload and conversion
  without inventing a completion percentage.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/` | Website |
| POST | `/upload` | Multipart `file`; returns `id` and `conversions` |
| POST | `/convert` | JSON `{"id":"...","type":"docx-pdf"}`; returns download URL, filename and warning |
| GET | `/download/<id>` | Attachment download |

Conversion types: `pdf-jpeg`, `image-pdf`, `docx-pdf`, `pdf-docx`.
Errors use `{"error":"Readable message"}` and an HTTP error status.

## Optional hosting

This project is for your VS Code/local Python environment. No hosted URL is included.
Sites cannot run the Flask process; use a Python or container host for online access.

```bash
docker build -t fileform .
docker run --rm -p 5000:5000 --memory=1g --cpus=2 fileform
```

The Dockerfile installs only Python dependencies and runs as a non-root user.
Docker itself must be installed. The image build was not executed in this workspace.
For Linux without Docker:

```bash
gunicorn --bind 0.0.0.0:5000 --workers 1 --threads 4 --timeout 180 app:app
```

Public deployment needs HTTPS, authentication or rate limiting, and isolated conversion
workers with appropriate memory, disk and request limits. Do not serve `uploads/` or
`converted/` as public static folders. Keep the process running for timed cleanup.

## Verification

All four conversions were exercised with native executable lookup disabled, including
DOCX paragraphs with formatting, a table, an embedded image and an explicit page break.
Checks also covered multi-page ZIP output, download attachments, corrupt/empty/oversized
inputs, invalid tokens, source deletion and expired-job cleanup. This does not guarantee
fidelity for every real-world document or compatibility with every operating system.
JavaScript syntax passed validation. Browser-based visual and automatic-download QA
could not run here because the browser executable was unavailable; use the download
button if your browser blocks an automatic download.

Implementation references:
- https://pypdfium2.readthedocs.io/en/stable/python_api.html
- https://docs.reportlab.com/reportlab/userguide/ch5_platypus/
