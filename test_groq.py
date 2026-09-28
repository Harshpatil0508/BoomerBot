from groq import Groq
from dotenv import load_dotenv
import os
import json

load_dotenv("backend/.env")

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

try:
    res = client.chat.completions.create(
        messages=[{"role": "user", "content": 'Extract name and format as JSON {"expert_name": "Bob"}. Text: My name is Bob.'}],
        model="mixtral-8x7b-32768",
        response_format={"type": "json_object"},
        temperature=0.1
    )
    print("SUCCESS")
    print(res.choices[0].message.content)
except Exception as e:
    print("ERROR:", str(e))
