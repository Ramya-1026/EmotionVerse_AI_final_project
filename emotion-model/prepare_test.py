import csv

TARGET_EMOTIONS = {
    17: 0,  # joy
    25: 1,  # sadness
    2: 2,   # anger
    14: 3,  # fear
    26: 4,  # surprise
    11: 5,  # disgust
    27: 6   # neutral
}

input_file = "test.tsv"
output_file = "test_emotion_data.tsv"

count = 0

with open(input_file, "r", encoding="utf-8") as infile, \
     open(output_file, "w", encoding="utf-8", newline="") as outfile:

    writer = csv.writer(outfile, delimiter="\t")

    for line in infile:
        parts = line.rstrip("\n").split("\t")

        if len(parts) != 3:
            continue

        text, label, comment_id = parts

        try:
            label = int(label)
        except ValueError:
            continue

        if label in TARGET_EMOTIONS:
            new_label = TARGET_EMOTIONS[label]
            writer.writerow([text, new_label])
            count += 1

print("Test preprocessing completed!")
print("Total test examples:", count)
print("Saved as:", output_file)