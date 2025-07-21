#!/usr/bin/env python3
import os
import sys
import uvicorn

def main():
    # Get port from environment variable
    port_str = os.environ.get("PORT", "8000")
    
    try:
        port = int(port_str)
    except ValueError:
        print(f"Invalid PORT value: {port_str}, using default 8000")
        port = 8000
    
    print(f"Starting server on port {port}")
    print(f"Environment variables: PORT={os.environ.get('PORT', 'NOT_SET')}")
    
    try:
        uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 