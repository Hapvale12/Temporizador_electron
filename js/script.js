// js/script.js - Versión FINAL con Previsualización Visual

const { ipcRenderer } = require('electron');

// --- Selectores del DOM ---
const form = document.querySelector('.form');
const timeInput = document.querySelector('.time-input');
const countDown = document.querySelector('.countdown');
const stopBtn = document.querySelector('.stop-btn');
const resetBtn = document.querySelector('.reset-btn');
const table = document.querySelector('.table');
const toggleSwitch = document.getElementById('toggleSwitch');
const title = document.getElementById('title_meeting');
const show_message = document.getElementById('show_message');
let hideBtn = document.querySelector('.hide-btn');
let hideImg = document.querySelector('.hide-btn-img');
let tableDiv = document.querySelector('.columns');
const openPreviewBtn = document.getElementById('open-preview-btn');
const shareBtn = document.getElementById('share-btn');
const selectedSourceName = document.getElementById('selected-source-name');
const previewModal = document.getElementById('preview-modal');
const previewGrid = document.getElementById('preview-grid');
const closeModalBtn = document.getElementById('close-modal-btn');
const miniVideo = document.getElementById('mini-video');

// --- Variables Globales ---
let running = false;
let countDownInterval;
let secondsLeftms;
let endTime;
let stopBtnClicked = false;
let data_meeting_json = [];
const path_json_data = "./json_data/meetings.json";
const day = new Date().getDay();
let check_meeting_day = (day >= 1 && day <= 5) ? true : false;
let selectedSourceId = null;
let isSharing = false;
let previewInterval = null; // <--- NUEVO: Guardará el ID del intervalo
let miniVideoStream = null;

// --- Lógica de Previsualización ---

// Delegación de eventos: Un solo listener en el contenedor padre
previewGrid.addEventListener('click', (e) => {
    const item = e.target.closest('.preview-item');
    if (!item) return;

    selectedSourceId = item.dataset.id;
    selectedSourceName.innerText = item.dataset.name;

    // Actualiza la clase 'selected' sin recrear los elementos
    document.querySelectorAll('.preview-item').forEach(el => el.classList.remove('selected'));
    item.classList.add('selected');

    hideModal();

    // Almacenamos la selección en localStorage
    localStorage.setItem('selectedSourceId', selectedSourceId);
    localStorage.setItem('selectedSourceName', item.dataset.name);
});

async function loadPreviews() {
    if (!previewGrid.innerHTML) { // Solo muestra "Cargando..." la primera vez
        previewGrid.innerHTML = '<p style="color: white; text-align: center;">Cargando...</p>';
    }
    const sources = await ipcRenderer.invoke('get-screen-sources');

    // Si es la primera carga, limpiamos el "Cargando..."
    if (previewGrid.querySelector('p')) {
        previewGrid.innerHTML = '';
    }

    sources.forEach(source => {
        // Buscamos si el elemento ya existe
        let existingItem = previewGrid.querySelector(`[data-id="${source.id}"]`);
        if (existingItem) {
            // Si existe, solo actualizamos la miniatura
            const img = existingItem.querySelector('img');
            if (img) img.src = source.thumbnailURL;
        } else {
            // Si no existe, lo creamos
            const item = document.createElement('div');
            item.className = 'preview-item';
            item.dataset.id = source.id; // Guardamos el ID
            item.dataset.name = source.name; // Guardamos el nombre
            item.innerHTML = `<img src="${source.thumbnailURL}" alt="Previsualización de ${source.name}"><p>${source.name}</p>`;
            if (source.id === selectedSourceId) {
                item.classList.add('selected');
            }
            previewGrid.appendChild(item);
        }
    });
}
function showModal() {
    previewModal.classList.remove('modal-hidden');
    loadPreviews(); // Carga inicial inmediata
    // Iniciamos un intervalo para recargar las vistas previas cada 2 segundos
    previewInterval = setInterval(loadPreviews, 2000);
}
function hideModal() {
    previewModal.classList.add('modal-hidden');
    // Detenemos el intervalo cuando el modal se cierra para no gastar recursos
    clearInterval(previewInterval);
    previewGrid.innerHTML = ''; // Limpiamos la grilla para la próxima vez
}
openPreviewBtn.addEventListener('click', showModal);
closeModalBtn.addEventListener('click', hideModal);
previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) {
        hideModal();
    }
});

