import pandas as pd
import random
import csv

random.seed(42)

# Step 1: 读取和清洗 nodes
nodes_df = pd.read_csv('data/nodes_cleaned_full.csv', low_memory=False)
nodes_df = nodes_df[nodes_df['id'].notna()]
nodes_df['id'] = nodes_df['id'].astype(str)

# 只保留像 openalex.org/Wxxxxxxx 的 ID 行
nodes_df = nodes_df[nodes_df['id'].str.contains(r'W\d{5,}', na=False)]
nodes_df['id'] = nodes_df['id'].apply(lambda x: x.split('/')[-1])

# 随机采样
sampled_nodes_df = nodes_df.sample(n=50000, replace=False)
sampled_ids = set(sampled_nodes_df['id'])

# 安全写出 nodes
sampled_nodes_df.to_csv(
    'data/nodes_cleaned.csv',
    index=False,
    quoting=csv.QUOTE_ALL,
    encoding='utf-8'
)

print(f"✅ 保留了 {len(sampled_nodes_df)} 条节点")

# Step 2: 筛选边
edges_df = pd.read_csv('data/edges_full.csv')
edges_df['source'] = edges_df['source'].astype(str)
edges_df['target'] = edges_df['target'].astype(str)

filtered_edges_df = edges_df[
    edges_df['source'].isin(sampled_ids) & edges_df['target'].isin(sampled_ids)
]

filtered_edges_df.to_csv('data/edges.csv', index=False)
print(f"✅ 保留了 {len(filtered_edges_df)} 条边")
