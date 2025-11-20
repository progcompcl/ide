/*
 * Real C++ Compiler Worker
 * Uses actual wasm-clang binaries to compile C++ code
 */

// Global error handler
self.addEventListener('error', (event) => {
  console.error('[Worker] Unhandled error:', event.error);
  self.postMessage({
    type: 'error',
    data: `Worker error: ${event.error?.message || event.message}\nStack: ${event.error?.stack || ''}`
  });
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Worker] Unhandled rejection:', event.reason);
  self.postMessage({
    type: 'error',
    data: `Unhandled rejection: ${event.reason?.message || event.reason}\nStack: ${event.reason?.stack || ''}`
  });
});

// Detect BASE_URL from worker location
const workerLocation = self.location.href;
const BASE_URL = workerLocation.includes('/panda-edit/')
  ? workerLocation.substring(0, workerLocation.indexOf('/panda-edit/') + '/panda-edit'.length)
  : workerLocation.substring(0, workerLocation.lastIndexOf('/scripts/'));

console.log('[Worker] Detected BASE_URL from location:', BASE_URL);
console.log('[Worker] Worker location:', workerLocation);

console.log('[Worker] Loading real_shared.js...');
try {
  self.importScripts(`${BASE_URL}/scripts/real_shared.js`);
  console.log('[Worker] real_shared.js loaded successfully');
  console.log('[Worker] API available:', typeof API);
} catch (error) {
  console.error('[Worker] Failed to load real_shared.js:', error);
  self.postMessage({
    type: 'error',
    data: `Failed to load real_shared.js: ${error.message}`
  });
  throw error;
}

// Global variables that might be needed by App class
let canvas = null;
let ctx2d = null;

let api;
let compilerReady = false;

const apiOptions = {
  async readBuffer(filename) {
    // Add BASE_URL prefix if not already absolute
    const url = filename.startsWith('http') ? filename : `${BASE_URL}${filename}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename}: ${response.status}`);
    }
    return response.arrayBuffer();
  },

  async compileStreaming(filename) {
    // Add BASE_URL prefix if not already absolute
    const url = filename.startsWith('http') ? filename : `${BASE_URL}${filename}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename}: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return WebAssembly.compile(buffer);
  },

  hostWrite(s) {
    self.postMessage({
      type: 'output',
      data: s
    });
  }
};

// Initialize API
console.log('[Worker] Starting initialization with BASE_URL:', BASE_URL);
self.postMessage({ type: 'status', data: 'Initializing compiler...' });

try {
  api = new API(apiOptions);
  console.log('[Worker] API created, waiting for ready...');

  api.ready.then(() => {
    console.log('[Worker] Compiler ready!');

    // Add bits/stdc++.h for GCC compatibility
    try {
      api.memfs.addDirectory('include/bits');

      const stdcppContent = `// GCC compatibility header for Clang
// Based on https://gcc.gnu.org/onlinedocs/gcc-4.8.0/libstdc++/api/a01541_source.html
// Adapted for WebAssembly/WASI environment

// C++ standard library headers
#include <algorithm>
#include <array>
#include <bitset>
#include <complex>
#include <deque>
#include <exception>
#include <forward_list>
#include <functional>
#include <initializer_list>
#include <iomanip>
#include <ios>
#include <iosfwd>
#include <iostream>
#include <istream>
#include <iterator>
#include <limits>
#include <list>
#include <map>
#include <memory>
#include <new>
#include <numeric>
#include <ostream>
#include <queue>
#include <random>
#include <ratio>
#include <set>
#include <sstream>
#include <stack>
#include <stdexcept>
#include <streambuf>
#include <string>
#include <tuple>
#include <type_traits>
#include <typeindex>
#include <typeinfo>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <valarray>
#include <vector>

// C standard library headers (compatible with WASI)
#include <cassert>
#include <cctype>
#include <cerrno>
#include <cfloat>
#include <cinttypes>
#include <climits>
#include <cmath>
#include <cstdarg>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <ctime>
#include <cwchar>
#include <cwctype>

// Note: The following headers are excluded due to WASI/WebAssembly limitations:
// - <atomic>, <chrono>, <condition_variable>, <future>, <mutex>, <thread> (threading not supported)
// - <fstream>, <locale>, <regex> (limited file/system support)
// - <csetjmp>, <csignal>, <cfenv>, <clocale>, <cuchar>, <system_error> (OS-specific features)
`;

      api.memfs.addFile('include/bits/stdc++.h', stdcppContent);
      console.log('[Worker] Added bits/stdc++.h for GCC compatibility');
    } catch (error) {
      console.warn('[Worker] Failed to add bits/stdc++.h:', error);
    }

    compilerReady = true;
    self.postMessage({ type: 'status', data: 'Compiler ready!' });
    self.postMessage({ type: 'ready' });
  }).catch(error => {
    console.error('[Worker] Initialization failed:', error);
    self.postMessage({
      type: 'error',
      data: `Failed to initialize compiler: ${error.message}\nStack: ${error.stack}`
    });
  });
} catch (error) {
  console.error('[Worker] Error creating API:', error);
  self.postMessage({
    type: 'error',
    data: `Error creating API: ${error.message}\nStack: ${error.stack}`
  });
}

// Handle messages from main thread
self.onmessage = async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'compile':
      if (!compilerReady) {
        self.postMessage({
          type: 'error',
          data: 'Compiler not ready yet. Please wait...'
        });
        return;
      }

      try {
        self.postMessage({ type: 'status', data: 'Compiling...' });

        // Set stdin if provided
        if (data.stdin) {
          api.memfs.setStdinStr(data.stdin);
        } else {
          api.memfs.setStdinStr('');
        }

        const result = await api.compileLinkRun(data.code);
        self.postMessage({
          type: 'compiled',
          data: {
            success: true,
            stillRunning: result !== null
          }
        });
      } catch (error) {
        self.postMessage({
          type: 'compiled',
          data: {
            success: false,
            error: error.message
          }
        });
      }
      break;

    case 'compileToAssembly':
      if (!compilerReady) {
        self.postMessage({
          type: 'error',
          data: 'Compiler not ready yet'
        });
        return;
      }

      try {
        const asm = await api.compileToAssembly({
          input: 'input.cc',
          output: 'output.s',
          contents: data.code,
          triple: data.triple || 'x86_64',
          opt: data.opt || '2'
        });

        self.postMessage({
          type: 'assembly',
          data: new TextDecoder().decode(asm)
        });
      } catch (error) {
        self.postMessage({
          type: 'error',
          data: error.message
        });
      }
      break;

    default:
      self.postMessage({
        type: 'error',
        data: `Unknown message type: ${type}`
      });
  }
};
