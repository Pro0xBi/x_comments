// 定义可用的模型
const AVAILABLE_MODELS = {
  openai: [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat' }
  ]
};

// 当前编辑的API ID（用于编辑模式）
let currentEditingId = null;

// --- Tab 功能函数定义 (Moved here) ---
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // 默认显示第一个 tab (API 配置)
  const defaultTab = document.querySelector('.tab-button.active');
  if (defaultTab) {
    const defaultTabId = defaultTab.dataset.tab;
    const defaultContent = document.getElementById(defaultTabId);
    if (defaultContent) {
      defaultContent.classList.add('active');
    }
  } else if (tabButtons.length > 0) {
      // 如果 HTML 没有默认 active 类，则激活第一个
      const firstTabButton = tabButtons[0];
      const firstTabId = firstTabButton.dataset.tab;
      const firstContent = document.getElementById(firstTabId);
      firstTabButton.classList.add('active');
      if(firstContent) firstContent.classList.add('active');
  }

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;

      // 移除所有按钮的 active 类
      tabButtons.forEach(btn => btn.classList.remove('active'));
      // 给当前点击的按钮添加 active 类
      button.classList.add('active');

      // 隐藏所有内容面板
      tabContents.forEach(content => content.classList.remove('active'));
      // 显示对应的内容面板
      const activeContent = document.getElementById(tabId);
      if (activeContent) {
        activeContent.classList.add('active');
      }
    });
  });
}
// --- Tab 功能函数结束 ---

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {

  // --- NEW Theme Detection and Application Logic (Using Shared Utils) ---

  // Helper functions are now in window.themeUtils
  // const applyFinalTheme = (theme) => { ... };
  // const determineTheme = (userChoice) => { ... }; 
  // const determineAndApplyTheme = (userChoice) => { ... }; // Use window.themeUtils.determineAndApplyTheme

  // 1. Initial theme load
  chrome.storage.sync.get(['userThemeChoice'], (result) => {
    let currentChoice = 'system'; // Default to system
    if (chrome.runtime.lastError) {
      console.warn('[Options] Error getting theme choice from storage:', chrome.runtime.lastError.message);
    } else if (result.userThemeChoice) {
      currentChoice = result.userThemeChoice;
    }
    // No dropdown to set in options page
    // Apply the theme using the utility function
    if (window.themeUtils && typeof window.themeUtils.determineAndApplyTheme === 'function') {
        window.themeUtils.determineAndApplyTheme(currentChoice);
    } else {
        console.error('[Options] window.themeUtils.determineAndApplyTheme not found!');
    }
  });

  // 2. Listen for changes in storage
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.userThemeChoice) {
      const newChoice = changes.userThemeChoice.newValue || 'system';
      // No dropdown to update in options page
      // Re-apply the theme based on the new choice using the utility function
      if (window.themeUtils && typeof window.themeUtils.determineAndApplyTheme === 'function') {
          window.themeUtils.determineAndApplyTheme(newChoice);
      } else {
          console.error('[Options] window.themeUtils.determineAndApplyTheme not found during storage change!');
      }
    }
    // Keep listening for other potential storage changes if needed
    // else if (namespace === 'sync' && changes.someOtherKey) { ... }
  });

  // 3. Listen for changes in system preference
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
     chrome.storage.sync.get(['userThemeChoice'], (result) => {
         const currentChoice = result.userThemeChoice || 'system';
         if (currentChoice === 'system') {
            console.log('[Options] System theme changed, applying via themeUtils...');
            // Re-evaluate based on system change using the utility function
            if (window.themeUtils && typeof window.themeUtils.determineAndApplyTheme === 'function') {
                window.themeUtils.determineAndApplyTheme('system');
            } else {
                console.error('[Options] window.themeUtils.determineAndApplyTheme not found during system preference change!');
            }
         }
     });
  });
  // --- End NEW Theme Logic ---


  // --- Tab 初始化 ---
  initializeTabs(); // Call is now after definition and theme logic
  // --- Tab 初始化结束 ---

  // --- NEW: Handle hash for initial tab selection ---
  if (window.location.hash === '#roles') {
    const rolesTabButton = document.querySelector('button[data-tab="custom-roles"]');
    if (rolesTabButton) {
        // Simulate a click on the roles tab button to trigger the switch logic in initializeTabs
        rolesTabButton.click();
    } else {
        console.warn('[Options] Could not find the custom roles tab button to switch based on hash.');
    }
    // Optional: Scroll to the top of the custom roles section if needed
    // const rolesSection = document.getElementById('custom-roles');
    // if (rolesSection) rolesSection.scrollIntoView({ behavior: 'smooth' });
  }
  // --- End NEW: Handle hash --- 

  // --- Refactored API List Loading ---
  await loadApiList(); // <-- Make async and await
  // --- End Refactored API List Loading ---
  
  setupEventListeners();

  // --- 自定义角色功能初始化 ---
  const uploadButton = document.getElementById('upload-role-button');
  const fileInput = document.getElementById('role-file-input');
  const uploadStatus = document.getElementById('upload-status');
  const selectedFilenameSpan = document.getElementById('selected-filename'); // 获取文件名显示 span

  if (uploadButton && fileInput && uploadStatus && selectedFilenameSpan) { // 确保 span 也存在
      uploadButton.addEventListener('click', handleRoleUpload);

      // 监听文件输入框的 change 事件
      fileInput.addEventListener('change', () => {
          if (fileInput.files.length > 0) {
              selectedFilenameSpan.textContent = fileInput.files[0].name;
              selectedFilenameSpan.style.fontStyle = 'normal'; // 移除斜体
              uploadStatus.textContent = ''; // 清除之前的状态消息
              uploadStatus.style.color = '';
          } else {
              selectedFilenameSpan.textContent = '未选择文件';
              selectedFilenameSpan.style.fontStyle = 'italic';
          }
      });

  } else {
      console.error('未能找到自定义角色上传相关的 DOM 元素。');
  }
  
  // 初始化时加载并显示列表
  renderCustomRolesList(); 
  
  // 设置删除按钮的事件委托 
  setupDeleteButtonListener(); 
  // --- 自定义角色功能初始化结束 ---
});

