import urllib.request

url = "https://raw.githubusercontent.com/google-research/google-research/master/goemotions/data/test.tsv"

urllib.request.urlretrieve(url, "test.tsv")

print("Test data downloaded!")