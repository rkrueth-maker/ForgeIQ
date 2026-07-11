(function () {
  'use strict';

  const VERSION = '20260711-commercial-review-v3';
  const scriptUrl = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : new URL('sample-raster-images.js', document.baseURI).href;
  const assetRoot = new URL('assets/', scriptUrl);
  const reviewMode = /raster-proof-review\.html$/.test(window.location.pathname);

  const proofByProduct = {
    'H38-P001': { src: 'rick-review-problem-snapshot-v1.png', alt: 'Hypothetical Problem Snapshot separating known facts, assumptions, missing information, risks, and first actions', caption: 'A finished hypothetical decision snapshot separating facts, unknowns, risks, and the first practical actions.' },
    'H38-P002': { src: 'rick-review-basic-layout-v1.png', alt: 'Conceptual 28-by-40 garage layout showing vehicle lanes, work zones, storage zones, obstacles, and traffic flow', caption: 'A conceptual space plan showing recommended zones, movement, assumptions, and measurements still requiring field confirmation.' },
    'H38-P003': { src: 'rick-review-project-packet-v1.png', alt: 'Project Planning Packet with scope, phases, decision gates, material groups, measurements, risks, and owner actions', caption: 'A hypothetical Project Planning Packet showing scope, phases, decision gates, material groups, measurements, risks, and owner actions.' },
    'H38-P004': { src: 'rick-review-shop-flow-v1.png', alt: 'Shop Flow Review comparing current-state and proposed-state movement, staging, tools, and work zones', caption: 'A current-state and proposed-state shop-flow comparison showing movement, staging, tool placement, blocked areas, and first fixes.' },
    'H38-P005': { src: 'rick-review-business-cleanup-v1.png', alt: 'Business Workflow Starter showing lead-to-job statuses, tracker fields, quote controls, and owner approval gates', caption: 'A hypothetical lead-to-job control system that gives every lead, quote, job, and follow-up a clear status and next action.' },
    'H38-P006': { src: 'rick-review-cleanup-rescue-v1.png', alt: 'Cleanup Rescue Plan showing folder structure, naming rules, duplicate handling, review holds, and a 30-day sequence', caption: 'A safe hypothetical cleanup plan created before any files are moved or deleted.' },
    'H38-P007': { src: 'rick-review-workflow-opportunity-v1.png', alt: 'Workflow Opportunity Snapshot separating manual work, standards, safe automation, owner approvals, and actions not to automate', caption: 'A hypothetical workflow review identifying the first safe improvement before implementation work begins.' },
    'H38-P008': { src: 'product-proof/digital-workflow-build.png', alt: 'Digital Workflow Build showing a working form, tracker, dashboard, test records, owner-review queue, SOP, and recovery controls', caption: 'A working hypothetical form, tracker, dashboard, test-record, owner-review, SOP, and recovery handoff. No unattended customer sends.' },
    'H38-P009': { src: 'product-proof/cleanup-implementation.png', alt: 'Cleanup Implementation showing completed folder structure, cleanup index, hold rules, renamed files, and maintenance checklist', caption: 'A completed hypothetical folder structure, cleanup index, review holds, renamed-file examples, and maintenance checklist.' },
    'H38-P010': { src: 'product-proof/automation-opportunity-snapshot.png', alt: 'Automation Opportunity Snapshot showing operator sequence, cycle-time assumptions, opportunity window, risks, and first data test', caption: 'Concept decision support showing current-process evidence, timing assumptions, constraints, risks, and the first controlled data test.' },
    'H38-P011': { src: 'product-proof/shop-bottleneck-roi-audit.png', alt: 'Shop Bottleneck and ROI Audit showing loss categories, bottleneck evidence, editable assumptions, investment range, and payback sensitivity', caption: 'Hypothetical, assumption-based decision support comparing bottleneck evidence, investment range, payback sensitivity, and the next measurement step.' },
    'H38-P012': { src: 'product-proof/automation-vendor-quote-pack.png', alt: 'Automation Vendor Quote Pack showing a hypothetical RFQ scope, vendor comparison, exclusions, and acceptance-test checklist', caption: 'A hypothetical vendor comparison demonstrating one consistent RFQ scope, exclusions, measurable acceptance tests, and owner-controlled selection.' },
    'H38-P013': { src: 'product-proof/fixture-jig-concept-review.png', alt: 'Fixture and Jig Concept Review showing locating datums, clamp directions, loading, tool access, chip clearance, and open validation questions', caption: 'Concept review only—not production CAD or final design. Detailed design, manufacture, and validation require qualified resources.' },
    'H38-P014': { src: 'product-proof/vision-inspection-concept-review.png', alt: 'Vision and Inspection Concept Review showing good and bad samples, lighting, measurable criteria, sample plan, and capability limits', caption: 'A hypothetical inspection objective and vendor test plan with measurable criteria, sample variation, lighting questions, and capability boundaries.' },
    'H38-P015': { src: 'product-proof/robot-tending-concept-pack.png', alt: 'Robot Tending Concept Pack showing a conceptual cell, six-step sequence, infeed and outfeed, recovery states, access, and safety questions', caption: 'Concept planning only. Qualified integrators and safety professionals own final design, installation, guarding, and validation.' }
  };

  function productIdFor(card) {
    const idLabel = card.querySelector('.sample-labels span:last-child');
    return idLabel ? idLabel.textContent.trim() : '';
  }

  function assetUrl(path) {
    const url = new URL(path, assetRoot);
    url.searchParams.set('v', VERSION);
    return url.href;
  }

  function proofMarkup(proof, productId) {
    const src = assetUrl(proof.src);
    return `
      <figure class="proof-raster proof-raster--image" data-product-proof="${productId}">
        <button class="proof-raster-frame proof-raster-frame--image" type="button" data-proof-open aria-label="Enlarge ${proof.alt}">
          <img src="${src}" alt="${proof.alt}" width="1600" height="1000" loading="${reviewMode ? 'eager' : 'lazy'}" decoding="async">
          <span class="proof-raster-zoom" aria-hidden="true">View full size</span>
        </button>
        <figcaption>${proof.caption}</figcaption>
      </figure>`;
  }

  function ensureDialog() {
    let dialog = document.querySelector('[data-proof-dialog]');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'proof-dialog';
    dialog.setAttribute('data-proof-dialog', '');
    dialog.innerHTML = '<button class="proof-dialog-close" type="button" data-proof-close aria-label="Close enlarged image">Close</button><img alt="">';
    document.body.appendChild(dialog);
    dialog.querySelector('[data-proof-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    return dialog;
  }

  function attachDialogHandlers() {
    const dialog = ensureDialog();
    document.querySelectorAll('[data-proof-open]').forEach((button) => {
      button.addEventListener('click', () => {
        const source = button.querySelector('img');
        const target = dialog.querySelector('img');
        target.src = source.currentSrc || source.src;
        target.alt = source.alt;
        dialog.showModal();
      });
    });
  }

  function replacePlaceholderVisuals() {
    document.querySelectorAll('.sample-card').forEach((card) => {
      const productId = productIdFor(card);
      const proof = proofByProduct[productId];
      const visual = card.querySelector('.sample-visual');
      if (!proof || !visual) return;

      visual.innerHTML = proofMarkup(proof, productId);
      visual.dataset.proofAsset = 'raster';
      card.dataset.proofAsset = 'raster';
    });
    attachDialogHandlers();
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