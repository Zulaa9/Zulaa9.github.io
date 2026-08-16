---
en:
  title: KeyPing
  eyebrow: FLAGSHIP MODULE // KP-01
  shortDescription: >-
    Local-first desktop credential hygiene system. Detect weak credentials,
    enforce hygiene and keep your vault fully offline.
  features:
    - Local-only encrypted vault (AES-256-GCM)
    - Password similarity and reuse detection
    - Password health analysis and scoring
    - Per-password version history
    - Advanced search and filtering
    - Folder organization with drag and drop
    - Offline encrypted import/export
    - Auto-updates via GitHub Releases
    - Interactive onboarding and demo mode
    - ES / EN interface
es:
  title: KeyPing
  eyebrow: MÓDULO PRINCIPAL // KP-01
  shortDescription: >-
    Sistema local-first de higiene de credenciales para escritorio. Detecta
    credenciales débiles, refuerza la higiene y mantiene tu bóveda totalmente
    offline.
  features:
    - Bóveda cifrada solo en local (AES-256-GCM)
    - Detección de similitud y reutilización de contraseñas
    - Análisis y puntuación de salud de contraseñas
    - Historial de versiones por contraseña
    - Búsqueda y filtros avanzados
    - Organización por carpetas con drag and drop
    - Importación/exportación cifrada en modo offline
    - Autoactualizaciones vía GitHub Releases
    - Onboarding interactivo y modo demo
    - Interfaz ES / EN
cover: ./cover.png
stack: [Electron, Angular, TypeScript, Node.js]
status: active
links:
  repo: https://github.com/Zulaa9/KeyPing
isFlagship: true
order: 1
---

<!-- Long-form body is English-only for now — bilingual body content is an
     open decision for Fase 4, once the project template that renders it
     actually exists. -->

## What KeyPing is

KeyPing is a desktop password manager focused on credential hygiene:
detecting weak, reused and risky passwords while keeping all data local and
offline. This is not a concept demo — it is an actively developed product
with a stable core, production-level release discipline and security
controls designed for real use.

## Why it exists

Reused credentials multiply risk across services, weak patterns are still
common, and most managers default to requiring cloud trust. KeyPing is
designed local-first on purpose: no mandatory sync, no account required.

Each credential can store a direct password-change URL — in a breach, that
one-click path reduces friction and reaction time exactly when stress is
highest.

## Security model

- Vault encrypted on disk using AES-256-GCM
- No mandatory cloud sync and no account required
- PBKDF2-HMAC-SHA512 key derivation (600,000 iterations, OWASP 2023)
- Master password verified in the main process only — the session key never
  reaches the renderer
- HMAC-SHA256 for duplicate detection — no plaintext passwords compared in
  the renderer
- Atomic vault rotation with automatic rollback on failure
- Escalating cooldown after failed master-unlock attempts

## Architecture

| Layer | Choice |
|---|---|
| Frontend | Angular, standalone components |
| Runtime | Electron |
| IPC bridge | Secure preload API, `contextIsolation` enabled |
| Vault | Encrypted local file, managed by the Electron main process |

1. The UI requests operations through preload IPC.
2. The main process validates and executes them securely.
3. The vault module encrypts and decrypts local storage.
4. The UI receives sanitized metadata and operation state — never raw vault
   contents.

## Roadmap

- Optional breach-check integrations with a privacy-preserving approach
- Expanded automated test coverage across IPC and vault logic
- Improved UX for import conflict resolution
- Signed and notarized macOS pipeline
- Optional portable mode
