import torch
from transformers import AutoTokenizer, ModernBertModel

MODEL_NAME = "answerdotai/ModernBERT-base"

print("Loading ModernBERT...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = ModernBertModel.from_pretrained(MODEL_NAME)

# Freeze ModernBERT
model.eval()

for param in model.parameters():
    param.requires_grad = False

print("ModernBERT loaded!")
print("Reading balanced dataset...")

texts = []
labels = []

with open("balanced_data.tsv", "r", encoding="utf-8") as f:
    for line in f:
        text, label = line.rstrip("\n").split("\t")
        texts.append(text)
        labels.append(int(label))

print("Total examples:", len(texts))

# Process in small batches to reduce CPU/RAM usage
BATCH_SIZE = 8

all_embeddings = []

with torch.no_grad():

    for start in range(0, len(texts), BATCH_SIZE):

        batch_texts = texts[start:start + BATCH_SIZE]

        inputs = tokenizer(
            batch_texts,
            padding=True,
            truncation=True,
            max_length=64,
            return_tensors="pt"
        )

        outputs = model(**inputs)

        # Take the mean of token embeddings
        embeddings = outputs.last_hidden_state.mean(dim=1)

        all_embeddings.append(embeddings)

        processed = min(start + BATCH_SIZE, len(texts))

        if processed % 100 == 0 or processed == len(texts):
            print(f"Processed {processed}/{len(texts)}")

# Combine all batches
embeddings = torch.cat(all_embeddings)

labels = torch.tensor(labels)

print("Embedding shape:", embeddings.shape)

# Save features
torch.save(
    {
        "embeddings": embeddings,
        "labels": labels
    },
    "emotion_features.pt"
)

print("Features saved as emotion_features.pt")