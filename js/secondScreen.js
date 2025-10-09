// js/secondScreen.js - VERSIÓN FINAL con gestión de clases de estado

const { ipcRenderer } = require('electron');

// --- Selectores del DOM ---
const secondCounter = document.querySelector('.second-counter');
const messageText = document.getElementById('message_text');
const screenVideo = document.getElementById('screen-video');
const dateTimeField = document.querySelector('.datetime');
const raisedHandsList = document.getElementById('raised-hands-list');

// --- Lógica del Reloj ---
function updateClock() {
    if (dateTimeField) {
        dateTimeField.innerHTML = new Date().toLocaleString('es-ES', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
}
updateClock();
setInterval(updateClock, 1000);

// --- Listeners de IPC ---

// Escucha las actualizaciones del temporizador (ahora más simple)
ipcRenderer.on('timer-updated', (event, data) => {
    secondCounter.innerText = data.timeString;
});

// Escucha las actualizaciones de mensajes
ipcRenderer.on('message-updated', (event, data) => {
    messageText.innerText = data.text;
    messageText.className = data.className;
});

// Escucha el cambio de color de fondo del body
ipcRenderer.on('background-updated', (event, color) => {
    document.body.style.backgroundColor = color;
    if(!screenVideo.hidden && color.toLowerCase() === 'red'){
        secondCounter.style.color = 'red';
    } else {
        secondCounter.style.color = 'white';
    }
});

// Escucha la lista de manos levantadas
ipcRenderer.on('raised-hands-updated', (event, names) => {
    if (raisedHandsList) {
        raisedHandsList.innerHTML = ''; // Limpiamos la lista
        names.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            raisedHandsList.appendChild(li);
        });
    }
});

// --- Gestión del Estado de Compartir Pantalla ---

// Al mostrar el video, AÑADIMOS la clase al body
ipcRenderer.on('show-screen-video', (event, sourceId) => {
    navigator.mediaDevices.getUserMedia({
        audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } }
    }).then(stream => {
        screenVideo.srcObject = stream;
        screenVideo.play();
        screenVideo.hidden = false;
        document.body.classList.add('screen-sharing-active');
    }).catch(error => console.error(error));
});

// Al ocultar el video, QUITAMOS la clase del body
ipcRenderer.on('hide-screen-video', () => {
    if (screenVideo.srcObject) {
        screenVideo.srcObject.getTracks().forEach(track => track.stop());
        screenVideo.srcObject = null;
    }
    screenVideo.hidden = true;
    document.body.classList.remove('screen-sharing-active'); // <-- QUITAMOS LA CLASE
});