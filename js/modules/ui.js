// UI-related functionality
import { state } from './state.js';
import * as taskManager from './tasks.js';
import * as listManager from './lists.js';
import * as utils from './utils.js';
import * as drag from './drag.js';


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


export function initUI(domElements) {
    
    Object.assign(elements, domElements);
    
    
    setupModalDrag();
    
    
    drag.setupTaskCreateDragging(elements.createTaskBtn);
    
    
    positionCreateTaskButton();
}


function positionCreateTaskButton() {
    const iconGrid = document.querySelector('.icon-grid');
    const createTaskBtn = document.getElementById('create-task');
    
    if (iconGrid && createTaskBtn) {
        
        iconGrid.style.display = 'inline-block';
        iconGrid.style.width = 'calc(100% - 150px)';
        
        createTaskBtn.style.display = 'inline-block';
        createTaskBtn.style.verticalAlign = 'top';
        createTaskBtn.style.width = '140px';
        createTaskBtn.style.marginLeft = '10px';
        createTaskBtn.style.height = '100%';
    }
}


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
        
        
        const threshold = window.innerHeight * 0.3; 
        
        if (diffY > threshold) {
            
            modal.classList.add('expanded');
            modalContent.style.height = '75vh';
        } else {
            
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


export function renderCurrentView() {
    if (state.currentView === 'list') {
        renderListView();
    } else {
        renderDateView();
    }
}


export function renderListView() {
    elements.listsContainer.innerHTML = '';
    
    state.lists.forEach(list => {
        
        const listElement = document.createElement('div');
        listElement.className = 'list';
        listElement.dataset.listId = list.id;
        
        
        const listHeader = document.createElement('div');
        listHeader.className = 'list-header';
        
        
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
        
        
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'tasks';
        
        
        const listTasks = taskManager.getFilteredTasks().filter(task => task.listId === list.id);
        
        
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
            
            
            tasksContainer.style.display = 'none';
        } else {
            listTasks.forEach(task => {
                const taskElement = createTaskElement(task);
                tasksContainer.appendChild(taskElement);
            });
        }
        
        listElement.appendChild(tasksContainer);
        elements.listsContainer.appendChild(listElement);
        
        
        drag.setupTaskSortable(listElement);
    });
}


export function renderDateView() {
    elements.dateGroupsContainer.innerHTML = '';
    
    
    const filteredTasks = taskManager.getFilteredTasks().filter(task => !task.completed);
    
    
    const groupedTasks = utils.groupTasksByDate(filteredTasks);
    
    
    for (const [dateKey, tasks] of Object.entries(groupedTasks)) {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        
        
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
        
        
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'tasks date-view-tasks';
        
        
        tasks.forEach(task => {
            const taskElement = createDateViewTaskElement(task);
            tasksContainer.appendChild(taskElement);
        });
        
        dateGroup.appendChild(tasksContainer);
        elements.dateGroupsContainer.appendChild(dateGroup);
    }
    
    
    drag.setupDateViewDragDrop();
}


export function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task';
    taskElement.dataset.taskId = task.id;
    
    
    if (task.dueDate) {
        const colorClass = utils.getDateColorClass(task.dueDate);
        taskElement.classList.add(colorClass);
    } else {
        taskElement.classList.add('no-date');
    }
    
    if (task.completed) {
        taskElement.classList.add('completed');
    }
    
    
    const taskIcon = document.createElement('div');
    taskIcon.className = 'task-icon';
    taskIcon.innerHTML = `<i class="fas ${task.icon || 'fa-tasks'}"></i>`;
    
    
    taskIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        
        
        const updatedTask = taskManager.toggleTaskCompletion(task.id);
        
        
        if (updatedTask) {
            const parentTask = taskIcon.closest('.task');
            if (updatedTask.completed) {
                parentTask.classList.add('completed');
            } else {
                parentTask.classList.remove('completed');
            }
            
            
            parentTask.classList.add('just-completed');
            setTimeout(() => {
                parentTask.classList.remove('just-completed');
                
                renderCurrentView();
            }, 300);
        } else {
            
            renderCurrentView();
        }
    });
    
    
    const taskText = document.createElement('div');
    taskText.className = 'task-text';
    taskText.textContent = task.name;
    
    
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
    
    
    drag.setupTaskTouchHandling(taskElement, task);
    
    return taskElement;
}


