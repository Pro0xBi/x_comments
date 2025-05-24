class RoleSelector extends UIComponent {
    // Update constructor to accept config object
    constructor(config = {}) {
        // Call super constructor first
        super(config);
        console.log('[RS_Diag] Constructor called. Config:', config);

    
      
        this.aiService = config.aiService;
        this.eventManager = config.eventManager;
        // 从配置中获取 componentFactory
        this.componentFactory = config.componentFactory;
        // console.log('[RoleSelector constructor] AFTER this.componentFactory assignment: ', this.componentFactory, 'Type:', typeof this.componentFactory);

        if (!this.componentFactory) {
            
           
        }
        // --- End extracting dependencies ---

        // --- Refactor Start: Use aiService for default role ---
        let defaultRole;
        if (this.aiService && this.aiService.rolesConfig && this.aiService.defaultRoleID) {
            const roles = this.aiService.rolesConfig;
            const defaultId = this.aiService.defaultRoleID;
            
            defaultRole = roles.find(role => role.id === defaultId);
            if (!defaultRole && roles.length > 0) {
                
                defaultRole = roles[0];
            } else if (!defaultRole) {
                
            }
        } else {
           
            defaultRole = null; 
        }
        this.currentRole = defaultRole;
        
       
        this.buttons = new Map();
        
        // console.log('[RoleSelector constructor] BEFORE calling this.init(). this.componentFactory: ', this.componentFactory, 'Type:', typeof this.componentFactory);
        // Call init 
        this.init(); 
    }

    init() {
       
        
      

        // 创建按钮容器
        this.buttonContainer = document.createElement('div');
        this.buttonContainer.className = 'role-buttons-container';
        
        // --- ADJUST DOM OPERATION: Append to this.element ---
        if (this.element) {
             this.element.appendChild(this.buttonContainer); 
        } else {
            
        }
        // --- END ADJUST DOM OPERATION ---

        // --- Add Preset Roles Section Label --- START ---
        if (this.aiService && this.aiService.rolesConfig && this.aiService.rolesConfig.length > 0) { 
            
            const presetLabel = document.createElement('div');
            presetLabel.className = 'role-section-label preset-label'; 
            presetLabel.textContent = '预设角色';
            this.buttonContainer.appendChild(presetLabel);
        }
        // --- Add Preset Roles Section Label --- END ---

        // --- Refactor Start: Create buttons from ROLES_CONFIG ---
        if (this.aiService && this.aiService.rolesConfig) {
            // Use componentFactory to create RoleButton instances
            if (!this.componentFactory) {
               
                return; // Stop initialization if factory is missing
            }
            
            this.aiService.rolesConfig.forEach(role => {
                try {
                    const isActive = this.currentRole && role.id === this.currentRole.id;
                    const buttonConfig = {
                        role: role,
                        isActive: isActive,
                        onClick: (selectedRole) => this.handleRoleChange(selectedRole)
                        // Pass other necessary config if RoleButton needs them
                    };
                    // Create button using the factory
                    const buttonInstance = this.componentFactory.createComponent('roleButton', buttonConfig);

                    if (buttonInstance && buttonInstance.element) {
                        this.buttons.set(role.id, buttonInstance);
                        this.buttonContainer.appendChild(buttonInstance.element); // Append the component's element
                        
                    } else {
                         
                    }
                } catch (error) {
                    
                }
            });
        } else {
            
        }
        // --- Refactor End ---

        // --- Phase 1 (Merge Tab - Mixed Mode): Asynchronously load and append user roles --- START ---
        if (window.UserRoleSelector && typeof window.UserRoleSelector.loadAndValidateRoles === 'function') {
            window.UserRoleSelector.loadAndValidateRoles()
                .then(userRoles => {
                    if (userRoles && userRoles.length > 0) {
                        const presetRolesExist = this.aiService && this.aiService.rolesConfig && this.aiService.rolesConfig.length > 0;
                        if (presetRolesExist) {
                            try {
                                const separator = document.createElement('hr');
                                separator.className = 'role-separator';
                                this.buttonContainer.appendChild(separator);
                            } catch (separatorError) {
                                // console.error('[RoleSelector] Error adding separator:', separatorError);
                            }
                        }
                        const userLabel = document.createElement('div');
                        userLabel.className = 'role-section-label user-label'; 
                        userLabel.textContent = '自制角色';
                        this.buttonContainer.appendChild(userLabel);

                        // Use componentFactory for user-defined roles as well
                        if (!this.componentFactory) {
                            console.error("[RS_Diag] init FATAL: UIComponentFactory (this.componentFactory) not available! Cannot create user role buttons.");
                            return; // Stop processing if factory is missing
                        }
                        userRoles.forEach(role => {
                            try {
                                role.isUserDefined = true; 
                                const isActive = false; 
                                const buttonConfig = {
                                     role: role,
                                     isActive: isActive,
                                     onClick: (selectedRole) => this.handleRoleChange(selectedRole)
                                 };
                                // Create button using the factory
                                const buttonInstance = this.componentFactory.createComponent('roleButton', buttonConfig);

                                if (buttonInstance && buttonInstance.element) {
                                     buttonInstance.element.classList.add('user-defined-role-btn'); // Add specific class if needed AFTER creation
                                     this.buttons.set(role.id, buttonInstance); 
                                     this.buttonContainer.appendChild(buttonInstance.element);
                                } else {
                                    
                                }
                            } catch (buttonError) {
                                
                            }
                        });
                    } else {
                        
                    }
                })
                .catch(error => {
                    
                });
        } else {
            
        }
        

        if (this.componentFactory) {
            try {
                // Pass any necessary config for BackgroundInfo if needed
                this.backgroundInfo = this.componentFactory.createComponent('backgroundInfo', {});
                if (this.backgroundInfo && this.backgroundInfo.element) {
                    // Append the BackgroundInfo element to the RoleSelector's element
                    this.element.appendChild(this.backgroundInfo.element);
                } else {
                    // Log or throw an error if component creation failed or element is missing
                    console.error('[RoleSelector] Failed to create backgroundInfo component or its element via factory.');
                    this.backgroundInfo = null; // Ensure it's null on error
                }
            } catch(error) {
                console.error("[RoleSelector] Error creating BackgroundInfo via factory:", error); 
                this.backgroundInfo = null; // Ensure it's null on error
            }
        } else {
            console.error('[RoleSelector] BackgroundInfo creation skipped: UIComponentFactory (this.componentFactory) not available.');
            this.backgroundInfo = null; // Ensure it's null if dependencies missing
        }
        // --- End BackgroundInfo Creation ---
    }

    async handleRoleChange(selectedRole) {
        try {
            // Check if selectedRole is valid before proceeding
            if (!selectedRole || !selectedRole.id) {
                 
                 return;
            }
            
            // 更新按钮状态
            this.buttons.forEach(button => {
                // Ensure button.role exists before accessing id
                if (button.role) {
                    button.setActive(button.role.id === selectedRole.id);
                }
            });

            // 更新当前角色
            this.currentRole = selectedRole;

            // --- Refactor Start: Publish only roleId --- 
            if (this.eventManager) {
                const timestamp = Date.now();
                const payload = {
                    role: selectedRole, // Pass the full selected role object
                    timestamp: timestamp
                };
                try {
                    this.eventManager.publish('role:changed', payload);
                    
                } catch (publishError) {
                    
                }
            } else {
                
            }
            // --- Refactor End ---

        } catch (error) {
            
            // 恢复之前的选择 (ensure this.currentRole is valid before using)
            if (this.currentRole) {
                 this.buttons.forEach(button => {
                     if (button.role) { // Add safety check
                         button.setActive(button.role.id === this.currentRole.id);
                     }
                 });
            } else {
                 
            }
        }
    }

    /**
     * 获取当前选中的角色对象
     * @returns {object | null} 当前角色对象或 null
     */
    getCurrentRole() {
        return this.currentRole;
    }

    /**
     * 获取当前输入的背景信息
     * @returns {string} 背景信息文本, 如果 BackgroundInfo 实例不存在或获取失败则返回空字符串
     */
    getBackgroundInfo() {
        // 检查 BackgroundInfo 实例是否存在以及是否有 getValue 方法
        if (this.backgroundInfo && typeof this.backgroundInfo.getValue === 'function') {
            try {
                const value = this.backgroundInfo.getValue();
                // 确保返回的是字符串
                return String(value || ''); 
            } catch (error) {
                console.error("[RoleSelector] Error calling backgroundInfo.getValue():", error);
                return ''; // 获取失败时返回空字符串
            }
        } else {
            
            return ''; // 实例不存在时返回空字符串
        }
    }

    // Update destroy method
    destroy() {
        
        if (super.destroy && typeof super.destroy === 'function') {
            super.destroy(); // This should handle removing this.element from DOM
        }

        // Destroy child components first
        if (this.backgroundInfo && typeof this.backgroundInfo.destroy === 'function') {
             this.backgroundInfo.destroy();
             console.log('[RoleSelector] BackgroundInfo destroyed.');
        }
        this.buttons.forEach(button => {
            if (button && typeof button.destroy === 'function') {
                button.destroy();
            }
        });
        this.buttons.clear();
        console.log('[RoleSelector] Role buttons destroyed.');
        
        // Nullify references
        this.backgroundInfo = null;
        this.aiService = null; 
        this.eventManager = null; 
        this.buttonContainer = null; // Also nullify this internal reference

        console.log('[RoleSelector] Destroyed.');
    }
};

