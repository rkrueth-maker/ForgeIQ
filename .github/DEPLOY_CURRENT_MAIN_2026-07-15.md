# Deploy Current Main

Purpose: create the first merged pull-request event after the hardened GitHub Pages workflow became authoritative on `main`.

The deployment workflow checks out current `main`, not pull-request content, and publishes deployed-SHA evidence. This marker changes no website content, catalog value, price, Owner Portal, Business Office, North Star installation, DNS, billing, or external action.

Final trigger: the `Pages Merge Signal` and protected `workflow_run` deployment chain are both authoritative on `main`; merging this repository-only update fires that chain.
