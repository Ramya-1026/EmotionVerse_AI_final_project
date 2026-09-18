from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"

print("Loading local LLM...")

# Use CPU efficiently
torch.set_num_threads(max(1, min(8, torch.get_num_threads())))

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float32,
    low_cpu_mem_usage=True
)

model.eval()

print("Local LLM loaded successfully!")


def generate_response(message, emotion, history):

    # Only keep the latest 1 memory (smaller prompt = faster prefill)
    recent_history = history[:1]

    history_text = ""

    for record in recent_history:
        history_text += (
            f"User: {record.get('message', '')}\n"
            f"Assistant: {record.get('response', '')}\n"
        )

    prompt = f"""You are an empathetic chatbot.

Memory:
{history_text}

User: {message}
Emotion: {emotion}

Reply in ONE short supportive sentence.
Do not mention databases or internal systems.
Do not diagnose medical conditions.
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
        return_tensors="pt",
        truncation=True,
        max_length=128
    )

    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=15,
            do_sample=False,
            num_beams=1,
            use_cache=True,
            pad_token_id=tokenizer.eos_token_id
        )

    response = tokenizer.decode(
        outputs[0][inputs["input_ids"].shape[1]:],
        skip_special_tokens=True
    )

    return response.strip()
