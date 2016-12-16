//require the things
const integrityChecker = require(`${__dirname}/integrityChecker.js`)
const {app, BrowserWindow, dialog} = require('electron')

//Begin by verifying that the required datafiles are all present and accounted for.
if(!integrityChecker.check()) {
    dialog.showErrorBox("FATAL ERROR", "Some required data files failed to verify!")
    app.exit(1)
}

global.tasks = require(`${__dirname}/../Defects-Sources/tasks.json`)

var mainWindow = null

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        height: 600,
        frame: false,
        'min-width': 950
    })
    
    mainWindow.on('closed', () => {
        mainWindow = null
    })
    //mainWindow.webContents.openDevTools()
    mainWindow.loadURL(`file://${__dirname}/index.html`)
    
})

app.on('window-all-closed', () => {
    app.quit()
})