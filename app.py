import os
import io
import asyncio
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import edge_tts

app = Flask(__name__)
CORS(app)

DEFAULT_VOICE = "hi-IN-MadhurNeural"

async def generate_tts_bytes(text: str, voice: str) -> bytes:
    communicate = edge_tts.Communicate(text, voice)
    audio_stream = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_stream.write(chunk["data"])
    audio_stream.seek(0)
    return audio_stream.read()

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "live",
        "service": "NischayBoard Hindi Voice Server",
        "endpoint": "/speak?text=नमस्ते&voice=hi-IN-MadhurNeural"
    })

@app.route("/speak", methods=["GET", "POST"])
def speak():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        text = (data.get("text") or "").strip()
        voice = (data.get("voice") or DEFAULT_VOICE).strip()
    else:
        text = (request.args.get("text") or "").strip()
        voice = (request.args.get("voice") or DEFAULT_VOICE).strip()

    if not text:
        return jsonify({"error": "text parameter is required"}), 400

    try:
        audio_bytes = asyncio.run(generate_tts_bytes(text, voice))
        return send_file(
            io.BytesIO(audio_bytes),
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="speech.mp3"
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
