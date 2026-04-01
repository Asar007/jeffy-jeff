import os
import glob

supabase_scripts = """
<!-- Supabase -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-client.js"></script>
"""

for file in glob.glob('*.html'):
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '@supabase/supabase-js' not in content:
        # insert before </head>
        if '</head>' in content:
            content = content.replace('</head>', f'{supabase_scripts}</head>')
            with open(file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Updated {file}')
