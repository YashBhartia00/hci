// UI-related functionality
import { state } from './state.js';
import * as taskManager from './tasks.js';
import * as listManager from './lists.js';
import * as utils from './utils.js';
import * as drag from './drag.js';

// DOM elements
export const elements = {
    listView: null,
    dateView: null,
    listViewBtn: null,
    dateViewBtn: null,
    filterBtn: null,
    deleteBtn: null,
    fab: null,
    taskModal: null,
    filterModal: null,
    listModal: null,
    historyModal: null,
    listsContainer: null,
    dateGroupsContainer: null,
    deletedTasksContainer: null,
    createTaskBtn: null,
    modalDragHandle: null
};

// Initialize UI
export function initUI(domElements) {
    // Store references to DOM elements
    Object.assign(elements, domElements);
    
    // Set up modal drag behavior
    setupModalDrag();
    
    // Set up task creation button drag
    drag.setupTaskCreateDragging(elements.createTaskBtn);
}

// Setup modal drag behavior
function setupModalDrag() {
    let startY, startHeight;
    
    elements.modalDragHandle.addEventListener('mousedown', handleModalDragStart);
    elements.modalDragHandle.addEventListener('touchstart', handleModalDragStart, {passive: false});
    
    function handleModalDragStart(e) {
        e.preventDefault();
        const modal = elements.taskModal;
        const modalContent = modal.querySelector('.modal-content');

        startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
        startHeight = modalContent.offsetHeight;

        document.addEventListener('mousemove', handleModalDragMove);
        document.addEventListener('touchmove', handleModalDragMove, {passive: false});
        document.addEventListener('mouseup', handleModalDragEnd);
        document.addEventListener('touchend', handleModalDragEnd);
    }

    function handleModalDragMove(e) {
        const modal = elements.taskModal;
        const modalContent = modal.querySelector('.modal-content');
        const currentY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
        const diffY = startY - currentY;
        const newHeight = startHeight + diffY;

        // Set minimum and maximum height constraints
        const minHeight = window.innerHeight * 0.25; // 25% of viewport height
        const maxHeight = window.innerHeight * 0.75; // 75% of viewport height
        
        // Apply the new height within constraints
        modalContent.style.height = `${Math.max(minHeight, Math.min(maxHeight, newHeight))}px`;
        
        // Toggle expanded class based on height
        if (newHeight > minHeight * 1.5) {
            modal.classList.add('expanded');
        } else {
            modal.classList.remove('expanded');
        }
        
        e.preventDefault();
    }

    function handleModalDragEnd() {
        document.removeEventListener('mousemove', handleModalDragMove);
        document.removeEventListener('touchmove', handleModalDragMove);
        document.removeEventListener('mouseup', handleModalDragEnd);
        document.removeEventListener('touchend', handleModalDragEnd);
    }
}

// Switch between List and Date views
export function switchView(view) {
    state.currentView = view;
    
    if (view === 'list') {
        elements.listView.classList.add('active');
        elements.dateView.classList.remove('active');
        elements.listViewBtn.classList.add('active');
        elements.dateViewBtn.classList.remove('active');
    } else {
        elements.dateView.classList.add('active');
        elements.listView.classList.remove('active');
        elements.dateViewBtn.classList.add('active');
        elements.listViewBtn.classList.remove('active');
    }
    
    renderCurrentView();
}

// Render the current view (List or Date)
export function renderCurrentView() {
    if (state.currentView === 'list') {
        renderListView();
    } else {
        renderDateView();
    }
}

