import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replacement 1: T-010
    t010_pattern = r'\| T-010 \|.*?\| \[ \] Pending \|'
    t010_replacement = '| T-010 | `/payments-proof/invoices/generate` | **Invoices only include base rent.** `totalAmount = resident.rentAmount`. No utility charges, food charges, or late fees calculated. | Create a `billing_config` table per property for per-unit electricity rates, water, and food. **Make it configurable by Admin** whether to combine food + utility + rent into a single invoice charge or bill them separately. | Admin | Gemini 1.5 Pro | Analyze `apps/api/src/routes/payments-proof.ts` lines 38-96 (invoice generation). Design a configurable billing engine: (1) queries `electricity_readings` for the resident\'s room/floor meter, (2) queries `meal_attendance` to count meal-days × per-meal rate, (3) Add a configuration toggle for Admins to choose whether to merge food/utility/rent into one consolidated charge or list them as separate line items. | [ ] Pending |'
    
    # Replacement 2: T-011
    t011_pattern = r'\| T-011 \|.*?\| \[ \] Pending \|'
    t011_replacement = '| T-011 | No route exists | **No UPI QR code display & proof upload.** Zero-MDR strategy requires displaying the owner\'s UPI QR code to tenants for direct transfer. | Add a link/button on the tenant invoice page that displays the owner\'s UPI QR code. After paying via the QR code, ensure the tenant is prompted to upload the payment screenshot as proof. | Tenant | Gemini 1.5 Pro | Design a UPI payment flow for tenants: (1) Store owner\'s UPI VPA (Virtual Payment Address) and static QR code in the `tenants` table or new `payment_config` table, (2) Add a "Pay via UPI" link on the invoice detail page that displays this QR code, (3) Implement a required next step where the tenant uploads the payment screenshot (transaction proof) right after scanning and paying. | [ ] Pending |'

    # Replacement 3: T-012
    t012_pattern = r'\| T-012 \|.*?\| \[ \] Pending \|'
    t012_replacement = '| T-012 | No route exists | **Bank statement parsing / OCR (Phase 2).** Automated bank statement parsing to match UPI/NEFT transactions to invoices is a complex feature that should be deferred. | Mark OCR and automated bank statement parsing as a "Next Version / Phase 2" feature. Add it to the UI as an optional feature marked "Coming Soon" to manage expectations. | Owner | Gemini 1.5 Pro | Add an "Automated Bank Reconciliation (OCR)" button/section on the Owner\'s financial dashboard but disable it and label it "Coming Soon (Phase 2)". The immediate MVP flow will rely entirely on manual verification of uploaded tenant screenshots, keeping OCR as an optional future enhancement. | [ ] Pending |'

    content = re.sub(t010_pattern, t010_replacement, content, flags=re.DOTALL)
    content = re.sub(t011_pattern, t011_replacement, content, flags=re.DOTALL)
    content = re.sub(t012_pattern, t012_replacement, content, flags=re.DOTALL)

    with open(filepath, 'w') as f:
        f.write(content)

update_file('/Users/yudhistherkumar/Opsora/opsora_mvp_refinement.md')
update_file('/Users/yudhistherkumar/.gemini/antigravity-ide/brain/e4414ab8-7a90-42a3-bb09-0c1486c5b607/opsora_mvp_refinement.md')

print("Updated Module 2 tasks.")
