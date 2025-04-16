// Drag and drop functionality
import { state } from './state.js';
import * as taskManager from './tasks.js';
import * as listManager from './lists.js';
import * as ui from './ui.js';

let isDragging = false;
let longPressTimer = null;
let startX, startY;
const LONG_PRESS_DURATION = 800; // ms
const DRAG_THRESHOLD = 10; // px

// Capture references to DOM elements that might be needed for drag operations
const elements = {
    listView: null,
    dateView: null,
    deleteBtn: null,
    taskModal: null
};

// Initialize drag functionality
export function init(domElements) {
    elements.listView = domElements.listView;
    elements.dateView = domElements.dateView;
    elements.deleteBtn = domElements.deleteBtn;
    elements.taskModal = domElements.taskModal;

    // Set up Sortable for lists container
    setupListSortable();
    
    // Setup delete button as a drop target for tasks
    setupDeleteDropTarget();
}

// Setup Sortable.js for lists
export function setupListSortable() {
    const listsContainer = document.getElementById('lists-container');
    if (listsContainer) {
        new Sortable(listsContainer, {
            animation: 150,
            handle: '.list-header',
            onEnd: function(evt) {
                const listIds = Array.from(listsContainer.children)
                    .map(listElement => listElement.dataset.listId);
                listManager.reorderLists(listIds);
            }
        });
    }
}

// Setup delete button as drop target
function setupDeleteDropTarget() {
    if (elements.deleteBtn) {
        elements.deleteBtn.addEventListener('dragover', (e) => {
            e.preventDefault();
            elements.deleteBtn.classList.add('drag-over');
        });
        
        elements.deleteBtn.addEventListener('dragleave', () => {
            elements.deleteBtn.classList.remove('drag-over');
        });
        
        elements.deleteBtn.addEventListener('drop', (e) => {
            e.preventDefault();
            const taskId = e.dataTransfer.getData('text/plain');
            if (taskId) {
                taskManager.deleteTask(taskId);
                ui.renderCurrentView();
            }
            elements.deleteBtn.classList.remove('drag-over');
        });
    }
}

// Setup Sortable.js for tasks within a list
export function setupTaskSortable(listElement) {
    const tasksContainer = listElement.querySelector('.tasks');
    if (tasksContainer) {
        new Sortable(tasksContainer, {
            group: 'tasks',
            animation: 150,
            onStart: function(evt) {
                // Show delete button with a trash indicator
                elements.deleteBtn.classList.add('drop-target');
                
                // Set data transfer to use with native drop events
                evt.item.setAttribute('draggable', 'true');
                evt.item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', evt.item.dataset.taskId);
                }, { once: true });
            },
            onMove: function(evt) {
                // If dragging over a collapsed list, expand it
                const targetList = evt.to.closest('.list');
                if (targetList) {
                    const tasksContainer = targetList.querySelector('.tasks');
                    if (tasksContainer && tasksContainer.style.display === 'none') {
                        // Expand the list
                        tasksContainer.style.display = 'flex';
                        const toggleBtn = targetList.querySelector('.list-toggle');
                        if (toggleBtn) {
                            toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
                        }
                    }
                }
                return true;
            },
            onEnd: function(evt) {
                // Hide delete button indicator
                elements.deleteBtn.classList.remove('drop-target');
                
                // Check if ended on delete button
                const deleteBtn = elements.deleteBtn;
                const deleteBtnRect = deleteBtn.getBoundingClientRect();
                const x = evt.originalEvent.clientX;
                const y = evt.originalEvent.clientY;
                
                if (x >= deleteBtnRect.left && x <= deleteBtnRect.right && 
                    y >= deleteBtnRect.top && y <= deleteBtnRect.bottom) {
                    // Delete the task
                    const taskId = evt.item.dataset.taskId;
                    taskManager.deleteTask(taskId);
                    ui.renderCurrentView();
                } else {
                    const taskId = evt.item.dataset.taskId;
                    const newListId = evt.to.closest('.list').dataset.listId;
                    
                    taskManager.moveTaskToList(taskId, newListId);
                    ui.renderCurrentView();
                }
            }
        });
    }
}

