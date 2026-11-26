// La Casita de Ginger - comportamiento del sitio.
// Catálogo en matriz 4x2 paginada con filtros por categoría
// (productos.html), carga de productos con clave (cargar-producto.html), testimonios con puntuación
// en matriz 3x1 (modal «Agregar testimonio»), detalle de producto, comentarios en matriz 4x2 y carrito
// con «Solicitar pedido»: datos de despacho, guía en PDF y envío por WhatsApp.

var POR_PAGINA = 8; // matriz de 4 columnas x 2 filas (catálogo y comentarios)
var CLAVE_CARGA = "Ginger123$"; // demostración: en un sitio sin servidor la clave queda en el código
var WHATSAPP = "56966292613";
var SELLOS = { oferta: "Oferta", destacado: "Producto destacado", nuevo: "Nuevo producto" };

document.addEventListener("DOMContentLoaded", function () {
  // Primero se abre el almacén del catálogo (IndexedDB) y luego se inicia cada funcionalidad
  var listo = window.Almacen ? Almacen.iniciar() : Promise.resolve();
  listo.then(arrancar, arrancar);
});

function arrancar() {
  document.body.classList.add("con-estilos");
  iniciarPanelCarrito();
  if (document.getElementById("detalle-producto")) iniciarDetalle();
  if (document.getElementById("buscador")) iniciarCatalogo();
  if (document.getElementById("form-consulta")) iniciarConsulta();
  if (document.getElementById("form-clave")) iniciarCargaProductos();
  if (document.getElementById("modal-detalle")) iniciarModalDetalle();
  if (document.getElementById("modal-testimonio")) iniciarTestimonios();
  iniciarCarrito();
  document.getElementById("anio").textContent = new Date().getFullYear();
  document.body.dataset.listo = "si"; // indica que el sitio terminó de iniciar (lo usan las pruebas)
}

/* ---------- Ventanas del template (modal de Bootstrap 5) ---------- */
function ventana(el) { return bootstrap.Modal.getOrCreateInstance(el); }

/* ---------- Utilidades ---------- */
function formatoCLP(n) {
  return "$" + Number(n).toLocaleString("es-CL");
}

function leer(clave, porDefecto) {
  try {
    return JSON.parse(localStorage.getItem(clave)) || porDefecto;
  } catch (e) {
    return porDefecto;
  }
}

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (e) {
    return false; // almacenamiento no disponible o lleno
  }
}

function escapar(texto) {
  var div = document.createElement("div");
  div.textContent = texto == null ? "" : String(texto);
  return div.innerHTML.replace(/"/g, "&quot;");
}

function precioFinal(p) {
  return p.precioOferta || p.precio;
}

/* ---------- Productos: iniciales (productos.js) + publicados (catalogo-datos.js) + cargados (IndexedDB) ---------- */
function productosCargados() {
  return window.Almacen ? Almacen.cargados() : leer("productosGinger", []);
}

function productosPublicados() {
  return window.Almacen ? Almacen.publicados() : [];
}

function inicialesOcultos() {
  return leer("inicialesOcultosGinger", []);
}

function todosLosProductos() {
  var ocultos = inicialesOcultos();
  var publicadosOcultos = (window.CATALOGO_PUBLICADO && window.CATALOGO_PUBLICADO.ocultos) || [];
  return (window.PRODUCTOS || [])
    .concat(productosPublicados())
    .filter(function (p) { return ocultos.indexOf(p.id) === -1 && publicadosOcultos.indexOf(p.id) === -1; })
    .concat(productosCargados().filter(function (p) { return ocultos.indexOf(p.id) === -1; }));
}

// Valor del filtro propio de la categoría (personas, presentación, porción o temporada)
function valorEspecial(p) {
  var filtro = FILTROS_CATEGORIA[p.categoria];
  return filtro && p[filtro.campo] != null ? String(p[filtro.campo]) : "";
}

function textoEspecial(p) {
  if (p.categoria === "tortas") return p.personas ? "Para " + p.personas + " personas" : "";
  var filtro = FILTROS_CATEGORIA[p.categoria];
  var v = valorEspecial(p);
  return filtro && v ? filtro.titulo + ": " + (filtro.opciones[v] || v) : "";
}

// Tarjeta del catálogo: imagen, etiqueta, categoría, nombre, descripción, dato de la categoría, precio y botones
function tarjetaProducto(p, vistaPrevia) {
  var url = "producto.html?id=" + encodeURIComponent(p.id);
  var enlace = vistaPrevia ? "#" : url;
  var precio = p.precioOferta
    ? '<del aria-label="Precio normal"><data value="' + p.precio + '">' + formatoCLP(p.precio) + '</data></del> ' +
      '<ins aria-label="Precio oferta"><data value="' + p.precioOferta + '">' + formatoCLP(p.precioOferta) + '</data></ins>'
    : '<data value="' + p.precio + '">' + formatoCLP(p.precio) + '</data>';
  var especial = textoEspecial(p);
  return '<article class="producto" data-id="' + escapar(p.id) + '" data-nombre="' + escapar(p.nombre) + '" data-precio="' + precioFinal(p) + '">' +
    '<a class="producto-imagen" href="' + enlace + '" tabindex="-1">' +
      (p.imagen ? '<img src="' + escapar(p.imagen) + '" alt="' + escapar(p.nombre) + '" width="400" height="300" loading="lazy">' : '<span class="sin-imagen">Sin imagen</span>') +
    '</a>' +
    '<p class="sellos">' +
      (p.etiqueta && SELLOS[p.etiqueta] ? '<strong class="sello sello-' + p.etiqueta + '">' + SELLOS[p.etiqueta] + '</strong>' : '') +
    '</p>' +
    '<p class="categoria">' + escapar(CATEGORIAS[p.categoria] || p.categoria) + '</p>' +
    '<h3><a href="' + enlace + '">' + escapar(p.nombre || "Nombre del producto") + '</a></h3>' +
    '<p class="descripcion">' + escapar(p.descripcion || "Descripción breve del producto.") + '</p>' +
    (especial ? '<p class="dato-categoria">' + escapar(especial) + '</p>' : '') +
    '<p class="precio">' + precio + '</p>' +
    '<p class="producto-acciones">' +
      '<a class="boton boton-secundario ver-mas" href="' + enlace + '">Ver más</a>' +
      '<button type="button" class="agregar"' + (vistaPrevia ? " disabled" : "") + '>Agregar al carrito</button>' +
    '</p>' +
  '</article>';
}

/* ---------- Contacto: la consulta se envía por correo a Fabiola.Avendano@gmail.com ---------- */
var CORREO_CONTACTO = "Fabiola.Avendano@gmail.com";
// Arma el enlace mailto: con el asunto (motivo y nombre) y el cuerpo con los datos del formulario
function enlaceConsulta(form) {
  var asunto = form.motivo.value + " - " + form.nombre.value.trim();
  var cuerpo = "Nombre: " + form.nombre.value.trim() + "\n" +
    "Correo: " + form.correo.value.trim() + "\n" +
    "Motivo: " + form.motivo.value + "\n\n" + form.mensaje.value.trim();
  return "mailto:" + CORREO_CONTACTO + "?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(cuerpo);
}

function iniciarConsulta() {
  var form = document.getElementById("form-consulta");
  var aviso = document.getElementById("mensaje-consulta");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    window.location.href = enlaceConsulta(form);
    aviso.textContent = "Se abrió tu programa de correo con la consulta dirigida a " + CORREO_CONTACTO + ". Solo debes presionar «Enviar».";
    aviso.hidden = false;
  });
}

