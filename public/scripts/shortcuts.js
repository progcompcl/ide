// Keyboard Shortcuts Management System
class ShortcutsManager {
    constructor() {
        this.defaultShortcuts = {
            // Run commands
            'run': { keys: 'F5', description: 'Compile and run the program' },
            'runWithoutDebug': { keys: 'Ctrl+F5', description: 'Run without debugging' },

            // File operations
            'save': { keys: 'Ctrl+S', description: 'Save current file' },
            'open': { keys: 'Ctrl+O', description: 'Open a file' },
            'quickOpen': { keys: 'Ctrl+P', description: 'Quick open file' },

            // Edit operations
            'undo': { keys: 'Ctrl+Z', description: 'Undo' },
            'redo': { keys: 'Ctrl+Y', description: 'Redo' },
            'cut': { keys: 'Ctrl+X', description: 'Cut' },
            'copy': { keys: 'Ctrl+C', description: 'Copy' },
            'paste': { keys: 'Ctrl+V', description: 'Paste' },
            'selectAll': { keys: 'Ctrl+A', description: 'Select all' },

            // Line operations
            'toggleComment': { keys: 'Ctrl+/', description: 'Toggle line comment' },
            'duplicateLineDown': { keys: 'Shift+Alt+Down', description: 'Duplicate line down' },
            'duplicateLineUp': { keys: 'Shift+Alt+Up', description: 'Duplicate line up' },
            'moveLinesDown': { keys: 'Alt+Down', description: 'Move line down' },
            'moveLinesUp': { keys: 'Alt+Up', description: 'Move line up' },
            'deleteLine': { keys: 'Ctrl+Shift+K', description: 'Delete line' },
            'insertLineBelow': { keys: 'Ctrl+Enter', description: 'Insert line below' },
            'insertLineAbove': { keys: 'Ctrl+Shift+Enter', description: 'Insert line above' },

            // Code formatting
            'format': { keys: 'Shift+Alt+F', description: 'Format code' },
            'indent': { keys: 'Ctrl+]', description: 'Indent line' },
            'outdent': { keys: 'Ctrl+[', description: 'Outdent line' },

            // Search and navigation
            'find': { keys: 'Ctrl+F', description: 'Find' },
            'replace': { keys: 'Ctrl+H', description: 'Replace' },
            'findNext': { keys: 'F3', description: 'Find next' },
            'findPrevious': { keys: 'Shift+F3', description: 'Find previous' },
            'goToLine': { keys: 'Ctrl+G', description: 'Go to line' },

            // Selection
            'selectLineDown': { keys: 'Shift+Down', description: 'Select line down' },
            'selectLineUp': { keys: 'Shift+Up', description: 'Select line up' },
            'selectWordRight': { keys: 'Ctrl+Shift+Right', description: 'Select word right' },
            'selectWordLeft': { keys: 'Ctrl+Shift+Left', description: 'Select word left' },
            'selectToLineEnd': { keys: 'Shift+End', description: 'Select to line end' },
            'selectToLineStart': { keys: 'Shift+Home', description: 'Select to line start' },
            'expandSelection': { keys: 'Shift+Alt+Right', description: 'Expand selection' },

            // Cursor movement
            'cursorWordLeft': { keys: 'Ctrl+Left', description: 'Move cursor word left' },
            'cursorWordRight': { keys: 'Ctrl+Right', description: 'Move cursor word right' },
            'cursorLineStart': { keys: 'Home', description: 'Move cursor to line start' },
            'cursorLineEnd': { keys: 'End', description: 'Move cursor to line end' },
            'cursorTop': { keys: 'Ctrl+Home', description: 'Move cursor to file start' },
            'cursorBottom': { keys: 'Ctrl+End', description: 'Move cursor to file end' },

            // Multi-cursor and selection
            'addCursorAbove': { keys: 'Ctrl+Alt+Up', description: 'Add cursor above' },
            'addCursorBelow': { keys: 'Ctrl+Alt+Down', description: 'Add cursor below' },
            'selectNextOccurrence': { keys: 'Ctrl+D', description: 'Select next occurrence' }
        };

        this.shortcuts = this.loadShortcuts();
        this.modal = null;
        this.recordingInput = null;
        this.init();
    }

    init() {
        this.modal = document.getElementById('shortcuts-modal');
        this.setupModalEvents();
        this.populateShortcutsList();
    }

