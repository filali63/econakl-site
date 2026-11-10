/* Écran d'ouverture : une fois par visite, passable, désactivé si l'utilisateur limite les animations. */
(function () {
  var d = document.documentElement;
  var seen = false;
  try { seen = sessionStorage.getItem("econakl-intro") === "1"; } catch (e) {}
  var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (seen || calm) { d.classList.add("intro-off"); return; }
  d.classList.add("intro-on");
  try { sessionStorage.setItem("econakl-intro", "1"); } catch (e) {}
  function end() { d.classList.add("intro-done"); setTimeout(function () { d.classList.add("intro-off"); d.classList.remove("intro-on"); }, 700); }
  var t = setTimeout(end, 2300);
  document.addEventListener("DOMContentLoaded", function () {
    var el = document.querySelector(".intro");
    if (el) el.addEventListener("click", function () { clearTimeout(t); end(); });
  });
  document.addEventListener("keydown", function k() { clearTimeout(t); end(); document.removeEventListener("keydown", k); });
})();