// Setup task dragging from create button
export function setupTaskCreateDragging(createTaskBtn) {
    createTaskBtn.addEventListener('mousedown', handleTaskDragStart);
    createTaskBtn.addEventListener('touchstart', handleTaskDragStart, {passive: false});

    function handleTaskDragStart(e) {
        // Only allow dragging if we have an icon selected
        const activeIconBtn = document.querySelector('.icon-btn.active');
        if (!activeIconBtn) return;

        const taskName = document.getElementById('task-name').value.trim();
        const icon = activeIconBtn.dataset.icon || 'fa-tasks';

        // Create phantom element for dragging
        const phantom = document.createElement('div');
        phantom.className = 'task phantom-task';
        phantom.style.position = 'absolute';
        phantom.style.zIndex = 1000;
        phantom.style.opacity = 0.8;
        phantom.style.pointerEvents = 'none';

        // Set position and content
        phantom.innerHTML = `
            <div class="task-icon"><i class="fas ${icon}"></i></div>
            <div class="task-text">${taskName}</div>
        `;

        // Insert phantom element into document
        document.body.appendChild(phantom);

        // Initial position
        const startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
        const startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
        
        let currentX = startX;
        let currentY = startY;
        
        // Calculate offsets
        const rect = createTaskBtn.getBoundingClientRect();
        const offsetX = startX - rect.left;
        const offsetY = startY - rect.top;

        // Minimize the task modal to show more of the lists
        elements.taskModal.style.display = 'block';
        elements.taskModal.classList.remove('expanded');
        elements.taskModal.classList.add('minimized');
        
        // Update phantom position
        function updatePhantomPosition(x, y) {
            phantom.style.left = `${x - offsetX}px`;
            phantom.style.top = `${y - offsetY}px`;
            currentX = x;
            currentY = y;
        }
        
        updatePhantomPosition(startX, startY);

        // Handle drag move
        function handleTaskDragMove(e) {
            e.preventDefault();
            const x = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
            const y = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
            updatePhantomPosition(x, y);
            
            // Highlight delete button if dragging over it
            const deleteBtn = elements.deleteBtn;
            const deleteBtnRect = deleteBtn.getBoundingClientRect();
            if (x >= deleteBtnRect.left && x <= deleteBtnRect.right && 
                y >= deleteBtnRect.top && y <= deleteBtnRect.bottom) {
                deleteBtn.classList.add('drag-over');
            } else {
                deleteBtn.classList.remove('drag-over');
            }
            
            // Check if dragging over a collapsed list to expand it
            const lists = document.querySelectorAll('.list');
            lists.forEach(list => {
                const rect = list.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right && 
                    y >= rect.top && y <= rect.bottom) {
                    const tasksContainer = list.querySelector('.tasks');
                    if (tasksContainer && tasksContainer.style.display === 'none') {
                        // Expand the list
                        tasksContainer.style.display = 'flex';
                        const toggleBtn = list.querySelector('.list-toggle');
                        if (toggleBtn) {
                            toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
                        }
                    }
                }
            });
        }

        // Handle drag end
        function handleTaskDragEnd(e) {
            document.removeEventListener('mousemove', handleTaskDragMove);
            document.removeEventListener('touchmove', handleTaskDragMove);
            document.removeEventListener('mouseup', handleTaskDragEnd);
            document.removeEventListener('touchend', handleTaskDragEnd);

            // Remove minimized class from task modal
            elements.taskModal.classList.remove('minimized');

            // Check if we're over the delete button
            const deleteBtn = elements.deleteBtn;
            const deleteBtnRect = deleteBtn.getBoundingClientRect();
            if (currentX >= deleteBtnRect.left && currentX <= deleteBtnRect.right && 
                currentY >= deleteBtnRect.top && currentY <= deleteBtnRect.bottom) {
                // Don't create the task as it was "deleted" during creation
                deleteBtn.classList.remove('drag-over');
                ui.hideTaskModal();
                document.body.removeChild(phantom);
                return;
            }
            
            // Check if we're over a list
            const lists = document.querySelectorAll('.list');
            let targetList = null;

            lists.forEach(list => {
                const rect = list.getBoundingClientRect();
                if (currentX >= rect.left && currentX <= rect.right && 
                    currentY >= rect.top && currentY <= rect.bottom) {
                    targetList = list;
                }
            });
            
            // Check if we're over a date group in date view
            const dateGroups = document.querySelectorAll('.date-group');
            let targetDateGroup = null;
            
            if (state.currentView === 'date') {
                dateGroups.forEach(group => {
                    const rect = group.getBoundingClientRect();
                    if (currentX >= rect.left && currentX <= rect.right && 
                        currentY >= rect.top && currentY <= rect.bottom) {
                        targetDateGroup = group;
                    }
                });
            }

            // Create task in the target list or with target date
            if (targetList) {
                const listId = targetList.dataset.listId;
                ui.createTaskInList(listId);
            } else if (targetDateGroup) {
                // Extract date from heading
                const dateHeading = targetDateGroup.querySelector('.date-heading').textContent;
                ui.createTaskWithDate(dateHeading);
            } else {
                // Default to first list if not dragged to a specific list
                ui.createTaskFromModal();
            }

            // Remove phantom element
            document.body.removeChild(phantom);
            deleteBtn.classList.remove('drag-over');
        }

        // Add event listeners for dragging
        document.addEventListener('mousemove', handleTaskDragMove);
        document.addEventListener('touchmove', handleTaskDragMove, {passive: false});
        document.addEventListener('mouseup', handleTaskDragEnd);
        document.addEventListener('touchend', handleTaskDragEnd);
    }
}

