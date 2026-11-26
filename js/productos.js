// Catálogo de La Casita de Ginger: un producto inicial por categoría.
// Son datos provisorios hasta tener la carta real; la emprendedora agrega sus propios
// productos con el botón «Cargar producto» (se guardan en el navegador).
// Campos propios de cada categoría, usados por los filtros:
//   tortas → personas · galletas → presentacion · pasteleria → porcion · tradicionales → temporada
var PRODUCTOS = [
  {
    id: "1",
    nombre: "Torta Casita de Ginger",
    categoria: "tortas",
    precio: 24990,
    precioOferta: null,
    etiqueta: "destacado",
    descripcion: "Bizcocho de vainilla y manjar, decorada como nuestra casita de jengibre.",
    detalle: "Nuestra torta insignia: tres capas de bizcocho de vainilla húmedo, relleno de manjar casero y crema chantilly, cubierta con fondant caramelo y una casita de jengibre comestible hecha a mano. Ideal para cumpleaños y celebraciones familiares.",
    formato: "15 porciones · 22 cm de diámetro",
    ingredientes: "Harina, huevos, azúcar, manjar, crema, mantequilla, jengibre, canela.",
    imagen: "img/productos/tortas/torta-casita.png",
    personas: 15,
    inicial: true,
    comentarios: [
      { autor: "Camila R.", texto: "La pedí para el cumpleaños de mi hija y fue la sensación. ¡Preciosa y muy rica!", fecha: "2026-07-14" },
      { autor: "Jorge M.", texto: "El bizcocho súper húmedo y el manjar casero se nota. Volveremos a pedirla.", fecha: "2026-08-02" }
    ]
  },
  {
    id: "2",
    nombre: "Galletas de jengibre Ginger",
    categoria: "galletas",
    precio: 6500,
    precioOferta: null,
    etiqueta: "nuevo",
    descripcion: "Nuestra galleta estrella, decorada a mano con glasé real.",
    detalle: "Galletas de jengibre con forma de Ginger, horneadas con miel, canela y clavo de olor, y decoradas una a una con glasé real. Vienen en una caja de regalo navideña.",
    formato: "Caja de 6 unidades · 10 cm c/u",
    ingredientes: "Harina, miel, mantequilla, jengibre, canela, clavo de olor, azúcar flor.",
    imagen: "img/productos/galletas/galletas-ginger.png",
    presentacion: "caja",
    inicial: true,
    comentarios: [
      { autor: "Carolina T.", texto: "Las regalé en la oficina y todos preguntaron dónde las compré.", fecha: "2026-09-02" }
    ]
  },
  {
    id: "3",
    nombre: "Cupcakes navideños",
    categoria: "pasteleria",
    precio: 7990,
    precioOferta: 6990,
    etiqueta: "oferta",
    descripcion: "Cupcakes de chocolate y vainilla con frosting navideño.",
    detalle: "Cupcakes esponjosos de chocolate y vainilla con frosting de mantequilla y decoración navideña: gorritos, árboles y cerezas.",
    formato: "Caja de 4 unidades",
    ingredientes: "Harina, cacao, huevos, mantequilla, azúcar flor, vainilla.",
    imagen: "img/productos/pasteleria/cupcakes-navidenos.png",
    porcion: "individual",
    inicial: true,
    comentarios: [
      { autor: "Josefa I.", texto: "Preciosos, los niños quedaron felices.", fecha: "2026-10-03" }
    ]
  },
  {
    id: "4",
    nombre: "Pan de Pascua artesanal",
    categoria: "tradicionales",
    precio: 8990,
    precioOferta: null,
    etiqueta: "destacado",
    descripcion: "Receta tradicional chilena con frutos secos y frutas confitadas.",
    detalle: "Pan de pascua húmedo y aromático, preparado con jengibre, frutas confitadas, pasas, nueces y almendras. En la casita lo horneamos durante todo el año.",
    formato: "1 kg",
    ingredientes: "Harina, huevos, azúcar rubia, frutas confitadas, pasas, nueces, almendras, jengibre, especias.",
    imagen: "img/productos/tradicionales/pan-de-pascua.png",
    temporada: "navidad",
    inicial: true,
    comentarios: [
      { autor: "Ana María F.", texto: "Pan de pascua en marzo… ¡y delicioso! Muy húmedo.", fecha: "2026-03-21" }
    ]
  }
];

var CATEGORIAS = {
  tortas: "Tortas",
  galletas: "Galletas",
  pasteleria: "Pastelería",
  tradicionales: "Tradicionales chilenas"
};

// Filtro propio de cada categoría: campo del producto, título y opciones.
var FILTROS_CATEGORIA = {
  tortas: { campo: "personas", titulo: "Cantidad de personas", opciones: { "10": "10 personas", "15": "15 personas", "20": "20 personas", "30": "30 personas" } },
  galletas: { campo: "presentacion", titulo: "Presentación", opciones: { unidad: "Por unidad", caja: "Caja de regalo", bolsa: "Bolsa" } },
  pasteleria: { campo: "porcion", titulo: "Porción", opciones: { individual: "Individual", compartir: "Para compartir" } },
  tradicionales: { campo: "temporada", titulo: "Temporada", opciones: { "todo-el-ano": "Todo el año", "fiestas-patrias": "Fiestas Patrias", navidad: "Navidad" } }
};

// Rangos del filtro de precio (se compara el precio final, con oferta si la tiene).
var RANGOS_PRECIO = {
  "0-5000": "Hasta $5.000",
  "5000-10000": "$5.000 a $10.000",
  "10000-20000": "$10.000 a $20.000",
  "20000-999999999": "Más de $20.000"
};
