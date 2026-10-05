(function () {
  "use strict";

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var anios = Array.prototype.slice.call(document.querySelectorAll(".anio"));
  var ultimaPorAnio = {};

  function tabsDelAnio(anio) {
    return tabs.filter(function (t) { return t.getAttribute("data-anio") === anio; });
  }

  function activar(nombre, actualizarHash) {
    var elegida = tabs.filter(function (t) { return t.getAttribute("data-tab") === nombre; })[0] || tabs[0];
    var anio = elegida.getAttribute("data-anio");
    ultimaPorAnio[anio] = elegida;

    anios.forEach(function (a) {
      a.setAttribute("aria-pressed", a.getAttribute("data-anio") === anio ? "true" : "false");
    });
    tabs.forEach(function (t) {
      var activa = t === elegida;
      t.hidden = t.getAttribute("data-anio") !== anio;
      t.setAttribute("aria-selected", activa ? "true" : "false");
      t.tabIndex = activa ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !activa;
    });

    document.title = "Calculadora — " + elegida.textContent;
    if (actualizarHash && window.history && history.replaceState) {
      history.replaceState(null, "", "#" + elegida.getAttribute("data-tab"));
    }
    return elegida;
  }

  anios.forEach(function (a) {
    a.addEventListener("click", function () {
      var anio = a.getAttribute("data-anio");
      var destino = ultimaPorAnio[anio] || tabsDelAnio(anio)[0];
      activar(destino.getAttribute("data-tab"), true);
    });
  });

  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      activar(t.getAttribute("data-tab"), true);
    });
    t.addEventListener("keydown", function (e) {
      var paso = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!paso) return;
      e.preventDefault();
      var visibles = tabsDelAnio(t.getAttribute("data-anio"));
      var i = visibles.indexOf(t);
      var siguiente = visibles[(i + paso + visibles.length) % visibles.length];
      activar(siguiente.getAttribute("data-tab"), true).focus();
    });
  });

  window.addEventListener("hashchange", function () {
    activar(location.hash.slice(1), false);
  });

  activar(location.hash.slice(1), false);
})();