// 设置事件监听器
function setupEventListeners() {
  // 添加API按钮
  document.getElementById('addApi').addEventListener('click', () => {
    currentEditingId = null;
    document.getElementById('modalTitle').textContent = '添加新的 API';
    clearModalForm();
    showModal();
  });

  // 取消按钮
  document.getElementById('cancelApi').addEventListener('click', hideModal);

  // 保存按钮
  document.getElementById('saveApi').addEventListener('click', saveApi); // saveApi is now async

  // --- Add Event Listener for API List (Event Delegation) ---
  const apiListElement = document.getElementById('apiList');
  if (apiListElement) {
    apiListElement.addEventListener('click', async (event) => { // <-- Make async
      const target = event.target;
      const configId = target.dataset.id;

      if (!configId) return;

      if (target.classList.contains('set-active')) {
        await setActiveApi(configId); // <-- Await
      } else if (target.classList.contains('edit-api')) {
        await editApi(configId); // <-- Await
      } else if (target.classList.contains('delete-api')) {
        await deleteApi(configId); // <-- Await
      }
    });
  } else {
    console.error("API List container (#apiList) not found for event delegation.");
  }
  // --- End Event Listener for API List ---
}

// 加载API列表 (Refactored)
async function loadApiList() {
  const apiList = document.getElementById('apiList');
  apiList.innerHTML = ''; // Clear previous list
  showStatus('加载 API 列表中...', 'info'); // Show loading state

  try {
    // Use ApiConfigManager
    let configs = await window.ApiConfigManager.loadConfigsForDisplay(); // Use let
    
    // --- ADDED: Auto-activate if only one config exists and it's inactive ---
    if (configs.length === 1 && !configs[0].isActive) {
      const singleConfigId = configs[0].id;
      showStatus('检测到只有一个 API 配置，正在自动激活...', 'info');
      try {
        await window.ApiConfigManager.setActiveConfig(singleConfigId);
        // Reload configs to reflect the change before rendering
        configs = await window.ApiConfigManager.loadConfigsForDisplay(); 
        showStatus('已自动激活唯一的 API 配置。', 'success', 3000); // Show success briefly
      } catch (activationError) {
        console.error(`[loadApiList] Failed to auto-activate config ${singleConfigId}:`, activationError);
        showStatus('自动激活失败，请手动激活。', 'error');
        // Proceed with rendering the list as is, user can manually activate
      }
    } else {
        clearStatus(); // Clear loading message if not auto-activating
    }
    // --- END ADDED ---    

    if (configs.length === 0) {
      apiList.innerHTML = '<div class="api-item">还没有配置任何 API</div>';
      // Ensure status is cleared if auto-activation didn't run and list is empty
      if (apiList.innerHTML.includes('还没有')) { clearStatus(); }
      return;
    }

    configs.forEach(config => {
      const apiItem = createApiListItem(config);
      apiList.appendChild(apiItem);
    });
  } catch (error) {
    console.error("Failed to load API list via ApiConfigManager:", error);
    apiList.innerHTML = '<div class="api-item error-text">加载 API 列表失败</div>';
    showStatus('加载 API 列表失败', 'error');
  }
}


