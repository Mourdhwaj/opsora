import re
import os

filepath = '/Users/yudhistherkumar/.gemini/antigravity-ide/brain/e4414ab8-7a90-42a3-bb09-0c1486c5b607/opsora_mvp_refinement.md'

with open(filepath, 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.startswith('| Task ID |'):
        if 'Status' not in line:
            new_lines.append(line.rstrip('\n') + ' Status |\n')
        else:
            new_lines.append(line)
    elif line.startswith('|---|'):
        if line.count('|') == 8: # already has status
            new_lines.append(line)
        else:
            new_lines.append(line.rstrip('\n') + '---|\n')
    elif line.startswith('| T-'):
        if line.count('|') == 9: # already has status
            new_lines.append(line)
        else:
            if 'T-022' in line:
                new_lines.append(line.rstrip('\n') + ' [x] Completed |\n')
            else:
                new_lines.append(line.rstrip('\n') + ' [ ] Pending |\n')
    else:
        new_lines.append(line)

# Append Module 18 if not exists
content = "".join(new_lines)
if "MODULE 18" not in content:
    module18 = """
### MODULE 18: GO-TO-MARKET & SALES READINESS

| Task ID | Module/Route | Issue / Feature Gap | Recommended Fix / Action | Target Role | AI Tool | Prompt/Context for AI | Status |
|---|---|---|---|---|---|---|---|
| T-082 | `/dashboard` | **No Demo Data Seeder.** When showing the MVP to a PG owner, an empty dashboard is unimpressive. We need a way to instantly populate realistic demo data (residents, fake invoices, active complaints). | Create a `POST /system/seed-demo` endpoint that generates 1 property, 5 floors, 20 rooms, 40 residents, and 3 months of historical financial data for pitch purposes. | Admin | Gemini 1.5 Pro | Design a robust database seeder for demo purposes. Create an endpoint `POST /system/seed-demo` that accepts a `tenantId`. It should use Faker.js to generate: 1 PG property, 20 rooms (mixed AC/Non-AC), 35 active residents with Indian names, 3 months of past rent invoices (mostly paid, some overdue), 5 active complaints, and a 7-day food menu. Ensure all FKs match perfectly. This is critical for sales pitches. | [ ] Pending |
| T-083 | `/reports` | **No Data Export.** PG owners love Excel. The MVP needs a way to export the resident list, payment history, and complaints to CSV/Excel. | Add "Export CSV" buttons to `/residents`, `/payments`, and `/complaints` pages using a library like `react-csv` or generating CSV server-side. | Owner | Mimo v2 | Create a universal CSV export utility in the frontend. Add an "Export" button to `apps/web/src/app/(dashboard)/residents/page.tsx` that triggers a download of the current table data as a CSV. Do the same for `/payments` and `/complaints`. The data should be formatted clearly for PG owners who rely heavily on Excel for their accounting. | [ ] Pending |
| T-084 | `/onboarding` | **No "First Run" Experience.** When a PG owner signs up, they see empty screens. They need a guided setup flow to create their first property, rooms, and add their first resident. | Build a guided onboarding wizard component that takes over the screen on first login: (1) Add Property, (2) Generate Rooms, (3) Invite Staff. | Owner | Gemini 1.5 Pro | Design a first-run onboarding flow for new PG owners. When `properties.length === 0`, intercept the dashboard view with a 3-step wizard: Step 1: "Let's set up your first PG" (Name, Address), Step 2: "Configure Rooms" (Bulk create rooms per floor), Step 3: "Set Billing defaults" (Electricity rate, food rate). Provide the React component structure and state management approach. | [ ] Pending |
"""
    # Insert before the last Appendix section
    appendix_index = content.find("## APPENDIX: ROUTE INTEGRITY MAP")
    if appendix_index != -1:
        content = content[:appendix_index] + module18 + "\n\n" + content[appendix_index:]
    else:
        content += "\n\n" + module18

with open(filepath, 'w') as f:
    f.write(content)
