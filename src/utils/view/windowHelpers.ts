import { BrowserWindowConstructorOptions, Session, app } from "electron";
import { join } from "path";
import { defaultHeight, defaultWidth, getWindowBounds } from "../../store/boundsStore";
import { getSettings } from "../../store/settingsStore";
import { getConfig, isProdEnv } from "../config";
import { isLinux, isMac, isWindows } from "../helpers";

declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
const config = getConfig();

export const areDevToolsAvailable = () => {
    return !app.isPackaged || !isProdEnv(config);
};

const getOSSpecificConfig = (): BrowserWindowConstructorOptions => {
    if (isMac) {
        return {
            frame: false,
            titleBarStyle: "hidden",
            vibrancy: "sidebar",
            trafficLightPosition: { x: 12, y: 18 },
        };
    } else if (isWindows) {
        return {};
    } else if (isLinux) {
        return {};
    }
    return {};
};

export const getWindowConfig = (session: Session): BrowserWindowConstructorOptions => {
    const { x, y, width, height } = getWindowBounds();
    const settings = getSettings();

    return {
        title: config.appTitle,
        icon: join(app.getAppPath(), "assets/icon.png"),
        x,
        y,
        width,
        height,
        minWidth: defaultWidth,
        minHeight: defaultHeight,
        ...getOSSpecificConfig(),
        webPreferences: {
            devTools: areDevToolsAvailable(),
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
            spellcheck: settings.spellChecker,
            // Security additions
            session,
            nodeIntegration: false,
            contextIsolation: true,
            disableBlinkFeatures: "Auxclick",
            sandbox: true,
        },
    };
};
