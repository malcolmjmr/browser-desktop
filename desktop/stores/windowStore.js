import { writable } from 'svelte/store';

function createWindowStore() {
  const { subscribe, set, update } = writable({
    contexts: new Map(),
    recentStack: []
  });

  return {
    subscribe,
    addContext: (context) => update(store => {
      store.contexts.set(context.id, context);
      return store;
    }),
    removeContext: (contextId) => update(store => {
      store.contexts.delete(contextId);
      return store;
    }),
    updateContext: (context) => update(store => {
      store.contexts.set(context.id, context);
      return store;
    }),
    addToStack: (contextId) => update(store => {
      store.recentStack = [contextId, ...store.recentStack];
      return store;
    }),
    removeFromStack: (contextId) => update(store => {
      store.recentStack = store.recentStack.filter(id => id !== contextId);
      return store;
    })
  };
}

export const windowStore = createWindowStore();