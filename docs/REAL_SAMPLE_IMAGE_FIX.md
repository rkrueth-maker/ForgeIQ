# Highway 38 Real Sample Image Correction

Status: Built for owner review

## Defect

The commercial sample renderer created one of three inline SVG diagrams for every product. Those diagrams were structural placeholders rather than the approved raster proof assets.

## Correction

- H38-P001 through H38-P007 use direct CSS crops from `assets/h38-investor-demo-approved.png`.
- The SVG crop wrappers are not loaded.
- H38-P008 through H38-P015 use the existing actual Highway 38 raster photo/dashboard asset `assets/h38-demo-overview-chat-photo-v2.jpg` with product-specific proof labels and captions.
- The sample disclosure and hypothetical-demo labels remain unchanged.
- Owner Portal location and approval controls remain unchanged.

## Verification requirement

The Raster Sample Proof Check must confirm:

- 15 rendered raster proof figures.
- 7 approved proof-board PNG crops.
- 8 actual photo/dashboard proof images.
- 0 visible inline sample placeholder SVGs.
- Desktop and mobile screenshots generated.

## Deployment boundary

This correction is isolated on `fix/real-sample-images`. Merge and deployment remain owner controlled.