function createApiListItem(config) {
  const div = document.createElement('div');
  div.className = `api-item ${config.isActive ? 'active' : ''}`;
  
  // Use textContent for safety against potential XSS in names/providers if ever sourced externally
  const nameDiv = document.createElement('div');
  nameDiv.className = 'api-name';
  nameDiv.textContent = config.name;
  
  const providerDiv = document.createElement('div');
  providerDiv.className = 'api-provider';
  providerDiv.textContent = config.provider.toUpperCase();

  const keyDiv = document.createElement('div');
  keyDiv.className = 'api-key';
  keyDiv.textContent = `API Key: ${'•'.repeat(20)}`;

  const infoDiv = document.createElement('div');
  infoDiv.className = 'api-info';
  infoDiv.appendChild(nameDiv);
  infoDiv.appendChild(providerDiv);
  infoDiv.appendChild(keyDiv);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'api-actions';

  if (config.isActive) {
    const statusBtn = document.createElement('button');
    statusBtn.className = 'btn btn-secondary';
    statusBtn.textContent = '当前使用中';
    statusBtn.disabled = true;
    actionsDiv.appendChild(statusBtn);
  } else {
    const setActiveBtn = document.createElement('button');
    setActiveBtn.className = 'btn btn-primary set-active';
    setActiveBtn.textContent = '设为当前使用';
    setActiveBtn.dataset.id = config.id; // Set data-id for delegation
    actionsDiv.appendChild(setActiveBtn);
  }

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-secondary edit-api';
  editBtn.textContent = '编辑';
  editBtn.dataset.id = config.id; // Set data-id for delegation
  actionsDiv.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn btn-danger delete-api';
  deleteBtn.textContent = '删除';
  deleteBtn.dataset.id = config.id; // Set data-id for delegation
  actionsDiv.appendChild(deleteBtn);

  div.appendChild(infoDiv);
  div.appendChild(actionsDiv);

 
  return div;
}

// 显示/隐藏模态框
function showModal() {
  document.getElementById('apiModal').style.display = 'block';
}

function hideModal() {
  document.getElementById('apiModal').style.display = 'none';
  clearModalForm();
}

// 清空表单
function clearModalForm() {
  document.getElementById('apiProvider').value = 'deepseek'; // Default to deepseek
  document.getElementById('apiName').value = '';
  document.getElementById('apiKey').value = '';
}

