from datasets import load_dataset
from collections import Counter
import csv

# Load GoEmotions
dataset = load_dataset("google-research-datasets/go_emotions")

# Our 7 EmotionVerse classes
emotion_labels = {
    "joy": 0,
    "sadness": 1,
    "anger": 2,
    "fear": 3,
    "surprise": 4,
    "disgust": 5,
    "neutral": 6
}

# Get original GoEmotions label names
label_names = dataset["train"].features["labels"].feature.names


def prepare_example(example):

    # Keep only single-label examples
    if len(example["labels"]) != 1:
        return {
            "text": example["text"],
            "label": -1
        }

    emotion_name = label_names[example["labels"][0]]

    # Keep only our 7 emotions
    if emotion_name not in emotion_labels:
        return {
            "text": example["text"],
            "label": -1
        }

    return {
        "text": example["text"],
        "label": emotion_labels[emotion_name]
    }


# Prepare dataset
prepared_dataset = dataset.map(prepare_example)

# Remove unwanted examples
prepared_dataset = prepared_dataset.filter(
    lambda example: example["label"] != -1
)


# ------------------------------------------------
# Create balanced training CSV
# ------------------------------------------------

MAX_SAMPLES_PER_CLASS = 400

emotion_names = [
    "joy",
    "sadness",
    "anger",
    "fear",
    "surprise",
    "disgust",
    "neutral"
]

rows = []

for emotion in emotion_names:

    label = emotion_labels[emotion]

    count = 0

    for example in prepared_dataset["train"]:

        if example["label"] == label:

            rows.append({
                "text": example["text"],
                "label": label,
                "emotion": emotion
            })

            count += 1

            if count == MAX_SAMPLES_PER_CLASS:
                break


# Save CSV
with open(
    "emotion_train.csv",
    "w",
    newline="",
    encoding="utf-8"
) as file:

    writer = csv.DictWriter(
        file,
        fieldnames=["text", "label", "emotion"]
    )

    writer.writeheader()

    writer.writerows(rows)


print("\nBalanced dataset created!")

print("Total examples:", len(rows))

print("\nClass distribution:")

counts = Counter(row["emotion"] for row in rows)

for emotion, count in counts.items():
    print(f"{emotion}: {count}")

print("\nSaved as:")
print("emotion_train.csv")