export function getUsernameColor(username: string): string {
    if (!username) return "hsl(0, 0%, 50%)"; // fallback gray

    // djb2 hash algorithm
    let hash = 5381;
    for (let i = 0; i < username.length; i++) {
        hash = (hash * 33) ^ username.charCodeAt(i);
    }

    // Use the hash to pick a hue between 0 and 360
    const hue = Math.abs(hash) % 360;

    // Use saturation between 75% and 95% for vibrancy
    const saturation = 75 + (Math.abs(hash >> 8) % 20);

    // Use lightness between 65% and 80% for readability on dark backgrounds
    const lightness = 65 + (Math.abs(hash >> 16) % 15);

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
