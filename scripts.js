// Configuración Firebase con tus credenciales
const firebaseConfig = {
    apiKey: "AIzaSyBX2bSFSM9WoLKr5rn64YAQRrHng1YsS0w",
    authDomain: "sistemadrcerkvenih.firebaseapp.com",
    databaseURL: "https://sistemadrcerkvenih-default-rtdb.firebaseio.com",
    projectId: "sistemadrcerkvenih",
    storageBucket: "sistemadrcerkvenih.firebasestorage.app",
    messagingSenderId: "229763349214",
    appId: "1:229763349214:web:d8dcb2218a178eb111204f"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Variables globales
let pacientes = { espera: [], atencion: [] };
let historial = [];
let contadorAtendidos = 0;
let sonidoActivado = true;
let totalHoy = 0;

// Elementos del DOM
const agregarBtn = document.getElementById('agregarBtn');
const audioControl = document.getElementById('audioControl');
const sonidoLlamada = document.getElementById('sonidoLlamada');

// Referencias a la base de datos
const refPacientes = database.ref('pacientes');
const refHistorial = database.ref('historial');
const refContadores = database.ref('contadores');

// Cargar datos iniciales
function cargarDatos() {
    refPacientes.on('value', (snapshot) => {
        try {
            const data = snapshot.val();
            pacientes = data || { espera: [], atencion: [] };
            renderizarListas();
        } catch (error) {
            console.error('Error al cargar pacientes:', error);
        }
    });

    refHistorial.on('value', (snapshot) => {
        try {
            historial = snapshot.val() || [];
            renderizarHistorial();
            actualizarResumenDiario();
        } catch (error) {
            console.error('Error al cargar historial:', error);
        }
    });

    refContadores.on('value', (snapshot) => {
        try {
            const data = snapshot.val() || {};
            contadorAtendidos = data.atendidos || 0;
            totalHoy = data.totalHoy || 0;
            actualizarContadores();
        } catch (error) {
            console.error('Error al cargar contadores:', error);
        }
    });
}

// Guardar datos en Firebase
function guardarDatos() {
    try {
        const updates = {
            pacientes: pacientes,
            historial: historial,
            contadores: {
                atendidos: contadorAtendidos,
                totalHoy: totalHoy
            }
        };
        
        database.ref().update(updates)
            .then(() => console.log('Datos guardados correctamente'))
            .catch(error => console.error('Error al guardar datos:', error));
    } catch (error) {
        console.error('Error en guardarDatos:', error);
    }
}

// Función para agregar paciente (mejorada)
function agregarPaciente() {
    try {
        const nombreInput = document.getElementById('nombrePaciente');
        const obraSocialInput = document.getElementById('obraSocial');
        const montoInput = document.getElementById('monto');
        
        const nombre = nombreInput.value.trim();
        const obraSocial = obraSocialInput.value.trim() || "Particular";
        const monto = parseFloat(montoInput.value) || 0;
        const prioridad = document.getElementById('prioridad').value;
        
        if (!nombre) {
            alert('Por favor ingresa un nombre válido');
            return;
        }
        
        const nuevoPaciente = {
            id: Date.now(),
            nombre,
            obraSocial,
            monto,
            prioridad,
            horaRegistro: new Date().toLocaleTimeString(),
            fechaRegistro: new Date().toLocaleDateString()
        };
        
        pacientes.espera.push(nuevoPaciente);
        guardarDatos();
        
        // Limpiar inputs
        nombreInput.value = '';
        obraSocialInput.value = '';
        montoInput.value = '';
        nombreInput.focus();
    } catch (error) {
        console.error('Error en agregarPaciente:', error);
        alert('Ocurrió un error al agregar el paciente');
    }
}

// Función para llamar paciente (corregida)
function llamarPaciente(id) {
    try {
        id = Number(id);
        if (isNaN(id)) throw new Error('ID de paciente inválido');
        
        const pacienteIndex = pacientes.espera.findIndex(p => p.id === id);
        if (pacienteIndex === -1) throw new Error('Paciente no encontrado');
        
        const [paciente] = pacientes.espera.splice(pacienteIndex, 1);
        paciente.horaLlamado = new Date().toLocaleTimeString();
        pacientes.atencion.push(paciente);
        
        // Reproducir sonido si está activado
        if (sonidoActivado && sonidoLlamada) {
            sonidoLlamada.currentTime = 0;
            sonidoLlamada.play().catch(e => console.warn('No se pudo reproducir sonido:', e));
        }
        
        // Actualizar Firebase y la interfaz
        guardarDatos();
        renderizarListas();
    } catch (error) {
        console.error('Error en llamarPaciente:', error);
        alert('No se pudo llamar al paciente: ' + error.message);
    }
}

// Función para finalizar atención (mejorada)
function finalizarAtencion(id) {
    try {
        id = Number(id);
        const pacienteIndex = pacientes.atencion.findIndex(p => p.id === id);
        
        if (pacienteIndex === -1) throw new Error('Paciente no encontrado en atención');
        
        const [paciente] = pacientes.atencion.splice(pacienteIndex, 1);
        paciente.horaFinalizacion = new Date().toLocaleTimeString();
        paciente.fechaFinalizacion = new Date().toLocaleDateString();
        
        // Agregar al historial (limitar a 50 registros)
        historial.unshift(paciente);
        if (historial.length > 50) historial.pop();
        
        // Actualizar contadores
        contadorAtendidos++;
        totalHoy += paciente.monto || 0;
        
        // Guardar cambios
        guardarDatos();
        renderizarListas();
        renderizarHistorial();
        actualizarResumenDiario();
    } catch (error) {
        console.error('Error en finalizarAtencion:', error);
        alert('No se pudo finalizar la atención: ' + error.message);
    }
}

// Funciones de renderizado (optimizadas)
function renderizarListas() {
    renderizarLista('espera', pacientes.espera, true);
    renderizarLista('atencion', pacientes.atencion, false);
    actualizarContadores();
}

function renderizarLista(idLista, listaPacientes, mostrarBotonLlamar) {
    const ul = document.getElementById(idLista);
    if (!ul) return;
    
    ul.innerHTML = '';
    
    listaPacientes.forEach(paciente => {
        const li = document.createElement('li');
        li.className = paciente.prioridad;
        
        li.innerHTML = `
            <div class="paciente-info">
                <div class="paciente-nombre">${paciente.nombre}</div>
                <div class="paciente-detalle">
                    <span>${paciente.obraSocial}</span>
                    ${paciente.monto > 0 ? `<span class="badge badge-monto">$${paciente.monto.toFixed(2)}</span>` : ''}
                    <span class="badge badge-${paciente.prioridad}">${paciente.prioridad.toUpperCase()}</span>
                    <span class="timestamp">Registro: ${paciente.horaRegistro}</span>
                    ${paciente.horaLlamado ? `<span class="timestamp">Llamado: ${paciente.horaLlamado}</span>` : ''}
                </div>
            </div>
            ${mostrarBotonLlamar ? 
                `<button class="btn-llamar" onclick="llamarPaciente(${paciente.id})">Llamar</button>` : 
                `<button class="btn-finalizar" onclick="finalizarAtencion(${paciente.id})">Finalizar</button>`}
        `;
        
        ul.appendChild(li);
    });
}

function renderizarHistorial() {
    const historialContainer = document.getElementById('historial');
    if (!historialContainer) return;
    
    historialContainer.innerHTML = '';
    
    if (historial.length === 0) {
        historialContainer.innerHTML = '<p style="text-align: center; color: #777;">No hay registros de atención aún</p>';
        return;
    }
    
    let currentDate = '';
    
    historial.forEach(paciente => {
        const pacienteDate = paciente.fechaFinalizacion;
        
        if (pacienteDate !== currentDate) {
            currentDate = pacienteDate;
            const totalDia = historial
                .filter(p => p.fechaFinalizacion === currentDate)
                .reduce((sum, p) => sum + (p.monto || 0), 0);
            
            const daySeparator = document.createElement('div');
            daySeparator.className = 'day-separator';
            daySeparator.innerHTML = `
                <span>${currentDate}</span>
                <span class="day-total">Total: $${totalDia.toFixed(2)}</span>
            `;
            historialContainer.appendChild(daySeparator);
        }
        
        const item = document.createElement('div');
        item.className = 'historial-item atendido';
        item.innerHTML = `
            <div class="historial-header">
                <div class="historial-paciente">${paciente.nombre}</div>
                <div class="timestamp">${paciente.horaFinalizacion}</div>
            </div>
            <div class="historial-detalle">
                <span>${paciente.obraSocial}</span>
                ${paciente.monto > 0 ? `<span class="badge badge-monto">$${paciente.monto.toFixed(2)}</span>` : ''}
                <span class="badge badge-${paciente.prioridad}">${paciente.prioridad.toUpperCase()}</span>
                <span class="badge badge-obra-social">OBRA SOCIAL</span>
            </div>
        `;
        historialContainer.appendChild(item);
    });
}

function actualizarResumenDiario() {
    const hoy = new Date().toLocaleDateString();
    const pacientesHoy = historial.filter(p => p.fechaFinalizacion === hoy);
    
    const obrasSociales = {};
    pacientesHoy.forEach(paciente => {
        if (!obrasSociales[paciente.obraSocial]) {
            obrasSociales[paciente.obraSocial] = { count: 0, total: 0 };
        }
        obrasSociales[paciente.obraSocial].count++;
        obrasSociales[paciente.obraSocial].total += paciente.monto || 0;
    });
    
    const resumenObrasSociales = document.getElementById('resumenObrasSociales');
    if (!resumenObrasSociales) return;
    
    resumenObrasSociales.innerHTML = '';
    const obrasOrdenadas = Object.entries(obrasSociales).sort((a, b) => b[1].total - a[1].total);
    
    obrasOrdenadas.forEach(([obraSocial, datos]) => {
        const item = document.createElement('div');
        item.className = 'resumen-item';
        item.innerHTML = `
            <span>${obraSocial}</span>
            <span>${datos.count} paciente(s) - $${datos.total.toFixed(2)}</span>
        `;
        resumenObrasSociales.appendChild(item);
    });
    
    const totalDia = pacientesHoy.reduce((sum, p) => sum + (p.monto || 0), 0);
    const totalHoyElement = document.getElementById('totalHoy');
    if (totalHoyElement) {
        totalHoyElement.textContent = `Total: $${totalDia.toFixed(2)}`;
    }
}

function actualizarContadores() {
    const contadorEspera = document.getElementById('contadorEspera');
    const contadorAtencion = document.getElementById('contadorAtencion');
    const contadorAtendidosElement = document.getElementById('contadorAtendidos');
    const contadorMonto = document.getElementById('contadorMonto');
    
    if (contadorEspera) contadorEspera.textContent = pacientes.espera.length;
    if (contadorAtencion) contadorAtencion.textContent = pacientes.atencion.length;
    if (contadorAtendidosElement) contadorAtendidosElement.textContent = contadorAtendidos;
    if (contadorMonto) contadorMonto.textContent = `$${totalHoy.toFixed(2)}`;
}

function toggleSonido() {
    sonidoActivado = !sonidoActivado;
    if (audioControl) {
        audioControl.textContent = sonidoActivado ? '🔔' : '🔕';
        audioControl.title = sonidoActivado ? 'Sonido activado' : 'Sonido desactivado';
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    try {
        cargarDatos();
        
        if (agregarBtn) {
            agregarBtn.addEventListener('click', agregarPaciente);
        }
        
        if (audioControl) {
            audioControl.addEventListener('click', toggleSonido);
        }
        
        const nombreInput = document.getElementById('nombrePaciente');
        if (nombreInput) {
            nombreInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') agregarPaciente();
            });
        }
    } catch (error) {
        console.error('Error en la inicialización:', error);
    }
});

// Hacer funciones accesibles globalmente
window.llamarPaciente = llamarPaciente;
window.finalizarAtencion = finalizarAtencion;