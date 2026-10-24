/**
 * The demo page's theme toggle.
 *
 * Owned by the frontend team.
 *
 * Toggles the 7-11 theme and remembers the choice. Loaded in <head>, not as a
 * module, so the saved theme applies before first paint.
 */

{
    const KEY = "theme";
    const THEME = "seven-eleven";
    const root = document.documentElement;

    const apply = (theme) => {
        if (theme === THEME) {
            root.dataset.theme = THEME;
        } else {
            delete root.dataset.theme;
        }
    };

    // Storage can be blocked, e.g. in private windows.
    try {
        apply(localStorage.getItem(KEY));
    } catch {
        apply(null);
    }

    document.addEventListener("DOMContentLoaded", () => {
        const button = document.getElementById("theme-toggle");
        const sync = () => {
            button.setAttribute("aria-pressed", String(root.dataset.theme === THEME));
        };
        sync();

        button.addEventListener("click", () => {
            const theme = root.dataset.theme === THEME ? null : THEME;
            apply(theme);
            sync();
            try {
                if (theme) {
                    localStorage.setItem(KEY, theme);
                } else {
                    localStorage.removeItem(KEY);
                }
            } catch {
                // Not saved.
            }
        });
    });
}
