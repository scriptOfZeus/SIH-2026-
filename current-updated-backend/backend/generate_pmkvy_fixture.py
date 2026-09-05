import os
from PIL import Image, ImageDraw, ImageFont

fixtures_dir = os.path.join(os.path.dirname(__file__), 'test_fixtures')
os.makedirs(fixtures_dir, exist_ok=True)

def create_pmkvy_certificate():
    img = Image.new('RGB', (800, 557), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Border
    draw.rectangle([(15, 15), (785, 542)], outline=(20, 50, 100), width=4)
    draw.rectangle([(25, 25), (775, 532)], outline=(200, 160, 50), width=2)
    
    # Header
    draw.text((260, 50), "SKILL INDIA - PMKVY CERTIFICATION", fill=(20, 50, 100))
    draw.text((230, 80), "PRADHAN MANTRI KAUSHAL VIKAS YOJANA", fill=(180, 100, 20))
    draw.line([(100, 110), (700, 110)], fill=(220, 220, 220), width=2)
    
    # Certificate Body Text
    draw.text((100, 150), "This is to certify that", fill=(60, 60, 60))
    draw.text((100, 190), "Mr. Abhishek Rohidas Mavkar", fill=(10, 10, 10))
    draw.text((100, 235), "has successfully cleared the assessment for the job role of", fill=(60, 60, 60))
    draw.text((100, 275), "Greenhouse Operator (AGR/Q1003)", fill=(10, 10, 10))
    draw.text((100, 320), "conforming to National Skills Qualifications Framework Level - 3", fill=(40, 40, 40))
    draw.text((100, 360), "with Grade - B", fill=(40, 40, 40))
    draw.text((100, 400), "February 19, 2021", fill=(60, 60, 60))
    draw.text((100, 440), "Training Location - Pune, Maharashtra", fill=(40, 40, 40))
    draw.text((100, 480), "Assessed by Trendsetters Skill Assessors Private Limited", fill=(70, 70, 70))
    
    out_path = os.path.join(fixtures_dir, 'cert_pmkvy_abhishek.jpg')
    img.save(out_path, 'JPEG', quality=95)
    print(f"Created: {out_path} (800x557 JPEG)")

create_pmkvy_certificate()
