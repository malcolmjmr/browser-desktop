
export const getPermissions = async () => {
    return await chrome.permissions.contains({
        permissions: ["bookmarks"],
    });
};


export const getBookmarkPermissions = async () => {
    return await chrome.permissions.contains({
        permissions: ["bookmarks"],
    });
};

export const get = async (key) => {
    const data = (await chrome.storage.local.get([key])) ?? {};
    return data[key];
};

export const getSettings = async () => {
    const data = (await chrome.storage.sync.get(['settings'])) ?? {};
    return data['settings'] ?? {};
};

export const set = async (record) => {
    await chrome.storage.local.set(record);
};

export const getOpenGroups = async () => {
    return await get('openGroups');
};

export const getTabFavIconUrl = ({url, favIconUrl, pendingUrl}) => {
    //const browserNames = ['chrome', 'brave', 'edge'];
    if (!url || url == '') url = pendingUrl;
    
    if (!favIconUrl || url?.includes('chrome:')) {
        let favIconUrlFromChrome = new URL(chrome.runtime.getURL("/_favicon/"));
        favIconUrlFromChrome.searchParams.set("pageUrl", url);
        favIconUrlFromChrome.searchParams.set("size", "32");
        // url += '?pageUrl=' + u;
        // url += '&size=32';
        favIconUrl = favIconUrlFromChrome.toString();
    }
        
    return favIconUrl;

    
};

export const getActiveTab = async () => {
    return (await chrome.tabs.query({ currentWindow: true, active: true }))[0];
};

export const requestBookmarkPermssion = async () => {
    const granted = await chrome.permissions.request({
        permissions: ['bookmarks']
    });
    return granted;
}

export const tryToSaveBookmark = async (tab, group) => {
    try {
        return await saveTabAsBookmark(tab, group);
    } catch (e) {
        const granted = await chrome.permissions.request({
            permissions: ['bookmarks']
        });
        if (granted) {
            return await saveTabAsBookmark(tab, group);
        }
    }

    return { tab, group };
};

export const saveTabAsBookmark = async (tab, group) => {

    if (!group.folder) {
        group.folder = await chrome.bookmarks.create({ title: group.title });
    }

    const bookmark = await chrome.bookmarks.create({
        title: tab.title,
        url: tab.url,
        parentId: group.folder.id
    });

    if (!tab.bookmarks) tab.bookmarks = [];
    tab.bookmarks.push(bookmark);

    return { tab, group };
};


// Contexts

export async function getContext(contextId) {
    if (!contextId) return null;
    else
        return await get(getContextKey(contextId));
}

export async function findExistingContextForGroup(group) {
    if (group.title == '') return null;
    return (await getContexts()).find((c) => c.title == group.title);
}

async function getContextIdFromGroupId(groupId) {
    const openGroups = await get('openGroups') ?? {};
    return openGroups[groupId];
}


export async function getContextFromGroupId(groupId) {
    const contextId = await getContextIdFromGroupId(groupId);
    return contextId ? await getContext(contextId) : null;
}

async function getContextFromTab(tab) {
    if (tab.groupId > -1) return await getContextFromGroupId(tab.groupId);
    return null;
}

export async function closeTabGroup(groupId) {
    
    if (!groupId || groupId == -1) return;

    const tabs = await chrome.tabs.query({ groupId: groupId });
    const tabIds = tabs.map((t) => t.id);

    let context = await getContextFromGroupId(groupId);

    if (context) await closeContext(context);

    setTimeout(() => {
        chrome.tabs.remove(tabIds);
    }, 200)

}

