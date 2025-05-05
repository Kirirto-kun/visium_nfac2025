import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
GEMINI_API = "GEMINI_API_KEY"

client = genai.Client(api_key=GEMINI_API)

image_path = Image.open("phot.jpg")

prompt = "Convert the attached image to a ghibli style art."

response = client.models.generate_content(
    model="gemini-2.0-flash-exp-image-generation",
    contents=[prompt, image_path],
    config=types.GenerateContentConfig(
        response_modalities=["Text", "Image"],
    )
)

for part in response.candidates[0].content.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        image = Image.open(BytesIO(part.inline_data.data))
        image.save("output_image.png")
        image.show()
print(response)