// 保存API配置 (Refactored)
async function saveApi() {
  const name = document.getElementById('apiName').value.trim();
  const provider = document.getElementById('apiProvider').value;
  const apiKey = document.getElementById('apiKey').value.trim();

  if (!name || !apiKey) {
    showStatus('请填写所有必填项', 'error');
    return;
  }

  const configData = {
    id: currentEditingId, // Will be null for new configs
    name: name,
    provider: provider,
    apiKey: apiKey // Pass plaintext key to manager
  };

  try {
    // Use ApiConfigManager
    showStatus('正在保存...', 'info'); // Show saving state
    await window.ApiConfigManager.saveConfig(configData);
    clearStatus(); // Clear saving message
    
    hideModal();
    await loadApiList(); // Reload the list
    showStatus('API 配置已安全保存', 'success');

  } catch (error) {
    console.error('Failed to save API config via ApiConfigManager:', error);
    showStatus(`保存失败: ${error.message || '请重试'}` , 'error');
  }
}

// 编辑API (Refactored)
async function editApi(id) {
  try {
    // Use ApiConfigManager
    const config = await window.ApiConfigManager.getConfigForEdit(id);
    
    if (config) {
      currentEditingId = id;
      document.getElementById('modalTitle').textContent = '编辑 API';
      document.getElementById('apiProvider').value = config.provider;
      document.getElementById('apiName').value = config.name;
      document.getElementById('apiKey').value = config.apiKey; // Manager returns decrypted key
      showModal();
    } else {
       console.error(`Config with ID ${id} not found for editing.`);
       showStatus('无法加载该 API 配置', 'error');
    }
  } catch (error) {
    console.error('Failed to load API config for editing via ApiConfigManager:', error);
    showStatus(`加载失败: ${error.message || '请重试'}` , 'error');
  }
}

// 删除API (Refactored)
async function deleteApi(id) {
  if (!confirm('确定要删除这个 API 配置吗？此操作不可撤销。')) {
    return;
  }

  try {
    // Use ApiConfigManager
    showStatus('正在删除...', 'info');
    await window.ApiConfigManager.deleteConfig(id);
    clearStatus();
    
    await loadApiList(); // Reload the list
    showStatus('API 配置已删除', 'success');

  } catch (error) {
    console.error('Failed to delete API config via ApiConfigManager:', error);
    showStatus(`删除失败: ${error.message || '请重试'}` , 'error');
  }
}

// 设置当前使用的API (Refactored)
async function setActiveApi(id) {
  try {
    // Use ApiConfigManager
    showStatus('正在设置活动配置...', 'info');
    await window.ApiConfigManager.setActiveConfig(id);
    clearStatus();
    
    await loadApiList(); // Reload the list to reflect the change
    showStatus('活动 API 配置已更新', 'success');

  } catch (error) {
    console.error('Failed to set active API via ApiConfigManager:', error);
    showStatus(`设置失败: ${error.message || '请重试'}` , 'error');
  }
}

// 显示状态消息 (Add clearStatus helper)
let statusTimeout;
function showStatus(message, type) {
  const status = document.getElementById('status');
  if (!status) return; 
  clearTimeout(statusTimeout); 
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';

  // Only auto-hide for success messages
  if (type === 'success' || type === 'info') {
    statusTimeout = setTimeout(() => {
       clearStatus(); // Use clearStatus to hide
    }, 3000);
  }
}
function clearStatus() {
  const status = document.getElementById('status');
  if (!status) return; 
  clearTimeout(statusTimeout);
  status.textContent = '';
  status.style.display = 'none';
}

// --- 自定义角色功能函数定义 ---

