# Domain Docs

How engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- `CONTEXT-MAP.md` at the repository root if it exists. It points to one `CONTEXT.md` per relevant context.
- Root `docs/adr/` for system-wide decisions that affect the work.
- `apps/<context>/CONTEXT.md` and `apps/<context>/docs/adr/` for app-specific vocabulary and decisions.

If any of these files do not exist, proceed silently. The domain-modeling skill creates them only when terms or decisions need recording.

## File structure

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
└── apps/
    ├── api/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← API-specific decisions
    └── web/
        ├── CONTEXT.md
        └── docs/adr/                  ← web-specific decisions
```

## Use the glossary's vocabulary

When output names a domain concept, use the term defined in the relevant `CONTEXT.md`. If the concept is absent, reconsider whether existing terminology already covers it or note the gap for domain modeling.

## Flag ADR conflicts

Explicitly surface any conflict with an existing ADR rather than silently overriding it.
