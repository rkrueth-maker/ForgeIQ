# ForgeIQ Changelog
Date: 2026-06-28
Type: PR-ready summary

## Summary
ForgeIQ v2.0 core architecture was completed and verified. The codebase now uses shared settings, dynamic Shopify configuration, centralized logging, a reusable Shopify API client, and a plugin-discovered launcher for module execution.

## Added
- Central settings manager with persistence in settings.py.
- Shared logging system in logger.py.
- Shared Shopify API client in shopify/client.py.
- Plugin discovery and registry routing in modules/__init__.py.
- One-page stakeholder memo in docs/status-update-2026-06-28.md.
- CLI regression tests in tests/test_app_cli.py.

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
- Expanded project documentation in README.md.
- Added pytest to requirements.txt.

## Verification
- Automated test result: 4 passed.
- CLI routing verified for module execution.
- Settings persistence path verified.
- Report and log generation paths verified in runtime.

## Known Gaps
- Product optimizer and blog generator remain placeholders.
- Analytics integrations are not yet implemented.
- AI orchestration layer is not yet implemented.

## Rollout Notes
- Safe to merge as infrastructure foundation.
- Next recommended build target: Product SEO Optimizer workflow.
