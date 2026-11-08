/* ============================================================
   Portal U.E. Estadal "Presbítero Fernando María Contreras"
   Lógica del lado del cliente (JavaScript puro, sin servidor).
   Ningún dato escrito en los formularios sale del dispositivo de la persona.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Utilidades ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function fechaLarga(iso) {
    if (!iso) return "";
    const p = iso.split("-");
    if (p.length !== 3) return iso;
    const d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return d.toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  }
  function fechaCorta(iso) {
    if (!iso) return "";
    const p = iso.split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : iso;
  }
  function seguro(fn) { try { return fn(); } catch (e) { return null; } }

  /* ---------- Datos de configuración en pantalla ---------- */
  function rellenarConfig() {
    $$("[data-cfg]").forEach(function (el) {
      const clave = el.getAttribute("data-cfg");
      const valor = CONFIG[clave];
      el.textContent = valor ? valor : (el.getAttribute("data-vacio") || "Consultar en la dirección del plantel");
      if (!valor) el.classList.add("vacio");
    });
    const anio = $("#anioPie");
    if (anio) anio.textContent = new Date().getFullYear();
  }

  /* ---------- Menú y tamaño de letra ---------- */
  function iniciarMenu() {
    const btn = $("#menuBtn"), nav = $("#menuNav");
    if (btn && nav) {
      btn.addEventListener("click", function () {
        const abierto = nav.classList.toggle("abierto");
        btn.setAttribute("aria-expanded", abierto ? "true" : "false");
      });
    }
    const tams = [100, 112, 125];
    let i = seguro(function () { return +localStorage.getItem("tamLetra"); }) || 0;
    if (i < 0 || i > 2) i = 0;
    function aplicar() {
      document.documentElement.style.fontSize = tams[i] + "%";
      seguro(function () { localStorage.setItem("tamLetra", String(i)); });
    }
    aplicar();
    const mas = $("#letraMas"), menos = $("#letraMenos");
    if (mas) mas.addEventListener("click", function () { if (i < 2) { i++; aplicar(); } });
    if (menos) menos.addEventListener("click", function () { if (i > 0) { i--; aplicar(); } });
  }

  /* ---------- Recaudos según nivel y grado ---------- */
  function recaudosPara(nivel, grado) {
    const R = CONFIG.recaudos;
    if (/inicial/i.test(nivel)) return R.todos.concat(R.inicial);
    if (/^1\.er/i.test(grado)) return R.todos.concat(R.primero);
    return R.todos.concat(R.segundoASexto);
  }

  /* ---------- INICIO ---------- */
  function paginaInicio() {
    const caja = $("#estadoInscripcion");
    if (!caja) return;
    const ins = CONFIG.inscripcion;
    if (ins.desde && ins.hasta) {
      caja.textContent = "Inscripciones del " + fechaLarga(ins.desde) + " al " + fechaLarga(ins.hasta) + ".";
    } else {
      caja.textContent = "Las fechas de inscripción serán publicadas por la dirección del plantel.";
    }
    const nota = $("#notaInscripcion");
    if (nota && ins.nota) nota.textContent = ins.nota;
    const per = $("#periodo");
    if (per) per.textContent = CONFIG.periodoEscolar;
  }

  /* ---------- RECAUDOS ---------- */
  function paginaRecaudos() {
    const lista = $("#listaRecaudos");
    if (!lista) return;
    const grupos = [
      { id: "ini", nombre: "Educación Inicial", fn: function () { return recaudosPara("Educación Inicial", ""); } },
      { id: "p1", nombre: "1.er grado", fn: function () { return recaudosPara("Educación Primaria", "1.er grado"); } },
      { id: "p26", nombre: "2.º a 6.º grado", fn: function () { return recaudosPara("Educación Primaria", "2.º grado"); } }
    ];
    const tabs = $("#pestanas");
    let actual = 0;
    let marcas = {};

    function dibujar() {
      const g = grupos[actual];
      const items = g.fn();
      lista.textContent = "";
      items.forEach(function (it, k) {
        const clave = g.id + k;
        const li = document.createElement("li");
        const lab = document.createElement("label");
        const cb = document.createElement("input");
        cb.type = "checkbox"; cb.checked = !!marcas[clave];
        const cont = document.createElement("div");
        const sp = document.createElement("span"); sp.textContent = it.t;
        const sm = document.createElement("small"); sm.textContent = it.d;
        cont.appendChild(sp); cont.appendChild(sm);
        lab.appendChild(cb); lab.appendChild(cont); li.appendChild(lab);
        if (cb.checked) li.classList.add("hecho");
        cb.addEventListener("change", function () {
          marcas[clave] = cb.checked;
          li.classList.toggle("hecho", cb.checked);
          progreso(items.length, g.id);
        });
        lista.appendChild(li);
      });
      progreso(items.length, g.id);
    }
    function progreso(total, id) {
      let hechos = 0;
      for (let k = 0; k < total; k++) if (marcas[id + k]) hechos++;
      $("#progresoBarra").style.width = (total ? (hechos / total) * 100 : 0) + "%";
      $("#progresoTxt").textContent = hechos + " de " + total + " recaudos listos";
    }
    grupos.forEach(function (g, idx) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = g.nombre;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", idx === 0 ? "true" : "false");
      b.addEventListener("click", function () {
        actual = idx;
        $$("button", tabs).forEach(function (x, j) { x.setAttribute("aria-selected", j === idx ? "true" : "false"); });
        dibujar();
      });
      tabs.appendChild(b);
    });
    const imp = $("#btnImprimirLista");
    if (imp) imp.addEventListener("click", function () { window.print(); });
    const pdfL = $("#btnPDFLista");
    if (pdfL) pdfL.addEventListener("click", function () {
      const g = grupos[actual];
      try {
        const bytes = PortalPDF.listaRecaudos({
          periodo: CONFIG.periodoEscolar, grupo: g.nombre, items: g.fn(),
          aviso: "Lista referencial. La secretaría puede solicitar documentos adicionales según cada caso. Ante cualquier duda, consulte directamente en el plantel."
        });
        PortalPDF.descargar(bytes, "Recaudos-inscripcion-" + g.id + ".pdf");
      } catch (e) { alert("No se pudo crear el PDF. Use el botón «Imprimir esta lista»."); }
    });
    dibujar();
  }

  /* ---------- NOTICIAS Y CONTACTO ---------- */
  function paginaNoticias() {
    const cont = $("#listaNoticias");
    if (!cont) return;
    if (!CONFIG.noticias.length) {
      cont.innerHTML = '<p class="vacio">Todavía no hay avisos publicados.</p>';
    }
    CONFIG.noticias.forEach(function (n) {
      const art = document.createElement("article");
      art.className = "tarjeta noticia";
      const t = document.createElement("time"); t.textContent = fechaLarga(n.fecha);
      const h = document.createElement("h3"); h.textContent = n.titulo;
      const p = document.createElement("p"); p.textContent = n.texto;
      art.appendChild(t); art.appendChild(h); art.appendChild(p);
      cont.appendChild(art);
    });

    const cr = $("#listaCronograma");
    if (!CONFIG.cronograma.length) {
      cr.innerHTML = '<li class="vacio">Las fechas del período escolar serán publicadas por la dirección del plantel.</li>';
    }
    CONFIG.cronograma.forEach(function (c) {
      const li = document.createElement("li");
      const f = document.createElement("span"); f.className = "f"; f.textContent = fechaLarga(c.fecha);
      const e = document.createElement("span"); e.textContent = c.evento;
      li.appendChild(f); li.appendChild(e); cr.appendChild(li);
    });

    const form = $("#formContacto");
    const aviso = $("#avisoCorreo");
    if (!CONFIG.correo) {
      aviso.textContent = "El correo institucional aún no está configurado en el portal, por lo que el envío de mensajes está desactivado. Mientras tanto, comuníquese directamente con la secretaría del plantel.";
      aviso.hidden = false;
      $("button[type=submit]", form).disabled = true;
    }
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!CONFIG.correo) return;
      const nom = $("#cNombre").value.trim(), asu = $("#cAsunto").value.trim(), msg = $("#cMensaje").value.trim();
      const cuerpo = msg + "\n\nAtentamente,\n" + nom;
      window.location.href = "mailto:" + CONFIG.correo + "?subject=" + encodeURIComponent(asu) + "&body=" + encodeURIComponent(cuerpo);
    });
  }

  /* ---------- PRE-CARGA DE DATOS ---------- */
  function paginaPrecarga() {
    const form = $("#formPrecarga");
    if (!form) return;
    const pasos = $$("fieldset.paso", form);
    const indic = $$("#indicador li");
    let n = 0;

    // Listas de nivel y grado
    const selNivel = $("#estNivel"), selGrado = $("#estGrado");
    Object.keys(CONFIG.niveles).forEach(function (nv) {
      const o = document.createElement("option"); o.value = nv; o.textContent = nv; selNivel.appendChild(o);
    });
    selNivel.addEventListener("change", function () {
      selGrado.textContent = "";
      const o0 = document.createElement("option"); o0.value = ""; o0.textContent = "Seleccione…"; selGrado.appendChild(o0);
      (CONFIG.niveles[selNivel.value] || []).forEach(function (g) {
        const o = document.createElement("option"); o.value = g; o.textContent = g; selGrado.appendChild(o);
      });
    });
    selNivel.dispatchEvent(new Event("change"));

    // Fecha máxima = hoy
    const hoy = new Date();
    const iso = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + String(hoy.getDate()).padStart(2, "0");
    $("#estFechaNac").max = iso;

    /* --- Validación --- */
    function edad(isoNac) {
      const p = isoNac.split("-");
      let e = hoy.getFullYear() - +p[0];
      const m = hoy.getMonth() + 1 - +p[1];
      if (m < 0 || (m === 0 && hoy.getDate() < +p[2])) e--;
      return e;
    }
    function mensaje(inp) {
      const v = inp.value.trim();
      if (inp.required && !v) return "Este campo es obligatorio.";
      if (inp.type === "checkbox") return (inp.required && !inp.checked) ? "Debe aceptar para continuar." : "";
      if (!v) return "";
      const tipo = inp.getAttribute("data-tipo");
      if (tipo === "cedula" && !/^\d{6,9}$/.test(v)) return "Escriba solo números, entre 6 y 9 dígitos.";
      if (tipo === "cedulaEscolar" && !/^[\dVEve\-]{6,14}$/.test(v)) return "Formato no válido. Ej.: 12345678901 o V-12345678.";
      if (tipo === "telefono" && !/^[\d\s\-+().]{7,20}$/.test(v)) return "Escriba un número de teléfono válido.";
      if (tipo === "nombre" && v.length < 2) return "Escriba al menos 2 letras.";
      if (inp.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Escriba un correo válido. Ej.: nombre@correo.com";
      if (tipo === "fechaNac") {
        if (v > iso) return "La fecha no puede ser posterior a hoy.";
        const e = edad(v);
        if (e < 2 || e > 14) return "La edad calculada (" + e + " años) no corresponde a Educación Inicial o Primaria.";
      }
      return "";
    }
    function validarCampo(inp) {
      const campo = inp.closest(".campo");
      const msg = mensaje(inp);
      campo.classList.toggle("malo", !!msg);
      $(".error", campo).textContent = msg;
      inp.setAttribute("aria-invalid", msg ? "true" : "false");
      return !msg;
    }
    function validarPaso(i) {
      let ok = true, primero = null;
      $$("input, select, textarea", pasos[i]).forEach(function (inp) {
        if (!validarCampo(inp)) { ok = false; if (!primero) primero = inp; }
      });
      if (primero) primero.focus();
      return ok;
    }
    $$("input, select, textarea", form).forEach(function (inp) {
      inp.addEventListener("blur", function () { if (inp.value || inp.closest(".campo").classList.contains("malo")) validarCampo(inp); });
      inp.addEventListener("input", function () { if (inp.closest(".campo").classList.contains("malo")) validarCampo(inp); });
    });

    /* --- Navegación entre pasos --- */
    function mostrar(i, desplazar) {
      n = i;
      pasos.forEach(function (p, k) { p.classList.toggle("visible", k === i); });
      indic.forEach(function (li, k) {
        li.classList.toggle("activo", k === i);
        li.classList.toggle("listo", k < i);
      });
      if (i === pasos.length - 1) dibujarResumen();
      if (desplazar) $("#formCaja").scrollIntoView({ behavior: "smooth", block: "start" });
    }
    $$("[data-sig]").forEach(function (b) {
      b.addEventListener("click", function () { if (validarPaso(n)) mostrar(n + 1, true); });
    });
    $$("[data-ant]").forEach(function (b) {
      b.addEventListener("click", function () { mostrar(n - 1, true); });
    });

    /* --- Resumen del último paso --- */
    const CAMPOS = [
      ["Datos del estudiante", [
        ["Apellidos", "estApellidos"], ["Nombres", "estNombres"], ["Cédula escolar / de identidad", "estCedulaEscolar"],
        ["Sexo", "estSexo"], ["Fecha de nacimiento", "estFechaNac"], ["Lugar de nacimiento", "estLugarNac"],
        ["Nivel", "estNivel"], ["Grado o nivel a cursar", "estGrado"], ["Tipo de ingreso", "estIngreso"], ["Plantel de procedencia", "estProcedencia"]]],
      ["Datos del representante", [
        ["Apellidos", "repApellidos"], ["Nombres", "repNombres"], ["Cédula de identidad", "repCedula"],
        ["Parentesco", "repParentesco"], ["Teléfono", "repTelefono"], ["Correo electrónico", "repCorreo"],
        ["Ocupación", "repOcupacion"], ["Dirección de habitación", "repDireccion"]]],
      ["Salud y contacto de emergencia", [
        ["Alergias", "estAlergias"], ["Condición médica relevante", "estCondicion"],
        ["Contacto de emergencia", "emerNombre"], ["Parentesco", "emerParentesco"], ["Teléfono de emergencia", "emerTelefono"]]]
    ];
    function valor(id) {
      const el = document.getElementById(id);
      if (!el) return "";
      let v = el.value.trim().replace(/\s+/g, " ");
      if (id === "estFechaNac") v = fechaCorta(v);
      return v;
    }
    function dibujarResumen() {
      const cont = $("#resumen");
      cont.textContent = "";
      CAMPOS.forEach(function (sec) {
        const h = document.createElement("h3"); h.textContent = sec[0]; cont.appendChild(h);
        const dl = document.createElement("dl");
        sec[1].forEach(function (c) {
          const dt = document.createElement("dt"); dt.textContent = c[0];
          const dd = document.createElement("dd"); dd.textContent = valor(c[1]) || "—";
          dl.appendChild(dt); dl.appendChild(dd);
        });
        cont.appendChild(dl);
      });
    }

    /* --- Generar planilla --- */
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      for (let i = 0; i < pasos.length; i++) {
        if (!validarPaso(i)) { mostrar(i, true); return; }
      }
      CAMPOS.forEach(function (sec) {
        sec[1].forEach(function (c) {
          $$('[data-f="' + c[1] + '"]').forEach(function (s) { s.textContent = valor(c[1]) || "—"; });
        });
      });
      const folio = "PC-" + hoy.getFullYear() + "-" + String(Math.floor(Math.random() * 100000)).padStart(5, "0");
      $$('[data-f="folio"]').forEach(function (s) { s.textContent = folio; });
      $$('[data-f="fechaEmision"]').forEach(function (s) { s.textContent = fechaCorta(iso); });
      $$('[data-f="periodo"]').forEach(function (s) { s.textContent = CONFIG.periodoEscolar; });
      const ul = $("#planRecaudos"); ul.textContent = "";
      recaudosPara(valor("estNivel"), valor("estGrado")).forEach(function (r) {
        const li = document.createElement("li"); li.textContent = r.t; ul.appendChild(li);
      });
      $("#formCaja").hidden = true;
      $("#msgPDF").textContent = "";
      $("#planillaWrap").classList.add("visible");
      $("#planillaWrap").scrollIntoView({ behavior: "smooth" });
    });

    $("#btnImprimir").addEventListener("click", function () { window.print(); });
    $("#btnPDF").addEventListener("click", function () {
      const v = {};
      CAMPOS.forEach(function (sec) { sec[1].forEach(function (c) { v[c[1]] = valor(c[1]) || "—"; }); });
      v.periodo = CONFIG.periodoEscolar;
      v.folio = $('[data-f="folio"]').textContent;
      v.fecha = $('[data-f="fechaEmision"]').textContent;
      v.recaudos = $$("#planRecaudos li").map(function (li) { return li.textContent; });
      const nombre = "Planilla-" + (v.estApellidos + "-" + v.estNombres).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + ".pdf";
      const msg = $("#msgPDF");
      try {
        PortalPDF.descargar(PortalPDF.planilla(v), nombre);
        msg.style.color = ""; msg.textContent = "✔ Listo: su PDF se descargó (busque «" + nombre + "» en Descargas).";
      } catch (e) {
        msg.style.color = "var(--rojo)"; msg.textContent = "No se pudo crear el PDF. Pruebe con «Imprimir ahora».";
      }
    });
    $("#btnCorregir").addEventListener("click", function () {
      $("#planillaWrap").classList.remove("visible");
      $("#formCaja").hidden = false; mostrar(0, true);
    });
    $("#btnNueva").addEventListener("click", function () {
      form.reset(); selNivel.dispatchEvent(new Event("change"));
      $$(".campo.malo", form).forEach(function (c) { c.classList.remove("malo"); });
      $$(".error", form).forEach(function (e) { e.textContent = ""; });
      $("#planillaWrap").classList.remove("visible");
      $("#formCaja").hidden = false; mostrar(0, true);
    });

    /* --- Datos de ejemplo (para demostraciones) --- */
    const ej = $("#btnEjemplo");
    if (ej && /[?&]demo\b/.test(location.search)) { $("#cajaEjemplo").hidden = false; }   // solo para demostraciones: precarga.html?demo
    if (ej) ej.addEventListener("click", function () {
      const d = {
        estApellidos: "Pérez Gómez", estNombres: "Valentina Sofía", estSexo: "Femenino", estFechaNac: "2018-03-14",
        estLugarNac: "San Cristóbal, Táchira", estNivel: "Educación Primaria", estIngreso: "Nuevo ingreso",
        estProcedencia: "Preescolar de ejemplo",
        repApellidos: "Gómez Rojas", repNombres: "María Elena", repCedula: "12345678", repParentesco: "Madre",
        repTelefono: "0414-0000000", repCorreo: "ejemplo@correo.com", repOcupacion: "Comerciante",
        repDireccion: "Calle principal, sector Centro, Capacho Nuevo",
        estAlergias: "Ninguna conocida", estCondicion: "Ninguna",
        emerNombre: "Carlos Pérez", emerParentesco: "Padre", emerTelefono: "0424-0000000"
      };
      Object.keys(d).forEach(function (k) { const el = document.getElementById(k); if (el) el.value = d[k]; });
      selNivel.dispatchEvent(new Event("change"));
      selGrado.value = "1.er grado";
      $("#aceptaDatos").checked = true;
    });

    mostrar(0, false);
  }

  /* ---------- Arranque ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    rellenarConfig();
    iniciarMenu();
    paginaInicio();
    paginaRecaudos();
    paginaNoticias();
    paginaPrecarga();
  });
})();
