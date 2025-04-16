// List management functions
import { state, saveState, generateId } from './state.js';

// Create a new list
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

// Update an existing list
export function updateList(listId, listData) {
    const listIndex = state.lists.findIndex(l => l.id === listId);
    if (listIndex !== -1) {
        // Don't allow changing the ID of the uncategorized list
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

// Delete a list and move its tasks to the uncategorized list
export function deleteList(listId) {
    // Prevent deleting the uncategorized list
    if (listId === state.uncategorizedListId) {
        return false;
    }
    
    const listIndex = state.lists.findIndex(l => l.id === listId);
    if (listIndex !== -1) {
        // Move tasks to uncategorized list
        state.tasks.forEach(task => {
            if (task.listId === listId) {
                task.listId = state.uncategorizedListId;
            }
        });
        
        // Delete the list
        state.lists.splice(listIndex, 1);
        saveState();
        return true;
    }
    return false;
}

// Reorder lists
export function reorderLists(newOrder) {
    if (!Array.isArray(newOrder) || newOrder.length !== state.lists.length) {
        return false;
    }
    
    // Create a new ordered array
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

// Get a list by ID
export function getListById(listId) {
    return state.lists.find(list => list.id === listId) || null;
}