export function createDateViewTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task date-view-task';
    taskElement.dataset.taskId = task.id;
    
    if (task.completed) {
        taskElement.classList.add('completed');
    }
    
    
    const taskRow = document.createElement('div');
    taskRow.className = 'date-view-task-row';
    
    
    const listLabel = document.createElement('div');
    listLabel.className = 'task-list-label';
    const list = listManager.getListById(task.listId);
    listLabel.textContent = list ? list.name : 'Unknown List';
    
    
    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';
    
    
    const taskIcon = document.createElement('div');
    taskIcon.className = 'task-icon date-view-icon';
    taskIcon.innerHTML = `<i class="fas ${task.icon || 'fa-tasks'}"></i>`;
    
    
    taskIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        
        
        const updatedTask = taskManager.toggleTaskCompletion(task.id);
        
        
        if (updatedTask) {
            const parentTask = taskIcon.closest('.task');
            if (updatedTask.completed) {
                parentTask.classList.add('completed');
            } else {
                parentTask.classList.remove('completed');
            }
            
            
            parentTask.classList.add('just-completed');
            setTimeout(() => {
                parentTask.classList.remove('just-completed');
                
                renderCurrentView();
            }, 300);
        } else {
            
            renderCurrentView();
        }
    });
    
    
    const taskInfo = document.createElement('div');
    taskInfo.className = 'task-info';
    
    
    const taskText = document.createElement('div');
    taskText.className = 'task-text';
    taskText.textContent = task.name;
    
    
    const taskTime = document.createElement('div');
    taskTime.className = 'task-time';
    if (task.dueTime) {
        taskTime.textContent = task.dueTime;
    }
    
    taskInfo.appendChild(taskText);
    
    taskContent.appendChild(taskIcon);
    taskContent.appendChild(taskInfo);
    taskContent.appendChild(taskTime);
    
    taskElement.appendChild(listLabel);
    taskElement.appendChild(taskContent);
    
    
    drag.setupTaskTouchHandling(taskElement, task);
    
    return taskElement;
}


export function showTaskModal(task = null) {
    const modal = elements.taskModal;
    modal.classList.add('active');
    modal.classList.remove('expanded');
    modal.classList.remove('minimized');
    
    
    document.querySelector('.app-container').classList.add('modal-active');
    
    
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.position = ''; 
    modalContent.style.bottom = '';
    modalContent.style.left = '';
    modalContent.style.width = '';
    modalContent.style.maxHeight = ''; 
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
    
    
    iconButtons.forEach(btn => btn.classList.remove('active'));
    dateButtons.forEach(btn => btn.classList.remove('active'));
    
    
    document.querySelector('.icon-btn[data-icon="fa-tasks"]')?.classList.add('active');
    document.querySelector('.date-btn[data-date="no-date"]')?.classList.add('active');
    
    
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
    
    
    const expandedOptions = document.querySelector('.expanded-options');
    if (expandedOptions) {
        expandedOptions.style.display = 'block';
        expandedOptions.style.opacity = '1';
        expandedOptions.style.marginTop = '15px';
    }
    
    if (task) {
        
        modalTitle.textContent = 'Edit Task';
        nameInput.value = task.name;
        
        
        createTaskBtn.style.display = 'none';
        saveTaskBtn.style.display = 'inline-block';
        
        
        const iconBtn = document.querySelector(`.icon-btn[data-icon="${task.icon}"]`);
        if (iconBtn) {
            iconBtn.classList.add('active');
        }
        
        
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
        
        
        if (task.dueTime) {
            customTimeInput.value = task.dueTime;
        } else {
            customTimeInput.value = '';
        }
        
        
        listSelect.value = task.listId;
        
        state.editingTask = task;
    } else {
        
        modalTitle.textContent = 'New Task';
        nameInput.value = '';
        customDateInput.value = '';
        customTimeInput.value = '';
        
        
        createTaskBtn.style.display = 'inline-block';
        saveTaskBtn.style.display = 'none';
        
        
        listSelect.value = state.lists.length > 0 ? 
            (state.lists[0].id !== state.uncategorizedListId ? state.lists[0].id : state.uncategorizedListId) : 
            state.uncategorizedListId;
        
        state.editingTask = null;
    }
    
    
    const cancelBtn = document.getElementById('cancel-task');
    if (cancelBtn) {
        cancelBtn.style.display = 'inline-block';
    }
    
    
    setTimeout(() => nameInput.focus(), 300);
}


