(function GalaxyDevLoader() {
    const VITE_SERVER = "http://localhost:5173";
    const THEME_JS = `${VITE_SERVER}/theme.js`;
    const USER_CSS = `${VITE_SERVER}/user.css`;
    const VITE_CLIENT = `${VITE_SERVER}/@vite/client`;
    const TIMESTAMP = Date.now();

    console.log("Galaxy Dev Loader: Initializing with HMR...");

    // 1. Inject Vite Client for instant HMR
    function injectViteClient() {
        if (!document.getElementById("vite-hmr-client")) {
            const script = document.createElement("script");
            script.id = "vite-hmr-client";
            script.type = "module";
            script.src = VITE_CLIENT;
            document.head.appendChild(script);
        }
    }

    // 2. Remove production Galaxy elements if they exist
    function cleanup() {
        const prodStyle = document.querySelector('link[href*="Galaxy/user.css"]');
        if (prodStyle) prodStyle.remove();
        
        const existingDevStyle = document.getElementById("galaxy-dev-style");
        if (existingDevStyle) existingDevStyle.remove();
        
        const existingDevScript = document.getElementById("galaxy-dev-script");
        if (existingDevScript) existingDevScript.remove();
    }

    // 3. Inject CSS
    function injectCSS() {
        const link = document.createElement("link");
        link.id = "galaxy-dev-style";
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = `${USER_CSS}?t=${TIMESTAMP}`;
        document.head.appendChild(link);
        console.log("Galaxy Dev Loader: CSS injected with HMR support", link.href);
    }

    // 4. Inject JS
    function injectJS() {
        const script = document.createElement("script");
        script.id = "galaxy-dev-script";
        script.type = "module";
        script.src = `${THEME_JS}?t=${TIMESTAMP}`;
        document.head.appendChild(script);
        console.log("Galaxy Dev Loader: JS injected", script.src);
    }

    // Execution
    injectViteClient();
    cleanup();
    injectCSS();
    injectJS();

    console.log("Galaxy Dev Loader: Done. CSS will update instantly. JS requires Cmd+Shift+R.");
})();
