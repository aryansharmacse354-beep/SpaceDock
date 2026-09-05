"""
Setup & Environment Verification Script for Semiconductor Burn-In Screening System
"""
import sys

def verify_environment():
    print("=" * 60, flush=True)
    print("  Semiconductor Burn-In Screening - Environment Verification", flush=True)
    print("=" * 60, flush=True)
    print(f"Python Version: {sys.version.split()[0]}", flush=True)
    print("-" * 60, flush=True)
    
    packages = [
        ("pandas", "pandas"),
        ("numpy", "numpy"),
        ("scikit-learn", "sklearn"),
        ("xgboost", "xgboost"),
        ("shap", "shap"),
        ("matplotlib", "matplotlib")
    ]
    
    all_passed = True
    for pkg_display, pkg_import in packages:
        try:
            mod = __import__(pkg_import)
            ver = getattr(mod, "__version__", "unknown")
            print(f"[OK] {pkg_display:<15} (version: {ver})", flush=True)
        except ImportError as e:
            print(f"[FAIL] {pkg_display:<15} - NOT INSTALLED ({e})", flush=True)
            all_passed = False
            
    print("-" * 60, flush=True)
    if all_passed:
        print("[SUCCESS] All required dependencies are properly installed!", flush=True)
        return 0
    else:
        print("[WARNING] Some dependencies are missing. Run: pip install -r requirements.txt", flush=True)
        return 1

if __name__ == "__main__":
    sys.exit(verify_environment())
