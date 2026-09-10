from transformers import AutoTokenizer, AutoModelForCausalLM

MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"

print("Loading local LLM...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForCausalLM.from_pretrained(MODEL_NAME)

print("Local LLM loaded successfully!")


def generate_response(message, emotion, history):

    # Build conversation memory
    history_text = ""

    for record in history:
        history_text += (
            f"User: {record['message']}\n"
            f"Emotion: {record['emotion']}\n"
            f"Assistant: {record.get('response', '')}\n\n"
        )

    prompt = f"""
You are EmotionVerse AI, an empathetic personal chatbot.

Previous conversation memory:
{history_text}

Current user message:
{message}

Current detected emotion:
{emotion}

Use the previous conversation and emotional history when it is relevant.
Respond naturally as if you remember the user's previous conversations.

Important rules:
- Be empathetic and supportive.
- Do not mention that you are reading a database.
- Do not diagnose medical conditions.
- Do not repeat the user's message.
- Keep the response short: 1 to 3 sentences.
"""

    messages = [
        {
            "role": "user",
            "content": prompt
        }
    ]

    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    inputs = tokenizer(
        text,
        return_tensors="pt"
    )

    outputs = model.generate(
        **inputs,
        max_new_tokens=60,
        do_sample=True,
        temperature=0.7
    )

    response = tokenizer.decode(
        outputs[0][inputs["input_ids"].shape[1]:],
        skip_special_tokens=True
    )

    return response.strip()