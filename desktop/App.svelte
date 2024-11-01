<script>
  import { onMount } from 'svelte';
  import WindowGrid from './components/WindowGrid.svelte';
  
  let windows = [];
  let temporaryWindows = [];
  let savedWindows = [];
  
  onMount(async () => {
    
    windows = (await chrome.storage.local.get([
      'windows'
    ]))?.windows ?? [];

    
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        if (changes.windows) {
          windows = changes.windows.newValue;
        }
        if (changes.workspace) {
          savedWindows = changes.workspace.newValue;
        }
      }
    });
  });
  
  function handleWindowUse(windowId) {
    // Update last used timestamp and resort windows
    windows = windows.map(w => 
      w.id === windowId 
        ? { ...w, lastUsed: Date.now() }
        : w
    ).sort((a, b) => b.lastUsed - a.lastUsed);
    
    // Save updated order
    chrome.storage.local.set({ windows: windows });
  }

  function removeWindow({ detail }) {
    const { windowId } = detail;
    windows = windows.filter(w => w.id !== windowId);
    chrome.storage.local.set({ windows: windows });
  }
</script>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
  }

  .desktop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #4e721e 0%, #2a5298 100%);
    padding: 2rem;
    overflow-y: auto;
  }
</style>

<div class="desktop">
  <WindowGrid 
    {windows}
    on:windowUse={({ detail }) => handleWindowUse(detail)}
    on:removeWindow={removeWindow}
  />
</div>