// REAL C++ Compiler using wasm-clang
// This uses actual Clang/LLD WebAssembly binaries

class CppCompiler {
    constructor() {
        this.worker = null;
        this.isReady = false;
        this.isCompiling = false;
        this.initWorker();
    }

    initWorker() {
        console.log('[CppCompiler] Initializing worker...');
        statusManager.setStatus('Loading C++ compiler...', 'warning');
        outputManager.addOutput('Loading compiler...');

        const baseUrl = window.BASE_URL || '/';
        console.log('[CppCompiler] Creating Worker from compiler_worker.js with base:', baseUrl);
        this.worker = new Worker(`${baseUrl}/scripts/compiler_worker.js`);
        console.log('[CppCompiler] Worker created');

        this.worker.onmessage = (event) => {
            const { type, data } = event.data;
            console.log('[CppCompiler] Worker message:', type, data);

            switch (type) {
                case 'ready':
                    console.log('[CppCompiler] Compiler is ready!');
                    this.isReady = true;
                    statusManager.setStatus('Compiler ready', 'success');
                    outputManager.clearOutput();
                    outputManager.addOutput('✓ Compiler ready');
                    break;

                case 'status':
                    console.log('[CppCompiler] Status:', data);
                    statusManager.setStatus(data, 'warning');
                    outputManager.addOutput(data);
                    break;

                case 'output':
                    // Output from compiler (stdout/stderr)
                    this.handleCompilerOutput(data);
                    break;

                case 'compiled':
                    this.isCompiling = false;
                    if (data.success) {
                        statusManager.setStatus('Compilation successful!', 'success');
                    } else {
                        statusManager.setStatus('Compilation failed', 'error');
                        outputManager.addOutput(`\n❌ Error: ${data.error}\n`, 'error');
                    }
                    break;


                case 'error':
                    console.error('[CppCompiler] Error from worker:', data);
                    this.isCompiling = false;
                    statusManager.setStatus('Error', 'error');
                    outputManager.addOutput(`\n❌ ${data}\n`, 'error');
                    break;
            }
        };

        this.worker.onerror = (error) => {
            this.isCompiling = false;
            statusManager.setStatus('Worker error', 'error');
            outputManager.addOutput(`\n❌ Worker error: ${error.message}\n`, 'error');
            console.error('Worker error:', error);
        };
    }

    handleCompilerOutput(text) {
        // Parse ANSI color codes and format output
        const lines = text.split('\n');
        const annotations = [];

        for (const line of lines) {
            if (!line.trim()) continue;

            // Parse error/warning locations: file.cpp:line:col: error/warning: message
            const match = line.match(/^(.+?):(\d+):(\d+):\s*(error|warning):\s*(.+)$/);
            if (match) {
                const [, file, lineNum, col, type, message] = match;
                const row = parseInt(lineNum) - 1; // Ace uses 0-based line numbers

                annotations.push({
                    row: row,
                    column: parseInt(col),
                    text: message,
                    type: type === 'error' ? 'error' : 'warning'
                });
            }

            // Detect error lines
            if (line.includes('error:')) {
                outputManager.addOutput(this.stripAnsi(line), 'error');
            }
            // Detect warning lines
            else if (line.includes('warning:')) {
                outputManager.addOutput(this.stripAnsi(line), 'warning');
            }
            // Detect success/info lines
            else if (line.includes('✓') || line.includes('done') || line.includes('Compilation successful')) {
                outputManager.addOutput(this.stripAnsi(line), 'success');
            }
            // Normal output
            else {
                outputManager.addOutput(this.stripAnsi(line));
            }
        }

        // Add annotations to the editor
        if (annotations.length > 0 && window.cppEditor && window.cppEditor.editor) {
            window.cppEditor.editor.session.setAnnotations(annotations);
        }
    }

    stripAnsi(str) {
        // Remove ANSI escape codes
        return str.replace(/\x1b\[[0-9;]*m/g, '');
    }

    async compileAndRun(sourceCode, filename = 'main.cpp', stdin = '') {
        if (!this.isReady) {
            outputManager.addOutput('⚠️  Compiler not ready, please wait...');
            statusManager.setStatus('Compiler not ready', 'warning');
            return false;
        }

        if (this.isCompiling) {
            outputManager.addOutput('⚠️  Compilation in progress...');
            return false;
        }

        this.isCompiling = true;

        // Clear previous output and error markers
        outputManager.clearOutput();
        outputManager.addOutput(`Compiling ${filename}...`);

        // Clear previous error markers
        if (window.cppEditor && window.cppEditor.editor) {
            window.cppEditor.editor.session.clearAnnotations();
        }

        // Send code to worker
        this.worker.postMessage({
            type: 'compile',
            data: {
                code: sourceCode,
                filename: filename,
                stdin: stdin
            }
        });

        return true;
    }

    async compileToAssembly(sourceCode, options = {}) {
        if (!this.isReady) {
            outputManager.addOutput('Compiler not ready yet', 'warning');
            return false;
        }

        outputManager.clearOutput();
        outputManager.addOutput('Compiling to assembly...\n');

        this.worker.postMessage({
            type: 'compileToAssembly',
            data: {
                code: sourceCode,
                triple: options.triple || 'x86_64',
                opt: options.opt || '2'
            }
        });

        return true;
    }

    reset() {
        if (this.worker) {
            this.worker.terminate();
            this.initWorker();
        }
    }

    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}

// Global compiler instance
window.cppCompiler = new CppCompiler();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.cppCompiler) {
        window.cppCompiler.terminate();
    }
});
