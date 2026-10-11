import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ELECTRICITY_MAPS_KEY = os.getenv("ELECTRICITY_MAPS_KEY", "")
PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")
GEMINI_MODEL = "gemini-2.5-flash"
