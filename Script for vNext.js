// ==UserScript==
// @name         Mis Atajos para Deister (Versión Mejorada)
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  Agrega atajos de teclado para acelerar tareas en Deister, con lógica asíncrona mejorada.
// @author       Ale.P.
// @match        *://*/os/jobstool*
// @match        *://*/os/dbstudio*
// @match        *://*next.mydeister.com/*
// @match        *://*next2.mydeister.com/*
// @match        *://*heracles-next.mydeister.com/*
// @match        *192.168.100.52:8085/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=deistercloud.com
// @grant        none
// @update       2025-09-18
// ==/UserScript==

(function() {
    'use strict';

    //Mostrar mensaje flotante
    function showNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.textContent = message;
        Object.assign(notification.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            zIndex: '10001',
            opacity: '0',
            transition: 'opacity 0.4s ease, bottom 0.4s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        });
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.bottom = '30px';
        }, 10);
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.bottom = '20px';
            setTimeout(() => notification.remove(), 400);
        }, duration);
    }

    /**
     * Espera a que un elemento aparezca en el DOM.
     * @param {string} selector - El selector CSS del elemento.
     * @param {number} [timeout=8000] - Tiempo máximo de espera en ms.
     * @returns {Promise<Element>} - Promesa que resuelve con el elemento encontrado.
     */
    function waitForElement(selector, timeout = 8000) {
        return new Promise((resolve, reject) => {
            const intervalTime = 100;
            let elapsedTime = 0;
            const interval = setInterval(() => {
                const element = document.querySelector(selector);
                if (element) {
                    clearInterval(interval);
                    resolve(element);
                } else {
                    elapsedTime += intervalTime;
                    if (elapsedTime >= timeout) {
                        clearInterval(interval);
                        reject(new Error(`Elemento no encontrado tras ${timeout/1000}s: ${selector}`));
                    }
                }
            }, intervalTime);
        });
    }

    /** Inicia el job activo. */
    function iniciarJob() {
        const btnRun = document.querySelector(".v-window-item--active .dbstudio-flex-header-body .v-toolbar__items > .v-btn--icon");
        if (btnRun && !btnRun.disabled) {
            btnRun.click();
            showNotification("Job iniciado.");
        }
    }

    /** Limpia la caché, ya sea por Jobstool o por API. */
    async function limpiarCache() {
        const iconos = document.body.querySelectorAll('.cache-delete-icon');
        console.log(`Encontrados ${iconos.length} elementos de caché.`);
        if (iconos.length > 0 && iconos.length < 450) {
            console.log("Limpiando uno por uno...");
            iconos.forEach(icono => icono.click());
        } else {
            await limpiarCacheConAPI();
        }
    }

    /** Realiza las llamadas a la API para borrar cachés en paralelo. */
    async function limpiarCacheConAPI() {
        console.log("Limpiando caché por API...");
        const endpoints = [
            '/os/jobstool/meta/dbmetadatacache/all',
            '/os/jobstool/meta/dictscache/all',
            '/os/jobstool/TABLE/all',
            '/os/jobstool/REPORT/all',
            '/os/jobstool/VTABLE/all',
            '/os/jobstool/jobs/js/all',
            '/os/jobstool/jobs/executions/queue/all',
            '/os/jobstool/jobs/report/all',
            '/os/jobstool/cachedcursors/all'
        ];

        const promises = endpoints.map(url =>
            fetch(window.location.origin + url, { method: 'DELETE' })
            .then(response => console.log(`DELETE ${url} - Status: ${response.status}`))
            .catch(error => console.error(`Error en DELETE ${url}:`, error))
        );
        await Promise.all(promises);
        console.log("Limpieza por API completada.");
    }

    /** Despliega el árbol de caché de forma iterativa. */
    async function desplegarArbolCache() {
        showNotification("Desplegando árbol de caché...");
        const delay = (ms) => new Promise(res => setTimeout(res, ms));
        let nodosCerrados = document.querySelectorAll('.v-treeview-node__toggle:not(.v-treeview-node__toggle--open)');

        while (nodosCerrados.length > 0) {
            nodosCerrados.forEach(nodo => nodo.click());
            await delay(200); // Pausa para que el DOM se actualice
            nodosCerrados = document.querySelectorAll('.v-treeview-node__toggle:not(.v-treeview-node__toggle--open)');
        }
        showNotification("Árbol de caché desplegado.");
    }

    /** Simula un clic en el botón de recargar. */
    function recargarPagina() {
        document.querySelector('.mdi-reload')?.click();
    }

    /** Abre una nueva pestaña con una URL específica. */
    function abrirEnNuevaPestana(path) {
        window.open(window.location.origin + path, '_blank');
    }

    /** Cambia entre table, vtable o report y abre en nueva pestaña. */
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

    /** Abrir un WIC desde el menú de info. */
    async function abrirWicDesdeInfo() {
        try {
            const allThreeDots = document.querySelectorAll('.ax-page-toolbar .mdi-dots-vertical');
            if (!allThreeDots.length) throw new Error("Botón de menú (tres puntos) no encontrado.");
            allThreeDots[allThreeDots.length - 1].click();

            await waitForElement('[role="menuitem"]', 2000);
            const menuItem = Array.from(document.querySelectorAll('[role="menuitem"]'))
                                  .find(item => item.innerText.toLowerCase().includes('info'));
            if (!menuItem) throw new Error("Opción 'Info' no encontrada en el menú.");
            menuItem.click();

            const resultado = await Promise.race([
                waitForElement('.mdi-open-in-new').then(el => ({ type: 'wic', element: el })),
                waitForElement('button[data-ax-id="message-dialog-action-button"]').then(el => ({ type: 'error', element: el }))
            ]);

            if (resultado.type === 'error') {
                showNotification("Cursor expirado. Cerrando diálogo.");
                resultado.element.click();
            } else if (resultado.type === 'wic') {
                showNotification("Abriendo WIC en nueva pestaña...");
                resultado.element.click();
            }
        } catch (error) {
            console.error("Flujo 'abrirWicDesdeInfo' falló:", error);
            showNotification(`Error: ${error.message}`, 5000);
        }
    }

    //Eventos
    document.addEventListener("keydown", async function(event) {
        //const activeEl = document.activeElement;
        //if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        //    return;
        //}

        const key = event.key.toLowerCase();

        if (event.ctrlKey && event.shiftKey) {
            event.preventDefault();
            iniciarJob();
        }
        if (event.ctrlKey && key === 'enter') {
            event.preventDefault();
            await limpiarCache();
            showNotification('La caché se ha borrado con éxito.');
        }
        if (event.metaKey && key === 'enter') { // Cmd + Enter en Mac
            event.preventDefault();
            await limpiarCacheConAPI();
            if (confirm("Limpieza por API completada. ¿Desea recargar la página?")) {
                document.location.reload();
            }
        }
        if (event.ctrlKey && key === 'o') {
            event.preventDefault();
            desplegarArbolCache();
        }
        if (event.ctrlKey && key === 'e') {
            event.preventDefault();
            recargarPagina();
        }
        if (event.ctrlKey && key === 'b') {
            event.preventDefault();
            abrirEnNuevaPestana('/os/dbstudio#/databases');
        }
        if (event.ctrlKey && event.altKey && ['√', 'v'].includes(key)) {
            event.preventDefault();
            navegarAWic('vtable');
        }
        if (event.ctrlKey && event.altKey && ['†', 't'].includes(key)) {
            event.preventDefault();
            navegarAWic('table');
        }
        if (event.ctrlKey && event.altKey && ['®', 'r'].includes(key)) {
            event.preventDefault();
            navegarAWic('report');
        }
        if (event.ctrlKey && key === 'w') {
            event.preventDefault();
            await abrirWicDesdeInfo();
        }
    });

})();