function handleRoleUpload() {
    const fileInput = document.getElementById('role-file-input');
    const uploadStatus = document.getElementById('upload-status');
    const selectedFilenameSpan = document.getElementById('selected-filename');
    const file = fileInput.files[0]; // 获取当前选定的文件

    uploadStatus.textContent = ''; // 清空状态
    uploadStatus.style.color = ''; // 重置颜色

    // 现在检查这里是否有文件被选中
    if (!file) { 
        uploadStatus.textContent = '错误：请先通过"选择文件"按钮选择一个 JSON 文件。';
        uploadStatus.style.color = 'red';
        return;
    }

    // 文件类型检查仍然需要
    if (file.type !== 'application/json') {
        uploadStatus.textContent = '错误：选择的文件不是有效的 .json 文件。请重新选择。';
        uploadStatus.style.color = 'red';
        // 清空文件输入和显示
        fileInput.value = ''; 
        if (selectedFilenameSpan) {
            selectedFilenameSpan.textContent = '未选择文件';
            selectedFilenameSpan.style.fontStyle = 'italic';
        }
        return;
    }

    const reader = new FileReader();

    reader.onload = function(event) {
        try {
            const fileContent = event.target.result;
            const jsonData = JSON.parse(fileContent);
            
            // 验证数据 (validateAndSaveRoles 会处理后续状态和列表刷新)
            validateAndSaveRoles(jsonData);

            // 无论成功失败，上传操作完成后都重置文件输入和显示
            fileInput.value = ''; 
            if (selectedFilenameSpan) {
                selectedFilenameSpan.textContent = '未选择文件';
                selectedFilenameSpan.style.fontStyle = 'italic';
            }

        } catch (error) {
            console.error("JSON 解析错误:", error);
            uploadStatus.textContent = `错误：无法解析 JSON 文件。请检查文件格式。(${error.message})`;
            uploadStatus.style.color = 'red';
            // 重置文件输入和显示
            fileInput.value = ''; 
            if (selectedFilenameSpan) {
                selectedFilenameSpan.textContent = '未选择文件';
                selectedFilenameSpan.style.fontStyle = 'italic';
            }
        }
    };

    reader.onerror = function(event) {
        console.error("文件读取错误:", event);
        uploadStatus.textContent = '错误：读取文件时出错。';
        uploadStatus.style.color = 'red';
        // 重置文件输入和显示
        fileInput.value = ''; 
        if (selectedFilenameSpan) {
            selectedFilenameSpan.textContent = '未选择文件';
            selectedFilenameSpan.style.fontStyle = 'italic';
        }
    };

    reader.readAsText(file);
}

function validateRoleData(data) {
    let rolesToValidate = [];
    if (Array.isArray(data)) {
        rolesToValidate = data;
    } else if (typeof data === 'object' && data !== null) {
        rolesToValidate = [data]; // 将单个对象包装成数组以便统一处理
    } else {
        return { isValid: false, error: '文件内容必须是单个角色对象或角色对象数组。' };
    }

    const validRoles = [];
    for (const role of rolesToValidate) {
        if (typeof role !== 'object' || role === null) {
            return { isValid: false, error: '数组中的每个元素都必须是角色对象。' };
        }
        
        // 检查必需字段是否存在且为非空字符串
        const requiredFields = ['name', 'systemPrompt', 'userPromptTemplate'];
        for (const field of requiredFields) {
            if (typeof role[field] !== 'string' || role[field].trim() === '') {
                 return { isValid: false, error: `角色对象缺少有效的 "${field}" 字段 (必须为非空字符串)。问题对象: ${JSON.stringify(role)}` };
            }
        }
        
        // 确保没有意外的 id 字段 (或者可以忽略它)
        // delete role.id; // 如果担心用户误传id，可以删除

        const validatedRole = { // 先创建一个包含必需字段的对象
            name: role.name.trim(),
            systemPrompt: role.systemPrompt.trim(),
            userPromptTemplate: role.userPromptTemplate.trim()
        };

        // 检查原始 role 对象是否有 emoji 属性，并且是字符串类型
        if (Object.prototype.hasOwnProperty.call(role, 'emoji') && typeof role.emoji === 'string') {
             // 如果有且是字符串，则将其添加到 validatedRole 对象中
            validatedRole.emoji = role.emoji; 
            // validatedRole.emoji = role.emoji.trim(); // 如果需要去除空格，解除此行注释
        } 
        
        validRoles.push(validatedRole); // 将包含（或不包含）emoji 的对象推入数组
    }

    if (validRoles.length === 0) {
         return { isValid: false, error: '未找到有效的角色数据。' };
    }

    return { isValid: true, roles: validRoles };
}

