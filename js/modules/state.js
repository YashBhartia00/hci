// App state management
export const state = {
    lists: [],
    tasks: [],
    deletedTasks: [],
    currentView: 'list', // 'list' or 'date'
    filters: {
        keyword: '',
        dates: [],
        lists: []
    },
    editingTask: null,
    uncategorizedListId: 'uncategorized'
};

// Initialize app state from localStorage
export function initState() {
    try {
        const savedLists = localStorage.getItem('taskManagerLists');
        const savedTasks = localStorage.getItem('taskManagerTasks');
        const savedDeletedTasks = localStorage.getItem('taskManagerDeletedTasks');

        if (savedLists) {
            state.lists = JSON.parse(savedLists);
            // Ensure uncategorized list exists
            if (!state.lists.some(list => list.id === state.uncategorizedListId)) {
                state.lists.push({ id: state.uncategorizedListId, name: 'Uncategorized', icon: 'fa-list' });
            }
        } else {
            // Default lists if none exist
            state.lists = [
                { id: generateId(), name: 'Personal', icon: 'fa-user' },
                { id: generateId(), name: 'Work', icon: 'fa-briefcase' },
                { id: generateId(), name: 'Shopping', icon: 'fa-shopping-cart' },
                { id: state.uncategorizedListId, name: 'Uncategorized', icon: 'fa-list' }
            ];
            saveState();
        }

        if (savedTasks) {
            state.tasks = JSON.parse(savedTasks);
        }

        if (savedDeletedTasks) {
            state.deletedTasks = JSON.parse(savedDeletedTasks);
        }
    } catch (error) {
        console.error('Error loading data:', error);
        // Reset to defaults if there's an error
        state.lists = [
            { id: generateId(), name: 'Personal', icon: 'fa-user' },
            { id: generateId(), name: 'Work', icon: 'fa-briefcase' },
            { id: generateId(), name: 'Shopping', icon: 'fa-shopping-cart' },
            { id: state.uncategorizedListId, name: 'Uncategorized', icon: 'fa-list' }
        ];
        state.tasks = [];
        state.deletedTasks = [];
        saveState();
    }
}

// Save state to localStorage
export function saveState() {
    localStorage.setItem('taskManagerLists', JSON.stringify(state.lists));
    localStorage.setItem('taskManagerTasks', JSON.stringify(state.tasks));
    localStorage.setItem('taskManagerDeletedTasks', JSON.stringify(state.deletedTasks));
}

// Helper function to generate unique IDs
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}