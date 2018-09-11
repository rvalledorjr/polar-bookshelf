
import {BROWSER_OPTIONS, SpectronMain, WindowFactory} from '../../web/js/test/SpectronMain';
import {Logging} from '../../web/js/logger/Logging';
import {CaptureController} from '../../web/js/capture/controller/CaptureController';
import {CacheRegistry} from '../../web/js/backend/proxyserver/CacheRegistry';
import {ProxyServerConfig} from '../../web/js/backend/proxyserver/ProxyServerConfig';
import {BrowserWindow} from "electron";
import {SingletonBrowserWindow} from '../../web/js/electron/framework/SingletonBrowserWindow';


const windowFactory: WindowFactory = async () => {

    const tag = {
        name: 'app',
        value: 'browser'
    };

    return await SingletonBrowserWindow.getInstance(tag, async () => {

        const mainWindow = new BrowserWindow(BROWSER_OPTIONS);
        mainWindow.loadURL('file://' + __dirname + '/index.html');

        return mainWindow;

    });

};

SpectronMain.run(async state => {

    await Logging.init();

    const proxyServerConfig = new ProxyServerConfig();

    const cacheRegistry = new CacheRegistry(proxyServerConfig);

    const captureController = new CaptureController(cacheRegistry);

    captureController.start();

    await state.testResultWriter.write(true);

}, { windowFactory });

