// Variables globales
let pacientes = {
    espera: [],
    atencion: []
};

let historial = [];
let contadorAtendidos = 0;
let sonidoActivado = true;
let totalHoy = 0;

// Elementos del DOM
const agregarBtn = document.getElementById('agregarBtn');
const audioControl = document.getElementById('audioControl');
const sonidoLlamada = document.getElementById('sonidoLlamada');

// Sincronización entre pestañas
function sincronizarDatos() {
    // Emitir evento cuando los datos cambien
    window.dispatchEvent(new CustomEvent('datosActualizados', {
        detail: {
            pacientes,
            historial,
            contadorAtendidos,
            totalHoy
        }
    }));
}

// Escuchar cambios desde otras pestañas
window.addEventListener('storage', (e) => {
    if (e.key === 'sistemaDrCerkvenih') {
        const datos = JSON.parse(e.newValue);
        actualizarDesdeStorage(datos);
    }
});

window.addEventListener('datosActualizados', (e) => {
    actualizarDesdeStorage(e.detail);
});

function actualizarDesdeStorage(datos) {
    pacientes = datos.pacientes;
    historial = datos.historial;
    contadorAtendidos = datos.contadorAtendidos;
    totalHoy = datos.totalHoy;
    
    renderizarListas();
    renderizarHistorial();
    actualizarResumenDiario();
    actualizarContadores();
}

// Guardar en localStorage y sincronizar
function guardarDatos() {
    const datos = {
        pacientes,
        historial,
        contadorAtendidos,
        totalHoy,
        timestamp: Date.now()
    };
    
    localStorage.setItem('sistemaDrCerkvenih', JSON.stringify(datos));
    sincronizarDatos();
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    setInterval(verificarCambiosRemotos, 3000); // Verificar cada 3 segundos
});

function cargarDatos() {
    const datosGuardados = localStorage.getItem('sistemaDrCerkvenih');
    if (datosGuardados) {
        const datos = JSON.parse(datosGuardados);
        pacientes = datos.pacientes || { espera: [], atencion: [] };
        historial = datos.historial || [];
        contadorAtendidos = datos.contadorAtendidos || 0;
        totalHoy = datos.totalHoy || 0;
    }
    
    renderizarListas();
    renderizarHistorial();
    actualizarResumenDiario();
    actualizarContadores();
    
    // Configurar event listeners
    agregarBtn.addEventListener('click', agregarPaciente);
    audioControl.addEventListener('click', toggleSonido);
    document.getElementById('nombrePaciente').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') agregarPaciente();
    });
});

function verificarCambiosRemotos() {
    const datosGuardados = localStorage.getItem('sistemaDrCerkvenih');
    if (datosGuardados) {
        const datos = JSON.parse(datosGuardados);
        if (datos.timestamp > (window.ultimaActualizacion || 0)) {
            actualizarDesdeStorage(datos);
            window.ultimaActualizacion = datos.timestamp;
        }
    }
}

// El resto de tus funciones permanecen igual (agregarPaciente, llamarPaciente, finalizarAtencion, etc.)
// Solo asegúrate de que todas llamen a guardarDatos() después de modificar datos
