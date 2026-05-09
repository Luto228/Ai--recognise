import sys
sys.dont_write_bytecode = True
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
import base64
import traceback
from google import genai
from google.genai import types
from config import GEMINI_TOKEN
import database
# Removed Google Auth imports

database.init_db()

app = Flask(__name__)
CORS(app)

def get_user_from_token():
    # Minimalist: Just check for 'X-User-ID' header for now
    user_id = request.headers.get('X-User-ID')
    if user_id and user_id.isdigit():
        return int(user_id)
    return None

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    nickname = data.get('nickname')
    password = data.get('password')
    if not nickname or not password:
        return jsonify({"error": "Nickname and password required"}), 400
    
    user_id = database.register_user(nickname, password)
    if user_id:
        return jsonify({"message": "User registered", "user_id": user_id, "nickname": nickname})
    else:
        return jsonify({"error": "Nickname already exists"}), 409

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    nickname = data.get('nickname')
    password = data.get('password')
    user_id = database.login_user(nickname, password)
    if user_id:
        return jsonify({"message": "Login successful", "user_id": user_id, "nickname": nickname})
    else:
        return jsonify({"error": "Invalid nickname or password"}), 401

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

def analyze_with_gemini(image_data, is_url=False, lang='en'):
    if client is None:
        return {"verdict": "Error", "is_ai": False, "confidence": "0%", "reason": "API клиент не инициализирован. Проверьте API ключ."}
    try:
        print("\n" + "="*50)
        print(f"STEP 1: Starting Analysis. Mode: {'URL' if is_url else 'File'} | Lang: {lang}")
        
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

        prompt = f"""
        Analyze this image and determine if it is AI-generated or a real photograph.
        langiege: {lang}
        
        Return ONLY a JSON object with these fields, without any markdown blocks or extra text:
        {{
            "verdict": "AI-Generated" or "Real Photo",
            "is_ai": true or false,
            "confidence": "percentage",
            "reason": "brief explanation in the language specified above"
        }}
        """

        print("STEP 3: Sending request to Gemini API...")
        
        models_to_try = [
            'gemini-3.1-flash-lite',
            'gemini-3.1-flash-lite-preview',
            'gemini-3-flash-preview',
            'gemini-2.5-flash-lite',
            'gemini-flash-lite-latest',
            'gemini-flash-latest'
        ]
        
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
                if response and response.text:
                    print(f"SUCCESS: Model {model_name} worked!")
                    break
                else:
                    print(f"WARNING: Model {model_name} returned empty response.")
            except Exception as e:
                last_error = e
                error_msg = str(e)
                print(f"ERROR with model {model_name}: {error_msg}")
                if "429" in error_msg:
                    print(f"DEBUG: Model {model_name} hit quota limits (429).")
                continue
        
        if not response:
            print("!!! ALL MODELS FAILED !!!")
            reason = "Sorry bro, its to hard to my 2000 IQ!"
            if last_error:
                error_str = str(last_error)
                if "429" in error_str:
                    reason = "API Quota exceeded (429). Please wait a bit or check your API key."
                elif "403" in error_str:
                    reason = "Invalid API Key (403). Check your .env file."
                elif "404" in error_str:
                    reason = "Model not found (404). Gemini API might be down or model name is wrong."
                else:
                    reason = f"Error: {error_str[:100]}"
            return {
                "verdict": "Error",
                "is_ai": False,
                "confidence": "0%",
                "reason": reason
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
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({"error": "Unauthorized. Please login first."}), 401
            
        if 'image' not in request.files:
            return jsonify({"error": "No image part"}), 400
        image_file = request.files['image'].read()
        if not image_file:
            return jsonify({"error": "Empty image"}), 400
        
        lang = request.form.get('lang', 'en')
        result = analyze_with_gemini(image_file, lang=lang)
        
        if result.get('verdict') in ['AI-Generated', 'Real Photo']:
            # We don't have a URL for uploaded files, so we store 'Uploaded File' or similar
            database.save_to_history(user_id, "Uploaded File", result.get('verdict'), result.get('reason'))
            
        return jsonify(result)
    except Exception as e:
        return jsonify({"verdict": "Error", "is_ai": False, "reason": str(e)}), 500

@app.route('/analyze_url', methods=['POST'])
def analyze_url():
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({"error": "Unauthorized. Please login first."}), 401
            
        data = request.json
        if not data or 'url' not in data:
            return jsonify({"error": "No URL provided"}), 400
        
        lang = data.get('lang', 'en')
        result = analyze_with_gemini(data.get('url'), is_url=True, lang=lang)
        if result.get('verdict') in ['AI-Generated', 'Real Photo']:
            database.save_to_history(user_id, data.get('url'), result.get('verdict'), result.get('reason'))
        return jsonify(result)
    except Exception as e:
        return jsonify({"verdict": "Error", "is_ai": False, "reason": str(e)}), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
            
        stats = database.get_stats(user_id)
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("\n>>> SERVER STARTING ON http://127.0.0.1:5000 <<<")
    app.run(debug=False, port=5000)
