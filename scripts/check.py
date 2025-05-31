import pandas as pd
nodes = set(pd.read_csv('data/nodes.csv')['id'])
edges = pd.read_csv('data/edges.csv')
missing = set(edges['source']).union(edges['target']) - nodes
print("edges.csv 有但 nodes.csv 没有的id：", missing)