// --- Lógica de Compartir Pantalla ---
shareBtn.addEventListener('click', async () => {
    const shareBtnImg = document.querySelector('.share-btn-img');

    if (!isSharing) {
        if (!selectedSourceId) {
            alert('Por favor, selecciona primero una pantalla o ventana para compartir.');
            return;
        }
        shareBtn.classList.add('sharing');
        ipcRenderer.send('show-screen-video', selectedSourceId);
        try {
            miniVideoStream = await navigator.mediaDevices.getUserMedia({
                audio: false, 
                video: { 
                    mandatory: { 
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: selectedSourceId 
                    } 
                }, 
                constraints: {
                    video: { width: 256, height: 144}
                }
            });
            miniVideo.srcObject = miniVideoStream;
            miniVideo.play();
            miniVideo.style.opacity = "1";
            shareBtnImg.src = "./imgs/stop.png";
            isSharing = true;
        } catch (error) {
            console.error('Error al obtener el stream:', error);
            shareBtn.classList.remove('sharing');
        }
    } else {
        shareBtn.classList.remove('sharing');
        if (miniVideoStream) {
            miniVideoStream.getTracks().forEach(track => track.stop());
            miniVideoStream = null;
        }
        ipcRenderer.send('hide-screen-video');
        miniVideo.style.opacity = "0";
        shareBtnImg.src = "./imgs/share-screen.png";
        isSharing = false;
    }
});

// --- Lógica Principal de la App ---
window.addEventListener('load', async function () {
    ipcRenderer.send('open-second-window');

    // =============== NUEVA LÓGICA PARA CARGAR LA SELECCIÓN ===============
    // 1. Intentamos leer la selección guardada en localStorage
    const savedSourceId = localStorage.getItem('selectedSourceId');
    const savedSourceName = localStorage.getItem('selectedSourceName');

    // 2. Si existen valores guardados, los aplicamos al estado y a la interfaz
    if (savedSourceId && savedSourceName) {
        selectedSourceId = savedSourceId;
        selectedSourceName.innerText = savedSourceName;
        console.log('Selección de pantalla anterior cargada:', savedSourceName);
    }
    // ====================================================================

    // El resto de la función 'load' continúa como siempre
    let data_temp = await fetch(path_json_data);
    data_meeting_json = await data_temp.json();
    toggleSwitch.checked = check_meeting_day;
    load_table_meeting();
    assignEventHandlers();
});

hideBtn.addEventListener('click', (event) => {
    event.preventDefault();
    if (tableDiv.style.display === "none") {
        tableDiv.style.display = 'flex';
        hideImg.src = "./imgs/view.png";
    } else {
        tableDiv.style.display = 'none';
        hideImg.src = "./imgs/hide.png";
    }
});
timeInput.addEventListener('input', () => {
    let minutes = Math.floor(timeInput.value);
    let seconds = (timeInput.value * 60) % 60;
    countDown.innerHTML = `${minutes.toString().padStart(2, '0')}:${Math.floor(seconds).toString().padStart(2, '0')}`;
});
function assignEventHandlers() {
    table.addEventListener('click', (event) => {
        const link = event.target.closest('a[row-num]');
        if (!link) return;
        event.preventDefault();
        if (running) {
            alert("Debes detener el cronometro antes de cambiar el tiempo.");
            return;
        }
        const rowEl = link.closest('tr');
        if (!rowEl) return;
        document.querySelectorAll('.table tr.selected').forEach(r => r.classList.remove('selected'));
        rowEl.classList.add('selected');
        const minute = rowEl.cells[1].innerHTML;
        countDown.innerHTML = `${minute}:00`;
        timeInput.value = minute;
    });
}
stopBtn.addEventListener('click', () => {
    stopBtnClicked = !stopBtnClicked;
    if (stopBtnClicked) {
        resetBtn.disabled = false;
        stopBtn.innerHTML = 'Continuar';
        stopBtn.style.backgroundColor = '#007ed8';
        secondsLeftms = endTime - Date.now();
        clearInterval(countDownInterval);
    } else {
        resetBtn.disabled = true;
        stopBtn.innerHTML = 'Pausar';
        stopBtn.style.backgroundColor = '#ff5252';
        endTime = secondsLeftms + Date.now();
        countDownInterval = setInterval(() => setCountDown(endTime), 1000);
    }
});

