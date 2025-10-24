// main.js - VERSIÓN FINAL CORREGIDA (con conversión de miniaturas)

const { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut } = require('electron');
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

    // Escuchamos el evento 'did-start-loading' en webContents, que se dispara
    // cuando la ventana principal comienza a recargarse (por ejemplo, por electron-reload).
    mainWindow.webContents.on('did-start-loading', () => {
        if (secondWindow) {
            secondWindow.reload();
        }
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

app.whenReady().then(() => {
    createMainWindow();
    globalShortcut.register('Control+Shift+S', () => {
        if (mainWindow) {
            mainWindow.webContents.send('global-shortcut-toggle-share');
        }
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

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
    });

    // 2. Mapeamos solo la información necesaria (ID y nombre).
    return sources.map((source) => {
        return {
            id: source.id,
            name: source.name,
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