// Setup task item touch handling (click, long press, drag)
export function setupTaskTouchHandling(taskElement, task) {
    let dragStarted = false;
    
    // Touch/click events
    taskElement.addEventListener('mousedown', handleTaskTouchStart);
    taskElement.addEventListener('touchstart', handleTaskTouchStart, {passive: false});
    
    // Add explicit icon click handler for touch devices
    const taskIcon = taskElement.querySelector('.task-icon');
    if (taskIcon) {
        taskIcon.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            e.preventDefault();
            taskManager.toggleTaskCompletion(task.id);
            ui.renderCurrentView();
        }, {passive: false});
    }
    
    function handleTaskTouchStart(e) {
        if (e.type === 'touchstart') e.preventDefault();
        
        const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
        const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
        startX = clientX;
        startY = clientY;
        dragStarted = false;
        isDragging = false;
        
        // Start long press timer for editing
        longPressTimer = setTimeout(() => {
            if (!dragStarted) {
                ui.showTaskModal(task);
            }
        }, LONG_PRESS_DURATION);
        
        document.addEventListener('mousemove', handleTaskTouchMove);
        document.addEventListener('touchmove', handleTaskTouchMove, {passive: false});
        document.addEventListener('mouseup', handleTaskTouchEnd);
        document.addEventListener('touchend', handleTaskTouchEnd);
    }
    
    function handleTaskTouchMove(e) {
        e.preventDefault();
        
        const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
        
        // Check if we've moved enough to consider it a drag
        const deltaX = Math.abs(clientX - startX);
        const deltaY = Math.abs(clientY - startY);
        
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
            dragStarted = true;
            clearTimeout(longPressTimer);
        }
    }
    
    function handleTaskTouchEnd(e) {
        clearTimeout(longPressTimer);
        document.removeEventListener('mousemove', handleTaskTouchMove);
        document.removeEventListener('touchmove', handleTaskTouchMove);
        document.removeEventListener('mouseup', handleTaskTouchEnd);
        document.removeEventListener('touchend', handleTaskTouchEnd);
        
        if (!dragStarted) {
            // It was a click/tap, not a drag
            taskElement.classList.toggle('show-date');
        }
    }
    
    // Right-click for edit on desktop
    taskElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        ui.showTaskModal(task);
    });
}

// Setup date view drag and drop
export function setupDateViewDragDrop() {
    const dateGroups = document.querySelectorAll('.date-group .tasks');
    
    dateGroups.forEach(tasksContainer => {
        if (tasksContainer) {
            new Sortable(tasksContainer, {
                group: 'tasks',
                animation: 150,
                onStart: function(evt) {
                    // Show delete button with a trash indicator
                    elements.deleteBtn.classList.add('drop-target');
                },
                onEnd: function(evt) {
                    // Hide delete button indicator
                    elements.deleteBtn.classList.remove('drop-target');
                    
                    // Get task ID
                    const taskId = evt.item.dataset.taskId;
                    
                    // Check if ended over delete button
                    const deleteBtn = elements.deleteBtn;
                    const deleteBtnRect = deleteBtn.getBoundingClientRect();
                    const x = evt.originalEvent.clientX;
                    const y = evt.originalEvent.clientY;
                    
                    if (x >= deleteBtnRect.left && x <= deleteBtnRect.right && 
                        y >= deleteBtnRect.top && y <= deleteBtnRect.bottom) {
                        // Delete task
                        taskManager.deleteTask(taskId);
                    } else {
                        // Get the new date from the group heading
                        const dateGroup = evt.to.closest('.date-group');
                        if (dateGroup) {
                            const dateHeading = dateGroup.querySelector('.date-heading');
                            if (dateHeading) {
                                const dateText = dateHeading.textContent;
                                
                                // Update task due date
                                const task = state.tasks.find(t => t.id === taskId);
                                if (task) {
                                    let newDueDate = null;
                                    
                                    if (dateText === 'Today') {
                                        newDueDate = new Date().toISOString().split('T')[0];
                                    } else if (dateText === 'Tomorrow') {
                                        const tomorrow = new Date();
                                        tomorrow.setDate(tomorrow.getDate() + 1);
                                        newDueDate = tomorrow.toISOString().split('T')[0];
                                    } else if (dateText === 'No Due Date') {
                                        newDueDate = null;
                                    } else {
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
                                            newDueDate = dateObj.toISOString().split('T')[0];
                                        } catch (e) {
                                            console.error('Error parsing date', e);
                                        }
                                    }
                                    
                                    // Update the task with new due date
                                    taskManager.updateTask(taskId, { dueDate: newDueDate });
                                }
                            }
                        }
                    }
                    
                    ui.renderCurrentView();
                }
            });
        }
    });
}

// Functions that need implementation in ui.js
function createTaskInList(listId) {
    // This will be defined in ui.js
}

function createTaskFromModal() {
    // This will be defined in ui.js
}