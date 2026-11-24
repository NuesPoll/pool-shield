(() => {
  const control = document.getElementById("theme-choice");
  const allowed = ["system", "light", "dark"];
  let saved = "system";
  try { saved = localStorage.getItem("pool-shield-theme") || "system"; } catch {}
  function apply(value) {
    if (!allowed.includes(value)) value = "system";
    if (value === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = value;
    control.value = value;
  }
  apply(saved);
  control.addEventListener("change", () => {
    apply(control.value);
    try { localStorage.setItem("pool-shield-theme", control.value); } catch {}
  });
})();
