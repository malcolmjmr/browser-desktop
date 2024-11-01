// Main function to handle window stashing
async function stashCurrentWindow() {
    try {
      // Get the current window
      const currentWindow = await chrome.windows.getCurrent({ populate: true });
      
      // Capture all tabs except the new tab page
      const tabsData = await Promise.all(
        currentWindow.tabs
          .filter(tab => tab.url !== 'chrome://newtab/')
          .map(async (tab) => ({
            id: tab.id,
            url: tab.url,
            title: tab.title,
            favIconUrl: tab.favIconUrl,
            active: tab.active
          }))
      );
  
      if (tabsData.length === 0) {
        return null; // Don't stash empty windows
      }
  
      // Create window data object
      const windowData = {
        id: crypto.randomUUID(),
        tabs: tabsData,
        createdAt: Date.now(),
        isOpen: false
      };
  
      // Save to temporary stack in storage
      await chrome.storage.local.get(['windows'], async (result) => {
        let windows = result.windows || [];
        windows.unshift(windowData); // Add to top of stack
        await chrome.storage.local.set({ windows });
      });
  
      // Close all tabs except the active one
      const tabIds = currentWindow.tabs
        .filter(tab => !tab.active)
        .map(tab => tab.id);
      
      await chrome.tabs.remove(tabIds);
  
      // Update the active tab to show the desktop
      const activeTab = currentWindow.tabs.find(tab => tab.active);
      if (activeTab) {
        await chrome.tabs.update(activeTab.id, {
          url: chrome.runtime.getURL('desktop/index.html')
        });
      }
  
      return windowData;
    } catch (error) {
      console.error('Error stashing window:', error);
      throw error;
    }
  }
  
  // Event listener for extension button click
  chrome.action.onClicked.addListener(async (tab) => {
    try {
      await stashCurrentWindow();
    } catch (error) {
      console.error('Failed to stash window:', error);
      // Could show an error notification to user here
    }
  });
  
  // Monitor stack for archiving
  chrome.alarms.create('checkArchive', { periodInMinutes: 60 * 24 });
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'checkArchive') {
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
  
      const { windows = [] } = await chrome.storage.local.get(['windows']);
      const { archive = [] } = await chrome.storage.local.get(['archive']);
  
      // Move old windows to archive
      const [toArchive, toKeep] = windows.reduce(
        ([old, current], window) => {
          return now - window.createdAt > weekMs
            ? [[...old, window], current]
            : [old, [...current, window]];
        },
        [[], []]
      );
  
      if (toArchive.length > 0) {
        await chrome.storage.local.set({
          windows: toKeep,
          archive: [...archive, ...toArchive]
        });
      }
    }
  });