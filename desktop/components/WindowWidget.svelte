
<script>

  import { createEventDispatcher } from 'svelte';
  let dispatch = createEventDispatcher();

  export let window;
  
  let currentPage = 0;
  let hoverTab = null;
  let tabsContainer;
  let isDragging = false;
  let startX;
  let scrollLeft;
  
  $: totalPages = Math.ceil(window.tabs.length / 9);
  $: pages = Array.from({ length: totalPages }, (_, i) => 
    window.tabs.slice(i * 9, (i + 1) * 9)
  );
  $: title = hoverTab ? hoverTab.title : (window.name || window.tabs[0].title);
  
  function handleMouseDown(e) {
    isDragging = true;
    startX = e.pageX - tabsContainer.offsetLeft;
    scrollLeft = tabsContainer.scrollLeft;
  }
  
  function handleMouseMove(e) {
    if (!isDragging) return;
    
    const x = e.pageX - tabsContainer.offsetLeft;
    const walk = (x - startX) * 2;
    tabsContainer.scrollLeft = scrollLeft - walk;
  }
  
  function handleMouseUp() {
    isDragging = false;
  }
  
  function handleScroll() {
    const pageWidth = tabsContainer.clientWidth;
    currentPage = Math.round(tabsContainer.scrollLeft / pageWidth);
  }
  
  function scrollToPage(pageIndex) {
    const pageWidth = tabsContainer.clientWidth;
    tabsContainer.scrollTo({
      left: pageWidth * pageIndex,
      behavior: 'smooth'
    });
    currentPage = pageIndex;
  }

  async function handleTabClick(tab) {
    await chrome.tabs.create({
      url: tab.url,
    });
  
  }

  // Handle window restoration
  async function restoreWindow() {
    try {
      // Create new window with all tabs
      const newWindow = await chrome.windows.create({
        url: window.tabs.map(tab => tab.url)
      });
      
      if (window.name) {
        // Create tab group for named windows
        // const groupId = await chrome.tabs.group({
        //   tabIds: newWindow.tabs.map(tab => tab.id)
        // });
        
        // await chrome.tabGroups.update(groupId, {
        //   title: window.name,
        //   color: window.color
        // });
        
        // // Update window state
        // const updatedWindow = {
        //   ...window,
        //   isOpen: true,
        //   groupId
        // };
        
        
      } else {
        // Remove temporary window after restoration
        dispatch('removeWindow', window.id);
      }
    } catch (error) {
      console.error('Failed to restore window:', error);
    }
  }

</script>



<div 
  class="window-widget"
  class:closed={!window.isOpen}
  on:dblclick
> 
  {#if totalPages > 1}
  <div class="pagination-dots">
    {#each Array(totalPages) as _, i}
      <div
        class="dot"
        class:active={currentPage === i}
        on:click={() => scrollToPage(i)}
      />
    {/each}
  </div>
  {/if}
  <div
    class="tabs-container"
    class:dragging={isDragging}
    bind:this={tabsContainer}
    on:mousedown={handleMouseDown}
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
    on:mouseleave={handleMouseUp}
    on:scroll={handleScroll}
  >
    <div class="pages-wrapper">
      {#each pages as tabs, pageIndex}
        <div class="page">
          {#each tabs as tab}
            <div 
              class="favicon-wrapper"
              on:click={() => handleTabClick(tab) }
              on:mouseenter={() => hoverTab = tab}
              on:mouseleave={() => hoverTab = null}
            >
              <img
                class="favicon"
                src={tab.favIconUrl || 'default-favicon.png'}
                alt=""
                draggable="false"
              />
            </div>
          {/each}
        </div>
      {/each}
    </div>
    
    
  </div>
  
  <div class="title" on:mousedown={restoreWindow}>
    {title}
  </div>
</div>


<style>
  .window-widget {
    width: 200px;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    position: relative;
  }
  
  .tabs-container {
    position: relative;
    overflow-x: scroll;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -ms-overflow-style: none;
    aspect-ratio: 1;
    cursor: grab;
  }
  
  .tabs-container::-webkit-scrollbar {
    display: none;
  }
  
  .tabs-container.dragging {
    cursor: grabbing;
  }
  
  .pages-wrapper {
    display: flex;
    min-width: 100%;
    height: 100%;
  }
  
  .page {
    min-width: 100%;
    max-width: 100%;
    flex-shrink: 0;
    scroll-snap-align: start;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;

    background: rgba(245, 245, 245, 0.9);
  }
  
  .favicon-wrapper {
    width: 100%;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 8px;
    transition: background-color 0.2s;
  }
  
  .favicon-wrapper:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  
  .favicon {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }
  
  .pagination-dots {
    position: absolute;
    bottom: 32px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 4px;
    z-index: 10;
  }
  
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.2);
    transition: all 0.2s;
  }
  
  .dot.active {
    background: rgba(0, 0, 0, 0.5);
    transform: scale(1.2);
  }
  
  .title {
    padding: 8px 12px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.8);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: rgba(255, 255, 255, 0.95);
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .title:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  
  .closed {
    opacity: 0.7;
  }
</style>