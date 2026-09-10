import random
from collections import defaultdict

random.seed(42)

INPUT_FILE = "emotion_data.tsv"
OUTPUT_FILE = "balanced_data.tsv"

MAX_PER_CLASS = 400

data = defaultdict(list)

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    for line in f:
        parts = line.rstrip("\n").split("\t")

        if len(parts) != 2:
            continue

        text, label = parts
        label = int(label)

        data[label].append(text)

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    total = 0

    for label in range(7):
        examples = data[label]

        random.shuffle(examples)

        selected = examples[:MAX_PER_CLASS]

        for text in selected:
            f.write(f"{text}\t{label}\n")
            total += 1

        print(f"Label {label}: {len(selected)} examples")

print("Total balanced examples:", total)
print("Saved as:", OUTPUT_FILE)