resetBtn.addEventListener('click', () => {
    running = false;
    ipcRenderer.send('update-background', 'black');
    countDown.removeAttribute('style');
    resetCountDown();
});

form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (timeInput.value <= 0) return;
    running = true;
    endTime = Date.now() + (timeInput.value * 60000);
    setCountDown(endTime);
    countDownInterval = setInterval(() => setCountDown(endTime), 100);
    form.style.display = 'none';
    stopBtn.disabled = false;
});

const setCountDown = (endTime) => {
    secondsLeftms = endTime - Date.now();
    let secondsLeft = Math.round(secondsLeftms / 1000);
    let minutes = Math.floor(Math.abs(secondsLeft) / 60);
    let seconds = Math.abs(secondsLeft) % 60;
    let timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    if (secondsLeft < 0) {
        timeString = "-" + timeString;
        ipcRenderer.send('update-background', 'red');
        if(isSharing) {
            countDown.style.color = 'white';
        } else {
            countDown.style.color = 'white';
        }
        countDown.style.color = 'red';
        resetBtn.innerHTML = "Finalizar";
    }
    countDown.innerHTML = timeString;
    ipcRenderer.send('update-timer', { timeString: timeString });
};
const resetCountDown = () => {
    clearInterval(countDownInterval);
    stopBtnClicked = false;
    stopBtn.innerHTML = 'Pausar';
    stopBtn.disabled = true;
    resetBtn.disabled = true;
    const selectedRow = table.querySelector('tr.selected');
    if (selectedRow) {
        let nextRow = selectedRow.nextElementSibling;
        if (!nextRow) {
            nextRow = table.rows[1];
        }
        selectedRow.classList.remove('selected');
        nextRow.classList.add('selected');
        const minute = nextRow.cells[1].innerHTML;
        countDown.innerHTML = `${minute.toString()}:00`;
        timeInput.value = minute;
    }
    form.style.display = 'flex';
    stopBtn.style.backgroundColor = '#ff5252';
    ipcRenderer.send('update-timer', { timeString: countDown.innerText });
};

function addrow(item_row, item_index, haslink = true) {
    let row = table.insertRow(-1);
    let c1 = row.insertCell(0);
    let c2 = row.insertCell(1);
    let c3 = row.insertCell(2);
    c1.textContent = item_row.tema;
    c2.textContent = item_row.tiempo;
    c3.innerHTML = haslink ? `<a href="#" row-num="${item_index}"><img src="./imgs/right-arrow.png" alt="Select"></a>` : 'Acción';
    c1.contentEditable = true;
    c2.contentEditable = true;
}

toggleSwitch.addEventListener('change', function () {
    check_meeting_day = this.checked;
    load_table_meeting();
});

function load_table_meeting() {
    table.innerHTML = "";
    const filter_meeting = data_meeting_json.filter((x) => x.sesion === (check_meeting_day ? 'ministerio' : 'finde'));
    addrow({ "tema": "Tema / Asignación", "tiempo": "Min." }, 0, false);
    filter_meeting.forEach((item_meeting, item_meeting_index) => addrow(item_meeting, item_meeting_index));
    title.innerText = check_meeting_day ? 'Reunión de Entre Semana' : 'Reunión de Fin de Semana';
    if (table.rows.length > 1) {
        table.rows[1].classList.add('selected');
        const firstMeeting = filter_meeting[0];
        if (firstMeeting) {
            if(!firstMeeting.tiempo) {
                // Si no se encontró tiempo reintentaremos llamar la función 
                // con un setTimeout para evitar un bucle infinito
                setTimeout(() => {
                    load_table_meeting();
                }, 100);
                return;
            } else {
                timeInput.value = firstMeeting.tiempo;
            }
            countDown.innerHTML = `${firstMeeting.tiempo.toString().padStart(2, '0')}:00`;
            ipcRenderer.send('update-timer', { timeString: countDown.innerHTML });
        }
    }
}