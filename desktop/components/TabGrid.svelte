// components/TabGrid.svelte
<script>
  import { createEventDispatcher } from 'svelte';
  
  export let tabs = [];
  export let maxVisible = 12; // Number of favicons to show before pagination
  
  const dispatch = createEventDispatcher();
  
  let currentPage = 0;
  
  $: totalPages = Math.ceil(tabs.length / maxVisible);
  $: visibleTabs = tabs.slice(
    currentPage * maxVisible,
    (currentPage + 1) * maxVisible
  );
  
  function nextPage() {
    if (currentPage < totalPages - 1) currentPage++;
  }
  
  function prevPage() {
    if (currentPage > 0) currentPage--;
  }
  
  function handleTabClick(tab) {
    dispatch('tabclick', tab);
  }
  
  function handleTabHover(tab) {
    dispatch('tabhover', tab);
  }
</script>

<div class="tab-grid">
  {#if tabs.length > maxVisible && currentPage > 0}
    <button class="nav prev" on:click={prevPage}>
      ‹
    </button>
  {/if}
  
  <div class="grid">
    {#each visibleTabs as tab (tab.id)}
      <div 
        class="tab"
        on:click={() => handleTabClick(tab)}
        on:mouseenter={() => handleTabHover(tab)}
        title={tab.title}
      >
        {#if tab.favIconUrl}
          <img 
            src={tab.favIconUrl} 
            alt=""
            on:error={(e) => e.target.src = '/default-favicon.png'}
          />
        {:else}
          <div class="default-icon">
            <!-- Default icon for tabs without favicon -->
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path 
                fill="currentColor" 
                d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"
              />
            </svg>
          </div>
        {/if}
      </div>
    {/each}
    
    {#if visibleTabs.length < maxVisible}
      {#each Array(maxVisible - visibleTabs.length) as _}
        <div class="tab empty" />
      {/each}
    {/if}
  </div>

  {#if tabs.length > maxVisible && currentPage < totalPages - 1}
    <button class="nav next" on:click={nextPage}>
      ›
    </button>
  {/if}
  
  {#if totalPages > 1}
    <div class="pagination">
      {#each Array(totalPages) as _, i}
        <div 
          class="dot" 
          class:active={i === currentPage}
          on:click={() => currentPage = i}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .tab-grid {
    position: relative;
    padding: 8px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 8px;
    position: relative;
  }

  .tab {
    aspect-ratio: 1;
    background: #f5f5f5;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .tab:hover {
    background: #e5e5e5;
  }

  .tab.empty {
    cursor: default;
    background: #fafafa;
  }

  .tab img {
    width: 16px;
    height: 16px;
    object-fit: contain;
  }

  .default-icon {
    width: 16px;
    height: 16px;
    color: #999;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    color: #666;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    z-index: 1;
  }

  .nav:hover {
    background: white;
    color: #333;
  }

  .prev {
    left: 4px;
  }

  .next {
    right: 4px;
  }

  .pagination {
    display: flex;
    justify-content: center;
    gap: 4px;
    margin-top: 8px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ddd;
    cursor: pointer;
  }

  .dot.active {
    background: #999;
  }
</style>