export function hideTaskModal() {
    elements.taskModal.classList.remove('active');
    document.querySelector('.app-container').classList.remove('modal-active');
    state.editingTask = null;
}


export function showListModal() {
    elements.listModal.classList.add('active');
    document.getElementById('list-name').value = '';
    
    
    const listIconButtons = document.querySelectorAll('.list-icon-btn');
    listIconButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector('.list-icon-btn[data-icon="fa-list"]')?.classList.add('active');
    
    setTimeout(() => document.getElementById('list-name').focus(), 300);
}


export function hideListModal() {
    elements.listModal.classList.remove('active');
}


export function showFilterModal() {
    elements.filterModal.classList.add('active');
    
    
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
    
    
    document.getElementById('keyword-filter').value = state.filters.keyword;
    
    
    document.querySelectorAll('.date-filter-btn').forEach(btn => {
        btn.classList.toggle('active', state.filters.dates.includes(btn.dataset.filter));
    });
}


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
            showHistoryModal(); 
        });
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.style.color = '#ef4444';
        deleteButton.addEventListener('click', () => {
            taskManager.permanentlyDeleteTask(task.id);
            showHistoryModal(); 
        });
        
        taskActions.appendChild(restoreButton);
        taskActions.appendChild(deleteButton);
        
        deletedTaskElement.appendChild(taskInfo);
        deletedTaskElement.appendChild(taskActions);
        
        elements.deletedTasksContainer.appendChild(deletedTaskElement);
    });
}


export function applyFilters() {
    
    state.filters.keyword = document.getElementById('keyword-filter').value.trim().toLowerCase();
    
    
    state.filters.dates = [];
    document.querySelectorAll('.date-filter-btn.active').forEach(btn => {
        state.filters.dates.push(btn.dataset.filter);
    });
    
    
    state.filters.lists = [];
    document.querySelectorAll('#list-filter-options input[type="checkbox"]:checked').forEach(cb => {
        state.filters.lists.push(cb.value);
    });
    
    
    hideModals();
    
    
    renderCurrentView();
}


export function resetFilters() {
    state.filters.keyword = '';
    state.filters.dates = [];
    state.filters.lists = [];
    
    
    document.getElementById('keyword-filter').value = '';
    
    document.querySelectorAll('.date-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('#list-filter-options input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    
    hideModals();
    renderCurrentView();
}


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
    
    
    dueTime = document.getElementById('custom-time').value;
    
    
    let listId = document.getElementById('list-select').value;
    if (!listId) {
        listId = state.uncategorizedListId;
    }
    
    
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


export function createTaskInList(listId) {
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

    
    dueTime = document.getElementById('custom-time').value;
    
    
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


export function createTaskWithDate(dateText) {
    const taskName = document.getElementById('task-name').value.trim();
    const activeIconBtn = document.querySelector('.icon-btn.active');
    const icon = activeIconBtn ? activeIconBtn.dataset.icon : 'fa-tasks';
    
    
    const dueTime = document.getElementById('custom-time').value;
    
    
    let listId = document.getElementById('list-select').value;
    if (!listId) {
        listId = state.uncategorizedListId;
    }
    
    
    let dueDate = null;
    if (dateText === 'Today') {
        dueDate = new Date().toISOString().split('T')[0];
    } else if (dateText === 'Tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dueDate = tomorrow.toISOString().split('T')[0];
    } else if (dateText !== 'No Due Date') {
        
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
    
    
    dueTime = document.getElementById('custom-time').value;
    
    let listId = document.getElementById('list-select').value;
    if (!listId) {
        listId = state.uncategorizedListId;
    }
    
    if (state.editingTask) {
        
        taskManager.updateTask(state.editingTask.id, {
            name: taskName,
            icon,
            dueDate,
            dueTime,
            listId
        });
    } else {
        
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


export function hideModals() {
    elements.taskModal.classList.remove('active');
    elements.filterModal.classList.remove('active');
    elements.listModal.classList.remove('active');
    elements.historyModal.classList.remove('active');
}


export function hideFilterModal() {
    elements.filterModal.classList.remove('active');
}


export function hideHistoryModal() {
    elements.historyModal.classList.remove('active');
}