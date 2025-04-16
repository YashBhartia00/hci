// Utility functions

// Check if a date is today
export function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

// Check if a date is tomorrow
export function isTomorrow(date) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.getDate() === tomorrow.getDate() &&
           date.getMonth() === tomorrow.getMonth() &&
           date.getFullYear() === tomorrow.getFullYear();
}

// Check if a date is within this week
export function isThisWeek(date) {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(new Date(weekStart).setDate(weekStart.getDate() + 6));
    return date >= weekStart && date <= weekEnd;
}

// Format a date object to a readable string
export function formatDate(date) {
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format a date object to a short string
export function formatDateShort(date) {
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format time from date object (HH:MM AM/PM)
export function formatTime(date) {
    const options = { hour: 'numeric', minute: 'numeric', hour12: true };
    return date.toLocaleTimeString('en-US', options);
}

// Get date color class based on due date
export function getDateColorClass(dueDate) {
    if (!dueDate) return 'no-date';
    
    const date = new Date(dueDate);
    
    if (isToday(date)) return 'today';
    if (isTomorrow(date)) return 'tomorrow';
    if (isThisWeek(date)) return 'week';
    return 'later';
}

// Get date text based on due date
export function getDateText(dueDate) {
    if (!dueDate) return 'No Due Date';
    
    const date = new Date(dueDate);
    
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return formatDate(date);
}

// Group tasks by date
export function groupTasksByDate(tasks) {
    const grouped = {};
    
    // Group for tasks with no date
    grouped['no-date'] = tasks.filter(task => !task.dueDate);
    
    // Group tasks by due date
    tasks.filter(task => task.dueDate).forEach(task => {
        const dateKey = task.dueDate.split('T')[0];
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
    });
    
    // Sort date keys
    return Object.keys(grouped)
        .sort((a, b) => {
            if (a === 'no-date') return 1;
            if (b === 'no-date') return -1;
            return new Date(a) - new Date(b);
        })
        .reduce((obj, key) => {
            obj[key] = grouped[key];
            return obj;
        }, {});
}