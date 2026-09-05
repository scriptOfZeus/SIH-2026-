import os
from PIL import Image, ImageDraw, ImageFont

fixtures_dir = os.path.join(os.path.dirname(__file__), 'test_fixtures')
os.makedirs(fixtures_dir, exist_ok=True)

def create_certificate(filename, title, name, trade, cert_no):
    img = Image.new('RGB', (800, 500), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Border
    draw.rectangle([(20, 20), (780, 480)], outline=(30, 60, 120), width=6)
    draw.rectangle([(30, 30), (770, 470)], outline=(180, 150, 50), width=2)
    
    # Header
    draw.text((220, 60), "NATIONAL SKILL DEVELOPMENT CORPORATION", fill=(20, 40, 90))
    draw.text((280, 90), "SKILL INDIA TRADE CERTIFICATE", fill=(180, 120, 20))
    draw.line([(150, 120), (650, 120)], fill=(200, 200, 200), width=2)
    
    # Body
    draw.text((120, 160), "This is to certify that the candidate whose details are given below", fill=(70, 70, 70))
    draw.text((120, 185), "has successfully completed the trade competency assessment.", fill=(70, 70, 70))
    
    draw.text((120, 240), f"Candidate Name: {name}", fill=(10, 10, 10))
    draw.text((120, 280), f"Skill Category: {trade}", fill=(10, 10, 10))
    draw.text((120, 320), f"Certificate No: {cert_no}", fill=(10, 10, 10))
    draw.text((120, 360), "Date of Issue: 15-08-2026", fill=(50, 50, 50))
    
    draw.text((120, 420), "Authorized Signatory", fill=(100, 100, 100))
    draw.text((550, 420), "NSDC Verification Seal", fill=(100, 100, 100))
    
    out_path = os.path.join(fixtures_dir, filename)
    img.save(out_path, 'PNG')
    print(f"Created: {out_path}")

def create_unreadable_image(filename):
    img = Image.new('RGB', (400, 200), color=(128, 128, 128))
    draw = ImageDraw.Draw(img)
    draw.line([(0, 0), (400, 200)], fill=(0, 0, 0), width=3)
    draw.line([(0, 200), (400, 0)], fill=(255, 255, 255), width=3)
    out_path = os.path.join(fixtures_dir, filename)
    img.save(out_path, 'PNG')
    print(f"Created unreadable image: {out_path}")

create_certificate('cert_ramesh_kumar.png', 'Skill India Certificate', 'Ramesh Kumar', 'Electrician', 'NSDC-ELEC-2026-8839')
create_certificate('cert_mismatched_suresh.png', 'Skill India Certificate', 'Suresh Patil', 'Plumber', 'NSDC-PLUMB-9999-7711')
create_unreadable_image('cert_unreadable_noisy.png')
print("All certificate fixtures created successfully!")
