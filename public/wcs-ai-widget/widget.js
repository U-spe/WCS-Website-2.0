(() => {
    console.log("WCS AI booting...");

    function start() {
        const button = document.createElement("button");

        button.textContent = "AI";

        button.style.position = "fixed";
        button.style.right = "20px";
        button.style.bottom = "20px";
        button.style.width = "60px";
        button.style.height = "60px";
        button.style.borderRadius = "50%";
        button.style.border = "none";
        button.style.background = "#2563eb";
        button.style.color = "#fff";
        button.style.fontWeight = "700";
        button.style.cursor = "pointer";
        button.style.zIndex = "999999";

        button.onclick = () => {
            alert("WCS AI widget is alive.");
        };

        document.body.appendChild(button);

        console.log("WCS AI mounted.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