/* ---------- Carrito como panel lateral (offcanvas de Bootstrap) ---------- */
function iniciarPanelCarrito() {
  var panel = document.getElementById("carrito");
  var lateral = bootstrap.Offcanvas.getOrCreateInstance(panel);

  // Evento click: abre el carrito. Si hay una ventana abierta (por ejemplo, el detalle), primero la cierra.
  function abrir(e) {
    if (e) e.preventDefault();
    var abierta = document.querySelector(".modal.show");
    if (abierta) {
      abierta.addEventListener("hidden.bs.modal", function () { lateral.show(); }, { once: true });
      ventana(abierta).hide();
      return;
    }
    lateral.show();
  }

  document.getElementById("abrir-carrito").addEventListener("click", abrir);
  document.querySelectorAll(".abrir-carrito-enlace").forEach(function (a) { a.addEventListener("click", abrir); });
  panel.addEventListener("click", function (e) {
    var enlace = e.target.closest("a");
    if (enlace && !enlace.classList.contains("abrir-carrito-enlace")) lateral.hide();
  });
  if (location.hash === "#carrito") abrir();
}

/* ---------- Catálogo: filtros + páginas de 4x2 ---------- */
var pintarCatalogo = function () {};

function iniciarCatalogo() {
  var form = document.getElementById("buscador");
  var texto = document.getElementById("buscar-texto");
  var categoria = document.getElementById("buscar-categoria");
  var etiqueta = document.getElementById("buscar-etiqueta");
  var precio = document.getElementById("buscar-precio");
  var especial = document.getElementById("buscar-especial");
  var campoEspecial = document.getElementById("campo-especial");
  var tituloEspecial = document.getElementById("titulo-especial");
  var resultado = document.getElementById("resultado-busqueda");
  var indicador = document.getElementById("productos-pagina");
  var anterior = document.getElementById("productos-anterior");
  var siguiente = document.getElementById("productos-siguiente");
  var lista = document.getElementById("lista-productos");
  var vacio = document.getElementById("sin-productos");
  var vacioTexto = document.getElementById("sin-productos-texto");
  var productos = [];
  var filtrados = [];
  var pagina = 0;

  Object.keys(RANGOS_PRECIO).forEach(function (r) { precio.add(new Option(RANGOS_PRECIO[r], r)); });

  function normalizar(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function totalPaginas() {
    return Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  }

  function mostrarPagina(n) {
    pagina = Math.min(Math.max(n, 0), totalPaginas() - 1);
    var desde = pagina * POR_PAGINA;
    lista.innerHTML = filtrados.slice(desde, desde + POR_PAGINA).map(function (p) {
      return "<li>" + tarjetaProducto(p) + "</li>";
    }).join("");
    indicador.textContent = "Página " + (pagina + 1) + " de " + totalPaginas();
    anterior.disabled = pagina === 0;
    siguiente.disabled = pagina >= totalPaginas() - 1;
    lista.classList.remove("animar");
    void lista.offsetWidth; // reinicia la animación de cambio de página
    lista.classList.add("animar");
  }

  // Al elegir una categoría aparece su filtro propio (personas, presentación, porción o temporada)
  function prepararFiltroEspecial() {
    var filtro = FILTROS_CATEGORIA[categoria.value];
    var anteriorValor = especial.value;
    campoEspecial.hidden = !filtro;
    especial.length = 1;
    if (!filtro) { especial.value = "todos"; return; }
    tituloEspecial.textContent = filtro.titulo;
    Object.keys(filtro.opciones).forEach(function (v) { especial.add(new Option(filtro.opciones[v], v)); });
    especial.value = filtro.opciones[anteriorValor] ? anteriorValor : "todos";
  }

  function filtrar() {
    var t = normalizar(texto.value.trim());
    var c = categoria.value;
    var e = etiqueta.value;
    var r = precio.value.split("-").map(Number);
    var x = especial.value;
    productos = todosLosProductos();
    filtrados = productos.filter(function (p) {
      var pf = precioFinal(p);
      return (c === "todas" || p.categoria === c) &&
             (e === "todas" || p.etiqueta === e) &&
             (precio.value === "todos" || (pf >= r[0] && pf < r[1])) &&
             (x === "todos" || valorEspecial(p) === x) &&
             normalizar(p.nombre).indexOf(t) !== -1;
    });
    vacio.hidden = filtrados.length > 0;
    lista.hidden = !filtrados.length;
    document.getElementById("paginacion-productos").hidden = !filtrados.length;
    if (!productos.length) {
      vacioTexto.textContent = "Todavía no hay productos en el catálogo. Usa «Cargar producto» para agregar el primero.";
      resultado.textContent = "No hay productos.";
    } else if (!filtrados.length) {
      vacioTexto.textContent = "No hay productos que coincidan con los filtros elegidos. Prueba con otros filtros o presiona «Limpiar».";
      resultado.textContent = "No hay productos con ese criterio.";
    } else {
      resultado.textContent = "Mostrando " + filtrados.length + " de " + productos.length + (productos.length === 1 ? " producto." : " productos.");
    }
    mostrarPagina(0);
  }

  form.addEventListener("submit", function (ev) { ev.preventDefault(); filtrar(); });
  texto.addEventListener("input", filtrar);
  categoria.addEventListener("change", function () { prepararFiltroEspecial(); filtrar(); });
  [etiqueta, precio, especial].forEach(function (s) { s.addEventListener("change", filtrar); });
  form.addEventListener("reset", function () { setTimeout(function () { prepararFiltroEspecial(); filtrar(); }, 0); });
  anterior.addEventListener("click", function () { mostrarPagina(pagina - 1); });
  siguiente.addEventListener("click", function () { mostrarPagina(pagina + 1); });

  pintarCatalogo = filtrar;
  prepararFiltroEspecial();
  filtrar();
}

/* ---------- Página «Cargar producto» (protegida con clave) ---------- */
function iniciarCargaProductos() {
  var formClave = document.getElementById("form-clave");
  var clave = document.getElementById("clave-carga");
  var errorClave = document.getElementById("error-clave");
  var panel = document.getElementById("panel-carga");
  var form = document.getElementById("form-producto");
  var categoria = document.getElementById("prod-categoria");
  var campoPersonas = document.getElementById("prod-campo-personas");
  var personas = document.getElementById("prod-personas");
  var campoEspecial = document.getElementById("prod-campo-especial");
  var especial = document.getElementById("prod-especial");
  var tituloEspecial = document.getElementById("prod-titulo-especial");
  var archivo = document.getElementById("prod-imagen");
  var error = document.getElementById("error-producto");
  var mensaje = document.getElementById("mensaje-producto");
  var vista = document.getElementById("vista-previa");
  var listaAdmin = document.getElementById("lista-admin");
  var adminVacio = document.getElementById("admin-vacio");
  var imagenDatos = "";

  Object.keys(FILTROS_CATEGORIA.tortas.opciones).forEach(function (v) {
    personas.add(new Option(FILTROS_CATEGORIA.tortas.opciones[v], v));
  });

  function desbloqueado() {
    try { return sessionStorage.getItem("cargaGinger") === "si"; } catch (e) { return false; }
  }

  function mostrarPaso() {
    var ok = desbloqueado();
    formClave.hidden = ok;
    panel.hidden = !ok;
    if (ok) { pintarAdmin(); vistaPrevia(); }
  }

  formClave.addEventListener("submit", function (e) {
    e.preventDefault();
    if (clave.value !== CLAVE_CARGA) {
      errorClave.hidden = false;
      clave.select();
      return;
    }
    try { sessionStorage.setItem("cargaGinger", "si"); } catch (err) { /* sin almacenamiento */ }
    mostrarPaso();
    document.getElementById("prod-nombre").focus();
  });

  document.getElementById("salir-carga").addEventListener("click", function () {
    try { sessionStorage.removeItem("cargaGinger"); } catch (err) { /* sin almacenamiento */ }
    formClave.reset();
    errorClave.hidden = true;
    mostrarPaso();
    clave.focus();
  });

  // Campo propio de la categoría: personas (tortas), presentación (galletas), porción (pastelería) o temporada (tradicionales)
  function segunCategoria() {
    var c = categoria.value;
    campoPersonas.hidden = c !== "tortas";
    campoEspecial.hidden = c === "tortas";
    if (c !== "tortas") {
      var filtro = FILTROS_CATEGORIA[c];
      tituloEspecial.textContent = filtro.titulo + " *";
      especial.length = 0;
      Object.keys(filtro.opciones).forEach(function (v) { especial.add(new Option(filtro.opciones[v], v)); });
    }
    vistaPrevia();
  }

  function leerFormulario() {
    var c = categoria.value;
    var p = {
      id: "u" + Date.now(),
      nombre: form.nombre.value.trim(),
      categoria: c,
      precio: Number(form.precio.value) || 0,
      precioOferta: Number(form.oferta.value) || null,
      etiqueta: form.etiqueta.value === "ninguna" ? null : form.etiqueta.value,
      descripcion: form.descripcion.value.trim(),
      detalle: form.detalle.value.trim() || form.descripcion.value.trim(),
      formato: form.formato.value.trim(),
      ingredientes: form.ingredientes.value.trim() || "Consultar en el local.",
      imagen: imagenDatos,
      comentarios: []
    };
    if (c === "tortas") p.personas = Number(personas.value);
    else p[FILTROS_CATEGORIA[c].campo] = especial.value;
    return p;
  }

  function vistaPrevia() {
    vista.innerHTML = tarjetaProducto(leerFormulario(), true);
  }

  // La imagen se reduce a 800 px de ancho y se guarda en el navegador junto al producto
  archivo.addEventListener("change", function () {
    var f = archivo.files[0];
    imagenDatos = "";
    if (!f) { vistaPrevia(); return; }
    var lector = new FileReader();
    lector.onload = function () {
      var img = new Image();
      img.onload = function () {
        var escala = Math.min(1, 800 / img.width);
        var lienzo = document.createElement("canvas");
        lienzo.width = Math.round(img.width * escala);
        lienzo.height = Math.round(img.height * escala);
        lienzo.getContext("2d").drawImage(img, 0, 0, lienzo.width, lienzo.height);
        imagenDatos = lienzo.toDataURL("image/jpeg", 0.82);
        vistaPrevia();
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(f);
  });

  categoria.addEventListener("change", segunCategoria);
  form.addEventListener("input", vistaPrevia);
  form.addEventListener("reset", function () {
    imagenDatos = "";
    setTimeout(segunCategoria, 0);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var p = leerFormulario();
    error.hidden = true;
    mensaje.hidden = true;
    if (!p.imagen) { error.textContent = "Selecciona una imagen para el producto."; error.hidden = false; return; }
    if (p.precioOferta && p.precioOferta >= p.precio) {
      error.textContent = "El precio de oferta debe ser menor que el precio normal.";
      error.hidden = false;
      return;
    }
    if (p.precioOferta && !p.etiqueta) p.etiqueta = "oferta";
    // Se guarda en IndexedDB: la imagen queda como archivo dentro del navegador
    Almacen.agregar(p).then(function () {
      form.reset();
      mensaje.textContent = "✔ «" + p.nombre + "» se agregó al catálogo de este navegador. Publícalo para que lo vean todos.";
      mensaje.hidden = false;
      pintarAdmin();
      pintarCatalogo();
    }).catch(function () {
      error.textContent = "No se pudo guardar el producto en el navegador. Revisa el espacio disponible o usa una imagen más liviana.";
      error.hidden = false;
    });
  });

  // Listado de los productos del catálogo, con opción de eliminarlos
  function pintarAdmin() {
    var todos = todosLosProductos();
    adminVacio.hidden = todos.length > 0;
    listaAdmin.innerHTML = todos.map(function (p) {
      var origen = (window.PRODUCTOS || []).some(function (x) { return x.id === p.id; }) ? "inicial"
        : Almacen.esPublicado(p.id) ? "publicado" : "solo en este navegador";
      return '<li><span><strong>' + escapar(p.nombre) + '</strong> · ' + escapar(CATEGORIAS[p.categoria]) + ' · ' + formatoCLP(precioFinal(p)) +
        ' <small class="origen origen-' + (origen === "solo en este navegador" ? "local" : origen) + '">' + origen + '</small></span>' +
        '<button type="button" class="boton-eliminar" data-id="' + escapar(p.id) + '">Eliminar</button></li>';
    }).join("");
  }

  listaAdmin.addEventListener("click", function (e) {
    var b = e.target.closest(".boton-eliminar");
    if (!b) return;
    var id = b.dataset.id;
    var esInicial = (window.PRODUCTOS || []).some(function (p) { return p.id === id; });
    var repintar = function () { pintarAdmin(); pintarCatalogo(); };
    // Los iniciales y los publicados se ocultan; los cargados en este navegador se borran de IndexedDB
    if (esInicial || Almacen.esPublicado(id)) { guardar("inicialesOcultosGinger", inicialesOcultos().concat(id)); repintar(); }
    else Almacen.eliminar(id).then(repintar);
  });

  document.getElementById("restaurar-iniciales").addEventListener("click", function () {
    guardar("inicialesOcultosGinger", []);
    pintarAdmin();
    pintarCatalogo();
  });

  iniciarPublicacion(pintarAdmin);
  segunCategoria();
  mostrarPaso();
}

/* ---------- Publicar y respaldar el catálogo (reemplaza a la base de datos) ---------- */
function iniciarPublicacion(pintarAdmin) {
  var estado = document.getElementById("estado-catalogo");
  if (!estado) return;
  var botonCarpeta = document.getElementById("guardar-carpeta");
  var botonDescargar = document.getElementById("descargar-catalogo");
  var importar = document.getElementById("importar-catalogo");
  var mensaje = document.getElementById("mensaje-catalogo");
  var error = document.getElementById("error-catalogo");

  function avisar(texto, esError) {
    mensaje.hidden = !!esError; error.hidden = !esError;
    (esError ? error : mensaje).textContent = texto;
  }

  function pintarEstado() {
    var locales = productosCargados().length;
    var pub = opinionesPublicadas(), vis = opinionesVisibles();
    var idsPub = pub.testimonios.concat(pub.comentarios).map(function (x) { return x.id; });
    var sinPublicar = vis.testimonios.concat(vis.comentarios).filter(function (x) { return idsPub.indexOf(x.id) === -1; }).length +
      pub.testimonios.concat(pub.comentarios).filter(function (x) { return opinionesQuitadas().indexOf(x.id) !== -1; }).length;
    estado.innerHTML = "<strong>" + productosPublicados().length + "</strong> producto(s) publicados en el archivo del catálogo · " +
      "<strong>" + locales + "</strong> solo en este navegador" +
      (Almacen.usaIndexedDB() ? " (IndexedDB)." : " (localStorage).") +
      "<br><strong>" + pub.testimonios.length + "</strong> testimonio(s) y <strong>" + pub.comentarios.length + "</strong> comentario(s) publicados · " +
      "<strong>" + sinPublicar + "</strong> cambio(s) en opiniones sin publicar." +
      (locales || sinPublicar ? " Publica el catálogo para que todos vean los cambios." : "");
  }

  botonCarpeta.hidden = !Almacen.puedeGuardarEnCarpeta();
  botonCarpeta.addEventListener("click", function () {
    Almacen.guardarEnCarpeta(inicialesOcultos(), opinionesVisibles()).then(function (c) {
      avisar("✔ Se guardaron js/catalogo-datos.js, " + c.productos.length + " producto(s), " + c.testimonios.length + " testimonio(s) y " + c.comentarios.length + " comentario(s) en la carpeta del sitio. Súbelos a GitHub para publicarlos en Netlify.");
    }).catch(function (e) {
      if (e && e.name === "AbortError") return; // la persona canceló la elección de carpeta
      avisar("No se pudo guardar en la carpeta: " + (e && e.message ? e.message : e), true);
    });
  });

  botonDescargar.addEventListener("click", function () {
    Almacen.descargar(inicialesOcultos(), opinionesVisibles()).then(function (c) {
      avisar("✔ Se descargó catalogo-datos.js con " + c.productos.length + " producto(s), " + c.testimonios.length + " testimonio(s) y " + c.comentarios.length + " comentario(s). Cópialo en la carpeta js/ del sitio, reemplazando el anterior, y súbelo a GitHub.");
    }).catch(function (e) { avisar("No se pudo generar el catálogo: " + e.message, true); });
  });

  importar.addEventListener("change", function () {
    var archivo = importar.files[0];
    if (!archivo) return;
    Almacen.importar(archivo).then(function (r) {
      if (r.ocultos.length) guardar("inicialesOcultosGinger", inicialesOcultos().concat(r.ocultos));
      var nT = 0, nC = 0;
      r.testimonios.forEach(function (t) { var x = limpiarTestimonio(t); if (x) { aprobarOpinion("testimonio", x); nT++; } });
      r.comentarios.forEach(function (c) { var x = limpiarComentario(c); if (x) { aprobarOpinion("comentario", x); nC++; } });
      avisar("✔ Se importaron " + r.productos + " producto(s), " + nT + " testimonio(s) y " + nC + " comentario(s) al catálogo de este navegador.");
      pintarAdmin(); pintarCatalogo(); pintarEstado();
      document.dispatchEvent(new Event("opiniones-cambiaron"));
    }).catch(function (e) {
      avisar("No se pudo importar: " + (e && e.message ? e.message : "el archivo no es un catálogo válido."), true);
    }).then(function () { importar.value = ""; });
  });

  // El estado se actualiza cada vez que cambia la lista de productos o de opiniones
  new MutationObserver(pintarEstado).observe(document.getElementById("lista-admin"), { childList: true });
  document.addEventListener("opiniones-cambiaron", pintarEstado);
  pintarEstado();
  iniciarModeracion();
}

/* ---------- Aprobar y quitar testimonios y comentarios (cargar-producto.html) ---------- */
function aprobarOpinion(tipo, datos) {
  var apr = opinionesAprobadas();
  var lista = tipo === "testimonio" ? apr.testimonios : apr.comentarios;
  if (!lista.some(function (x) { return x.id === datos.id; })) lista.push(datos);
  guardar("opinionesAprobadasGinger", apr);
  guardar("opinionesQuitadasGinger", opinionesQuitadas().filter(function (id) { return id !== datos.id; }));
}

function quitarOpinion(id) {
  var apr = opinionesAprobadas();
  apr.testimonios = apr.testimonios.filter(function (x) { return x.id !== id; });
  apr.comentarios = apr.comentarios.filter(function (x) { return x.id !== id; });
  guardar("opinionesAprobadasGinger", apr);
  var publicada = opinionesPublicadas().testimonios.concat(opinionesPublicadas().comentarios).some(function (x) { return x.id === id; });
  if (publicada && opinionesQuitadas().indexOf(id) === -1) guardar("opinionesQuitadasGinger", opinionesQuitadas().concat(id));
}

function iniciarModeracion() {
  var recibido = document.getElementById("opinion-recibida");
  if (!recibido) return;
  var vista = document.getElementById("vista-opinion");
  var mensaje = document.getElementById("mensaje-opinion");
  var error = document.getElementById("error-opinion");
  var listaT = document.getElementById("lista-testimonios-admin");
  var listaC = document.getElementById("lista-comentarios-admin");
  var revisada = null;

  function avisar(texto, esError) {
    mensaje.hidden = !!esError; error.hidden = !esError;
    (esError ? error : mensaje).textContent = texto;
  }

  function nombreProducto(id) {
    var p = todosLosProductos().concat(window.PRODUCTOS || []).filter(function (x) { return x.id === id; })[0];
    return p ? p.nombre : "producto " + id;
  }

  function origen(id) {
    var pub = opinionesPublicadas();
    var publicada = pub.testimonios.concat(pub.comentarios).some(function (x) { return x.id === id; });
    return publicada ? '<small class="origen origen-publicado">publicado</small>' : '<small class="origen origen-local">aprobado, sin publicar</small>';
  }

  function pintarListas() {
    var vis = opinionesVisibles();
    listaT.innerHTML = vis.testimonios.map(function (t) {
      return '<li><span><strong>' + escapar(t.nombre) + '</strong> · ' + "★".repeat(t.puntuacion) + ' · «' + escapar(t.texto.slice(0, 60)) + (t.texto.length > 60 ? "…" : "") + '» ' + origen(t.id) + '</span>' +
        '<button type="button" class="boton-eliminar quitar-opinion" data-id="' + escapar(t.id) + '">Quitar</button></li>';
    }).join("");
    listaC.innerHTML = vis.comentarios.map(function (c) {
      return '<li><span><strong>' + escapar(c.autor) + '</strong> en ' + escapar(nombreProducto(c.productoId)) + ' · «' + escapar(c.texto.slice(0, 60)) + (c.texto.length > 60 ? "…" : "") + '» ' + origen(c.id) + '</span>' +
        '<button type="button" class="boton-eliminar quitar-opinion" data-id="' + escapar(c.id) + '">Quitar</button></li>';
    }).join("");
    document.getElementById("sin-testimonios-admin").hidden = vis.testimonios.length > 0;
    document.getElementById("sin-comentarios-admin").hidden = vis.comentarios.length > 0;
  }

  // Revisar: se lee el código del mensaje pegado y se muestra la opinión antes de aprobarla
  document.getElementById("revisar-opinion").addEventListener("click", function () {
    revisada = decodificarOpinion(recibido.value);
    vista.hidden = true;
    if (!revisada) {
      avisar("No se encontró un «Código para publicar» válido. Copia el mensaje completo que te llegó por WhatsApp o correo.", true);
      return;
    }
    mensaje.hidden = error.hidden = true;
    var d = revisada.datos;
    vista.innerHTML = revisada.tipo === "testimonio"
      ? '<p class="etiqueta">Testimonio</p><p class="estrellas">' + "★".repeat(d.puntuacion) + "☆".repeat(5 - d.puntuacion) + '</p>' +
        '<blockquote><p>«' + escapar(d.texto) + '»</p></blockquote><p>— ' + escapar(d.nombre) + (d.comuna ? ", " + escapar(d.comuna) : "") +
        ' · visita del ' + new Date(d.fecha + "T12:00").toLocaleDateString("es-CL") + '</p>'
      : '<p class="etiqueta">Comentario sobre «' + escapar(nombreProducto(d.productoId)) + '»</p>' +
        '<blockquote><p>«' + escapar(d.texto) + '»</p></blockquote><p>— ' + escapar(d.autor) + '</p>';
    vista.innerHTML += '<p class="campo-botones"><button type="button" class="boton" id="aprobar-opinion">✔ Aprobar</button>' +
      '<button type="button" class="boton boton-secundario" id="descartar-opinion">Descartar</button></p>';
    vista.hidden = false;
  });

  vista.addEventListener("click", function (e) {
    if (!revisada) return;
    if (e.target.id === "aprobar-opinion") {
      aprobarOpinion(revisada.tipo, revisada.datos);
      avisar("✔ " + (revisada.tipo === "testimonio" ? "Testimonio" : "Comentario") + " aprobado. Ya se ve en este navegador; publica el catálogo para que lo vean todos.");
    } else if (e.target.id === "descartar-opinion") {
      avisar("Se descartó. No se publicará.");
    } else {
      return;
    }
    revisada = null;
    vista.hidden = true;
    recibido.value = "";
    pintarListas();
    document.dispatchEvent(new Event("opiniones-cambiaron"));
  });

  document.querySelector(".opiniones-admin").addEventListener("click", function (e) {
    var b = e.target.closest(".quitar-opinion");
    if (!b) return;
    quitarOpinion(b.dataset.id);
    avisar("Se quitó. Publica el catálogo para que también desaparezca para todos.");
    pintarListas();
    document.dispatchEvent(new Event("opiniones-cambiaron"));
  });

  document.addEventListener("opiniones-cambiaron", pintarListas);
  pintarListas();
}

/* ---------- Testimonios y comentarios de clientes, sin base de datos ---------- */
// 1) El cliente publica su opinión: la ve de inmediato en su navegador como «pendiente de aprobación».
// 2) La envía a la emprendedora por WhatsApp o correo; el mensaje lleva un «código para publicar».
// 3) La emprendedora pega el mensaje en «Cargar producto», revisa la opinión y la aprueba.
// 4) Al publicar el catálogo, las opiniones aprobadas quedan en js/catalogo-datos.js y las ven todos.
var LIMITES_OPINION = { nombre: 40, comuna: 40, texto: 400 };

function codificarOpinion(tipo, datos) {
  var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(datos))));
  return "G" + tipo + "1:" + base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function corto(v, max) { return String(v == null ? "" : v).trim().slice(0, max); }

// Revisa y limpia una opinión recibida (no se confía en lo que trae el código)
function limpiarTestimonio(t) {
  var r = {
    id: corto(t.id || ("t" + t.creado), 30), nombre: corto(t.nombre, LIMITES_OPINION.nombre), comuna: corto(t.comuna, LIMITES_OPINION.comuna),
    fecha: corto(t.fecha, 10), puntuacion: Math.min(5, Math.max(1, Math.round(Number(t.puntuacion) || 0))),
    texto: corto(t.texto, LIMITES_OPINION.texto), creado: Number(t.creado) || Date.now()
  };
  return r.nombre && r.texto && /^\d{4}-\d{2}-\d{2}$/.test(r.fecha) ? r : null;
}

function limpiarComentario(c) {
  var r = {
    id: corto(c.id, 30), productoId: corto(c.productoId, 40), autor: corto(c.autor, LIMITES_OPINION.nombre),
    texto: corto(c.texto, LIMITES_OPINION.texto), fecha: corto(c.fecha, 30)
  };
  return r.id && r.productoId && r.autor && r.texto && !isNaN(Date.parse(r.fecha)) ? r : null;
}

function decodificarOpinion(texto) {
  var m = /G([TC])1:([A-Za-z0-9_-]+)/.exec(texto || "");
  if (!m) return null;
  try {
    var b64 = m[2].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var datos = JSON.parse(decodeURIComponent(escape(atob(b64))));
    var limpio = m[1] === "T" ? limpiarTestimonio(datos) : limpiarComentario(datos);
    return limpio ? { tipo: m[1] === "T" ? "testimonio" : "comentario", datos: limpio } : null;
  } catch (e) {
    return null;
  }
}

function opinionesPublicadas() {
  var c = window.CATALOGO_PUBLICADO || {};
  return { testimonios: c.testimonios || [], comentarios: c.comentarios || [] };
}
function opinionesAprobadas() { return leer("opinionesAprobadasGinger", { testimonios: [], comentarios: [] }); }
function opinionesQuitadas() { return leer("opinionesQuitadasGinger", []); }

// Lo que ven todos: publicadas (archivo) + aprobadas en este navegador, sin las quitadas
function opinionesVisibles() {
  var quitadas = opinionesQuitadas(), pub = opinionesPublicadas(), apr = opinionesAprobadas();
  function unir(a, b) {
    var vistos = {};
    return a.concat(b).filter(function (x) {
      if (!x || !x.id || vistos[x.id] || quitadas.indexOf(x.id) !== -1) return false;
      vistos[x.id] = true;
      return true;
    });
  }
  return { testimonios: unir(pub.testimonios, apr.testimonios), comentarios: unir(pub.comentarios, apr.comentarios) };
}

// Recuadro con los botones para enviar la opinión a la emprendedora
function cajaEnvio(id, despuesDe) {
  var caja = document.getElementById(id);
  if (!caja) {
    caja = document.createElement("div");
    caja.id = id;
    caja.className = "envio-opinion";
    caja.setAttribute("role", "status");
    despuesDe.insertAdjacentElement("afterend", caja);
  }
  return caja;
}

function mostrarEnvio(caja, tipo, datos, producto) {
  var esTestimonio = tipo === "T";
  var lineas = esTestimonio
    ? ["Hola La Casita de Ginger, dejé un testimonio en la página web:",
       "★★★★★".slice(0, datos.puntuacion) + "☆☆☆☆☆".slice(0, 5 - datos.puntuacion) + " (" + datos.puntuacion + " de 5)",
       "Nombre: " + datos.nombre + (datos.comuna ? ", " + datos.comuna : ""),
       "Visita: " + new Date(datos.fecha + "T12:00").toLocaleDateString("es-CL"),
       "«" + datos.texto + "»"]
    : ["Hola La Casita de Ginger, dejé un comentario sobre «" + producto.nombre + "» en la página web:",
       "Nombre: " + datos.autor,
       "«" + datos.texto + "»"];
  lineas.push("", "Código para publicar: " + codificarOpinion(tipo, datos));
  var texto = lineas.join("\n");
  var asunto = (esTestimonio ? "Nuevo testimonio de " + datos.nombre : "Nuevo comentario de " + datos.autor) + " para publicar";
  caja.innerHTML = '<p><strong>¡Gracias por tu ' + (esTestimonio ? "testimonio" : "comentario") + '!</strong> Por ahora solo lo ves tú. ' +
    'Para que lo vean todos, envíaselo a La Casita de Ginger: lo revisará y lo publicará.</p>' +
    '<p class="envio-botones">' +
    '<a class="boton boton-whatsapp enviar-whatsapp" target="_blank" rel="noopener noreferrer" href="https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto) + '">Enviar por WhatsApp</a> ' +
    '<a class="boton boton-secundario enviar-correo" href="mailto:' + CORREO_CONTACTO + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(texto) + '">Enviar por correo</a>' +
    '</p>';
  caja.hidden = false;
}

function marcaPendiente() {
  return '<p class="estado-opinion">⏳ Pendiente de aprobación · solo lo ves tú</p>';
}

/* ---------- Testimonios: modal con puntuación y matriz 3x1 paginada ---------- */
// Se guardan en el navegador y se muestran del más reciente al más antiguo (fecha de la visita).
var POR_PAGINA_TESTIMONIOS = 3;

function iniciarTestimonios() {
  var modal = document.getElementById("modal-testimonio");
  var form = document.getElementById("form-testimonio");
  var fecha = document.getElementById("testimonio-fecha");
  var textoPuntuacion = document.getElementById("texto-puntuacion");
  var lista = document.getElementById("lista-testimonios");
  var vacio = document.getElementById("sin-testimonios");
  var nav = document.getElementById("paginacion-testimonios");
  var indicador = document.getElementById("testimonios-pagina");
  var anterior = document.getElementById("testimonios-anterior");
  var siguiente = document.getElementById("testimonios-siguiente");
  var promedio = document.getElementById("promedio-testimonios");
  var pagina = 0;

  function hoy() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }

  function estrellas(n) {
    return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
  }

  // Del más reciente al más antiguo; si tienen la misma fecha, primero el último publicado
  function ordenados() {
    var visibles = opinionesVisibles().testimonios;
    var ids = visibles.map(function (t) { return t.id; });
    var quitadas = opinionesQuitadas();
    var propios = leer("testimoniosGinger", []).map(function (t) {
      return Object.assign({}, t, { id: t.id || "t" + t.creado, pendiente: true });
    }).filter(function (t) { return ids.indexOf(t.id) === -1 && quitadas.indexOf(t.id) === -1; });
    return visibles.concat(propios).sort(function (a, b) {
      return b.fecha.localeCompare(a.fecha) || b.creado - a.creado;
    });
  }

  function pintar() {
    var todos = ordenados();
    var paginas = Math.max(1, Math.ceil(todos.length / POR_PAGINA_TESTIMONIOS));
    pagina = Math.min(Math.max(pagina, 0), paginas - 1);
    vacio.hidden = todos.length > 0;
    lista.hidden = nav.hidden = promedio.hidden = !todos.length;
    if (todos.length) {
      var media = todos.reduce(function (s, t) { return s + t.puntuacion; }, 0) / todos.length;
      promedio.innerHTML = '<span class="estrellas" aria-hidden="true">' + estrellas(Math.round(media)) + '</span> ' +
        media.toLocaleString("es-CL", { maximumFractionDigits: 1 }) + " de 5 · " + todos.length + (todos.length === 1 ? " testimonio" : " testimonios");
    }
    lista.innerHTML = todos.slice(pagina * POR_PAGINA_TESTIMONIOS, (pagina + 1) * POR_PAGINA_TESTIMONIOS).map(function (t) {
      return '<li><figure class="testimonio' + (t.pendiente ? " pendiente" : "") + '">' +
        '<p class="estrellas" aria-label="' + t.puntuacion + ' de 5 estrellas">' + estrellas(t.puntuacion) + '</p>' +
        '<blockquote><p>«' + escapar(t.texto) + '»</p></blockquote>' +
        '<figcaption>— ' + escapar(t.nombre) + (t.comuna ? ", " + escapar(t.comuna) : "") + '</figcaption>' +
        '<p class="fecha-testimonio"><small>Visita del <time datetime="' + t.fecha + '">' + new Date(t.fecha + "T12:00").toLocaleDateString("es-CL") + '</time></small></p>' +
        (t.pendiente ? marcaPendiente() : '') +
        '</figure></li>';
    }).join("");
    indicador.textContent = "Página " + (pagina + 1) + " de " + paginas;
    anterior.disabled = pagina === 0;
    siguiente.disabled = pagina >= paginas - 1;
  }

  function cerrar() { ventana(modal).hide(); }

  document.getElementById("abrir-testimonio").addEventListener("click", function () {
    form.reset();
    fecha.max = hoy();
    fecha.value = hoy();
    textoPuntuacion.textContent = "Elige de 1 a 5 estrellas.";
    modal.addEventListener("shown.bs.modal", function () { document.getElementById("testimonio-nombre").focus(); }, { once: true });
    ventana(modal).show();
  });
  document.getElementById("cancelar-testimonio").addEventListener("click", cerrar);

  form.addEventListener("change", function (e) {
    if (e.target.name === "puntuacion") {
      var n = Number(e.target.value);
      textoPuntuacion.textContent = n + (n === 1 ? " estrella" : " estrellas") + " de 5";
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var todos = leer("testimoniosGinger", []);
    var creado = Date.now();
    var nuevo = {
      id: "t" + creado,
      nombre: form.nombre.value.trim(),
      comuna: form.comuna.value.trim(),
      fecha: fecha.value,
      puntuacion: Math.min(5, Math.max(1, Number(form.puntuacion.value))),
      texto: form.texto.value.trim(),
      creado: creado
    };
    todos.push(nuevo);
    guardar("testimoniosGinger", todos);
    cerrar();
    pagina = 0;
    pintar();
    // Botones para enviarlo a la emprendedora, que lo aprueba y lo publica para todos
    mostrarEnvio(cajaEnvio("envio-testimonio", document.querySelector(".barra-testimonios")), "T", nuevo);
  });

  anterior.addEventListener("click", function () { pagina--; pintar(); });
  siguiente.addEventListener("click", function () { pagina++; pintar(); });

  pintar();
}

/* ---------- Página de detalle de producto ---------- */
function iniciarDetalle() {
  var id = new URLSearchParams(location.search).get("id") || "1";
  var todos = todosLosProductos();
  var p = todos.filter(function (x) { return x.id === id; })[0];
  if (!p) {
    document.getElementById("detalle-producto").hidden = true;
    document.getElementById("comentarios").hidden = true;
    document.getElementById("relacionados").hidden = true;
    document.getElementById("producto-no-encontrado").hidden = false;
    return;
  }
  var categoriaNombre = CATEGORIAS[p.categoria] || p.categoria;

  document.title = p.nombre + " | La Casita de Ginger";
  document.getElementById("miga-categoria").textContent = categoriaNombre;
  document.getElementById("miga-producto").textContent = p.nombre;

  var art = document.getElementById("detalle-producto");
  art.dataset.id = p.id;
  art.dataset.nombre = p.nombre;
  art.dataset.precio = precioFinal(p);

  var img = document.getElementById("detalle-imagen");
  img.src = p.imagen;
  img.alt = p.nombre;
  document.getElementById("detalle-formato").textContent = p.formato;
  document.getElementById("detalle-categoria").textContent = categoriaNombre;
  document.getElementById("detalle-nombre").textContent = p.nombre;
  document.getElementById("detalle-descripcion").textContent = p.descripcion;
  document.getElementById("detalle-texto").textContent = p.detalle;
  document.getElementById("ficha-formato").textContent = p.formato;
  document.getElementById("ficha-ingredientes").textContent = p.ingredientes;

  // Dato propio de la categoría (en tortas: para cuántas personas es)
  var filtro = FILTROS_CATEGORIA[p.categoria];
  var v = valorEspecial(p);
  if (filtro && v) {
    document.getElementById("ficha-personas-titulo").textContent = filtro.titulo;
    document.getElementById("ficha-personas").textContent = filtro.opciones[v] || v;
    document.getElementById("ficha-personas-titulo").hidden = false;
    document.getElementById("ficha-personas").hidden = false;
  }
  if (p.categoria === "tortas" && p.personas) {
    document.getElementById("detalle-personas-n").textContent = p.personas;
    document.getElementById("detalle-personas").hidden = false;
  }

  var sello = document.getElementById("detalle-sello");
  if (p.etiqueta && SELLOS[p.etiqueta]) {
    sello.textContent = SELLOS[p.etiqueta];
    sello.className = "sello sello-" + p.etiqueta;
  } else {
    document.getElementById("detalle-sello-contenedor").hidden = true;
  }

  document.getElementById("detalle-precio").innerHTML = p.precioOferta
    ? '<del aria-label="Precio normal"><data value="' + p.precio + '">' + formatoCLP(p.precio) + '</data></del> ' +
      '<ins aria-label="Precio oferta"><data value="' + p.precioOferta + '">' + formatoCLP(p.precioOferta) + '</data></ins> ' +
      '<small class="ahorro">Ahorras ' + formatoCLP(p.precio - p.precioOferta) + '</small>'
    : '<data value="' + p.precio + '">' + formatoCLP(p.precio) + '</data>';

  iniciarComentarios(p);

  // Relacionados: otros productos de la misma categoría
  var relacionados = todos.filter(function (x) { return x.categoria === p.categoria && x.id !== p.id; }).slice(0, 4);
  document.getElementById("relacionados").hidden = !relacionados.length;
  document.getElementById("lista-relacionados").innerHTML = relacionados.map(function (x) {
    var url = "producto.html?id=" + encodeURIComponent(x.id);
    return '<li><article class="producto">' +
      '<a class="producto-imagen" href="' + url + '" tabindex="-1"><img src="' + escapar(x.imagen) + '" alt="' + escapar(x.nombre) + '" width="400" height="300"></a>' +
      '<h3><a href="' + url + '">' + escapar(x.nombre) + '</a></h3>' +
      '<p class="precio"><data value="' + precioFinal(x) + '">' + formatoCLP(precioFinal(x)) + '</data></p>' +
      '<p class="producto-acciones"><a class="boton boton-secundario ver-mas" href="' + url + '">Ver más</a></p>' +
      '</article></li>';
  }).join("");

  // Agregar al carrito con cantidad
  document.getElementById("form-agregar").addEventListener("submit", function (e) {
    e.preventDefault();
    var cantidad = Math.max(1, Math.min(20, Number(document.getElementById("cantidad").value) || 1));
    agregarAlCarrito({ id: String(p.id), nombre: p.nombre, precio: precioFinal(p) }, cantidad);
    document.getElementById("mensaje-agregado").hidden = false;
  });
}

/* ---------- Detalle del producto en un modal (página de productos) ---------- */
// «Ver más», la imagen y el nombre de cada tarjeta abren el modal (detalle y comentarios); sin JavaScript, el enlace lleva a producto.html.
function iniciarModalDetalle() {
  var modal = document.getElementById("modal-detalle");
  var actual = null;
  var $ = function (id) { return document.getElementById(id); };

  function abrir(p) {
    actual = p;
    var filtro = FILTROS_CATEGORIA[p.categoria];
    var v = valorEspecial(p);
    $("md-categoria").textContent = CATEGORIAS[p.categoria] || p.categoria;
    $("md-imagen").src = p.imagen || "";
    $("md-imagen").alt = p.nombre;
    $("md-formato").textContent = p.formato || "";
    $("md-nombre").textContent = p.nombre;
    $("md-descripcion").textContent = p.descripcion || "";
    $("md-texto").textContent = p.detalle || p.descripcion || "";
    var conSello = p.etiqueta && SELLOS[p.etiqueta];
    $("md-sello-contenedor").hidden = !conSello;
    if (conSello) { $("md-sello").textContent = SELLOS[p.etiqueta]; $("md-sello").className = "sello sello-" + p.etiqueta; }
    $("md-precio").innerHTML = p.precioOferta
      ? '<del aria-label="Precio normal">' + formatoCLP(p.precio) + '</del> <ins aria-label="Precio oferta">' + formatoCLP(p.precioOferta) + '</ins> <small class="ahorro">Ahorras ' + formatoCLP(p.precio - p.precioOferta) + '</small>'
      : formatoCLP(p.precio);
    var filas = [["Formato", p.formato]];
    if (filtro && v) filas.push([filtro.titulo, filtro.opciones[v] || v]);
    filas.push(["Ingredientes", p.ingredientes], ["Elaboración", "Artesanal, en La Casita de Ginger (Chillán)."]);
    $("md-ficha").innerHTML = filas.filter(function (f) { return f[1]; }).map(function (f) {
      return "<dt>" + escapar(f[0]) + "</dt><dd>" + escapar(f[1]) + "</dd>";
    }).join("");
    $("form-comentario").reset();
    iniciarComentarios(p);
    $("md-cantidad").value = 1;
    $("md-agregado").hidden = true;
    ventana(modal).show();
    modal.querySelector(".modal-body").scrollTop = 0;
  }

  document.addEventListener("click", function (e) {
    var enlace = e.target.closest("#lista-productos .ver-mas, #lista-productos .producto-imagen, #lista-productos h3 a");
    if (!enlace) return;
    var id = enlace.closest(".producto").dataset.id;
    var p = todosLosProductos().filter(function (x) { return String(x.id) === id; })[0];
    if (!p) return;
    e.preventDefault();
    abrir(p);
  });
  // «Ver comentarios» baja a los comentarios dentro del mismo modal
  $("detalle-comentarios").addEventListener("click", function () {
    $("comentarios").scrollIntoView({ behavior: "smooth", block: "start" });
    $("comentarios").focus({ preventScroll: true });
  });
  $("md-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var cantidad = Math.max(1, Math.min(20, Number($("md-cantidad").value) || 1));
    agregarAlCarrito({ id: String(actual.id), nombre: actual.nombre, precio: precioFinal(actual) }, cantidad);
    $("md-agregado").hidden = false;
  });
  // «Ver carrito» lo maneja iniciarPanelCarrito: cierra este modal y abre el carrito
}

