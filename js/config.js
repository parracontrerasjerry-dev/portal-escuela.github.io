/* ============================================================
   DATOS EDITABLES DEL PORTAL
   Este es el único archivo que el personal de la escuela debe
   modificar para actualizar el portal (abrir con el Bloc de notas).
   - Respeten las comillas " " y las comas al final de cada línea.
   - Si dejan un dato vacío ("") el portal muestra un mensaje
     alternativo en lugar de inventar información.
   ============================================================ */
const CONFIG = {

  // ---------- Datos generales ----------
  nombre: "U.E. Estadal Presbítero Fernando María Contreras",
  periodoEscolar: "2026-2027",
  direccion: "Calle principal, sector Centro, Capacho Nuevo, municipio Independencia, estado Táchira",
  telefono: "",            // Ej.: "0276-000.00.00"
  correo: "",              // Ej.: "escuela@correo.com"  (activa el envío de mensajes en la página Noticias)
  horarioAtencion: "",     // Ej.: "Lunes a viernes, de 7:00 a.m. a 12:00 m."

  // ---------- Proceso de inscripción ----------
  inscripcion: {
    desde: "",             // Ej.: "2026-07-01"  (año-mes-día)
    hasta: "",             // Ej.: "2026-07-31"
    nota:  ""              // Mensaje adicional para los representantes
  },

  // ---------- Niveles y grados que atiende la escuela ----------
  niveles: {
    "Educación Inicial": ["1.er nivel", "2.º nivel", "3.er nivel"],
    "Educación Primaria": ["1.er grado", "2.º grado", "3.er grado", "4.º grado", "5.º grado", "6.º grado"]
  },

  // ---------- Recaudos de inscripción ----------
  // LISTA REFERENCIAL: la secretaría debe confirmarla y ajustarla cada año escolar.
  // "todos" aplica a cualquier estudiante; los demás grupos se suman a esos.
  recaudos: {
    todos: [
      { t: "Planilla de pre-inscripción", d: "Se genera e imprime desde la página «Pre-carga de datos»." },
      { t: "Copia de la partida de nacimiento del estudiante", d: "Llevar también el original para su verificación." },
      { t: "Copia de la cédula de identidad del representante", d: "Ampliada y legible." },
      { t: "Dos fotografías tipo carnet del estudiante", d: "Con el nombre completo al reverso." },
      { t: "Copia de la cédula escolar o de identidad del estudiante", d: "Solo si el estudiante la posee." }
    ],
    inicial: [
      { t: "Carnet de vacunación al día", d: "Copia del esquema de vacunas vigente." },
      { t: "Constancia de retiro del plantel anterior", d: "Solo si el niño o la niña proviene de otra institución." }
    ],
    primero: [
      { t: "Constancia de culminación de Educación Inicial", d: "Emitida por el preescolar de procedencia." },
      { t: "Carnet de vacunación al día", d: "Copia del esquema de vacunas vigente." }
    ],
    segundoASexto: [
      { t: "Boletín final o constancia de notas del grado anterior", d: "Emitido y firmado por el plantel de procedencia." },
      { t: "Constancia de retiro del plantel anterior", d: "Solo si el estudiante proviene de otra institución." }
    ]
  },

  // ---------- Noticias y avisos ----------
  // Se muestran de arriba hacia abajo. Para agregar una, copien un bloque { ... },
  noticias: [
    {
      fecha: "2026-11-08",
      titulo: "Ya está disponible el portal informativo de la escuela",
      texto: "Los representantes pueden consultar los recaudos de inscripción y pre-cargar los datos del estudiante desde el computador o el teléfono, descargar la planilla en PDF, imprimirla y llevarla a la secretaría junto con los recaudos."
    }
  ],

  // ---------- Cronograma escolar ----------
  // Ejemplo:  { fecha: "2026-09-15", evento: "Inicio del período escolar" },
  cronograma: [
  ]
};
