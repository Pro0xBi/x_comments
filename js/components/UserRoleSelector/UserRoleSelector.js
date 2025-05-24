/**
 * UserRoleSelector Class (Refactored as Stateless Utility)
 * 
 * This class now primarily provides static methods for loading user roles.
 * The rendering logic has been integrated into RoleSelector.
 */
class UserRoleSelector {
    // Constructor is no longer needed as we only use static methods.
    /*
    constructor() {
        console.log('UserRoleSelector: Instance created (stateless utility).');
    }
    */

    /** 
     * Loads user-defined roles from chrome storage and validates them.
     * Ensures roles have valid 'id' and 'name' string properties.
     * @returns {Promise<Array<object>>} A promise that resolves with an array of validated role objects. 
     *                                   Returns an empty array if no roles are found, data is invalid, or an error occurs.
     */
    static async loadAndValidateRoles() {
        try {
            const result = await new Promise((resolve, reject) => {
                // Use chrome.storage.local API to get roles
                chrome.storage.local.get(['userDefinedRoles'], (res) => {
                    if (chrome.runtime.lastError) {
                        // Log error but resolve with empty array for consistent return type
                        console.error("UserRoleSelector: Error getting userDefinedRoles from storage:", chrome.runtime.lastError);
                        return resolve({ userDefinedRoles: [] }); 
                    }
                    resolve(res); // Resolve with the result from storage
                });
            });

            // --- Data Validation --- 
            const rawRoles = result.userDefinedRoles;
            let validatedRoles = [];

            // Check if the retrieved data is actually an array
            if (!Array.isArray(rawRoles)) {
                console.warn('UserRoleSelector: Loaded data for userDefinedRoles is not an array. Treating as empty.', rawRoles);
                // Ensure we return an empty array if data is not in expected format
                validatedRoles = [];
            } else {
                // Filter the array for roles that have valid id and name
                validatedRoles = rawRoles.filter(role => 
                    role && 
                    typeof role.id === 'string' && role.id.trim() !== '' && // ID must be a non-empty string
                    typeof role.name === 'string' && role.name.trim() !== '' // Name must be a non-empty string
                );
                // Log if any roles were filtered out due to invalid structure
                if (validatedRoles.length !== rawRoles.length) {
                    console.warn('UserRoleSelector: Some loaded roles were filtered out due to missing or invalid id/name.', { 
                        originalCount: rawRoles.length, 
                        validCount: validatedRoles.length 
                    });
                }
            }
            // --- End Data Validation --- 

            return validatedRoles; // Return the array of validated roles

        } catch (error) {
            // Catch any unexpected errors during the process
            console.error("UserRoleSelector: Unexpected error in loadAndValidateRoles:", error);
            return []; // Return an empty array in case of errors
        }
    }
}

// Expose the class to the global scope for accessibility
try {
   window.UserRoleSelector = UserRoleSelector; 
} catch(e) {
   console.error('[UserRoleSelector] Failed to expose class to window:', e);
} 