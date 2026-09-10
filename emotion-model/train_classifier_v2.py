import torch
import torch.nn as nn

data = torch.load("emotion_features.pt")

X = data["embeddings"]
y = data["labels"]

print("Features:", X.shape)
print("Labels:", y.shape)


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


classifier = EmotionClassifier()

loss_function = nn.CrossEntropyLoss()

optimizer = torch.optim.Adam(
    classifier.parameters(),
    lr=0.001
)

EPOCHS = 50

for epoch in range(EPOCHS):

    predictions = classifier(X)

    loss = loss_function(predictions, y)

    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    predicted_labels = torch.argmax(predictions, dim=1)

    accuracy = (
        predicted_labels == y
    ).float().mean()

    print(
        f"Epoch {epoch + 1}/{EPOCHS} "
        f"| Loss: {loss.item():.4f} "
        f"| Accuracy: {accuracy.item() * 100:.2f}%"
    )


torch.save(
    classifier.state_dict(),
    "emotion_classifier_v2.pt"
)

print("\nTraining completed!")
print("Saved as emotion_classifier_v2.pt")