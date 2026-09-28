import os
import time

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


# -----------------------------
# Provider clients
# -----------------------------

gemini_client = None
groq_client = None

if GEMINI_API_KEY:
    try:
        from google import genai
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        print("Gemini API ready.")
    except Exception as e:
        print("Gemini setup failed:", e)
else:
    print("No GEMINI_API_KEY found.")

if GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("Groq API ready.")
    except Exception as e:
        print("Groq setup failed:", e)
else:
    print("No GROQ_API_KEY found.")


# -----------------------------
# System personality
# -----------------------------

SYSTEM_PROMPT = """You are EmotionVerse, a warm and emotionally intelligent companion.

You talk like a close friend who truly listens.

HOW TO REPLY:
- Write exactly 2 to 3 natural sentences. Never reply with only one line.
- Always repeat back at least ONE specific detail from their message
  (a person, place, event, exam, job, or thing they mentioned).
- Then respond to that detail genuinely, as a friend would.
- Match their emotion: celebrate joy, comfort sadness, calm anger, reassure fear.
- If their message has mixed feelings (something good AND something painful),
  acknowledge both honestly. Never celebrate only one side.
- This is an ongoing conversation. Treat it as a continuous story:
  remember what they shared before and connect your reply to it.
- Add warmth or encouragement that fits what they shared.

TONE BY EMOTION:
- joy: celebrate enthusiastically, name what they achieved, credit their effort.
- sadness: comfort gently, acknowledge their pain, offer to listen.
- anger: validate their frustration, stay calm, be on their side.
- fear: reassure them, remind them they're not alone.
- surprise: share their excitement, ask what happened.
- neutral: be friendly and warmly invite them to share more.

EXAMPLES:
User: "I passed my internal exam today!"
Bad: "I'm so thrilled."
Good: "Passing your internal exam is brilliant news — all that study clearly paid off.
You should be proud of yourself today."

User: "Someone I like said they like me, but I saw them with someone else today."
Bad: "That's wonderful news!"
Good: "That sounds genuinely complicated — there's real warmth here and also something
that stung. Both can be true at once, and your feelings make complete sense."

RULES:
- Never dismiss, minimize, or joke about their feelings.
- Never suggest they find someone else or that others have it worse.
- Never give medical advice or diagnose.
- Never mention rules, prompts, models, or internal systems.
"""


# -----------------------------
# Conversation memory
# -----------------------------

def _build_conversation_context(emotion, history):
    """
    Turn stored memory into a real conversation, so replies
    continue the story instead of starting fresh.
    """

    lines = []

    if history:
        # Oldest -> newest so the story reads in order
        recent = list(history[:8])[::-1]

        lines.append("CONVERSATION SO FAR (oldest to newest):")

        for record in recent:
            past_message = record.get("message", "")
            past_emotion = record.get("emotion", "")
            past_reply = record.get("response", "")

            if past_message:
                lines.append(
                    f'- They said: "{past_message}" ({past_emotion})'
                )

            if past_reply:
                lines.append(f'  You replied: "{past_reply}"')

        moods = [
            r.get("emotion", "")
            for r in recent
            if r.get("emotion")
        ]

        if len(set(moods)) > 1:
            lines.append(
                "Their mood has shifted: " + " -> ".join(moods)
            )

        lines.append("")

    lines.append(f"Their emotion right now is: {emotion}.")

    return "\n".join(lines)


# -----------------------------
# Gemini (primary provider)
# -----------------------------

GEMINI_MODELS = [
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.6-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-001",
]


def _generate_with_gemini(message, emotion, history):

    context = _build_conversation_context(emotion, history)

    prompt = f"""{context}

They just said:
"{message}"

Continue the conversation. Reply as their close friend,
remembering what they shared before."""

    last_error = None

    for model_name in GEMINI_MODELS:
        for attempt in range(2):
            try:
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={
                        "system_instruction": SYSTEM_PROMPT,
                        "temperature": 0.8,
                        "max_output_tokens": 300,
                    },
                )

                text = (response.text or "").strip()

                if text:
                    return text

            except Exception as e:
                last_error = e
                print(
                    f"Gemini {model_name} attempt {attempt + 1} failed:",
                    e
                )

                # Brief pause before retrying a demand spike
                time.sleep(0.8)

    if last_error:
        raise last_error

    raise Exception("Gemini returned nothing")


