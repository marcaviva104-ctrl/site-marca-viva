import os
import shutil
import re

# Define the moves: "filename": "destination_folder_name" (relative to root)
# We assume the file is currently in 'scripts/' or 'styles/'
MOVES = {
    # --- SCRIPTS ---
    # Pages
    "scripts/admin.js": "scripts/pages/",
    "scripts/checkout.js": "scripts/pages/",
    "scripts/product.js": "scripts/pages/",
    "scripts/produto.js": "scripts/pages/",
    "scripts/profile.js": "scripts/pages/",
    "scripts/orders.js": "scripts/pages/",
    "scripts/confirmacao.js": "scripts/pages/",
    "scripts/favoritos.js": "scripts/pages/",
    "scripts/settings.js": "scripts/pages/",
    "scripts/stories.js": "scripts/pages/",
    "scripts/stories-admin.js": "scripts/pages/",
    "scripts/create-test-client.js": "scripts/pages/",
    "scripts/login.js": "scripts/pages/", # If exists
    "scripts/produto-reviews.js": "scripts/pages/",

    # Components
    "scripts/cart.js": "scripts/components/",
    "scripts/cookies-banner.js": "scripts/components/",
    "scripts/ui-auth.js": "scripts/components/",
    "scripts/chat.js": "scripts/components/",

    # Services
    "scripts/auth.js": "scripts/services/",
    "scripts/checkout-service.js": "scripts/services/",
    "scripts/coupon-service.js": "scripts/services/",
    "scripts/favorites-service.js": "scripts/services/",
    "scripts/newsletter-service.js": "scripts/services/",
    "scripts/products.js": "scripts/services/",
    "scripts/realtime.js": "scripts/services/",
    "scripts/shipping-service.js": "scripts/services/",
    "scripts/crm.js": "scripts/services/",
    "scripts/verify_status.js": "scripts/services/",
    "scripts/app.js": "scripts/services/", # Core app logic

    # Config
    "scripts/config.js": "scripts/config/",
    "scripts/whatsapp-config.js": "scripts/config/",

    # Utils
    "scripts/diagnose.js": "scripts/utils/",
    "scripts/storage.js": "scripts/utils/",

    # --- STYLES ---
    # Base
    "styles/global.css": "styles/base/",
    "styles/design-system.css": "styles/base/",
    "styles/mobile-optimization.css": "styles/base/",
    "styles/dynamic.css": "styles/base/",
    "styles/elo7-override.css": "styles/base/",

    # Pages
    "styles/admin.css": "styles/pages/",
    "styles/checkout.css": "styles/pages/",
    "styles/confirmacao.css": "styles/pages/",
    "styles/favoritos.css": "styles/pages/",
    "styles/landing.css": "styles/pages/",
    "styles/produto.css": "styles/pages/",
    "styles/shop.css": "styles/pages/",
    "styles/stories.css": "styles/pages/",
    "styles/profile-bento.css": "styles/pages/",
    "styles/personalization.css": "styles/pages/",

    # Components
    "styles/auth-modal.css": "styles/components/",
    "styles/auth.css": "styles/components/",
    "styles/cart-sidebar.css": "styles/components/",
    "styles/cart-ui.css": "styles/components/",
    "styles/cookies-banner.css": "styles/components/",
    "styles/lightbox.css": "styles/components/",
    "styles/premium-components.css": "styles/components/",
    "styles/search.css": "styles/components/",
    "styles/whatsapp-button.css": "styles/components/",
    "styles/qty-fix.css": "styles/components/",
    "styles/account-menu.css": "styles/components/",
}

ROOT_DIR = os.getcwd()

def update_references():
    # 1. Build a map of old_path -> new_path for replacement
    # We need to handle both "scripts/foo.js" and "./scripts/foo.js"
    replacements = {}
    for old_path, new_dir in MOVES.items():
        filename = os.path.basename(old_path)
        new_path = os.path.join(new_dir, filename).replace("\\", "/")
        replacements[old_path] = new_path
        print(f"Plan: {old_path} -> {new_path}")

    # 2. Scan all text files (html, css, js)
    extensions = ['.html', '.css', '.js']
    for root, dirs, files in os.walk(ROOT_DIR):
        if ".git" in root or "node_modules" in root or "archive" in root:
            continue
            
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                file_path = os.path.join(root, file)
                
                # Read content
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                except UnicodeDecodeError:
                     print(f"Skipping binary/unreadable: {file_path}")
                     continue

                new_content = content
                modified = False

                for old, new in replacements.items():
                    # Naive replacement: "scripts/foo.js" -> "scripts/pages/foo.js"
                    # We assume paths are relative to root in HTML, or relative in CSS
                    # Start with exact matches
                    if old in new_content:
                        new_content = new_content.replace(old, new)
                        modified = True
                    
                    # Try with ./ prefix
                    if f"./{old}" in new_content:
                         new_content = new_content.replace(f"./{old}", f"./{new}")
                         modified = True
                         
                if modified:
                    print(f"Updating references in: {file_path}")
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)

def move_files():
    for old_path, new_dir in MOVES.items():
        full_old_path = os.path.join(ROOT_DIR, old_path)
        if os.path.exists(full_old_path):
            full_new_dir = os.path.join(ROOT_DIR, new_dir)
            if not os.path.exists(full_new_dir):
                os.makedirs(full_new_dir)
            
            filename = os.path.basename(old_path)
            full_new_path = os.path.join(full_new_dir, filename)
            
            print(f"Moving: {old_path} -> {full_new_path}")
            shutil.move(full_old_path, full_new_path)
        else:
            print(f"Skipping missing file: {old_path}")

if __name__ == "__main__":
    print("Starting Refactor...")
    update_references()
    print("References updated. Moving files...")
    move_files()
    print("Done.")
