// Shared utilities for the C++ editor

class FileManager {
    constructor() {
        this.currentFile = null;
        this.currentFileName = 'main.cpp';
        this.isDirty = false;
    }

    setCurrentFile(name, content) {
        this.currentFile = content;
        this.currentFileName = name;
        this.isDirty = false;
        this.updateFileInfo();
    }

    setContent(content) {
        this.currentFile = content;
        this.isDirty = true;
        this.updateFileInfo();
    }

    getContent() {
        return this.currentFile || this.getDefaultContent();
    }

    getFileName() {
        return this.currentFileName;
    }

    getDefaultContent() {
        return `
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;

    return 0;
}`;
    }

    updateFileInfo() {
        const fileInfo = document.querySelector('.file-info');
        if (fileInfo) {
            const dirtyIndicator = this.isDirty ? ' •' : '';
            fileInfo.textContent = `${this.currentFileName}${dirtyIndicator}`;
        }
    }
}

class StatusManager {
    constructor() {
        this.statusElement = document.getElementById('status');
    }

    setStatus(message, type = 'info') {
        if (this.statusElement) {
            this.statusElement.textContent = message;
            this.statusElement.className = type;
        }
    }

    clearStatus() {
        if (this.statusElement) {
            this.statusElement.textContent = '';
            this.statusElement.className = '';
        }
    }
}

class OutputManager {
    constructor() {
        this.output = '';
        this.system = '';
        this.outputLineCount = 0;
        this.systemLineCount = 0;
        this.maxLines = 10000;
        this.outputTerminated = false;
        this.systemTerminated = false;
        this.hasSystemMessages = false;
    }

    addOutput(text, type = 'normal') {
        // Check if this is actual program output or system/compiler messages
        if (this.isSystemMessage(text, type)) {
            this.addSystemMessage(text);
        } else {
            this.addProgramOutput(text);
        }
    }

    isSystemMessage(text, type) {
        // Explicit error/warning types
        if (type === 'error' || type === 'warning') {
            return true;
        }

        // Compiler/system message patterns
        const systemPatterns = [
            'Compiling',
            'clang -cc1',
            'wasm-ld',
            '/wasm/',
            'Loading compiler',
            'Compiler ready',
            'Initializing',
            'Linking',
            'Running',  // This should be last - after compilation
            'Program finished',
            'Compilation successful',
            'error:',
            'warning:',
            '✓',
            'done.',
            'Fetching'
        ];

        const lines = text.split('\n');
        return lines.some(line => {
            const trimmedLine = line.trim();
            return systemPatterns.some(pattern =>
                trimmedLine.includes(pattern) ||
                trimmedLine.startsWith(pattern) ||
                trimmedLine === pattern
            );
        });
    }

    // Check if this message indicates the program has started running
    isProgramRunning(text) {
        // No specific "Running" message is sent, so this method isn't used
        // We'll handle program start differently
        return false;
    }

    addProgramOutput(text) {
        if (this.outputTerminated) return;

        // The moment we get program output, switch to Output tab
        this.switchToOutputTab();

        const lines = text.split('\n');
        this.outputLineCount += lines.length;

        if (this.outputLineCount > this.maxLines) {
            this.outputTerminated = true;
            this.output += `${text}\n`;
            this.output += '\n❌ OUTPUT LIMIT EXCEEDED (10,000 lines)\n';
            this.output += 'Process terminated for security reasons.\n';
            this.updateOutputDisplay();
            return;
        }

        this.output += `${text}\n`;
        this.updateOutputDisplay();
    }

    addSystemMessage(text) {
        if (this.systemTerminated) return;

        // All system messages go to system tab by default
        this.switchToSystemTab();

        this.hasSystemMessages = true;

        const lines = text.split('\n');
        this.systemLineCount += lines.length;

        if (this.systemLineCount > this.maxLines) {
            this.systemTerminated = true;
            this.system += `${text}\n`;
            this.system += '\n❌ SYSTEM LIMIT EXCEEDED (10,000 lines)\n';
            this.updateSystemDisplay();
            return;
        }

        this.system += `${text}\n`;
        this.updateSystemDisplay();
    }

    clearOutput() {
        this.output = '';
        this.system = '';
        this.outputLineCount = 0;
        this.systemLineCount = 0;
        this.outputTerminated = false;
        this.systemTerminated = false;
        this.hasSystemMessages = false;
        this.updateOutputDisplay();
        this.updateSystemDisplay();
        this.switchToOutputTab(); // Always go back to output tab when clearing
    }

    startCompilation() {
        // Reset system message state and switch to output tab at start of compilation
        this.hasSystemMessages = false;
        this.system = ''; // Clear previous system messages
        this.systemLineCount = 0;
        this.systemTerminated = false;
        this.updateSystemDisplay();
        this.switchToOutputTab();
    }

    updateOutputDisplay() {
        const outputContent = document.querySelector('.output-content');
        if (outputContent) {
            outputContent.value = this.output;
            outputContent.scrollTop = outputContent.scrollHeight;
        }
    }

    updateSystemDisplay() {
        const systemContent = document.querySelector('.system-content');
        if (systemContent) {
            systemContent.value = this.system;
            systemContent.scrollTop = systemContent.scrollHeight;
        }
    }

    switchToOutputTab() {
        if (window.cppEditor && window.cppEditor.switchToTab) {
            window.cppEditor.switchToTab('output');
        }
    }

    switchToSystemTab() {
        if (window.cppEditor && window.cppEditor.switchToTab) {
            window.cppEditor.switchToTab('system');
        }
    }
}

// Utility functions
function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global instances
const fileManager = new FileManager();
const statusManager = new StatusManager();
const outputManager = new OutputManager();