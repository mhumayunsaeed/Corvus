const RUNTIME_STATE_EVENT = "corvus:runtime_state";

type RuntimeStatePayload = {
    throttled: boolean;
};

let browserListenersAttached = false;
let windowVisible = true;
let windowFocused = true;
let runtimeThrottled = false;

function hasWindow(): boolean {
    return typeof window !== "undefined";
}

function isDocumentVisible(): boolean {
    if (typeof document === "undefined") return true;
    return document.visibilityState === "visible";
}

function emitRuntimeState() {
    if (!hasWindow()) return;
    window.dispatchEvent(
        new CustomEvent<RuntimeStatePayload>(RUNTIME_STATE_EVENT, {
            detail: { throttled: runtimeThrottled },
        })
    );
}

function recomputeRuntimeState() {
    const nextThrottled = !(windowVisible && windowFocused && isDocumentVisible());
    if (nextThrottled === runtimeThrottled) return;
    runtimeThrottled = nextThrottled;
    emitRuntimeState();
}

function ensureBrowserListeners() {
    if (!hasWindow() || browserListenersAttached) return;

    const onVisibilityChange = () => recomputeRuntimeState();
    const onFocus = () => setRuntimeFocused(true);
    const onBlur = () => setRuntimeFocused(false);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    browserListenersAttached = true;
    recomputeRuntimeState();
}

export function isRuntimeThrottled() {
    ensureBrowserListeners();
    return runtimeThrottled;
}

export function setRuntimeWindowVisible(visible: boolean) {
    windowVisible = visible;
    ensureBrowserListeners();
    recomputeRuntimeState();
}

export function setRuntimeFocused(focused: boolean) {
    windowFocused = focused;
    ensureBrowserListeners();
    recomputeRuntimeState();
}

export function subscribeRuntimeState(listener: (throttled: boolean) => void) {
    ensureBrowserListeners();
    listener(runtimeThrottled);

    if (!hasWindow()) {
        return () => {};
    }

    const onStateChange = (event: Event) => {
        const customEvent = event as CustomEvent<RuntimeStatePayload>;
        listener(Boolean(customEvent.detail?.throttled));
    };

    window.addEventListener(RUNTIME_STATE_EVENT, onStateChange as EventListener);
    return () => {
        window.removeEventListener(RUNTIME_STATE_EVENT, onStateChange as EventListener);
    };
}
