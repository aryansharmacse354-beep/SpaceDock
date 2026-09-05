from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SpaceDock - Space-Grade Semiconductor ML Screening</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #050b18;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .card {
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(56, 189, 248, 0.35);
            border-radius: 16px;
            padding: 40px;
            max-width: 600px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
        }
        h1 {
            color: #38bdf8;
            margin-top: 0;
            font-size: 2rem;
        }
        p {
            color: #94a3b8;
            line-height: 1.6;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #0284c7, #2563eb);
            color: white;
            padding: 12px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 700;
            margin-top: 20px;
            box-shadow: 0 4px 15px rgba(2, 132, 199, 0.4);
        }
        .badge {
            background: rgba(16, 185, 129, 0.2);
            color: #34d399;
            border: 1px solid #10b981;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 700;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">125C ESS SCREENING ENGINE READY</div>
        <h1>SpaceDock Mission Control</h1>
        <p>Space-Grade Semiconductor Burn-In Screening System powered by Dynamic AEC-Q001 Part Average Testing & 300-Tree Thermal Drift Regressors (R2=0.9860, Zero Defect Escape).</p>
        <p style="color: #cbd5e1; font-size: 0.9rem;">Interactive WebSocket mission control dashboard available on Streamlit Community Cloud.</p>
        <a href="https://github.com/aryansharmacse354-beep/SpaceDock" class="btn" target="_blank">View GitHub Repository</a>
    </div>
</body>
</html>"""
        self.wfile.write(html_content.encode('utf-8'))
        return

app = handler
