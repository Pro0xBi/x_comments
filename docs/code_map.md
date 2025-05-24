# Code Map for twitter_comment

This document outlines the file and directory structure of the `twitter_comment` Chrome extension, located at `/Users/wangchenxu/Desktop/rp/twitter_comment`.

## Project Root

*   `.DS_Store`
*   `.gitignore`
*   `LICENSE`
*   `README.md`
*   `background.js`
*   `manifest.json`
*   `options.html`

### `docs/`
*   `.DS_Store`
*   `code_map.md` (This file)

### `icons/`
*   `.DS_Store`
*   `icon16.png`
*   `icon48.png`
*   `icon128.png`

### `import_roles/`
*   `Ponzi.json`
*   `buidl_role.json`
*   `dark_forest_hunter.json`
*   `deep_insight_analyst.json`
*   `meme_hunter.json`
*   `tieba_troll.json`

### `js/`
*   `content.js`
*   `options.js`
*   **`components/`**
    *   **`BackgroundInfo/`**
        *   `BackgroundInfo.js`
    *   **`CustomPromptEditor/`**
        *   `CustomPromptEditor.js`
        *   `constants.js`
        *   `index.js`
    *   **`RoleSelector/`**
        *   `RoleButton.js`
        *   `RoleSelector.js`
        *   `index.js`
    *   **`UserRoleSelector/`**
        *   `UserRoleSelector.js`
    *   **`base/`**
        *   `UIComponent.js`
        *   `UIComponentFactory.js`
    *   **`marker/`**
        *   `AnalyzeButton.js`
        *   `AuthorComponent.js`
        *   `MarkerComponent.js`
        *   `analyze-button-constants.js`
    *   **`modal/`**
        *   `ModalComponent.js`
    *   **`tabs/`**
        *   `TabButtonComponent.js`
        *   `TabComponent.js`
        *   `TabListComponent.js`
        *   `TabPanelComponent.js`
        *   `index.js`
*   **`config/`**
    *   `rolesConfig.js`
*   **`core/`**
    *   `eventHandlers.js`
    *   `initializer.js`
    *   `messageHandler.js`
    *   `stateManager.js`
*   **`services/`**
    *   `AIService.js`
    *   **`core/`**
        *   `EventManager.js`
        *   `ServiceContainer.js`
    *   **`data/`**
        *   `EnhancedDataExtractor.js`
    *   **`options/`**
        *   `apiConfigManager.js`
    *   **`ui/`**
        *   **`marker-content-manager/`**
            *   `index.js`
*   **`utils/`**
    *   `SafeMarkdown.js`
    *   `SimpleMarkdown.js`
    *   `domUtils.js`
    *   `themeUtils.js`
    *   **`crypto/`**
        *   `cryptoUtils.js`

### `popup/`
*   `popup.html`
*   `popup.js`

### `styles/`
*   `animations.css`
*   `global.css`
*   `options.css`
*   `popup.css`
*   `rp.code-workspace`
*   `themes.css`
*   **`components/`**
    *   `analyze-button.css`
    *   `background-info.css`
    *   `custom-prompt-editor.css`
    *   `marker.css`
    *   `marker-content-manager.css`
    *   `modal.css`
    *   `role-button.css`
    *   `role-selector.css`
    *   `tab-button.css`
    *   `tab-panel.css`
    *   `tabs.css`
    *   `toggle-switch.css`
