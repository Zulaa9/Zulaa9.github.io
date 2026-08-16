---
en:
  title: Portfolio Core
  eyebrow: PROJECT MODULE // PC-01
  shortDescription: >-
    Interactive system-style portfolio built as a real frontend product,
    not as a static landing page.
es:
  title: Portfolio Core
  eyebrow: MÓDULO DE PROYECTO // PC-01
  shortDescription: >-
    Portfolio interactivo con estilo de sistema, construido como producto
    frontend real y no como una landing estática.
cover: ./cover.png
stack: [Astro, Three.js, TypeScript, Cloudflare Pages]
status: active
links:
  repo: https://github.com/Zulaa9/Zulaa9.github.io
order: 2
---

<!-- Stack/body updated during the migration itself (Astro replaces the
     vanilla JS description this project used to carry) — everything else
     ported as-is. Spanish body pending, see keyping/index.md note. -->

## What this project is

This exact website is the project itself — you are currently navigating
Portfolio Core. It is built as an engineered interface: a navigable module
graph, dedicated project pages sharing a template, transition orchestration,
and content-driven data instead of one hand-written page per project.

## Architecture highlights

- Interactive Core graph with parent-child relationships, driven by data
- Shared project template instead of one page per project
- Context-aware navigation between modules (View Transitions)
- Real per-locale routes instead of query-param language switching

## Engineering focus

- Content Collections validated with Zod as the single source of truth
- Separation of concerns: topology (graph), content (projects), presentation
  (layouts/components)
- Consistent accessibility labels and keyboard-friendly controls
