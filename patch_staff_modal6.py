import re

with open('src/components/StaffRegistrationModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("role: role,", "role: role,\n        foto_url: formData.foto_url,")
content = content.replace("setFormData({", "setFormData({\n        foto_url: '',")

with open('src/components/StaffRegistrationModal.tsx', 'w') as f:
    f.write(content)
