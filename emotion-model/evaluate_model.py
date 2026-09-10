import torch
import torch.nn as nn

# Load test features
test_data = torch.load("test_features.pt")

X_test = test_data["embeddings"]
y_test = test_data["labels"]

# Recreate the classifier
classifier = nn.Linear(768, 7)

# Load trained weights
classifier.load_state_dict(
    torch.load("emotion_classifier.pt")
)

classifier.eval()

with torch.no_grad():
    predictions = classifier(X_test)
    predicted_labels = torch.argmax(predictions, dim=1)

# Overall accuracy
correct = (predicted_labels == y_test).sum().item()
total = len(y_test)

accuracy = correct / total * 100

print(f"Correct predictions: {correct}/{total}")
print(f"Test Accuracy: {accuracy:.2f}%")

# Emotion names
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

    if total_emotion > 0:
        correct_emotion = (
            predicted_labels[mask] == y_test[mask]
        ).sum().item()

        emotion_accuracy = correct_emotion / total_emotion * 100

        print(
            f"{emotion:10s}: "
            f"{correct_emotion}/{total_emotion} "
            f"({emotion_accuracy:.2f}%)"
        )