// 添加调用验证的函数 (连接步骤2和步骤4)
function validateAndSaveRoles(jsonData) {
    const uploadStatus = document.getElementById('upload-status');
    const validationResult = validateRoleData(jsonData);

    if (!validationResult.isValid) {
        uploadStatus.textContent = `错误：${validationResult.error}`;
        uploadStatus.style.color = 'red';
    } else {
        // 下一步：生成 ID 并保存 (调用 saveCustomRoles - 函数将在步骤 4 定义)
        saveCustomRoles(validationResult.roles);
    }
}

function generateRoleId() {
    // 简单但足够唯一的 ID 生成器
    return 'role-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
}

function saveCustomRoles(newRolesValidated) {
    const uploadStatus = document.getElementById('upload-status');
    
    // 使用 chrome.storage.local 而不是 sync
    chrome.storage.local.get(['userDefinedRoles'], (result) => {
        if (chrome.runtime.lastError) {
            console.error("读取 storage.local 错误:", chrome.runtime.lastError);
            uploadStatus.textContent = '错误：无法读取现有角色数据。';
            uploadStatus.style.color = 'red';
            return;
        }

        let existingRoles = result.userDefinedRoles || [];
        
        // 为新角色生成 ID 并添加到现有角色列表
        const rolesToSave = newRolesValidated.map(role => {
            return { ...role, id: generateRoleId() }; 
        });

        const updatedRoles = [...existingRoles, ...rolesToSave];

        // 使用 chrome.storage.local 而不是 sync
        chrome.storage.local.set({ userDefinedRoles: updatedRoles }, () => {
            if (chrome.runtime.lastError) {
                console.error("写入 storage.local 错误:", chrome.runtime.lastError);
                uploadStatus.textContent = '错误：保存角色数据失败。';
                uploadStatus.style.color = 'red';
            } else {
                console.log('自定义角色已保存:', rolesToSave);
                uploadStatus.textContent = `成功保存 ${rolesToSave.length} 个新角色！`;
                uploadStatus.style.color = 'green';
                // 刷新列表显示 (函数将在步骤 5 定义)
                renderCustomRolesList(); 
                
                // 短暂显示成功消息后清除
                setTimeout(() => { 
                    if (uploadStatus) uploadStatus.textContent = ''; 
                }, 3000);
            }
        });
    });
}

