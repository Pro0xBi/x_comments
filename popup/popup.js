// /Users/wangchenxu/Desktop/rp/vscode/twitter_comment/popup/popup.js

document.addEventListener('DOMContentLoaded', () => {

 
  // --- Existing Settings Button Logic ---
  const settingsButton = document.getElementById('openSettings');
  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      try {
        chrome.runtime.openOptionsPage();
      } catch (error) {
        console.error('Failed to open options page:', error);
      }
    });
  } else {
    console.error('Could not find the settings button (id="openSettings") in popup.html');
  }
  // --- End Settings Button Logic ---

  // --- NEW: Custom Roles Button Logic ---
  const rolesButton = document.getElementById('openCustomRoles');
  if (rolesButton) {
    rolesButton.addEventListener('click', () => {
      try {
        // 获取选项页面的 URL
        const optionsUrl = chrome.runtime.getURL('options.html');
        // 查找是否已打开选项页面
        chrome.tabs.query({ url: optionsUrl }, (tabs) => {
          if (tabs && tabs.length > 0) {
            // 如果已打开，则激活该标签页并更新 URL 以包含哈希
            chrome.tabs.update(tabs[0].id, { active: true, url: optionsUrl + '#roles' });
          } else {
            // 如果未打开，则创建新标签页并附加哈希
            chrome.tabs.create({ url: optionsUrl + '#roles' });
          }
        });
      } catch (error) {
        console.error('Failed to open options page with #roles hash:', error);
      }
    });
  } else {
    console.error('Could not find the custom roles button (id="openCustomRoles") in popup.html');
  }
  // --- End Custom Roles Button Logic ---

  // --- Existing Toggle Switch Logic ---
  const toggleSwitch = document.getElementById('extractorToggle');
  if (toggleSwitch) {
    chrome.storage.sync.get(['commentExtractorEnabled'], (result) => {
      toggleSwitch.checked = result.commentExtractorEnabled === undefined ? true : result.commentExtractorEnabled;
    });
    toggleSwitch.addEventListener('change', (event) => {
      const isEnabled = event.target.checked;
      chrome.storage.sync.set({ commentExtractorEnabled: isEnabled });
      chrome.tabs.query({ active: true, url: ['*://*.twitter.com/*', '*://*.x.com/*'] }, (tabs) => {
        if (tabs && tabs.length > 0 && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_EXTRACTOR', enabled: isEnabled }, (response) => {
            if (chrome.runtime.lastError) {
              // console.warn("Could not send TOGGLE_EXTRACTOR message:", chrome.runtime.lastError.message);
            } else {
              // console.log("TOGGLE_EXTRACTOR message sent, response:", response);
            }
          });
        }
      });
    });
  } else {
    console.error('Could not find the toggle switch (id="extractorToggle") in popup.html');
  }
  // --- End Toggle Switch Logic ---

}); 


chrome.storage.onChanged.addListener((changes, namespace) => {

  // Keep listener structure for potential future use with other storage keys
  console.log('[Popup] Storage changed:', changes, namespace);
});