export const openWorkspace = async (workspace, {openInNewWindow = true, windowId }) => {

    const groupWorkspaceMap = await getOpenGroups();

    console.log('opening workspace');

    console.log(workspace);
    
    workspace = await getContext(workspace.id);
    const openGroup = await tryToGetTabGroup(workspace?.groupId);

    console.log(workspace);

    
    if (openGroup) {
        // navigate to last open tab
        
        return;
    }

    

    await set({
        workspaceToOpen: {
            workspace,
            time: Date.now(),
        }
    });

    let openedTabs = [];
    let window;
    let newTab; 
    if (windowId) {
        window = await chrome.windows.get(windowId);
    } else if (openInNewWindow) {
        window = await chrome.windows.create({incognito: workspace.isIncognito ?? false, focused:true});
        newTab = (await chrome.tabs.query({windowId: window.id}))[0];
    }
    if (!workspace.tabs) workspace.tabs = [];
    if (workspace.tabs.length == 0)  { // if group modified 
        let tabFolder;
        if (workspace.folderId) {
            tabFolder = await getWorkspaceTabFolder(workspace);
            if (tabFolder) {
                for (const bookmark of (await chrome.bookmarks.getChildren(tabFolder.id))) {
                    workspace.tabs.push(getTabInfo(bookmark));
                }
            }
        }

        if (workspace.tabs.length == 0) {
            workspace.tabs.push({
                url: 'chrome://newtab/'
            });
        }
    
    }


    for (let i = 0; i < workspace.tabs.length; i++) {
        const tab = await chrome.tabs.create({
            url: workspace.tabs[i].url, //chrome.extension.getUrl(''), 
            windowId: window?.id
        });
        //workspace.tabs[i].id = tab.id;
        //loaded = false;
        openedTabs.push(tab);
    }

    

    workspace.groupId = await chrome.tabs.group({
        tabIds: openedTabs.map((t) => t.id),
        createProperties: {
            windowId: window?.id
        },
    });

    await saveContext(workspace);

    await chrome.tabGroups.update(workspace.groupId, {
        title: workspace.title, 
        color: workspace.color 
    });

    if (newTab) {
        await chrome.tabs.remove(newTab.id);
    }
    
    return workspace;
};

export async function closeContext(context) {

    if (!context) return;

    context.closed = Date.now();
    context.activeTabIndex = context.tabs.findIndex((t) => context.activeTabId == t.id);
    delete context.isOpen;
    delete context.isActive;
    delete context.activeTabId;
    delete context.isCollapsed;
    delete context.groupId;
    await saveContext(context);

    await removeOpenContext(context);

}

export async function saveContext(context, saveUpdateTime = true) {

    if (saveUpdateTime) context.updated = Date.now();

    let record = {};
    record[getContextKey(context.id)] = context;
    await chrome.storage.local.set(record);
    return context;
}

async function removeOpenContext(context) {
    let openGroups = await get('openGroups');
    const existingContext = Object.entries(openGroups)
        .find(([key, v]) => v == context.id);
    if (existingContext) delete openGroups[existingContext[0]];
    await set({ openGroups: openGroups });
}



export async function getContexts(filter) {
    let results = [];
    let contextKeys = await get('contextKeys') ?? [];
    // if (contextKeys.length == 0) return results;
    // const data = await chrome.storage.local.get(contextKeys);
    
    // for (const [key, val] of Object.entries(data)) {

    //     if (!filter || filter(val))
    //         results.push(val);

    // }

    let updateContextKeys = false;
    const data = await chrome.storage.local.get(null);
    for (const [key, val] of Object.entries(data)) {
        if (key.startsWith(contextKeyPrefix())) {
            if (!filter || filter(val))
                results.push(val);

            if (!contextKeys.includes(key)) {
                contextKeys.push(key);
                updateContextKeys = true;
            }
        }
    }

    if (updateContextKeys) {
        await set({ contextKeys });
    }
        
    return results;
}

export async function removeContext(context) {

    await removeOpenContext(context);

    const contextKey = getContextKey(context.id);
    let contextKeys = await get('contextKeys');

    const index = contextKeys.indexOf(contextKey);
    if (index > -1) {
        contextKeys.splice(index, 1);
        await set({ contextKeys });
    }

    await chrome.storage.local.remove(contextKey);

    // const bookmarkFolder = await tryToGetBookmark(context.folderId);
    // if (bookmarkFolder) {
    //     const extensionFolder = await getExtensionFolder();
    //     if (extensionFolder.id == bookmarkFolder.parentId) {
    //         await chrome.bookmarks.removeTree(context.folderId);
    //     }
    // }

    const collectionKey = getContextDataKey(context.id);
    await chrome.storage.local.remove(collectionKey);

}

export async function removeContexts(contexts) {
    const contextKeysToRemove = contexts.map((c) => getContextKey(c));
    const contextKeys = (await get('contextKeys') ?? []).filter((k) => !contextKeysToRemove.includes(k));
    for (const context of contexts) {
        await removeContext(context);
    }
    
}

export async function getContextData(contextId) {
    return (await get(getContextDataKey(contextId))) ?? {};
}

function getContextKey(contextId) {
    return contextKeyPrefix() + contextId;
}

function contextKeyPrefix() {
    return 'c-';
}

function getContextDataKey(contextId) {
    return 'cr-' + contextId;
}

