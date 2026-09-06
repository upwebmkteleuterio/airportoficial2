import re

with open('src/components/StaffRegistrationModal.tsx', 'r') as f:
    content = f.read()

foto_input = """<div className="col-span-1 md:col-span-2 flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-300 dark:border-slate-700">
                  {formData.foto_url ? (
                    <img src={formData.foto_url} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Foto de Perfil</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        // In a real app, upload and get URL. Here we mock a URL for preview.
                        const url = URL.createObjectURL(e.target.files[0]);
                        handleInputChange({ target: { name: 'foto_url', value: url } } as any);
                      }
                    }}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-[#005f5f] hover:file:bg-teal-100 cursor-pointer"
                  />
                </div>
              </div>"""

content = content.replace('<div className="grid grid-cols-1 md:grid-cols-2 gap-4">', '<div className="grid grid-cols-1 md:grid-cols-2 gap-4">\n              ' + foto_input)

with open('src/components/StaffRegistrationModal.tsx', 'w') as f:
    f.write(content)
