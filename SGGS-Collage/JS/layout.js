async function loadComponent(id, file) {
  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`Failed to load ${file}`);
    const data = await res.text();
    document.getElementById(id).innerHTML = data;
  } catch (err) {
    console.error(err);
  }
}

function initNavbar() {
  const navbarCollapse = document.getElementById("navbarsExample");
  if (!navbarCollapse) return;

  const bsCollapse = new bootstrap.Collapse(navbarCollapse, { toggle: false });

  navbarCollapse.querySelectorAll(".nav-link:not(.dropdown-toggle), .dropdown-item")
    .forEach(link => link.addEventListener("click", () => {
      if (navbarCollapse.classList.contains("show")) bsCollapse.hide();
    }));
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadComponent("navbar", "/component/navbar.html");
  await loadComponent("footer", "/component/footer.html");

  try { initNavbar(); } 
  catch(err) { console.error("Navbar init failed:", err); }
});
