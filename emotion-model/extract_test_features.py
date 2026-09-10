import torch
from transformers import AutoTokenizer, ModernBertModel

MODEL_NAME = "answerdotai/ModernBERT-base"

print("Loading ModernBERT...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = ModernBertModel.from_pretrained(MODEL_NAME)

model.eval()

for param in model.parameters():
    param.requires_grad = False

print("ModernBERT loaded!")
print("Reading test data...")

texts = []
labels = []

with open("test_emotion_data.tsv", "r", encoding="utf-8") as f:
    for line in f:
        text, label = line.rstrip("\n").split("\t")
        texts.append(text)
        labels.append(int(label))

print("Total test examples:", len(texts))

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

        embeddings = outputs.last_hidden_state.mean(dim=1)

        all_embeddings.append(embeddings)

        processed = min(start + BATCH_SIZE, len(texts))

        if processed % 200 == 0 or processed == len(texts):
            print(f"Processed {processed}/{len(texts)}")

embeddings = torch.cat(all_embeddings)
labels = torch.tensor(labels)

print("Test embedding shape:", embeddings.shape)

torch.save(
    {
        "embeddings": embeddings,
        "labels": labels
    },
    "test_features.pt"
)

print("Test features saved as test_features.pt")