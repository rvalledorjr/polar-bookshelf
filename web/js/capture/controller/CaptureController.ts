import {AppPaths} from "../../electron/webresource/AppPaths";
import {PHZLoader} from '../../apps/main/loaders/PHZLoader';
import {ipcMain} from 'electron';
import {Preconditions} from '../../Preconditions';
import {Logger} from '../../logger/Logger';
import BrowserRegistry from '../BrowserRegistry';
import {BrowserProfiles} from '../BrowserProfiles';
import {Capture} from '../Capture';
import {PendingWebRequestsEvent} from '../../webrequests/PendingWebRequestsListener';
import {CaptureOpts} from '../CaptureOpts';
import {StartCaptureMessage} from './CaptureClient';
import {Directories} from '../../datastore/Directories';
import {CacheRegistry} from '../../backend/proxyserver/CacheRegistry';

const log = Logger.create();

export class CaptureController {

    private readonly directories: Directories = new Directories();

    private readonly cacheRegistry: CacheRegistry;

    private readonly phzLoader: PHZLoader;

    constructor(cacheRegistry: CacheRegistry) {

        this.cacheRegistry = cacheRegistry;

        this.phzLoader = new PHZLoader({cacheRegistry: this.cacheRegistry});

    }

    /**
     * Start the service to receive and handle IPC messages.
     */
    public start() {

        ipcMain.on('capture-controller-start-capture', (event: Electron.Event, message: StartCaptureMessage) => {

            this.startCapture(event.sender, message.url)
                .catch( err => log.error("Could not start capture: ", err));

        });

    }

    /**
     *
     * @param webContents {Electron.WebContents} The webContents of the dialog
     * box that started the whole capture.
     *
     * @param url {string}
     */
    protected async startCapture(webContents: Electron.WebContents, url: string) {

        webContents = await this.loadApp(webContents, url);

        // FIXME: make this its own function

        const captureResult = await this.runCapture(webContents, url);
        //
        // let captureResult = {
        //     path: "/home/burton/.polar/stash/UK_unveils_new_Tempest_fighter_jet_model___BBC_News.phz"
        // };

        // now load the phz in the target window

        await this.loadPHZ(webContents, captureResult.path);

    }

    /**
     * Setup the
     *
     * @param webContents {Electron.WebContents}
     * @param url {string}
     *
     */
    private async loadApp(webContents: Electron.WebContents, url: string): Promise<Electron.WebContents> {

        return new Promise<Electron.WebContents>(resolve => {

            log.debug("Starting capture for URL: " + url);

            const appPath = AppPaths.relative('./apps/capture/progress/index.html');
            const appURL = 'file://' + appPath;

            webContents.once("did-finish-load", () => {
                resolve(webContents);
            });

            log.debug("Loading app: ", appURL);

            webContents.loadURL(appURL);

        });

    }

    /**
     *
     * @param webContents {Electron.WebContents} The webContents page that
     * should be updated with our progress.
     *
     * @param url {string} The URL to capture.
     */
    private async runCapture(webContents: Electron.WebContents, url: string) {

        Preconditions.assertNotNull(webContents, "webContents");

        const progressForwarder = new ProgressForwarder({webContents});

        const captureOpts: CaptureOpts = {
            pendingWebRequestsCallback: (event) => progressForwarder.pendingWebRequestsCallback(event),
            amp: true
        };

        let browser = BrowserRegistry.DEFAULT;

        // browser = Browsers.toProfile(browser, "headless");
        browser = BrowserProfiles.toBrowserProfile(browser, "hidden");
        // browser = Browsers.toProfile(browser, "default");
        const browserProfile = BrowserProfiles.toBrowserProfile(browser, "default");

        const capture = new Capture(url, browserProfile, this.directories.stashDir, captureOpts);

        const captureResult = await capture.start();

        log.info("captureResult: ", captureResult);

        return captureResult;

    }

    /**
     *
     * @param webContents {Electron.WebContents}
     * @param path {string} The path to our phz file.
     */
    private async loadPHZ(webContents: Electron.WebContents, path: string) {

        const loadedFile = await this.phzLoader.registerForLoad(path);

        log.debug(`Loading PHZ URL via: `, loadedFile.webResource);

        loadedFile.webResource.loadWebContents(webContents);

    }

}


class ProgressForwarder {

    private readonly webContents: Electron.WebContents;

    constructor(opts: any) {

        this.webContents = opts.webContents;

        Preconditions.assertNotNull(this.webContents, "webContents");

    }

    public pendingWebRequestsCallback(event: PendingWebRequestsEvent) {

        this.webContents.send("capture-progress-update", event);

    }

}
