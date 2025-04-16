import argparse
import json
import sys
import os
import requests
from mediafire.api import MediaFireApi
import re

def extract_quick_key(url):
    """Extract quick_key from MediaFire URL."""
    pattern = r'(?:https?://)?(?:www\.)?mediafire\.com/file/([a-zA-Z0-9]+)'
    match = re.match(pattern, url)
    if not match:
        raise ValueError("Invalid MediaFire URL")
    return match.group(1)

def download_mediafire(url, file_path):
    try:
        print(f"Downloading from {url} to {file_path}")
        # Extract quick_key
        quick_key = extract_quick_key(url)
        # Initialize MediaFire API
        api = MediaFireApi()
        # Get download link
        response = api.file_get_links(quick_key)
        download_url = response['links'][0]['normal_download']
        # Download file
        response = requests.get(download_url, stream=True)
        if response.status_code != 200:
            raise Exception(f"Failed to access URL: {response.status_code}")
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=4096):
                f.write(chunk)
        return True
    except Exception as e:
        raise Exception(f"Download failed: {str(e)}")

def debug_missing_args(args_dict, required_args):
    missing = [arg for arg in required_args if args_dict.get(arg) is None]
    if missing:
        print("[DEBUG] Missing required arguments:", ", ".join(missing), file=sys.stderr)
    print("[DEBUG] All parsed arguments:", args_dict, file=sys.stderr)
    return missing

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', required=False)  # manually check required
    parser.add_argument('-o', '--output', required=False)  # manually check required
    args = parser.parse_args()
    args_dict = vars(args)
    required_args = ['url', 'output']
    missing = debug_missing_args(args_dict, required_args)
    if missing:
        result = {
            "status": "error",
            "error": f"Missing required argument(s): {', '.join(missing)}"
        }
        json.dump(result, sys.stdout)
        sys.stdout.flush()
        sys.exit(1)
    print(f"[INFO] Received arguments: url={args.url}, output={args.output}")
    try:
        download_mediafire(args.url, args.output)
        if os.path.exists(args.output):
            result = {
                "status": "success",
                "path": args.output
            }
        else:
            result = {
                "status": "error",
                "error": "File not found after download"
            }
    except Exception as e:
        result = {
            "status": "error",
            "error": str(e)
        }
    json.dump(result, sys.stdout)
    sys.stdout.flush()

if __name__ == "__main__":
    main()