// Render the List View
export function renderListView() {
    elements.listsContainer.innerHTML = '';
    
    state.lists.forEach(list => {
        // Create list container
        const listElement = document.createElement('div');
        listElement.className = 'list';
        listElement.dataset.listId = list.id;
        
        // Create list header
        const listHeader = document.createElement('div');
        listHeader.className = 'list-header';
        
        // Add list icon
        const listIcon = document.createElement('div');
        listIcon.className = 'list-icon';
        listIcon.innerHTML = `<i class="fas ${list.icon || 'fa-list'}"></i>`;
        
        const listTitle = document.createElement('div');
        listTitle.className = 'list-title';
        listTitle.textContent = list.name;
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'list-toggle';
        toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        
        listHeader.appendChild(listIcon);
        listHeader.appendChild(listTitle);
        listHeader.appendChild(toggleBtn);
        listElement.appendChild(listHeader);
        
        // Create tasks container
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'tasks';
        
        // Filter tasks for this list
        const listTasks = taskManager.getFilteredTasks().filter(task => task.listId === list.id);
        
        // For entire list header click to toggle
        listHeader.addEventListener('click', () => {
            tasksContainer.style.display = tasksContainer.style.display === 'none' ? 'flex' : 'none';
            toggleBtn.innerHTML = tasksContainer.style.display === 'none' ? 
                '<i class="fas fa-chevron-down"></i>' : 
                '<i class="fas fa-chevron-up"></i>';
        });
        
        if (listTasks.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-list-message';
            emptyMessage.textContent = 'No tasks in this list';
            emptyMessage.style.padding = '10px 15px';
            emptyMessage.style.color = '#999';
            emptyMessage.style.fontStyle = 'italic';
            tasksContainer.appendChild(emptyMessage);
            
            // Empty lists default to collapsed
            tasksContainer.style.display = 'none';
        } else {
            listTasks.forEach(task => {
                const taskElement = createTaskElement(task);
                tasksContainer.appendChild(taskElement);
            });
        }
        
        listElement.appendChild(tasksContainer);
        elements.listsContainer.appendChild(listElement);
        
        // Initialize drag-and-drop for this list's tasks
        drag.setupTaskSortable(listElement);
    });
}

// Render the Date View
export function renderDateView() {
    elements.dateGroupsContainer.innerHTML = '';
    
    // Get filtered tasks that are not completed
    const filteredTasks = taskManager.getFilteredTasks().filter(task => !task.completed);
    
    // Group tasks by date
    const groupedTasks = utils.groupTasksByDate(filteredTasks);
    
    // Create date groups
    for (const [dateKey, tasks] of Object.entries(groupedTasks)) {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        
        // Create date heading
        const dateHeading = document.createElement('div');
        dateHeading.className = 'date-heading';
        
        let dateText;
        if (dateKey === 'no-date') {
            dateText = 'No Due Date';
        } else if (utils.isToday(new Date(dateKey))) {
            dateText = 'Today';
        } else if (utils.isTomorrow(new Date(dateKey))) {
            dateText = 'Tomorrow';
        } else {
            dateText = utils.formatDate(new Date(dateKey));
        }
        
        dateHeading.textContent = dateText;
        dateGroup.appendChild(dateHeading);
        
        // Create tasks container
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'tasks date-view-tasks';
        
        // Add tasks to the container
        tasks.forEach(task => {
            const taskElement = createDateViewTaskElement(task);
            tasksContainer.appendChild(taskElement);
        });
        
        dateGroup.appendChild(tasksContainer);
        elements.dateGroupsContainer.appendChild(dateGroup);
    }
}

