import urllib.request
import os

url = "https://raw.githubusercontent.com/google-research/google-research/master/goemotions/data/train.tsv"

output_file = "train.tsv"

print("Downloading GoEmotions training data...")

urllib.request.urlretrieve(url, output_file)

print("Download completed!")
print("Saved as:", os.path.abspath(output_file))