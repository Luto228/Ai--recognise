from google import genai
from config import GEMINI_TOKEN

client = genai.Client(api_key=GEMINI_TOKEN)
models = client.models.list()
for m in models:
    print(m.name)
