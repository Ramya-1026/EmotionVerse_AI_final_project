from datasets import load_dataset

dataset = load_dataset("google-research-datasets/go_emotions")

print("Emotion labels:")
print(dataset["train"].features["labels"].feature.names)