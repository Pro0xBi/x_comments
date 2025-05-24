// 这个文件用于初始化和检查组件依赖
/* console.log('RoleSelector components initialized:', {
    RoleSelector: !!window.RoleSelector,
    RoleButton: !!window.RoleButton,
    roleEmojis: !!window.roleEmojis,
    roleStyles: !!window.roleStyles,
    ROLES: !!window.ROLES,
    DEFAULT_ROLE: !!window.DEFAULT_ROLE
}); */

// 确保组件已经加载到全局
window.RoleSelector = window.RoleSelector;
window.RoleButton = window.RoleButton;
window.roleEmojis = window.roleEmojis;

// 确认 RoleSelector 模块相关脚本已加载
/* console.log('[RoleSelectorIndex] RoleSelector module scripts presumed loaded.'); */
