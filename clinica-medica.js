(function () {
  "use strict";

  // Componentes de la calificación final. Dentro de cada componente,
  // las instancias se promedian en partes iguales.
  var COMPONENTES = [
    { id: "parciales", nombre: "Parciales escritos", peso: 30, items: [
      { id: "parcial1", nombre: "Primer parcial",  modo: "pct" },
      { id: "parcial2", nombre: "Segundo parcial", modo: "pct" }
    ]},
    { id: "encuentros", nombre: "Encuentros clínicos", peso: 40, items: [
      { id: "ec1", nombre: "Primer encuentro clínico",  modo: "nota" },
      { id: "ec2", nombre: "Segundo encuentro clínico", modo: "nota" },
      { id: "ec3", nombre: "Tercer encuentro clínico",  modo: "nota" }
    ]},
    { id: "continua", nombre: "Evaluación continua", peso: 30, items: [
      { id: "continua", nombre: "Evaluación continua", modo: "pct" }
    ]}
  ];

  var MAX_NO_JUSTIFICADAS = 10;
  var MAX_JUSTIFICADAS = 20;
  var MIN_CONTINUA = 40;      // % del total de la evaluación continua
  var MIN_NOTA_ENCUENTRO = 2; // escala 0–10
  var MIN_ENCUENTROS_OK = 2;
  var EPS = 1e-9;

  var $ = function (id) { return document.getElementById(id); };

  function num(input) {
    var v = parseFloat(input.value);
    return isNaN(v) ? 0 : v;
  }

  function fmt(n) {
    return Math.round(n * 10) / 10 + "";
  }

  // ---- construir tablas ----
  var tbodyRes = $("cm-tablaResultados");
  var tbodyPesos = $("cm-tablaPesos");

  function selectModo(it) {
    if (it.modo === "nota") {
      return '<select id="cm-modo-' + it.id + '">' +
        '<option value="nota" selected>Nota 0–10</option>' +
        '<option value="pct">%</option>' +
      "</select>";
    }
    return '<select id="cm-modo-' + it.id + '">' +
      '<option value="pct" selected>%</option>' +
      '<option value="pts">Puntos</option>' +
    "</select>";
  }

  function entradas(it) {
    var html = "";
    if (it.modo === "nota") {
      html += '<span id="cm-entrada-nota-' + it.id + '">' +
        '<input type="number" min="0" max="10" step="0.1" id="cm-nota-' + it.id + '" placeholder="0"> / 10' +
      "</span>";
    }
    html += '<span class="' + (it.modo === "pct" ? "" : "oculto") + '" id="cm-entrada-pct-' + it.id + '">' +
      '<input type="number" min="0" max="100" step="0.1" id="cm-pct-' + it.id + '" placeholder="0"> %' +
    "</span>";
    if (it.modo !== "nota") {
      html += '<span class="puntos-wrap oculto" id="cm-entrada-pts-' + it.id + '">' +
        '<input type="number" min="0" step="any" id="cm-pts-x-' + it.id + '" placeholder="0">' +
        '<span class="de">de</span>' +
        '<input type="number" min="1" step="any" id="cm-pts-y-' + it.id + '" placeholder="0">' +
      "</span>";
    }
    return html;
  }

  COMPONENTES.forEach(function (c) {
    var trGrupo = document.createElement("tr");
    trGrupo.className = "grupo";
    trGrupo.innerHTML = '<td colspan="3">' + c.nombre +
      ' <span class="grupo-max" id="cm-grupo-' + c.id + '"></span></td>';
    tbodyRes.appendChild(trGrupo);

    c.items.forEach(function (it) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td><span class="nombre">' + it.nombre + "</span></td>" +
        "<td>" + selectModo(it) + "</td>" +
        "<td>" + entradas(it) + "</td>";
      tbodyRes.appendChild(tr);
    });

    var trPeso = document.createElement("tr");
    trPeso.innerHTML =
      '<td><span class="nombre">' + c.nombre + "</span></td>" +
      '<td><input type="number" min="0" max="100" step="0.5" id="cm-peso-' + c.id + '" value="' + c.peso + '"> %</td>';
    tbodyPesos.appendChild(trPeso);
  });

  // ---- cálculo ----
  // % obtenido en una instancia (0–100)
  function porcentajeDe(it) {
    var modo = $("cm-modo-" + it.id).value;
    if (modo === "nota") {
      return Math.min(10, Math.max(0, num($("cm-nota-" + it.id)))) * 10;
    }
    if (modo === "pct") {
      return Math.min(100, Math.max(0, num($("cm-pct-" + it.id))));
    }
    var x = num($("cm-pts-x-" + it.id));
    var y = num($("cm-pts-y-" + it.id));
    if (y <= 0) return 0;
    return Math.min(100, Math.max(0, (x / y) * 100));
  }

  function actualizarModo(it) {
    var modo = $("cm-modo-" + it.id).value;
    var nota = $("cm-entrada-nota-" + it.id);
    var pts = $("cm-entrada-pts-" + it.id);
    if (nota) nota.classList.toggle("oculto", modo !== "nota");
    if (pts) pts.classList.toggle("oculto", modo !== "pts");
    $("cm-entrada-pct-" + it.id).classList.toggle("oculto", modo !== "pct");
  }

  function evaluarAsistencia() {
    var total = num($("cm-totalClases"));
    var detalle = $("cm-detalleAsistencia");
    var aviso = $("cm-avisoAsistencia");

    if (total <= 0) {
      detalle.textContent = "Ingresá el total de clases para verificar el porcentaje de inasistencias.";
      detalle.classList.remove("error");
      aviso.classList.remove("visible");
      return true;
    }

    var noJustificadas = (num($("cm-faltasNJ")) / total) * 100;
    var justificadas = (num($("cm-faltasJ")) / total) * 100;
    var njOk = noJustificadas <= MAX_NO_JUSTIFICADAS + EPS;
    var jOk = justificadas <= MAX_JUSTIFICADAS + EPS;

    detalle.textContent =
      "No justificadas: " + noJustificadas.toFixed(1) + "% (máx. " + MAX_NO_JUSTIFICADAS + "%) · " +
      "Justificadas: " + justificadas.toFixed(1) + "% (máx. " + MAX_JUSTIFICADAS + "%)";
    detalle.classList.toggle("error", !njOk || !jOk);

    if (!njOk || !jOk) {
      aviso.textContent = !njOk
        ? "Superás el " + MAX_NO_JUSTIFICADAS + "% de inasistencias no justificadas: no quedás habilitado al cálculo de la calificación final y hay que volver a cursar."
        : "Superás el " + MAX_JUSTIFICADAS + "% de inasistencias justificadas: no quedás habilitado al cálculo de la calificación final y hay que volver a cursar.";
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
    var rindioTodos = $("cm-tresEncuentros").checked;

    var avisoEncuentros = $("cm-avisoEncuentros");
    avisoEncuentros.textContent = "Rendir los tres encuentros clínicos en los plazos establecidos es obligatorio: sin eso no quedás habilitado al cálculo de la calificación final y hay que volver a cursar.";
    avisoEncuentros.classList.toggle("visible", !rindioTodos);

    var sumaPesos = 0;
    COMPONENTES.forEach(function (c) {
      var peso = num($("cm-peso-" + c.id));
      sumaPesos += peso;
      $("cm-grupo-" + c.id).textContent = "· " + fmt(peso) + "%";
    });
    var sp = $("cm-sumaPesos");
    var sumaIncorrecta = Math.abs(sumaPesos - 100) > 0.01;
    sp.textContent = "Suma de pesos: " + sumaPesos.toFixed(1) + "%" + (sumaIncorrecta ? " — debería sumar 100%" : "");
    sp.classList.toggle("error", sumaIncorrecta);

    var final = 0;
    var promedio = {};
    var encuentrosOk = 0;
    COMPONENTES.forEach(function (c) {
      var suma = 0;
      c.items.forEach(function (it) {
        var pct = porcentajeDe(it);
        suma += pct;
        if (c.id === "encuentros" && pct / 10 >= MIN_NOTA_ENCUENTRO - EPS) encuentrosOk++;
      });
      promedio[c.id] = suma / c.items.length;
      final += promedio[c.id] * (num($("cm-peso-" + c.id)) / 100);
    });

    $("cm-nota").textContent = final.toFixed(1);

    var continuaOk = promedio.continua >= MIN_CONTINUA - EPS;
    var encuentrosNotaOk = encuentrosOk >= MIN_ENCUENTROS_OK;
    $("cm-requisitos").innerHTML =
      itemRequisito(asistenciaOk, "Asistencia", asistenciaOk ? "dentro del límite" : "excedida") +
      itemRequisito(continuaOk, "Evaluación continua (mín. " + MIN_CONTINUA + "%)", promedio.continua.toFixed(1) + "%") +
      itemRequisito(rindioTodos, "Rendir los 3 encuentros clínicos", rindioTodos ? "sí" : "no") +
      itemRequisito(encuentrosNotaOk, "Encuentros con nota ≥ " + MIN_NOTA_ENCUENTRO + " (mín. " + MIN_ENCUENTROS_OK + ")", encuentrosOk + " de 3");

    var veredicto = $("cm-veredicto");
    var detalle = $("cm-detalle");
    veredicto.classList.remove("exonera", "examen", "recursa");

    var noHabilitado = [];
    if (!asistenciaOk) noHabilitado.push("superás el máximo de inasistencias");
    if (!continuaOk) noHabilitado.push("la evaluación continua está por debajo del 40%");
    if (!rindioTodos) noHabilitado.push("no rendiste los tres encuentros clínicos");
    if (!encuentrosNotaOk) noHabilitado.push("menos de dos encuentros clínicos con nota ≥ " + MIN_NOTA_ENCUENTRO);

    if (noHabilitado.length > 0) {
      veredicto.textContent = "DEBE RECURSAR";
      veredicto.classList.add("recursa");
      detalle.textContent = "No cumplís los requisitos mínimos (" + noHabilitado.join("; ") + "): no quedás habilitado al cálculo de la calificación final.";
    } else if (final < 40 - EPS) {
      veredicto.textContent = "DEBE RECURSAR";
      veredicto.classList.add("recursa");
      detalle.textContent = "Reprobado: la calificación final está por debajo del 40%.";
    } else if (final >= 60 - EPS) {
      veredicto.textContent = "EXONERA";
      veredicto.classList.add("exonera");
      detalle.textContent = "Aprobado: calificación final ≥ 60% del total del curso.";
    } else {
      veredicto.textContent = "RINDE EXAMEN";
      veredicto.classList.add("examen");
      detalle.textContent = "Calificación final entre 40% y 59% del total del curso.";
    }
  }

  // ---- eventos ----
  COMPONENTES.forEach(function (c) {
    $("cm-peso-" + c.id).addEventListener("input", calcular);
    c.items.forEach(function (it) {
      $("cm-modo-" + it.id).addEventListener("change", function () {
        actualizarModo(it);
        calcular();
      });
      ["cm-nota-", "cm-pct-", "cm-pts-x-", "cm-pts-y-"].forEach(function (prefijo) {
        var el = $(prefijo + it.id);
        if (el) el.addEventListener("input", calcular);
      });
    });
  });
  ["cm-totalClases", "cm-faltasNJ", "cm-faltasJ"].forEach(function (id) {
    $(id).addEventListener("input", calcular);
  });
  $("cm-tresEncuentros").addEventListener("change", calcular);

  calcular();
})();
