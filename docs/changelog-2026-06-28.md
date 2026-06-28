# ForgeIQ Changelog
Date: 2026-06-28
Type: PR-ready summary

## Summary
ForgeIQ v2.0 core architecture is merged and verified, and phase 2 scaffolding has begun. The codebase now includes product intelligence with per-product approval UX plus a content engine preview module.

## Added
- Central settings manager with persistence in settings.py.
- Shared logging system in logger.py.
- Shared Shopify API client in shopify/client.py.
- Plugin discovery and registry routing in modules/__init__.py.
- One-page stakeholder memo in docs/status-update-2026-06-28.md.
- CLI regression tests in tests/test_app_cli.py.
- Product optimizer regression tests in tests/test_product_optimizer.py.
- Content engine scaffold module in shopify/content_engine.py.
- Content engine module adapter in modules/content_engine.py.

## Changed
- Dynamic config helpers in config.py for Shopify URLs and headers.
- Launcher enhancements in app.py:
  - direct module execution with --option.
  - persistent configuration updates with --setting NAME VALUE.
- Shopify modules now route through shared client:
  - shopify/seo_auditor.py
  - shopify/alt_text_updater.py
  - shopify/collections.py
  - shopify/product_optimizer.py
  - shopify/blog_generator.py
- Product intelligence optimizer now includes:
  - scoring and recommendation report generation
  - per-product approval prompts (y/n/a/q)
  - apply-all support with --apply
- Expanded project documentation in README.md.
- Added pytest to requirements.txt.

## Verification
- Automated test result: 9 passed.
- CLI routing verified for module execution.
- Settings persistence path verified.
- Report and log generation paths verified in runtime.
- Live dry-run checks completed:
  - Option 3 Product Intelligence (no changes applied)
  - Option 6 Content Engine preview generation

## Known Gaps
- Blog generator remains a placeholder.
- Content engine is currently a scaffold/preview path (phase 2).
- Analytics integrations are not yet implemented.
- AI orchestration layer is not yet implemented.

## Rollout Notes
- Safe to merge as infrastructure foundation.
- Next recommended build target: content engine expansion with channel-specific templates and approval workflows.
