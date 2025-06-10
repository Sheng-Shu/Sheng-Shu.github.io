import pandas as pd
<<<<<<< HEAD
nodes = set(pd.read_csv('data/nodes_cleaned.csv')['id'])
=======
nodes = set(pd.read_csv('data/nodes.csv')['id'])
>>>>>>> 0a81ba2e0abfa8bc95af9ebc62263c8026f89ad1
edges = pd.read_csv('data/edges.csv')
missing = set(edges['source']).union(edges['target']) - nodes
print("edges.csv 有但 nodes.csv 没有的id：", missing)
