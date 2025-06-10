import pandas as pd

df = pd.read_csv("data/edges.csv")
mid = len(df) // 2

df.iloc[:mid].to_csv("data/edges_1.csv", index=False)
df.iloc[mid:].to_csv("data/edges_2.csv", index=False)
