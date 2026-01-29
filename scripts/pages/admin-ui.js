/**
 * Admin UI Enhancements
 * Handles Sidebar Toggle and other UI utilites.
 */

const AdminUI = {
    init: () => {
        console.log("AdminUI Initialized");
        const toggleBtn = document.getElementById('sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', AdminUI.toggleSidebar);
        }

        // Check LocalStorage preference
        const isCollapsed = localStorage.getItem('mv_admin_sidebar_collapsed') === 'true';
        if (isCollapsed) {
            document.body.classList.add('sidebar-collapsed');
            const icon = toggleBtn.querySelector('i');
            if (icon) icon.className = 'ph-bold ph-caret-right';
        }
    },

    toggleSidebar: () => {
        document.body.classList.toggle('sidebar-collapsed');
        const isCollapsed = document.body.classList.contains('sidebar-collapsed');

        localStorage.setItem('mv_admin_sidebar_collapsed', isCollapsed);

        // Update Icon
        const icon = document.querySelector('#sidebar-toggle i');
        if (icon) {
            icon.className = isCollapsed ? 'ph-bold ph-caret-right' : 'ph-bold ph-caret-left';
        }
    }
};

document.addEventListener('DOMContentLoaded', AdminUI.init);
