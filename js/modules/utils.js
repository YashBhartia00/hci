// Utility functions


export function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}


export function isTomorrow(date) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.getDate() === tomorrow.getDate() &&
           date.getMonth() === tomorrow.getMonth() &&
           date.getFullYear() === tomorrow.getFullYear();
}


export function isThisWeek(date) {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(new Date(weekStart).setDate(weekStart.getDate() + 6));
    return date >= weekStart && date <= weekEnd;
}


export function formatDate(date) {
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}


export function formatDateShort(date) {
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}


export function formatTime(date) {
    const options = { hour: 'numeric', minute: 'numeric', hour12: true };
    return date.toLocaleTimeString('en-US', options);
}


export function getDateColorClass(dueDate) {
    if (!dueDate) return 'no-date';
    
    const date = new Date(dueDate);
    
    if (isToday(date)) return 'today';
    if (isTomorrow(date)) return 'tomorrow';
    if (isThisWeek(date)) return 'week';
    return 'later';
}


export function getDateText(dueDate) {
    if (!dueDate) return 'No Due Date';
    
    const date = new Date(dueDate);
    
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return formatDate(date);
}


export function groupTasksByDate(tasks) {
    const grouped = {};
    
    
    grouped['no-date'] = tasks.filter(task => !task.dueDate);
    
    
    tasks.filter(task => task.dueDate).forEach(task => {
        const dateKey = task.dueDate.split('T')[0];
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
    });
    
    
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