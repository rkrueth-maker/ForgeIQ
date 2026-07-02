function addCardClarity() {
  if (typeof products === "undefined") return;

  const cards = document.querySelectorAll(".product-card");
  cards.forEach((card, index) => {
    const product = products[index];
    if (!product || card.querySelector(".card-best")) return;

    const bestFor = document.createElement("div");
    bestFor.className = "card-best";
    bestFor.innerHTML = `<b>Best for:</b> ${product.best}`;

    const action = card.querySelector("em");
    if (action) {
      card.insertBefore(bestFor, action);
    } else {
      card.appendChild(bestFor);
    }
  });
}

function applyNorthwoodsWorkbenchBrand() {
  const replacements = [
    [/ForgeIQ by Northwoods Problem Solvers/g, "Northwoods Problem Solvers"],
    [/ForgeIQ by Northwoods/g, "Northwoods Problem Solvers"],
    [/ForgeIQ Product Ladder/g, "Northwoods Workbench Product Ladder"],
    [/ForgeIQ 36-product ladder/g, "Northwoods Workbench 36-product ladder"],
    [/ForgeIQ proof/g, "Northwoods proof"],
    [/ForgeIQ keeps/g, "Northwoods Workbench keeps"],
    [/ForgeIQ sorts/g, "Northwoods Workbench sorts"],
    [/ForgeIQ returns/g, "Northwoods Workbench returns"],
    [/ForgeIQ product card/g, "Northwoods Workbench product card"],
    [/ForgeIQ/g, "Northwoods Workbench"]
  ];

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    let text = node.nodeValue;
    replacements.forEach(([pattern, value]) => {
      text = text.replace(pattern, value);
    });
    node.nodeValue = text;
  });

  document.title = document.title.replace(/ForgeIQ/g, "Northwoods Workbench");

  document.querySelectorAll('meta[content]').forEach((meta) => {
    let content = meta.getAttribute('content');
    replacements.forEach(([pattern, value]) => {
      content = content.replace(pattern, value);
    });
    meta.setAttribute('content', content);
  });
}

function bootClarity() {
  applyNorthwoodsWorkbenchBrand();
  addCardClarity();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootClarity);
} else {
  bootClarity();
}
