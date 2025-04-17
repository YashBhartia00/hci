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
    
    // Position create task button next to icons
    positionCreateTaskButton();
}

// Position the create task button beside the icon grid
function positionCreateTaskButton() {
    const iconGrid = document.querySelector('.icon-grid');
    const createTaskBtn = document.getElementById('create-task');
    
    if (iconGrid && createTaskBtn) {
        // Make the button inline with the icon grid
        iconGrid.style.display = 'inline-block';
        iconGrid.style.width = 'calc(100% - 150px)';
        
        createTaskBtn.style.display = 'inline-block';
        createTaskBtn.style.verticalAlign = 'top';
        createTaskBtn.style.width = '140px';
        createTaskBtn.style.marginLeft = '10px';
        createTaskBtn.style.height = '100%';
    }
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
        
        // Only snap to two positions: compact or expanded
        const threshold = window.innerHeight * 0.3; // 30% of viewport height
        
        if (diffY > threshold) {
            // Expanded mode
            modal.classList.add('expanded');
            modalContent.style.height = '75vh';
        } else {
            // Compact mode
            modal.classList.remove('expanded');
            modalContent.style.height = 'auto';
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
        listElement.className = 'list card mb-4';
        listElement.dataset.listId = list.id;
        
        // Create list header
        const listHeader = document.createElement('div');
        listHeader.className = 'list-header card-header py-3';
        
        // Add list icon
        const listIcon = document.createElement('span');
        listIcon.className = 'list-icon icon is-small mr-2';
        listIcon.innerHTML = `<i class="fas ${list.icon || 'fa-list'}"></i>`;
        
        const listTitle = document.createElement('p');
        listTitle.className = 'list-title card-header-title p-0 is-flex-grow-1';
        listTitle.textContent = list.name;
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'list-toggle card-header-icon p-0';
        toggleBtn.innerHTML = '<span class="icon"><i class="fas fa-chevron-down"></i></span>';
        
        listHeader.appendChild(listIcon);
        listHeader.appendChild(listTitle);
        listHeader.appendChild(toggleBtn);
        listElement.appendChild(listHeader);
        
        // Create tasks container
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'tasks card-content p-3 is-flex is-flex-wrap-wrap';
        
        // Filter tasks for this list
        const listTasks = taskManager.getFilteredTasks().filter(task => task.listId === list.id);
        
        // For entire list header click to toggle
        listHeader.addEventListener('click', () => {
            tasksContainer.style.display = tasksContainer.style.display === 'none' ? 'flex' : 'none';
            toggleBtn.innerHTML = tasksContainer.style.display === 'none' ? 
                '<span class="icon"><i class="fas fa-chevron-down"></i></span>' : 
                '<span class="icon"><i class="fas fa-chevron-up"></i></span>';
        });
        
        if (listTasks.length === 0) {
            const emptyMessage = createEmptyStateMessage('No tasks in this list');
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
        dateGroup.className = 'date-group mb-5';
        
        // Create date heading
        const dateHeading = document.createElement('div');
        dateHeading.className = 'date-heading has-background-white is-size-6 has-text-weight-semibold';
        
        let dateText;
        let tagClass = '';
        if (dateKey === 'no-date') {
            dateText = 'No Due Date';
            tagClass = 'has-text-grey';
        } else if (utils.isToday(new Date(dateKey))) {
            dateText = 'Today';
            tagClass = 'has-text-danger';
        } else if (utils.isTomorrow(new Date(dateKey))) {
            dateText = 'Tomorrow';
            tagClass = 'has-text-warning';
        } else {
            dateText = utils.formatDate(new Date(dateKey));
            tagClass = 'has-text-info';
        }
        
        dateHeading.innerHTML = `<span class="${tagClass}">${dateText}</span>`;
        dateGroup.appendChild(dateHeading);
        
        // Create tasks container
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'tasks date-view-tasks';
        
        // Add tasks to the container
        if (tasks.length === 0) {
            const emptyMessage = createEmptyStateMessage('No tasks due on this date');
            tasksContainer.appendChild(emptyMessage);
        } else {
            tasks.forEach(task => {
                const taskElement = createDateViewTaskElement(task);
                tasksContainer.appendChild(taskElement);
            });
        }
        
        dateGroup.appendChild(tasksContainer);
        elements.dateGroupsContainer.appendChild(dateGroup);
    }
    
    // Setup drag and drop for date view
    drag.setupDateViewDragDrop();
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
    const taskIcon = document.createElement('span');
    taskIcon.className = 'task-icon icon';
    taskIcon.innerHTML = `<i class="fas ${task.icon || 'fa-tasks'}"></i>`;
    
    // Icon click toggles completion
    taskIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        taskManager.toggleTaskCompletion(task.id);
        renderCurrentView();
    });
    
    // Task text
    const taskText = document.createElement('span');
    taskText.className = 'task-text';
    taskText.textContent = task.name;
    
    // Task date/time display (initially hidden)
    const taskDate = document.createElement('div');
    taskDate.className = 'task-date tags';
    
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
        
        taskDate.innerHTML = `<span class="date-tag tag ${utils.getDateColorClass(task.dueDate)}">${dateDisplay}</span>`;
    } else {
        taskDate.innerHTML = '<span class="date-tag tag no-date">No Date</span>';
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
    taskElement.className = 'task date-view-task box p-3';
    taskElement.dataset.taskId = task.id;
    
    // List label with tag
    const listLabel = document.createElement('div');
    listLabel.className = 'task-list-label mb-1';
    const list = listManager.getListById(task.listId);
    
    const listTag = document.createElement('span');
    listTag.className = 'tag is-light is-small';
    listTag.innerHTML = `<span class="icon is-small"><i class="fas ${list?.icon || 'fa-list'}"></i></span>
                        <span>${list ? list.name : 'Unknown List'}</span>`;
    listLabel.appendChild(listTag);
    
    // Task content
    const taskContent = document.createElement('div');
    taskContent.className = 'task-content is-flex is-align-items-center';
    
    // Task icon
    const taskIcon = document.createElement('div');
    taskIcon.className = 'task-icon date-view-icon icon is-medium';
    taskIcon.innerHTML = `<i class="fas ${task.icon || 'fa-tasks'}"></i>`;
    
    // Icon click toggles completion
    taskIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        taskManager.toggleTaskCompletion(task.id);
        renderCurrentView();
    });
    
    // Task info container
    const taskInfo = document.createElement('div');
    taskInfo.className = 'task-info is-flex-grow-1 ml-2';
    
    // Task text
    const taskText = document.createElement('div');
    taskText.className = 'task-text';
    taskText.textContent = task.name;
    
    // Task time
    const taskTime = document.createElement('div');
    taskTime.className = 'task-time has-text-grey is-size-7';
    if (task.dueTime) {
        taskTime.innerHTML = `<span class="icon is-small mr-1"><i class="fas fa-clock"></i></span>${task.dueTime}`;
    }
    
    taskInfo.appendChild(taskText);
    
    taskContent.appendChild(taskIcon);
    taskContent.appendChild(taskInfo);
    taskContent.appendChild(taskTime);
    
    taskElement.appendChild(listLabel);
    taskElement.appendChild(taskContent);
    
    // Set up touch handling for this task
    drag.setupTaskTouchHandling(taskElement, task);
    
    return taskElement;
}

