const HIGHWAY38_FORM_LINK = "https://docs.google.com/forms/d/e/1FAIpQLScTWaK40mNNaf1ek3w4gC3VYwvpNT9fnXlHodKeOZl7lPfCyQ/viewform";

function repairRequestLinks() {
  document.querySelectorAll('a[href*="docs.google.com/forms"]').forEach((link) => {
    link.href = HIGHWAY38_FORM_LINK;
    link.target = "_blank";
    link.rel = "noopener";
  });
}

function addMobileNavSupport() {
  const nav = document.querySelector("nav");
  const navLinks = document.querySelector(".navlinks");
  if (!nav || !navLinks || document.querySelector(".nav-toggle")) return;
  navLinks.id = navLinks.id || "site-menu";
  const button = document.createElement("button");
  button.className = "nav-toggle";
  button.type = "button";
  button.setAttribute("aria-controls", navLinks.id);
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = '<span class="hamburger" aria-hidden="true"><span></span></span>Menu';
  nav.insertBefore(button, navLinks);
  button.addEventListener("click", () => {
    const open = navLinks.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(open));
  });
  navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
  }));
}

function addLaunchFooterLinks() {
  const footer = document.querySelector("footer");
  if (!footer || footer.querySelector('a[href="privacy.html"]')) return;
  const span = document.createElement("span");
  span.innerHTML = '<a href="./#top">Home</a> · <a href="pricing.html#main">Pricing</a> · <a href="sample-library.html#main">Samples</a> · <a href="faq.html#main">FAQ</a> · <a href="about.html#main">About</a> · <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a>';
  footer.appendChild(span);
}

function addGlobalPolishStyles() {
  if (document.querySelector("#highway38-launch-polish")) return;
  const style = document.createElement("style");
  style.id = "highway38-launch-polish";
  style.textContent = `
    .skip{position:absolute;left:-999px;top:0;background:#fff;color:#0f172a;padding:.75rem 1rem;z-index:9999;border-radius:0 0 .5rem 0}.skip:focus{left:0}
    a:focus-visible,button:focus-visible,.btn:focus-visible,.nav-cta:focus-visible,.tertiary-link:focus-visible{outline:3px solid #fbbf24;outline-offset:4px;border-radius:10px}
    .nav-toggle{display:none;border:1px solid rgba(255,255,255,.22);border-radius:12px;background:rgba(255,255,255,.08);color:inherit;padding:.65rem .8rem;font-weight:800}
    .hamburger{display:inline-block;width:1.15rem;height:.85rem;position:relative;margin-right:.35rem;vertical-align:-.1rem}.hamburger:before,.hamburger:after,.hamburger span{content:"";position:absolute;left:0;right:0;height:2px;background:currentColor;border-radius:2px}.hamburger:before{top:0}.hamburger span{top:50%;transform:translateY(-50%)}.hamburger:after{bottom:0}
    footer a{color:inherit;text-decoration:underline;text-underline-offset:3px}
    @media(max-width:820px){nav{align-items:center}.nav-toggle{display:inline-flex;align-items:center}.navlinks{display:none;position:absolute;top:100%;left:1rem;right:1rem;z-index:30;background:rgba(15,23,42,.98);border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:1rem;box-shadow:0 18px 55px rgba(0,0,0,.35)}.navlinks.is-open{display:grid;gap:.5rem}.navlinks li{width:100%}.navlinks a{display:block;padding:.75rem .85rem;border-radius:12px}.navlinks .nav-cta{display:block;text-align:center}.buttons a{width:100%;text-align:center}}
  `;
  document.head.appendChild(style);
}

function bootClarity() {
  addGlobalPolishStyles();
  repairRequestLinks();
  addMobileNavSupport();
  addLaunchFooterLinks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootClarity);
} else {
  bootClarity();
}
