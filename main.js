// main.js - VERSIÓN FINAL CORREGIDA (con conversión de miniaturas)

const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

// Solo activamos electron-reload si NO estamos en producción (es decir, si la app no está empaquetada)
if (!app.isPackaged) {
    require('electron-reload')(__dirname, {
        electron: require(`${__dirname}/node_modules/electron`)
    });
}

// --- VARIABLES GLOBALES ---
let mainWindow;
let secondWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });
    mainWindow.loadFile('index.html');
    // Para depurar, puedes abrir la consola:
    // mainWindow.webContents.openDevTools();
    mainWindow.on('closed', () => {
        app.quit();
    });
}

function createSecondWindow() {
    secondWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    secondWindow.loadFile('secondScreen.html');
    // Si la ventana secundaria se cierra, también cerramos toda la aplicación.
    secondWindow.on('closed', () => {
        app.quit();
    });
}

app.whenReady().then(createMainWindow);

// --- MANEJADORES DE COMUNICACIÓN (IPC) ---

ipcMain.on('open-second-window', () => {
    if (!secondWindow) {
        createSecondWindow();
    }
});

// (Aquí van los otros ipcMain.on para 'update-timer', 'update-message', etc., que no cambian)
ipcMain.on('update-timer', (event, data) => { if (secondWindow) { secondWindow.webContents.send('timer-updated', data); } });
ipcMain.on('update-message', (event, data) => { if (secondWindow) { secondWindow.webContents.send('message-updated', data); } });
ipcMain.on('update-background', (event, color) => { if (secondWindow) { secondWindow.webContents.send('background-updated', color); } });
ipcMain.on('show-screen-video', (event, sourceId) => { if (secondWindow) { secondWindow.webContents.send('show-screen-video', sourceId); } });
ipcMain.on('hide-screen-video', () => { if (secondWindow) { secondWindow.webContents.send('hide-screen-video'); } });

// =============== ESTA ES LA FUNCIÓN CRÍTICA A CORREGIR ===============
// Manejador para obtener las fuentes de pantalla (displays)
ipcMain.handle('get-screen-sources', async () => {
    // 1. Obtenemos las fuentes y pedimos una miniatura de un tamaño específico
    const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 320, height: 180 },
    });

    // 2. Mapeamos los resultados y CONVERTIMOS cada miniatura a un Data URL
    return sources.map((source) => {
        return {
            id: source.id,
            name: source.name,
            thumbnailURL: source.thumbnail.toDataURL(), // Convertimos la miniatura a una URL de datos
        };
    });
});

// =======================================================================

// --- LÓGICA DE CIERRE DE LA APP ---
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});