// Create a task element for list view
export function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task';
    taskElement.dataset.taskId = task.id;
    
    // Apply color class based on due date
    if (task.dueDate) {
        const colorClass = utils.getDateColorClass(task.dueDate);
        taskElement.classList.add(colorClass);
    } else {
        taskElement.classList.add('no-date');
    }
    
    if (task.completed) {
        taskElement.classList.add('completed');
    }
    
    // Task icon
    const taskIcon = document.createElement('div');
    taskIcon.className = 'task-icon';
    taskIcon.innerHTML = `<i class="fas ${task.icon || 'fa-tasks'}"></i>`;
    
    // Icon click toggles completion
    taskIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        taskManager.toggleTaskCompletion(task.id);
        renderCurrentView();
    });
    
    // Task text
    const taskText = document.createElement('div');
    taskText.className = 'task-text';
    taskText.textContent = task.name;
    
    // Task date/time display (initially hidden)
    const taskDate = document.createElement('div');
    taskDate.className = 'task-date';
    
    if (task.dueDate) {
        let dateDisplay = '';
        if (utils.isToday(new Date(task.dueDate))) {
            dateDisplay = 'Today';
        } else if (utils.isTomorrow(new Date(task.dueDate))) {
            dateDisplay = 'Tomorrow';
        } else {
            dateDisplay = utils.formatDateShort(new Date(task.dueDate));
        }
        
        if (task.dueTime) {
            dateDisplay += ' ' + task.dueTime;
        }
        
        taskDate.innerHTML = `<span class="date-tag ${utils.getDateColorClass(task.dueDate)}">${dateDisplay}</span>`;
    } else {
        taskDate.innerHTML = '<span class="date-tag no-date">No Date</span>';
    }
    
    taskElement.appendChild(taskIcon);
    taskElement.appendChild(taskText);
    taskElement.appendChild(taskDate);
    
    // Set up touch handling for this task
    drag.setupTaskTouchHandling(taskElement, task);
    
    return taskElement;
}

// Create a task element for date view
export function createDateViewTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task date-view-task';
    taskElement.dataset.taskId = task.id;
    
    // List label
    const listLabel = document.createElement('div');
    listLabel.className = 'task-list-label';
    const list = listManager.getListById(task.listId);
    listLabel.textContent = list ? list.name : 'Unknown List';
    
    // Task content
    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';
    
    // Task icon
    const taskIcon = document.createElement('div');
    taskIcon.className = 'task-icon';
    taskIcon.innerHTML = `<i class="fas ${task.icon || 'fa-tasks'}"></i>`;
    
    // Icon click toggles completion
    taskIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        taskManager.toggleTaskCompletion(task.id);
        renderCurrentView();
    });
    
    // Task text
    const taskText = document.createElement('div');
    taskText.className = 'task-text';
    taskText.textContent = task.name;
    
    // Task time
    const taskTime = document.createElement('div');
    taskTime.className = 'task-time';
    if (task.dueTime) {
        taskTime.textContent = task.dueTime;
    }
    
    taskContent.appendChild(taskIcon);
    taskContent.appendChild(taskText);
    
    taskElement.appendChild(listLabel);
    taskElement.appendChild(taskContent);
    taskElement.appendChild(taskTime);
    
    // Set up touch handling for this task
    drag.setupTaskTouchHandling(taskElement, task);
    
    return taskElement;
}