/* ---------- Comentarios en matriz 4x2 ---------- */
// Los comentarios iniciales vienen de productos.js;
// los nuevos se guardan en el navegador y se agregan a continuación.
function iniciarComentarios(producto) {
  var clave = "comentariosGinger3-" + producto.id;
  var lista = document.getElementById("lista-comentarios");
  var vacio = document.getElementById("sin-comentarios");
  var form = document.getElementById("form-comentario");
  var indicador = document.getElementById("comentarios-pagina");
  var anterior = document.getElementById("comentarios-anterior");
  var siguiente = document.getElementById("comentarios-siguiente");
  var contador = document.getElementById("detalle-comentarios");
  var iniciales = producto.comentarios || [];
  var pagina = 0;

  var envio = cajaEnvio("envio-comentario", form);
  envio.hidden = true;

  // Iniciales (productos.js) + publicados o aprobados + propios pendientes de aprobación
  function todos() {
    var visibles = opinionesVisibles().comentarios.filter(function (c) { return c.productoId === producto.id; });
    var ids = visibles.map(function (c) { return c.id; });
    var quitadas = opinionesQuitadas();
    var propios = leer(clave, []).map(function (c, i) {
      return Object.assign({}, c, { id: c.id || clave + "-" + i, pendiente: true });
    }).filter(function (c) { return ids.indexOf(c.id) === -1 && quitadas.indexOf(c.id) === -1; });
    return iniciales.concat(visibles, propios);
  }

  function pintar(irAlFinal) {
    var comentarios = todos();
    var paginas = Math.max(1, Math.ceil(comentarios.length / POR_PAGINA));
    if (irAlFinal) pagina = paginas - 1;
    pagina = Math.min(Math.max(pagina, 0), paginas - 1);
    vacio.hidden = comentarios.length > 0;
    contador.textContent = (contador.tagName === "BUTTON" ? "💬 Ver comentarios (" + comentarios.length + ")" : "💬 " + comentarios.length + (comentarios.length === 1 ? " comentario" : " comentarios"));
    lista.innerHTML = comentarios.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA).map(function (c, i) {
      var nuevo = irAlFinal && pagina * POR_PAGINA + i === comentarios.length - 1;
      return '<li class="comentario' + (nuevo ? " comentario-nuevo" : "") + '"><article>' +
        '<h3>' + escapar(c.autor) + '</h3>' +
        '<blockquote><p>' + escapar(c.texto) + '</p></blockquote>' +
        '<p><small><time datetime="' + c.fecha + '">' + new Date(c.fecha.length === 10 ? c.fecha + "T12:00" : c.fecha).toLocaleDateString("es-CL") + '</time></small></p>' +
        (c.pendiente ? marcaPendiente() : '') +
        '</article></li>';
    }).join("");
    indicador.textContent = "Página " + (pagina + 1) + " de " + paginas;
    anterior.disabled = pagina === 0;
    siguiente.disabled = pagina >= paginas - 1;
  }

  anterior.onclick = function () { pagina--; pintar(); };
  siguiente.onclick = function () { pagina++; pintar(); };

  form.onsubmit = function (e) {
    e.preventDefault();
    var nuevos = leer(clave, []);
    var nuevo = {
      id: "c" + Date.now(),
      productoId: producto.id,
      autor: form.nombre.value.trim(),
      texto: form.comentario.value.trim(),
      fecha: new Date().toISOString()
    };
    nuevos.push(nuevo);
    guardar(clave, nuevos);
    form.reset();
    pintar(true);
    mostrarEnvio(envio, "C", nuevo, producto);
  };

  pintar();
}

