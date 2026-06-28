import re

with open('opsora_mvp_refinement.md', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.startswith('| Task ID |'):
        new_lines.append(line.rstrip('\n') + ' Status |\n')
    elif line.startswith('|---|'):
        new_lines.append(line.rstrip('\n') + '---|\n')
    elif line.startswith('| T-'):
        if 'T-022' in line:
            new_lines.append(line.rstrip('\n') + ' [x] Completed |\n')
        else:
            new_lines.append(line.rstrip('\n') + ' [ ] Pending |\n')
    else:
        new_lines.append(line)

with open('opsora_mvp_refinement.md', 'w') as f:
    f.writelines(new_lines)
