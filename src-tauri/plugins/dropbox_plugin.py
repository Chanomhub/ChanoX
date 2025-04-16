# plugins/dropbox_plugin.py
import json
import sys
import requests

def download(url, file_path, download_id, options):
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    f.write(chunk)
        return {"status": "success", "path": file_path}
    except Exception as e:
        return {"status": "error", "error": str(e)}

def main():
    try:
        input_data = json.load(sys.stdin)
        action = input_data.get("action")
        if action == "download":
            result = download(
                input_data["url"],
                input_data["file_path"],
                input_data["download_id"],
                input_data.get("options", {})
            )
            print(json.dumps(result))
        else:
            print(json.dumps({"status": "error", "error": f"Unknown action: {action}"}))
    except Exception as e:
        print(json.dumps({"status": "error", "error": str(e)}))
    sys.stdout.flush()

if __name__ == "__main__":
    main()