// Show task creation/editing modal
export function showTaskModal(task = null) {
    const modal = elements.taskModal;
    modal.classList.add('active');
    modal.classList.remove('expanded');
    
    const modalTitle = document.getElementById('task-modal-title');
    const nameInput = document.getElementById('task-name');
    const iconButtons = document.querySelectorAll('.icon-btn');
    const dateButtons = document.querySelectorAll('.date-btn');
    const customDateInput = document.getElementById('custom-date');
    const customTimeInput = document.getElementById('custom-time');
    const listSelect = document.getElementById('list-select');
    const createTaskBtn = document.getElementById('create-task');
    const saveTaskBtn = document.getElementById('save-task');
    
    // Clear previous selections
    iconButtons.forEach(btn => btn.classList.remove('active'));
    dateButtons.forEach(btn => btn.classList.remove('active'));
    
    // Set default icon and date
    document.querySelector('.icon-btn[data-icon="fa-tasks"]')?.classList.add('active');
    document.querySelector('.date-btn[data-date="no-date"]')?.classList.add('active');
    
    if (task) {
        // Editing existing task
        modalTitle.textContent = 'Edit Task';
        nameInput.value = task.name;
        
        // Show expanded form for editing
        modal.classList.add('expanded');
        
        // Hide create button, show save button
        createTaskBtn.style.display = 'none';
        saveTaskBtn.style.display = 'block';
        
        // Set icon
        const iconBtn = document.querySelector(`.icon-btn[data-icon="${task.icon}"]`);
        if (iconBtn) {
            iconBtn.classList.add('active');
        }
        
        // Set date and time
        if (task.dueDate) {
            customDateInput.value = task.dueDate;
            if (utils.isToday(new Date(task.dueDate))) {
                document.querySelector('.date-btn[data-date="today"]').classList.add('active');
            } else if (utils.isTomorrow(new Date(task.dueDate))) {
                document.querySelector('.date-btn[data-date="tomorrow"]').classList.add('active');
            } else {
                document.querySelector('.date-btn[data-date="custom"]')?.classList.add('active');
            }
        } else {
            document.querySelector('.date-btn[data-date="no-date"]').classList.add('active');
            customDateInput.value = '';
        }
        
        // Set time
        if (task.dueTime) {
            customTimeInput.value = task.dueTime;
        } else {
            customTimeInput.value = '';
        }
        
        // Set list
        listSelect.value = task.listId;
        
        state.editingTask = task;
    } else {
        // Creating new task
        modalTitle.textContent = 'New Task';
        nameInput.value = '';
        customDateInput.value = '';
        customTimeInput.value = '';
        
        // Show create button, hide save button
        createTaskBtn.style.display = 'block';
        saveTaskBtn.style.display = 'none';
        
        // Set default list to first list (or uncategorized)
        listSelect.value = state.lists.length > 0 ? 
            (state.lists[0].id !== state.uncategorizedListId ? state.lists[0].id : state.uncategorizedListId) : 
            state.uncategorizedListId;
        
        state.editingTask = null;
    }
    
    // Focus on the name input
    setTimeout(() => nameInput.focus(), 300);
}

// Hide task modal
export function hideTaskModal() {
    elements.taskModal.classList.remove('active');
    elements.taskModal.classList.remove('expanded');
    state.editingTask = null;
}

// Show list creation modal
export function showListModal() {
    elements.listModal.classList.add('active');
    document.getElementById('list-name').value = '';
    
    // Reset list icon selection
    const listIconButtons = document.querySelectorAll('.list-icon-btn');
    listIconButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector('.list-icon-btn[data-icon="fa-list"]')?.classList.add('active');
    
    setTimeout(() => document.getElementById('list-name').focus(), 300);
}

// Hide list modal
export function hideListModal() {
    elements.listModal.classList.remove('active');
}

// Show filter modal
export function showFilterModal() {
    elements.filterModal.classList.add('active');
    
    // Populate list options for filtering
    const listFilterOptions = document.getElementById('list-filter-options');
    listFilterOptions.innerHTML = '';
    
    state.lists.forEach(list => {
        const option = document.createElement('div');
        option.className = 'list-filter-option';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `filter-list-${list.id}`;
        checkbox.value = list.id;
        checkbox.checked = state.filters.lists.includes(list.id);
        
        const label = document.createElement('label');
        label.htmlFor = `filter-list-${list.id}`;
        label.textContent = list.name;
        
        option.appendChild(checkbox);
        option.appendChild(label);
        listFilterOptions.appendChild(option);
    });
    
    // Set keyword filter
    document.getElementById('keyword-filter').value = state.filters.keyword;
    
    // Set date filters
    document.querySelectorAll('.date-filter-btn').forEach(btn => {
        btn.classList.toggle('active', state.filters.dates.includes(btn.dataset.filter));
    });
}

