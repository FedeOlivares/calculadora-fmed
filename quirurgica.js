(function () {
  "use strict";

  var GRUPOS = [
    { titulo: "Primer parcial", items: [
      { id: "p1-pq", nombre: "Patología quirúrgica", modulo: "pq", max: 30 },
      { id: "p1-ap", nombre: "Anatomía patológica",  modulo: "ap", max: 10 }
    ]},
    { titulo: "Segundo parcial", items: [
      { id: "p2-pq", nombre: "Patología quirúrgica",              modulo: "pq", max: 30 },
      { id: "p2-ap", nombre: "Anatomía patológica",               modulo: "ap", max: 10 },
      { id: "p2-ml", nombre: "Medicina legal y ciencias forenses", modulo: "ml", max: 15 }
    ]},
    { titulo: "Taller de Medicina Legal", items: [
      { id: "taller-ml", nombre: "Evaluación continua y prueba escrita", modulo: "ml", max: 5, tallerML: true }
    ]}
  ];

  var MODULOS = [
    { id: "pq", nombre: "Patología quirúrgica" },
    { id: "ap", nombre: "Anatomía patológica" },
    { id: "ml", nombre: "Medicina legal y ciencias forenses" }
  ];

  var EPS = 1e-9;

  var ITEMS = [];
  GRUPOS.forEach(function (g, gi) {
    g.items.forEach(function (it) {
      it.grupo = gi;
      ITEMS.push(it);
    });
  });

  var $ = function (id) { return document.getElementById(id); };

  function num(input) {
    var v = parseFloat(input.value);
    return isNaN(v) ? 0 : v;
  }

  function fmt(n) {
    return Math.round(n * 10) / 10 + "";
  }

  // ---- construir tablas ----
  function filaGrupo(g, gi, columnas) {
    var tr = document.createElement("tr");
    tr.className = "grupo";
    tr.innerHTML = '<td colspan="' + columnas + '">' + g.titulo +
      ' <span class="grupo-max" data-q-grupo="' + gi + '"></span></td>';
    return tr;
  }

  var tbodyRes = $("q-tablaResultados");
  var tbodyMax = $("q-tablaMax");

  GRUPOS.forEach(function (g, gi) {
    tbodyRes.appendChild(filaGrupo(g, gi, 3));
    tbodyMax.appendChild(filaGrupo(g, gi, 2));

    g.items.forEach(function (it) {
      var tr = document.createElement("tr");
      tr.id = "q-fila-" + it.id;
      tr.innerHTML =
        '<td><span class="nombre">' + it.nombre + "</span></td>" +
        "<td>" +
          '<select id="q-modo-' + it.id + '">' +
            '<option value="pts">Puntos</option>' +
            '<option value="pct">%</option>' +
          "</select>" +
        "</td>" +
        "<td>" +
          '<span class="puntos-wrap" id="q-entrada-pts-' + it.id + '">' +
            '<input type="number" min="0" step="any" id="q-pts-x-' + it.id + '" placeholder="0">' +
            '<span class="de">de</span>' +
            '<input type="number" min="1" step="any" id="q-pts-y-' + it.id + '" value="' + it.max + '">' +
          "</span>" +
          '<span class="oculto" id="q-entrada-pct-' + it.id + '">' +
            '<input type="number" min="0" max="100" step="0.1" id="q-pct-' + it.id + '" placeholder="0"> %' +
          "</span>" +
        "</td>";
      tbodyRes.appendChild(tr);

      var trMax = document.createElement("tr");
      trMax.innerHTML =
        '<td><span class="nombre">' + it.nombre + "</span></td>" +
        '<td><input type="number" min="0" step="any" id="q-max-' + it.id + '" value="' + it.max + '"> pts</td>';
      tbodyMax.appendChild(trMax);
    });
  });

  // El "de __" sigue al máximo del ítem hasta que el usuario lo edita a mano.
  var denominadorAuto = {};
  ITEMS.forEach(function (it) { denominadorAuto[it.id] = true; });

  // ---- cálculo ----
  function modalidadControlada() {
    return $("q-controlada").checked;
  }

  // fracción obtenida de una evaluación (0–1)
  function fraccionDe(it) {
    if (it.tallerML && !modalidadControlada()) return 0;
    if ($("q-modo-" + it.id).value === "pct") {
      return Math.min(100, Math.max(0, num($("q-pct-" + it.id)))) / 100;
    }
    var x = num($("q-pts-x-" + it.id));
    var y = num($("q-pts-y-" + it.id));
    if (y <= 0) return 0;
    return Math.min(1, Math.max(0, x / y));
  }

  function actualizarModo(it) {
    var modo = $("q-modo-" + it.id).value;
    $("q-entrada-pts-" + it.id).classList.toggle("oculto", modo !== "pts");
    $("q-entrada-pct-" + it.id).classList.toggle("oculto", modo !== "pct");
  }

  function actualizarHabilitacion() {
    var controlada = modalidadControlada();
    ITEMS.forEach(function (it) {
      if (!it.tallerML) return;
      ["q-modo-", "q-pts-x-", "q-pts-y-", "q-pct-"].forEach(function (prefijo) {
        $(prefijo + it.id).disabled = !controlada;
      });
      $("q-fila-" + it.id).style.opacity = controlada ? "1" : "0.5";
    });

    var avisoML = $("q-avisoML");
    avisoML.textContent = "El Taller de Medicina Legal está disponible solo para la modalidad con asistencia controlada: no otorga puntaje (cuenta como 0).";
    avisoML.classList.toggle("visible", !controlada);

    var avisoHeridas = $("q-avisoHeridas");
    var asistio = $("q-heridasAsistencia").checked;
    var suficiente = $("q-heridasEval").value === "suficiente";
    if (!asistio || !suficiente) {
      avisoHeridas.textContent = !asistio
        ? "Sin asistir a las 3 instancias del Taller de tratamiento de heridas cutáneas el resultado es Reprobado: hay que volver a cursar."
        : "Con “insuficiente” en el Taller de tratamiento de heridas cutáneas el resultado es Reprobado: hay que volver a cursar.";
      avisoHeridas.classList.add("visible");
    } else {
      avisoHeridas.classList.remove("visible");
    }
  }

  function calcular() {
    actualizarHabilitacion();

    var total = 0;
    var sumaMax = 0;
    var maxGrupo = GRUPOS.map(function () { return 0; });
    var modulos = {};
    MODULOS.forEach(function (m) { modulos[m.id] = { pts: 0, max: 0 }; });

    ITEMS.forEach(function (it) {
      var max = Math.max(0, num($("q-max-" + it.id)));
      var pts = fraccionDe(it) * max;
      total += pts;
      sumaMax += max;
      maxGrupo[it.grupo] += max;
      modulos[it.modulo].pts += pts;
      modulos[it.modulo].max += max;
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-q-grupo]"), function (el) {
      el.textContent = "· " + fmt(maxGrupo[+el.getAttribute("data-q-grupo")]) + " pts";
    });

    var sp = $("q-sumaMax");
    sp.textContent = "Suma de puntajes: " + fmt(sumaMax) + " pts";
    var sumaIncorrecta = Math.abs(sumaMax - 100) > 0.01;
    sp.classList.toggle("error", sumaIncorrecta);
    if (sumaIncorrecta) sp.textContent += " — debería sumar 100";

    $("q-nota").textContent = total.toFixed(1);
    $("q-notaMax").textContent = fmt(sumaMax);

    // módulos: 40% de los puntos de cada uno
    var modulosFaltantes = [];
    var html = "";
    MODULOS.forEach(function (m) {
      var d = modulos[m.id];
      var pct = d.max > 0 ? (d.pts / d.max) * 100 : 0;
      var ok = pct >= 40 - EPS;
      if (!ok) modulosFaltantes.push(m.nombre.toLowerCase());
      html +=
        '<li class="' + (ok ? "ok" : "falta") + '">' +
          '<span class="modulo-nombre">' + (ok ? "✓ " : "✗ ") + m.nombre + "</span>" +
          '<span class="modulo-pts">' + d.pts.toFixed(1) + " / " + fmt(d.max) + "</span>" +
        "</li>";
    });
    $("q-modulos").innerHTML = html;

    var pctTotal = sumaMax > 0 ? (total / sumaMax) * 100 : 0;
    var asistio = $("q-heridasAsistencia").checked;
    var suficiente = $("q-heridasEval").value === "suficiente";

    var veredicto = $("q-veredicto");
    var detalle = $("q-detalle");
    veredicto.classList.remove("exonera", "examen", "recursa");

    if (!asistio || !suficiente) {
      veredicto.textContent = "DEBE RECURSAR";
      veredicto.classList.add("recursa");
      detalle.textContent = !asistio
        ? "Reprobado: no asististe a las 3 instancias del Taller de tratamiento de heridas cutáneas."
        : "Reprobado: evaluación “insuficiente” en el Taller de tratamiento de heridas cutáneas.";
    } else if (pctTotal < 40 - EPS) {
      veredicto.textContent = "DEBE RECURSAR";
      veredicto.classList.add("recursa");
      detalle.textContent = "Reprobado: el total está por debajo del 40% de los puntos del curso.";
    } else if (pctTotal >= 60 - EPS && modulosFaltantes.length === 0) {
      veredicto.textContent = "EXONERA";
      veredicto.classList.add("exonera");
      detalle.textContent = "Aprobado con exoneración de examen: total ≥ 60% y al menos 40% en cada módulo.";
    } else {
      veredicto.textContent = "RINDE EXAMEN";
      veredicto.classList.add("examen");
      detalle.textContent = pctTotal >= 60 - EPS
        ? "El total alcanza, pero no llegás al 40% en: " + modulosFaltantes.join(", ") + "."
        : "Total entre 40% y 59% de los puntos del curso.";
    }
  }

  // ---- eventos ----
  ITEMS.forEach(function (it) {
    $("q-modo-" + it.id).addEventListener("change", function () {
      actualizarModo(it);
      calcular();
    });
    $("q-pts-y-" + it.id).addEventListener("input", function () {
      denominadorAuto[it.id] = false;
      calcular();
    });
    $("q-max-" + it.id).addEventListener("input", function () {
      if (denominadorAuto[it.id]) {
        $("q-pts-y-" + it.id).value = $("q-max-" + it.id).value;
      }
      calcular();
    });
    ["q-pts-x-", "q-pct-"].forEach(function (prefijo) {
      $(prefijo + it.id).addEventListener("input", calcular);
    });
  });
  $("q-heridasAsistencia").addEventListener("change", calcular);
  $("q-heridasEval").addEventListener("change", calcular);
  $("q-controlada").addEventListener("change", calcular);

  calcular();
})();
