// Main application for Task Manager
import { state, initState } from './modules/state.js';
import * as ui from './modules/ui.js';
import * as drag from './modules/drag.js';
import * as taskManager from './modules/tasks.js';
import * as listManager from './modules/lists.js';
import * as utils from './modules/utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        listView: document.getElementById('list-view'),
        dateView: document.getElementById('date-view'),
        listViewBtn: document.getElementById('list-view-btn'),
        dateViewBtn: document.getElementById('date-view-btn'),
        filterBtn: document.getElementById('filter-btn'),
        deleteBtn: document.getElementById('delete-btn'),
        fab: document.getElementById('fab'),
        fabTask: document.getElementById('fab-task'),
        fabList: document.getElementById('fab-list'),
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

    initApp(elements);
    function setupEventListeners() {
        elements.listViewBtn.addEventListener('click', () => ui.switchView('list'));
        elements.dateViewBtn.addEventListener('click', () => ui.switchView('date'));

        elements.filterBtn.addEventListener('click', ui.showFilterModal);

        elements.deleteBtn.addEventListener('click', ui.showHistoryModal);

        elements.fab.addEventListener('click', () => {
            elements.fab.parentElement.classList.toggle('show-options');
        });

        elements.fabTask.addEventListener('click', () => ui.showTaskModal());
        elements.fabList.addEventListener('click', ui.showListModal);

        let pressTimer;
        elements.fab.addEventListener('touchstart', () => {
            pressTimer = setTimeout(() => {
                elements.fab.parentElement.classList.add('show-options');
            }, 800);
        });
        elements.fab.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
        });

        document.getElementById('create-task').addEventListener('click', ui.createTaskFromModal);
        document.getElementById('save-task').addEventListener('click', ui.saveTask);
        document.getElementById('cancel-task').addEventListener('click', ui.hideTaskModal);

        document.getElementById('save-list').addEventListener('click', ui.saveList);
        document.getElementById('cancel-list').addEventListener('click', ui.hideListModal);

        document.getElementById('apply-filters').addEventListener('click', ui.applyFilters);
        document.getElementById('reset-filters').addEventListener('click', ui.resetFilters);

        document.getElementById('close-history').addEventListener('click', ui.hideHistoryModal);

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
                ui.hideModals();
            }
            if (e.target !== elements.fab && !elements.fab.contains(e.target)) {
                elements.fab.parentElement.classList.remove('show-options');
            }
        });

        const iconButtons = document.querySelectorAll('.icon-btn');
        iconButtons.forEach(button => {
            button.addEventListener('click', () => {
                iconButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });

        const listIconButtons = document.querySelectorAll('.list-icon-btn');
        listIconButtons.forEach(button => {
            button.addEventListener('click', () => {
                listIconButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });

        const dateButtons = document.querySelectorAll('.date-btn');
        dateButtons.forEach(button => {
            button.addEventListener('click', () => {
                dateButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                if (button.dataset.date === 'no-date') {
                    document.getElementById('custom-date').value = '';
                    document.getElementById('custom-time').value = '';
                } else if (button.dataset.date === 'today') {
                    document.getElementById('custom-date').valueAsDate = new Date();
                } else if (button.dataset.date === 'tomorrow') {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    document.getElementById('custom-date').valueAsDate = tomorrow;
                }
            });
        });

        const dateFilterButtons = document.querySelectorAll('.date-filter-btn');
        dateFilterButtons.forEach(button => {
            button.addEventListener('click', () => {
                button.classList.toggle('active');
            });
        });
    }

    function initApp(elements) {
        initState();
        
        ui.initUI(elements);

        drag.init(elements);
        
        setupEventListeners();
        
        ui.renderCurrentView();
        ui.updateListSelect();
    }
});