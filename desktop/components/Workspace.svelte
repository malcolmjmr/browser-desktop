// Workspace.svelte
<script>
  import { createEventDispatcher } from 'svelte';
  import WindowWidget from './WindowWidget.svelte';
  
  export let windows = [];
  const dispatch = createEventDispatcher();

  // Handle opening a single tab
  async function handleTabClick(window, tab) {
    if (!window.name) {
      // For temporary windows, open tab and remove window
      await chrome.tabs.create({ url: tab.url });
      dispatch('removeWindow', window.id);
    } else {
      // For named windows, ensure tab group exists or create it
      if (!window.isOpen) {
        await restoreWindow(window);
      }
      await chrome.tabs.create({
        url: tab.url,
        groupId: window.groupId
      });
    }
  }

  // Handle window restoration
  async function restoreWindow(window) {
    try {
      // Create new window with all tabs
      const newWindow = await chrome.windows.create({
        url: window.tabs.map(tab => tab.url)
      });
      
      if (window.name) {
        // Create tab group for named windows
        const groupId = await chrome.tabs.group({
          tabIds: newWindow.tabs.map(tab => tab.id)
        });
        
        await chrome.tabGroups.update(groupId, {
          title: window.name,
          color: window.color
        });
        
        // Update window state
        const updatedWindow = {
          ...window,
          isOpen: true,
          groupId
        };
        
        dispatch('updateWindow', updatedWindow);
      } else {
        // Remove temporary window after restoration
        dispatch('removeWindow', window.id);
      }
    } catch (error) {
      console.error('Failed to restore window:', error);
    }
  }

  // Handle window dragging
  function handleDragStart(event, window) {
    const rect = event.target.getBoundingClientRect();
    const dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    dispatch('dragstart', { window, dragOffset });
  }

  function handleDragEnd(event, window) {
    // Update window position
    const rect = event.target.closest('.workspace').getBoundingClientRect();
    const newPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    const updatedWindow = {
      ...window,
      position: newPosition
    };

    dispatch('updateWindow', updatedWindow);
  }

  // Handle window position updates during drag
  function handleDrag(event, window) {
    if (!event.clientX || !event.clientY) return; // Ignore invalid drag events
    
    const rect = event.target.closest('.workspace').getBoundingClientRect();
    const newPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    // Update position in real-time
    const windowElement = event.target.closest('.window');
    if (windowElement) {
      windowElement.style.transform = `translate(${newPosition.x}px, ${newPosition.y}px)`;
    }
  }

  // Handle double-click to restore
  function handleDoubleClick(window) {
    restoreWindow(window);
  }
</script>

<style>
  .workspace {
    position: absolute;
    top: 0;
    left: 250px; /* Space for stack */
    right: 0;
    bottom: 0;
  }

  .window {
    position: absolute;
    transition: transform 0.2s ease;
  }

  /* Remove transition during drag */
  .window.dragging {
    transition: none;
  }
</style>

<div class="workspace">
  {#each windows as window (window.id)}
    <div 
      class="window"
      style="transform: translate({window.position?.x || 0}px, {window.position?.y || 0}px);"
      draggable="true"
      on:dragstart={(e) => handleDragStart(e, window)}
      on:drag={(e) => handleDrag(e, window)}
      on:dragend={(e) => handleDragEnd(e, window)}
      on:dblclick={() => handleDoubleClick(window)}
    >
      <WindowWidget
        {window}
        on:tabclick={({ detail }) => handleTabClick(window, detail.tab)}
      />
    </div>
  {/each}
</div>