import torch
import torch.nn as nn

# Load saved ModernBERT features
data = torch.load("emotion_features.pt")

X = data["embeddings"]
y = data["labels"]

print("Features:", X.shape)
print("Labels:", y.shape)

# Small classifier
classifier = nn.Linear(768, 7)

# Loss function
loss_function = nn.CrossEntropyLoss()

# Optimizer
optimizer = torch.optim.Adam(classifier.parameters(), lr=0.001)

EPOCHS = 30

for epoch in range(EPOCHS):

    # Forward pass
    predictions = classifier(X)

    # Calculate loss
    loss = loss_function(predictions, y)

    # Backpropagation
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    # Calculate accuracy
    predicted_labels = torch.argmax(predictions, dim=1)
    accuracy = (predicted_labels == y).float().mean()

    print(
        f"Epoch {epoch + 1}/{EPOCHS} "
        f"| Loss: {loss.item():.4f} "
        f"| Accuracy: {accuracy.item() * 100:.2f}%"
    )

# Save classifier
torch.save(classifier.state_dict(), "emotion_classifier.pt")

print("\nTraining completed!")
print("Classifier saved as emotion_classifier.pt")