// Show history/deleted tasks modal
export function showHistoryModal() {
    elements.historyModal.classList.add('active');
    elements.deletedTasksContainer.innerHTML = '';
    
    if (state.deletedTasks.length === 0) {
        elements.deletedTasksContainer.innerHTML = '<p style="text-align: center; color: #999;">No deleted tasks</p>';
        return;
    }
    
    state.deletedTasks.forEach(task => {
        const deletedTaskElement = document.createElement('div');
        deletedTaskElement.className = 'deleted-task';
        
        const taskInfo = document.createElement('div');
        taskInfo.className = 'deleted-task-info';
        
        const taskIcon = document.createElement('div');
        taskIcon.className = 'deleted-task-icon';
        taskIcon.innerHTML = `<i class="fas ${task.icon || 'fa-tasks'}"></i>`;
        
        const taskName = document.createElement('div');
        taskName.textContent = task.name;
        
        taskInfo.appendChild(taskIcon);
        taskInfo.appendChild(taskName);
        
        const taskActions = document.createElement('div');
        taskActions.className = 'deleted-task-actions';
        
        const restoreButton = document.createElement('button');
        restoreButton.textContent = 'Restore';
        restoreButton.addEventListener('click', () => {
            taskManager.restoreTask(task.id);
            showHistoryModal(); // Refresh the modal
        });
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.style.color = '#ef4444';
        deleteButton.addEventListener('click', () => {
            taskManager.permanentlyDeleteTask(task.id);
            showHistoryModal(); // Refresh the modal
        });
        
        taskActions.appendChild(restoreButton);
        taskActions.appendChild(deleteButton);
        
        deletedTaskElement.appendChild(taskInfo);
        deletedTaskElement.appendChild(taskActions);
        
        elements.deletedTasksContainer.appendChild(deletedTaskElement);
    });
}

// Apply filters
export function applyFilters() {
    // Get keyword filter
    state.filters.keyword = document.getElementById('keyword-filter').value.trim().toLowerCase();
    
    // Get date filters
    state.filters.dates = [];
    document.querySelectorAll('.date-filter-btn.active').forEach(btn => {
        state.filters.dates.push(btn.dataset.filter);
    });
    
    // Get list filters
    state.filters.lists = [];
    document.querySelectorAll('#list-filter-options input[type="checkbox"]:checked').forEach(cb => {
        state.filters.lists.push(cb.value);
    });
    
    // Hide filter modal
    hideModals();
    
    // Render the current view with filters applied
    renderCurrentView();
}

