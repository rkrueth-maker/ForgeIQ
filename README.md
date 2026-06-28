# ForgeIQ
AI-powered garage, workshop, and ecommerce operating system.

![Status](https://img.shields.io/badge/status-v2.0%20core%20operational-success)
![Tests](https://img.shields.io/badge/tests-4%20passed-success)
![Python](https://img.shields.io/badge/python-3.12-blue)

## Project Status
| Area | State | Notes |
| --- | --- | --- |
| Core architecture | Complete | Shared settings, config, logging, and Shopify client are in place. |
| Plugin registry | Complete | Modules auto-discover from the modules package. |
| Launcher and CLI | Complete | Interactive launcher plus direct option and setting commands. |
| Shopify modules | In progress | SEO audit, alt text, collections done; optimizer and blog are placeholders. |
| Test coverage | In progress | Regression tests for setup and CLI are passing. |
| Next phase | Planned | Optimizer, content engine, analytics dashboard, orchestrator. |

## Overview
ForgeIQ has evolved from standalone scripts into a modular Shopify operations app with shared configuration, logging, and a reusable API client.

## Current Capabilities
- Menu-based launcher with direct CLI execution options.
- Centralized settings management with persistent updates.
- Shared Shopify GraphQL and REST client path for all active modules.
- Automatic plugin discovery and registry-backed module routing.
- Regression test coverage for setup and CLI behaviors.

## Application Entry Points
- Interactive mode:
  - `python app.py`
- Run one module directly:
  - `python app.py --option 1`
- Persist a setting:
  - `python app.py --setting SHOPIFY_API_VERSION 2026-07`

## Module Catalog
- `1` SEO Audit: audits products and writes a CSV report.
- `2` Update Image Alt Text: previews/applies missing image alt text.
- `3` Optimize Product SEO: placeholder, validates connection.
- `4` Create Shopify Collections: creates/updates collections and assignments.
- `5` Generate Blog Post: placeholder, validates connection.

## Architecture Snapshot
- `settings.py`: centralized config loading and persistence.
- `config.py`: dynamic Shopify URL/header helpers and validation wrappers.
- `shopify/client.py`: shared API client for GraphQL/REST operations.
- `logger.py`: consistent app and module logging.
- `modules/`: metadata-driven plugin registry and module entrypoints.
- `shopify/`: domain workflows for SEO, alt text, collections, and placeholders.

## Verification Status
- Automated tests currently passing: `4 passed`.
- CLI routing verified for direct module execution.
- Settings persistence verified through tests and runtime path.

## Roadmap (Next Phase)
1. Product SEO Optimizer:
	- AI-assisted titles, meta descriptions, and tags.
	- Scoring and approval workflow before publish.
2. Content Engine:
	- Blog, social, Pinterest, and email content generation.
3. Analytics Dashboard:
	- Shopify + GA + Search Console metrics and SEO health.
4. AI Orchestrator:
	- Prioritize actions, queue tasks, and produce operational summaries.
