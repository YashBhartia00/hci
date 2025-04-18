// List management functions
import { state, saveState, generateId } from './state.js';


export function createList(name, icon = 'fa-list') {
    if (!name || name.trim() === '') {
        throw new Error('List name is required');
    }
    
    const newList = {
        id: generateId(),
        name: name.trim(),
        icon
    };
    
    state.lists.push(newList);
    saveState();
    return newList;
}


export function updateList(listId, listData) {
    const listIndex = state.lists.findIndex(l => l.id === listId);
    if (listIndex !== -1) {
        
        if (listId === state.uncategorizedListId) {
            delete listData.id;
        }
        
        state.lists[listIndex] = {
            ...state.lists[listIndex],
            ...listData
        };
        saveState();
        return state.lists[listIndex];
    }
    return null;
}


export function deleteList(listId) {
    
    if (listId === state.uncategorizedListId) {
        return false;
    }
    
    const listIndex = state.lists.findIndex(l => l.id === listId);
    if (listIndex !== -1) {
        
        state.tasks.forEach(task => {
            if (task.listId === listId) {
                task.listId = state.uncategorizedListId;
            }
        });
        
        
        state.lists.splice(listIndex, 1);
        saveState();
        return true;
    }
    return false;
}


export function reorderLists(newOrder) {
    if (!Array.isArray(newOrder) || newOrder.length !== state.lists.length) {
        return false;
    }
    
    
    const newLists = [];
    for (const listId of newOrder) {
        const list = state.lists.find(l => l.id === listId);
        if (list) {
            newLists.push(list);
        }
    }
    
    if (newLists.length === state.lists.length) {
        state.lists = newLists;
        saveState();
        return true;
    }
    return false;
}


export function getListById(listId) {
    return state.lists.find(list => list.id === listId) || null;
}