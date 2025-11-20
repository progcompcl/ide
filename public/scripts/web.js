// Main application logic for the C++ Editor

class CppEditor {
    constructor() {
        this.editor = null;
        this.layout = null;
        this.terminal = null;
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        this.setupLayout();
        this.setupEditor();
        this.setupEventListeners();
        this.setupTerminal();

        // Load saved content from localStorage or default
        const savedCode = localStorage.getItem('cpp_editor_code');
        const content = savedCode || fileManager.getDefaultContent();
        this.editor.setValue(content, -1);
        fileManager.setContent(content);

        this.isInitialized = true;
        console.log('C++ Editor initialized successfully');
    }

    setupLayout() {
        const layoutContainer = document.getElementById('layout');

        // Create split pane layout
        const splitPane = document.createElement('div');
        splitPane.className = 'split-pane';

        // Editor pane
        const editorPane = document.createElement('div');
        editorPane.className = 'editor-pane';

        // File info bar
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.textContent = fileManager.getFileName();

        // Editor container
        const editorContainer = document.createElement('div');
        editorContainer.id = 'editor';
        editorContainer.style.height = 'calc(100% - 25px)';

        editorPane.appendChild(fileInfo);
        editorPane.appendChild(editorContainer);

        // Resizer
        const resizer = document.createElement('div');
        resizer.className = 'resizer';

        // Output pane
        const outputPane = document.createElement('div');
        outputPane.className = 'output-pane';

        // Input section (arriba)
        const inputSection = document.createElement('div');
        inputSection.className = 'input-section';

        const inputHeader = document.createElement('div');
        inputHeader.className = 'input-header';
        inputHeader.textContent = 'Input (stdin)';

        const stdinTextarea = document.createElement('textarea');
        stdinTextarea.className = 'stdin-input';
        stdinTextarea.id = 'stdin-input';
        stdinTextarea.placeholder = 'Paste or type standard input here...\n\nExample:\nJohn\n25\nHello World';

        // Load saved stdin from localStorage
        const savedStdin = localStorage.getItem('cpp_editor_stdin');
        if (savedStdin) {
            stdinTextarea.value = savedStdin;
        }

        // Auto-save stdin to localStorage on input
        stdinTextarea.addEventListener('input', debounce(() => {
            localStorage.setItem('cpp_editor_stdin', stdinTextarea.value);
        }, 300));

        inputSection.appendChild(inputHeader);
        inputSection.appendChild(stdinTextarea);

        // Internal resizer entre Input y Output
        const internalResizer = document.createElement('div');
        internalResizer.className = 'internal-resizer';

        // Output section (abajo) - con pestañas como headers
        const outputSection = document.createElement('div');
        outputSection.className = 'output-section';

        // Output tabs (ahora funcionan como headers)
        const outputTabs = document.createElement('div');
        outputTabs.className = 'output-tabs';

        const outputTab = document.createElement('div');
        outputTab.className = 'output-tab active';
        outputTab.textContent = 'Output';
        outputTab.dataset.tab = 'output';

        const errorTab = document.createElement('div');
        errorTab.className = 'output-tab';
        errorTab.textContent = 'System';
        errorTab.dataset.tab = 'system';

        outputTabs.appendChild(outputTab);
        outputTabs.appendChild(errorTab);

        // Tab panels container
        const tabPanels = document.createElement('div');
        tabPanels.className = 'tab-panels';

        // Output panel (sin header separado)
        const outputPanel = document.createElement('div');
        outputPanel.className = 'tab-panel active';
        outputPanel.dataset.panel = 'output';

        const outputContent = document.createElement('textarea');
        outputContent.className = 'output-content';
        outputContent.readOnly = true;
        outputContent.spellcheck = false;
        outputContent.autocomplete = 'off';
        outputContent.autocorrect = 'off';
        outputContent.autocapitalize = 'off';

        outputPanel.appendChild(outputContent);

        // System panel (sin header separado)
        const systemPanel = document.createElement('div');
        systemPanel.className = 'tab-panel';
        systemPanel.dataset.panel = 'system';

        const systemContent = document.createElement('textarea');
        systemContent.className = 'system-content';
        systemContent.readOnly = true;
        systemContent.spellcheck = false;
        systemContent.autocomplete = 'off';
        systemContent.autocorrect = 'off';
        systemContent.autocapitalize = 'off';

        systemPanel.appendChild(systemContent);

        tabPanels.appendChild(outputPanel);
        tabPanels.appendChild(systemPanel);

        outputSection.appendChild(outputTabs);
        outputSection.appendChild(tabPanels);

        outputPane.appendChild(inputSection);
        outputPane.appendChild(internalResizer);
        outputPane.appendChild(outputSection);

        // Setup internal resizer
        this.setupInternalResizer(internalResizer, inputSection, outputSection);

        splitPane.appendChild(editorPane);
        splitPane.appendChild(resizer);
        splitPane.appendChild(outputPane);

        layoutContainer.appendChild(splitPane);

        // Setup resizer functionality
        this.setupResizer(resizer, editorPane, outputPane);

        // Setup tab switching
        this.setupTabs(outputTabs, tabPanels);
    }

