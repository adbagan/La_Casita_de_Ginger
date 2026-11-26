// La Casita de Ginger - almacenamiento del catálogo SIN base de datos.
//
// 1) IndexedDB (base de datos que trae el propio navegador, no un servidor): guarda los productos
//    cargados desde «Cargar producto» con su imagen como archivo (Blob). A diferencia de localStorage
//    (unos 5 MB), admite cientos de MB, así que caben muchos productos con foto.
// 2) Archivo de catálogo js/catalogo-datos.js: contiene los productos PUBLICADOS, los que ven todos los
//    visitantes. Se genera desde «Cargar producto» (descargándolo o guardándolo directo en la carpeta
//    del sitio) y se sube al hosting junto con las páginas. Es un archivo .js (y no .json) para que el
//    navegador lo cargue también cuando el sitio se abre con doble clic, sin servidor.

var Almacen = (function () {
  var NOMBRE_BD = "casitaGinger";
  var TIENDA = "productos";
  var bd = null;       // conexión con IndexedDB (null si el navegador no la permite)
  var cache = [];      // productos cargados en este navegador, listos para mostrar

  /* ---------- Conversión de imágenes ---------- */
  function dataUrlABlob(url) {
    var partes = url.split(",");
    var tipo = (partes[0].match(/:(.*?);/) || [, "image/jpeg"])[1];
    var bin = atob(partes[1]);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: tipo });
  }

  function blobADataUrl(blob) {
    return new Promise(function (ok, falla) {
      var lector = new FileReader();
      lector.onload = function () { ok(lector.result); };
      lector.onerror = function () { falla(lector.error); };
      lector.readAsDataURL(blob);
    });
  }

  /* ---------- IndexedDB ---------- */
  function abrir() {
    return new Promise(function (ok, falla) {
      if (!window.indexedDB) { falla(new Error("Este navegador no tiene IndexedDB")); return; }
      var solicitud = indexedDB.open(NOMBRE_BD, 1);
      solicitud.onupgradeneeded = function () {
        solicitud.result.createObjectStore(TIENDA, { keyPath: "id" });
      };
      solicitud.onsuccess = function () { ok(solicitud.result); };
      solicitud.onerror = function () { falla(solicitud.error); };
    });
  }

  function transaccion(modo, accion) {
    return new Promise(function (ok, falla) {
      var tx = bd.transaction(TIENDA, modo);
      var pedido = accion(tx.objectStore(TIENDA));
      tx.oncomplete = function () { ok(pedido ? pedido.result : undefined); };
      tx.onerror = tx.onabort = function () { falla(tx.error); };
    });
  }

  // Registro guardado → producto para mostrar (la imagen-archivo se convierte en una URL temporal)
  function paraMostrar(registro) {
    var p = Object.assign({}, registro);
    if (registro.imagenArchivo) p.imagen = URL.createObjectURL(registro.imagenArchivo);
    return p;
  }

  // Producto del formulario → registro de IndexedDB (la imagen se guarda como archivo, no como texto)
  function paraGuardar(p) {
    var r = Object.assign({}, p, { creado: p.creado || Date.now() });
    if (r.imagen && r.imagen.indexOf("data:") === 0) {
      r.imagenArchivo = dataUrlABlob(r.imagen);
      r.imagen = "";
    }
    return r;
  }

  // Productos que quedaron en localStorage (versión anterior) pasan a IndexedDB una sola vez
  function migrarLocalStorage() {
    var antiguos;
    try { antiguos = JSON.parse(localStorage.getItem("productosGinger")) || []; } catch (e) { antiguos = []; }
    if (!antiguos.length) return Promise.resolve();
    return transaccion("readwrite", function (tienda) {
      antiguos.forEach(function (p) { tienda.put(paraGuardar(p)); });
    }).then(function () { localStorage.removeItem("productosGinger"); });
  }

  function leerTodo() {
    return transaccion("readonly", function (tienda) { return tienda.getAll(); }).then(function (lista) {
      cache = (lista || []).sort(function (a, b) { return a.creado - b.creado; }).map(paraMostrar);
    });
  }

  /* ---------- Respaldo: si el navegador bloquea IndexedDB se usa localStorage ---------- */
  function leerLocal() {
    try { return JSON.parse(localStorage.getItem("productosGinger")) || []; } catch (e) { return []; }
  }
  function guardarLocal(lista) {
    localStorage.setItem("productosGinger", JSON.stringify(lista));
  }

  /* ---------- API pública ---------- */
  function iniciar() {
    return abrir()
      .then(function (conexion) { bd = conexion; return migrarLocalStorage(); })
      .then(leerTodo)
      .catch(function () { bd = null; cache = leerLocal(); });
  }

  function publicados() {
    var c = window.CATALOGO_PUBLICADO;
    return (c && c.productos) || [];
  }

  function esPublicado(id) {
    return publicados().some(function (p) { return p.id === id; });
  }

  // Productos cargados en este navegador que todavía no están publicados en el archivo
  function cargados() {
    return cache.filter(function (p) { return !esPublicado(p.id); });
  }

  function agregar(p) {
    if (!bd) {
      try { guardarLocal(leerLocal().concat(p)); } catch (e) { return Promise.reject(e); }
      cache = leerLocal();
      return Promise.resolve();
    }
    var registro = paraGuardar(p);
    return transaccion("readwrite", function (tienda) { tienda.put(registro); })
      .then(function () { cache.push(paraMostrar(registro)); });
  }

  function eliminar(id) {
    var quitar = function () {
      cache = cache.filter(function (p) {
        if (p.id === id && p.imagen && p.imagen.indexOf("blob:") === 0) URL.revokeObjectURL(p.imagen);
        return p.id !== id;
      });
    };
    if (!bd) { guardarLocal(leerLocal().filter(function (p) { return p.id !== id; })); quitar(); return Promise.resolve(); }
    return transaccion("readwrite", function (tienda) { tienda.delete(id); }).then(quitar);
  }

  /* ---------- Archivo de catálogo (js/catalogo-datos.js) ---------- */
  // Arma la lista que se publicará: publicados + cargados, sin los ocultos.
  // conImagenes(p, blob) decide cómo queda cada imagen (incrustada o como archivo en la carpeta).
  function armarCatalogo(ocultos, conImagenes, opiniones) {
    var lista = publicados().filter(function (p) { return ocultos.indexOf(p.id) === -1; })
      .map(function (p) { return { p: Object.assign({}, p), blob: null }; });
    cache.forEach(function (p) {
      if (esPublicado(p.id) || ocultos.indexOf(p.id) !== -1) return;
      var registro = Object.assign({}, p);
      lista.push({ p: registro, blob: null, local: true });
    });
    var pendientes = lista.map(function (item) {
      var p = item.p;
      var origen = p.imagen && p.imagen.indexOf("blob:") === 0
        ? fetch(p.imagen).then(function (r) { return r.blob(); })
        : Promise.resolve(p.imagen && p.imagen.indexOf("data:") === 0 ? dataUrlABlob(p.imagen) : null);
      return origen.then(function (blob) { return conImagenes(p, blob); });
    });
    var iniciales = (window.PRODUCTOS || []).map(function (p) { return p.id; });
    return Promise.all(pendientes).then(function (productos) {
      productos.forEach(function (p) { delete p.imagenArchivo; });
      return {
        generado: new Date().toISOString(),
        ocultos: ocultos.filter(function (id) { return iniciales.indexOf(id) !== -1; }),
        productos: productos,
        testimonios: (opiniones && opiniones.testimonios) || [],
        comentarios: (opiniones && opiniones.comentarios) || []
      };
    });
  }

  function textoArchivo(catalogo) {
    return "// Catálogo publicado de La Casita de Ginger.\n" +
      "// Archivo generado desde «Cargar producto» el " + new Date().toLocaleString("es-CL") + ".\n" +
      "// Reemplaza a una base de datos: súbelo a GitHub en la carpeta js/; Netlify lo publica con el sitio.\n" +
      "window.CATALOGO_PUBLICADO = " + JSON.stringify(catalogo, null, 1) + ";\n";
  }

  // Opción A: descargar catalogo-datos.js con las imágenes incrustadas (un solo archivo)
  function descargar(ocultos, opiniones) {
    return armarCatalogo(ocultos, function (p, blob) {
      if (!blob) return p;
      return blobADataUrl(blob).then(function (url) { p.imagen = url; return p; });
    }, opiniones).then(function (catalogo) {
      var archivo = new Blob([textoArchivo(catalogo)], { type: "text/javascript" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(archivo);
      a.download = "catalogo-datos.js";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return catalogo;
    });
  }

  // Opción B (Chrome y Edge de computador): escribir directo en la carpeta «sitio»
  // js/catalogo-datos.js + una imagen .jpg por producto en img/productos/cargados/
  function puedeGuardarEnCarpeta() {
    return typeof window.showDirectoryPicker === "function";
  }

  function escribir(carpeta, nombre, contenido) {
    return carpeta.getFileHandle(nombre, { create: true }).then(function (archivo) {
      return archivo.createWritable().then(function (escritor) {
        return escritor.write(contenido).then(function () { return escritor.close(); });
      });
    });
  }

  function guardarEnCarpeta(ocultos, opiniones) {
    var sitio, imagenes;
    return window.showDirectoryPicker({ id: "sitio-ginger", mode: "readwrite" })
      .then(function (c) {
        sitio = c;
        // Se comprueba que sea la carpeta del sitio (debe tener index.html)
        return sitio.getFileHandle("index.html").catch(function () {
          throw new Error("La carpeta elegida no es la del sitio: debe contener index.html.");
        });
      })
      .then(function () { return sitio.getDirectoryHandle("img", { create: true }); })
      .then(function (img) { return img.getDirectoryHandle("productos", { create: true }); })
      .then(function (prod) { return prod.getDirectoryHandle("cargados", { create: true }); })
      .then(function (c) {
        imagenes = c;
        return armarCatalogo(ocultos, function (p, blob) {
          if (!blob) return p;
          var nombre = p.id + ".jpg";
          return escribir(imagenes, nombre, blob).then(function () {
            p.imagen = "img/productos/cargados/" + nombre;
            return p;
          });
        }, opiniones);
      })
      .then(function (catalogo) {
        return sitio.getDirectoryHandle("js", { create: true }).then(function (js) {
          return escribir(js, "catalogo-datos.js", textoArchivo(catalogo));
        }).then(function () { return catalogo; });
      });
  }

  // Importar un catálogo (catalogo-datos.js o .json) para respaldar o pasar a otro equipo
  function importar(archivo) {
    return archivo.text().then(function (texto) {
      var json = texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1);
      var catalogo = JSON.parse(json);
      if (!catalogo || !Array.isArray(catalogo.productos)) throw new Error("El archivo no es un catálogo de La Casita de Ginger.");
      var iniciales = (window.PRODUCTOS || []).map(function (p) { return p.id; });
      var nuevos = catalogo.productos.filter(function (p) { return p && p.id && p.nombre && iniciales.indexOf(p.id) === -1; });
      return nuevos.reduce(function (cadena, p) {
        return cadena.then(function () {
          return eliminar(p.id).then(function () { return agregar(p); });
        });
      }, Promise.resolve()).then(function () {
        return { productos: nuevos.length, ocultos: catalogo.ocultos || [], testimonios: catalogo.testimonios || [], comentarios: catalogo.comentarios || [] };
      });
    });
  }

  function usaIndexedDB() { return !!bd; }

  return {
    iniciar: iniciar, cargados: cargados, publicados: publicados, esPublicado: esPublicado,
    agregar: agregar, eliminar: eliminar, descargar: descargar, guardarEnCarpeta: guardarEnCarpeta,
    puedeGuardarEnCarpeta: puedeGuardarEnCarpeta, importar: importar, usaIndexedDB: usaIndexedDB
  };
})();
