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

function applyHighway38Brand() {
  const replacements = [
    [/ForgeIQ by Northwoods Problem Solvers/g, "Highway 38 Solutions"],
    [/ForgeIQ by Northwoods/g, "Highway 38 Solutions"],
    [/Northwoods Problem Solvers/g, "Highway 38 Solutions"],
    [/Northwoods Workbench/g, "Highway 38 Solutions"],
    [/Northwoods Project Desk/g, "Highway 38 Project Desk"],
    [/Northwoods Shop Desk/g, "Highway 38 Shop Desk"],
    [/Northwoods Business Desk/g, "Highway 38 Business Desk"],
    [/Northwoods Digital Desk/g, "Highway 38 Digital Desk"],
    [/Northwoods Cleanup Desk/g, "Highway 38 Cleanup Desk"],
    [/ForgeIQ Product Ladder/g, "Highway 38 Solutions Product Ladder"],
    [/ForgeIQ 36-product ladder/g, "Highway 38 Solutions 36-product ladder"],
    [/ForgeIQ proof/g, "Highway 38 proof"],
    [/ForgeIQ keeps/g, "Highway 38 Solutions keeps"],
    [/ForgeIQ sorts/g, "Highway 38 Solutions sorts"],
    [/ForgeIQ returns/g, "Highway 38 Solutions returns"],
    [/ForgeIQ product card/g, "Highway 38 Solutions product card"],
    [/ForgeIQ/g, "Highway 38 Solutions"],
    [/Industrial Logic Solutions/g, "Highway 38 Solutions"],
    [/GarageOS/g, "Highway 38 Solutions"],
    [/WrenchIQ/g, "Highway 38 Solutions"]
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

  replacements.forEach(([pattern, value]) => {
    document.title = document.title.replace(pattern, value);
  });

  document.querySelectorAll('meta[content]').forEach((meta) => {
    let content = meta.getAttribute('content');
    replacements.forEach(([pattern, value]) => {
      content = content.replace(pattern, value);
    });
    meta.setAttribute('content', content);
  });
}

function bootClarity() {
  applyHighway38Brand();
  addCardClarity();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootClarity);
} else {
  bootClarity();
}
