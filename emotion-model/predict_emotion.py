from pathlib import Path
import torch
import torch.nn as nn
from transformers import AutoTokenizer, ModernBertModel


MODEL_NAME = "answerdotai/ModernBERT-base"

EMOTIONS = [
    "joy",
    "sadness",
    "anger",
    "fear",
    "surprise",
    "disgust",
    "neutral"
]


# -----------------------------
# Classifier
# -----------------------------

class EmotionClassifier(nn.Module):

    def __init__(self):
        super().__init__()

        self.network = nn.Sequential(
            nn.Linear(768, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 7)
        )

    def forward(self, x):
        return self.network(x)


# -----------------------------
# Load models
# -----------------------------

print("Loading ModernBERT...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = ModernBertModel.from_pretrained(MODEL_NAME)

model.eval()

for param in model.parameters():
    param.requires_grad = False


print("Loading emotion classifier...")

classifier = EmotionClassifier()

classifier.load_state_dict(
    torch.load(
        str(Path(__file__).parent / "emotion_classifier_v2.pt")
    )
)

classifier.eval()

print("Models loaded!")


# -----------------------------
# Prediction function
# -----------------------------

def predict_emotion(text):

    inputs = tokenizer(
        text,
        padding=True,
        truncation=True,
        max_length=64,
        return_tensors="pt"
    )

    with torch.no_grad():

        outputs = model(**inputs)

        embedding = outputs.last_hidden_state.mean(dim=1)

        logits = classifier(embedding)

        probabilities = torch.softmax(logits, dim=1)

        predicted_id = torch.argmax(
            probabilities,
            dim=1
        ).item()

        confidence = probabilities[0][predicted_id].item()

    return EMOTIONS[predicted_id], confidence


# -----------------------------
# Test messages
# -----------------------------

if __name__ == "__main__":

    messages = [
        "I finally got my dream job!",
        "I am really sad today.",
        "I am so angry at what happened.",
        "I am scared about tomorrow.",
        "Wow! I did not expect that!",
        "This food smells disgusting.",
        "The weather is normal today."
    ]

    for message in messages:

        emotion, confidence = predict_emotion(message)

        print()
        print("Message:", message)
        print("Emotion:", emotion)
        print("Confidence:", f"{confidence * 100:.2f}%")