/* ---------- Carrito de compra (compartido entre páginas) ---------- */
var carrito = [];

function agregarAlCarrito(producto, cantidad) {
  var item = carrito.filter(function (i) { return i.id === producto.id; })[0];
  if (item) {
    item.cantidad += cantidad;
  } else {
    carrito.push({ id: producto.id, nombre: producto.nombre, precio: Number(producto.precio), cantidad: cantidad });
  }
  actualizarCarrito();
}

function iniciarCarrito() {
  carrito = leer("carritoGinger", []);

  // Las tarjetas se crean con JavaScript, por eso el clic se escucha en el documento
  document.addEventListener("click", function (e) {
    var boton = e.target.closest("button.agregar");
    if (!boton || boton.disabled) return;
    var tarjeta = boton.closest(".producto").dataset;
    agregarAlCarrito({ id: tarjeta.id, nombre: tarjeta.nombre, precio: tarjeta.precio }, 1);
    boton.textContent = "¡Agregado! (+1)";
    setTimeout(function () { boton.textContent = "Agregar al carrito"; }, 1200);
  });

  document.getElementById("vaciar-carrito").addEventListener("click", function () {
    carrito = [];
    actualizarCarrito();
  });

  iniciarPedido();
  actualizarCarrito();
}

/* ---------- Solicitar pedido: datos de despacho, guía en PDF y envío por WhatsApp ---------- */
// Pasos: 1 carrito → 2 datos de despacho → 3 envío. Al enviar, la guía se descarga y se abre WhatsApp con el
// detalle del pedido. En el celular, si el navegador lo permite, la guía se adjunta al compartir por WhatsApp.
function marcarPaso(n) {
  document.querySelectorAll("#pasos-pedido li").forEach(function (li) {
    var p = Number(li.dataset.paso);
    li.classList.toggle("activo", p === n);
    li.classList.toggle("hecho", p < n);
    if (p === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
  });
}

function mensajePedido(datos, numero) {
  var lineas = carrito.map(function (i) {
    return "- " + i.cantidad + " x " + i.nombre + " (" + formatoCLP(i.precio * i.cantidad) + ")";
  });
  return "¡Hola, Casita de Ginger! Quiero solicitar este pedido (guía de despacho N° " + ("000" + numero).slice(-4) + "):\n" +
    lineas.join("\n") + "\nTotal: " + formatoCLP(total()) +
    "\n\nNombre: " + datos.nombre + "\nTeléfono: " + datos.telefono +
    "\nEntrega: " + datos.entrega + (datos.entrega === "Despacho a domicilio" ? " - " + datos.direccion + ", " + datos.comuna : "") +
    "\nFecha: " + datos.fecha.split("-").reverse().join("-") + " (" + datos.horario + ")" +
    (datos.observaciones ? "\nObservaciones: " + datos.observaciones : "") +
    "\n\nAdjunto la guía de despacho en PDF.";
}

function iniciarPedido() {
  var boton = document.getElementById("haz-tu-pedido");
  var form = document.getElementById("form-pedido");
  var mensaje = document.getElementById("mensaje-guia");
  var direccion = document.getElementById("pedido-direccion");
  var comuna = document.getElementById("pedido-comuna");
  var fecha = document.getElementById("pedido-fecha");

  function isoLocal(d) {
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }

  function segunEntrega() {
    var despacho = form.entrega.value === "Despacho a domicilio";
    direccion.required = despacho;
    direccion.disabled = !despacho;
    comuna.disabled = !despacho;
  }

  function mostrar(visible) {
    form.hidden = !visible;
    boton.setAttribute("aria-expanded", visible);
    marcarPaso(visible ? 2 : 1);
  }

  boton.addEventListener("click", function () {
    if (!carrito.length) {
      alert("Tu carrito está vacío. Agrega productos antes de solicitar tu pedido.");
      return;
    }
    var hoy = new Date();
    var manana = new Date(hoy.getTime() + 24 * 3600 * 1000);
    fecha.min = isoLocal(hoy);
    if (!fecha.value) fecha.value = isoLocal(manana);
    mensaje.hidden = true;
    mostrar(form.hidden);
    if (!form.hidden) document.getElementById("pedido-nombre").focus();
  });

  document.getElementById("cancelar-pedido").addEventListener("click", function () { mostrar(false); });
  Array.prototype.forEach.call(form.entrega, function (r) { r.addEventListener("change", segunEntrega); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!carrito.length) return;
    var numero = leer("guiaGingerNumero", 0) + 1;
    var datos = {
      nombre: form.nombre.value.trim(),
      telefono: form.telefono.value.trim(),
      correo: form.correo.value.trim(),
      entrega: form.entrega.value,
      direccion: direccion.value.trim(),
      comuna: comuna.value,
      fecha: fecha.value,
      horario: form.horario.value,
      observaciones: form.observaciones.value.trim()
    };
    var resultado = window.generarGuiaDespacho(datos, carrito, numero); // descarga la guía en PDF
    var texto = mensajePedido(datos, numero);
    var folio = ("000" + numero).slice(-4);
    guardar("guiaGingerNumero", numero);
    mostrar(false);
    marcarPaso(3);

    // Celular: menú «Compartir» con la guía adjunta. Computador: WhatsApp con el detalle del pedido.
    var archivo = window.File ? new File([resultado.pdf], resultado.nombre, { type: "application/pdf" }) : null;
    var puedeAdjuntar = archivo && navigator.canShare && window.matchMedia("(pointer: coarse)").matches &&
                        navigator.canShare({ files: [archivo] });
    function abrirWhatsApp() {
      window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto), "_blank");
    }
    if (puedeAdjuntar) {
      navigator.share({ files: [archivo], title: "Guía de despacho N° " + folio, text: texto }).catch(abrirWhatsApp);
      mensaje.textContent = "✔ Guía de despacho N° " + folio + " descargada. Elige WhatsApp en el menú «Compartir» para enviarla junto con tu pedido.";
    } else {
      abrirWhatsApp();
      mensaje.textContent = "✔ Guía de despacho N° " + folio + " descargada (" + resultado.nombre + "). Se abrió WhatsApp con el detalle de tu pedido: adjunta la guía descargada y envía el mensaje.";
    }
    mensaje.hidden = false;
  });

  segunEntrega();
}

