// ==UserScript==
// @name         Mis Atajos para Deister
// @version      4.0.0
// @description  Atajos de teclado optimizados para Deister, con observadores de DOM y una estructura más robusta.
// @author       Alessandro P.
// @grant        none
// @update       2025-09-18
// ==/UserScript==
(function() {
    'use strict';

    const CONFIG = {
        selectors: {
            runJobButton: ".v-window-item--active .dbstudio-flex-header-body .v-toolbar__items > .v-btn--icon",
            cacheDeleteIcons: ".cache-delete-icon",
            closedTreeNodes: ".v-treeview-node__toggle:not(.v-treeview-node__toggle--open)",
            reloadButton: ".mdi-reload",
            threeDotsMenu: ".ax-page-toolbar .mdi-dots-vertical",
            menuItem: '[role="menuitem"]',
            openInNewWic: ".v-navigation-drawer--open.v-navigation-drawer--right .mdi-open-in-new",
            errorDialogButton: ['button[data-ax-id="message-dialog-action-button"]', '.v-dialog--active .v-btn.v-btn--has-bg'],
            cursorLoading: ".ax-cursor-toolbar .v-btn--loading",
            progressBar: '[role="progressbar"]'
        },
        api: {
            cacheEndpoints: [
                '/os/jobstool/meta/dbmetadatacache/all',
                '/os/jobstool/meta/dictscache/all',
                '/os/jobstool/TABLE/all',
                '/os/jobstool/REPORT/all',
                '/os/jobstool/VTABLE/all',
                '/os/jobstool/jobs/js/all',
                '/os/jobstool/jobs/executions/queue/all',
                '/os/jobstool/jobs/report/all',
                '/os/jobstool/cachedcursors/all',
                '/os/jobstool/explorer/tree/all/BEAN/SQLDictCacheBeans/MenuLoaderV2'
            ]
        },
        CACHE_ICONS_CLICK_THRESHOLD: 450,
        timeouts: {
            waitForElement: 8000,
            menuPopup: 2000
        }
    };

    // --- FUNCIONES DE UTILIDAD ---
    let notificationContainer = null;

    /**
     * Muestra notificaciones flotantes que se apilan verticalmente.
     * @param {string} message - El mensaje a mostrar.
     * @param {number} [duration=3000] - Duración en milisegundos.
     */
    function showNotification(message, duration = 3000) {
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            Object.assign(notificationContainer.style, {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: '10001',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '10px'
            });
            document.body.appendChild(notificationContainer);
        }

        const notification = document.createElement('div');
        notification.textContent = message;
        Object.assign(notification.style, {
            backgroundColor: 'rgba(28, 28, 30, 0.85)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(5px)',
            opacity: '0',
            transform: 'translateX(30px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease'
        });

        notificationContainer.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(30px)';
            notification.addEventListener('transitionend', () => {
                notification.remove();

                if (notificationContainer && notificationContainer.children.length === 0) {
                    notificationContainer.remove();
                    notificationContainer = null;
                }
            },{
                once: true
            });
        }, duration);
    }

    /**
     * Espera a que un elemento aparezca en el DOM usando MutationObserver.
     * @param {string} selector - El selector CSS del elemento.
     * @param {number} timeout - Tiempo máximo de espera en ms.
     * @returns {Promise<Element>}
     */
    function waitForElement(selector, timeout = CONFIG.timeouts.waitForElement) {
        return new Promise((resolve, reject) => {
            if(Array.isArray(selector)) {
                if(document.querySelector(selector[0])) {
                    selector = selector[0]
                } else {
                    selector = selector[1]
                }
            }
            const element = document.querySelector(selector);
            if (element) {
                return resolve(element);
            }

            const observer = new MutationObserver(() => {
                const targetElement = document.querySelector(selector);
                if (targetElement) {
                    observer.disconnect();
                    clearTimeout(timeoutId);
                    resolve(targetElement);
                }
            });

            const timeoutId = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Elemento no encontrado tras ${timeout / 1000}s: ${selector}`));
            }, timeout);

            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    // --- FUNCIONES DE ACCIÓN ---

    function iniciarJob() {
        const btnRun = document.querySelector(CONFIG.selectors.runJobButton);
        if (btnRun && !btnRun.disabled) {
            btnRun.click();
            showNotification("Job iniciado.");
        } else {
            showNotification("No se pudo iniciar el job.");
        }
    }

    async function limpiarCache() {
        showNotification("Limpiando caché...");
        const iconos = document.body.querySelectorAll(CONFIG.selectors.cacheDeleteIcons);
        if (iconos.length > 0 && iconos.length < CONFIG.CACHE_ICONS_CLICK_THRESHOLD) {
            console.log(`Limpiando ${iconos.length} elementos de caché uno por uno...`);
            iconos.forEach(icono => icono.click());
            showNotification("Caché de elementos limpiada.");
        } else {
            await limpiarCacheConAPI();
        }
    }

    async function limpiarCacheConAPI() {
        showNotification("Limpiando caché por API...");
        const promises = CONFIG.api.cacheEndpoints.map(endpoint =>
            fetch(window.location.origin + endpoint, { method: 'DELETE' })
            .then(response => {
                if (!response.ok) {
                    console.warn(`DELETE ${endpoint} - Status: ${response.status}`);
                }
            })
            .catch(error => console.error(`Error en DELETE ${endpoint}:`, error))
        );
        await Promise.all(promises);
        showNotification("Limpieza de caché por API completada.");
        return true; // Devuelve un valor para encadenar acciones
    }

    async function desplegarArbolCache() {
        showNotification("Desplegando árbol de caché...");
        const delay = (ms) => new Promise(res => setTimeout(res, ms));
        let nodosCerrados;
        while ((nodosCerrados = document.querySelectorAll(CONFIG.selectors.closedTreeNodes)).length > 0) {
            nodosCerrados.forEach(nodo => nodo.click());
            await delay(200);
        }
        showNotification("Árbol de caché desplegado.");
    }

    function recargarPagina() {
        document.querySelector(CONFIG.selectors.reloadButton)?.click();
    }

    function abrirEnNuevaPestana(path) {
        window.open(window.location.origin + path, '_blank');
    }

    function navegarAWic(tipo) {
        const urlActual = window.location.href;
        const regex = /table\/wic_obj_(table|vtable|report)/;
        if (regex.test(urlActual)) {
            const nuevaUrl = urlActual.replace(regex, `table/wic_obj_${tipo}`);
            if (nuevaUrl !== urlActual) {
                window.open(nuevaUrl, '_blank');
            }
        }
    }

    const delay = ms => new Promise(res => setTimeout(res, ms));

    /**
     * Abre la ventana de WIC desde el menú de información, con lógica de reintento
     * en caso de que la sesión/cursor haya expirado.
     * @param {number} maxRetries - El número máximo de veces que intentará ejecutarse.
     * @param {number} retryDelay - El tiempo en milisegundos que esperará entre intentos.
     */
    async function abrirWicConReintentos(maxRetries = 5, retryDelay = 2000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            if(document.querySelectorAll(CONFIG.selectors.cursorLoading).length > 0 || document.querySelectorAll(CONFIG.selectors.progressBar).length > 0) {
                await delay(500)
                attempt--;
                continue;
            }
            try {
                const allThreeDots = document.querySelectorAll(CONFIG.selectors.threeDotsMenu);
                if (!allThreeDots.length) throw new Error("Botón de menú (tres puntos) no encontrado.");
                allThreeDots[allThreeDots.length - 1].click();

                await waitForElement(CONFIG.selectors.menuItem, CONFIG.timeouts.menuPopup);
                const menuItem = Array.from(document.querySelectorAll(CONFIG.selectors.menuItem)).find(item => item.innerText.toLowerCase().includes('info'));
                if (!menuItem) {
                    throw new Error("Opción 'Info' no encontrada en el menú.");
                }
                menuItem.click();

                const resultado = await Promise.race([
                    waitForElement(CONFIG.selectors.openInNewWic).then(el => ({ type: 'wic', element: el })),
                    waitForElement(CONFIG.selectors.errorDialogButton).then(el => ({ type: 'error', element: el }))
                ]);

                if (resultado.type === 'wic') {
                    showNotification("Abriendo WIC en nueva pestaña...");
                    resultado.element.click();
                    return;
                }

                if (resultado.type === 'error') {
                    showNotification(`Cursor expirado (Intento ${attempt}/${maxRetries}). Reintentando en ${retryDelay / 1000}s...`);
                    resultado.element.click();
                    await delay(retryDelay);
                }

            } catch (error) {
                console.error(`Intento ${attempt} falló:`, error);
                showNotification(`Error: ${error.message} (Intento ${attempt}/${maxRetries})`);
                if (attempt < maxRetries) {
                    await delay(retryDelay);
                }
            }
        }

        // Si el bucle termina, significa que todos los intentos fallaron.
        showNotification(`No se pudo abrir WIC después de ${maxRetries} intentos.`);
        console.error("El flujo 'abrirWicConReintentos' falló definitivamente.");
    }

    // --- MANEJADOR DE EVENTOS ---
    // Define el objeto con la lógica para ambos SOs
    const keyActions = {
        // Atajos universales
        'ctrl-shift-': iniciarJob,
        'ctrl-enter': limpiarCache,
        'ctrl-o': desplegarArbolCache,
        'ctrl-e': recargarPagina,
        'ctrl-b': () => abrirEnNuevaPestana('/os/dbstudio#/databases'),
        'ctrl-alt-v': () => navegarAWic('vtable'),
        'ctrl-alt-√': () => navegarAWic('vtable'),
        'ctrl-alt-t': () => navegarAWic('table'),
        'ctrl-alt-†': () => navegarAWic('table'),
        'ctrl-alt-r': () => navegarAWic('report'),
        'ctrl-alt-®': () => navegarAWic('report'),
        'ctrl-alt-w': abrirWicConReintentos,
        'ctrl-alt-æ': abrirWicConReintentos,
    };

    // Se agregó una lógica especial para manejar la tecla 'meta' (Cmd en Mac, Windows en Win)
    const metaEnterAction = async () => {
        const success = await limpiarCacheConAPI();
        if (success && confirm("Limpieza por API completada. ¿Desea recargar la página?")) {
            document.location.reload();
        }
    };

    document.addEventListener("keydown", function(event) {
        // Lógica para atajos de meta + enter
        // Verifica si la tecla 'Meta' (Cmd en Mac, Win en Windows) está presionada.
        if (event.key === 'Enter' && event.metaKey) {
            event.preventDefault();
            metaEnterAction();
            return;
        }

        // Si la tecla de control o alt está presionada, verifica si se trata de la combinación para evitar que se ejecute la acción
        // si el usuario está tipeando un caracter.
        //if ((event.ctrlKey || event.altKey) && (['input', 'textarea'].includes(event.target.tagName.toLowerCase()) || event.target.isContentEditable)) {
        //    return;
        //}

        const key = event.key?.toString().toLowerCase();

        let keyIdentifier = '';
        if (event.ctrlKey) {
            keyIdentifier += 'ctrl-';
        }
        if (event.metaKey) {
            keyIdentifier += 'meta-';
        }
        if (event.altKey) {
            keyIdentifier += 'alt-';
        }
        if (event.shiftKey) {
            keyIdentifier += 'shift-';
        }

        keyIdentifier += ['control', 'alt', 'shift', 'meta'].includes(key) ? '' : key;

        // La lógica ahora es más simple y robusta
        if (keyActions[keyIdentifier]) {
            event.preventDefault();
            keyActions[keyIdentifier]();
        }
    });

})();