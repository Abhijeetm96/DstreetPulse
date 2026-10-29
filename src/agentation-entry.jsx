import React from 'react';
import ReactDOM from 'react-dom/client';
import { Agentation } from 'agentation';

function initAgentation() {
  if (typeof document === 'undefined') return;
  let rootElement = document.getElementById('agentation-root');
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'agentation-root';
    document.body.appendChild(rootElement);
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    React.createElement(Agentation, {
      endpoint: 'http://localhost:4747',
      onAnnotationAdd: (ann) => {
        console.log('[Agentation] Annotation added:', ann);
      }
    })
  );
  console.log('[Agentation] Visual feedback widget mounted successfully.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAgentation);
} else {
  initAgentation();
}

