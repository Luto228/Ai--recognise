import os
from dotenv import load_dotenv
from google import genai
import traceback

# Load environment variables
load_dotenv()
GEMINI_TOKEN = os.getenv("GEMINI_TOKEN")

def check_all_models():
    if not GEMINI_TOKEN:
        print("ERROR: GEMINI_TOKEN not found in .env file!")
        return

    print(f"--- INITIALIZING CLIENT WITH KEY: {GEMINI_TOKEN[:10]}... ---")
    try:
        client = genai.Client(api_key=GEMINI_TOKEN)
        
        print("--- FETCHING ALL AVAILABLE MODELS ---")
        models = client.models.list()
        
        # In the new SDK, we just check the name
        available_models = []
        for m in models:
            name = m.name
            # Filter for models that likely support generation
            if "gemini" in name.lower() or "gemma" in name.lower():
                # Avoid embeddings and tts models for this test
                if "embedding" not in name.lower() and "tts" not in name.lower() and "clip" not in name.lower():
                    available_models.append(name)
        
        if not available_models:
            print("WARNING: No candidate models found.")
            return

        print(f"Found {len(available_models)} candidate models.")
        print("\n" + "="*70)
        print(f"{'MODEL NAME':<45} | {'STATUS':<15}")
        print("-" * 70)

        working_models = []
        
        for model_name in available_models:
            try:
                # Simple text generation test
                response = client.models.generate_content(
                    model=model_name,
                    contents="Say 'OK'"
                )
                if response and response.text:
                    print(f"{model_name:<45} | SUCCESS ✅")
                    working_models.append(model_name)
                else:
                    print(f"{model_name:<45} | EMPTY RESPONSE ⚠️")
            except Exception as e:
                error_msg = str(e).lower()
                if "429" in error_msg:
                    print(f"{model_name:<45} | QUOTA (429) ❌")
                elif "404" in error_msg:
                    print(f"{model_name:<45} | NOT FOUND (404) ❌")
                elif "403" in error_msg:
                    print(f"{model_name:<45} | NO ACCESS (403) ❌")
                else:
                    clean_error = str(e).split('\n')[0][:30]
                    print(f"{model_name:<45} | ERR: {clean_error}...")

        print("="*70)
        if working_models:
            print(f"\n[!] Сopy these names to your Main.py models_to_try:")
            # Clean names (remove models/ prefix if needed, though the SDK handles both)
            clean_names = [n.replace('models/', '') for n in working_models]
            print(f"models_to_try = {clean_names[:10]}")
        else:
            print("\nNO WORKING MODELS FOUND. Check your API key at https://aistudio.google.com/")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    check_all_models()
