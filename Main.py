from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
import base64
import traceback
from google import genai
from google.genai import types
from config import GEMINI_TOKEN

app = Flask(__name__)
CORS(app)

client = None
print("--- INITIALIZING GEMINI CLIENT ---")
try:
    if not GEMINI_TOKEN or GEMINI_TOKEN == 'YOUR_API_KEY_HERE':
        print("WARNING: GEMINI_TOKEN is not set correctly in config.py")
    else:
        client = genai.Client(api_key=GEMINI_TOKEN)
        print("SUCCESS: Client initialized.")
        
        print("--- FETCHING AVAILABLE MODELS ---")
        models = client.models.list()
        found_any = False
        for m in models:
            print(f"DEBUG: Found model: {m.name}")
            found_any = True
        if not found_any:
            print("WARNING: No models found for this API key.")
except Exception as e:
    print(f"CRITICAL ERROR during initialization: {e}")
    traceback.print_exc()

def analyze_with_gemini(image_data, is_url=False):
    if client is None:
        return {"verdict": "Error", "is_ai": False, "confidence": "0%", "reason": "API клиент не инициализирован. Проверьте API ключ."}
    try:
        print("\n" + "="*50)
        print(f"STEP 1: Starting Analysis. Mode: {'URL' if is_url else 'File'}")
        
        if is_url:
            if image_data.startswith('data:'):
                print("STEP 2: Detected Data URI (Base64). Decoding...")
                import re
                base64_data = re.sub(r'^data:image/.+;base64,', '', image_data)
                raw_bytes = base64.b64decode(base64_data)
                print(f"DEBUG: Decoded size: {len(raw_bytes)} bytes.")
                img = types.Part.from_bytes(data=raw_bytes, mime_type="image/jpeg")
            else:
                print(f"STEP 2: Fetching image from URL: {image_data[:60]}...")
                headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
                response = requests.get(image_data, headers=headers, timeout=10)
                if response.status_code != 200:
                    raise Exception(f"Failed to fetch image. Status code: {response.status_code}")
                print(f"DEBUG: Downloaded size: {len(response.content)} bytes. Status: {response.status_code}")
                img = types.Part.from_bytes(data=response.content, mime_type="image/jpeg")
        else:
            print(f"STEP 2: Processing uploaded file. Size: {len(image_data)} bytes.")
            img = types.Part.from_bytes(data=image_data, mime_type="image/jpeg")

        prompt = """
        Analyze this image and determine if it is AI-generated or a real photograph.
        Return ONLY a JSON object with these fields, without any markdown blocks or extra text:
        {
            "verdict": "AI-Generated" or "Real Photo",
            "is_ai": true or false,
            "confidence": "percentage",
            "reason": "brief explanation in Russian"
        }
        """

        print("STEP 3: Sending request to Gemini API...")
        
        models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash']
        
        response = None
        last_error = None
        
        for model_name in models_to_try:
            try:
                print(f"DEBUG: Trying model {model_name}...")
                response = client.models.generate_content(
                    model=model_name,
                    contents=[prompt, img],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                    )
                )
                print(f"SUCCESS: Model {model_name} worked!")
                break
            except Exception as e:
                last_error = e
                error_msg = str(e)
                print(f"ERROR with model {model_name}: {error_msg}")
                continue
        
        if not response:
            print("!!! ALL MODELS FAILED !!!")
            return {
                "verdict": "Error",
                "is_ai": False,
                "confidence": "0%",
                "reason": "Sorry bro, its to hard to my 2000 IQ!"
            }
        
        print("STEP 4: Received response. Parsing...")
        text_response = response.text.strip()
        print(f"DEBUG: Raw response text: {text_response}")
        
        import json
        import re
        
        # Remove markdown code block if present (despite instructions)
        text_response = re.sub(r'^```(?:json)?\n', '', text_response)
        text_response = re.sub(r'\n```$', '', text_response)
        text_response = text_response.strip()
        
        try:
            res_data = json.loads(text_response)
        except Exception as json_err:
            print(f"JSON Parsing failed: {json_err}. Trying regex fallback.")
            # Fallback parsing with regex
            json_match = re.search(r'\{.*\}', text_response, re.DOTALL)
            if json_match:
                try:
                    res_data = json.loads(json_match.group())
                except:
                    is_ai_detected = "AI-Generated" in text_response or "true" in text_response.lower()
                    res_data = {
                        "verdict": "AI-Generated" if is_ai_detected else "Real Photo",
                        "is_ai": is_ai_detected,
                        "confidence": "unknown",
                        "reason": "Could not parse JSON response"
                    }
            else:
                is_ai_detected = "AI-Generated" in text_response or "true" in text_response.lower()
                res_data = {
                    "verdict": "AI-Generated" if is_ai_detected else "Real Photo",
                    "is_ai": is_ai_detected,
                    "confidence": "unknown",
                    "reason": "Could not parse JSON response"
                }
        
        # Ensure is_ai exists
        if "is_ai" not in res_data:
            res_data["is_ai"] = res_data.get("verdict") == "AI-Generated"
            
        print(f"STEP 5: Final verdict: {res_data.get('verdict')}")
        print("="*50 + "\n")
        return res_data
    except Exception as e:
        print(f"\n!!! ERROR DURING ANALYSIS !!!")
        print(f"Error Message: {e}")
        traceback.print_exc()
        print("="*50 + "\n")
        return {"verdict": "Error", "is_ai": False, "confidence": "0%", "reason": f"Ошибка: {str(e)}"}

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image part"}), 400
        image_file = request.files['image'].read()
        if not image_file:
            return jsonify({"error": "Empty image"}), 400
        return jsonify(analyze_with_gemini(image_file))
    except Exception as e:
        return jsonify({"verdict": "Error", "is_ai": False, "reason": str(e)}), 500

@app.route('/analyze_url', methods=['POST'])
def analyze_url():
    try:
        data = request.json
        if not data or 'url' not in data:
            return jsonify({"error": "No URL provided"}), 400
        return jsonify(analyze_with_gemini(data.get('url'), is_url=True))
    except Exception as e:
        return jsonify({"verdict": "Error", "is_ai": False, "reason": str(e)}), 500

if __name__ == '__main__':
    print("\n>>> SERVER STARTING ON http://127.0.0.1:5000 <<<")
    app.run(debug=False, port=5000)
