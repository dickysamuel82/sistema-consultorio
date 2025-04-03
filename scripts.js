// Configuración de Firebase con tu base de datos
const firebaseConfig = {
    apiKey: "AIzaSyB1QdXwWn1IuZf7qJ7k7v6Z3X3X3X3X3X3",
    authDomain: "sistemadrcerkvenih.firebaseapp.com",
    databaseURL: "https://sistemadrcerkvenih-default-rtdb.firebaseio.com",
    projectId: "sistemadrcerkvenih",
    storageBucket: "sistemadrcerkvenih.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890abcdef"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Variables globales
let pacientes = { espera: [], atencion: [] };
let historial = [];
let contadorAtendidos = 0;
let sonidoActivado = true;
let totalHoy = 0;

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    configurarFirebase();
    configurarEventListeners();
});

function configurarFirebase() {
    // Verificar autenticación (opcional)
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("Usuario autenticado:", user.email);
            iniciarEscuchadores();
        } else {
            console.log("No autenticado - modo demo");
            // auth.signInAnonymously() para autenticación anónima si lo deseas
            iniciarEscuchadores();
        }
    });
}

function iniciarEscuchadores() {
    // Escuchar pacientes en espera
    database.ref('pacientes').orderByChild('estado').equalTo('espera').on('value', snapshot => {
        pacientes.espera = [];
        snapshot.forEach(childSnapshot => {
            const paciente = childSnapshot.val();
            paciente.id = childSnapshot.key;
            pacientes.espera.push(paciente);
        });
        renderizarLista('espera', pacientes.espera, true);
        actualizarContadores();
    });
    
    // Escuchar pacientes en atención
    database.ref('pacientes').orderByChild('estado').equalTo('atencion').on('value', snapshot => {
        pacientes.atencion = [];
        snapshot.forEach(childSnapshot => {
            const paciente = childSnapshot.val();
            paciente.id = childSnapshot.key;
            pacientes.atencion.push(paciente);
        });
        renderizarLista('atencion', pacientes.atencion, false);
        actualizarContadores();
    });
    
    // Escuchar historial
    database.ref('historial').orderByChild('timestamp').limitToLast(50).on('value', snapshot => {
        historial = [];
        snapshot.forEach(childSnapshot => {
            historial.unshift(childSnapshot.val()); // Más reciente primero
        });
        renderizarHistorial();
        actualizarResumenDiario();
    });
}

function configurarEventListeners() {
    // Botón agregar paciente
    document.getElementById('agregarBtn').addEventListener('click', agregarPaciente);
    
    // Enter en campo nombre
    document.getElementById('nombrePaciente').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') agregarPaciente();
    });
    
    // Control de audio
    document.getElementById('audioControl').addEventListener('click', toggleSonido);
}

// Resto de tus funciones (agregarPaciente, llamarPaciente, finalizarAtencion, etc.)
// se mantienen iguales pero usando database.ref() como en los ejemplos anteriores
function agregarPaciente() {
    const nombreInput = document.getElementById('nombrePaciente');
    const nombre = nombreInput.value.trim();
    
    if (!nombre) {
        alert('Por favor ingresa un nombre válido');
        return;
    }
    
    const nuevoPaciente = {
        nombre: nombre,
        obraSocial: document.getElementById('obraSocial').value.trim() || "Particular",
        monto: parseFloat(document.getElementById('monto').value) || 0,
        prioridad: document.getElementById('prioridad').value,
        horaRegistro: new Date().toLocaleTimeString(),
        fechaRegistro: new Date().toLocaleDateString(),
        estado: "espera",
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Guardar en Firebase
    database.ref('pacientes').push(nuevoPaciente)
        .then(() => {
            // Limpiar inputs
            nombreInput.value = '';
            document.getElementById('obraSocial').value = '';
            document.getElementById('monto').value = '';
            nombreInput.focus();
        })
        .catch(error => {
            console.error("Error al guardar paciente:", error);
            alert("Error al guardar paciente");
        });
}

function llamarPaciente(id) {
    database.ref('pacientes/' + id).update({
        estado: "atencion",
        horaLlamado: new Date().toLocaleTimeString()
    })
    .then(() => {
        if (sonidoActivado) {
            sonidoLlamada.currentTime = 0;
            sonidoLlamada.play();
        }
    })
    .catch(error => {
        console.error("Error al llamar paciente:", error);
    });
}

function finalizarAtencion(id) {
    database.ref('pacientes/' + id).once('value')
        .then(snapshot => {
            const paciente = snapshot.val();
            paciente.id = id;
            
            // Registrar en historial
            const atencionFinalizada = {
                ...paciente,
                horaFinalizacion: new Date().toLocaleTimeString(),
                fechaFinalizacion: new Date().toLocaleDateString(),
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            
            delete atencionFinalizada.estado;
            
            return database.ref('historial').push(atencionFinalizada)
                .then(() => database.ref('pacientes/' + id).remove());
        })
        .then(() => {
            // Actualizar estadísticas
            contadorAtendidos++;
            totalHoy += parseFloat(paciente.monto) || 0;
            actualizarEstadisticas();
        })
        .catch(error => {
            console.error("Error al finalizar atención:", error);
        });
}

function actualizarEstadisticas() {
    const hoy = new Date().toLocaleDateString();
    
    database.ref('estadisticas/' + hoy).set({
        contadorAtendidos: contadorAtendidos,
        totalHoy: totalHoy,
        ultimaActualizacion: firebase.database.ServerValue.TIMESTAMP
    });
}