    setupResizer(resizer, editorPane, rightPane) {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = rightPane.offsetWidth;
            resizer.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const diff = startX - e.clientX;
            const newWidth = startWidth + diff;

            // Enforce min/max widths
            const minWidth = 200;
            const maxWidth = window.innerWidth - 300;

            if (newWidth >= minWidth && newWidth <= maxWidth) {
                rightPane.style.flex = `0 0 ${newWidth}px`;

                // Trigger editor resize
                if (this.editor) {
                    this.editor.resize();
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizer.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

  setupInternalResizer(internalResizer, inputSection, outputSection) {
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    internalResizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = outputSection.offsetHeight;
        internalResizer.classList.add('resizing');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        e.stopPropagation(); // Evitar conflicto con el resizer principal
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const containerRect = outputSection.parentElement.getBoundingClientRect();
        const relativeY = e.clientY - containerRect.top;
        const newInputHeight = Math.max(50, relativeY - 5); // Solo mínimo 50px, sin máximo

        inputSection.style.flex = `0 0 ${newInputHeight}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            internalResizer.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
  }

  setupTabs(outputTabs, tabPanels) {
    const tabs = outputTabs.querySelectorAll('.output-tab');
    const panels = tabPanels.querySelectorAll('.tab-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetPanel = tab.dataset.tab;

        // Remove active class from all tabs and panels
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        // Add active class to clicked tab and corresponding panel
        tab.classList.add('active');
        const panel = tabPanels.querySelector(`[data-panel="${targetPanel}"]`);
        if (panel) {
          panel.classList.add('active');
        }
      });
    });
  }

  switchToTab(tabName) {
    const tabs = document.querySelectorAll('.output-tab');
    const panels = document.querySelectorAll('.tab-panel');

    // Remove active class from all tabs and panels
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));

    // Add active class to target tab and panel
    const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
    const targetPanel = document.querySelector(`[data-panel="${tabName}"]`);

    if (targetTab && targetPanel) {
      targetTab.classList.add('active');
      targetPanel.classList.add('active');
    }
  }

    setupEditor() {
        this.editor = ace.edit('editor');

        // Configure editor
        this.editor.setTheme('ace/theme/twilight');
        this.editor.session.setMode('ace/mode/c_cpp');
        this.editor.setOptions({
            enableBasicAutocompletion: true,
            enableSnippets: true,
            enableLiveAutocompletion: true,
            fontSize: 14,
            showPrintMargin: true,
            printMarginColumn: 80,
            wrap: false,
            tabSize: 4,
            useSoftTabs: true,
            navigateWithinSoftTabs: false,
            hScrollBarAlwaysVisible: false,
            vScrollBarAlwaysVisible: false
        });

        // Ensure Tab key works properly for indentation
        this.editor.commands.removeCommand('indent');
        this.editor.commands.addCommand({
            name: 'customIndent',
            bindKey: { win: 'Tab', mac: 'Tab' },
            exec: function(editor) {
                if (editor.selection.isEmpty()) {
                    editor.indent();
                } else {
                    editor.blockIndent();
                }
            }
        });

        this.editor.commands.removeCommand('outdent');
        this.editor.commands.addCommand({
            name: 'customOutdent',
            bindKey: { win: 'Shift-Tab', mac: 'Shift-Tab' },
            exec: function(editor) {
                editor.blockOutdent();
            }
        });

        // Setup auto-save
        this.editor.session.on('change', debounce(() => {
            fileManager.setContent(this.editor.getValue());
        }, 300));

        // Setup keyboard shortcuts (will be loaded from shortcuts manager)
        this.registerShortcuts();
    }

    registerShortcuts() {
        // Wait for shortcuts manager to be ready
        const setupShortcuts = () => {
            if (!window.shortcutsManager) {
                setTimeout(setupShortcuts, 100);
                return;
            }

            const shortcuts = window.shortcutsManager.getAllShortcuts();

            // Register each shortcut with Ace editor
            const shortcutActions = {
                // Run commands
                'run': () => this.runCode(),
                'runWithoutDebug': () => this.runCode(),

                // File operations
                'save': () => {
                    // Save to localStorage
                    const content = this.editor.getValue();
                    fileManager.setContent(content);
                    localStorage.setItem('cpp_editor_code', content);
                    localStorage.setItem('cpp_editor_saved_at', new Date().toISOString());
                    statusManager.setStatus('File saved', 'success');
                },
                'open': () => document.getElementById('openInput').click(),
                'quickOpen': () => document.getElementById('openInput').click(),

                // Edit operations (most are built into Ace)
                'undo': () => this.editor.undo(),
                'redo': () => this.editor.redo(),
                'cut': () => {
                    // If no selection, cut entire line instantly (like VS Code)
                    if (this.editor.getSelectedText().length === 0) {
                        const cursor = this.editor.getCursorPosition();
                        const line = cursor.row;
                        const lineText = this.editor.session.getLine(line);

                        // Copy to clipboard
                        navigator.clipboard.writeText(lineText + '\n');

                        // Remove the line
                        this.editor.session.remove({
                            start: { row: line, column: 0 },
                            end: { row: line + 1, column: 0 }
                        });
                    } else {
                        // Copy selected text to system clipboard, then delete
                        const selectedText = this.editor.getSelectedText();
                        navigator.clipboard.writeText(selectedText).then(() => {
                            this.editor.session.replace(this.editor.getSelectionRange(), '');
                        });
                    }
                },
                'copy': () => {
                    // If no selection, copy entire line (like VS Code)
                    if (this.editor.getSelectedText().length === 0) {
                        const cursor = this.editor.getCursorPosition();
                        const line = cursor.row;
                        const lineText = this.editor.session.getLine(line);

                        // Copy to clipboard with newline
                        navigator.clipboard.writeText(lineText + '\n');
                    } else {
                        // Copy selected text to system clipboard
                        navigator.clipboard.writeText(this.editor.getSelectedText());
                    }
                },
                'paste': () => {
                    // Paste from system clipboard
                    navigator.clipboard.readText().then(text => {
                        this.editor.insert(text);
                    }).catch(err => {
                        // Fallback to Ace's built-in paste if clipboard access fails
                        console.warn('Clipboard access denied, using fallback:', err);
                        this.editor.execCommand('paste');
                    });
                },
                'selectAll': () => this.editor.selectAll(),

                // Line operations
                'toggleComment': () => this.editor.toggleCommentLines(),
                'duplicateLineDown': () => this.editor.copyLinesDown(),
                'duplicateLineUp': () => this.editor.copyLinesUp(),
                'moveLinesDown': () => this.editor.moveLinesDown(),
                'moveLinesUp': () => this.editor.moveLinesUp(),
                'deleteLine': () => this.editor.removeLines(),
                'insertLineBelow': () => {
                    this.editor.navigateLineEnd();
                    this.editor.insert('\n');
                },
                'insertLineAbove': () => {
                    this.editor.navigateLineStart();
                    this.editor.insert('\n');
                    this.editor.navigateUp(1);
                },

                // Code formatting
                'format': () => this.formatCode(),
                'indent': () => this.editor.blockIndent(),
                'outdent': () => this.editor.blockOutdent(),

                // Search and navigation
                'find': () => this.editor.execCommand('find'),
                'replace': () => this.editor.execCommand('replace'),
                'findNext': () => this.editor.findNext(),
                'findPrevious': () => this.editor.findPrevious(),
                'goToLine': () => {
                    const line = prompt('Go to line:');
                    if (line) this.editor.gotoLine(parseInt(line) || 1);
                },

                // Selection (these are mostly handled by Ace natively)
                'selectLineDown': () => this.editor.execCommand('selectdown'),
                'selectLineUp': () => this.editor.execCommand('selectup'),
                'selectWordRight': () => this.editor.execCommand('selectwordright'),
                'selectWordLeft': () => this.editor.execCommand('selectwordleft'),
                'selectToLineEnd': () => this.editor.execCommand('selectlineend'),
                'selectToLineStart': () => this.editor.execCommand('selectlinestart'),
                'expandSelection': () => this.editor.execCommand('expandtoline'),

                // Cursor movement
                'cursorWordLeft': () => this.editor.navigateWordLeft(),
                'cursorWordRight': () => this.editor.navigateWordRight(),
                'cursorLineStart': () => this.editor.navigateLineStart(),
                'cursorLineEnd': () => this.editor.navigateLineEnd(),
                'cursorTop': () => this.editor.navigateFileStart(),
                'cursorBottom': () => this.editor.navigateFileEnd(),

                // Multi-cursor
                'addCursorAbove': () => this.editor.execCommand('addCursorAbove'),
                'addCursorBelow': () => this.editor.execCommand('addCursorBelow'),
                'selectNextOccurrence': () => this.editor.execCommand('selectMoreAfter')
            };

            for (const [action, exec] of Object.entries(shortcutActions)) {
                if (shortcuts[action]) {
                    const keys = this.convertToAceFormat(shortcuts[action].keys);
                    this.editor.commands.addCommand({
                        name: action,
                        bindKey: keys,
                        exec: exec
                    });
                }
            }
        };

        setupShortcuts();
    }

    convertToAceFormat(keys) {
        // Convert "Ctrl+S" format to Ace's "Ctrl-S" format
        let aceKeys = keys.replace(/\+/g, '-');

        // Convert Ctrl to Cmd for Mac
        const winKeys = aceKeys;
        const macKeys = aceKeys.replace(/Ctrl/g, 'Cmd').replace(/Alt/g, 'Option');

        return { win: winKeys, mac: macKeys };
    }

    updateShortcuts(shortcuts) {
        // Remove all existing commands
        const commandNames = Object.keys(shortcuts);
        commandNames.forEach(name => {
            this.editor.commands.removeCommand(name);
        });

        // Re-register shortcuts
        this.registerShortcuts();
    }

    setupEventListeners() {
        // Run button
        document.getElementById('run').addEventListener('click', () => {
            this.runCode();
        });

        document.getElementById('openInput').addEventListener('change', (e) => {
            this.openFile(e.target.files[0]);
        });

        // Setup status indicators
        this.setupStatusIndicators();

        // Prevent Tab from changing focus when inside the editor
        document.getElementById('editor').addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
            }
        });

        // Global keyboard shortcuts that work outside editor
        document.addEventListener('keydown', (e) => {
            // Prevent default browser shortcuts that conflict
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'F5')) {
                e.preventDefault();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
            }
            // Prevent Ctrl+S from saving the page
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                // The shortcut system will handle the save action
            }
        });
    }

    setupStatusIndicators() {
        // Update status display
        const originalSetStatus = statusManager.setStatus;
        statusManager.setStatus = (message, type = 'info') => {
            const indicator = document.getElementById('status-indicator');
            const text = document.getElementById('status-text');

            // Update indicator
            indicator.className = 'status-indicator';
            if (type === 'error') {
                indicator.classList.add('error');
            } else if (type === 'warning') {
                indicator.classList.add('warning');
            } else if (type === 'success') {
                indicator.classList.add('success');
            }

            // Update text
            text.textContent = message;

            // Call original method
            return originalSetStatus.call(statusManager, message, type);
        };
    }

    setupTerminal() {
        // This would setup xterm.js if needed for more advanced terminal features
        // For now, we use the simpler output display
    }

    async runCode() {
        if (!this.isInitialized) return;

        const code = this.editor.getValue();
        const filename = fileManager.getFileName();

        // Get stdin input
        const stdinInput = document.getElementById('stdin-input');
        const stdin = stdinInput ? stdinInput.value : '';

        // Auto-save to localStorage on run
        localStorage.setItem('cpp_editor_code', code);
        localStorage.setItem('cpp_editor_saved_at', new Date().toISOString());

        await cppCompiler.compileAndRun(code, filename, stdin);
    }

    clearOutput() {
        outputManager.clearOutput();
        statusManager.clearStatus();
    }

    async openFile(file) {
        if (!file) return;
        
        try {
            const content = await readFile(file);
            this.editor.setValue(content, -1);
            fileManager.setCurrentFile(file.name, content);
            
            statusManager.setStatus(`Opened ${file.name}`, 'info');
        } catch (error) {
            statusManager.setStatus(`Failed to open file: ${error.message}`, 'error');
        }
    }

    save() {
        const content = this.editor.getValue();
        const filename = fileManager.getFileName();
        
        downloadFile(content, filename);
        fileManager.setContent(content); // Mark as not dirty
        statusManager.setStatus(`Saved ${filename}`, 'info');
    }

    reset() {
        cppCompiler.reset();
        this.editor.setValue(fileManager.getDefaultContent(), -1);
        fileManager.setCurrentFile('main.cpp', fileManager.getDefaultContent());
        
        // Disable run button
        document.getElementById('run').disabled = false;
        
        statusManager.setStatus('Editor reset', 'info');
    }

    // Additional utility methods
    formatCode() {
        // Basic C++ code formatting
        const code = this.editor.getValue();
        const formatted = this.basicCppFormat(code);
        this.editor.setValue(formatted, -1);
        statusManager.setStatus('Code formatted', 'info');
    }

    basicCppFormat(code) {
        // Very basic formatting - in a real editor you'd use clang-format
        let lines = code.split('\n');
        let indentLevel = 0;
        const indentSize = 4;
        
        lines = lines.map(line => {
            let trimmed = line.trim();
            if (!trimmed) return '';
            
            // Decrease indent for closing braces
            if (trimmed.startsWith('}')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            let formatted = ' '.repeat(indentLevel * indentSize) + trimmed;
            
            // Increase indent for opening braces
            if (trimmed.endsWith('{')) {
                indentLevel++;
            }
            
            return formatted;
        });
        
        return lines.join('\n');
    }

    insertSnippet(snippet) {
        this.editor.insert(snippet);
        this.editor.focus();
    }

    gotoLine(line) {
        this.editor.gotoLine(line);
        this.editor.focus();
    }

    find(searchTerm) {
        this.editor.find(searchTerm);
    }

    replace(searchTerm, replaceTerm) {
        this.editor.replace(replaceTerm);
    }
}

// Initialize the editor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.cppEditor = new CppEditor();
});

// Add some useful C++ snippets
const cppSnippets = {
    'main': `int main() {
    
    return 0;
}`,
    'include': '#include <iostream>',
    'cout': 'cout << "" << endl;',
    'cin': 'cin >> ;',
    'for': `for (int i = 0; i < ; i++) {
    
}`,
    'if': `if () {
    
}`,
    'while': `while () {
    
}`,
    'function': `int functionName() {
    
    return 0;
}`
};

// Expose snippets globally for potential future use
window.cppSnippets = cppSnippets;