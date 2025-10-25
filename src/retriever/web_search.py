from tavily import TavilyClient
from src.config import Config

class TavilySearch:
    def __init__(self):
        self.client = TavilyClient(api_key=Config.TAVILY_API_KEY)

    def search(self, query: str):
        result = self.client.search(query=query)
        return [r['content'] for r in result.get("results", [])]
