import os

# Path to admin.js
file_path = r'c:\Users\Leivin Jesus\OneDrive\Desktop\SiteMarcaViva\scripts\admin.js'

# Read all lines
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines before: {len(lines)}")

# Delete lines 4120-4277 (indexes 4119-4276 in zero-based)
# Keep lines 0-4119 and lines 4277+
cleaned_lines = lines[:4119] + lines[4277:]

print(f"Total lines after: {len(cleaned_lines)}")
print(f"Deleted {len(lines) - len(cleaned_lines)} lines")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(cleaned_lines)

print("✅ File cleaned successfully!")
print("Deleted duplicate notification code (lines 4120-4277)")
