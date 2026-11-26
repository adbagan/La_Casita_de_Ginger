// La Casita de Ginger - Generador de la guía de despacho en PDF.
// Escribe el archivo PDF directamente (sin librerías externas), así funciona sin internet.
// Uso: generarGuiaDespacho(datosCliente, itemsDelCarrito, numeroDeGuia)

(function () {
  var ANCHO = 595.28, ALTO = 841.89; // hoja A4 en puntos
  var CAFE = [72, 33, 9], CARAMELO = [165, 62, 20], VAINILLA = [253, 240, 225], BLANCO = [255, 255, 255], GRIS = [111, 74, 51];

  // Anchos de la fuente Helvetica (caracteres 32 a 126), en milésimas de punto
  var ANCHOS = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
    278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722,
    667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556,
    333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  var ESPECIALES = { "—": 151, "–": 150, "“": 147, "”": 148, "‘": 145, "’": 146, "•": 149, "…": 133 };

  function anchoTexto(texto, tam, negrita) {
    var base = String(texto).normalize("NFD").replace(/[̀-ͯ]/g, "");
    var total = 0;
    for (var i = 0; i < base.length; i++) {
      var c = base.charCodeAt(i);
      total += (c >= 32 && c <= 126) ? ANCHOS[c - 32] : 556;
    }
    return total / 1000 * tam * (negrita ? 1.06 : 1);
  }

  // Convierte texto a una cadena PDF en codificación WinAnsi (permite tildes y ñ)
  function cadena(texto) {
    var salida = "";
    texto = String(texto);
    for (var i = 0; i < texto.length; i++) {
      var ch = texto[i], c = texto.charCodeAt(i);
      if (ESPECIALES[ch]) c = ESPECIALES[ch];
      if (ch === "(" || ch === ")" || ch === "\\") salida += "\\" + ch;
      else if (c >= 32 && c < 127) salida += ch;
      else if (c >= 128 && c <= 255) salida += "\\" + ("00" + c.toString(8)).slice(-3);
      else salida += "?";
    }
    return "(" + salida + ")";
  }

  function cortar(texto, tam, max) {
    var palabras = String(texto).split(/\s+/), lineas = [], actual = "";
    palabras.forEach(function (p) {
      var prueba = actual ? actual + " " + p : p;
      if (anchoTexto(prueba, tam) > max && actual) { lineas.push(actual); actual = p; }
      else actual = prueba;
    });
    if (actual) lineas.push(actual);
    return lineas.length ? lineas : [""];
  }

  function n(v) { return (Math.round(v * 100) / 100).toString(); }
  function rgb(c) { return n(c[0] / 255) + " " + n(c[1] / 255) + " " + n(c[2] / 255); }

  // ---------- Documento PDF mínimo ----------
  function Documento() { this.paginas = []; this.nuevaPagina(); }
  Documento.prototype.nuevaPagina = function () { this.ops = []; this.paginas.push(this.ops); };
  Documento.prototype.rect = function (x, y, w, h, relleno, borde, grosor) {
    if (relleno) this.ops.push(rgb(relleno) + " rg");
    if (borde) this.ops.push(rgb(borde) + " RG " + n(grosor || 0.8) + " w");
    this.ops.push(n(x) + " " + n(ALTO - y - h) + " " + n(w) + " " + n(h) + " re " + (relleno && borde ? "B" : relleno ? "f" : "S"));
  };
  Documento.prototype.linea = function (x1, y1, x2, y2, color, grosor) {
    this.ops.push(rgb(color || GRIS) + " RG " + n(grosor || 0.6) + " w " + n(x1) + " " + n(ALTO - y1) + " m " + n(x2) + " " + n(ALTO - y2) + " l S");
  };
  Documento.prototype.texto = function (x, y, texto, tam, opciones) {
    opciones = opciones || {};
    var negrita = !!opciones.negrita;
    var w = anchoTexto(texto, tam, negrita);
    if (opciones.alinear === "derecha") x -= w;
    if (opciones.alinear === "centro") x -= w / 2;
    this.ops.push("BT " + rgb(opciones.color || CAFE) + " rg /" + (negrita ? "F2" : "F1") + " " + n(tam) + " Tf " +
      n(x) + " " + n(ALTO - y) + " Td " + cadena(texto) + " Tj ET");
  };
  Documento.prototype.circulo = function (cx, cy, r, color) {
    var k = 0.5523 * r, y = ALTO - cy;
    this.ops.push(rgb(color) + " rg " + n(cx + r) + " " + n(y) + " m " +
      [[cx + r, y + k, cx + k, y + r, cx, y + r], [cx - k, y + r, cx - r, y + k, cx - r, y], [cx - r, y - k, cx - k, y - r, cx, y - r], [cx + k, y - r, cx + r, y - k, cx + r, y]]
        .map(function (c) { return c.map(n).join(" ") + " c"; }).join(" ") + " f");
  };
  Documento.prototype.generar = function (titulo) {
    var objetos = [], kids = [];
    var base = 5; // 1 catálogo, 2 páginas, 3 y 4 fuentes, desde 5 páginas y contenidos
    this.paginas.forEach(function (ops, i) {
      var pag = base + i * 2;
      kids.push(pag + " 0 R");
      var contenido = ops.join("\n");
      objetos[pag] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + ANCHO + " " + ALTO + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + (pag + 1) + " 0 R >>";
      objetos[pag + 1] = "<< /Length " + contenido.length + " >>\nstream\n" + contenido + "\nendstream";
    });
    var info = base + this.paginas.length * 2;
    objetos[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objetos[2] = "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + kids.length + " >>";
    objetos[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objetos[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    objetos[info] = "<< /Title " + cadena(titulo) + " /Author (La Casita de Ginger) /Producer (Sitio web La Casita de Ginger) >>";

    var pdf = "%PDF-1.4\n", offsets = [];
    for (var i = 1; i < objetos.length; i++) {
      offsets[i] = pdf.length;
      pdf += i + " 0 obj\n" + objetos[i] + "\nendobj\n";
    }
    var xref = pdf.length;
    pdf += "xref\n0 " + objetos.length + "\n0000000000 65535 f \n";
    for (var j = 1; j < objetos.length; j++) pdf += ("0000000000" + offsets[j]).slice(-10) + " 00000 n \n";
    pdf += "trailer\n<< /Size " + objetos.length + " /Root 1 0 R /Info " + info + " 0 R >>\nstartxref\n" + xref + "\n%%EOF";
    return pdf; // solo caracteres ASCII: largo de texto = largo en bytes
  };

  function clp(v) { return "$" + Number(v).toLocaleString("es-CL"); }
  function dos(v) { return ("0" + v).slice(-2); }
  function fechaCL(d) { return dos(d.getDate()) + "-" + dos(d.getMonth() + 1) + "-" + d.getFullYear(); }

  // ---------- Diseño de la guía ----------
  function guia(datos, items, numero) {
    var doc = new Documento();
    var folio = ("000" + numero).slice(-4);
    var emision = new Date();
    var M = 40, W = ANCHO - 2 * M;

    function encabezado(continuacion) {
      doc.rect(0, 0, ANCHO, 96, CAFE);
      doc.rect(0, 96, ANCHO, 5, CARAMELO);
      // casita
      doc.ops.push(rgb(CARAMELO) + " rg " + n(M) + " " + n(ALTO - 78) + " 34 26 re f");
      doc.ops.push(rgb(VAINILLA) + " rg " + n(M - 4) + " " + n(ALTO - 52) + " m " + n(M + 17) + " " + n(ALTO - 32) + " l " + n(M + 38) + " " + n(ALTO - 52) + " l f");
      doc.rect(M + 12, 64, 10, 14, CAFE);
      doc.texto(M + 48, 46, "La Casita de Ginger", 22, { negrita: true, color: BLANCO });
      doc.texto(M + 48, 63, "Pastelería temática · Donde la Navidad se vive todo el año", 9.5, { color: VAINILLA });
      doc.texto(M + 48, 79, "Yungay 95, esquina Iquique, Chillán, Región de Ñuble · Fabiola.Avendano@gmail.com", 8, { color: VAINILLA });
      doc.rect(ANCHO - M - 150, 16, 150, 66, BLANCO, CARAMELO, 1.5);
      doc.texto(ANCHO - M - 75, 36, "GUÍA DE DESPACHO", 11.5, { negrita: true, color: CARAMELO, alinear: "centro" });
      doc.texto(ANCHO - M - 75, 56, "N° " + folio, 16, { negrita: true, alinear: "centro" });
      doc.texto(ANCHO - M - 75, 72, continuacion ? "(continuación)" : "Documento interno", 7.5, { color: GRIS, alinear: "centro" });
    }

    function titulo(y, texto) {
      doc.rect(M, y, W, 18, VAINILLA);
      doc.rect(M, y, 4, 18, CARAMELO);
      doc.texto(M + 10, y + 12.5, texto, 9.5, { negrita: true });
      return y + 18;
    }

    function campo(x, y, etiqueta, valor, ancho) {
      doc.texto(x, y, etiqueta, 7.5, { color: GRIS });
      var lineas = cortar(valor || "—", 9.5, ancho - 6);
      lineas.slice(0, 2).forEach(function (l, i) { doc.texto(x, y + 12 + i * 11, l, 9.5, {}); });
      return lineas.length > 1 ? 34 : 26;
    }

    encabezado(false);
    var y = 124;
    doc.texto(M, y, "Fecha de emisión: " + fechaCL(emision) + "  " + dos(emision.getHours()) + ":" + dos(emision.getMinutes()), 9);
    var entrega = datos.fecha ? fechaCL(new Date(datos.fecha + "T12:00")) : "—";
    doc.texto(ANCHO - M, y, "Entrega: " + entrega + " · " + (datos.horario || ""), 9, { negrita: true, alinear: "derecha" });

    // Datos del cliente
    y = titulo(y + 12, "DATOS DEL CLIENTE");
    var y0 = y;
    y += 14;
    var media = W / 2;
    y += Math.max(campo(M + 10, y, "Nombre", datos.nombre, media), campo(M + media, y, "Teléfono", datos.telefono, media));
    y += Math.max(campo(M + 10, y, "Correo electrónico", datos.correo, media), campo(M + media, y, "Tipo de entrega", datos.entrega, media));
    var direccion = datos.entrega === "Retiro en el local" ? "Retiro en Yungay 95, esquina Iquique, Chillán" : (datos.direccion || "—");
    y += Math.max(campo(M + 10, y, "Dirección de despacho", direccion, media), campo(M + media, y, "Comuna", datos.entrega === "Retiro en el local" ? "Chillán" : datos.comuna, media));
    doc.rect(M, y0, W, y - y0, null, [234, 211, 184]);

    // Detalle
    var col = [M, M + 50, M + 330, M + 420, M + W];
    function cabeceraTabla(yy) {
      doc.rect(M, yy, W, 20, CAFE);
      doc.texto(col[0] + 25, yy + 13.5, "Cant.", 9, { negrita: true, color: BLANCO, alinear: "centro" });
      doc.texto(col[1] + 8, yy + 13.5, "Descripción del producto", 9, { negrita: true, color: BLANCO });
      doc.texto(col[3] - 8, yy + 13.5, "Precio unitario", 9, { negrita: true, color: BLANCO, alinear: "derecha" });
      doc.texto(col[4] - 8, yy + 13.5, "Subtotal", 9, { negrita: true, color: BLANCO, alinear: "derecha" });
      return yy + 20;
    }
    y = titulo(y + 16, "DETALLE DEL PEDIDO");
    y = cabeceraTabla(y + 6);
    var total = 0, unidades = 0;
    items.forEach(function (it, i) {
      var lineas = cortar(it.nombre, 9.5, col[2] - col[1] - 12);
      var alto = 8 + lineas.length * 12;
      if (y + alto > ALTO - 60) { // nueva página si no cabe
        doc.nuevaPagina(); encabezado(true); y = cabeceraTabla(124);
      }
      if (i % 2) doc.rect(M, y, W, alto, [253, 247, 239]);
      doc.texto(col[0] + 25, y + 15, String(it.cantidad), 9.5, { negrita: true, alinear: "centro" });
      lineas.forEach(function (l, k) { doc.texto(col[1] + 8, y + 15 + k * 12, l, 9.5); });
      doc.texto(col[3] - 8, y + 15, clp(it.precio), 9.5, { alinear: "derecha" });
      doc.texto(col[4] - 8, y + 15, clp(it.precio * it.cantidad), 9.5, { alinear: "derecha" });
      y += alto;
      doc.linea(M, y, M + W, y, [234, 211, 184], 0.5);
      total += it.precio * it.cantidad;
      unidades += it.cantidad;
    });

    // Totales, observaciones y firma necesitan ~270 pt: si no caben, pasan a otra página
    if (y > ALTO - 46 - 270) { doc.nuevaPagina(); encabezado(true); y = 114; }
    y += 10;
    var xt = M + W - 230;
    doc.texto(xt, y + 10, "Unidades", 9, { color: GRIS });
    doc.texto(M + W - 8, y + 10, String(unidades), 9, { alinear: "derecha" });
    doc.texto(xt, y + 25, "Subtotal productos", 9, { color: GRIS });
    doc.texto(M + W - 8, y + 25, clp(total), 9, { alinear: "derecha" });
    doc.texto(xt, y + 40, "Costo de despacho", 9, { color: GRIS });
    doc.texto(M + W - 8, y + 40, datos.entrega === "Retiro en el local" ? "Sin costo (retiro)" : "A coordinar", 9, { alinear: "derecha" });
    doc.rect(xt - 8, y + 48, 238, 24, CARAMELO);
    doc.texto(xt, y + 64, "TOTAL PRODUCTOS", 10.5, { negrita: true, color: BLANCO });
    doc.texto(M + W - 8, y + 64, clp(total), 12, { negrita: true, color: BLANCO, alinear: "derecha" });
    doc.texto(M, y + 14, "Forma de pago: a coordinar por WhatsApp", 8.5, { color: GRIS });
    doc.texto(M, y + 28, "Precios en pesos chilenos (CLP), IVA incluido.", 8.5, { color: GRIS });
    y += 90;

    // Observaciones
    var yObs = y;
    y = titulo(y, "OBSERVACIONES");
    var obs = cortar(datos.observaciones || "Sin observaciones.", 9.5, W - 20).slice(0, 3);
    obs.forEach(function (l, i) { doc.texto(M + 10, y + 16 + i * 12, l, 9.5); });
    y += 16 + obs.length * 12 + 4;
    doc.rect(M, yObs, W, y - yObs, null, [234, 211, 184]);

    // Recepción conforme
    y = titulo(y + 16, "RECEPCIÓN CONFORME");
    y += 44;
    var anchoFirma = (W - 30) / 4;
    ["Nombre de quien recibe", "RUT", "Firma", "Fecha y hora"].forEach(function (t, i) {
      var x = M + i * (anchoFirma + 10);
      doc.linea(x, y, x + anchoFirma, y, CAFE, 0.8);
      doc.texto(x + anchoFirma / 2, y + 12, t, 8, { color: GRIS, alinear: "centro" });
    });

    // Pie
    doc.rect(0, ALTO - 46, ANCHO, 46, VAINILLA);
    doc.texto(ANCHO / 2, ALTO - 28, "¡Gracias por tu pedido! Ginger y toda la casita te esperan — Instagram @lacasitadeginger_ · TikTok @lacasitadeginger", 8.5, { negrita: true, alinear: "centro" });
    doc.texto(ANCHO / 2, ALTO - 14, "Documento interno de despacho generado desde el sitio web. No constituye documento tributario electrónico (SII).", 7.5, { color: GRIS, alinear: "centro" });
    // adornos navideños
    doc.circulo(ANCHO - M - 168, 40, 5, [200, 48, 43]);
    doc.circulo(ANCHO - M - 184, 54, 4, [62, 142, 79]);
    doc.circulo(ANCHO - M - 170, 66, 3.5, [232, 176, 75]);

    return doc.generar("Guía de despacho N° " + folio + " - La Casita de Ginger");
  }

  window.generarGuiaDespacho = function (datos, items, numero) {
    var pdf = guia(datos, items, numero);
    var nombre = "guia-despacho-" + ("000" + numero).slice(-4) + ".pdf";
    var blob = new Blob([pdf], { type: "application/pdf" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return { nombre: nombre, pdf: pdf };
  };
})();
