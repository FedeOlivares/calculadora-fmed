(function () {
  "use strict";

  var CATEGORIAS = [
    { id: "parciales",  nombre: "Parciales" },
    { id: "encuentros", nombre: "Encuentros clínicos" },
    { id: "continua",   nombre: "Evaluación continua" },
    { id: "portafolio", nombre: "Portafolio" }
  ];

  var EVALUACIONES = [
    { id: "parcial1",   nombre: "Primer parcial",            peso: 20, categoria: "parciales" },
    { id: "parcial2",   nombre: "Segundo parcial",           peso: 20, categoria: "parciales" },
    { id: "encuentro1", nombre: "Primer encuentro clínico",  peso: 10, categoria: "encuentros" },
    { id: "encuentro2", nombre: "Segundo encuentro clínico", peso: 10, categoria: "encuentros" },
    { id: "continua",   nombre: "Evaluación continua",       peso: 30, categoria: "continua" },
    { id: "portafolio", nombre: "Portafolio",                peso: 10, categoria: "portafolio" }
  ];

  var MAX_NO_JUSTIFICADAS = 10;
  var MAX_JUSTIFICADAS = 20;
  var EPS = 1e-9;

  var $ = function (id) { return document.getElementById(id); };

  function num(input) {
    var v = parseFloat(input.value);
    return isNaN(v) ? 0 : v;
  }

  // ---- construir tablas ----
  var tbodyPesos = $("c-tablaPesos");
  var tbodyRes = $("c-tablaResultados");

  EVALUACIONES.forEach(function (ev) {
    var trPeso = document.createElement("tr");
    trPeso.innerHTML =
      '<td><span class="nombre">' + ev.nombre + "</span></td>" +
      '<td><input type="number" min="0" max="100" step="0.5" id="c-peso-' + ev.id + '" value="' + ev.peso + '"> %</td>';
    tbodyPesos.appendChild(trPeso);

    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td><span class="nombre">' + ev.nombre + "</span></td>" +
      "<td>" +
        '<select id="c-modo-' + ev.id + '">' +
          '<option value="pct">%</option>' +
          '<option value="pts">Puntos</option>' +
        "</select>" +
      "</td>" +
      "<td>" +
        '<span id="c-entrada-pct-' + ev.id + '">' +
          '<input type="number" min="0" max="100" step="0.1" id="c-pct-' + ev.id + '" placeholder="0"> %' +
        "</span>" +
        '<span class="puntos-wrap oculto" id="c-entrada-pts-' + ev.id + '">' +
          '<input type="number" min="0" step="any" id="c-pts-x-' + ev.id + '" placeholder="0">' +
          '<span class="de">de</span>' +
          '<input type="number" min="1" step="any" id="c-pts-y-' + ev.id + '" placeholder="0">' +
        "</span>" +
      "</td>";
    tbodyRes.appendChild(tr);
  });

  // ---- cálculo ----
  // % obtenido en una evaluación (0–100)
  function porcentajeDe(ev) {
    if ($("c-modo-" + ev.id).value === "pct") {
      return Math.min(100, Math.max(0, num($("c-pct-" + ev.id))));
    }
    var x = num($("c-pts-x-" + ev.id));
    var y = num($("c-pts-y-" + ev.id));
    if (y <= 0) return 0;
    return Math.min(100, Math.max(0, (x / y) * 100));
  }

  function actualizarModo(ev) {
    var modo = $("c-modo-" + ev.id).value;
    $("c-entrada-pct-" + ev.id).classList.toggle("oculto", modo !== "pct");
    $("c-entrada-pts-" + ev.id).classList.toggle("oculto", modo !== "pts");
  }

  function evaluarAsistencia() {
    var total = num($("c-totalClases"));
    var detalle = $("c-detalleAsistencia");
    var aviso = $("c-avisoAsistencia");

    if (total <= 0) {
      detalle.textContent = "Ingresá el total de clases para verificar el porcentaje de inasistencias.";
      detalle.classList.remove("error");
      aviso.classList.remove("visible");
      return true;
    }

    var noJustificadas = (num($("c-faltasNJ")) / total) * 100;
    var justificadas = (num($("c-faltasJ")) / total) * 100;
    var njOk = noJustificadas <= MAX_NO_JUSTIFICADAS + EPS;
    var jOk = justificadas <= MAX_JUSTIFICADAS + EPS;

    detalle.textContent =
      "No justificadas: " + noJustificadas.toFixed(1) + "% (máx. " + MAX_NO_JUSTIFICADAS + "%) · " +
      "Justificadas: " + justificadas.toFixed(1) + "% (máx. " + MAX_JUSTIFICADAS + "%)";
    detalle.classList.toggle("error", !njOk || !jOk);

    if (!njOk || !jOk) {
      aviso.textContent = !njOk
        ? "Superás el " + MAX_NO_JUSTIFICADAS + "% de inasistencias no justificadas: el resultado es Reprobado y hay que volver a cursar."
        : "Superás el " + MAX_JUSTIFICADAS + "% de inasistencias justificadas: el resultado es Reprobado y hay que volver a cursar.";
      aviso.classList.add("visible");
    } else {
      aviso.classList.remove("visible");
    }
    return njOk && jOk;
  }

  function calcular() {
    var asistenciaOk = evaluarAsistencia();

    var sumaPesos = 0;
    EVALUACIONES.forEach(function (ev) {
      sumaPesos += num($("c-peso-" + ev.id));
    });
    var sp = $("c-sumaPesos");
    var sumaIncorrecta = Math.abs(sumaPesos - 100) > 0.01;
    sp.textContent = "Suma de pesos: " + sumaPesos.toFixed(1) + "%" + (sumaIncorrecta ? " — debería sumar 100%" : "");
    sp.classList.toggle("error", sumaIncorrecta);

    var final = 0;
    var categorias = {};
    CATEGORIAS.forEach(function (c) { categorias[c.id] = { puntos: 0, peso: 0 }; });
    EVALUACIONES.forEach(function (ev) {
      var pct = porcentajeDe(ev);
      var peso = num($("c-peso-" + ev.id));
      final += pct * (peso / 100);
      categorias[ev.categoria].puntos += pct * peso;
      categorias[ev.categoria].peso += peso;
    });

    $("c-nota").textContent = final.toFixed(1);

    // mínimo 40% en cada evaluación (parciales, encuentros, continua, portafolio)
    var faltantes = [];
    var html = "";
    CATEGORIAS.forEach(function (c) {
      var d = categorias[c.id];
      var pct = d.peso > 0 ? d.puntos / d.peso : 0;
      var ok = pct >= 40 - EPS;
      if (!ok) faltantes.push(c.nombre.toLowerCase());
      html +=
        '<li class="' + (ok ? "ok" : "falta") + '">' +
          '<span class="modulo-nombre">' + (ok ? "✓ " : "✗ ") + c.nombre + "</span>" +
          '<span class="modulo-pts">' + pct.toFixed(1) + "%</span>" +
        "</li>";
    });
    $("c-categorias").innerHTML = html;

    var veredicto = $("c-veredicto");
    var detalle = $("c-detalle");
    veredicto.classList.remove("exonera", "examen", "recursa");

    if (!asistenciaOk) {
      veredicto.textContent = "DEBE RECURSAR";
      veredicto.classList.add("recursa");
      detalle.textContent = "Reprobado: superás el máximo de inasistencias permitido.";
    } else if (final < 40 - EPS) {
      veredicto.textContent = "DEBE RECURSAR";
      veredicto.classList.add("recursa");
      detalle.textContent = "Reprobado: la calificación final está por debajo del 40%.";
    } else if (final >= 60 - EPS && faltantes.length === 0) {
      veredicto.textContent = "EXONERA";
      veredicto.classList.add("exonera");
      detalle.textContent = "Aprobado con exoneración de examen: calificación final ≥ 60% y al menos 40% en cada evaluación.";
    } else {
      veredicto.textContent = "RINDE EXAMEN";
      veredicto.classList.add("examen");
      detalle.textContent = final >= 60 - EPS
        ? "La calificación final alcanza, pero no llegás al 40% en: " + faltantes.join(", ") + "."
        : "Calificación final entre 40% y 59%.";
    }
  }

  // ---- eventos ----
  EVALUACIONES.forEach(function (ev) {
    $("c-modo-" + ev.id).addEventListener("change", function () {
      actualizarModo(ev);
      calcular();
    });
    ["c-peso-", "c-pct-", "c-pts-x-", "c-pts-y-"].forEach(function (prefijo) {
      $(prefijo + ev.id).addEventListener("input", calcular);
    });
  });
  ["c-totalClases", "c-faltasNJ", "c-faltasJ"].forEach(function (id) {
    $(id).addEventListener("input", calcular);
  });

  calcular();
})();
