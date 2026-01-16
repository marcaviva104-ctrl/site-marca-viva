# Fix Password Toggle UI

## Issue
-   The "Eye" icon replaced the "Lock" decoration icon on the left.
-   The `.input-icon` class has `pointer-events: none`, making it unclickable.
-   UX standard is Lock on left, Eye on right.

## Fix
1.  **Update `styles/auth.css`**: Add `.password-toggle-icon` class.
    -   Position: absolute, right: 16px.
    -   Cursor: pointer.
    -   Z-index: 10.
2.  **Update `login.html`**:
    -   Restore `ph-lock` on the left.
    -   Add `ph-eye` on the right with the new class.

## Verification
-   User checks if "Eye" appears on the right.
-   User checks if clicking toggles visibility.
