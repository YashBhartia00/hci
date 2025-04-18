# HCI Task Manager

This project is built for our HCI class at Telecom Paris. It demonstrates a task management application with a unique task organization system, drag-and-drop feature and multiple views.

## Authors
• Helena Cadevall Soto  
• Louis Guillore  
• Yash Bhartia  

## Overview
This application allows users to:  
• Create and manage tasks  
• Switch between list and date-based views  
• Filter tasks by keyword, date, and list  
• Recover deleted tasks through a history panel  

This repository is [hosted on github pages](https://yashbhartia00.github.io/hci/) , and is optimized for touch screen on computers, mouse interactions also work.

## Usage
1. Interact with the floating action button (FAB) to create tasks or lists.  
2. Filter, delete, and restore tasks using the buttons at the top.  
3. Tasks can be dragged arount to rearrange, long pressed to edit, and click on the task icon to check off the task

## Interface
The interface is composed of:  
- A header with view-switching buttons and quick access to filters and deleted tasks (see [index.html](index.html)).  
- A main area displaying either the List View or the Date View (toggled by user choice).  
- A floating action button (FAB) that expands to create tasks or lists.  
- Various modals (`Task Modal`, `List Modal`, `Filter Modal`, `History Modal`) for managing tasks, lists, and filters.  

## Code Organization

- [js/app.js](js/app.js) – Entry point that initializes the application and sets up event listeners.
- [js/modules/ui.js](js/modules/ui.js) – Manages all UI rendering, stateful modals, and user interactions.
- [js/modules/drag.js](js/modules/drag.js) – Implements drag-and-drop behavior for tasks and lists using Sortable.js.
- [js/modules/tasks.js](js/modules/tasks.js) – Handles creation, updating, deletion, and restoration of tasks.  
- [js/modules/lists.js](js/modules/lists.js) – Manages lists, their icons, and reordering logic.  
- [js/modules/state.js](js/modules/state.js) – Stores global application data like current view, lists, tasks, and filters.  
- [js/modules/utils.js](js/modules/utils.js) – Provides helper functions for date formatting and other utilities.  
- [css/styles.css](css/styles.css) – Contains the layout and style rules for the entire interface.
