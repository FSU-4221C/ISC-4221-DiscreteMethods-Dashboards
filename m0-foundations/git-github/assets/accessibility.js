(function () {
    "use strict";

    function enhanceTabs() {
        const tabs = Array.from(document.querySelectorAll(".top-tab"));
        if (!tabs.length) return;
        const tablist = tabs[0].parentElement;
        if (tablist) tablist.setAttribute("role", "tablist");

        tabs.forEach((tab, index) => {
            const selected = tab.classList.contains("selected");
            tab.setAttribute("role", "tab");
            tab.setAttribute("aria-selected", String(selected));
            tab.setAttribute("tabindex", selected ? "0" : "-1");
            if (tab.dataset.keyboardReady === "true") return;
            tab.dataset.keyboardReady = "true";
            tab.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    tab.click();
                    return;
                }
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const direction = event.key === "ArrowRight" ? 1 : -1;
                const next = tabs[(index + direction + tabs.length) % tabs.length];
                next.focus();
                next.click();
            });
        });
    }

    document.addEventListener("DOMContentLoaded", enhanceTabs);
    new MutationObserver(enhanceTabs).observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class"],
    });
})();
