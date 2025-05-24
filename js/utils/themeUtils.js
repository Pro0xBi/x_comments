// /Users/wangchenxu/Desktop/rp/vscode/twitter_comment/js/utils/themeUtils.js

(() => {
  // Helper function to apply the final theme class to the document root
  const applyFinalTheme = (theme) => {
    // Ensure we are targeting the correct document's root element
    const docElement = document.documentElement;
    if (!docElement) {
        console.error('[ThemeUtils] Cannot find document.documentElement');
        return;
    }
    docElement.classList.remove('theme-light', 'theme-dark');
    if (theme === 'dark') {
      docElement.classList.add('theme-dark');
    } else {
      docElement.classList.add('theme-light');
    }
    // ADD LOG: Verify class name immediately after adding
    console.log(`[ThemeUtils LOG] Class set, htmlElement.className: ${docElement.className}`); 

    console.log(`[ThemeUtils] Applied theme class: theme-${theme}`);
  };

  // Determines the final theme based on user choice and system preference
  const determineTheme = (userChoice) => {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let finalTheme = 'light'; // Default to light

    if (userChoice === 'dark') {
      finalTheme = 'dark';
    } else if (userChoice === 'light') {
      finalTheme = 'light';
    } else { // 'system' or null/undefined
      finalTheme = prefersDark ? 'dark' : 'light';
    }
    return finalTheme;
  };

  // --- Expose functions on the window object --- 
  // We attach it to window so scripts loaded later in different contexts (popup, options, content)
  // can access these utility functions.
  window.themeUtils = {
    applyFinalTheme,
    determineTheme,
    // We can add the determineAndApplyTheme convenience function here too
    determineAndApplyTheme: (userChoice) => {
        const finalTheme = determineTheme(userChoice);
        applyFinalTheme(finalTheme);
    }
  };

  console.log('[ThemeUtils] Theme utilities initialized and attached to window.themeUtils');

})(); // Immediately Invoked Function Expression (IIFE) to avoid polluting global scope further 