function renderCustomRolesList() {
    const listContainer = document.getElementById('custom-roles-list');
    if (!listContainer) {
        console.error('Render Error: #custom-roles-list container not found.');
        return; 
    }
    console.log('[renderCustomRolesList] Starting to render...'); // Log entry

    chrome.storage.local.get(['userDefinedRoles'], (result) => {
         console.log('[renderCustomRolesList] Raw result from storage.local.get:', result); // Log raw result
         
         if (chrome.runtime.lastError) {
            console.error("[renderCustomRolesList] Error reading storage.local:", chrome.runtime.lastError);
            listContainer.innerHTML = '<p style="color: red;">无法加载角色列表 (读取错误)。</p>';
            return;
        }
        
        const roles = result.userDefinedRoles || [];
        console.log('[renderCustomRolesList] Parsed roles array:', roles); // Log parsed roles
        console.log(`[renderCustomRolesList] Number of roles found: ${roles.length}`); // Log count
        
        listContainer.innerHTML = ''; // 清空现有列表

        if (roles.length === 0) {
            console.log('[renderCustomRolesList] No roles found, rendering empty message.');
            listContainer.innerHTML = '<p>暂无自定义角色。</p>';
        } else {
            console.log('[renderCustomRolesList] Starting to loop through roles...');
            const ul = document.createElement('ul');
            ul.style.listStyle = 'none';
            ul.style.paddingLeft = '0';

            try { // Add try-catch around the loop
                roles.forEach((role, index) => {
                    console.log(`[renderCustomRolesList] Processing role index ${index}:`, role);
                    
                    // Basic check if role is an object before proceeding
                    if (typeof role !== 'object' || role === null) {
                        console.error(`[renderCustomRolesList] Invalid data format for role at index ${index}:`, role);
                        throw new Error(`Invalid role data at index ${index}`); // Stop processing if data is bad
                    }
                    // Check for existence of required fields before accessing them
                    if (typeof role.name !== 'string' || typeof role.systemPrompt !== 'string' || typeof role.userPromptTemplate !== 'string' || typeof role.id !== 'string') {
                         console.error(`[renderCustomRolesList] Missing or invalid fields for role at index ${index}:`, role);
                         throw new Error(`Missing or invalid fields in role data at index ${index}`); // Stop processing
                    }

                    const li = document.createElement('li');
                    li.classList.add('role-list-item'); 

                    const header = document.createElement('div');
                    header.classList.add('role-item-header');
                    header.dataset.roleId = role.id; 
                    header.title = '点击展开/折叠详情';

                    const nameSpan = document.createElement('span');
                    nameSpan.classList.add('role-name');
                    nameSpan.textContent = role.name;
                    nameSpan.title = `ID: ${role.id}`; 

                    const actionsDiv = document.createElement('div');
                    actionsDiv.classList.add('role-actions');

                    const toggleButton = document.createElement('button');
                    toggleButton.classList.add('toggle-details-button');
                    toggleButton.innerHTML = '&#9654;'; 
                    toggleButton.dataset.roleId = role.id; 
                    toggleButton.setAttribute('aria-expanded', 'false');
                    toggleButton.setAttribute('aria-label', '展开详情');

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = '删除';
                    deleteButton.classList.add('btn', 'btn-danger', 'delete-role-button');
                    deleteButton.dataset.roleId = role.id; 
                    deleteButton.style.flexShrink = '0';

                    actionsDiv.appendChild(toggleButton);
                    actionsDiv.appendChild(deleteButton);

                    header.appendChild(nameSpan);
                    header.appendChild(actionsDiv);

                    const detailsDiv = document.createElement('div');
                    detailsDiv.classList.add('role-details');
                    detailsDiv.id = `details-${role.id}`; 
                    // Escape potentially problematic HTML characters in prompts
                    const safeSystemPrompt = escapeHtml(role.systemPrompt);
                    const safeUserPrompt = escapeHtml(role.userPromptTemplate);
                    detailsDiv.innerHTML = `
                        <p><strong>System Prompt:</strong></p>
                        <p>${safeSystemPrompt}</p>
                        <p><strong>User Prompt Template:</strong></p>
                        <p>${safeUserPrompt}</p>
                    `;

                    li.appendChild(header);
                    li.appendChild(detailsDiv);
                    ul.appendChild(li);
                    console.log(`[renderCustomRolesList] Successfully processed role index ${index}`);
                });
            } catch (error) {
                console.error("[renderCustomRolesList] Error during roles loop:", error);
                // Optionally display an error message in the list container
                listContainer.innerHTML = '<p style="color: red;">渲染角色列表时出错，部分数据可能格式错误。</p>';
            }
            
            // Only append the ul if the loop completed without critical errors caught above
            if (!listContainer.innerHTML.startsWith('<p style="color: red;">')) {
                 listContainer.appendChild(ul);
            }
            console.log('[renderCustomRolesList] Finished rendering list.');
        }
    });
}

