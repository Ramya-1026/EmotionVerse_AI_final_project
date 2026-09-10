import torch
import torch.nn as nn


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


# Load test data
data = torch.load("test_features.pt")

X_test = data["embeddings"]
y_test = data["labels"]

# Load V2 classifier
classifier = EmotionClassifier()

classifier.load_state_dict(
    torch.load("emotion_classifier_v2.pt")
)

classifier.eval()

with torch.no_grad():

    predictions = classifier(X_test)

    predicted_labels = torch.argmax(
        predictions,
        dim=1
    )


# Overall accuracy
correct = (
    predicted_labels == y_test
).sum().item()

total = len(y_test)

accuracy = correct / total * 100

print(f"Correct predictions: {correct}/{total}")
print(f"Test Accuracy: {accuracy:.2f}%")


# Per-emotion accuracy
emotion_names = [
    "joy",
    "sadness",
    "anger",
    "fear",
    "surprise",
    "disgust",
    "neutral"
]

print("\nPer-emotion accuracy:")

for i, emotion in enumerate(emotion_names):

    mask = y_test == i

    total_emotion = mask.sum().item()

    correct_emotion = (
        predicted_labels[mask] == y_test[mask]
    ).sum().item()

    emotion_accuracy = (
        correct_emotion / total_emotion * 100
    )

    print(
        f"{emotion:10s}: "
        f"{correct_emotion}/{total_emotion} "
        f"({emotion_accuracy:.2f}%)"
    )