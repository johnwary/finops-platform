---
name: feedback-deferred-features-location
description: Deferred/future feature notes go in docs/backlog/, not in memory files
metadata:
  type: feedback
---

Deferred features and future-client wishlist items go in `docs/backlog/` as markdown files, not in the memory system.

**Why:** Memory is for conversation/session guidance. Backlog items are project artifacts that belong in the repo.

**How to apply:** When a feature is deferred (YAGNI but acknowledged), create `docs/backlog/<feature-name>.md` with the spec, reason for deferral, and trigger conditions for when to implement.
