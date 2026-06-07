/** Programmatically open the global command palette from anywhere. */
export function openCommandPalette() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("corvus:open-command"));
}
