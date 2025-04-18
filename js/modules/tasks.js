// Task management functions
import { state, saveState, generateId } from './state.js';
import * as utils from './utils.js';


export function createTask(taskData) {
    const { name, icon, dueDate, dueTime, listId, completed = false } = taskData;
    
    
    const newTask = {
        id: generateId(),
        name: name || "",
        icon: icon || 'fa-tasks',
        dueDate,
        dueTime,
        listId: listId || state.uncategorizedListId,
        completed,
        createdAt: new Date().toISOString()
    };
    
    state.tasks.push(newTask);
    saveState();
    return newTask;
}


export function updateTask(taskId, taskData) {
    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        state.tasks[taskIndex] = {
            ...state.tasks[taskIndex],
            ...taskData
        };
        saveState();
        return state.tasks[taskIndex];
    }
    return null;
}


export function toggleTaskCompletion(taskId) {
    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        state.tasks[taskIndex].completed = !state.tasks[taskIndex].completed;
        saveState();
        return state.tasks[taskIndex];
    }
    return null;
}


export function deleteTask(taskId) {
    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        const deletedTask = state.tasks[taskIndex];
        state.deletedTasks.push(deletedTask);
        state.tasks.splice(taskIndex, 1);
        saveState();
        return deletedTask;
    }
    return null;
}


export function restoreTask(taskId) {
    const taskIndex = state.deletedTasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        const task = state.deletedTasks[taskIndex];
        
        
        if (!state.lists.some(list => list.id === task.listId)) {
            
            task.listId = state.lists.length > 0 ? state.lists[0].id : state.uncategorizedListId;
        }
        
        state.tasks.push(task);
        state.deletedTasks.splice(taskIndex, 1);
        
        saveState();
        return task;
    }
    return null;
}


export function permanentlyDeleteTask(taskId) {
    const taskIndex = state.deletedTasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        state.deletedTasks.splice(taskIndex, 1);
        saveState();
        return true;
    }
    return false;
}


export function moveTaskToList(taskId, newListId) {
    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        state.tasks[taskIndex].listId = newListId;
        saveState();
        return state.tasks[taskIndex];
    }
    return null;
}


export function getFilteredTasks() {
    let result = [...state.tasks];
    
    
    if (state.filters.keyword) {
        result = result.filter(task => 
            task.name.toLowerCase().includes(state.filters.keyword.toLowerCase())
        );
    }
    
    
    if (state.filters.dates.length > 0) {
        result = result.filter(task => {
            if (!task.dueDate) {
                return state.filters.dates.includes('no-date');
            }
            
            const date = new Date(task.dueDate);
            
            return state.filters.dates.some(filter => {
                if (filter === 'today') return utils.isToday(date);
                if (filter === 'tomorrow') return utils.isTomorrow(date);
                if (filter === 'week') return utils.isThisWeek(date);
                return false;
            });
        });
    }
    
    
    if (state.filters.lists.length > 0) {
        result = result.filter(task => state.filters.lists.includes(task.listId));
    }
    
    return result;
}


export function getIncompleteTasks() {
    return state.tasks.filter(task => !task.completed);
}