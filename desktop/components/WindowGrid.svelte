<script>
  import { createEventDispatcher } from 'svelte';
  import WindowWidget from './WindowWidget.svelte';
  
  export let windows = [];


</script>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 2rem;
    padding: 1rem;
  }
  
  .window-wrapper {
    display: flex;
    justify-content: center;
  }
</style>

<div class="grid">
  {#each windows as window (window.id)}
    <div class="window-wrapper">
      <WindowWidget
        {window}
        on:removeWindow
      />
    </div>
  {/each}
</div>