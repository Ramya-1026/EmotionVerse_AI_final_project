from transformers import AutoTokenizer, ModernBertModel

MODEL_NAME = "answerdotai/ModernBERT-base"

print("Loading ModernBERT...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = ModernBertModel.from_pretrained(MODEL_NAME)

text = "I got selected for my dream job!"

inputs = tokenizer(
    text,
    return_tensors="pt"
)

outputs = model(**inputs)

print("\nModernBERT loaded successfully!")
print("Text:", text)
print("Output shape:", outputs.last_hidden_state.shape)