const matches = chrome.runtime.getManifest().content_scripts[0].matches;
const regexList = matches.map(pattern => new RegExp(pattern.replace(/\*/g, '.*')));

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const isMatched = regexList.some(regex => regex.test(tab.url));
    if (isMatched) {
      chrome.action.setBadgeText({ text: '1', tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#4688F1', tabId: tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
  }
});

chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      const isMatched = regexList.some(regex => regex.test(tab.url));
      if (isMatched) {
        chrome.action.setBadgeText({ text: '1', tabId: tab.id });
        chrome.action.setBadgeBackgroundColor({ color: '#c9c9c9ff', tabId: tab.id });
      } else {
        chrome.action.setBadgeText({ text: '', tabId: tab.id });
      }
    }
  });
});