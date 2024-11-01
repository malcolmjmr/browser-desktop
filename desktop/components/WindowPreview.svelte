<script>
  export let window;
  
  $: activeTab = window.tabs.find(tab => tab.active) || window.tabs[0];
</script>

<style>
  .window-preview {
    width: 200px;
    height: 200px;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(12px);
    border-radius: 20px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: transform 0.2s ease;
  }
  
  .window-preview:hover {
    transform: scale(1.02);
  }
  
  .tabs-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    padding: 1.5rem;
    place-items: center;
  }
  
  .favicon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: white;
    padding: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .title {
    padding: 0.75rem;
    text-align: center;
    color: white;
    font-size: 0.9rem;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    background: rgba(0, 0, 0, 0.1);
  }
  
  .named {
    border: 2px solid var(--color, transparent);
  }
  
  .closed {
    opacity: 0.7;
  }
</style>

<div
  class="window-preview"
  class:named={window.name}
  class:closed={!window.isOpen}
  style="--color: {window.color}"
>
  <div class="tabs-grid">
    {#each window.tabs.slice(0, 9) as tab}
      <img
        class="favicon"
        src={tab.favIconUrl || 'default-favicon.png'}
        alt=""
        title={tab.title}
      />
    {/each}
  </div>
  <div class="title">
    {window.name || activeTab.title}
  </div>
</div>