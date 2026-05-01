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

const navToggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Luk menu" : "Åbn menu");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Åbn menu");
    });
  });
}
