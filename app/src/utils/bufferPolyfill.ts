import { Buffer as BufferPolyfill } from 'buffer';

// Add Buffer to the global scope
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || BufferPolyfill;
}