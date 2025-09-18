// ==UserScript==
// @name         Mis Atajos para Deister (Versión Clásica)
// @namespace    http://tampermonkey.net/
// @version      2.1.0
// @description  Agrega atajos de teclado para acelerar tareas en Deister.
// @author       Ale.P.
// @match        *://*/os/jobstool*
// @match        *://*/os/dbstudio*
// @match        *://*next.mydeister.com/*
// @match        *://*next2.mydeister.com/*
// @match        *://*heracles-next.mydeister.com/*
// @match        *192.168.100.52:8085/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=deistercloud.com
// @grant        none
// ==/UserScript==
// @update      2025-09-17
// CreatedBy: Ale.P.

(function() {
    'use strict';

    /* Inicia el job activo. */
    function iniciarJob() {
        let btnRun = document.querySelector(".v-window-item--active>.dbstudio-flex-header-body .v-toolbar__items>.v-btn--icon");
        if(btnRun && !btnRun.disabled) {
            btnRun.click();
        }
    }

    /* Limpia la caché, ya sea por Jobstool o por API. */
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

    /* Realiza las llamadas a la API para borrar cachés. */
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
        // Guardamos todo en una Promise para ejecutar en paralelo
        await Promise.all(endpoints.map(async (url) => {
            try {
                const response = await fetch(window.location.origin + url, { method: 'DELETE' });
                console.log(`DELETE ${url} - Status: ${response.status}`);
            } catch (error) {
                console.error(`Error en DELETE ${url}:`, error);
            }
        }));
        // Recargando el cursor.
        // try {
        //     const deletePageUrl = window.location.href + '/delete';
        //     const response = await fetch(deletePageUrl, { method: 'DELETE' });
        //     console.log(`DELETE ${deletePageUrl} - Status: ${response.status}`);
        // } catch (error) {
        //     console.error(`Error en DELETE ${window.location.href + '/delete'}:`, error);
        // }
    }

    /* Despliega el árbol de caché de forma recursiva. */
    function desplegarArbolCache() {
        let nodosCerrados = document.querySelectorAll('.v-treeview-node__toggle:not(.v-treeview-node__toggle--open)');
        if (nodosCerrados.length > 0) {
            nodosCerrados.forEach(nodo => nodo.click());
            setTimeout(desplegarArbolCache, 150);
        }
    }

    /* Simula un clic en el botón de recargar. */
    function recargarPagina() {
        document.querySelector('.mdi-reload')?.click();
    }

    /* Abre una nueva pestaña con una URL específica. */
    function abrirEnNuevaPestana(path) {
        window.open(window.location.origin + path, '_blank');
    }

    /* Cambia entre table, vtable o report y abre en nueva pestaña. */
    function navegarAWic(tipo) {
        const urlActual = window.location.href;
        // La regex busca la parte a reemplazar en la URL
        const regex = /table\/wic_obj_(table|vtable|report)/;
        if (regex.test(urlActual)) {
            const nuevaUrl = urlActual.replace(regex, `table/wic_obj_${tipo}`);
            if(nuevaUrl != urlActual){
                window.open(nuevaUrl, '_blank');
            }
        }
    }
    /** Flujo para abrir un WIC desde el menú de info, con la lógica original de timeouts. */
    async function abrirWicDesdeInfo() {
        // 1. Clic en el menú de tres puntos
        const arrThreeDots = document.querySelectorAll('.ax-page-toolbar .mdi-dots-vertical');
        if (arrThreeDots.length === 0) {
            console.error("No se encontró el botón de menú (tres puntos).");
            return;
        }
        arrThreeDots[arrThreeDots.length - 1].click();

        // Función auxiliar para esperar a que un elemento aparezca
        function esperarElemento(selector, timeout = 5000) {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const interval = setInterval(() => {
                    const elemento = document.querySelector(selector);
                    if (elemento) {
                        clearInterval(interval);
                        resolve(elemento);
                    } else if (Date.now() - startTime > timeout) {
                        clearInterval(interval);
                        // Antes de rechazar, comprobamos si salió el diálogo de error
                        const btnExpirado = document.querySelector('button[data-ax-id="message-dialog-action-button"]');
                        if (btnExpirado) {
                            console.log("Diálogo de 'Cursor expirado' detectado.");
                            btnExpirado.click();
                            reject(new Error('Cursor expirado.')); // Rechazamos para detener el flujo
                        } else {
                            reject(new Error(`El elemento '${selector}' no apareció en ${timeout}ms.`));
                        }
                    }
                }, 200); // Revisa cada 200ms
            });
        }

        try {
            // 2. Espera a que aparezca el menú y busca el elemento "Info"
            const menuItems = await esperarElemento('[role="menuitem"]');
            const itemInfo = Array.from(document.querySelectorAll('[role="menuitem"]'))
            .find(item => item.innerText.toLowerCase().includes('info'));

            if (!itemInfo) {
                console.error("No se encontró la opción 'Info' en el menú.");
                return;
            }
            itemInfo.click();

            // 3. Espera a que aparezca el botón de "abrir en nueva pestaña" y haz clic
            const btnOpenWic = await esperarElemento('.mdi-open-in-new');
            console.log("Abriendo el WIC en nueva pestaña...");
            btnOpenWic.click();

        } catch (error) {
            console.warn(error.message);
        }
    }

    document.addEventListener("keydown", async function(event) {
        // Ignoramos cualquier atajo si el input de un diálogo está activo
        //if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.isContentEditable)) {
        //    return;
        //}
        const key = event.key.toLowerCase();
        if (event.ctrlKey && event.shiftKey) {
            iniciarJob();
        }
        if (event.ctrlKey && key === 'enter') {
            await limpiarCache();
            alert('La caché se ha borrado con éxito.')
        }
        if (event.metaKey && key === 'enter') {
            await limpiarCache();
            if(confirm("Limpieza por API completada. ¿Desea recargar?")){
                document.location.reload();
            }
        }
        if (event.ctrlKey && key === 'o') {
            desplegarArbolCache();
        }
        if (event.ctrlKey && key === 'e') {
            recargarPagina();
        }
        if (event.ctrlKey && key === 'b') {
            abrirEnNuevaPestana('/os/dbstudio#/databases');
        }
        if (event.ctrlKey && event.altKey && ['√', 'v'].includes(key)) {
            navegarAWic('vtable');
        }
        if (event.ctrlKey && event.altKey && ['†', 't'].includes(key)) {
            navegarAWic('table');
        } else if (event.ctrlKey && event.altKey && ['®', 'r'].includes(key)) {
            navegarAWic('report');
        } else if (event.ctrlKey && key === 'w') {
            await abrirWicDesdeInfo();
        }
    });
})();