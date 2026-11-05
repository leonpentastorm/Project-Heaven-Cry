import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import PD from './game/protodata.json';

// The prototypes' shared CSS (keyframes, icon hover zoom, reduced motion), from design/canvas-build/build.py HELMET.
const style = document.createElement('style');
style.textContent = 'body{margin:0;background:#0A0D13;color:#E7EBF3;font-family:\'Chakra Petch\',sans-serif}*{box-sizing:border-box}button:disabled{cursor:not-allowed!important;opacity:.55}' + (PD as any).helmetCss;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(<App />);
