// js/services/options/apiConfigManager.js
const LMS_STORAGE_KEY = '_localMasterSecret_'; // 与 background.js 中一致

const ApiConfigManager = (() => {
    const STORAGE_KEY = 'apiConfigs';
    let localEventManager = null; // <-- ADDED

    // --- Private Helper Functions ---

    const _getLMS = async () => {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get([LMS_STORAGE_KEY], (result) => {
                if (chrome.runtime.lastError) {
                    console.error('[ApiConfigManager] Error loading LMS:', chrome.runtime.lastError);
                    return reject(new Error('Failed to load Local Master Secret.'));
                }
                const lms = result[LMS_STORAGE_KEY];
                if (!lms) {
                    console.error('[ApiConfigManager] CRITICAL: Local Master Secret not found in storage. Encryption/Decryption will fail. The extension might need to be re-initialized (e.g. re-enabled or re-installed if background script did not run).');
                    return reject(new Error('Local Master Secret is missing. Please ensure the extension is initialized correctly.'));
                }
                resolve(lms);
            });
        });
    };

    const _getConfigs = () => {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get([STORAGE_KEY], (result) => {
                if (chrome.runtime.lastError) {
                    console.error('Error loading API configs from local storage:', chrome.runtime.lastError);
                    return reject(chrome.runtime.lastError);
                }
                resolve(result[STORAGE_KEY] || []);
            });
        });
    };

    const _saveConfigs = (configs) => {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ [STORAGE_KEY]: configs }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error saving API configs to local storage:', chrome.runtime.lastError);
                    return reject(chrome.runtime.lastError);
                }
                resolve();
            });
        });
    };

    // --- Public API ---
    return {
        /**
         * 加载所有 API 配置 (用于显示列表)。
         * @returns {Promise<Array<Object>>} Promise resolved with the array of configs (key is NOT decrypted).
         */
        loadConfigsForDisplay: async () => {
            try {
                const configs = await _getConfigs();
                return configs;
            } catch (error) {
                console.error("[ApiConfigManager] Failed to load configs for display:", error);
                return [];
            }
        },

        /**
         * 保存一个 API 配置 (新增或编辑)。
         * Handles encryption.
         * @param {Object} configData - The config data { id?, name, provider, apiKey (plaintext), isActive? }.
         * @returns {Promise<void>}
         */
        saveConfig: async (configData) => {
            if (!configData.name || !configData.provider || !configData.apiKey) {
                throw new Error("Missing required fields (name, provider, apiKey).");
            }
            if (typeof CryptoUtils === 'undefined' || typeof CryptoUtils.encrypt !== 'function') {
                 throw new Error("CryptoUtils.encrypt is not available. Check script load order.");
            }

            const lms = await _getLMS();
            const newEncryptedApiKeyPackage = await CryptoUtils.encrypt(configData.apiKey, lms);
            const configs = await _getConfigs();
            const now = Date.now();

            if (configData.id) { // Edit existing
                const index = configs.findIndex(c => c.id === configData.id);
                if (index !== -1) {
                    configs[index] = {
                        ...configs[index],
                        name: configData.name,
                        provider: configData.provider,
                        encryptedApiKey: newEncryptedApiKeyPackage,
                        updatedAt: now,
                    };
                    delete configs[index].key; // Ensure no old top-level key artifact remains
                    if (configs[index].encryptedApiKey && configs[index].encryptedApiKey.key !== undefined) {
                         delete configs[index].encryptedApiKey.key; // Ensure no nested old key artifact remains
                    }
                } else {
                     throw new Error(`Config with ID ${configData.id} not found for editing.`);
                }
            } else { // Add new
                const newConfig = {
                    id: `api-${now}-${Math.random().toString(16).slice(2)}`,
                    name: configData.name,
                    provider: configData.provider,
                    encryptedApiKey: newEncryptedApiKeyPackage,
                    isActive: false,
                    createdAt: now,
                    updatedAt: now,
                };
                configs.push(newConfig);
            }

            await _saveConfigs(configs);
            localEventManager?.publish('config:updated', { 
                source: 'ApiConfigManager', 
                action: configData.id ? 'updated' : 'added',
                configId: configData.id || configs[configs.length - 1].id
            });
        },

        /**
         * 根据 ID 获取用于编辑的 API 配置。
         * Handles decryption.
         * @param {string} id - The ID of the config to retrieve.
         * @returns {Promise<Object|null>} Promise resolved with the config data (apiKey is decrypted plaintext) or null if not found.
         */
        getConfigForEdit: async (id) => {
             if (typeof CryptoUtils === 'undefined' || typeof CryptoUtils.decrypt !== 'function' || typeof CryptoUtils.isEncrypted !== 'function') {
                 throw new Error("CryptoUtils decrypt/isEncrypted is not available. Check script load order.");
             }
            const lms = await _getLMS();
            try {
                let configs = await _getConfigs(); // Use let to allow modification for save
                const configIndex = configs.findIndex(c => c.id === id);
                if (configIndex === -1) {
                    return null;
                }
                
                let configToEdit = { ...configs[configIndex] }; // Work with a copy for modification before returning
                let apiKey = '';
                let needsSaveAfterMigration = false;

                if (configToEdit.encryptedApiKey && CryptoUtils.isEncrypted(configToEdit.encryptedApiKey)) {
                    const isOldFormatEncrypted = !!configToEdit.encryptedApiKey.key;

                    if (isOldFormatEncrypted) {
                        console.warn(`[ApiConfigManager] Config ID ${id} is in OLD encrypted format. Migrating...`);
                        const plaintextApiKey = await CryptoUtils.decrypt(configToEdit.encryptedApiKey, null);
                        const newEncryptedPackage = await CryptoUtils.encrypt(plaintextApiKey, lms);
                        
                        configToEdit.encryptedApiKey = newEncryptedPackage;
                        apiKey = plaintextApiKey;
                        configs[configIndex] = { ...configToEdit }; // Update the object in the array for saving
                        needsSaveAfterMigration = true;
                    } else {
                        apiKey = await CryptoUtils.decrypt(configToEdit.encryptedApiKey, lms);
                    }
                } else if (configToEdit.apiKey && typeof configToEdit.apiKey === 'string') { // Plaintext old format
                    console.warn(`[ApiConfigManager] Config ID ${id} is in PLAINTEXT format. Encrypting and migrating...`);
                    apiKey = configToEdit.apiKey;
                    const newEncryptedPackage = await CryptoUtils.encrypt(apiKey, lms);
                    
                    configToEdit.encryptedApiKey = newEncryptedPackage;
                    delete configToEdit.apiKey; 
                    configs[configIndex] = { ...configToEdit };
                    needsSaveAfterMigration = true;
                } else {
                    console.warn(`[ApiConfigManager] Config ID ${id} has no apiKey or encryptedApiKey to decrypt.`);
                }
                
                if (needsSaveAfterMigration) {
                    await _saveConfigs(configs);
                    console.log(`[ApiConfigManager] Config ID ${id} migrated to new encryption format and saved.`);
                }
                
                return { ...configToEdit, apiKey: apiKey }; // Return a copy with decrypted apiKey
            } catch (error) {
                 console.error(`[ApiConfigManager] Failed to get/decrypt/migrate config for edit (ID: ${id}):`, error);
                 throw error;
            }
        },

        /**
         * 根据 ID 删除 API 配置。
         * @param {string} id - The ID of the config to delete.
         * @returns {Promise<void>}
         */
        deleteConfig: async (id) => {
            let configs = await _getConfigs();
            const initialLength = configs.length;
            configs = configs.filter(c => c.id !== id);
            if (configs.length < initialLength) {
                await _saveConfigs(configs);
                localEventManager?.publish('config:updated', { 
                    source: 'ApiConfigManager', 
                    action: 'deleted',
                    configId: id 
                });
            } else {
                 console.warn(`[ApiConfigManager] Config with ID ${id} not found for deletion.`);
            }
        },

        /**
         * 设置指定的 API 配置为活动状态，并将其他配置设为非活动。
         * @param {string} id - The ID of the config to activate.
         * @returns {Promise<void>}
         */
        setActiveConfig: async (id) => {
            const configs = await _getConfigs();
            let found = false;
            let changed = false;
            configs.forEach(config => {
                const shouldBeActive = config.id === id;
                if (config.isActive !== shouldBeActive) {
                    config.isActive = shouldBeActive;
                    changed = true;
                }
                if (shouldBeActive) {
                    found = true;
                }
            });

            if (found && changed) {
                 await _saveConfigs(configs);
                 localEventManager?.publish('config:updated', { 
                     source: 'ApiConfigManager', 
                     action: 'activated',
                     configId: id 
                 });
            } else if (!found) {
                 console.warn(`[ApiConfigManager] Config with ID ${id} not found for activation.`);
            }
        },

        /**
         * 获取当前活动的 API 配置 (包含解密的密钥)。
         * 主要供 AIService 使用。
         * @returns {Promise<Object|null>} Promise resolved with the active config (apiKey decrypted) or null.
         */
         getActiveConfigDecrypted: async () => {
             if (typeof CryptoUtils === 'undefined' || typeof CryptoUtils.decrypt !== 'function' || typeof CryptoUtils.isEncrypted !== 'function') {
                  console.error("[ApiConfigManager] CryptoUtils decrypt/isEncrypted is not available. Check script load order.");
                  return null;
             }
            const lms = await _getLMS();
             try {
                 let configs = await _getConfigs();
                 const activeConfigIndex = configs.findIndex(c => c.isActive);

                 if (activeConfigIndex === -1) {
                     return null;
                 }
                 
                 let activeConfig = { ...configs[activeConfigIndex] }; // Work with a copy
                 let apiKey = '';
                 let needsSaveAfterMigration = false;

                 if (activeConfig.encryptedApiKey && CryptoUtils.isEncrypted(activeConfig.encryptedApiKey)) {
                    const isOldFormatEncrypted = !!activeConfig.encryptedApiKey.key;
                    if (isOldFormatEncrypted) {
                        console.warn(`[ApiConfigManager] Active config ID ${activeConfig.id} is in OLD encrypted format. Migrating...`);
                        const plaintextApiKey = await CryptoUtils.decrypt(activeConfig.encryptedApiKey, null);
                        const newEncryptedPackage = await CryptoUtils.encrypt(plaintextApiKey, lms);
                        
                        activeConfig.encryptedApiKey = newEncryptedPackage;
                        apiKey = plaintextApiKey;
                        configs[activeConfigIndex] = { ...activeConfig }; // Update the object in the array for saving
                        needsSaveAfterMigration = true;
                    } else {
                        apiKey = await CryptoUtils.decrypt(activeConfig.encryptedApiKey, lms);
                    }
                 } else if (activeConfig.apiKey && typeof activeConfig.apiKey === 'string') { // Plaintext old format
                    console.warn(`[ApiConfigManager] Active config ID ${activeConfig.id} is in PLAINTEXT format. Encrypting and migrating...`);
                     apiKey = activeConfig.apiKey;
                    const newEncryptedPackage = await CryptoUtils.encrypt(apiKey, lms);
                    activeConfig.encryptedApiKey = newEncryptedPackage;
                    delete activeConfig.apiKey;
                    configs[activeConfigIndex] = { ...activeConfig }; 
                    needsSaveAfterMigration = true;
                 } else {
                     console.warn(`[ApiConfigManager] Active config ID ${activeConfig.id} has no apiKey or encryptedApiKey to decrypt.`);
                 }
                 
                 if (needsSaveAfterMigration) {
                     await _saveConfigs(configs);
                     console.log(`[ApiConfigManager] Active config ID ${activeConfig.id} migrated to new encryption format and saved.`);
                 }
                 
                 return { ...activeConfig, apiKey };
             } catch (error) {
                  console.error("[ApiConfigManager] Failed to get/decrypt/migrate active config:", error);
                  return null;
             }
         },

        // --- ADDED setEventManager method ---
        setEventManager: (eventManagerInstance) => {
            if (eventManagerInstance && typeof eventManagerInstance.publish === 'function') {
                localEventManager = eventManagerInstance;
                // console.log('[ApiConfigManager] EventManager set successfully.');
            } else {
                console.error('[ApiConfigManager] Failed to set EventManager: Invalid instance provided.');
            }
        }
    };
})();

// Expose ApiConfigManager to the window object to match current usage patterns
window.ApiConfigManager = ApiConfigManager; 