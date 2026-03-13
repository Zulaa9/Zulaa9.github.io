# Zulaa9 — Software Systems Portfolio

This repository contains an interactive portfolio designed as a software system rather than a traditional static website.

The goal is to communicate engineering thinking through structure, interaction, and architecture, not just through visual presentation.

The interface is intentionally built around the concept of a **System Core**, where each module represents a domain of software engineering practice: product delivery, system design, technical identity, and execution.

---

## Concept

Instead of a conventional landing page, this portfolio is structured as an operational metaphor.

The **System Core** acts as a central runtime interface:
- Each node represents a functional domain
- Navigation follows a system → module transition model
- Interaction reflects architectural thinking
- Visual language mirrors technical intent

This approach aims to reflect how real software systems are structured: modular, intentional, and execution-focused.

---

## Flagship Product — KeyPing

**KeyPing** is a local-first desktop credential hygiene system focused on real-world password security practices.

It is not a browser autofill tool, nor a cloud-centric password manager.

Its purpose is to provide:

- detection of weak, reused, or similar credentials
- local vault control and integrity validation
- versioned password history management
- risk scoring and actionable security insights
- encrypted import/export workflows
- offline-first security guarantees

### Architecture

- Angular (standalone components)
- Electron runtime
- Local encrypted vault model
- IPC-mediated security boundaries
- Update distribution via GitHub Releases

KeyPing is treated as a product, not a demo.

---

## Portfolio Architecture

The portfolio itself follows a modular system model:

- System Core → navigation orchestration layer
- Modules → domain-specific views
- Flagship dominance → KeyPing as primary node
- Secondary domains:
  - About (technical identity)
  - Capabilities (engineering scope)
  - Projects (execution record)
  - Contact (technical communication channel)

Each module is isolated in responsibility but unified in narrative.

---

## Technical Stack

- Vanilla JavaScript system orchestration
- Modular view controllers per domain
- CSS-driven visual system and motion language
- Custom JSON-based i18n implementation
- Performance-aware animation design
- Touch-adaptive interaction model

No frontend framework is used in the portfolio itself by design.

The goal is to demonstrate system construction capability rather than framework usage.

---

## UX Philosophy

This portfolio is built around several principles:

- Software systems should communicate intent through structure
- Interaction can act as technical storytelling
- Minimalism supports clarity of engineering thought
- Visual systems should remain subordinate to architectural meaning
- Execution credibility matters more than visual novelty

---

## Internationalization

All visible text is centralized in JSON translation files.

- English and Spanish supported
- Single source of truth model
- Runtime language resolution
- Fallback safety mechanisms

This allows narrative consistency without duplicating logic.

---

## Performance Considerations

The interface includes a dynamic visual system.

To ensure stability:

- Animation intensity scales with context
- Reduced-motion preferences are respected
- Mobile interaction paths are simplified
- Rendering cost is constrained by design
- No layout thrashing patterns are introduced

Performance is treated as a product requirement.

---

## Author

**Unax Zulaika Fuente (Zulaa9)**  
Software Systems Engineer  

---

## Links

- Live portfolio: `https://zulaa9.github.io/`
- KeyPing repository: `https://github.com/Zulaa9/KeyPing`
- LinkedIn: `https://www.linkedin.com/in/unax-zulaika-fuente/`

---

## License

This project is licensed under the MIT License.