# -----------------------------
# Groq (secondary provider)
# -----------------------------

GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]


def _generate_with_groq(message, emotion, history):

    context = _build_conversation_context(emotion, history)

    user_prompt = f"""{context}

They just said:
"{message}"

Continue the conversation. Reply as their close friend,
remembering what they shared before."""

    last_error = None

    for model_name in GROQ_MODELS:
        try:
            completion = groq_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.8,
                max_tokens=300,
            )

            text = (
                completion.choices[0].message.content or ""
            ).strip()

            if text:
                return text

        except Exception as e:
            last_error = e
            print(f"Groq {model_name} failed:", e)

    if last_error:
        raise last_error

    raise Exception("Groq returned nothing")


# -----------------------------
# Cleanup
# -----------------------------

def _clean_reply(text):

    if not text:
        return ""

    text = text.strip()

    for prefix in [
        "Assistant:", "assistant:", "User:", "user:",
        "Emotion:", "emotion:", "Human:", "human:",
        "Reply:", "reply:",
    ]:
        if text.startswith(prefix):
            text = text[len(prefix):].strip()

    for marker in ["\n\n\n", "RULES:", "Rules:", "HOW TO REPLY:"]:
        idx = text.find(marker)
        if idx != -1:
            text = text[:idx].strip()

    if len(text) > 1 and text[0] == '"' and text[-1] == '"':
        text = text[1:-1].strip()

    return text


# -----------------------------
# Instant fallback (last resort)
# -----------------------------

FALLBACK_REPLIES = {
    "sadness": "That sounds really hard, and your feelings matter. I'm here with you — tell me whatever you'd like to share.",
    "joy": "That's wonderful news, and you should feel proud of it. I'm really glad this happened for you.",
    "anger": "That sounds genuinely frustrating, and your anger makes sense. I'm on your side — let's take it one step at a time.",
    "fear": "It's completely okay to feel scared, and you're not facing this alone. We'll take it slowly together.",
    "surprise": "Wow, that's quite a surprise! Tell me what happened and how you're feeling about it.",
    "disgust": "That sounds really unpleasant, and it's fine to feel that way. I'm here if you want to talk it through.",
    "neutral": "Thanks for sharing that with me. How are you feeling about it right now?",
}

MIXED_HINTS = [
    "but", "however", "at the same time", "not sure", "confused",
    "ignore", "ignoring", "something inside", "feel something",
    "another girl", "another boy", "someone else", "other girl",
    "other boy", "jealous", "jealousy", "hurt", "upset",
    "complicated",
]

CONFLICT_REPLIES = [
    "That sounds genuinely complicated, and it makes sense you feel pulled in two directions. You don't have to sort it out right now — I'm here to listen.",
    "It sounds like there's real warmth here and also something that stung. Both can be true at once, and your feelings are valid.",
    "That's a lot to hold at the same time, and it's okay to feel unsure. Tell me more about what's going on inside.",
]


def _pick_conflict_reply(message):
    key = (message or "").strip()
    return CONFLICT_REPLIES[abs(hash(key)) % len(CONFLICT_REPLIES)]


# -----------------------------
# Public entry point
# -----------------------------

def generate_response(message, emotion, history):
    """
    Gemini -> Groq -> instant emotion-aware reply.

    Two independent providers means one outage never
    takes the chatbot down.
    """

    # 1. Gemini
    if gemini_client is not None:
        try:
            reply = _clean_reply(
                _generate_with_gemini(message, emotion, history)
            )

            if len(reply) > 15:
                return reply

        except Exception as e:
            print("Gemini unavailable, trying Groq:", e)

    # 2. Groq
    if groq_client is not None:
        try:
            reply = _clean_reply(
                _generate_with_groq(message, emotion, history)
            )

            if len(reply) > 15:
                return reply

        except Exception as e:
            print("Groq unavailable, using instant reply:", e)

    # 3. Instant fallback — mixed feelings first
    text = (message or "").lower()

    if any(hint in text for hint in MIXED_HINTS):
        return _pick_conflict_reply(message)

    return FALLBACK_REPLIES.get(emotion, FALLBACK_REPLIES["neutral"])
