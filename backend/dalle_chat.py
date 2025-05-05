import requests
from PIL import Image
import io
import base64
import os
from dotenv import load_dotenv
import os
import requests
from fastapi import HTTPException
from typing import List, Dict, Union
from dotenv import load_dotenv
from PIL import Image, ImageDraw
from io import BytesIO
load_dotenv()
# === Настройки ===
api_key = os.getenv("OPENAI_API_KEY")
image_path = "or.png"
img = Image.open(image_path)
width, height = img.size

mask = Image.new("RGBA", (width, height), (0, 0, 0, 255))
draw = ImageDraw.Draw(mask)
draw.rectangle([(width//4, height//4), (3*width//4, 3*height//4)], fill=(0, 0, 0, 0))
mask.save("mask.png")

mask_path = "mask.png"
prompt = "change style of the image to ghibli style"
output_path = "result.png"
size = (512, 512)  # Должно быть квадратным: 256x256, 512x512 или 1024x1024 для DALL·E 2

# === Подготовка изображений ===
def prepare_image(path, size):
    img = Image.open(path).convert("RGBA")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer

image_file = prepare_image(image_path, size)
mask_file = prepare_image(mask_path, size)

# === Отправка запроса ===
response = requests.post(
    "https://api.openai.com/v1/images/edits",
    headers={
        "Authorization": f"Bearer {api_key}",
    },
    files={
        "image": ("image.png", image_file, "image/png"),
        "mask": ("mask.png", mask_file, "image/png"),
    },
    data={
        "prompt": prompt,
        "model": "gpt-image-1",
        "size": f"auto",
    }
)

# === Обработка ответа ===
if response.status_code == 200:
    b64 = response.json()["data"][0]["b64_json"]
    with open(output_path, "wb") as f:
        f.write(base64.b64decode(b64))
    print("Изображение сохранено в", output_path)
else:
    print("Ошибка:", response.status_code, response.text)

def edit_image(image_path: str, prompt: str) -> Image.Image:
    """
    Edit the given image based on the prompt using DALL-E edits API and return the edited PIL Image.
    """
    # Load and prepare the original image
    img = Image.open(image_path).convert("RGBA")
    width, height = img.size

    # Create a mask with a transparent center
    mask = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(mask)
    draw.rectangle([(width // 4, height // 4), (3 * width // 4, 3 * height // 4)], fill=(0, 0, 0, 0))

    # Helper to convert PIL Image to in-memory PNG buffer
    def to_buffer(pil_img: Image.Image) -> BytesIO:
        buf = BytesIO()
        pil_img.save(buf, format="PNG")
        buf.seek(0)
        return buf

    image_file = to_buffer(img)
    mask_file = to_buffer(mask)

    # Call the OpenAI image edits endpoint
    headers = {"Authorization": f"Bearer {api_key}"}
    files = {
        "image": ("image.png", image_file, "image/png"),
        "mask": ("mask.png", mask_file, "image/png"),
    }
    data = {"prompt": prompt, "model": "gpt-image-1", "size": "auto"}
    response = requests.post(
        "https://api.openai.com/v1/images/edits",
        headers=headers,
        files=files,
        data=data
    )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    b64 = response.json()["data"][0]["b64_json"]
    edited_img = Image.open(BytesIO(base64.b64decode(b64)))
    return edited_img
