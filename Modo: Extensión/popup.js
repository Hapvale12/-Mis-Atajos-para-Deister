document.addEventListener('DOMContentLoaded', () => {
  const apiEndpoints = [
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
  ];

  const apiCheckboxes = document.getElementById('api-checkboxes');
  const saveButton = document.getElementById('save-button');
  const statusMessage = document.getElementById('status-message');

  // Rellena la lista de checkboxes
  apiEndpoints.forEach((endpoint, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'api-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `api-${index}`;
    checkbox.value = endpoint;
    
    const label = document.createElement('label');
    label.htmlFor = `api-${index}`;
    label.textContent = endpoint;
    
    listItem.appendChild(checkbox);
    listItem.appendChild(label);
    apiCheckboxes.appendChild(listItem);
  });

  // Carga las opciones guardadas
  chrome.storage.sync.get(['selectedApis'], (result) => {
    const selectedApis = result.selectedApis || apiEndpoints;
    apiCheckboxes.querySelectorAll('input').forEach(checkbox => {
      checkbox.checked = selectedApis.includes(checkbox.value);
    });
  });

  // Guarda las opciones cuando se hace clic en el botón
  saveButton.addEventListener('click', () => {
    const selectedApis = Array.from(apiCheckboxes.querySelectorAll('input:checked'))
                            .map(checkbox => checkbox.value);
    
    chrome.storage.sync.set({ selectedApis }, () => {
      statusMessage.textContent = 'Opciones guardadas.';
      setTimeout(() => {
        statusMessage.textContent = '';
      }, 2000);
    });
  });
});