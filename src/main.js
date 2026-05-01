import GLightbox from "glightbox";
import "glightbox/dist/css/glightbox.min.css";
import "./style.css";

GLightbox({
  selector: ".glightbox",
  touchNavigation: true,
  loop: true,
  zoomable: true,
  draggable: true,
  openEffect: "zoom",
  closeEffect: "fade",
});

const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

const headerEl = document.querySelector(".site-header");
const scrollThresholdPx = 32;

function updateHeaderScroll() {
  if (!headerEl) return;
  headerEl.classList.toggle("is-scrolled", window.scrollY > scrollThresholdPx);
}

window.addEventListener("scroll", updateHeaderScroll, { passive: true });
updateHeaderScroll();

const navToggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");
const mqMobileNav = window.matchMedia("(max-width: 900px)");

function resetGarnSubnav() {
  if (!nav) return;
  nav.querySelectorAll(".nav-primary > li.is-subnav-open").forEach((li) => {
    li.classList.remove("is-subnav-open");
    li.querySelector(":scope > .nav-subnav-trigger")?.setAttribute("aria-expanded", "false");
  });
}

function closeMobileNav() {
  document.body.classList.remove("nav-open");
  if (navToggle) {
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Åbn menu");
  }
  resetGarnSubnav();
}

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Luk menu" : "Åbn menu");
    if (!open) resetGarnSubnav();
  });

  nav.querySelectorAll(".nav-subnav-trigger").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!mqMobileNav.matches()) return;
      const li = btn.closest(".nav-primary > li");
      const wasOpen = li.classList.contains("is-subnav-open");
      nav.querySelectorAll(".nav-primary > li.is-subnav-open").forEach((openLi) => {
        if (openLi !== li) {
          openLi.classList.remove("is-subnav-open");
          openLi.querySelector(":scope > .nav-subnav-trigger")?.setAttribute("aria-expanded", "false");
        }
      });
      li.classList.toggle("is-subnav-open", !wasOpen);
      btn.setAttribute("aria-expanded", !wasOpen ? "true" : "false");
    });
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMobileNav();
    });
  });

  mqMobileNav.addEventListener("change", () => {
    if (!mqMobileNav.matches()) resetGarnSubnav();
  });
}
