import sys
import os
import torch

# XTTS v2 Voice Cloning runner
AUDIO_DIR = "D:/Desktop/velari_ai_audio"

def clone_voice(speaker_wav_path: str, text: str, output_name: str = "Cloned_Voice_Output.mp3"):
    from TTS.api import TTS

    if not os.path.exists(speaker_wav_path):
        print(f"❌ Xatolik: Ovoz namunasi topilmadi: {speaker_wav_path}")
        print(f"Iltimos ovoz yozuvini {speaker_wav_path} manziliga saqlang.")
        return

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"1. XTTS v2 AI Modeli yuklanmoqda ({device.upper()} tezlatgichida)...")

    # Load XTTS v2 model
    tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2").to(device)

    output_path = os.path.join(AUDIO_DIR, output_name)
    print(f"2. Ovoz nusxalanmoqda (Cloning) va nutq sintez qilinmoqda...")

    tts.tts_to_file(
        text=text,
        speaker_wav=speaker_wav_path,
        language="uz",
        file_path=output_path
    )

    print(f"✅ MUVAFFAQIYATLI YARATILDI!")
    print(f"📁 Tayyor audio fayl: {output_path}")

if __name__ == "__main__":
    sample_file = os.path.join(AUDIO_DIR, "my_voice.wav")
    if not os.path.exists(sample_file):
        sample_file = os.path.join(AUDIO_DIR, "my_voice.mp3")

    test_text = "Assalomu alaykum! Velari do'konidan Polaris planetar mikserini bugun ellik foiz chegirmada sotib oling! Barcha mahsulotlar rasmiy kafolat bilan yetkazib beriladi!"

    clone_voice(sample_file, test_text)
