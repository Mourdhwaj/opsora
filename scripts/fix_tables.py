import re

filepath = '/Users/yudhistherkumar/Opsora/opsora_mvp_refinement.md'

with open(filepath, 'r') as f:
    content = f.read()

# Replace any separator line that has exactly 7 columns with 8 columns
# We look for a line that is exactly "|---|---|---|---|---|---|---|\n"
content = re.sub(r'\|---\|---\|---\|---\|---\|---\|---\|\n', '|---|---|---|---|---|---|---|---|\n', content)

with open(filepath, 'w') as f:
    f.write(content)

# Also update the artifact file
artifact_path = '/Users/yudhistherkumar/.gemini/antigravity-ide/brain/e4414ab8-7a90-42a3-bb09-0c1486c5b607/opsora_mvp_refinement.md'
with open(artifact_path, 'r') as f:
    artifact_content = f.read()

artifact_content = re.sub(r'\|---\|---\|---\|---\|---\|---\|---\|\n', '|---|---|---|---|---|---|---|---|\n', artifact_content)

with open(artifact_path, 'w') as f:
    f.write(artifact_content)

print("Tables fixed!")
