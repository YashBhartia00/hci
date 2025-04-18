// Drag and drop functionality
import { state } from './state.js';
import * as taskManager from './tasks.js';
import * as listManager from './lists.js';
import * as ui from './ui.js';

let isDragging = false;
let longPressTimer = null;
let startX, startY;
const LONG_PRESS_DURATION = 800; //ms
const DRAG_THRESHOLD = 10; //px


const elements = {
    listView: null,
    dateView: null,
    deleteBtn: null,
    taskModal: null
};


export function init(domElements) {
    elements.listView = domElements.listView;
    elements.dateView = domElements.dateView;
    elements.deleteBtn = domElements.deleteBtn;
    elements.taskModal = domElements.taskModal;

    
    setupListSortable();
    
    
    setupDeleteDropTarget();
}


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


export function setupTaskSortable(listElement) {
    const tasksContainer = listElement.querySelector('.tasks');
    if (tasksContainer) {
        new Sortable(tasksContainer, {
            group: 'tasks',
            animation: 150,
            onStart: function(evt) {
                
                elements.deleteBtn.classList.add('drop-target');
                
                
                evt.item.setAttribute('draggable', 'true');
                evt.item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', evt.item.dataset.taskId);
                }, { once: true });
            },
            onMove: function(evt) {
                
                const targetList = evt.to.closest('.list');
                if (targetList) {
                    const tasksContainer = targetList.querySelector('.tasks');
                    if (tasksContainer && tasksContainer.style.display === 'none') {
                        
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
                
                elements.deleteBtn.classList.remove('drop-target');
                
                
                const deleteBtn = elements.deleteBtn;
                const deleteBtnRect = deleteBtn.getBoundingClientRect();
                const x = evt.originalEvent.clientX;
                const y = evt.originalEvent.clientY;
                
                if (x >= deleteBtnRect.left && x <= deleteBtnRect.right && 
                    y >= deleteBtnRect.top && y <= deleteBtnRect.bottom) {
                    
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


export function setupTaskCreateDragging(createTaskBtn) {
    
    createTaskBtn.addEventListener('touchstart', handleTaskDragStart, {passive: false});

    function handleTaskDragStart(e) {
        e.preventDefault();
        
        
        const activeIconBtn = document.querySelector('.icon-btn.active');
        if (!activeIconBtn) return;

        const taskName = document.getElementById('task-name').value.trim();
        const icon = activeIconBtn.dataset.icon || 'fa-tasks';

        
        const phantom = document.createElement('div');
        phantom.className = 'task phantom-task';
        phantom.style.position = 'absolute';
        phantom.style.zIndex = 1000;
        phantom.style.opacity = 0.8;
        phantom.style.pointerEvents = 'none';
        phantom.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        phantom.style.transform = 'scale(1.05)';

        
        phantom.innerHTML = `
            <div class="task-icon"><i class="fas ${icon}"></i></div>
            <div class="task-text">${taskName}</div>
        `;

        
        document.body.appendChild(phantom);

        
        const startX = e.touches[0].clientX;
        const startY = e.touches[0].clientY;
        
        let currentX = startX;
        let currentY = startY;
        
        
        const rect = createTaskBtn.getBoundingClientRect();
        const offsetX = startX - rect.left;
        const offsetY = startY - rect.top;

        
        elements.taskModal.classList.add('minimized');
        
        
        function updatePhantomPosition(x, y) {
            phantom.style.left = `${x - offsetX}px`;
            phantom.style.top = `${y - offsetY}px`;
            currentX = x;
            currentY = y;
        }
        
        updatePhantomPosition(startX, startY);

        
        function handleTaskDragMove(e) {
            e.preventDefault();
            const x = e.touches[0].clientX;
            const y = e.touches[0].clientY;
            updatePhantomPosition(x, y);
            
            
            const deleteBtn = elements.deleteBtn;
            const deleteBtnRect = deleteBtn.getBoundingClientRect();
            if (x >= deleteBtnRect.left && x <= deleteBtnRect.right && 
                y >= deleteBtnRect.top && y <= deleteBtnRect.bottom) {
                deleteBtn.classList.add('drag-over');
            } else {
                deleteBtn.classList.remove('drag-over');
            }
            
            
            const lists = document.querySelectorAll('.list');
            lists.forEach(list => {
                const rect = list.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right && 
                    y >= rect.top && y <= rect.bottom) {
                    const tasksContainer = list.querySelector('.tasks');
                    if (tasksContainer && tasksContainer.style.display === 'none') {
                        
                        tasksContainer.style.display = 'flex';
                        const toggleBtn = list.querySelector('.list-toggle');
                        if (toggleBtn) {
                            toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
                        }
                    }
                }
            });
        }

        
        function handleTaskDragEnd(e) {
            document.removeEventListener('touchmove', handleTaskDragMove);
            document.removeEventListener('touchend', handleTaskDragEnd);

            
            elements.taskModal.classList.remove('minimized');

            
            const finalX = e.changedTouches[0].clientX;
            const finalY = e.changedTouches[0].clientY;
            
            
            const deleteBtn = elements.deleteBtn;
            const deleteBtnRect = deleteBtn.getBoundingClientRect();
            if (finalX >= deleteBtnRect.left && finalX <= deleteBtnRect.right && 
                finalY >= deleteBtnRect.top && finalY <= deleteBtnRect.bottom) {
                
                deleteBtn.classList.remove('drag-over');
                ui.hideTaskModal();
                document.body.removeChild(phantom);
                return;
            }
            
            
            const lists = document.querySelectorAll('.list');
            let targetList = null;

            lists.forEach(list => {
                const rect = list.getBoundingClientRect();
                if (finalX >= rect.left && finalX <= rect.right && 
                    finalY >= rect.top && finalY <= rect.bottom) {
                    targetList = list;
                }
            });
            
            
            const dateGroups = document.querySelectorAll('.date-group');
            let targetDateGroup = null;
            
            if (state.currentView === 'date') {
                dateGroups.forEach(group => {
                    const rect = group.getBoundingClientRect();
                    if (finalX >= rect.left && finalX <= rect.right && 
                        finalY >= rect.top && finalY <= rect.bottom) {
                        targetDateGroup = group;
                    }
                });
            }

            
            if (targetList) {
                const listId = targetList.dataset.listId;
                ui.createTaskInList(listId);
            } else if (targetDateGroup) {
                
                const dateHeading = targetDateGroup.querySelector('.date-heading').textContent;
                ui.createTaskWithDate(dateHeading);
            } else {
                
                ui.createTaskFromModal();
            }

            
            document.body.removeChild(phantom);
            deleteBtn.classList.remove('drag-over');
        }

        
        document.addEventListener('touchmove', handleTaskDragMove, {passive: false});
        document.addEventListener('touchend', handleTaskDragEnd);
    }
}


export function setupTaskTouchHandling(taskElement, task) {
    let dragStarted = false;
    let dragGhost = null;
    let touchStartTime = 0;
    let isDraggingFromIcon = false;
    
    
    taskElement.addEventListener('touchstart', handleTaskTouchStart, {passive: false});
    
    
    const taskIcon = taskElement.querySelector('.task-icon');
    if (taskIcon) {
        
        
        taskIcon.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            touchStartTime = Date.now();
            isDraggingFromIcon = true;
            
            
            
        }, {passive: false});
        
        
        taskIcon.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;
            
            
            
            if (touchDuration < 300 && !dragStarted && isDraggingFromIcon) {
                e.stopPropagation();
                e.preventDefault();
                taskManager.toggleTaskCompletion(task.id);
                ui.renderCurrentView();
            }
            
            isDraggingFromIcon = false;
        }, {passive: false});
    }
    
    function handleTaskTouchStart(e) {
        e.preventDefault();
        
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;
        startX = clientX;
        startY = clientY;
        dragStarted = false;
        isDragging = false;
        touchStartTime = Date.now();
        
        
        longPressTimer = setTimeout(() => {
            if (!dragStarted) {
                ui.showTaskModal(task);
            }
        }, LONG_PRESS_DURATION);
        
        document.addEventListener('touchmove', handleTaskTouchMove, {passive: false});
        document.addEventListener('touchend', handleTaskTouchEnd);
    }
    
    function handleTaskTouchMove(e) {
        e.preventDefault();
        
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;
        
        
        const deltaX = Math.abs(clientX - startX);
        const deltaY = Math.abs(clientY - startY);
        
        if ((deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) && !dragStarted) {
            dragStarted = true;
            clearTimeout(longPressTimer);
            
            
            dragGhost = taskElement.cloneNode(true);
            dragGhost.className = 'task dragging';
            dragGhost.style.position = 'absolute';
            dragGhost.style.zIndex = '1000';
            dragGhost.style.opacity = '0.7';
            dragGhost.style.width = `${taskElement.offsetWidth}px`;
            document.body.appendChild(dragGhost);
            
            
            taskElement.style.opacity = '0.4';
            
            
            elements.deleteBtn.classList.add('drop-target');
        }
        
        if (dragStarted && dragGhost) {
            
            dragGhost.style.left = `${clientX - 20}px`; 
            dragGhost.style.top = `${clientY - 30}px`;
            
            
            const deleteBtnRect = elements.deleteBtn.getBoundingClientRect();
            if (clientX >= deleteBtnRect.left && clientX <= deleteBtnRect.right && 
                clientY >= deleteBtnRect.top && clientY <= deleteBtnRect.bottom) {
                elements.deleteBtn.classList.add('drag-over');
            } else {
                elements.deleteBtn.classList.remove('drag-over');
            }
        }
    }
    
    function handleTaskTouchEnd(e) {
        clearTimeout(longPressTimer);
        document.removeEventListener('touchmove', handleTaskTouchMove);
        document.removeEventListener('touchend', handleTaskTouchEnd);
        
        if (dragStarted && dragGhost) {
            
            const finalX = e.changedTouches[0].clientX;
            const finalY = e.changedTouches[0].clientY;
            
            
            const deleteBtnRect = elements.deleteBtn.getBoundingClientRect();
            if (finalX >= deleteBtnRect.left && finalX <= deleteBtnRect.right && 
                finalY >= deleteBtnRect.top && finalY <= deleteBtnRect.bottom) {
                
                taskManager.deleteTask(task.id);
                ui.renderCurrentView();
            } else {
                
                handleTaskDrop(finalX, finalY, task);
            }
            
            
            document.body.removeChild(dragGhost);
            taskElement.style.opacity = '';
            elements.deleteBtn.classList.remove('drop-target');
            elements.deleteBtn.classList.remove('drag-over');
        } else if (!dragStarted) {
            
            if (!isDraggingFromIcon) { 
                taskElement.classList.toggle('show-date');
            }
        }
        
        isDraggingFromIcon = false;
    }
    
    function handleTaskDrop(x, y, task) {
        
        if (state.currentView === 'list') {
            const lists = document.querySelectorAll('.list');
            for (const list of lists) {
                const rect = list.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right && 
                    y >= rect.top && y <= rect.bottom) {
                    const listId = list.dataset.listId;
                    if (listId !== task.listId) {
                        taskManager.moveTaskToList(task.id, listId);
                        ui.renderCurrentView();
                    }
                    return;
                }
            }
        }
        
        
        if (state.currentView === 'date') {
            const dateGroups = document.querySelectorAll('.date-group');
            for (const group of dateGroups) {
                const rect = group.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right && 
                    y >= rect.top && y <= rect.bottom) {
                    const dateHeading = group.querySelector('.date-heading');
                    if (dateHeading) {
                        const dateText = dateHeading.textContent;
                        updateTaskWithNewDate(task, dateText);
                        ui.renderCurrentView();
                    }
                    return;
                }
            }
        }
    }
    
    
    taskElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        ui.showTaskModal(task);
    });
}