// Show task creation/editing modal
export function showTaskModal(task = null) {
    const modal = elements.taskModal;
    modal.classList.add('active');
    modal.classList.remove('expanded');
    modal.classList.remove('minimized');
    
    // Make main content visible but modified to accommodate the task panel
    document.querySelector('.app-container').classList.add('modal-active');
    
    // Remove forced fixed positioning
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.position = ''; // removed fixed
    modalContent.style.bottom = '';
    modalContent.style.left = '';
    modalContent.style.width = '';
    modalContent.style.maxHeight = ''; // remove forced 50vh
    modalContent.style.transform = 'none';
    modalContent.style.zIndex = '50';
    
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
    
    // Remove inline styles that forced icon grid to be inline
    const iconGrid = document.querySelector('.icon-grid');
    if (iconGrid) {
        iconGrid.style.display = '';
        iconGrid.style.width = '';
        iconGrid.style.verticalAlign = '';
    }
    
    if (createTaskBtn) {
        createTaskBtn.style.display = '';
        createTaskBtn.style.width = '';
        createTaskBtn.style.height = '';
    }
    
    // Show date and time selectors by default
    const expandedOptions = document.querySelector('.expanded-options');
    if (expandedOptions) {
        expandedOptions.style.display = 'block';
        expandedOptions.style.opacity = '1';
        expandedOptions.style.marginTop = '15px';
    }
    
    if (task) {
        // Editing existing task
        modalTitle.textContent = 'Edit Task';
        nameInput.value = task.name;
        
        // Hide create button, show save button
        createTaskBtn.style.display = 'none';
        saveTaskBtn.style.display = 'inline-block';
        
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
        createTaskBtn.style.display = 'inline-block';
        saveTaskBtn.style.display = 'none';
        
        // Set default list to first list (or uncategorized)
        listSelect.value = state.lists.length > 0 ? 
            (state.lists[0].id !== state.uncategorizedListId ? state.lists[0].id : state.uncategorizedListId) : 
            state.uncategorizedListId;
        
        state.editingTask = null;
    }
    
    // Ensure the cancel button is visible
    const cancelBtn = document.getElementById('cancel-task');
    if (cancelBtn) {
        cancelBtn.style.display = 'inline-block';
    }
    
    // Focus on the name input
    setTimeout(() => nameInput.focus(), 300);
}

