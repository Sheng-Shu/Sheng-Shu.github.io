import pandas as pd
import json
from collections import defaultdict

# === Step 1: 读取节点数据并提取 field/domain ===
nodes_df = pd.read_csv("data/nodes_cleaned.csv")

def parse_field(row):
    try:
        if pd.notnull(row):
            topics = json.loads(row.replace('""', '"').strip('"'))
            if topics and isinstance(topics, list):
                return topics[0].get("field", "Unknown")
    except:
        pass
    return "Unknown"

nodes_df["field"] = nodes_df["topics"].apply(parse_field)
nodes_df["id"] = nodes_df["id"].astype(str).apply(lambda x: x.split("/")[-1])

# === Step 2: 构建节点id到field的映射 ===
id_to_field = dict(zip(nodes_df["id"], nodes_df["field"]))

# === Step 3: 读取边数据并构建 field-field 矩阵 ===
edges_df = pd.read_csv("data/edges.csv")
matrix = defaultdict(lambda: defaultdict(int))

for _, row in edges_df.iterrows():
    src = str(row["source"])
    tgt = str(row["target"])
    src_field = id_to_field.get(src, "Unknown")
    tgt_field = id_to_field.get(tgt, "Unknown")
    if src_field != "Unknown" and tgt_field != "Unknown":
        matrix[src_field][tgt_field] += 1

# === Step 4: 保存为 CSV 矩阵 ===
all_fields = sorted({f for row in matrix.values() for f in row} | set(matrix.keys()))
output_df = pd.DataFrame(index=all_fields, columns=all_fields).fillna(0)

for src_field in all_fields:
    for tgt_field in all_fields:
        output_df.loc[src_field, tgt_field] = matrix[src_field][tgt_field]

output_df.to_csv("data/matrix_field.csv", encoding="utf-8-sig")
print("✅ 已生成 data/matrix_field.csv！")
