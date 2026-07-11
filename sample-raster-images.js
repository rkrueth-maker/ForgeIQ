(function () {
  'use strict';

  const VERSION = '20260711-real-sample-proof';
  const scriptUrl = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : new URL('sample-raster-images.js', document.baseURI).href;
  const assetRoot = new URL('assets/', scriptUrl);
  const boardUrl = new URL('h38-investor-demo-approved.png', assetRoot);
  const shopPhotoUrl = new URL('h38-demo-overview-chat-photo-v2.jpg', assetRoot);
  boardUrl.searchParams.set('v', VERSION);
  shopPhotoUrl.searchParams.set('v', VERSION);
  const BOARD = boardUrl.href;
  const SHOP_PHOTO = shopPhotoUrl.href;

  const proofByProduct = {
    'H38-P001': { type: 'panel', panel: 'panel-1', alt: 'Approved raster proof panel for the Problem Snapshot sample', caption: 'Approved raster proof: rough garage information organized into a clear first-action snapshot.' },
    'H38-P002': { type: 'panel', panel: 'panel-2', alt: 'Approved raster proof panel for the Basic Layout Snapshot sample', caption: 'Approved raster proof: before-and-after space planning and layout direction.' },
    'H38-P003': { type: 'panel', panel: 'panel-3', alt: 'Approved raster proof panel for the Project Planning Packet sample', caption: 'Approved raster proof: project information converted into phases, decisions, and an owner checklist.' },
    'H38-P004': { type: 'panel', panel: 'panel-4', alt: 'Approved raster proof panel for the Shop Flow Review sample', caption: 'Approved raster proof: shop movement and staging converted into a practical flow plan.' },
    'H38-P005': { type: 'panel', panel: 'panel-5', alt: 'Approved raster proof panel for the Business Workflow Starter sample', caption: 'Approved raster proof: scattered lead and quote information organized into a controlled workflow.' },
    'H38-P006': { type: 'panel', panel: 'panel-6', alt: 'Approved raster proof panel for the Cleanup Rescue Plan sample', caption: 'Approved raster proof: mixed records organized into a safe folder and cleanup structure.' },
    'H38-P007': { type: 'panel', panel: 'panel-7', alt: 'Approved raster proof panel for the Workflow Opportunity Snapshot sample', caption: 'Approved raster proof: repeated work mapped into standardize, track, review, and automate decisions.' },
    'H38-P008': { type: 'photo', className: 'workflow-screen', alt: 'Actual Highway 38 workflow dashboard proof image', label: 'Working digital workflow', caption: 'Actual Highway 38 proof image used to demonstrate form, tracker, dashboard, test-record, and owner-review structure.' },
    'H38-P009': { type: 'photo', className: 'cleanup-photo', alt: 'Actual project and shop source photo used for cleanup implementation planning', label: 'Controlled cleanup implementation', caption: 'Actual source-photo proof used to demonstrate inventory, structure, naming, review, and maintenance handoff.' },
    'H38-P010': { type: 'photo', className: 'automation-photo automation-1', alt: 'Actual shop source photo used for an automation opportunity review', label: 'Automation candidate review', caption: 'Actual shop-photo proof paired with process facts, constraints, risks, and a recommended first test.' },
    'H38-P011': { type: 'photo', className: 'automation-photo automation-2', alt: 'Actual shop source photo used for a bottleneck and ROI review', label: 'Bottleneck and ROI evidence', caption: 'Actual shop-photo proof paired with cycle, wait, movement, labor, and investment assumptions.' },
    'H38-P012': { type: 'photo', className: 'automation-photo automation-3', alt: 'Actual shop source photo used for a vendor-ready automation scope', label: 'Vendor-ready scope', caption: 'Actual shop-photo proof paired with requirements, exclusions, vendor questions, and acceptance criteria.' },
    'H38-P013': { type: 'photo', className: 'automation-photo automation-4', alt: 'Actual shop source photo used for a fixture and jig concept review', label: 'Fixture and jig concept', caption: 'Actual shop-photo proof paired with locating, clamping, loading, tolerance, and operator-access notes.' },
    'H38-P014': { type: 'photo', className: 'automation-photo automation-5', alt: 'Actual shop source photo used for a vision and inspection concept review', label: 'Vision and inspection concept', caption: 'Actual shop-photo proof paired with good/bad examples, inspection criteria, lighting, and test planning.' },
    'H38-P015': { type: 'photo', className: 'automation-photo automation-6', alt: 'Actual shop source photo used for a robot tending concept review', label: 'Robot tending sequence', caption: 'Actual shop-photo proof paired with sequence, reach, part presentation, guarding boundaries, and recovery planning.' }
  };

  function productIdFor(card) {
    const idLabel = card.querySelector('.sample-labels span:last-child');
    return idLabel ? idLabel.textContent.trim() : '';
  }

  function panelMarkup(proof) {
    return `
      <figure class="proof-raster proof-raster--panel">
        <div class="proof-raster-frame ${proof.panel}">
          <img src="${BOARD}" alt="${proof.alt}" width="1536" height="1024" loading="lazy" decoding="async">
        </div>
        <figcaption>${proof.caption}</figcaption>
      </figure>`;
  }

  function photoMarkup(proof) {
    return `
      <figure class="proof-raster proof-raster--photo ${proof.className}">
        <div class="proof-raster-frame proof-raster-frame--photo">
          <img src="${SHOP_PHOTO}" alt="${proof.alt}" width="832" height="533" loading="lazy" decoding="async">
          <span class="proof-raster-label">${proof.label}</span>
        </div>
        <figcaption>${proof.caption}</figcaption>
      </figure>`;
  }

  function replacePlaceholderVisuals() {
    document.querySelectorAll('.sample-card').forEach((card) => {
      const productId = productIdFor(card);
      const proof = proofByProduct[productId];
      const visual = card.querySelector('.sample-visual');
      if (!proof || !visual) return;

      visual.innerHTML = proof.type === 'panel' ? panelMarkup(proof) : photoMarkup(proof);
      visual.dataset.proofAsset = 'raster';
      card.dataset.proofAsset = 'raster';
    });
  }

  function run() {
    window.requestAnimationFrame(replacePlaceholderVisuals);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}());
