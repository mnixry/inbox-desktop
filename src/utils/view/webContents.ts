import { WebContents, app, shell } from "electron";
import {
    isAccount,
    isAccountAuthorize,
    isAccountSwitch,
    isAccoutLite,
    isCalendar,
    isHostAllowed,
    isMail,
    isUpgradeURL,
    isUpsellURL,
} from "../urls/urlTests";
import {
    getAccountView,
    getCalendarView,
    getCurrentView,
    getMailView,
    getWebContentsViewName,
    showView,
} from "./viewManagement";
import { resetBadge } from "../../ipc/notification";
import { mainLogger, viewLogger } from "../log";

export function handleWebContents(contents: WebContents) {
    const log = (eventName: string, ...args: unknown[]) => {
        const viewName = getWebContentsViewName(contents);

        if (viewName) {
            viewLogger(viewName).info(eventName, ...args);
        } else {
            mainLogger.info(eventName, ...args);
        }
    };

    const preventDefault = (ev: Electron.Event) => {
        ev.preventDefault();
    };

    contents.on("did-navigate-in-page", (ev, url) => {
        log("did-navigate-in-page", app.isPackaged ? "" : url);

        if (!isHostAllowed(url)) {
            return preventDefault(ev);
        }

        if (isAccountSwitch(url)) {
            resetBadge();
        }

        // This is used to redirect users to the external browser for internal upgrade modals
        if (isAccount(url) && isUpgradeURL(url)) {
            return;
        }
    });

    contents.on("will-attach-webview", preventDefault);

    contents.on("will-navigate", (details) => {
        log("will-navigate", app.isPackaged ? "" : details.url);

        if (!isHostAllowed(details.url) && !global.oauthProcess && !global.subscriptionProcess) {
            return preventDefault(details);
        }

        // Only redirect to a different browser view if the navigation is happening in
        // the visible web contents.
        if (getCurrentView()!.webContents === contents) {
            if (isAccount(details.url) && !isAccountAuthorize(details.url) && getCurrentView() !== getAccountView()) {
                showView("account", details.url);
                return preventDefault(details);
            }

            if (isCalendar(details.url) && getCurrentView() !== getCalendarView()) {
                showView("calendar", details.url);
                return preventDefault(details);
            }

            if (isMail(details.url) && getCurrentView() !== getMailView()) {
                showView("mail", details.url);
                return preventDefault(details);
            }
        }

        return details;
    });

    contents.setWindowOpenHandler((details) => {
        const { url } = details;

        if (isCalendar(url)) {
            log("Calendar link", url);
            showView("calendar", url);
            return { action: "deny" };
        }

        if (isMail(url)) {
            log("Mail link", url);
            showView("mail", url);
            return { action: "deny" };
        }

        if (isAccount(url)) {
            // Upsell links should be opened in browser to avoid 3D secure issues
            if (isAccoutLite(url) || isUpsellURL(url)) {
                log("Account lite or upsell in browser", url);
                shell.openExternal(url);
            } else {
                log("Account link", url);
                showView("account", url);
            }

            return { action: "deny" };
        }

        if (isHostAllowed(url)) {
            log("Allowed host", url);
            return { action: "allow" };
        }

        if (global.oauthProcess) {
            log("OAuth link in app", url);
            return { action: "allow" };
        }

        if (global.subscriptionProcess) {
            log("Subscription link in modal", url);
            return { action: "allow" };
        }

        log("Other link in browser", url);
        shell.openExternal(url);
        return { action: "deny" };
    });
}
