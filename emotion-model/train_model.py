from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer
)
import numpy as np
from sklearn.metrics import accuracy_score, f1_score


# -----------------------------
# 1. Load GoEmotions dataset
# -----------------------------

dataset = load_dataset("google-research-datasets/go_emotions")


# -----------------------------
# 2. Emotion mapping
# -----------------------------

emotion_labels = {
    "joy": 0,
    "sadness": 1,
    "anger": 2,
    "fear": 3,
    "surprise": 4,
    "disgust": 5,
    "neutral": 6
}


label_names = dataset["train"].features["labels"].feature.names


# -----------------------------
# 3. Convert GoEmotions labels
# -----------------------------

def prepare_example(example):

    if len(example["labels"]) != 1:
        return {
            "text": example["text"],
            "label": -1
        }

    emotion_name = label_names[example["labels"][0]]

    if emotion_name not in emotion_labels:
        return {
            "text": example["text"],
            "label": -1
        }

    return {
        "text": example["text"],
        "label": emotion_labels[emotion_name]
    }


dataset = dataset.map(prepare_example)

dataset = dataset.filter(
    lambda example: example["label"] != -1
)


# -----------------------------
# 4. Load ModernBERT tokenizer
# -----------------------------

MODEL_NAME = "answerdotai/ModernBERT-base"

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)


# -----------------------------
# 5. Tokenize text
# -----------------------------

def tokenize_function(example):

    return tokenizer(
        example["text"],
        truncation=True,
        padding="max_length",
        max_length=128
    )


tokenized_dataset = dataset.map(
    tokenize_function,
    batched=True
)


# -----------------------------
# 6. Remove unnecessary columns
# -----------------------------

tokenized_dataset = tokenized_dataset.remove_columns(
    ["text", "labels", "id"]
)


# -----------------------------
# 7. Load ModernBERT
# -----------------------------

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=7,
    id2label={
        0: "joy",
        1: "sadness",
        2: "anger",
        3: "fear",
        4: "surprise",
        5: "disgust",
        6: "neutral"
    },
    label2id={
        "joy": 0,
        "sadness": 1,
        "anger": 2,
        "fear": 3,
        "surprise": 4,
        "disgust": 5,
        "neutral": 6
    }
)


# -----------------------------
# 8. Evaluation metrics
# -----------------------------

def compute_metrics(pred):

    predictions = np.argmax(
        pred.predictions,
        axis=1
    )

    labels = pred.label_ids

    accuracy = accuracy_score(
        labels,
        predictions
    )

    f1 = f1_score(
        labels,
        predictions,
        average="weighted"
    )

    return {
        "accuracy": accuracy,
        "f1": f1
    }


# -----------------------------
# 9. Training configuration
# -----------------------------

training_args = TrainingArguments(
    output_dir="./emotion_model",
    eval_strategy="epoch",

    num_train_epochs=1,

    per_device_train_batch_size=2,
    per_device_eval_batch_size=2,

    logging_steps=50,

    save_strategy="epoch",

    report_to="none"
)


# -----------------------------
# 10. Trainer
# -----------------------------

trainer = Trainer(
    model=model,
    args=training_args,

    train_dataset=tokenized_dataset["train"],
    eval_dataset=tokenized_dataset["validation"],

    compute_metrics=compute_metrics
)


# -----------------------------
# 11. Start training
# -----------------------------

print("\nStarting ModernBERT training...\n")

trainer.train()


# -----------------------------
# 12. Save model
# -----------------------------

trainer.save_model("./emotion_model")
tokenizer.save_pretrained("./emotion_model")

print("\nTraining completed!")
print("Model saved in: ./emotion_model")