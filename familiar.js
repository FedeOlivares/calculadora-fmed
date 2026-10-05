(function () {
  "use strict";

  var EVALUACIONES = [
    { id: "continua", nombre: "Evaluación continua (rúbrica)", peso: 40, modo: "pts", de: 40 },
    { id: "ecps1",    nombre: "Primer ECPS",                   peso: 20, modo: "pct", ecps: true },
    { id: "ecps2",    nombre: "Segundo ECPS",                  peso: 20, modo: "pct", ecps: true },
    { id: "parcial1", nombre: "Primer parcial",                peso: 10, modo: "pct" },
    { id: "parcial2", nombre: "Segundo parcial",               peso: 10, modo: "pct" }
  ];

  var MAX_NO_JUSTIFICADAS = 10;
  var MAX_JUSTIFICADAS = 20;
  var MIN_CONTINUA = 40;
  var MIN_ECPS = 60;
  var EPS = 1e-9;

  var $ = function (id) { return document.getElementById(id); };

  function num(input) {
    var v = parseFloat(input.value);
    return isNaN(v) ? 0 : v;
  }

  // ---- construir tablas ----
  var tbodyPesos = $("f-tablaPesos");
  var tbodyRes = $("f-tablaResultados");

  EVALUACIONES.forEach(function (ev) {
    var trPeso = document.createElement("tr");
    trPeso.innerHTML =
      '<td><span class="nombre">' + ev.nombre + "</span></td>" +
      '<td><input type="number" min="0" max="100" step="0.5" id="f-peso-' + ev.id + '" value="' + ev.peso + '"> %</td>';
    tbodyPesos.appendChild(trPeso);

    var enPuntos = ev.modo === "pts";
    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td><span class="nombre">' + ev.nombre + "</span></td>" +
      "<td>" +
        '<select id="f-modo-' + ev.id + '">' +
          '<option value="pct"' + (enPuntos ? "" : " selected") + ">%</option>" +
          '<option value="pts"' + (enPuntos ? " selected" : "") + ">Puntos</option>" +
        "</select>" +
      "</td>" +
      "<td>" +
        '<span class="' + (enPuntos ? "oculto" : "") + '" id="f-entrada-pct-' + ev.id + '">' +
          '<input type="number" min="0" max="100" step="0.1" id="f-pct-' + ev.id + '" placeholder="0"> %' +
        "</span>" +
        '<span class="puntos-wrap' + (enPuntos ? "" : " oculto") + '" id="f-entrada-pts-' + ev.id + '">' +
          '<input type="number" min="0" step="any" id="f-pts-x-' + ev.id + '" placeholder="0">' +
          '<span class="de">de</span>' +
          '<input type="number" min="1" step="any" id="f-pts-y-' + ev.id + '"' +
            (ev.de ? ' value="' + ev.de + '"' : ' placeholder="0"') + ">" +
        "</span>" +
      "</td>";
    tbodyRes.appendChild(tr);
  });

  // ---- cálculo ----
  // % obtenido en una evaluación (0–100)
  function porcentajeDe(ev) {
    if ($("f-modo-" + ev.id).value === "pct") {
      return Math.min(100, Math.max(0, num($("f-pct-" + ev.id))));
    }
    var x = num($("f-pts-x-" + ev.id));
    var y = num($("f-pts-y-" + ev.id));
    if (y <= 0) return 0;
    return Math.min(100, Math.max(0, (x / y) * 100));
  }

  function actualizarModo(ev) {
    var modo = $("f-modo-" + ev.id).value;
    $("f-entrada-pct-" + ev.id).classList.toggle("oculto", modo !== "pct");
    $("f-entrada-pts-" + ev.id).classList.toggle("oculto", modo !== "pts");
  }

  function evaluarAsistencia() {
    var total = num($("f-totalClases"));
    var detalle = $("f-detalleAsistencia");
    var aviso = $("f-avisoAsistencia");

    if (total <= 0) {
      detalle.textContent = "Ingresá el total de clases para verificar el porcentaje de inasistencias.";
      detalle.classList.remove("error");
      aviso.classList.remove("visible");
      return true;
    }

    var noJustificadas = (num($("f-faltasNJ")) / total) * 100;
    var justificadas = (num($("f-faltasJ")) / total) * 100;
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

  function itemRequisito(ok, nombre, valor) {
    return '<li class="' + (ok ? "ok" : "falta") + '">' +
      '<span class="modulo-nombre">' + (ok ? "✓ " : "✗ ") + nombre + "</span>" +
      '<span class="modulo-pts">' + valor + "</span>" +
    "</li>";
  }

  function calcular() {
    var asistenciaOk = evaluarAsistencia();
    var tareasOk = $("f-tareasEva").checked;
    var ambosEcps = $("f-ambosEcps").checked;

    var avisoTareas = $("f-avisoTareas");
    avisoTareas.textContent = "Sin completar todas las tareas obligatorias de EVA el resultado es Reprobado: hay que volver a cursar.";
    avisoTareas.classList.toggle("visible", !tareasOk);

    var avisoEcps = $("f-avisoEcps");
    avisoEcps.textContent = "Sin rendir ambos ECPS no es posible exonerar: como máximo, rendís examen.";
    avisoEcps.classList.toggle("visible", !ambosEcps);

    var sumaPesos = 0;
    EVALUACIONES.forEach(function (ev) {
      sumaPesos += num($("f-peso-" + ev.id));
    });
    var sp = $("f-sumaPesos");
    var sumaIncorrecta = Math.abs(sumaPesos - 100) > 0.01;
    sp.textContent = "Suma de pesos: " + sumaPesos.toFixed(1) + "%" + (sumaIncorrecta ? " — debería sumar 100%" : "");
    sp.classList.toggle("error", sumaIncorrecta);

    var global = 0;
    var continua = 0;
    var ecpsPuntos = 0;
    var ecpsPeso = 0;
    EVALUACIONES.forEach(function (ev) {
      var pct = porcentajeDe(ev);
      var peso = num($("f-peso-" + ev.id));
      global += pct * (peso / 100);
      if (ev.id === "continua") continua = pct;
      if (ev.ecps) {
        ecpsPuntos += pct * peso;
        ecpsPeso += peso;
      }
    });
    var ecps = ecpsPeso > 0 ? ecpsPuntos / ecpsPeso : 0;

    $("f-nota").textContent = global.toFixed(1);

    var continuaOk = continua >= MIN_CONTINUA - EPS;
    var ecpsOk = ambosEcps && ecps >= MIN_ECPS - EPS;
    $("f-requisitos").innerHTML =
      itemRequisito(continuaOk, "Evaluación continua (mín. " + MIN_CONTINUA + "%)", continua.toFixed(1) + "%") +
      itemRequisito(ecpsOk, "ECPS entre ambos (mín. " + MIN_ECPS + "%)", ambosEcps ? ecps.toFixed(1) + "%" : "falta rendir");

    var veredicto = $("f-veredicto");
    var detalle = $("f-detalle");
    veredicto.classList.remove("exonera", "examen", "recursa");

    var motivosReprobado = [];
    if (!asistenciaOk) motivosReprobado.push("superás el máximo de inasistencias");
    if (!tareasOk) motivosReprobado.push("faltan tareas obligatorias de EVA");
    if (global < 40 - EPS) motivosReprobado.push("la nota global está por debajo del 40%");
    if (!continuaOk) motivosReprobado.push("la evaluación continua está por debajo del 40%");

    if (motivosReprobado.length > 0) {
      veredicto.textContent = "DEBE RECURSAR";
      veredicto.classList.add("recursa");
      detalle.textContent = "Reprobado: " + motivosReprobado.join("; ") + ".";
    } else if (global >= 60 - EPS && ecpsOk) {
      veredicto.textContent = "EXONERA";
      veredicto.classList.add("exonera");
      detalle.textContent = "Aprobado con exoneración de examen: nota global ≥ 60% y al menos 60% entre ambos ECPS.";
    } else {
      veredicto.textContent = "RINDE EXAMEN";
      veredicto.classList.add("examen");
      var motivos = [];
      if (global < 60 - EPS) motivos.push("la nota global no llega al 60%");
      if (!ambosEcps) motivos.push("no rendiste ambos ECPS");
      else if (!ecpsOk) motivos.push("no llegás al 60% entre ambos ECPS");
      detalle.textContent = "Calificación “sin concepto”: " + motivos.join(" y ") + ".";
    }
  }

  // ---- eventos ----
  EVALUACIONES.forEach(function (ev) {
    $("f-modo-" + ev.id).addEventListener("change", function () {
      actualizarModo(ev);
      calcular();
    });
    ["f-peso-", "f-pct-", "f-pts-x-", "f-pts-y-"].forEach(function (prefijo) {
      $(prefijo + ev.id).addEventListener("input", calcular);
    });
  });
  ["f-totalClases", "f-faltasNJ", "f-faltasJ"].forEach(function (id) {
    $(id).addEventListener("input", calcular);
  });
  $("f-tareasEva").addEventListener("change", calcular);
  $("f-ambosEcps").addEventListener("change", calcular);

  calcular();
})();