// Hide task modal
export function hideTaskModal() {
    elements.taskModal.classList.remove('active');
    document.querySelector('.app-container').classList.remove('modal-active');
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
        option.className = 'list-filter-option field';
        
        const control = document.createElement('div');
        control.className = 'control';
        
        const label = document.createElement('label');
        label.className = 'checkbox';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `filter-list-${list.id}`;
        checkbox.value = list.id;
        checkbox.className = 'mr-2';
        checkbox.checked = state.filters.lists.includes(list.id);
        
        const labelIcon = document.createElement('span');
        labelIcon.className = 'icon is-small mr-1';
        labelIcon.innerHTML = `<i class="fas ${list.icon || 'fa-list'}"></i>`;
        
        const labelText = document.createTextNode(list.name);
        
        label.appendChild(checkbox);
        label.appendChild(labelIcon);
        label.appendChild(labelText);
        
        control.appendChild(label);
        option.appendChild(control);
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
        elements.deletedTasksContainer.innerHTML = '<p class="has-text-centered has-text-grey is-italic py-4">No deleted tasks</p>';
        return;
    }
    
    state.deletedTasks.forEach(task => {
        const deletedTaskElement = document.createElement('div');
        deletedTaskElement.className = 'deleted-task media py-2 px-3';
        
        const taskInfo = document.createElement('div');
        taskInfo.className = 'media-left';
        
        const taskIcon = document.createElement('span');
        taskIcon.className = 'icon';
        taskIcon.innerHTML = `<i class="fas ${task.icon || 'fa-tasks'}"></i>`;
        
        taskInfo.appendChild(taskIcon);
        
        const taskContent = document.createElement('div');
        taskContent.className = 'media-content';
        
        const taskName = document.createElement('p');
        taskName.className = 'is-size-6';
        taskName.textContent = task.name;
        
        taskContent.appendChild(taskName);
        
        const taskActions = document.createElement('div');
        taskActions.className = 'media-right buttons are-small';
        
        const restoreButton = document.createElement('button');
        restoreButton.className = 'button is-primary is-small is-light';
        restoreButton.innerHTML = '<span class="icon is-small"><i class="fas fa-undo"></i></span><span>Restore</span>';
        restoreButton.addEventListener('click', () => {
            taskManager.restoreTask(task.id);
            showHistoryModal(); // Refresh the modal
        });
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'button is-danger is-small is-light';
        deleteButton.innerHTML = '<span class="icon is-small"><i class="fas fa-trash"></i></span><span>Delete</span>';
        deleteButton.addEventListener('click', () => {
            taskManager.permanentlyDeleteTask(task.id);
            showHistoryModal(); // Refresh the modal
        });
        
        taskActions.appendChild(restoreButton);
        taskActions.appendChild(deleteButton);
        
        deletedTaskElement.appendChild(taskInfo);
        deletedTaskElement.appendChild(taskContent);
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
    if (!taskName) {
        // Show validation error using Bulma's notification
        const notification = document.createElement('div');
        notification.className = 'notification is-danger is-light';
        notification.innerHTML = '<button class="delete"></button><p>Please enter a task name.</p>';
        
        document.querySelector('.task-modal-content').insertBefore(
            notification, 
            document.querySelector('#task-name').parentNode.parentNode.nextSibling
        );
        
        // Add close button functionality
        notification.querySelector('.delete').addEventListener('click', function() {
            notification.remove();
        });
        
        // Auto close after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
        
        return;
    }
    
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
        } else if (activeDateBtn.dataset.date === 'custom') {
            const customDate = document.getElementById('custom-date').value;
            if (customDate) {
                dueDate = customDate;
            }
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

// Create task with specific date (from dragging to date view)
export function createTaskWithDate(dateText) {
    const taskName = document.getElementById('task-name').value.trim();
    const activeIconBtn = document.querySelector('.icon-btn.active');
    const icon = activeIconBtn ? activeIconBtn.dataset.icon : 'fa-tasks';
    
    // Get time
    const dueTime = document.getElementById('custom-time').value;
    
    // Use selected list, or default to Uncategorized
    let listId = document.getElementById('list-select').value;
    if (!listId) {
        listId = state.uncategorizedListId;
    }
    
    // Convert date text to actual date
    let dueDate = null;
    if (dateText === 'Today') {
        dueDate = new Date().toISOString().split('T')[0];
    } else if (dateText === 'Tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dueDate = tomorrow.toISOString().split('T')[0];
    } else if (dateText !== 'No Due Date') {
        // Try to parse the date
        try {
            const dateParts = dateText.split(' ');
            const monthName = dateParts[1];
            const day = parseInt(dateParts[2]);
            const year = new Date().getFullYear();
            
            const months = {
                'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };
            
            const dateObj = new Date(year, months[monthName], day);
            dueDate = dateObj.toISOString().split('T')[0];
        } catch (e) {
            console.error('Error parsing date', e);
        }
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

// Create empty state message with Bulma classes
function createEmptyStateMessage(message) {
    const container = document.createElement('div');
    container.className = 'has-text-centered py-4 is-flex-grow-1';
    
    const icon = document.createElement('span');
    icon.className = 'icon is-large has-text-grey-light mb-2';
    icon.innerHTML = '<i class="fas fa-tasks fa-2x"></i>';
    
    const text = document.createElement('p');
    text.className = 'has-text-grey is-italic';
    text.textContent = message;
    
    container.appendChild(icon);
    container.appendChild(text);
    
    return container;
}