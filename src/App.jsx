import React from "react";
import { Agentation } from "agentation";

/**
 * Main Application Component with Agentation Visual Feedback Integration
 *
 * Usage:
 * - The toolbar appears in the bottom-right corner during development.
 * - Click the toolbar button to activate the annotation mode.
 * - Click, drag, or select text on any element to annotate it.
 * - Annotations are automatically synchronized with the connected Agentation MCP server.
 */
export function App() {
  return (
    <>
      <YourApp />
      {process.env.NODE_ENV === "development" && (
        <Agentation endpoint="http://localhost:4747" />
      )}
    </>
  );
}

function YourApp() {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f8fafc]">
      {/* Indian Equity Swing Trading Intelligence System */}
      <iframe
        src="http://localhost:3000"
        title="Breakout Radar Dashboard"
        className="w-full h-screen border-none"
      />
    </div>
  );
}

export default App;