export async function saveContextData(context, contextData) {

    if (!contextData) return;

    contextData.updated = Date.now();
    const record = {};
    record[getContextDataKey(context.id)] = contextData;
    await set(record);

    // context.openWindows = contextData.windows?.length
    // if (context.openWindows == 0) delete context.openWindows;
    //await saveContext(context);
    //notifyCollectionInterface(context);
}

export async function tryToGetBookmark(bookmarkId) {
    if (!bookmarkId) return;

    let bookmark;
    try {
        bookmark = (await chrome.bookmarks.get(bookmarkId))[0];
    } catch (error) {

    }
    return bookmark;
}

export async function tryToGetBookmarkChildren(bookmarkId) {
    if (!bookmarkId) return [];

    let bookmarks = [];
    try {
        bookmarks = (await chrome.bookmarks.getChildren(bookmarkId));
    } catch (error) {

    }
    return bookmarks;
}

export async function tryToGetBookmarkTree(bookmarkId) {
    let tree;
    try {
        tree = (await chrome.bookmarks.getSubTree(bookmarkId));
    } catch (error) {

    }

    return tree;
}

export async function tryToGetTab(tabId) {
    if (!tabId) return;

    let tab;
    try {
        tab = await chrome.tabGroups.get(tabId);
    } catch (error) {

    }

    return tab;
}

export async function tryToGetTabGroup(groupId) {
    if (!groupId) return;

    if (typeof groupId == 'string') groupId = parseInt(groupId);

    let group;
    try {
        group = await chrome.tabGroups.get(groupId);
    } catch (error) {

    }
    return group;
}

export async function tryToGetWorkspaceFolder(workspace, createFolder) {
    if (!workspace) return;
    let folder = await tryToGetBookmark(workspace.folderId);
    if (!folder) {
        // search for folders with the same name 
        const searchResults = await chrome.bookmarks.search({title: workspace.title});
        if (searchResults.length == 1) {
            folder = searchResults[0];
            
        } 
    }

    if (!folder && createFolder) {
        // creat folder
        folder = await chrome.bookmarks.create({
            title: workspace.title,
            parentId: (await getExtensionFolder()).id
        });
    }

    if (folder?.id != workspace.folderId) {
        workspace.folderId = folder.id;
        await saveContext(workspace);
        // need to make sure that the context data is updated in sidepanel
    }

    return folder;
}

export async function createContextFromGroup(group) {
    const window = await chrome.windows.get(group.windowId);
    return await createContext({
        title: group.title,
        groupId: group.id,
        color: group.color,
        tabs: (await chrome.tabs.query({groupId: group.id})).map(getTabInfo),
        isIncognito: window.incognito,
    });
}


export async function createContext(properties = {}, save = true) {

    let context = {
        id: createId(),
        created: Date.now(),
        tabs: [],
        isCollapsed: false,
        //hasDefaultTitle: true,
        ...properties,
        
    };



    if (save) {

        const contextKey = getContextKey(context.id);

        let contextKeys = (await get('contextKeys') ?? []);
        contextKeys.push(contextKey);

        await set({ contextKeys });
        await saveContext(context);
    }

    return context;
}

export async function getExtensionFolder() {
    const folderId = await get('folderId');
    let folder = await tryToGetBookmark(folderId);
    if (!folder) {
        folder = await chrome.bookmarks.create({
            index: 0,
            title: 'Stash'
        });
        await set({ folderId: folder.id });
    }
    return folder;
}

export function createId() {
    let string = '';
    for (let i = 0; i < 8; i++) string += S4();
    return string;
}

function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

export function getTabInfo(tab, showAdditionalData = false) {
    if (!tab) return tab;

    let properties = [
        'id',
        'title',
        'url',
        'favIconUrl',
        'lastAccessed',
        'created',
        'updated',
        'openedInBackground'
    ];

    if (showAdditionalData) {

        let additionalProperties = [
            'groupId',
            'index',
            'pinned',
            'audible', 
            'mutedInfo',
            'status',
            'windowId',
            'sessionId',
            'discarded',
        ];

        properties = [...properties, ...additionalProperties];

    }

    let tabInfo = {};

    for (const property of properties) {
        const value  = tab[property];
        if (value) tabInfo[property] = value;
    }

    if (!tabInfo.url || tabInfo.url == '') {
        tabInfo.url = tab.pendingUrl;
    }

    return tabInfo;
}

