import pandas as pd

# 读取原始节点数据
df = pd.read_csv("data/output_1w_merged.csv")

# 提取 topics 字段来解析出 field 和 domain（如果你在 JS 中做了这个处理）
def extract_field_domain(topic_str):
    import json
    field, domain = "Unknown", "Unknown"
    try:
        topic_str = topic_str.replace('""', '"').strip('"')
        topics = json.loads(topic_str)
        if isinstance(topics, list) and len(topics) > 0:
            field = topics[0].get("field", "Unknown")
            domain = topics[0].get("domain", "Unknown")
    except:
        pass
    return pd.Series([field, domain])

# 如果原始数据没有现成的 field/domain 字段，可从 topics 中提取
if "field" not in df.columns or "domain" not in df.columns:
    df[["field", "domain"]] = df["topics"].apply(extract_field_domain)

# 保留所需字段
columns_to_keep = ["id", "title", "cited_by_count", "field", "domain"]
df_cleaned = df[columns_to_keep]

# 保存为新的简化文件
df_cleaned.to_csv("data/nodes_cleaned.csv", index=False)

print("✅ 已保存为 data/nodes_cleaned.csv，只包含必要字段。")
