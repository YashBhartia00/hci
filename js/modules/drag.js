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

// Setup Sortable.js for tasks within a list
export function setupTaskSortable(listElement) {
    const tasksContainer = listElement.querySelector('.tasks');
    if (tasksContainer) {
        new Sortable(tasksContainer, {
            group: 'tasks',
            animation: 150,
            onEnd: function(evt) {
                const taskId = evt.item.dataset.taskId;
                const newListId = evt.to.closest('.list').dataset.listId;
                
                taskManager.moveTaskToList(taskId, newListId);
                ui.renderCurrentView();
            },
            onStart: function() {
                // Show delete button with a trash indicator
                elements.deleteBtn.classList.add('drop-target');
            },
            onEnd: function() {
                // Hide delete button indicator
                elements.deleteBtn.classList.remove('drop-target');
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
        elements.taskModal.classList.remove('expanded');
        
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
        }

        // Handle drag end
        function handleTaskDragEnd(e) {
            document.removeEventListener('mousemove', handleTaskDragMove);
            document.removeEventListener('touchmove', handleTaskDragMove);
            document.removeEventListener('mouseup', handleTaskDragEnd);
            document.removeEventListener('touchend', handleTaskDragEnd);

            // Check if we're over the delete button
            const deleteBtn = elements.deleteBtn;
            const deleteBtnRect = deleteBtn.getBoundingClientRect();
            if (currentX >= deleteBtnRect.left && currentX <= deleteBtnRect.right && 
                currentY >= deleteBtnRect.top && currentY <= deleteBtnRect.bottom) {
                // Don't create the task as it was "deleted" during creation
                deleteBtn.classList.remove('drag-over');
                ui.hideTaskModal();
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

            // Create task in the target list
            if (targetList) {
                const listId = targetList.dataset.listId;
                createTaskInList(listId);
            } else {
                // Default to first list if not dragged to a specific list
                createTaskFromModal();
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

// Functions that need implementation in ui.js
function createTaskInList(listId) {
    // This will be defined in ui.js
}

function createTaskFromModal() {
    // This will be defined in ui.js
}