    setupModalEvents() {
        // Open modal button
        document.getElementById('shortcuts-btn').addEventListener('click', () => {
            this.openModal();
        });

        // Close modal button
        document.getElementById('close-shortcuts').addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Reset shortcuts button
        document.getElementById('reset-shortcuts').addEventListener('click', () => {
            this.resetShortcuts();
        });

        // Save shortcuts button
        document.getElementById('save-shortcuts').addEventListener('click', () => {
            this.saveShortcuts();
            this.closeModal();
        });

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display !== 'none') {
                this.closeModal();
            }
        });
    }

    populateShortcutsList() {
        const list = document.getElementById('shortcuts-list');
        list.innerHTML = '';

        for (const [action, data] of Object.entries(this.shortcuts)) {
            const item = document.createElement('div');
            item.className = 'shortcut-item';

            const info = document.createElement('div');
            info.className = 'shortcut-info';

            const name = document.createElement('div');
            name.className = 'shortcut-name';
            name.textContent = this.formatActionName(action);

            const description = document.createElement('div');
            description.className = 'shortcut-description';
            description.textContent = data.description;

            info.appendChild(name);
            info.appendChild(description);

            const inputWrapper = document.createElement('div');
            inputWrapper.className = 'shortcut-input-wrapper';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'shortcut-input';
            input.value = data.keys;
            input.readOnly = true;
            input.dataset.action = action;

            input.addEventListener('click', () => {
                this.startRecording(input);
            });

            inputWrapper.appendChild(input);

            item.appendChild(info);
            item.appendChild(inputWrapper);
            list.appendChild(item);
        }
    }

    startRecording(input) {
        // Stop recording on any other input
        if (this.recordingInput && this.recordingInput !== input) {
            this.recordingInput.classList.remove('recording');
        }

        this.recordingInput = input;
        input.classList.add('recording');
        input.value = 'Press keys...';

        const recordKeys = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Ignore modifier keys alone
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
                return;
            }

            const keys = [];

            if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
            if (e.shiftKey) keys.push('Shift');
            if (e.altKey) keys.push('Alt');

            // Format key name
            let keyName = e.key;
            if (keyName === ' ') keyName = 'Space';
            if (keyName.length === 1) keyName = keyName.toUpperCase();

            // Special keys
            const specialKeys = {
                'ArrowUp': 'Up',
                'ArrowDown': 'Down',
                'ArrowLeft': 'Left',
                'ArrowRight': 'Right',
                'Enter': 'Enter',
                'Backspace': 'Backspace',
                'Delete': 'Delete',
                'Tab': 'Tab',
                'Escape': 'Escape'
            };

            if (specialKeys[keyName]) {
                keyName = specialKeys[keyName];
            }

            keys.push(keyName);

            const shortcut = keys.join('+');
            input.value = shortcut;

            // Update shortcuts object
            const action = input.dataset.action;
            this.shortcuts[action].keys = shortcut;

            // Stop recording
            input.classList.remove('recording');
            this.recordingInput = null;

            // Remove event listener
            document.removeEventListener('keydown', recordKeys);

            statusManager.setStatus(`Shortcut updated: ${this.formatActionName(action)} = ${shortcut}`, 'success');
        };

        // Add event listener for next keypress
        document.addEventListener('keydown', recordKeys, { once: true });
    }

    formatActionName(action) {
        // Convert camelCase to Title Case
        return action
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    loadShortcuts() {
        const saved = localStorage.getItem('keyboardShortcuts');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load shortcuts:', e);
                return { ...this.defaultShortcuts };
            }
        }
        return { ...this.defaultShortcuts };
    }

    saveShortcuts() {
        localStorage.setItem('keyboardShortcuts', JSON.stringify(this.shortcuts));
        statusManager.setStatus('Shortcuts saved successfully', 'success');

        // Notify the editor to update shortcuts
        if (window.cppEditor) {
            window.cppEditor.updateShortcuts(this.shortcuts);
        }
    }

    resetShortcuts() {
        if (confirm('Reset all shortcuts to default?')) {
            this.shortcuts = { ...this.defaultShortcuts };
            this.populateShortcutsList();
            this.saveShortcuts();
            statusManager.setStatus('Shortcuts reset to default', 'info');
        }
    }

    openModal() {
        this.modal.style.display = 'flex';
        this.populateShortcutsList(); // Refresh list
    }

    closeModal() {
        this.modal.style.display = 'none';
        if (this.recordingInput) {
            this.recordingInput.classList.remove('recording');
            this.recordingInput = null;
        }
    }

    getShortcut(action) {
        return this.shortcuts[action]?.keys || this.defaultShortcuts[action]?.keys;
    }

    getAllShortcuts() {
        return this.shortcuts;
    }
}

// Initialize shortcuts manager when DOM is ready
let shortcutsManager;
document.addEventListener('DOMContentLoaded', () => {
    shortcutsManager = new ShortcutsManager();
    window.shortcutsManager = shortcutsManager;
});
