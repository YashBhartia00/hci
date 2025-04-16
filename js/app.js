// Main application for Task Manager
document.addEventListener('DOMContentLoaded', () => {
    // App state
    const app = {
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

    // DOM Elements
    const elements = {
        listView: document.getElementById('list-view'),
        dateView: document.getElementById('date-view'),
        listViewBtn: document.getElementById('list-view-btn'),
        dateViewBtn: document.getElementById('date-view-btn'),
        filterBtn: document.getElementById('filter-btn'),
        deleteBtn: document.getElementById('delete-btn'),
        fab: document.getElementById('fab'),
        taskModal: document.getElementById('task-modal'),
        filterModal: document.getElementById('filter-modal'),
        listModal: document.getElementById('list-modal'),
        historyModal: document.getElementById('history-modal'),
        listsContainer: document.getElementById('lists-container'),
        dateGroupsContainer: document.getElementById('date-groups-container'),
        deletedTasksContainer: document.getElementById('deleted-tasks-container'),
        createTaskBtn: document.getElementById('create-task'),
        modalDragHandle: document.querySelector('.modal-drag-handle')
    };

    // Variables for drag handling
    let startY, startHeight;

    // Modal drag functions (defined at the top level to be accessible everywhere)
    function handleModalDragStart(e) {
        e.preventDefault();
        const modal = document.getElementById('task-modal');
        const modalContent = modal.querySelector('.modal-content');

        startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
        startHeight = modalContent.offsetHeight;

        document.addEventListener('mousemove', handleModalDragMove);
        document.addEventListener('touchmove', handleModalDragMove, {passive: false});
        document.addEventListener('mouseup', handleModalDragEnd);
        document.addEventListener('touchend', handleModalDragEnd);
    }

    function handleModalDragMove(e) {
        const modal = document.getElementById('task-modal');
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

    // Initialize the application
    initApp();

    // Application initialization
    function initApp() {
        loadData();
        setupEventListeners();
        setupDragBehaviors();
        renderCurrentView();
        updateListSelect();
    }

    // Load data from localStorage
    function loadData() {
        try {
            const savedLists = localStorage.getItem('taskManagerLists');
            const savedTasks = localStorage.getItem('taskManagerTasks');
            const savedDeletedTasks = localStorage.getItem('taskManagerDeletedTasks');

            if (savedLists) {
                app.lists = JSON.parse(savedLists);
                // Ensure uncategorized list exists
                if (!app.lists.some(list => list.id === app.uncategorizedListId)) {
                    app.lists.push({ id: app.uncategorizedListId, name: 'Uncategorized' });
                }
            } else {
                // Default lists if none exist
                app.lists = [
                    { id: generateId(), name: 'Personal' },
                    { id: generateId(), name: 'Work' },
                    { id: generateId(), name: 'Shopping' },
                    { id: app.uncategorizedListId, name: 'Uncategorized' }
                ];
                saveData();
            }

            if (savedTasks) {
                app.tasks = JSON.parse(savedTasks);
            }

            if (savedDeletedTasks) {
                app.deletedTasks = JSON.parse(savedDeletedTasks);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            // Reset to defaults if there's an error
            app.lists = [
                { id: generateId(), name: 'Personal' },
                { id: generateId(), name: 'Work' },
                { id: generateId(), name: 'Shopping' },
                { id: app.uncategorizedListId, name: 'Uncategorized' }
            ];
            app.tasks = [];
            app.deletedTasks = [];
            saveData();
        }
    }

    // Save data to localStorage
    function saveData() {
        localStorage.setItem('taskManagerLists', JSON.stringify(app.lists));
        localStorage.setItem('taskManagerTasks', JSON.stringify(app.tasks));
        localStorage.setItem('taskManagerDeletedTasks', JSON.stringify(app.deletedTasks));
    }

    // Set up event listeners
    function setupEventListeners() {
        // View switching
        elements.listViewBtn.addEventListener('click', () => switchView('list'));
        elements.dateViewBtn.addEventListener('click', () => switchView('date'));

        // Filter button
        elements.filterBtn.addEventListener('click', showFilterModal);

        // Delete/History button
        elements.deleteBtn.addEventListener('click', showHistoryModal);

        // Floating Action Button (FAB)
        elements.fab.addEventListener('click', () => showTaskModal());
        elements.fab.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showListModal();
        });

        // Long press on FAB for list creation
        let pressTimer;
        elements.fab.addEventListener('touchstart', () => {
            pressTimer = setTimeout(() => {
                showListModal();
            }, 800); // 800ms for long press
        });
        elements.fab.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
        });

        // Task Modal
        document.getElementById('create-task').addEventListener('click', createTaskFromModal);
        document.getElementById('save-task').addEventListener('click', saveTask);
        document.getElementById('cancel-task').addEventListener('click', hideTaskModal);

        // List Modal
        document.getElementById('save-list').addEventListener('click', saveList);
        document.getElementById('cancel-list').addEventListener('click', hideListModal);

        // Filter Modal
        document.getElementById('apply-filters').addEventListener('click', applyFilters);
        document.getElementById('reset-filters').addEventListener('click', resetFilters);

        // History Modal
        document.getElementById('close-history').addEventListener('click', hideHistoryModal);

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
                hideModals();
            }
        });

        // Handle icon selection
        const iconButtons = document.querySelectorAll('.icon-btn');
        iconButtons.forEach(button => {
            button.addEventListener('click', () => {
                iconButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });

        // Handle date selection
        const dateButtons = document.querySelectorAll('.date-btn');
        dateButtons.forEach(button => {
            button.addEventListener('click', () => {
                dateButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                if (button.dataset.date === 'no-date') {
                    document.getElementById('custom-date').value = '';
                } else if (button.dataset.date === 'today') {
                    document.getElementById('custom-date').valueAsDate = new Date();
                } else if (button.dataset.date === 'tomorrow') {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    document.getElementById('custom-date').valueAsDate = tomorrow;
                }
            });
        });

        // Handle filter date selection
        const dateFilterButtons = document.querySelectorAll('.date-filter-btn');
        dateFilterButtons.forEach(button => {
            button.addEventListener('click', () => {
                button.classList.toggle('active');
            });
        });

        // Handle task modal drag
        elements.modalDragHandle.addEventListener('mousedown', handleModalDragStart);
        elements.modalDragHandle.addEventListener('touchstart', handleModalDragStart, {passive: false});

        // Make create button draggable
        setupTaskDragging();
    }

    // Setup drag behaviors
    function setupDragBehaviors() {
        // The drag functions are now defined at the top level
        // No need to define them here again
    }

    // Setup task dragging from create button
    function setupTaskDragging() {
        const createTaskBtn = elements.createTaskBtn;

        createTaskBtn.addEventListener('mousedown', handleTaskDragStart);
        createTaskBtn.addEventListener('touchstart', handleTaskDragStart, {passive: false});

        function handleTaskDragStart(e) {
            // Only allow dragging if we have a task name
            const taskName = document.getElementById('task-name').value.trim();
            if (!taskName) return;

            // Create phantom element for dragging
            const phantom = document.createElement('div');
            phantom.className = 'task phantom-task';
            phantom.style.position = 'absolute';
            phantom.style.zIndex = 1000;
            phantom.style.opacity = 0.8;
            phantom.style.pointerEvents = 'none';

            // Set position and content
            const activeIconBtn = document.querySelector('.icon-btn.active');
            const icon = activeIconBtn ? activeIconBtn.dataset.icon : 'fa-tasks';
            
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
            }

            // Handle drag end
            function handleTaskDragEnd(e) {
                document.removeEventListener('mousemove', handleTaskDragMove);
                document.removeEventListener('touchmove', handleTaskDragMove);
                document.removeEventListener('mouseup', handleTaskDragEnd);
                document.removeEventListener('touchend', handleTaskDragEnd);

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
            }

            // Add event listeners for dragging
            document.addEventListener('mousemove', handleTaskDragMove);
            document.addEventListener('touchmove', handleTaskDragMove, {passive: false});
            document.addEventListener('mouseup', handleTaskDragEnd);
            document.addEventListener('touchend', handleTaskDragEnd);
        }
    }

    // Create a task in a specific list (from dragging)
    function createTaskInList(listId) {
        const taskName = document.getElementById('task-name').value.trim() || 'New Task'; // Default name if empty
        const activeIconBtn = document.querySelector('.icon-btn.active');
        const icon = activeIconBtn ? activeIconBtn.dataset.icon : 'fa-tasks';

        // Get date if specified
        let dueDate = null;
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

        // Create new task
        const newTask = {
            id: generateId(),
            name: taskName,
            icon,
            dueDate,
            listId,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        app.tasks.push(newTask);
        saveData();
        hideTaskModal();
        renderCurrentView();
    }

    // Create a task from the modal (without dragging)
    function createTaskFromModal() {
        const taskName = document.getElementById('task-name').value.trim() || 'New Task'; // Default name if empty
        const activeIconBtn = document.querySelector('.icon-btn.active');
        const icon = activeIconBtn ? activeIconBtn.dataset.icon : 'fa-tasks';
        
        let dueDate = null;
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
        
        // Use selected list, or default to Uncategorized
        let listId = document.getElementById('list-select').value;
        if (!listId) {
            listId = app.uncategorizedListId;
        }
        
        // Create new task
        const newTask = {
            id: generateId(),
            name: taskName,
            icon,
            dueDate,
            listId,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        app.tasks.push(newTask);
        saveData();
        hideTaskModal();
        renderCurrentView();
    }

    // Switch between List and Date views
    function switchView(view) {
        app.currentView = view;
        
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
    function renderCurrentView() {
        if (app.currentView === 'list') {
            renderListView();
        } else {
            renderDateView();
        }
    }

    // Render the List View
    function renderListView() {
        elements.listsContainer.innerHTML = '';
        
        app.lists.forEach(list => {
            // Create list container
            const listElement = document.createElement('div');
            listElement.className = 'list';
            listElement.dataset.listId = list.id;
            
            // Create list header
            const listHeader = document.createElement('div');
            listHeader.className = 'list-header';
            
            const listTitle = document.createElement('div');
            listTitle.className = 'list-title';
            listTitle.textContent = list.name;
            
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'list-toggle';
            toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
            toggleBtn.addEventListener('click', () => {
                const tasksContainer = listElement.querySelector('.tasks');
                tasksContainer.style.display = tasksContainer.style.display === 'none' ? 'block' : 'none';
                toggleBtn.innerHTML = tasksContainer.style.display === 'none' ? 
                    '<i class="fas fa-chevron-down"></i>' : 
                    '<i class="fas fa-chevron-up"></i>';
            });
            
            listHeader.appendChild(listTitle);
            listHeader.appendChild(toggleBtn);
            listElement.appendChild(listHeader);
            
            // Create tasks container
            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'tasks';
            
            // Filter tasks for this list
            const listTasks = getFilteredTasks().filter(task => task.listId === list.id);
            
            if (listTasks.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'empty-list-message';
                emptyMessage.textContent = 'No tasks in this list';
                emptyMessage.style.padding = '10px 15px';
                emptyMessage.style.color = '#999';
                emptyMessage.style.fontStyle = 'italic';
                tasksContainer.appendChild(emptyMessage);
            } else {
                listTasks.forEach(task => {
                    const taskElement = createTaskElement(task);
                    tasksContainer.appendChild(taskElement);
                });
            }
            
            listElement.appendChild(tasksContainer);
            elements.listsContainer.appendChild(listElement);
            
            // Initialize drag-and-drop for this list's tasks
            new Sortable(tasksContainer, {
                group: 'tasks',
                animation: 150,
                onEnd: function(evt) {
                    const taskId = evt.item.dataset.taskId;
                    const newListId = evt.to.closest('.list').dataset.listId;
                    
                    // Update task's list ID
                    const taskIndex = app.tasks.findIndex(t => t.id === taskId);
                    if (taskIndex !== -1) {
                        app.tasks[taskIndex].listId = newListId;
                        saveData();
                    }
                }
            });
        });
    }

    // Render the Date View
    function renderDateView() {
        elements.dateGroupsContainer.innerHTML = '';
        
        // Get filtered tasks
        const filteredTasks = getFilteredTasks();
        
        // Group tasks by date
        const groupedTasks = groupTasksByDate(filteredTasks);
        
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
            } else if (isToday(new Date(dateKey))) {
                dateText = 'Today';
            } else if (isTomorrow(new Date(dateKey))) {
                dateText = 'Tomorrow';
            } else {
                dateText = formatDate(new Date(dateKey));
            }
            
            dateHeading.textContent = dateText;
            dateGroup.appendChild(dateHeading);
            
            // Create tasks container
            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'tasks';
            
            // Add tasks to the container
            tasks.forEach(task => {
                const taskElement = createTaskElement(task);
                tasksContainer.appendChild(taskElement);
            });
            
            dateGroup.appendChild(tasksContainer);
            elements.dateGroupsContainer.appendChild(dateGroup);
            
            // Initialize drag-and-drop for this date's tasks
            new Sortable(tasksContainer, {
                group: 'tasks',
                animation: 150,
                onEnd: function(evt) {
                    // We don't need to handle date changes here since task dates
                    // can only be changed via the task modal, but we keep the drag
                    // functionality for reordering within the same date
                }
            });
        }
    }

    // Create a task element
    function createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = 'task';
        taskElement.dataset.taskId = task.id;
        
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
            toggleTaskCompletion(task.id);
        });
        
        // Task text
        const taskText = document.createElement('div');
        taskText.className = 'task-text';
        taskText.textContent = task.name;
        
        // Task date display (initially hidden)
        const taskDate = document.createElement('div');
        taskDate.className = 'task-date';
        
        if (task.dueDate) {
            if (isToday(new Date(task.dueDate))) {
                taskDate.innerHTML = '<span class="date-tag today">Today</span>';
            } else if (isTomorrow(new Date(task.dueDate))) {
                taskDate.innerHTML = '<span class="date-tag tomorrow">Tomorrow</span>';
            } else if (isThisWeek(new Date(task.dueDate))) {
                taskDate.innerHTML = '<span class="date-tag week">This Week</span>';
            } else {
                taskDate.innerHTML = `<span class="date-tag later">${formatDateShort(new Date(task.dueDate))}</span>`;
            }
        } else {
            // Add a "No Date" tag for tasks without due dates
            taskDate.innerHTML = '<span class="date-tag no-date">No Date</span>';
        }
        
        taskElement.appendChild(taskIcon);
        taskElement.appendChild(taskText);
        taskElement.appendChild(taskDate);
        
        // Single click shows/hides date
        taskElement.addEventListener('click', (e) => {
            e.preventDefault();
            taskElement.classList.toggle('show-date');
        });
        
        // Long press opens edit mode
        let pressTimer;
        
        taskElement.addEventListener('touchstart', () => {
            pressTimer = setTimeout(() => {
                showTaskModal(task);
            }, 800); // 800ms for long press
        });
        
        taskElement.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
        });
        
        // Right-click for edit on desktop
        taskElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showTaskModal(task);
        });
        
        return taskElement;
    }

    // Show task creation/editing modal
    function showTaskModal(task = null) {
        const modal = elements.taskModal;
        modal.classList.add('active');
        modal.classList.remove('expanded');
        
        const modalTitle = document.getElementById('task-modal-title');
        const nameInput = document.getElementById('task-name');
        const iconButtons = document.querySelectorAll('.icon-btn');
        const dateButtons = document.querySelectorAll('.date-btn');
        const customDateInput = document.getElementById('custom-date');
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
            
            // Set date
            if (task.dueDate) {
                customDateInput.value = task.dueDate.split('T')[0];
                if (isToday(new Date(task.dueDate))) {
                    document.querySelector('.date-btn[data-date="today"]').classList.add('active');
                } else if (isTomorrow(new Date(task.dueDate))) {
                    document.querySelector('.date-btn[data-date="tomorrow"]').classList.add('active');
                } else {
                    document.querySelector('.date-btn[data-date="custom"]')?.classList.add('active');
                }
            } else {
                document.querySelector('.date-btn[data-date="no-date"]').classList.add('active');
                customDateInput.value = '';
            }
            
            // Set list
            listSelect.value = task.listId;
            
            app.editingTask = task;
        } else {
            // Creating new task
            modalTitle.textContent = 'New Task';
            nameInput.value = '';
            customDateInput.value = '';
            
            // Show create button, hide save button
            createTaskBtn.style.display = 'block';
            saveTaskBtn.style.display = 'none';
            
            // Set default list to first list (or uncategorized)
            listSelect.value = app.lists.length > 0 ? 
                (app.lists[0].id !== app.uncategorizedListId ? app.lists[0].id : app.uncategorizedListId) : 
                app.uncategorizedListId;
            
            app.editingTask = null;
        }
        
        // Focus on the name input
        setTimeout(() => nameInput.focus(), 300);
    }

    // Hide task modal
    function hideTaskModal() {
        elements.taskModal.classList.remove('active');
        elements.taskModal.classList.remove('expanded');
        app.editingTask = null;
    }

    // Show list creation modal
    function showListModal() {
        elements.listModal.classList.add('active');
        document.getElementById('list-name').value = '';
        setTimeout(() => document.getElementById('list-name').focus(), 300);
    }

    // Hide list modal
    function hideListModal() {
        elements.listModal.classList.remove('active');
    }

    // Show filter modal
    function showFilterModal() {
        elements.filterModal.classList.add('active');
        
        // Populate list options for filtering
        const listFilterOptions = document.getElementById('list-filter-options');
        listFilterOptions.innerHTML = '';
        
        app.lists.forEach(list => {
            const option = document.createElement('div');
            option.className = 'list-filter-option';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `filter-list-${list.id}`;
            checkbox.value = list.id;
            checkbox.checked = app.filters.lists.includes(list.id);
            
            const label = document.createElement('label');
            label.htmlFor = `filter-list-${list.id}`;
            label.textContent = list.name;
            
            option.appendChild(checkbox);
            option.appendChild(label);
            listFilterOptions.appendChild(option);
        });
        
        // Set keyword filter
        document.getElementById('keyword-filter').value = app.filters.keyword;
        
        // Set date filters
        document.querySelectorAll('.date-filter-btn').forEach(btn => {
            btn.classList.toggle('active', app.filters.dates.includes(btn.dataset.filter));
        });
    }

    // Show history/deleted tasks modal
    function showHistoryModal() {
        elements.historyModal.classList.add('active');
        elements.deletedTasksContainer.innerHTML = '';
        
        if (app.deletedTasks.length === 0) {
            elements.deletedTasksContainer.innerHTML = '<p style="text-align: center; color: #999;">No deleted tasks</p>';
            return;
        }
        
        app.deletedTasks.forEach(task => {
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
                restoreTask(task.id);
            });
            
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.style.color = '#ef4444';
            deleteButton.addEventListener('click', () => {
                permanentlyDeleteTask(task.id);
            });
            
            taskActions.appendChild(restoreButton);
            taskActions.appendChild(deleteButton);
            
            deletedTaskElement.appendChild(taskInfo);
            deletedTaskElement.appendChild(taskActions);
            
            elements.deletedTasksContainer.appendChild(deletedTaskElement);
        });
    }

    // Apply filters
    function applyFilters() {
        // Get keyword filter
        app.filters.keyword = document.getElementById('keyword-filter').value.trim().toLowerCase();
        
        // Get date filters
        app.filters.dates = [];
        document.querySelectorAll('.date-filter-btn.active').forEach(btn => {
            app.filters.dates.push(btn.dataset.filter);
        });
        
        // Get list filters
        app.filters.lists = [];
        document.querySelectorAll('#list-filter-options input[type="checkbox"]:checked').forEach(cb => {
            app.filters.lists.push(cb.value);
        });
        
        // Hide filter modal
        hideModals();
        
        // Render the current view with filters applied
        renderCurrentView();
    }

    // Reset filters
    function resetFilters() {
        app.filters.keyword = '';
        app.filters.dates = [];
        app.filters.lists = [];
        
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

    // Save task
    function saveTask() {
        const taskName = document.getElementById('task-name').value.trim() || 'Untitled Task'; // Default name if empty
        
        const activeIconBtn = document.querySelector('.icon-btn.active');
        const icon = activeIconBtn ? activeIconBtn.dataset.icon : 'fa-tasks';
        
        const activeDateBtn = document.querySelector('.date-btn.active');
        let dueDate = null;
        
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
        
        let listId = document.getElementById('list-select').value;
        if (!listId) {
            listId = app.uncategorizedListId;
        }
        
        if (app.editingTask) {
            // Update existing task
            const taskIndex = app.tasks.findIndex(t => t.id === app.editingTask.id);
            if (taskIndex !== -1) {
                app.tasks[taskIndex].name = taskName;
                app.tasks[taskIndex].icon = icon;
                app.tasks[taskIndex].dueDate = dueDate;
                app.tasks[taskIndex].listId = listId;
            }
        } else {
            // Create new task
            const newTask = {
                id: generateId(),
                name: taskName,
                icon,
                dueDate,
                listId,
                completed: false,
                createdAt: new Date().toISOString()
            };
            
            app.tasks.push(newTask);
        }
        
        // Save data and refresh view
        saveData();
        hideTaskModal();
        renderCurrentView();
    }

    // Save new list
    function saveList() {
        const listName = document.getElementById('list-name').value.trim();
        if (!listName) {
            alert('Please enter a list name');
            return;
        }
        
        const newList = {
            id: generateId(),
            name: listName
        };
        
        app.lists.push(newList);
        saveData();
        hideListModal();
        renderCurrentView();
        updateListSelect();
    }

    // Update the list dropdown in the task modal
    function updateListSelect() {
        const listSelect = document.getElementById('list-select');
        listSelect.innerHTML = '';
        
        app.lists.forEach(list => {
            const option = document.createElement('option');
            option.value = list.id;
            option.textContent = list.name;
            listSelect.appendChild(option);
        });
    }

    // Hide all modals
    function hideModals() {
        elements.taskModal.classList.remove('active');
        elements.filterModal.classList.remove('active');
        elements.listModal.classList.remove('active');
        elements.historyModal.classList.remove('active');
    }

    // Hide filter modal
    function hideFilterModal() {
        elements.filterModal.classList.remove('active');
    }

    // Hide history modal
    function hideHistoryModal() {
        elements.historyModal.classList.remove('active');
    }

    // Toggle task completion status
    function toggleTaskCompletion(taskId) {
        const taskIndex = app.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            app.tasks[taskIndex].completed = !app.tasks[taskIndex].completed;
            saveData();
            
            // Find the task element in the DOM
            const taskElement = document.querySelector(`.task[data-task-id="${taskId}"]`);
            if (taskElement) {
                taskElement.classList.toggle('completed');
                taskElement.classList.add('just-completed');
                setTimeout(() => {
                    taskElement.classList.remove('just-completed');
                }, 500);
            }
        }
    }

    // Restore a task from deleted tasks
    function restoreTask(taskId) {
        const taskIndex = app.deletedTasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            const task = app.deletedTasks[taskIndex];
            
            // Check if the list still exists
            if (!app.lists.some(list => list.id === task.listId)) {
                // If not, assign to the first available list
                if (app.lists.length > 0) {
                    task.listId = app.lists[0].id;
                } else {
                    // Create a default list if none exists
                    const defaultList = { id: generateId(), name: 'Tasks' };
                    app.lists.push(defaultList);
                    task.listId = defaultList.id;
                }
            }
            
            app.tasks.push(task);
            app.deletedTasks.splice(taskIndex, 1);
            
            saveData();
            showHistoryModal(); // Refresh history modal
            renderCurrentView(); // Refresh main view
        }
    }

    // Permanently delete a task
    function permanentlyDeleteTask(taskId) {
        const taskIndex = app.deletedTasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            app.deletedTasks.splice(taskIndex, 1);
            saveData();
            showHistoryModal(); // Refresh history modal
        }
    }

    // Get filtered tasks based on current filters
    function getFilteredTasks() {
        let result = [...app.tasks];
        
        // Filter by keyword
        if (app.filters.keyword) {
            result = result.filter(task => 
                task.name.toLowerCase().includes(app.filters.keyword)
            );
        }
        
        // Filter by dates
        if (app.filters.dates.length > 0) {
            result = result.filter(task => {
                if (!task.dueDate) {
                    return app.filters.dates.includes('no-date');
                }
                
                const date = new Date(task.dueDate);
                
                return app.filters.dates.some(filter => {
                    if (filter === 'today') return isToday(date);
                    if (filter === 'tomorrow') return isTomorrow(date);
                    if (filter === 'week') return isThisWeek(date);
                    return false;
                });
            });
        }
        
        // Filter by lists
        if (app.filters.lists.length > 0) {
            result = result.filter(task => app.filters.lists.includes(task.listId));
        }
        
        return result;
    }

    // Group tasks by date for the Date View
    function groupTasksByDate(tasks) {
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

    // Helper function: Generate a unique ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // Helper function: Check if a date is today
    function isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    // Helper function: Check if a date is tomorrow
    function isTomorrow(date) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return date.getDate() === tomorrow.getDate() &&
               date.getMonth() === tomorrow.getMonth() &&
               date.getFullYear() === tomorrow.getFullYear();
    }

    // Helper function: Check if a date is within this week
    function isThisWeek(date) {
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekEnd = new Date(new Date(weekStart).setDate(weekStart.getDate() + 6));
        
        return date >= weekStart && date <= weekEnd;
    }

    // Helper function: Format a date object to a readable string
    function formatDate(date) {
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    // Helper function: Format a date object to a short string
    function formatDateShort(date) {
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
});