function total() {
  return carrito.reduce(function (s, i) { return s + i.precio * i.cantidad; }, 0);
}

function cambiarCantidad(id, delta) {
  var item = carrito.filter(function (i) { return i.id === id; })[0];
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) carrito = carrito.filter(function (i) { return i.id !== id; });
  actualizarCarrito();
}

function actualizarCarrito() {
  var cuerpo = document.getElementById("carrito-items");
  cuerpo.innerHTML = "";

  carrito.forEach(function (i) {
    var fila = document.createElement("tr");
    fila.innerHTML =
      "<td>" + escapar(i.nombre) + "</td>" +
      "<td>" + formatoCLP(i.precio) + "</td>" +
      "<td><button type='button' aria-label='Quitar uno'>−</button> " + i.cantidad +
      " <button type='button' aria-label='Agregar uno'>+</button></td>" +
      "<td>" + formatoCLP(i.precio * i.cantidad) + "</td>" +
      "<td><button type='button'>Eliminar</button></td>";
    var botones = fila.querySelectorAll("button");
    botones[0].addEventListener("click", function () { cambiarCantidad(i.id, -1); });
    botones[1].addEventListener("click", function () { cambiarCantidad(i.id, 1); });
    botones[2].addEventListener("click", function () { cambiarCantidad(i.id, -i.cantidad); });
    cuerpo.appendChild(fila);
  });

  var unidades = carrito.reduce(function (s, i) { return s + i.cantidad; }, 0);
  document.getElementById("contador-carrito").textContent = unidades;
  document.getElementById("carrito-total").textContent = formatoCLP(total());
  document.getElementById("tabla-carrito").hidden = !carrito.length;
  document.getElementById("carrito-vacio").hidden = carrito.length > 0;

  guardar("carritoGinger", carrito);
}
