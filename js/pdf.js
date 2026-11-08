/* ============================================================
   Generador de PDF del portal (JavaScript puro, sin librerías).
   Arma el archivo PDF dentro del navegador de la persona:
   no usa servidor ni internet y no envía ningún dato.
   Tamaño de hoja: carta (216 x 279 mm).
   ============================================================ */
(function (root) {
  "use strict";

  var DATOS = root.PDF_DATOS;
  var AZUL_OSC = [0.051, 0.133, 0.376];   // #0d2260
  var GRIS_CLARO = [0.894, 0.922, 0.973]; // #e4ebf8
  var GRIS_NOTA = [0.96, 0.96, 0.96];
  var NEGRO = [0, 0, 0];
  var BLANCO = [1, 1, 1];

  /* ---------- Texto: codificación WinAnsi (acentos y ñ) ---------- */
  var ESPECIALES = { 8364: 128, 8218: 130, 402: 131, 8222: 132, 8230: 133, 8224: 134, 8225: 135, 710: 136, 8240: 137,
    352: 138, 8249: 139, 338: 140, 381: 142, 8216: 145, 8217: 146, 8220: 147, 8221: 148, 8226: 149, 8211: 150,
    8212: 151, 732: 152, 8482: 153, 353: 154, 8250: 155, 339: 156, 382: 158, 376: 159 };

  function codigos(s) {
    var out = [];
    s = String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ");
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i), b;
      if (c >= 32 && c < 127) b = c;
      else if (c >= 160 && c <= 255) b = c;
      else if (ESPECIALES[c]) b = ESPECIALES[c];
      else b = 63; // "?"
      out.push(b);
    }
    return out;
  }
  function ancho(s, negrita, tam) {
    var tabla = negrita ? DATOS.anchoHB : DATOS.anchoH, c = codigos(s), w = 0;
    for (var i = 0; i < c.length; i++) w += tabla[c[i]] || 0;
    return w * tam / 1000;
  }
  function escapar(s) {
    var c = codigos(s), r = "";
    for (var i = 0; i < c.length; i++) {
      var b = c[i];
      if (b === 40 || b === 41 || b === 92) r += "\\" + String.fromCharCode(b);
      else r += String.fromCharCode(b);
    }
    return r;
  }
  function num(n) { return (Math.round(n * 100) / 100).toString(); }
  function color(c) { return num(c[0]) + " " + num(c[1]) + " " + num(c[2]); }

  /* Divide un texto en líneas que quepan en maxW */
  function partir(s, negrita, tam, maxW) {
    s = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
    if (!s) return [""];
    var palabras = s.split(" "), lineas = [], actual = "";
    palabras.forEach(function (p) {
      while (ancho(p, negrita, tam) > maxW) {           // palabra más larga que la línea
        var k = p.length;
        while (k > 1 && ancho(p.slice(0, k), negrita, tam) > maxW) k--;
        if (actual) { lineas.push(actual); actual = ""; }
        lineas.push(p.slice(0, k)); p = p.slice(k);
      }
      var prueba = actual ? actual + " " + p : p;
      if (ancho(prueba, negrita, tam) <= maxW) actual = prueba;
      else { lineas.push(actual); actual = p; }
    });
    if (actual) lineas.push(actual);
    return lineas;
  }

  /* ---------- Documento ---------- */
  function Doc() { this.W = 612; this.H = 792; this.paginas = []; this.op = null; this.nueva(); }
  Doc.prototype.nueva = function () { this.op = []; this.paginas.push(this.op); };
  Doc.prototype.texto = function (x, y, s, o) {            // y = línea base, medida desde arriba
    o = o || {}; var tam = o.tam || 10;
    if (o.centro) x = x - ancho(s, o.negrita, tam) / 2;
    if (o.derecha) x = x - ancho(s, o.negrita, tam);
    this.op.push("BT /" + (o.negrita ? "F2" : "F1") + " " + num(tam) + " Tf " + color(o.color || NEGRO) +
      " rg " + num(x) + " " + num(this.H - y) + " Td (" + escapar(s) + ") Tj ET");
  };
  Doc.prototype.rect = function (x, y, w, h, o) {          // y = borde superior
    o = o || {}; var s = "q ";
    if (o.relleno) s += color(o.relleno) + " rg ";
    if (o.borde) s += color(o.borde) + " RG " + num(o.grosor || 0.7) + " w ";
    s += num(x) + " " + num(this.H - y - h) + " " + num(w) + " " + num(h) + " re ";
    s += o.relleno && o.borde ? "B" : o.relleno ? "f" : "S";
    this.op.push(s + " Q");
  };
  Doc.prototype.linea = function (x1, y1, x2, y2, grosor, c) {
    this.op.push("q " + color(c || NEGRO) + " RG " + num(grosor || 0.7) + " w " + num(x1) + " " + num(this.H - y1) +
      " m " + num(x2) + " " + num(this.H - y2) + " l S Q");
  };
  Doc.prototype.imagen = function (x, y, w, h) {
    this.op.push("q " + num(w) + " 0 0 " + num(h) + " " + num(x) + " " + num(this.H - y - h) + " cm /Im1 Do Q");
  };

  /* ---------- Serialización a bytes ---------- */
  function aBytes(s) {
    var u = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255;
    return u;
  }
  function base64ABytes(b64) {
    var bin = (root.atob || function (x) { return Buffer.from(x, "base64").toString("binary"); })(b64);
    return aBytes(bin);
  }

  Doc.prototype.bytes = function (titulo) {
    var self = this, partes = [], largo = 0, offsets = [];
    function agregar(u) { partes.push(u); largo += u.length; }
    function txt(s) { agregar(aBytes(s)); }
    function objeto(n, cuerpo) { offsets[n] = largo; txt(n + " 0 obj\n" + cuerpo + "\nendobj\n"); }

    var img = DATOS.escudo, jpg = base64ABytes(img.b64);
    var np = this.paginas.length, kids = [], i;
    for (i = 0; i < np; i++) kids.push((7 + i * 2) + " 0 R");

    txt("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");
    objeto(1, "<< /Type /Catalog /Pages 2 0 R >>");
    objeto(2, "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + np + " >>");
    objeto(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    objeto(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    offsets[5] = largo;
    txt("5 0 obj\n<< /Type /XObject /Subtype /Image /Width " + img.w + " /Height " + img.h +
      " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpg.length + " >>\nstream\n");
    agregar(jpg); txt("\nendstream\nendobj\n");
    objeto(6, "<< /Title (" + escapar(titulo || "Documento") + ") /Producer (Portal Escuela Contreras) >>");
    for (i = 0; i < np; i++) {
      var flujo = self.paginas[i].join("\n"), n = 7 + i * 2;
      objeto(n, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + self.W + " " + self.H + "] /Contents " + (n + 1) +
        " 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Im1 5 0 R >> >> >>");
      objeto(n + 1, "<< /Length " + flujo.length + " >>\nstream\n" + flujo + "\nendstream");
    }
    var total = 7 + np * 2, xref = largo;
    txt("xref\n0 " + total + "\n0000000000 65535 f \n");
    for (i = 1; i < total; i++) txt(("0000000000" + offsets[i]).slice(-10) + " 00000 n \n");
    txt("trailer\n<< /Size " + total + " /Root 1 0 R /Info 6 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");

    var salida = new Uint8Array(largo), pos = 0;
    partes.forEach(function (p) { salida.set(p, pos); pos += p.length; });
    return salida;
  };

  /* ---------- Piezas de diseño comunes ---------- */
  var MX = 40, ANCHO = 612 - 2 * MX;

  function encabezado(d, y, lineas) {
    var im = DATOS.escudo, h = 62, w = h * im.w / im.h;
    d.imagen(MX, y, w, h);
    var cx = MX + w + (ANCHO - w) / 2, ly = y + 12;
    lineas.forEach(function (l) {
      d.texto(cx, ly, l.t.toUpperCase(), { centro: true, tam: l.tam || 8.5, negrita: !!l.b });
      ly += (l.tam || 8.5) + 3.2;
    });
    var fin = y + h + 6;
    d.linea(MX, fin, MX + ANCHO, fin, 1.6, AZUL_OSC);
    d.linea(MX, fin + 2.6, MX + ANCHO, fin + 2.6, 0.5, AZUL_OSC);
    return fin + 12;
  }
  var ENC_ESCUELA = [
    { t: "República Bolivariana de Venezuela" },
    { t: "Ministerio del Poder Popular para la Educación" },
    { t: "Zona Educativa del Estado Táchira" },
    { t: "U.E. Estadal Presbítero Fernando María Contreras", b: true, tam: 9.5 },
    { t: "Capacho Nuevo · Municipio Independencia · Estado Táchira" }
  ];

  function barra(d, y, texto) {
    d.rect(MX, y, ANCHO, 15, { relleno: AZUL_OSC });
    d.texto(MX + 6, y + 10.8, texto.toUpperCase(), { tam: 9, negrita: true, color: BLANCO });
    return y + 15;
  }

  /* Tabla de 4 columnas: etiqueta | valor | etiqueta | valor.  filas = [[et, val, et, val], ...] */
  function tabla(d, y, filas) {
    var cw = [104, 162, 104, 162], tam = 9, inter = 11, pad = 3.5;
    filas.forEach(function (f) {
      var cel = [], alto = 0, k;
      for (k = 0; k < 4; k++) {
        var esEt = k % 2 === 0, tx = f[k] || "";
        var ls = partir(esEt || String(tx).indexOf("@") > -1 ? tx : String(tx).toUpperCase(), esEt, tam, cw[k] - 2 * pad - 1);
        cel.push(ls); alto = Math.max(alto, ls.length * inter + 2 * pad - 2);
      }
      var x = MX;
      for (k = 0; k < 4; k++) {
        d.rect(x, y, cw[k], alto, { relleno: k % 2 === 0 ? GRIS_CLARO : null, borde: [0.33, 0.33, 0.33], grosor: 0.6 });
        cel[k].forEach(function (l, j) {
          d.texto(x + pad, y + pad + 7 + j * inter, l, { tam: tam, negrita: k % 2 === 0 });
        });
        x += cw[k];
      }
      y += alto;
    });
    return y;
  }

  function hoyISO() {
    var h = new Date();
    return h.getFullYear() + "-" + ("0" + (h.getMonth() + 1)).slice(-2) + "-" + ("0" + h.getDate()).slice(-2);
  }
  function fechaCorta(iso) { var p = String(iso).split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : iso; }

  /* ---------- PLANILLA DE PRE-INSCRIPCIÓN ---------- */
  function planilla(v) {
    // v: objeto con todos los valores ya limpios (cadenas), v.recaudos = [textos], v.periodo, v.folio, v.fecha
    var d = new Doc(), y = 34;
    y = encabezado(d, y, ENC_ESCUELA);
    d.texto(306, y + 8, "PLANILLA DE PRE-INSCRIPCIÓN", { centro: true, tam: 14, negrita: true, color: AZUL_OSC });
    d.texto(306, y + 22, "Período escolar " + v.periodo, { centro: true, tam: 9.5 });
    d.texto(MX + ANCHO, y + 36, "N.º " + v.folio + "  ·  Emitida el " + v.fecha, { derecha: true, tam: 8.5 });
    y += 44;

    y = barra(d, y, "1. Datos del estudiante");
    y = tabla(d, y, [
      ["Apellidos", v.estApellidos, "Nombres", v.estNombres],
      ["Cédula escolar / identidad", v.estCedulaEscolar, "Sexo", v.estSexo],
      ["Fecha de nacimiento", v.estFechaNac, "Lugar de nacimiento", v.estLugarNac],
      ["Nivel", v.estNivel, "Grado / nivel a cursar", v.estGrado],
      ["Tipo de ingreso", v.estIngreso, "Plantel de procedencia", v.estProcedencia]
    ]);
    y = barra(d, y + 7, "2. Datos del representante");
    y = tabla(d, y, [
      ["Apellidos", v.repApellidos, "Nombres", v.repNombres],
      ["Cédula de identidad", v.repCedula, "Parentesco", v.repParentesco],
      ["Teléfono", v.repTelefono, "Correo electrónico", v.repCorreo],
      ["Ocupación", v.repOcupacion, "Dirección", v.repDireccion]
    ]);
    y = barra(d, y + 7, "3. Salud y contacto de emergencia");
    y = tabla(d, y, [
      ["Alergias", v.estAlergias, "Condición médica", v.estCondicion],
      ["Contacto de emergencia", v.emerNombre, "Parentesco", v.emerParentesco],
      ["Teléfono de emergencia", v.emerTelefono, "", ""]
    ]);
    y = barra(d, y + 7, "4. Recaudos que debe consignar");
    y += 7;
    var mitad = Math.ceil(v.recaudos.length / 2), colW = ANCHO / 2 - 6, yFin = y;
    [v.recaudos.slice(0, mitad), v.recaudos.slice(mitad)].forEach(function (col, c) {
      var yy = y, x = MX + c * (ANCHO / 2 + 2);
      col.forEach(function (r) {
        var ls = partir(r, false, 9, colW - 16);
        d.rect(x + 2, yy - 0.5, 7.5, 7.5, { borde: NEGRO, grosor: 0.7 });
        ls.forEach(function (l, j) { d.texto(x + 15, yy + 6.5 + j * 11, l, { tam: 9 }); });
        yy += ls.length * 11 + 3.5;
      });
      yFin = Math.max(yFin, yy);
    });
    y = yFin + 4;

    // Firmas (si no caben, pasan a una hoja nueva)
    if (y + 125 > 792 - 30) { d.nueva(); y = 40; }
    y += 40;
    var fw = (ANCHO - 40) / 3;
    ["Firma del representante", "Recibido por (secretaría)", "Sello de la institución"].forEach(function (t, i) {
      var x = MX + i * (fw + 20);
      d.linea(x, y, x + fw, y, 0.8);
      d.texto(x + fw / 2, y + 11, t, { centro: true, tam: 9 });
    });
    y += 26;
    var nota = "Esta planilla es una pre-carga de datos. La inscripción queda formalizada únicamente al consignar esta planilla firmada junto con los recaudos ante la secretaría del plantel. El representante declara que los datos aquí indicados son verdaderos.";
    var nl = partir(nota, false, 8.5, ANCHO - 14), nh = nl.length * 10.5 + 9;
    d.rect(MX, y, ANCHO, nh, { relleno: GRIS_NOTA, borde: [0.6, 0.6, 0.6], grosor: 0.6 });
    nl.forEach(function (l, j) { d.texto(MX + 7, y + 11 + j * 10.5, l, { tam: 8.5 }); });
    return d.bytes("Planilla de pre-inscripción " + v.folio);
  }

  /* ---------- LISTA DE RECAUDOS ---------- */
  function listaRecaudos(v) {
    // v: { periodo, grupo, items: [{t, d}], aviso }
    var d = new Doc(), y = 34;
    y = encabezado(d, y, ENC_ESCUELA);
    d.texto(306, y + 8, "RECAUDOS DE INSCRIPCIÓN", { centro: true, tam: 14, negrita: true, color: AZUL_OSC });
    d.texto(306, y + 22, v.grupo + "  ·  Período escolar " + v.periodo, { centro: true, tam: 9.5 });
    y += 40;
    v.items.forEach(function (it) {
      var l1 = partir(it.t, true, 11, ANCHO - 34), l2 = it.d ? partir(it.d, false, 9.5, ANCHO - 34) : [];
      var alto = l1.length * 14 + l2.length * 12 + 10;
      if (y + alto > 792 - 90) { d.nueva(); y = 40; }
      d.rect(MX + 2, y + 2, 12, 12, { borde: NEGRO, grosor: 0.9 });
      l1.forEach(function (l, j) { d.texto(MX + 26, y + 12 + j * 14, l, { tam: 11, negrita: true }); });
      l2.forEach(function (l, j) { d.texto(MX + 26, y + 12 + l1.length * 14 + j * 12 - 1, l, { tam: 9.5, color: [0.29, 0.34, 0.46] }); });
      y += alto;
      d.linea(MX, y - 3, MX + ANCHO, y - 3, 0.3, [0.8, 0.84, 0.92]);
    });
    y += 8;
    var nl = partir(v.aviso, false, 8.5, ANCHO - 14), nh = nl.length * 10.5 + 9;
    d.rect(MX, y, ANCHO, nh, { relleno: GRIS_NOTA, borde: [0.6, 0.6, 0.6], grosor: 0.6 });
    nl.forEach(function (l, j) { d.texto(MX + 7, y + 11 + j * 10.5, l, { tam: 8.5 }); });
    return d.bytes("Recaudos de inscripción");
  }

  /* ---------- Descarga ---------- */
  function descargar(bytes, nombre) {
    var blob = new Blob([bytes], { type: "application/pdf" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    if ("download" in a) {
      a.href = url; a.download = nombre; a.style.display = "none";
      document.body.appendChild(a); a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 4000);
    } else {
      window.open(url, "_blank");   // navegadores antiguos: se abre el PDF y se guarda desde allí
    }
  }

  root.PortalPDF = { planilla: planilla, listaRecaudos: listaRecaudos, descargar: descargar, hoyISO: hoyISO, fechaCorta: fechaCorta };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PortalPDF;
})(typeof window !== "undefined" ? window : globalThis);
