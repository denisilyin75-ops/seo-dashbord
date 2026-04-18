# Public Blog — Drafts + Infra

> **Назначение:** hand-curated посты для публичного блога / case study / Twitter threads.
> **Сырой внутренний источник:** `docs/devlog.md`, `docs/review_log.md`, blog_posts table в SCC.
> **Санитайзер:** `server/scripts/prepare-public-post.js` — убирает secrets/IPs/emails автоматически.

## Статус

- [x] Infra: директория + sanitizer + templates
- [x] Draft 1: SCC Overview ("что это и почему")
- [x] Draft 2: Code Review Agent tech story
- [x] Draft 3: AI Article Merge use case
- [ ] Draft 4: Content Quality Agent (6 dims)
- [ ] Draft 5: Monthly update — первые metrics (когда появятся)

## Формат

Каждый draft:
1. Sanitized для public (нет tokens/IPs/emails/internal notes)
2. Markdown с frontmatter (title / date / tags / canonical-url)
3. Hero-image placeholder (сгенерить через AI-artifact когда понадобится)

## Workflow

1. Work-in-progress: `docs/public-blog/draft_N.md` — editable user
2. Review: user refines tone/claims/links
3. Publish targets:
   - **Anthropic Case Study:** через support@anthropic.com или DevRel contact
   - **Twitter/X thread:** split post по абзацам (280 chars + link)
   - **Personal blog:** когда запустим `blog.bonaka.app`
   - **LinkedIn long-form:** 1 пост в месяц
   - **Indie Hackers:** для milestones ($1k MRR, exit story)
   - **Reddit r/SEO, r/Entrepreneur:** для tactical posts

## Sanitization Rules (auto)

Script `server/scripts/prepare-public-post.js`:
- Stripped: IP `5.129.245.98` → `[server]`
- Stripped: tokens `SeoCmd2026!`, `CeWnMgl2...` → `[REDACTED]`
- Stripped: email `denis.ilyin75@gmail.com` → `[owner@domain]`
- Stripped: SSH private key paths
- Preserved: metrics (sessions/revenue/cost), architecture, decisions

## Posts Index

| # | Title | Audience | Status |
|---|---|---|---|
| 1 | [SCC Overview](post-1-scc-overview.md) | Anthropic case study + Hacker News | draft |
| 2 | [Code Review Agent on Haiku: $1/мес](post-2-code-review-agent.md) | Technical Twitter thread | draft |
| 3 | [AI Article Merge: fix cannibalization in 1 click](post-3-article-merge.md) | SEO community (r/SEO, Indie Hackers) | draft |