function setupDeleteButtonListener() {
    const listContainer = document.getElementById('custom-roles-list');
    if (!listContainer) return;

    // Extend this listener to also handle toggle clicks using event delegation
    listContainer.addEventListener('click', function(event) {
        const target = event.target;

        // Handle Delete Button Click
        if (target.classList.contains('delete-role-button')) {
            const button = target;
            const roleIdToDelete = button.dataset.roleId;
            const roleName = button.closest('.role-item-header')?.querySelector('.role-name')?.textContent || '该角色';
            if (roleIdToDelete && confirm(`确定要删除 "${roleName}" 吗？此操作不可撤销。`)) {
                deleteCustomRole(roleIdToDelete);
            }
            return; // Stop processing if it was a delete click
        }

        // Handle Toggle Click (Check if click was on header or toggle button itself)
        const header = target.closest('.role-item-header');
        if (header) {
             const roleIdToToggle = header.dataset.roleId;
             if (roleIdToToggle) {
                 toggleRoleDetails(roleIdToToggle);
             }
        }
    });
}

// New function to handle toggling visibility
function toggleRoleDetails(roleId) {
    const detailsDiv = document.getElementById(`details-${roleId}`);
    const toggleButton = document.querySelector(`.toggle-details-button[data-role-id="${roleId}"]`); // Find the specific button

    if (!detailsDiv || !toggleButton) {
        console.error(`无法找到 ID 为 ${roleId} 的角色详情或切换按钮。`);
        return;
    }

    const isVisible = detailsDiv.classList.toggle('visible'); // Toggle visibility class
    
    // Update button appearance and ARIA attribute
    if (isVisible) {
        toggleButton.innerHTML = '&#9660;'; // Down-pointing triangle (▼)
        toggleButton.classList.add('expanded');
        toggleButton.setAttribute('aria-expanded', 'true');
        toggleButton.setAttribute('aria-label', '折叠详情');
    } else {
        toggleButton.innerHTML = '&#9654;'; // Right-pointing triangle (▶)
        toggleButton.classList.remove('expanded');
        toggleButton.setAttribute('aria-expanded', 'false');
        toggleButton.setAttribute('aria-label', '展开详情');
    }
}

function deleteCustomRole(roleId) {
    const uploadStatus = document.getElementById('upload-status'); // 可以复用状态显示区域
    if (uploadStatus) {
      uploadStatus.textContent = ''; // 清空状态
      uploadStatus.style.color = '';
    }

    // 使用 chrome.storage.local
    chrome.storage.local.get(['userDefinedRoles'], (result) => {
        if (chrome.runtime.lastError) {
            console.error("读取 storage.local 错误:", chrome.runtime.lastError);
            if(uploadStatus) uploadStatus.textContent = '错误：删除前无法读取角色数据。';
            if(uploadStatus) uploadStatus.style.color = 'red';
            return;
        }

        let existingRoles = result.userDefinedRoles || [];
        const initialLength = existingRoles.length;
        const updatedRoles = existingRoles.filter(role => role.id !== roleId);

        // 检查是否真的删除了（防止误操作或重复点击）
        if (updatedRoles.length === initialLength) {
             console.warn(`尝试删除不存在的 Role ID: ${roleId}`);
             if(uploadStatus) uploadStatus.textContent = '通知：该角色可能已被删除或未找到。';
             if(uploadStatus) uploadStatus.style.color = 'orange';
             // 短暂显示通知后清除
             setTimeout(() => { if(uploadStatus) uploadStatus.textContent = ''; }, 3000);
             return; // 未做任何更改
        }

        // 使用 chrome.storage.local
        chrome.storage.local.set({ userDefinedRoles: updatedRoles }, () => {
            if (chrome.runtime.lastError) {
                console.error("写入 storage.local 错误:", chrome.runtime.lastError);
                if(uploadStatus) uploadStatus.textContent = '错误：删除角色时保存失败。';
                if(uploadStatus) uploadStatus.style.color = 'red';
            } else {
                console.log(`自定义角色已删除: ${roleId}`);
                if(uploadStatus) uploadStatus.textContent = '角色已成功删除。';
                if(uploadStatus) uploadStatus.style.color = 'green';
                // 刷新列表显示
                renderCustomRolesList(); 
                
                // 短暂显示成功消息后清除
                setTimeout(() => { if(uploadStatus) uploadStatus.textContent = ''; }, 3000);
            }
        });
    });
}

// --- 自定义角色功能函数定义结束 --- 