export async function getFavoriteSpaces() {
    const data = (await chrome.storage.sync.get(['favoriteSpaces'])) ?? {};
    return data['favoriteSpaces'];
}

export const queueFolderTitle  = '_Queue_';
export const tabFolderTitle = '_Tabs_';

export const hiddenFolderTitles = [queueFolderTitle, tabFolderTitle];

export async function getWorkspaceQueueFolder(workspace, createFolder) {
    
    let folder = workspace?.folderId
        ? (await chrome.bookmarks.getChildren(workspace.folderId))
            .find((b) => !b.url && b.title == queueFolderTitle)
        : null;

    if (!folder && createFolder) {
        folder = await chrome.bookmarks.create({
            title: queueFolderTitle,
            parentId: workspace.folderId,
        });
    }
    return folder;
}

export async function getWorkspaceTabFolder(workspace) {


    let folder = (await chrome.bookmarks.getChildren(workspace.folderId))
    .find((b) => !b.url && b.title == tabFolderTitle);

    if (!folder) {
        folder = await chrome.bookmarks.create({
            title: tabFolderTitle,
            parentId: workspace.folderId,
        });
    }
    return folder;

}

export async function saveTabToFolder(tab, folderId) {
    const children = await chrome.bookmarks.getChildren(folderId);
    const existingBookmark = children.find((t) => tab.url == t.url);
    if (existingBookmark) {
        await chrome.bookmarks.update(existingBookmark.id, {
            index: 0,
        });
    } else {
        await chrome.bookmarks.create({
            parentId: folderId,
            index: 0,
            url: tab.url,
            title: tab.title,
        });
    }
}

export async function createAdjacentTab( props ) {
    
    const activeTab = await getActiveTab();
    let tab = await chrome.tabs.create({...props, index: activeTab.index });
    if (activeTab.groupId > -1) {
        await chrome.tabs.group({ tabIds: tab.id, groupId: activeTab.groupId });
        tab.groupId = activeTab.groupId;
    }

    return tab;
}

export async function getHistory({ maxResults = 10000}) {
    let history = [];
    let hasHistoryPermission = await chrome.permissions.contains({
        permissions: ['history']
    });

    if (!hasHistoryPermission) return [];

    const results = await chrome.history.search({
        startTime: Date.now() - (30 * 24 * 60 * 60 * 1000),
        text: '',
        maxResults: maxResults,
    });

    history = removeDuplicateHistoryItems(results);

    return history;
}

const removeDuplicateHistoryItems = (historyItems) => {
    let titles = [];
    let result = [];
    for (const historyItem of historyItems) {
        if (titles.includes(historyItem.title)) continue;
        titles.push(historyItem.title);
        result.push(historyItem);
    }
    return result;
};

export const restoreWindow = async (window) => {

};

export const stashWindow = async (params = {}) => {
    let windowId = params.windowId;
     let window;

     const activeTab = await getActiveTab();
     const isCurrentWindow = !windowId || (activeTab.windowId == windowId);

     if (windowId) {
         window = await chrome.windows.get(windowId);
     } else {
         window = await chrome.windows.get(activeTab.windowId);
     } 

     const tabs = await chrome.tabs.query({ windowId: window.id });


     let groupIds = [];

     let tabData = {};

     for (const tab of tabs) {
         if (tab.groupId == -1 || !tab.groupId) {
             tabData[tab.id] = tab;
         } else if (!groupIds.includes(tab.groupId)) {
             groupIds.push(tab.groupId);
             const context = await getContextFromGroupId(tab.groupId);
             tabData[context.id] = context;
         }
     }

     window.tabs = tabData;
     window.stashed = Date.now();

     let sessions = (await get('sessions')) ?? [];
     sessions.unshift(window);
     await set({ sessions });
 
     if (isCurrentWindow) {
         await chrome.tabs.create({});
     }


     //_lastStashedWindow.set(Date.now());
     chrome.tabs.remove(tabs.map((t) => t.id));

 };

export const moveWorkspaceToNewWindow = async (workspace) => {
    const currentWindow = await chrome.windows.get((await getActiveTab()).windowId);
    const newWindow = await chrome.windows.create({ 
        focused: true, 
        state: currentWindow.state,  
    });
    const newTab = (await chrome.tabs.query({windowId: newWindow.id}))[0];
    await chrome.tabGroups.move(workspace.groupId, {
        windowId: newWindow.id,
        index: -1
    });
    await chrome.tabs.remove(newTab.id);
};
