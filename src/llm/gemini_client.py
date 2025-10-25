import google.generativeai as genai
from src.config import Config

genai.configure(api_key=Config.GOOGLE_API_KEY)

class GeminiClient:
    def __init__(self, model=Config.MODEL_NAME):
        self.model = genai.GenerativeModel(model)

    def generate(self, prompt: str) -> str:
        response = self.model.generate_content(prompt)
        return response.text.strip()