// Reset filters
export function resetFilters() {
    state.filters.keyword = '';
    state.filters.dates = [];
    state.filters.lists = [];
    
    // Reset UI
    document.getElementById('keyword-filter').value = '';
    
    document.querySelectorAll('.date-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('#list-filter-options input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    // Re-render
    hideModals();
    renderCurrentView();
}

// Create a task from the modal (without dragging)
export function createTaskFromModal() {
    const taskName = document.getElementById('task-name').value.trim();
    const activeIconBtn = document.querySelector('.icon-btn.active');
    const icon = activeIconBtn ? activeIconBtn.dataset.icon : 'fa-tasks';
    
    let dueDate = null;
    let dueTime = null;
    const activeDateBtn = document.querySelector('.date-btn.active');
    
    if (activeDateBtn && activeDateBtn.dataset.date !== 'no-date') {
        if (activeDateBtn.dataset.date === 'today') {
            dueDate = new Date().toISOString().split('T')[0];
        } else if (activeDateBtn.dataset.date === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dueDate = tomorrow.toISOString().split('T')[0];
        }
    } else {
        const customDate = document.getElementById('custom-date').value;
        if (customDate) {
            dueDate = customDate;
        }
    }
    
    // Get time
    dueTime = document.getElementById('custom-time').value;
    
    // Use selected list, or default to Uncategorized
    let listId = document.getElementById('list-select').value;
    if (!listId) {
        listId = state.uncategorizedListId;
    }
    
    // Create new task
    taskManager.createTask({
        name: taskName,
        icon,
        dueDate,
        dueTime,
        listId
    });
    
    hideTaskModal();
    renderCurrentView();
}

// Create a task in a specific list (from dragging)
export function createTaskInList(listId) {
    const taskName = document.getElementById('task-name').value.trim();
    const activeIconBtn = document.querySelector('.icon-btn.active');
    const icon = activeIconBtn ? activeIconBtn.dataset.icon : 'fa-tasks';

    // Get date if specified
    let dueDate = null;
    let dueTime = null;
    const activeDateBtn = document.querySelector('.date-btn.active');
    
    if (activeDateBtn && activeDateBtn.dataset.date !== 'no-date') {
        if (activeDateBtn.dataset.date === 'today') {
            dueDate = new Date().toISOString().split('T')[0];
        } else if (activeDateBtn.dataset.date === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dueDate = tomorrow.toISOString().split('T')[0];
        }
    } else {
        const customDate = document.getElementById('custom-date').value;
        if (customDate) {
            dueDate = customDate;
        }
    }

    // Get time
    dueTime = document.getElementById('custom-time').value;
    
    // Create new task
    taskManager.createTask({
        name: taskName,
        icon,
        dueDate,
        dueTime,
        listId
    });
    
    hideTaskModal();
    renderCurrentView();
}

// Save task
export function saveTask() {
    const taskName = document.getElementById('task-name').value.trim();
    
    const activeIconBtn = document.querySelector('.icon-btn.active');
    const icon = activeIconBtn ? activeIconBtn.dataset.icon : 'fa-tasks';
    
    const activeDateBtn = document.querySelector('.date-btn.active');
    let dueDate = null;
    let dueTime = null;
    
    if (activeDateBtn && activeDateBtn.dataset.date !== 'no-date') {
        if (activeDateBtn.dataset.date === 'today') {
            dueDate = new Date().toISOString().split('T')[0];
        } else if (activeDateBtn.dataset.date === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dueDate = tomorrow.toISOString().split('T')[0];
        }
    } else {
        const customDate = document.getElementById('custom-date').value;
        if (customDate) {
            dueDate = customDate;
        }
    }
    
    // Get time
    dueTime = document.getElementById('custom-time').value;
    
    let listId = document.getElementById('list-select').value;
    if (!listId) {
        listId = state.uncategorizedListId;
    }
    
    if (state.editingTask) {
        // Update existing task
        taskManager.updateTask(state.editingTask.id, {
            name: taskName,
            icon,
            dueDate,
            dueTime,
            listId
        });
    } else {
        // Create new task
        taskManager.createTask({
            name: taskName,
            icon,
            dueDate,
            dueTime,
            listId
        });
    }
    
    hideTaskModal();
    renderCurrentView();
}

// Save new list
export function saveList() {
    const listName = document.getElementById('list-name').value.trim();
    if (!listName) {
        alert('Please enter a list name');
        return;
    }
    
    const activeIconBtn = document.querySelector('.list-icon-btn.active');
    const icon = activeIconBtn ? activeIconBtn.dataset.icon : 'fa-list';
    
    try {
        listManager.createList(listName, icon);
        hideListModal();
        renderCurrentView();
        updateListSelect();
    } catch (e) {
        alert(e.message);
    }
}

// Update the list dropdown in the task modal
export function updateListSelect() {
    const listSelect = document.getElementById('list-select');
    listSelect.innerHTML = '';
    
    state.lists.forEach(list => {
        const option = document.createElement('option');
        option.value = list.id;
        option.textContent = list.name;
        listSelect.appendChild(option);
    });
}

// Hide all modals
export function hideModals() {
    elements.taskModal.classList.remove('active');
    elements.filterModal.classList.remove('active');
    elements.listModal.classList.remove('active');
    elements.historyModal.classList.remove('active');
}

// Hide filter modal
export function hideFilterModal() {
    elements.filterModal.classList.remove('active');
}

// Hide history modal
export function hideHistoryModal() {
    elements.historyModal.classList.remove('active');
}