function updateTaskWithNewDate(task, dateText) {
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
    
    
    taskManager.updateTask(task.id, { dueDate: newDueDate });
}


export function setupDateViewDragDrop() {
    const dateGroups = document.querySelectorAll('.date-group .tasks');
    
    dateGroups.forEach(tasksContainer => {
        if (tasksContainer) {
            new Sortable(tasksContainer, {
                group: 'tasks',
                animation: 150,
                onStart: function(evt) {
                    
                    elements.deleteBtn.classList.add('drop-target');
                },
                onEnd: function(evt) {
                    
                    elements.deleteBtn.classList.remove('drop-target');
                    
                    
                    const taskId = evt.item.dataset.taskId;
                    
                    
                    const deleteBtn = elements.deleteBtn;
                    const deleteBtnRect = deleteBtn.getBoundingClientRect();
                    const x = evt.originalEvent.clientX;
                    const y = evt.originalEvent.clientY;
                    
                    if (x >= deleteBtnRect.left && x <= deleteBtnRect.right && 
                        y >= deleteBtnRect.top && y <= deleteBtnRect.bottom) {
                        
                        taskManager.deleteTask(taskId);
                    } else {
                        
                        const dateGroup = evt.to.closest('.date-group');
                        if (dateGroup) {
                            const dateHeading = dateGroup.querySelector('.date-heading');
                            if (dateHeading) {
                                const dateText = dateHeading.textContent;
                                
                                
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


function createTaskInList(listId) {
    
}

function createTaskFromModal() {
    
}